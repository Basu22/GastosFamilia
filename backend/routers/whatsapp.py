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

async def procesar_mensaje(telefono: str, message: dict):
    """Lógica principal de orquestación del bot."""
    try:
        msg_type = message.get("type")
        print(f"🔧 Iniciando procesar_mensaje para type={msg_type}")
    
    # 1. Manejo de Confirmaciones (Texto)
    if msg_type == "text":
        texto = message["text"]["body"].strip().upper()
        pendiente = whatsapp_sessions.obtener_pendiente(telefono)
        
        # Confirmación positiva
        if pendiente and texto in ["OK", "SI", "SÍ", "CONFIRMAR", "GUARDAR"]:
            await guardar_en_db(telefono, pendiente["tipo"], pendiente["datos"])
            # Actualizar log si existe (se busca por teléfono y estado pendiente)
            with Session(engine) as session:
                log = session.exec(select(WhatsappLog).where(WhatsappLog.telefono == telefono, WhatsappLog.estado == "pendiente").order_by(WhatsappLog.creado_en.desc())).first()
                if log:
                    log.estado = "confirmado"
                    session.add(log)
                    session.commit()
            return
        
        # Cancelación
        if pendiente and texto in ["NO", "CANCELAR", "CANCEL", "CHAU"]:
            whatsapp_sessions.limpiar_pendiente(telefono)
            await whatsapp_sender.enviar_mensaje(telefono, "❌ Operación cancelada. Sesión limpia.")
            # Actualizar log a cancelado
            with Session(engine) as session:
                log = session.exec(select(WhatsappLog).where(WhatsappLog.telefono == telefono, WhatsappLog.estado == "pendiente").order_by(WhatsappLog.creado_en.desc())).first()
                if log:
                    log.estado = "cancelado"
                    session.add(log)
                    session.commit()
            return
        
        # Si hay un pendiente pero mandó un texto diferente, lo tomamos como corrección
        if pendiente:
            await whatsapp_sender.enviar_mensaje(telefono, "⏳ Procesando corrección...")
            try:
                # Re-analizar usando los datos anteriores como contexto
                datos_viejos = pendiente["datos"]
                contexto = f"Datos anteriores: {datos_viejos}. Corrección del usuario: {texto}"
                nuevos_datos = await gemini_parser.analizar_contenido(b"", "text/plain", contexto)
                
                whatsapp_sessions.guardar_pendiente(telefono, nuevos_datos.get("tipo", "gasto_mensual"), nuevos_datos)
                confirmacion = gemini_parser.formatear_confirmacion(nuevos_datos)
                await whatsapp_sender.enviar_mensaje(telefono, confirmacion)
                
                # Actualizar log con los nuevos datos extraídos
                with Session(engine) as session:
                    log = session.exec(select(WhatsappLog).where(WhatsappLog.telefono == telefono, WhatsappLog.estado == "pendiente").order_by(WhatsappLog.creado_en.desc())).first()
                    if log:
                        log.mensaje_recibido = f"Corrección: {texto}"
                        log.datos_extraidos = json.dumps(nuevos_datos)
                        log.respuesta_enviada = confirmacion
                        session.add(log)
                        session.commit()
            except Exception as e:
                await whatsapp_sender.enviar_mensaje(telefono, f"❌ No pude procesar la corrección: {e}")
            return

        # No hay pendiente, es un mensaje nuevo → Iniciar flujo de extracción
        print(f"🤖 Procesando nuevo mensaje de texto: '{texto}'")
        await analizar_y_preguntar(telefono, b"", "text/plain", texto)

    # 2. Manejo de Archivos (Imagen, PDF, Audio)
    elif msg_type in ["image", "document", "audio", "voice"]:
        await whatsapp_sender.enviar_mensaje(telefono, "⏳ Analizando contenido... esto puede tardar unos segundos.")
        
        try:
            media_id = message[msg_type]["id"]
            # Descargar archivo real
            contenido, mime_type = await whatsapp_media.descargar_media(media_id)
            # Analizar con Gemini
            await analizar_y_preguntar(telefono, contenido, mime_type)
        except Exception as e:
            await whatsapp_sender.enviar_mensaje(telefono, f"❌ Error al procesar el archivo: {e}")

    except Exception as e:
        print(f"❌💥 CRITICAL ERROR en procesar_mensaje: {e}")
        import traceback
        traceback.print_exc()

async def analizar_y_preguntar(telefono: str, contenido: bytes, mime_type: str, texto: str = ""):
    """Analiza con Gemini y envía la respuesta de confirmación al usuario."""
    try:
        datos = await gemini_parser.analizar_contenido(contenido, mime_type, texto)
        tipo = datos.get("tipo", "gasto_mensual")
        
        # Guardar en sesión temporal
        whatsapp_sessions.guardar_pendiente(telefono, tipo, datos)
        
        # Formatear mensaje amigable
        confirmacion = gemini_parser.formatear_confirmacion(datos)
        await whatsapp_sender.enviar_mensaje(telefono, confirmacion)
        
        # Guardar Log inicial
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
                # Lógica para Compras en Cuotas
                tarjeta_id = None
                if datos.get("tarjeta_sugerida"):
                    # El formato sugerido es "NOMBRE TITULAR"
                    partes = datos["tarjeta_sugerida"].split()
                    if len(partes) >= 2:
                        nombre_t = partes[0]
                        titular_t = partes[1]
                        
                        tarj = session.exec(
                            select(Tarjeta).where(
                                Tarjeta.nombre == nombre_t,
                                Tarjeta.titular == titular_t
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
                    creado_por="whatsapp",
                    notas=f"Cargado vía WhatsApp por {telefono}"
                )
                session.add(nuevo)
                session.commit()
                
                msg = f"✅ *¡Guardado!*\n📌 {nuevo.descripcion}\n💰 ${nuevo.monto_total:,.0f}".replace(",", ".")
                if cuotas > 1:
                    msg += f"\n📅 {cuotas} cuotas de ${monto_cuota:,.0f}".replace(",", ".")

            elif tipo == "compra_deseada":
                # Lógica para Lista de Compras
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
                # Lógica para Gasto Mensual (Fijo o Variable)
                hoy = date.today()
                nuevo = GastoMensual(
                    descripcion=datos.get("descripcion", "Gasto WhatsApp"),
                    monto=float(datos.get("monto", 0)),
                    mes=hoy.month,
                    anio=hoy.year,
                    es_fijo=datos.get("es_fijo", False),
                    notas=f"Cargado vía WhatsApp por {telefono}"
                )
                session.add(nuevo)
                session.commit()
                
                tipo_txt = "Gasto Fijo ✅" if nuevo.es_fijo else "Gasto Variable"
                msg = f"✅ *¡Guardado!*\n📌 {nuevo.descripcion}\n💰 ${nuevo.monto:,.0f}\n🔖 {tipo_txt}".replace(",", ".")

            # Limpiar sesión y confirmar al usuario
            whatsapp_sessions.limpiar_pendiente(telefono)
            await whatsapp_sender.enviar_mensaje(telefono, msg)
            
    except Exception as e:
        print(f"❌ Error guardando en DB: {e}")
        await whatsapp_sender.enviar_mensaje(telefono, f"❌ No pude guardar en la base de datos: {e}")
