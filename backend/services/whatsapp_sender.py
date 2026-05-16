import httpx
import os

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
PHONE_NUMBER_ID = os.getenv("PHONE_NUMBER_ID")

async def enviar_mensaje(telefono: str, texto: str) -> None:
    """
    Envía un mensaje de texto simple al número dado vía WhatsApp Cloud API.
    telefono: número en formato internacional sin el '+' (ej: 5491112345678)
    """

    if not WHATSAPP_TOKEN or not PHONE_NUMBER_ID:
        print("⚠️ WhatsApp Token o Phone Number ID no configurados")
        return

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
        if resp.status_code != 200:
            print(f"❌ Error enviando mensaje WhatsApp: {resp.text}")
        resp.raise_for_status()
