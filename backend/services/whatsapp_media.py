import httpx
import os

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")

async def descargar_media(media_id: str) -> tuple[bytes, str]:
    """
    Descarga un archivo de los servidores de Meta usando el media_id.
    Retorna (contenido_bytes, mime_type).
    """
    async with httpx.AsyncClient() as client:
        # Paso 1: Obtener la URL del archivo y su tipo de medio
        meta_url = f"https://graph.facebook.com/v20.0/{media_id}"
        headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}"}
        
        resp = await client.get(meta_url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        
        file_url = data["url"]
        mime_type = data.get("mime_type", "application/octet-stream")
        
        # Paso 2: Descargar el contenido binario real
        # Meta requiere el mismo header de autorización para la descarga
        file_resp = await client.get(file_url, headers=headers, timeout=60)
        file_resp.raise_for_status()
        
        return file_resp.content, mime_type
