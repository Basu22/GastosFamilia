import os
import json
from google import genai
from google.genai import types

# El cliente se inicializará por cada petición para tomar la API KEY del .env


TARJETAS_DISPONIBLES = [
    "VISA Baso", "VISA Juli", "MASTER Juli", "CENCOSUD Juli",
    "GALICIA Moni", "MASTER Baso", "BBVA Juli", "ICBC Baso", "SANTANDER Sele"
]

PROMPT_EXTRACCION = """
Sos un asistente financiero para una familia argentina. Analizá el contenido adjunto 
(puede ser una factura PDF, foto de ticket/recibo, nota de voz transcripta, o texto libre).

Extraé la información y respondé ÚNICAMENTE con un JSON válido, sin markdown, sin explicaciones:
{
  "descripcion": "nombre corto (max 40 caracteres)",
  "monto": <número flotante o null>,
  "tipo": "gasto_mensual" | "movimiento" | "compra_deseada",
  "es_fijo": <true si es servicio recurrente; false compra puntual>,
  "cuotas": <número de cuotas, 1 si es contado>,
  "tarjeta_sugerida": "nombre de la tarjeta o null",
  "prioridad": "alta" | "media" | "baja",
  "confianza": "alta" | "media" | "baja",
  "razon_baja_confianza": "explicación si confianza es baja, sino null"
}

Reglas de Negocio:
1. "tipo": 
   - "movimiento": Compras ya realizadas con tarjeta en cuotas.
   - "gasto_mensual": Gastos ya realizados (fijos o variables).
   - "compra_deseada": Deseos de compra a futuro ("anotá comprar...", "quiero un...", "che, falta comprar...").
2. "prioridad": Solo para "compra_deseada". Default "media".
3. "tarjeta_sugerida": debe ser exactamente uno de estos valores o null: """ + str(TARJETAS_DISPONIBLES) + """
4. Si es "compra_deseada", el monto es el precio estimado si se menciona, sino null.
"""

async def analizar_contenido(contenido_bytes: bytes, mime_type: str, texto_adicional: str = "") -> dict:
    """
    Analiza el contenido con Gemini y retorna el JSON extraído.
    mime_type puede ser: application/pdf, image/jpeg, image/png, audio/ogg, text/plain
    """
    # Usamos gemini-1.5-flash para velocidad y eficiencia en esta tarea de extracción
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    partes = []
    
    if mime_type == "text/plain":
        # Texto puro (mensaje de voz ya transcripto o mensaje escrito)
        partes.append(texto_adicional or contenido_bytes.decode("utf-8", errors="ignore"))
    else:
        # Archivo binario (PDF, imagen, audio)
        partes.append(
            types.Part.from_bytes(data=contenido_bytes, mime_type=mime_type)
        )
        if texto_adicional:
            partes.append(texto_adicional)
    
    partes.append(PROMPT_EXTRACCION)
    
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=partes
    )
    texto_respuesta = response.text.strip()
    
    # Limpiar posible markdown que Gemini a veces agrega a pesar del prompt
    if texto_respuesta.startswith("```"):
        # Intentar extraer el bloque JSON
        lineas = texto_respuesta.split("\n")
        # Filtrar las líneas que son ```json o ```
        json_lineas = [l for l in lineas if not l.startswith("```")]
        texto_respuesta = "\n".join(json_lineas)
    
    try:
        return json.loads(texto_respuesta)
    except json.JSONDecodeError as e:
        print(f"❌ Error parseando JSON de Gemini: {e}")
        print(f"Respuesta cruda: {texto_respuesta}")
        raise e

def formatear_confirmacion(datos: dict) -> str:
    """Genera el mensaje de confirmación amigable para el usuario."""
    confianza = datos.get("confianza", "baja")
    emoji_confianza = {"alta": "✅", "media": "⚠️", "baja": "❓"}.get(confianza, "❓")
    tipo = datos.get("tipo", "gasto_mensual")
    
    if tipo == "compra_deseada":
        prioridad = datos.get("prioridad", "media")
        emoji_prio = {"alta": "🔴", "media": "🟡", "baja": "🟢"}.get(prioridad, "⚪")
        lineas = [
            f"{emoji_confianza} *¡Anotado para Comprar!*",
            f"📝 *Artículo:* {datos.get('descripcion', 'No detectado')}",
            f"{emoji_prio} *Prioridad:* {prioridad.capitalize()}"
        ]
        monto = datos.get("monto")
        if monto:
            lineas.append(f"💰 *Precio Est.:* ${monto:,.0f}".replace(",", "."))
    else:
        lineas = [
            f"{emoji_confianza} *Entendí este gasto:*",
            f"📌 *Descripción:* {datos.get('descripcion', 'No detectada')}",
        ]
        
        monto = datos.get("monto")
        if monto is not None:
            lineas.append(f"💰 *Monto:* ${monto:,.0f}".replace(",", "."))
        
        tarjeta = datos.get("tarjeta_sugerida")
        if tarjeta:
            lineas.append(f"💳 *Tarjeta:* {tarjeta}")
        
        cuotas = datos.get("cuotas", 1)
        if cuotas > 1:
            lineas.append(f"📅 *Cuotas:* {cuotas}")
        
        if datos.get("es_fijo"):
            lineas.append("🔄 *Tipo:* Gasto Fijo")

    if confianza == "baja" and datos.get("razon_baja_confianza"):
        lineas.append(f"\n⚠️ _{datos['razon_baja_confianza']}_")
    
    lineas.append("\n¿Confirmar? Respondé *OK* para guardar.")
    
    return "\n".join(lineas)
