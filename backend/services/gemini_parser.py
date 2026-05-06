import os
import json
import google.generativeai as genai

# Configuración de Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

TARJETAS_DISPONIBLES = [
    "VISA Baso", "VISA Juli", "MASTER Juli", "CENCOSUD Juli",
    "GALICIA Moni", "MASTER Baso", "BBVA Juli", "ICBC Baso", "SANTANDER Sele"
]

PROMPT_EXTRACCION = """
Sos un asistente financiero para una familia argentina. Analizá el contenido adjunto 
(puede ser una factura PDF, foto de ticket/recibo, nota de voz transcripta, o texto libre).

Extraé la información del gasto y respondé ÚNICAMENTE con un JSON válido, sin markdown, sin explicaciones:
{
  "descripcion": "nombre corto del gasto (max 40 caracteres)",
  "monto": <número flotante sin formato, ej: 15000.50>,
  "tipo": "gasto_mensual" | "movimiento",
  "es_fijo": <true si es un servicio recurrente como luz, gas, internet; false si es una compra puntual>,
  "cuotas": <número de cuotas si es una compra en cuotas, 1 si es al contado>,
  "tarjeta_sugerida": "nombre de la tarjeta o null si pagó en efectivo/transferencia",
  "confianza": "alta" | "media" | "baja",
  "razon_baja_confianza": "explicación si confianza es baja, sino null"
}

Reglas:
- "tipo": usar "movimiento" para compras en cuotas con tarjeta. Usar "gasto_mensual" para todo lo demás.
- "tarjeta_sugerida": debe ser exactamente uno de estos valores o null: """ + str(TARJETAS_DISPONIBLES) + """
- Si el monto no se puede determinar con certeza, poner null en monto y "baja" en confianza.
- "descripcion": usar nombres claros como "Supermercado Carrefour", "Edesur Mayo", "Nafta YPF".
"""

async def analizar_contenido(contenido_bytes: bytes, mime_type: str, texto_adicional: str = "") -> dict:
    """
    Analiza el contenido con Gemini y retorna el JSON extraído.
    mime_type puede ser: application/pdf, image/jpeg, image/png, audio/ogg, text/plain
    """
    # Usamos gemini-1.5-flash para velocidad y eficiencia en esta tarea de extracción
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    partes = []
    
    if mime_type == "text/plain":
        # Texto puro (mensaje de voz ya transcripto o mensaje escrito)
        partes.append(texto_adicional or contenido_bytes.decode("utf-8", errors="ignore"))
    else:
        # Archivo binario (PDF, imagen, audio)
        partes.append({"mime_type": mime_type, "data": contenido_bytes})
        if texto_adicional:
            partes.append(texto_adicional)
    
    partes.append(PROMPT_EXTRACCION)
    
    response = model.generate_content(partes)
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
    
    lineas = [
        f"{emoji_confianza} *Entendí esto:*",
        f"📌 *Descripción:* {datos.get('descripcion', 'No detectada')}",
    ]
    
    monto = datos.get("monto")
    if monto is not None:
        # Formato moneda argentina simple
        lineas.append(f"💰 *Monto:* ${monto:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))
    else:
        lineas.append("💰 *Monto:* No detectado")
    
    tarjeta = datos.get("tarjeta_sugerida")
    if tarjeta:
        lineas.append(f"💳 *Tarjeta:* {tarjeta}")
    else:
        lineas.append("💳 *Pago:* Efectivo / Transferencia")
    
    cuotas = datos.get("cuotas", 1)
    if cuotas > 1:
        lineas.append(f"📅 *Cuotas:* {cuotas}")
    
    if datos.get("es_fijo"):
        lineas.append("🔄 *Tipo:* Gasto Fijo (se repetirá mensualmente)")
    
    if confianza == "baja" and datos.get("razon_baja_confianza"):
        lineas.append(f"\n⚠️ _{datos['razon_baja_confianza']}_")
    
    lineas.append("\n¿Confirmar? Respondé *OK* para guardar o corregí lo que está mal.")
    
    return "\n".join(lineas)
