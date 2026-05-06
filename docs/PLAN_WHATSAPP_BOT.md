# 🤖 PLAN: Bot de WhatsApp con IA para Gastos Familiares
## Análisis de Factibilidad y Plan de Implementación — Fase 4.0

---

## 🎯 Visión del Producto

Un bot de WhatsApp que actúa como **asistente financiero personal**. El usuario le manda desde su celular:
- 📄 Un PDF (factura de Edesur, resumen de tarjeta)
- 🖼️ Una foto del ticket del supermercado
- 🎤 Un mensaje de voz ("gasté 15.000 pesos en nafta hoy")

El bot analiza el contenido con IA, responde con un resumen estructurado pidiendo confirmación, y al recibir un "OK" guarda el gasto directamente en la base de datos de la app.

---

## ✅ Veredicto: ES TOTALMENTE FACTIBLE

El stack que ya usamos (FastAPI + Python) puede soportar esto con un costo mensual cercano a **$0 USD** para el volumen de uso familiar.

---

## 💰 Análisis de Costos

### WhatsApp Business Cloud API (Meta)
| Concepto | Costo |
|---|---|
| Registro de cuenta | **GRATIS** |
| Mensajes de servicio (respuesta a mensaje del usuario) | **GRATIS** dentro de la ventana de 24hs |
| Mensajes iniciados por el bot (template messages) | ~$0.007 USD por mensaje (Argentina) |
| **Estimado mensual (uso familiar ~50 mensajes/mes)** | **~$0** |

> **Conclusión WhatsApp**: No se paga nada si los usuarios inician la conversación (que es siempre el caso aquí). La ventana de 24hs cubre todo el flujo de confirmación.

### Gemini API (Google AI)
| Modelo | Input | Output | Multimodal |
|---|---|---|---|
| **Gemini 2.5 Flash** | $0.15 / 1M tokens | $0.60 / 1M tokens | ✅ PDF, imagen, audio |
| Free Tier (AI Studio) | 15 RPM, 1500 req/día | 15 RPM, 1500 req/día | ✅ Incluido |

> **Conclusión Gemini**: El **Free Tier es más que suficiente** para uso familiar. 50 facturas/mes ≈ $0.01 USD. Prácticamente gratuito.

### 🏆 Costo Total Estimado: $0 USD/mes
*(Solo si se supera el free tier, lo cual requiere miles de requests diarios)*

---

## 🏗️ Arquitectura Propuesta

```
Usuario (WhatsApp)
    │
    │  [PDF / Foto / Voz / Texto]
    ▼
Meta Cloud API
    │
    │  POST webhook con media_id
    ▼
FastAPI Webhook (nuevo router: /routers/whatsapp.py)
    │
    ├── 1. Descargar archivo de Meta (usando media_id)
    ├── 2. Enviar a Gemini con prompt estructurado
    ├── 3. Recibir JSON con datos del gasto
    ├── 4. Enviar mensaje de confirmación al usuario
    │
    │  [Usuario responde "OK" o corrige]
    │
    ├── 5. Si OK → guardar en DB (misma lógica de /movimientos)
    └── 6. Confirmar con mensaje final "✅ Gasto guardado!"

[DB: SQLite / gastos.db]
    │
    ▼
Dashboard Web (datos actualizados en tiempo real)
```

---

## 📦 Componentes a Desarrollar

### Backend (Python / FastAPI)
1. **`routers/whatsapp.py`**: Webhook que recibe eventos de Meta.
2. **`services/whatsapp_media.py`**: Descarga archivos desde la CDN de Meta.
3. **`services/gemini_parser.py`**: Llama a Gemini con el archivo y el prompt, retorna JSON estructurado.
4. **`services/whatsapp_sender.py`**: Envía mensajes de vuelta al usuario.
5. **`services/confirmaciones.py`**: Maneja el estado de las conversaciones pendientes (usando un dict en memoria o una tabla en SQLite).

### Dependencias Nuevas (requirements.txt)
```
google-generativeai>=0.8.0  # Gemini SDK oficial
httpx                        # Ya existe — para llamadas a Meta API
```

### Variables de Entorno Nuevas (.env)
```bash
WHATSAPP_TOKEN=              # Token de acceso de la app de Meta
PHONE_NUMBER_ID=             # ID del número de WhatsApp Business
WHATSAPP_VERIFY_TOKEN=       # Token secreto para verificar el webhook
GEMINI_API_KEY=              # API Key de Google AI Studio
```

---

## 🗣️ Flujos de Conversación Detallados

### Flujo A: Mensaje de Voz
```
Usuario → [🎤 "gasté quince mil en nafta hoy con la visa de baso"]

Bot → Gemini (audio OGG → transcripción + análisis)

Bot → "📝 Entendí esto:
       • Descripción: Nafta
       • Monto: $15.000
       • Tarjeta: BASO VISA
       • Fecha: hoy (6/5/2026)
       
       ¿Confirmar? Respondé *OK* para guardar o corregí lo que está mal."

Usuario → "OK"

Bot → "✅ ¡Listo! Nafta por $15.000 guardada en BASO VISA."
```

### Flujo B: Foto de Ticket
```
Usuario → [📷 foto del ticket del super]

Bot → Gemini (imagen → OCR + análisis)

Bot → "📝 Analicé el ticket:
       • Descripción: Supermercado Carrefour
       • Monto: $47.320
       • Tarjeta: (no detectada) — ¿cuál usaste?
       
       Respondé con la tarjeta o *OK* para guardar como Efectivo."

Usuario → "JULI VISA"

Bot → "✅ Guardado: Supermercado $47.320 en JULI VISA."
```

### Flujo C: PDF de Factura
```
Usuario → [📄 factura-edesur-mayo.pdf]

Bot → Gemini (PDF → extracción)

Bot → "📝 Encontré en la factura:
       • Servicio: Edesur
       • Monto: $28.450
       • Vencimiento: 15/05/2026
       • ¿Guardarlo como Gasto Fijo?
       
       Respondé *OK*, *FIJO* para marcar como fijo, o *NO*."

Usuario → "FIJO"

Bot → "✅ Edesur $28.450 guardado como Gasto Fijo."
```

---

## 🔧 Prompt para Gemini (Multimodal)

```python
PROMPT_EXTRACCION = """
Sos un asistente financiero. Analizá el archivo adjunto (puede ser 
una factura PDF, foto de ticket, o transcripción de audio).

Extraé la siguiente información y respondé ÚNICAMENTE con JSON válido:
{
  "descripcion": "nombre del gasto",
  "monto": <número sin formato>,
  "tarjeta_sugerida": "nombre de la tarjeta o null",
  "es_fijo": <true si es un servicio recurrente, false si no>,
  "confianza": <"alta" | "media" | "baja">
}

Tarjetas disponibles: BASO VISA, JULI VISA, JULI MASTER, 
JULI CENCOSUD, MONI GALICIA, BASO MASTER, JULI BBVA, BASO ICBC.

Si no podés detectar algún campo, ponelo en null.
"""
```

---

## 📋 Plan de Implementación (Sprints)

### Sprint 1: Infraestructura Base (1-2 días)
- [ ] Crear cuenta Meta for Developers y app de WhatsApp Business (GRATIS).
- [ ] Registrar número de teléfono en la app.
- [ ] Implementar `GET /webhook` para verificación de Meta.
- [ ] Implementar `POST /webhook` que logea mensajes recibidos.
- [ ] Exponer el webhook via Cloudflare Tunnel (ya existente en la infraestructura).

### Sprint 2: Integración Gemini (1 día)
- [ ] Agregar `google-generativeai` a requirements.txt.
- [ ] Crear `services/gemini_parser.py` con lógica de análisis multimodal.
- [ ] Probar con PDF y foto desde la terminal.

### Sprint 3: Flujo Completo (2-3 días)
- [ ] Implementar descarga de media desde Meta CDN.
- [ ] Implementar envío de mensajes de respuesta.
- [ ] Implementar sesión/estado de confirmaciones.
- [ ] Conectar con los endpoints existentes `/movimientos` y `/gastos-mensuales`.

### Sprint 4: Pulido y Deploy (1 día)
- [ ] Agregar verificación de firma HMAC (seguridad).
- [ ] Limitar a números de teléfono autorizados (solo Baso y Juli).
- [ ] Deploy en Raspberry Pi vía `deploy.sh`.
- [ ] Pruebas end-to-end en WhatsApp real.

---

## ⚠️ Consideraciones y Limitaciones

| Tema | Detalle |
|---|---|
| **Número de teléfono** | Necesitás un número dedicado para el bot. Puede ser un número nuevo de SIM o un número de Twilio. |
| **Acceso HTTPS** | El webhook de Meta requiere HTTPS. Ya lo tenemos vía Cloudflare Tunnel ✅ |
| **Transcripción de voz** | El audio llega en formato OGG. Gemini lo puede procesar directamente sin conversión. |
| **Seguridad** | Solo números autorizados (Baso y Juli) pueden escribirle al bot. |
| **Latencia** | El análisis de Gemini tarda ~2-5 segundos. El webhook debe responder 200 inmediatamente y procesar en background. |

---

## 🚦 Requisitos para Arrancar

1. **Cuenta en Meta for Developers** → Gratis, se crea en developers.facebook.com
2. **Número para el Bot** → Puede ser cualquier número de teléfono no registrado en WhatsApp normal (o comprar un número virtual ~$1-2 USD/mes)
3. **API Key de Gemini** → Gratis desde aistudio.google.com
4. **Nada más** — El resto ya lo tenemos (FastAPI, Cloudflare Tunnel, Docker, RPI)

---

## 📌 Próximo Paso Inmediato

```
1. Crear cuenta en developers.facebook.com
2. Crear una nueva App de tipo "Business"
3. Agregar el producto "WhatsApp"
4. Conseguir el Access Token y Phone Number ID
5. Decirle a Antigravity que implemente el Sprint 1
```
