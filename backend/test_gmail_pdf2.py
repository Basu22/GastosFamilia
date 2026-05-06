import sys, base64, re, io
sys.path.append("/home/flink/Documentos/Gastos Familia/backend")
from services.gmail_importer import build_gmail_service, _iterar_partes
import pdfplumber

service = build_gmail_service()
query = "from:no-reply@starlink.com"
resultados = service.users().messages().list(userId='me', q=query, maxResults=1).execute()
mensajes = resultados.get('messages', [])
msg_id = mensajes[0]['id']
mensaje = service.users().messages().get(userId='me', id=msg_id, format='full').execute()

pdf_data = None
for parte in _iterar_partes(mensaje.get('payload', {})):
    if parte.get('mimeType') == 'application/pdf' or parte.get('filename', '').endswith('.pdf'):
        att_id = parte.get('body', {}).get('attachmentId')
        if att_id:
            att = service.users().messages().attachments().get(
                userId='me', messageId=msg_id, id=att_id
            ).execute()
            pdf_data = base64.urlsafe_b64decode(att['data'])
            # Parse only the first PDF that has "Factura" in it
            with pdfplumber.open(io.BytesIO(pdf_data)) as pdf:
                texto_pdf = "".join(p.extract_text() or "" for p in pdf.pages)
            if "IMPORTE TOTAL" in texto_pdf:
                print("--- FACTURA TEXT ---")
                print(texto_pdf[:1500])
                break
