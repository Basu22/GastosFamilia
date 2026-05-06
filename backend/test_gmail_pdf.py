import sys
import base64
import re
import io
from sqlmodel import Session, create_engine
from datetime import datetime, date

# Simular importar_facturas o usar api directly
sys.path.append("/home/flink/Documentos/Gastos Familia/backend")
from services.gmail_importer import build_gmail_service, normalizar_monto, _iterar_partes
import pdfplumber

def test_starlink():
    service = build_gmail_service()
    # Buscar ultimo mail de starlink
    query = "from:no-reply@starlink.com"
    resultados = service.users().messages().list(userId='me', q=query, maxResults=3).execute()
    mensajes = resultados.get('messages', [])
    
    for msg_ref in mensajes:
        msg_id = msg_ref['id']
        print(f"Buscando en mail {msg_id}")
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
                    break
        
        if not pdf_data:
            print("No pdf found")
            continue
            
        texto_pdf = ""
        with pdfplumber.open(io.BytesIO(pdf_data)) as pdf:
            for pagina in pdf.pages:
                texto_pdf += pagina.extract_text() or ""
                
        print("TEXTO OBTENIDO:")
        print("---")
        print(texto_pdf)
        print("---")
        
        match_monto = re.search(r'IMPORTE TOTAL\s+([\d\.]+,\d{2})', texto_pdf)
        match_fecha = re.search(r'el (\d{1,2}/\d{1,2}/\d{4})', texto_pdf)
        print(f"match_monto: {match_monto}")
        print(f"match_fecha: {match_fecha}")
        if match_monto: print(match_monto.group(1))
        if match_fecha: print(match_fecha.group(1))

test_starlink()
