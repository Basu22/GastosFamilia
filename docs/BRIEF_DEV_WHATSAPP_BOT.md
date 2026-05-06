# 📋 BRIEF TÉCNICO: Bot de WhatsApp con IA
## Para: Dev Jr (Gemini Flash) — Leer COMPLETO antes de escribir una sola línea

---

## 1. CONTEXTO DEL PROYECTO

Sos el dev Jr de "Gastos Familiares", una app de gestión financiera familiar. El stack es:
- **Backend**: Python 3.11 + FastAPI + SQLModel + SQLite
- **Infra**: Docker Compose corriendo en una Raspberry Pi 4
- **Acceso externo**: Cloudflare Tunnel (ya tiene HTTPS, no hay que configurarlo)

El proyecto vive en: `/home/flink/Documentos/Gastos Familia/`

---

## 2. TU TAREA

Implementar un **bot de WhatsApp** que permita a los usuarios (Baso y Juli) mandar gastos directamente desde su celular. El bot debe:

1. Recibir mensajes de WhatsApp (PDF, imágenes, voz, texto)
2. Analizarlos con **Gemini API** y extraer datos del gasto
3. Responder al usuario con un resumen pidiendo confirmación
4. Si el usuario confirma con "OK" → guardar en la base de datos
5. Enviar confirmación final al usuario

---

## 3. ESTRUCTURA DE ARCHIVOS EXISTENTE

```
backend/
├── main.py                    ← Registrar el nuevo router aquí
├── database.py                ← get_session(), engine
├── requirements.txt           ← Agregar google-generativeai
├── models/
│   ├── movimiento.py          ← Modelo para compras en cuotas
│   └── gasto_mensual.py       ← Modelo para gastos fijos/variables
├── routers/
│   ├── movimientos.py         ← POST /movimientos/ para crear compras
│   └── gastos_mensuales.py    ← POST /gastos-mensuales/ para crear gastos
└── services/
    └── gmail_importer.py      ← Referencia de cómo conectar con la DB
```

### Archivos que DEBES CREAR:
```
backend/
├── routers/
│   └── whatsapp.py            ← Webhook principal (GET + POST)
└── services/
    ├── gemini_parser.py       ← Llama a Gemini, retorna JSON estructurado
    ├── whatsapp_media.py      ← Descarga archivos de Meta CDN
    ├── whatsapp_sender.py     ← Envía mensajes de vuelta al usuario
    └── whatsapp_sessions.py   ← Gestiona el estado de conversaciones pendientes
```

---

## 4. VARIABLES DE ENTORNO (ya estarán en .env)

```bash
WHATSAPP_TOKEN=EAABc...         # Token de acceso de Meta
PHONE_NUMBER_ID=12345678901234  # ID del número del bot en Meta
WHATSAPP_VERIFY_TOKEN=gastos_familia_webhook_2026  # Token secreto propio
GEMINI_API_KEY=AIzaSy...        # API Key de Google AI Studio
```

---

## 5. SCHEMAS DE LA BASE DE DATOS EXISTENTES

### Para guardar una compra en cuotas (Movimiento):
```python
# POST /movimientos/
{
    "descripcion": "string",          # Nombre de la compra
    "monto_total": float,             # Precio total
    "cuotas": int,                    # Cantidad de cuotas (default: 1)
    "fecha_primera_cuota": "YYYY-MM-DD",  # Primer mes de impacto
    "tarjeta_id": int | None,         # ID de la tarjeta (puede ser null)
    "categoria": "string" | None,
    "notas": "string" | None
}
```

### Para guardar un gasto mensual (GastoMensual):
```python
# POST /gastos-mensuales/
{
    "descripcion": "string",   # Nombre del gasto (ej: "Edesur", "Nafta")
    "monto": float,            # Importe
    "mes": int,                # Mes (1-12)
    "anio": int,               # Año (ej: 2026)
    "es_fijo": bool,           # True si se repite todos los meses
    "categoria": "string" | None,
    "notas": "string" | None
}
```

### Tarjetas disponibles en el sistema (traerlas de la DB):
```python
# GET /tarjetas/ devuelve:
[
    {"id": 1, "nombre": "VISA",       "titular": "Baso",  "color": "#3B82F6"},
    {"id": 2, "nombre": "VISA",       "titular": "Juli",  "color": "#8B5CF6"},
    {"id": 3, "nombre": "MASTER",     "titular": "Juli",  "color": "#EF4444"},
    {"id": 4, "nombre": "CENCOSUD",   "titular": "Juli",  "color": "#10B981"},
    {"id": 5, "nombre": "GALICIA",    "titular": "Moni",  "color": "#F59E0B"},
    {"id": 6, "nombre": "MASTER",     "titular": "Baso",  "color": "#64748B"},
    {"id": 7, "nombre": "BBVA",       "titular": "Juli",  "color": "#06B6D4"},
    {"id": 8, "nombre": "ICBC",       "titular": "Baso",  "color": "#6366F1"},
    {"id": 9, "nombre": "SANTANDER",  "titular": "Sele",  "color": "#EC4899"},
]
```

---

## 6. IMPLEMENTACIÓN DETALLADA

### 6.1. `requirements.txt` — Agregar esta línea:
```
google-generativeai>=0.8.0
```

---

### 6.2. `services/whatsapp_sessions.py`

Maneja el estado de conversaciones pendientes de confirmación. Usar un dict en memoria (no necesita persistencia):

```python
# Estructura del estado pendiente por número de teléfono
pendientes: dict[str, dict] = {}
# Ejemplo:
# {
#   "+5491112345678": {
#       "tipo": "gasto_mensual",    # o "movimiento"
#       "datos": { ... },           # datos extraídos por Gemini
#       "timestamp": datetime       # para limpiar sesiones viejas
#   }
# }

def guardar_pendiente(telefono: str, tipo: str, datos: dict) -> None: ...
def obtener_pendiente(telefono: str) -> dict | None: ...
def limpiar_pendiente(telefono: str) -> None: ...
def limpiar_sesiones_viejas() -> None:  # limpiar sesiones > 10 minutos
```

---

### 6.3. `services/whatsapp_media.py`

Descarga archivos de los servidores de Meta usando el `media_id`:

```python
import httpx
import os

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")

async def descargar_media(media_id: str) -> tuple[bytes, str]:
    """
    Retorna (contenido_bytes, mime_type)
    Paso 1: GET https://graph.facebook.com/v20.0/{media_id}
            Headers: Authorization: Bearer {TOKEN}
            Respuesta: {"url": "...", "mime_type": "application/pdf", ...}
    Paso 2: GET {url}
            Headers: Authorization: Bearer {TOKEN}
            Respuesta: bytes del archivo
    """
    async with httpx.AsyncClient() as client:
        # Paso 1: obtener URL del archivo
        meta_url = f"https://graph.facebook.com/v20.0/{media_id}"
        headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}"}
        resp = await client.get(meta_url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        file_url = data["url"]
        mime_type = data.get("mime_type", "application/octet-stream")
        
        # Paso 2: descargar el archivo real
        file_resp = await client.get(file_url, headers=headers, timeout=60)
        file_resp.raise_for_status()
        
        return file_resp.content, mime_type
```

---

### 6.4. `services/whatsapp_sender.py`

Envía mensajes de texto de vuelta al usuario:

```python
import httpx
import os

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
PHONE_NUMBER_ID = os.getenv("PHONE_NUMBER_ID")

async def enviar_mensaje(telefono: str, texto: str) -> None:
    """
    Envía un mensaje de texto simple al número dado.
    telefono: número en formato internacional, ej: "5491112345678" (sin +)
    """
    url = f"https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": telefono,
        "type": "text",
        "text": {"body": texto}
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
```

---

### 6.5. `services/gemini_parser.py`

El corazón del bot. Recibe el archivo (bytes) y su tipo, devuelve JSON estructurado:

```python
import os
import json
import google.generativeai as genai

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
    model = genai.GenerativeModel("gemini-2.5-flash")
    
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
    
    # Limpiar posible markdown
    if texto_respuesta.startswith("```"):
        texto_respuesta = texto_respuesta.split("```")[1]
        if texto_respuesta.startswith("json"):
            texto_respuesta = texto_respuesta[4:]
    
    return json.loads(texto_respuesta)


def formatear_confirmacion(datos: dict) -> str:
    """Genera el mensaje de confirmación que se le manda al usuario."""
    emoji_confianza = {"alta": "✅", "media": "⚠️", "baja": "❓"}.get(datos.get("confianza"), "❓")
    
    lineas = [
        f"{emoji_confianza} *Entendí esto:*",
        f"📌 *Descripción:* {datos.get('descripcion', 'No detectada')}",
        f"💰 *Monto:* ${datos.get('monto', '???'):,.0f}".replace(",", ".") if datos.get('monto') else "💰 *Monto:* No detectado",
    ]
    
    if datos.get("tarjeta_sugerida"):
        lineas.append(f"💳 *Tarjeta:* {datos['tarjeta_sugerida']}")
    else:
        lineas.append("💳 *Pago:* Efectivo / Transferencia")
    
    if datos.get("cuotas", 1) > 1:
        lineas.append(f"📅 *Cuotas:* {datos['cuotas']}")
    
    if datos.get("es_fijo"):
        lineas.append("🔄 *Tipo:* Gasto Fijo (se repetirá todos los meses)")
    
    if datos.get("confianza") == "baja" and datos.get("razon_baja_confianza"):
        lineas.append(f"\n⚠️ _{datos['razon_baja_confianza']}_")
    
    lineas.append("\n¿Confirmar? Respondé *OK* para guardar o corregí lo que está mal.")
    
    return "\n".join(lineas)
```

---

### 6.6. `routers/whatsapp.py` — El webhook principal

```python
import os
from datetime import date
from fastapi import APIRouter, Request, BackgroundTasks, HTTPException
from sqlmodel import Session, select

from database import engine
from models.tarjeta import Tarjeta
from models.movimiento import Movimiento
from models.gasto_mensual import GastoMensual
from services import gemini_parser, whatsapp_media, whatsapp_sender, whatsapp_sessions
from dateutil.relativedelta import relativedelta

VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "gastos_familia_webhook_2026")

# Números autorizados a usar el bot (sin el "+")
NUMEROS_AUTORIZADOS = os.getenv("WHATSAPP_NUMEROS_AUTORIZADOS", "").split(",")

router = APIRouter(tags=["whatsapp"])


# ─── Verificación del Webhook (Meta lo llama una sola vez para verificar) ───
@router.get("/webhook")
async def verificar_webhook(
    hub_mode: str = None,
    hub_challenge: str = None,
    hub_verify_token: str = None
):
    """Meta llama este endpoint para verificar que el webhook es legítimo."""
    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Token de verificación inválido")


# ─── Recepción de Mensajes ───
@router.post("/webhook")
async def recibir_mensaje(request: Request, background_tasks: BackgroundTasks):
    """
    Meta envía aquí TODOS los eventos: mensajes recibidos, estados, etc.
    DEBE responder 200 OK inmediatamente. El procesamiento va en background.
    """
    data = await request.json()
    
    try:
        entry = data["entry"][0]["changes"][0]["value"]
        
        if "messages" not in entry:
            return {"status": "ok"}  # Es un evento de estado, ignorar
        
        message = entry["messages"][0]
        telefono = message["from"]  # Número del usuario (sin +)
        
        # Verificar número autorizado
        if NUMEROS_AUTORIZADOS and NUMEROS_AUTORIZADOS[0] and telefono not in NUMEROS_AUTORIZADOS:
            return {"status": "ok"}  # Ignorar números no autorizados silenciosamente
        
        background_tasks.add_task(procesar_mensaje, telefono, message)
        
    except (KeyError, IndexError):
        pass  # Payload inesperado, ignorar
    
    return {"status": "ok"}


async def procesar_mensaje(telefono: str, message: dict):
    """Lógica principal de procesamiento (corre en background)."""
    msg_type = message.get("type")
    
    # ─── Caso 1: El usuario confirma un gasto pendiente ───
    if msg_type == "text":
        texto = message["text"]["body"].strip().upper()
        pendiente = whatsapp_sessions.obtener_pendiente(telefono)
        
        if pendiente and texto in ["OK", "SI", "SÍ", "CONFIRMAR", "GUARDAR"]:
            await guardar_en_db(telefono, pendiente["tipo"], pendiente["datos"])
            return
        
        if pendiente and texto in ["NO", "CANCELAR", "CANCEL"]:
            whatsapp_sessions.limpiar_pendiente(telefono)
            await whatsapp_sender.enviar_mensaje(telefono, "❌ Operación cancelada.")
            return
        
        # Si hay pendiente pero mandó un texto diferente, es una corrección
        if pendiente:
            # Enviar el texto como contexto adicional a Gemini para re-analizar
            try:
                datos = await gemini_parser.analizar_contenido(
                    b"", "text/plain", 
                    f"Datos anteriores: {pendiente['datos']}\nCorreción del usuario: {texto}"
                )
                whatsapp_sessions.guardar_pendiente(telefono, datos.get("tipo", "gasto_mensual"), datos)
                confirmacion = gemini_parser.formatear_confirmacion(datos)
                await whatsapp_sender.enviar_mensaje(telefono, confirmacion)
            except Exception as e:
                await whatsapp_sender.enviar_mensaje(telefono, f"❌ No pude procesar la corrección. Error: {str(e)}")
            return
        
        # No hay pendiente y es texto libre → analizarlo como nuevo gasto
        try:
            datos = await gemini_parser.analizar_contenido(b"", "text/plain", texto)
            whatsapp_sessions.guardar_pendiente(telefono, datos.get("tipo", "gasto_mensual"), datos)
            confirmacion = gemini_parser.formatear_confirmacion(datos)
            await whatsapp_sender.enviar_mensaje(telefono, confirmacion)
        except Exception as e:
            await whatsapp_sender.enviar_mensaje(
                telefono, 
                "🤖 Hola! Podés mandarme:\n📄 Una factura PDF\n🖼️ Foto de un ticket\n🎤 Nota de voz\n✍️ Texto con el gasto\n\nEjemplo: *gasté 15000 en nafta con VISA Baso*"
            )
    
    # ─── Caso 2: El usuario manda un archivo (PDF, imagen, audio) ───
    elif msg_type in ["document", "image", "audio", "voice"]:
        await whatsapp_sender.enviar_mensaje(telefono, "⏳ Analizando... un momento.")
        
        try:
            media_id = message[msg_type]["id"]
            mime_type = message[msg_type].get("mime_type", "application/octet-stream")
            
            contenido_bytes, mime_type_real = await whatsapp_media.descargar_media(media_id)
            datos = await gemini_parser.analizar_contenido(contenido_bytes, mime_type_real)
            
            whatsapp_sessions.guardar_pendiente(telefono, datos.get("tipo", "gasto_mensual"), datos)
            confirmacion = gemini_parser.formatear_confirmacion(datos)
            await whatsapp_sender.enviar_mensaje(telefono, confirmacion)
            
        except Exception as e:
            await whatsapp_sender.enviar_mensaje(
                telefono,
                f"❌ Hubo un error al procesar el archivo. Intentá de nuevo o mandá un texto describiendo el gasto."
            )


async def guardar_en_db(telefono: str, tipo: str, datos: dict):
    """Guarda el gasto en la DB y confirma al usuario."""
    try:
        with Session(engine) as session:
            if tipo == "movimiento":
                # Buscar la tarjeta por nombre+titular
                tarjeta_id = None
                if datos.get("tarjeta_sugerida"):
                    partes = datos["tarjeta_sugerida"].split()
                    nombre_tarjeta = partes[0] if partes else ""
                    titular = partes[1] if len(partes) > 1 else ""
                    
                    tarjeta = session.exec(
                        select(Tarjeta).where(
                            Tarjeta.nombre == nombre_tarjeta,
                            Tarjeta.titular == titular
                        )
                    ).first()
                    if tarjeta:
                        tarjeta_id = tarjeta.id
                
                hoy = date.today()
                cuotas = int(datos.get("cuotas", 1))
                monto_total = float(datos.get("monto", 0))
                monto_cuota = monto_total / cuotas
                fecha_fin = hoy + relativedelta(months=cuotas - 1)
                
                mov = Movimiento(
                    descripcion=datos["descripcion"],
                    monto_total=monto_total,
                    cuotas=cuotas,
                    monto_cuota=monto_cuota,
                    fecha_primera_cuota=hoy,
                    fecha_ultima_cuota=fecha_fin,
                    tarjeta_id=tarjeta_id,
                    creado_por="whatsapp"
                )
                session.add(mov)
                session.commit()
                
                msg = f"✅ *¡Guardado!*\n📌 {datos['descripcion']}\n💰 ${monto_total:,.0f}".replace(",", ".")
                if cuotas > 1:
                    msg += f"\n📅 {cuotas} cuotas de ${monto_cuota:,.0f}".replace(",", ".")
                    
            else:  # gasto_mensual
                hoy = date.today()
                gasto = GastoMensual(
                    descripcion=datos["descripcion"],
                    monto=float(datos.get("monto", 0)),
                    mes=hoy.month,
                    anio=hoy.year,
                    es_fijo=datos.get("es_fijo", False),
                    categoria=datos.get("categoria"),
                    notas="Cargado vía WhatsApp Bot"
                )
                session.add(gasto)
                session.commit()
                
                tipo_str = "Gasto Fijo ✅" if datos.get("es_fijo") else "Gasto del mes"
                msg = f"✅ *¡Guardado!*\n📌 {datos['descripcion']}\n💰 ${float(datos.get('monto', 0)):,.0f}\n🔖 {tipo_str}".replace(",", ".")
        
        whatsapp_sessions.limpiar_pendiente(telefono)
        await whatsapp_sender.enviar_mensaje(telefono, msg)
        
    except Exception as e:
        await whatsapp_sender.enviar_mensaje(
            telefono,
            f"❌ Error al guardar en la base de datos: {str(e)}"
        )
```

---

### 6.7. Registrar el router en `main.py`

Agregar estas 2 líneas en el archivo `main.py` existente:

```python
# En los imports de routers (línea 14):
from routers import ..., whatsapp  # agregar whatsapp al import

# Al final de los app.include_router (después de línea 77):
app.include_router(whatsapp.router, prefix="/whatsapp", tags=["whatsapp"])
```

---

## 7. FLUJOS DE CONVERSACIÓN COMPLETOS

### Flujo A — Texto libre
```
USUARIO:  "gasté 15000 en nafta con VISA Baso"
BOT:      "✅ Entendí esto:
           📌 Descripción: Nafta
           💰 Monto: $15.000
           💳 Tarjeta: VISA Baso
           
           ¿Confirmar? Respondé OK para guardar..."
USUARIO:  "OK"
BOT:      "✅ ¡Guardado! 📌 Nafta 💰 $15.000"
```

### Flujo B — PDF de factura
```
USUARIO:  [📄 factura-edesur.pdf]
BOT:      "⏳ Analizando... un momento."
BOT:      "⚠️ Entendí esto:
           📌 Descripción: Edesur Mayo
           💰 Monto: $28.450
           🔄 Tipo: Gasto Fijo
           
           ¿Confirmar? Respondé OK..."
USUARIO:  "el monto es 29000"
BOT:      "✅ Entendí esto:
           📌 Descripción: Edesur Mayo
           💰 Monto: $29.000
           🔄 Tipo: Gasto Fijo
           
           ¿Confirmar?..."
USUARIO:  "OK"
BOT:      "✅ ¡Guardado! Edesur Mayo $29.000 Gasto Fijo ✅"
```

---

## 8. REGLAS DE DESARROLLO QUE DEBES SEGUIR

1. **No uses `any` en TypeScript** (no aplica acá, pero por hábito).
2. **Todas las funciones tienen tipado explícito** en Python.
3. **El webhook responde 200 inmediatamente** — todo el procesamiento va en `BackgroundTasks`.
4. **Los errores se comunican al usuario** vía WhatsApp, nunca se silencian.
5. **No hardcodear el token** — siempre desde `os.getenv()`.
6. **Mensajes de error en español** (consistente con el resto del proyecto).
7. **Seguir el patrón de imports del proyecto**: `from database import get_session`, `from models.X import X`.

---

## 9. CÓMO PROBAR SIN WHATSAPP REAL

Podés testear el `gemini_parser.py` directamente con un script Python:

```python
# test_gemini_parser.py (crear en backend/)
import asyncio
from services.gemini_parser import analizar_contenido, formatear_confirmacion

async def test():
    # Test con texto
    datos = await analizar_contenido(b"", "text/plain", "gasté 50000 en el super con VISA Juli")
    print(datos)
    print(formatear_confirmacion(datos))
    
    # Test con PDF real (usar uno de los PDFs de test que ya hay en el proyecto)
    with open("test_factura.pdf", "rb") as f:
        datos = await analizar_contenido(f.read(), "application/pdf")
        print(datos)

asyncio.run(test())
```

---

## 10. CHECKLIST ANTES DE DECLARAR DONE

- [ ] `google-generativeai` agregado a `requirements.txt`
- [ ] Los 4 archivos de services creados con tipos explícitos
- [ ] `routers/whatsapp.py` creado con GET y POST `/webhook`
- [ ] Router registrado en `main.py`
- [ ] El bot responde correctamente a texto libre
- [ ] El bot puede procesar PDFs y devuelve datos estructurados
- [ ] El bot guarda en DB al recibir "OK"
- [ ] El bot maneja errores y notifica al usuario
- [ ] Sin `print()` de debug en el código final (usar los logs de Uvicorn)
- [ ] Variables de entorno leídas desde `os.getenv()`, nunca hardcodeadas

---

## 11. ENTREGABLES

Al terminar, reportar:
1. Lista de archivos creados/modificados.
2. Resultado del test con `test_gemini_parser.py`.
3. Cualquier decisión de diseño que hayas tomado y por qué.
4. Lo que NO pudiste testear (lo que requiere WhatsApp real).

---

*Brief generado por Antigravity — Arquitecto Sr del proyecto*
