import os
import json
import hmac
import hashlib
from datetime import date
from fastapi import APIRouter, Request, BackgroundTasks, HTTPException
from sqlmodel import Session, select
from dateutil.relativedelta import relativedelta

from database import engine, get_session
from models.tarjeta import Tarjeta
from models.movimiento import Movimiento
from models.gasto_mensual import GastoMensual
from models.compra_deseada import CompraDeseada
from models.whatsapp_log import WhatsappLog
from models.reserva import Reserva
from models.config import Categoria
from services import gemini_parser, whatsapp_media, whatsapp_sender, whatsapp_sessions

VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "gastos_familia_webhook_2026")
APP_SECRET = os.getenv("WHATSAPP_APP_SECRET", "")  # Panel de Meta -> Configuración -> Básica


# Números autorizados a usar el bot (sin el "+")
# Formato en .env: 5491112345678,5491187654321
NUMEROS_AUTORIZADOS = os.getenv("WHATSAPP_NUMEROS_AUTORIZADOS", "").split(",")

router = APIRouter(tags=["whatsapp"])

def verificar_firma_meta(payload: bytes, signature_header: str) -> bool:
    """Valida que el request viene genuinamente de Meta."""
    if not APP_SECRET or not signature_header:
        return True  # Si no está configurado, dejar pasar (dev mode)
    
    # Meta envía la firma como sha256=HEX_DIGEST
    actual_signature = signature_header.replace("sha256=", "")
    expected_signature = hmac.new(
        APP_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, actual_signature)


# ─── Verificación del Webhook (Meta lo llama para validar el endpoint) ───
@router.get("/webhook")
async def verificar_webhook(
    request: Request
):
    """
    Endpoint requerido por Meta para validar el webhook.
    Usa parámetros query: hub.mode, hub.challenge, hub.verify_token
    """
    params = request.query_params
    hub_mode = params.get("hub.mode")
    hub_challenge = params.get("hub.challenge")
    hub_verify_token = params.get("hub.verify_token")

    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        print("✅ Webhook verificado correctamente por Meta")
        return int(hub_challenge)
    
    print("❌ Error en verificación de webhook: Token inválido")
    raise HTTPException(status_code=403, detail="Token de verificación inválido")

# ─── Recepción de Mensajes ───
@router.post("/webhook")
async def recibir_mensaje(request: Request, background_tasks: BackgroundTasks):
    """
    Endpoint que recibe todas las notificaciones de WhatsApp.
    Debe responder 200 OK rápido. El procesamiento real ocurre en segundo plano.
    """
    body_bytes = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    
    if not verificar_firma_meta(body_bytes, signature):
        print("❌ Error: Firma de Meta inválida")
        raise HTTPException(status_code=403, detail="Firma inválida")
    
    data = json.loads(body_bytes)
    
    # Estructura de Meta: entry -> changes -> value -> messages
    try:
        entry = data.get("entry", [])[0]
        changes = entry.get("changes", [])[0]
        value = changes.get("value", {})
        
        if "messages" not in value:
            # Puede ser una notificación de estado (entregado, leído), la ignoramos
            return {"status": "ok"}
        
        message = value["messages"][0]
        telefono = message["from"]  # Número del remitente
        
        # Seguridad: Solo procesar si el número está autorizado
        print(f"📩 Mensaje recibido de: {telefono}")
        if NUMEROS_AUTORIZADOS and NUMEROS_AUTORIZADOS[0] != "" and telefono not in NUMEROS_AUTORIZADOS:
            print(f"🚫 Acceso DENEGADO. El número {telefono} no está en NUMEROS_AUTORIZADOS.")
            return {"status": "ok"}
        
        print(f"✅ Acceso concedido para {telefono}. Iniciando procesamiento...")
        # Procesar en background para liberar el request de Meta
        background_tasks.add_task(procesar_mensaje, telefono, message)
        
    except Exception as e:
        print(f"⚠️ Error procesando payload de Meta: {e}")
    
    return {"status": "ok"}

def formatear_inicio_wizard(datos: dict) -> str:
    """Genera el mensaje inicial solicitando cómo pagar el gasto."""
    monto = datos.get("monto")
    monto_str = f"${monto:,.0f}".replace(",", ".") if monto is not None else "No detectado"
    
    lineas = [
        "✅ *Gasto Detectado:*",
        f"📌 *Descripción:* {datos.get('descripcion', 'No detectada')}",
        f"💰 *Monto:* {monto_str}",
        "",
        "*¿Cómo lo pagaste?*",
        "1. Efectivo / Transferencia",
        "2. Tarjeta de Crédito / Débito",
        "3. Reserva de Ahorros",
        "",
        "❌ Respondé *NO* para cancelar."
    ]
    return "\n".join(lineas)


def formatear_resumen_gasto(datos: dict) -> str:
    """Genera el resumen completo para confirmación final (Paso 4)."""
    monto = datos.get("monto")
    monto_str = f"${monto:,.0f}".replace(",", ".") if monto is not None else "No detectado"
    
    lineas = [
        "📝 *Resumen del Gasto para Guardar:*",
        f"📌 *Descripción:* {datos.get('descripcion', 'No detectada')}",
        f"💰 *Monto:* {monto_str}"
    ]
    
    # Pago
    tarjeta_id = datos.get("tarjeta_id")
    reserva_id = datos.get("reserva_id")
    
    if tarjeta_id:
        lineas.append(f"💳 *Pago:* Tarjeta - {datos.get('tarjeta_nombre')}")
        cuotas = int(datos.get("cuotas") or 1)
        if cuotas > 1:
            monto_cuota = monto / cuotas if monto else 0
            lineas.append(f"📅 *Cuotas:* {cuotas} cuotas de ${monto_cuota:,.0f}".replace(",", "."))
        else:
            lineas.append("📅 *Cuotas:* 1 (Pago único / Contado)")
    elif reserva_id:
        lineas.append(f"💸 *Pago:* Reserva - {datos.get('reserva_nombre')}")
    else:
        lineas.append("💵 *Pago:* Efectivo / Transferencia")
        
    # Categoría
    lineas.append(f"🏷️ *Categoría:* {datos.get('categoria') or 'Sin Categoría'}")
    
    lineas.append("\n¿Confirmar y guardar? Respondé *OK* para guardar, o enviá una corrección de texto.")
    lineas.append("0. ⬅️ Volver")
    
    return "\n".join(lineas)


def obtener_mensaje_opciones_pago() -> str:
    """Retorna un texto formateado con todos los medios de pago del sistema."""
    with Session(engine) as session:
        tarjetas = session.exec(select(Tarjeta).where(Tarjeta.activa == True)).all()
        reservas = session.exec(select(Reserva).where(Reserva.activa == True)).all()
        
    lineas = ["📊 *Opciones de Pago Disponibles*\n"]
    
    lineas.append("💳 *Tarjetas:*")
    if tarjetas:
        for t in tarjetas:
            lineas.append(f"• {t.nombre} {t.usuario}")
    else:
        lineas.append("• No hay tarjetas registradas")
        
    lineas.append("\n💸 *Reservas:*")
    if reservas:
        for r in reservas:
            lineas.append(f"• {r.nombre}")
    else:
        lineas.append("• No hay reservas registradas")
        
    lineas.append("\n💵 *Otros:*")
    lineas.append("• Efectivo / Transferencia")
    
    return "\n".join(lineas)


async def procesar_mensaje(telefono: str, message: dict):
    """Lógica principal de orquestación del bot."""
    try:
        msg_type = message.get("type")
        print(f"🔧 Iniciando procesar_mensaje para type={msg_type}")
        
        # 1. Manejo de Confirmaciones y Navegación (Texto)
        if msg_type == "text":
            texto = message["text"]["body"].strip()
            texto_upper = texto.upper()
            
            # Obtener sesión pendiente
            pendiente = whatsapp_sessions.obtener_pendiente(telefono)
            
            # Comando Global para ver opciones
            if texto_upper in ["OPCIONES", "VER PAGOS", "MEDIOS", "PAGOS", "VER MEDIOS"]:
                msg_opciones = obtener_mensaje_opciones_pago()
                await whatsapp_sender.enviar_mensaje(telefono, msg_opciones)
                return
            
            if pendiente:
                estado = pendiente.get("estado", "esperando_pago_tipo")
                
                # --- CANCELAR ---
                if texto_upper in ["NO", "CANCELAR", "CANCEL", "CHAU"]:
                    whatsapp_sessions.limpiar_pendiente(telefono)
                    await whatsapp_sender.enviar_mensaje(telefono, "❌ Operación cancelada. Sesión limpia.")
                    with Session(engine) as session:
                        log = session.exec(
                            select(WhatsappLog)
                            .where(WhatsappLog.telefono == telefono, WhatsappLog.estado == "pendiente")
                            .order_by(WhatsappLog.creado_en.desc())
                        ).first()
                        if log:
                            log.estado = "cancelado"
                            session.add(log)
                            session.commit()
                    return
                
                # --- ESTADO: esperando_pago_tipo ---
                if estado == "esperando_pago_tipo":
                    # 1. Efectivo / Transferencia
                    if texto == "1":
                        pendiente["datos"]["tipo"] = "gasto_mensual"
                        pendiente["datos"]["tarjeta_id"] = None
                        pendiente["datos"]["tarjeta_nombre"] = None
                        pendiente["datos"]["reserva_id"] = None
                        pendiente["datos"]["reserva_nombre"] = None
                        pendiente["datos"]["cuotas"] = 1
                        
                        # Ir a selección de Categorías
                        await mostrar_menu_categorias(telefono, pendiente)
                        return
                    
                    # 2. Tarjeta
                    elif texto == "2":
                        with Session(engine) as session:
                            tarjetas = session.exec(select(Tarjeta).where(Tarjeta.activa == True)).all()
                        
                        if not tarjetas:
                            await whatsapp_sender.enviar_mensaje(telefono, "⚠️ No hay tarjetas cargadas en el sistema.")
                            return
                        
                        tarjetas_temp = [{"id": t.id, "nombre": f"{t.nombre} {t.usuario}"} for t in tarjetas]
                        
                        whatsapp_sessions.guardar_pendiente(
                            telefono,
                            pendiente["tipo"],
                            pendiente["datos"],
                            estado="esperando_tarjeta",
                            tarjetas_temp=tarjetas_temp
                        )
                        
                        lineas = ["💳 *Seleccioná la Tarjeta:*"]
                        for idx, t in enumerate(tarjetas_temp, 1):
                            lineas.append(f"{idx}. {t['nombre']}")
                        lineas.append("\n0. ⬅️ Volver")
                        
                        await whatsapp_sender.enviar_mensaje(telefono, "\n".join(lineas))
                        return
                    
                    # 3. Reserva de Ahorros
                    elif texto == "3":
                        with Session(engine) as session:
                            reservas = session.exec(select(Reserva).where(Reserva.activa == True)).all()
                        
                        if not reservas:
                            await whatsapp_sender.enviar_mensaje(telefono, "⚠️ No hay reservas activas en el sistema.")
                            return
                        
                        reservas_temp = [{"id": r.id, "nombre": r.nombre} for r in reservas]
                        
                        whatsapp_sessions.guardar_pendiente(
                            telefono,
                            pendiente["tipo"],
                            pendiente["datos"],
                            estado="esperando_reserva",
                            reservas_temp=reservas_temp
                        )
                        
                        lineas = ["💸 *Seleccioná la Reserva:*"]
                        for idx, r in enumerate(reservas_temp, 1):
                            lineas.append(f"{idx}. {r['nombre']}")
                        lineas.append("\n0. ⬅️ Volver")
                        
                        await whatsapp_sender.enviar_mensaje(telefono, "\n".join(lineas))
                        return
                    
                    # Cualquier otra cosa es una corrección
                    else:
                        await procesar_corrección_gasto(telefono, pendiente, texto)
                        return
                
                # --- ESTADO: esperando_tarjeta ---
                elif estado == "esperando_tarjeta":
                    if texto == "0" or texto_upper == "VOLVER":
                        # Volver al inicio del wizard
                        await volver_a_inicio_wizard(telefono, pendiente)
                        return
                    
                    try:
                        idx = int(texto) - 1
                        tarjetas_temp = pendiente.get("tarjetas_temp", [])
                        if 0 <= idx < len(tarjetas_temp):
                            selected_card = tarjetas_temp[idx]
                            
                            pendiente["datos"]["tarjeta_id"] = selected_card["id"]
                            pendiente["datos"]["tarjeta_nombre"] = selected_card["nombre"]
                            pendiente["datos"]["reserva_id"] = None
                            pendiente["datos"]["reserva_nombre"] = None
                            pendiente["datos"]["tipo"] = "movimiento"
                            
                            whatsapp_sessions.guardar_pendiente(
                                telefono,
                                "movimiento",
                                pendiente["datos"],
                                estado="esperando_cuotas",
                                tarjetas_temp=tarjetas_temp
                            )
                            
                            await whatsapp_sender.enviar_mensaje(
                                telefono,
                                f"💳 Elegiste *{selected_card['nombre']}*.\n\n📅 *¿En cuántas cuotas?*\nIngresá el número de cuotas (ej. *1* para contado, *3*, *6*, *12*).\n\n0. ⬅️ Volver"
                            )
                        else:
                            raise ValueError
                    except ValueError:
                        await whatsapp_sender.enviar_mensaje(
                            telefono,
                            "⚠️ Opción inválida. Respondé con el número de tarjeta (1, 2...) o 0 para volver."
                        )
                    return
                
                # --- ESTADO: esperando_cuotas ---
                elif estado == "esperando_cuotas":
                    if texto == "0" or texto_upper == "VOLVER":
                        # Volver a listar tarjetas
                        tarjetas_temp = pendiente.get("tarjetas_temp", [])
                        whatsapp_sessions.guardar_pendiente(
                            telefono,
                            pendiente["tipo"],
                            pendiente["datos"],
                            estado="esperando_tarjeta",
                            tarjetas_temp=tarjetas_temp
                        )
                        
                        lineas = ["💳 *Seleccioná la Tarjeta:*"]
                        for idx, t in enumerate(tarjetas_temp, 1):
                            lineas.append(f"{idx}. {t['nombre']}")
                        lineas.append("\n0. ⬅️ Volver")
                        
                        await whatsapp_sender.enviar_mensaje(telefono, "\n".join(lineas))
                        return
                    
                    try:
                        cuotas = int(texto)
                        if cuotas >= 1:
                            pendiente["datos"]["cuotas"] = cuotas
                            
                            # Ir a selección de Categorías
                            await mostrar_menu_categorias(telefono, pendiente)
                        else:
                            raise ValueError
                    except ValueError:
                        await whatsapp_sender.enviar_mensaje(
                            telefono,
                            "⚠️ Cantidad de cuotas inválida. Ingresá un número mayor o igual a 1 (o 0 para volver)."
                        )
                    return
                
                # --- ESTADO: esperando_reserva ---
                elif estado == "esperando_reserva":
                    if texto == "0" or texto_upper == "VOLVER":
                        await volver_a_inicio_wizard(telefono, pendiente)
                        return
                    
                    try:
                        idx = int(texto) - 1
                        reservas_temp = pendiente.get("reservas_temp", [])
                        if 0 <= idx < len(reservas_temp):
                            selected_reserva = reservas_temp[idx]
                            
                            pendiente["datos"]["reserva_id"] = selected_reserva["id"]
                            pendiente["datos"]["reserva_nombre"] = selected_reserva["nombre"]
                            pendiente["datos"]["tarjeta_id"] = None
                            pendiente["datos"]["tarjeta_nombre"] = None
                            pendiente["datos"]["cuotas"] = 1
                            pendiente["datos"]["tipo"] = "movimiento"
                            
                            # Ir a selección de Categorías
                            await mostrar_menu_categorias(telefono, pendiente)
                        else:
                            raise ValueError
                    except ValueError:
                        await whatsapp_sender.enviar_mensaje(
                            telefono,
                            "⚠️ Opción inválida. Respondé con el número de reserva (1, 2...) o 0 para volver."
                        )
                    return

                # --- ESTADO: esperando_categoria ---
                elif estado == "esperando_categoria":
                    if texto == "0" or texto_upper == "VOLVER":
                        # Volver al paso de pago previo
                        t_id = pendiente["datos"].get("tarjeta_id")
                        r_id = pendiente["datos"].get("reserva_id")
                        
                        if t_id:
                            # Volver a cuotas
                            whatsapp_sessions.guardar_pendiente(
                                telefono,
                                "movimiento",
                                pendiente["datos"],
                                estado="esperando_cuotas",
                                tarjetas_temp=pendiente.get("tarjetas_temp")
                            )
                            await whatsapp_sender.enviar_mensaje(
                                telefono,
                                f"📅 *¿En cuántas cuotas?*\nIngresá el número de cuotas o 0 para volver."
                            )
                        elif r_id:
                            # Volver a reservas
                            reservas_temp = pendiente.get("reservas_temp")
                            whatsapp_sessions.guardar_pendiente(
                                telefono,
                                "movimiento",
                                pendiente["datos"],
                                estado="esperando_reserva",
                                reservas_temp=reservas_temp
                            )
                            lineas = ["💸 *Seleccioná la Reserva:*"]
                            for idx, r in enumerate(reservas_temp, 1):
                                lineas.append(f"{idx}. {r['nombre']}")
                            lineas.append("\n0. ⬅️ Volver")
                            await whatsapp_sender.enviar_mensaje(telefono, "\n".join(lineas))
                        else:
                            # Volver al inicio del wizard (Efectivo)
                            await volver_a_inicio_wizard(telefono, pendiente)
                        return
                    
                    try:
                        idx = int(texto) - 1
                        categorias_temp = pendiente.get("categorias_temp", [])
                        if 0 <= idx < len(categorias_temp):
                            selected_cat = categorias_temp[idx]
                            
                            pendiente["datos"]["categoria"] = selected_cat["nombre"]
                            
                            # Pasar a confirmación final
                            whatsapp_sessions.guardar_pendiente(
                                telefono,
                                pendiente["tipo"],
                                pendiente["datos"],
                                estado="esperando_confirmacion",
                                tarjetas_temp=pendiente.get("tarjetas_temp"),
                                reservas_temp=pendiente.get("reservas_temp"),
                                categorias_temp=categorias_temp
                            )
                            
                            confirmacion = formatear_resumen_gasto(pendiente["datos"])
                            await whatsapp_sender.enviar_mensaje(telefono, confirmacion)
                        else:
                            raise ValueError
                    except ValueError:
                        await whatsapp_sender.enviar_mensaje(
                            telefono,
                            "⚠️ Opción inválida. Seleccioná una categoría enviando su número o 0 para volver."
                        )
                    return

                # --- ESTADO: esperando_confirmacion ---
                elif estado == "esperando_confirmacion":
                    if texto == "0" or texto_upper == "VOLVER":
                        # Volver a selección de categoría
                        await mostrar_menu_categorias(telefono, pendiente)
                        return
                        
                    if texto_upper in ["OK", "SI", "SÍ", "CONFIRMAR", "GUARDAR"]:
                        tipo_actual = pendiente["datos"].get("tipo", pendiente["tipo"])
                        await guardar_en_db(telefono, tipo_actual, pendiente["datos"])
                        with Session(engine) as session:
                            log = session.exec(
                                select(WhatsappLog)
                                .where(WhatsappLog.telefono == telefono, WhatsappLog.estado == "pendiente")
                                .order_by(WhatsappLog.creado_en.desc())
                            ).first()
                            if log:
                                log.estado = "confirmado"
                                session.add(log)
                                session.commit()
                        return
                    else:
                        # Tratar como corrección de texto
                        await procesar_corrección_gasto(telefono, pendiente, texto)
                        return

            # No hay pendiente, es un mensaje nuevo → Iniciar flujo de extracción
            print(f"🤖 Procesando nuevo mensaje de texto: '{texto}'")
            await analizar_y_preguntar(telefono, b"", "text/plain", texto)
            return

        # 2. Manejo de Archivos (Imagen, PDF, Audio)
        elif msg_type in ["image", "document", "audio", "voice"]:
            await whatsapp_sender.enviar_mensaje(telefono, "⏳ Analizando contenido... esto puede tardar unos segundos.")
            
            try:
                media_id = message[msg_type]["id"]
                contenido, mime_type = await whatsapp_media.descargar_media(media_id)
                await analizar_y_preguntar(telefono, contenido, mime_type)
            except Exception as e:
                await whatsapp_sender.enviar_mensaje(telefono, f"❌ Error al procesar el archivo: {e}")

    except Exception as e:
        print(f"❌💥 CRITICAL ERROR en procesar_mensaje: {e}")
        import traceback
        traceback.print_exc()


async def mostrar_menu_categorias(telefono: str, pendiente: dict):
    """Obtiene y envía la lista de categorías activas para su selección."""
    with Session(engine) as session:
        categorias = session.exec(select(Categoria).where(Categoria.activa == True)).all()
        
    if not categorias:
        # Si no hay categorías, saltar directo a confirmación
        pendiente["datos"]["categoria"] = None
        whatsapp_sessions.guardar_pendiente(
            telefono,
            pendiente["tipo"],
            pendiente["datos"],
            estado="esperando_confirmacion",
            tarjetas_temp=pendiente.get("tarjetas_temp"),
            reservas_temp=pendiente.get("reservas_temp")
        )
        confirmacion = formatear_resumen_gasto(pendiente["datos"])
        await whatsapp_sender.enviar_mensaje(telefono, confirmacion)
        return
        
    categorias_temp = [{"id": c.id, "nombre": c.nombre} for c in categorias]
    
    whatsapp_sessions.guardar_pendiente(
        telefono,
        pendiente["tipo"],
        pendiente["datos"],
        estado="esperando_categoria",
        tarjetas_temp=pendiente.get("tarjetas_temp"),
        reservas_temp=pendiente.get("reservas_temp"),
        categorias_temp=categorias_temp
    )
    
    lineas = ["🏷️ *Seleccioná la Categoría:*"]
    for idx, c in enumerate(categorias_temp, 1):
        lineas.append(f"{idx}. {c['nombre']}")
    lineas.append("\n0. ⬅️ Volver")
    
    await whatsapp_sender.enviar_mensaje(telefono, "\n".join(lineas))


async def volver_a_inicio_wizard(telefono: str, pendiente: dict):
    """Regresa al primer paso del asistente guiado (selección de pago)."""
    whatsapp_sessions.guardar_pendiente(
        telefono,
        pendiente["tipo"],
        pendiente["datos"],
        estado="esperando_pago_tipo"
    )
    msg_wizard = formatear_inicio_wizard(pendiente["datos"])
    await whatsapp_sender.enviar_mensaje(telefono, msg_wizard)


async def procesar_corrección_gasto(telefono: str, pendiente: dict, texto: str):
    """Envía la corrección a Gemini, actualiza los datos y reinicia el wizard."""
    await whatsapp_sender.enviar_mensaje(telefono, "⏳ Procesando corrección...")
    try:
        datos_viejos = pendiente["datos"]
        contexto = f"Datos anteriores: {datos_viejos}. Corrección del usuario: {texto}"
        nuevos_datos = await gemini_parser.analizar_contenido(b"", "text/plain", contexto)
        
        tipo_nuevo = nuevos_datos.get("tipo", "gasto_mensual")
        
        # Reiniciar al paso 1 con los datos nuevos corregidos
        whatsapp_sessions.guardar_pendiente(
            telefono, 
            tipo_nuevo, 
            nuevos_datos, 
            estado="esperando_pago_tipo"
        )
        
        msg_wizard = formatear_inicio_wizard(nuevos_datos)
        await whatsapp_sender.enviar_mensaje(telefono, msg_wizard)
        
        # Actualizar log
        with Session(engine) as session:
            log = session.exec(
                select(WhatsappLog)
                .where(WhatsappLog.telefono == telefono, WhatsappLog.estado == "pendiente")
                .order_by(WhatsappLog.creado_en.desc())
            ).first()
            if log:
                log.mensaje_recibido = f"Corrección: {texto}"
                log.datos_extraidos = json.dumps(nuevos_datos)
                log.respuesta_enviada = msg_wizard
                session.add(log)
                session.commit()
    except Exception as e:
        await whatsapp_sender.enviar_mensaje(telefono, f"❌ No pude procesar la corrección: {e}")


async def analizar_y_preguntar(telefono: str, contenido: bytes, mime_type: str, texto: str = ""):
    """Analiza con Gemini y envía la respuesta del paso 1 del wizard."""
    try:
        datos = await gemini_parser.analizar_contenido(contenido, mime_type, texto)
        tipo = datos.get("tipo", "gasto_mensual")
        
        # Iniciar sesión en el primer paso (esperando_pago_tipo)
        whatsapp_sessions.guardar_pendiente(telefono, tipo, datos, estado="esperando_pago_tipo")
        
        if tipo == "compra_deseada":
            # Las compras deseadas (wishlist) no tienen wizard de pago, confirman directo
            confirmacion = gemini_parser.formatear_confirmacion(datos)
            whatsapp_sessions.guardar_pendiente(telefono, tipo, datos, estado="esperando_confirmacion")
        else:
            confirmacion = formatear_inicio_wizard(datos)
            
        await whatsapp_sender.enviar_mensaje(telefono, confirmacion)
        
        with Session(engine) as session:
            tipo_msg = "texto" if mime_type == "text/plain" else mime_type.split("/")[0]
            nuevo_log = WhatsappLog(
                telefono=telefono,
                tipo_mensaje=tipo_msg,
                mensaje_recibido=texto if texto else f"Archivo {mime_type}",
                respuesta_enviada=confirmacion,
                estado="pendiente",
                datos_extraidos=json.dumps(datos)
            )
            session.add(nuevo_log)
            session.commit()

    except Exception as e:
        print(f"❌ Error en analizar_y_preguntar: {e}")
        await whatsapp_sender.enviar_mensaje(
            telefono, 
            "🤖 ¡Hola! Soy tu asistente de gastos.\nPodés mandarme:\n- 📄 Facturas PDF\n- 📸 Fotos de tickets\n- 🎤 Notas de voz\n- ✍️ Texto (ej: 'nafta 15000 visa baso')\n\n¿Qué querés cargar?"
        )


async def guardar_en_db(telefono: str, tipo: str, datos: dict):
    """Guarda definitivamente el gasto en la DB de SQLite."""
    try:
        with Session(engine) as session:
            if tipo == "movimiento":
                tarjeta_id = datos.get("tarjeta_id")
                reserva_id = datos.get("reserva_id")
                
                # Si no hay IDs explícitos pero hay una sugerida por Gemini, buscarla
                if not tarjeta_id and not reserva_id and datos.get("tarjeta_sugerida"):
                    partes = datos["tarjeta_sugerida"].split()
                    if len(partes) >= 2:
                        nombre_t = partes[0]
                        titular_t = partes[1]
                        
                        tarj = session.exec(
                            select(Tarjeta).where(
                                Tarjeta.nombre == nombre_t,
                                Tarjeta.usuario == titular_t  # Fix bug: usar Tarjeta.usuario en lugar de Tarjeta.titular
                            )
                        ).first()
                        if tarj:
                            tarjeta_id = tarj.id

                cuotas = int(datos.get("cuotas", 1))
                monto_total = float(datos.get("monto", 0))
                monto_cuota = monto_total / cuotas
                
                hoy = date.today()
                fecha_fin = hoy + relativedelta(months=cuotas - 1)
                
                nuevo = Movimiento(
                    descripcion=datos.get("descripcion", "Gasto WhatsApp"),
                    monto_total=monto_total,
                    cuotas=cuotas,
                    monto_cuota=monto_cuota,
                    fecha_primera_cuota=hoy,
                    fecha_ultima_cuota=fecha_fin,
                    tarjeta_id=tarjeta_id,
                    reserva_id=reserva_id,
                    categoria=datos.get("categoria"),
                    creado_por="whatsapp",
                    notas=f"Cargado vía WhatsApp por {telefono}"
                )
                session.add(nuevo)
                session.commit()
                
                msg = f"✅ *¡Guardado!*\n📌 {nuevo.descripcion}\n💰 ${nuevo.monto_total:,.0f}".replace(",", ".")
                if tarjeta_id:
                    tarj = session.get(Tarjeta, tarjeta_id)
                    if tarj:
                        msg += f"\n💳 *Tarjeta:* {tarj.nombre} {tarj.usuario}"
                    if cuotas > 1:
                        msg += f"\n📅 {cuotas} cuotas de ${monto_cuota:,.0f}".replace(",", ".")
                elif reserva_id:
                    res = session.get(Reserva, reserva_id)
                    if res:
                        msg += f"\n💸 *Reserva:* {res.nombre}"
                    msg += "\n(Financiado con reservas)"

            elif tipo == "compra_deseada":
                nueva_compra = CompraDeseada(
                    descripcion=datos.get("descripcion", "Compra WhatsApp"),
                    precio_estimado=float(datos.get("monto")) if datos.get("monto") else None,
                    prioridad=datos.get("prioridad", "media"),
                    categoria=datos.get("categoria"),
                    notas=f"Agregado vía WhatsApp por {telefono}",
                    estado="pendiente"
                )
                session.add(nueva_compra)
                session.commit()
                
                emoji_prio = {"alta": "🔴", "media": "🟡", "baja": "🟢"}.get(nueva_compra.prioridad, "⚪")
                msg = f"✅ *¡A la lista!*\n📌 {nueva_compra.descripcion}\n{emoji_prio} Prioridad: {nueva_compra.prioridad.capitalize()}"
                if nueva_compra.precio_estimado:
                    msg += f"\n💰 Est.: ${nueva_compra.precio_estimado:,.0f}".replace(",", ".")

            else:
                hoy = date.today()
                nuevo = GastoMensual(
                    descripcion=datos.get("descripcion", "Gasto WhatsApp"),
                    monto=float(datos.get("monto", 0)),
                    mes=hoy.month,
                    anio=hoy.year,
                    es_fijo=datos.get("es_fijo", False),
                    categoria=datos.get("categoria"),
                    notas=f"Cargado vía WhatsApp por {telefono}"
                )
                session.add(nuevo)
                session.commit()
                
                tipo_txt = "Gasto Fijo ✅" if nuevo.es_fijo else "Gasto Variable"
                msg = f"✅ *¡Guardado!*\n📌 {nuevo.descripcion}\n💰 ${nuevo.monto:,.0f}\n🔖 {tipo_txt}".replace(",", ".")

            whatsapp_sessions.limpiar_pendiente(telefono)
            await whatsapp_sender.enviar_mensaje(telefono, msg)
            
    except Exception as e:
        print(f"❌ Error guardando en DB: {e}")
        await whatsapp_sender.enviar_mensaje(telefono, f"❌ No pude guardar en la base de datos: {e}")
