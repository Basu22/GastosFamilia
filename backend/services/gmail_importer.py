import os
import re
import base64
from datetime import datetime, timedelta, date
from sqlmodel import Session, select
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from bs4 import BeautifulSoup

from models.importacion import GmailImporterConfig, ImportacionLog
from models.gasto_mensual import GastoMensual
# Usamos la misma lógica de los routers para actualizar/crear gastos
from routers.gastos_mensuales import update_gasto_mensual, create_gasto_mensual

# Para simular los modelos de Pydantic que esperan las funciones originales
from schemas.gasto_mensual import GastoMensualUpdate, GastoMensualCreate

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def normalizar_monto(texto_monto: str) -> float:
    texto = texto_monto.strip()
    if ',' in texto and '.' in texto:
        if texto.index(',') < texto.index('.'):
            return float(texto.replace(',', ''))
        else:
            return float(texto.replace('.', '').replace(',', '.'))
    elif ',' in texto:
        return float(texto.replace(',', '.'))
    else:
        return float(texto.replace('.', ''))

def _parsear_html_body(mensaje_raw: dict, config: GmailImporterConfig) -> tuple[float, date] | None:
    import base64
    import re
    from datetime import datetime

    payload = mensaje_raw.get('payload', {})
    body_data = ""

    if payload.get('body', {}).get('data'):
        body_data = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8', errors='ignore')
    else:
        for parte in payload.get('parts', []):
            if parte.get('mimeType') in ['text/plain', 'text/html']:
                data = parte.get('body', {}).get('data', '')
                if data:
                    body_data += base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')

    match_monto = re.search(r'monto es de \$([\d\.]+,\d{2})', body_data)
    match_fecha = re.search(r'vencimiento el d[ií]a (\d{2}/\d{2}/\d{4})', body_data)

    if not match_monto or not match_fecha:
        return None

    monto = normalizar_monto(match_monto.group(1))
    fecha_venc = datetime.strptime(match_fecha.group(1), '%d/%m/%Y').date()

    return monto, fecha_venc

def _iterar_partes(payload: dict):
    yield payload
    for parte in payload.get('parts', []):
        yield from _iterar_partes(parte)

def _parsear_pdf_adjunto(service, msg_id: str, config: GmailImporterConfig) -> tuple[float, date] | None:
    import base64, re, io
    from datetime import datetime
    import pdfplumber

    mensaje = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
    
    pdf_data = None
    for parte in _iterar_partes(mensaje.get('payload', {})):
        if parte.get('mimeType') == 'application/pdf' or (parte.get('filename', '').endswith('.pdf')):
            att_id = parte.get('body', {}).get('attachmentId')
            if att_id:
                att = service.users().messages().attachments().get(
                    userId='me', messageId=msg_id, id=att_id
                ).execute()
                pdf_data = base64.urlsafe_b64decode(att['data'])
                break

    if not pdf_data:
        return None

    texto_pdf = ""
    with pdfplumber.open(io.BytesIO(pdf_data)) as pdf:
        for pagina in pdf.pages:
            texto_pdf += pagina.extract_text() or ""

    if "Starlink" in config.descripcion:
        match_monto = re.search(r'IMPORTE TOTAL\s+([\d\.]+,\d{2})', texto_pdf)
        match_fecha = re.search(r'el (\d{1,2}/\d{1,2}/\d{4})', texto_pdf)
        if not match_fecha:
            match_fecha = re.search(r'Fecha Vto CAE:(\d{2}/\d{2}/\d{4})', texto_pdf)
        fmt_fecha = '%d/%m/%Y'
    else:  # Fincas
        match_monto = re.search(r'TOTAL A PAGAR\s*\$?\s*([\d,\.]+)', texto_pdf)
        match_fecha = re.search(r'VENCIMIENTO[:\s]+(\d{2}/\d{2}/\d{4})', texto_pdf)
        fmt_fecha = '%d/%m/%Y'

    if not match_monto or not match_fecha:
        return None

    monto = normalizar_monto(match_monto.group(1))
    fecha_str = match_fecha.group(1)
    partes = fecha_str.split('/')
    fecha_str_normalizada = f"{partes[0].zfill(2)}/{partes[1].zfill(2)}/{partes[2]}"
    fecha_venc = datetime.strptime(fecha_str_normalizada, fmt_fecha).date()

    return monto, fecha_venc

def _importar_por_remitente(service, db: Session, config: GmailImporterConfig, dias_atras: int) -> list[ImportacionLog]:
    from datetime import datetime, timedelta

    fecha_limite = (datetime.now() - timedelta(days=dias_atras)).strftime('%Y/%m/%d')
    query = f"from:{config.remitente} after:{fecha_limite}"
    
    resultados = service.users().messages().list(userId='me', q=query).execute()
    mensajes = resultados.get('messages', [])

    logs = []
    for msg_ref in mensajes:
        msg_id = msg_ref['id']

        try:
            if config.tipo_parser == "html_body":
                msg_full = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
                resultado = _parsear_html_body(msg_full, config)
            elif config.tipo_parser == "pdf":
                resultado = _parsear_pdf_adjunto(service, msg_id, config)
            else:
                continue

            if not resultado:
                # Si no es parseable, asumimos que no es la factura correcta y lo ignoramos sin registrar error.
                continue

            monto, fecha_venc = resultado
            mes, anio = fecha_venc.month, fecha_venc.year

            gasto_existente = db.exec(
                select(GastoMensual)
                .where(GastoMensual.descripcion == config.descripcion)
                .where(GastoMensual.es_fijo == True)
                .where(
                    (GastoMensual.mes_fin == None) |
                    ((GastoMensual.anio_fin * 12 + GastoMensual.mes_fin) >= (anio * 12 + mes))
                )
                .order_by(GastoMensual.id.desc())
            ).first()

            if gasto_existente:
                gasto_existente.mes = mes
                gasto_existente.anio = anio
                if gasto_existente.monto == monto:
                    accion, detalle = "sin_cambios", "El gasto ya existe con el mismo monto (fecha actualizada)"
                else:
                    monto_anterior = gasto_existente.monto
                    gasto_existente.monto = monto
                    accion = "actualizado"
                    detalle = f"Monto actualizado de {monto_anterior} a {monto}"
                db.add(gasto_existente)
            else:
                db.add(GastoMensual(
                    descripcion=config.descripcion, monto=monto,
                    mes=mes, anio=anio, es_fijo=True,
                    notas=f"Importado automáticamente (remitente: {config.remitente})"
                ))
                accion, detalle = "creado", "Nuevo gasto mensual creado"

            logs.append(ImportacionLog(
                referente=config.remitente, descripcion=config.descripcion,
                monto=monto, mes=mes, anio=anio,
                fecha_vencimiento=fecha_venc.isoformat(),
                accion=accion, detalle=detalle,
                incluir_en_arca=config.incluir_en_arca
            ))

        except Exception as e:
            # En lugar de ensuciar la UI con errores por correos que no son facturas, 
            # simplemente lo ignoramos.
            print(f"Ignorando correo de {config.remitente} (no es factura o falló el parseo): {e}")

    return logs

def build_gmail_service():
    """Construye y retorna el servicio de la API de Gmail."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    token_path = os.path.join(base_dir, 'credentials', 'gmail_token.json')
    
    if not os.path.exists(token_path):
        raise FileNotFoundError(f"No se encontró el token de Gmail en {token_path}. Debes autenticarte primero.")
    
    creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    service = build('gmail', 'v1', credentials=creds)
    return service

def extraer_texto_mensaje(payload):
    """Extrae el cuerpo del mensaje en texto plano (preferible) o HTML convertido."""
    if 'parts' in payload:
        for part in payload['parts']:
            if part['mimeType'] == 'text/plain':
                data = part['body'].get('data')
                if data:
                    return base64.urlsafe_b64decode(data).decode('utf-8')
            elif part['mimeType'] == 'text/html':
                data = part['body'].get('data')
                if data:
                    html = base64.urlsafe_b64decode(data).decode('utf-8')
                    return BeautifulSoup(html, "html.parser").get_text()
    else:
        data = payload['body'].get('data')
        if data:
            texto = base64.urlsafe_b64decode(data).decode('utf-8')
            if payload['mimeType'] == 'text/html':
                return BeautifulSoup(texto, "html.parser").get_text()
            return texto
    return ""

def parsear_asunto(asunto: str):
    """
    Busca patrón: "El saldo total a debitar es $48.378,42 y vence el 06/05/2026"
    Retorna (monto: float, fecha_venc: date) o (None, None)
    """
    # Regex adaptado a formatos de moneda argentinos ($1.234,56 o $1234.56)
    match = re.search(r"es\s+\$([0-9.,]+)\s+y\s+vence\s+el\s+(\d{2}/\d{2}/\d{4})", asunto)
    if not match:
        return None, None
    
    monto_str = match.group(1)
    # Limpiar separadores de miles y convertir coma a punto
    if "," in monto_str and "." in monto_str:
        monto_str = monto_str.replace(".", "").replace(",", ".")
    elif "," in monto_str:
        monto_str = monto_str.replace(",", ".")
        
    monto = float(monto_str)
    
    # Parsear fecha
    fecha_str = match.group(2)
    fecha_venc = datetime.strptime(fecha_str, "%d/%m/%Y").date()
    
    return monto, fecha_venc

def parsear_referente(cuerpo: str):
    """
    Busca patrón: "Referente de pago 1002577507810001"
    Retorna str o None
    """
    match = re.search(r"Referente\s+de\s+pago[:\s]+(\d{16})", cuerpo, re.IGNORECASE)
    if match:
        return match.group(1)
    return None

def importar_facturas(db: Session, dias_atras: int = 30):
    """
    Función principal que lee correos y sincroniza con la base de datos.
    """
    logs = []
    
    try:
        service = build_gmail_service()
    except Exception as e:
        log = ImportacionLog(referente="SISTEMA", descripcion="Error Conexión Gmail", 
                             monto=0, mes=0, anio=0, accion="error", detalle=str(e))
        db.add(log)
        db.commit()
        return [log]

    # Cargar configuraciones activas
    configs = db.exec(select(GmailImporterConfig).where(GmailImporterConfig.activo == True)).all()
    if not configs:
        return []

    # Para limitar la búsqueda a los últimos X días
    fecha_limite = (datetime.now() - timedelta(days=dias_atras)).strftime('%Y/%m/%d')
    query = f"from:facturacion@email.personal.com.ar after:{fecha_limite}"

    resultados = service.users().messages().list(userId='me', q=query).execute()
    mensajes = resultados.get('messages', [])

    if mensajes:
        # Evitamos procesar el mismo mensaje/referente varias veces si hubo múltiples correos en el mismo mes
        procesados = set()

        for msg in mensajes:
            txt_msg = service.users().messages().get(userId='me', id=msg['id'], format='full').execute()
            payload = txt_msg['payload']
            headers = payload.get('headers', [])
            
            asunto = next((h['value'] for h in headers if h['name'] == 'Subject'), "")
            cuerpo = extraer_texto_mensaje(payload)
            
            monto, fecha_venc = parsear_asunto(asunto)
            referente = parsear_referente(cuerpo)
            
            if not monto or not fecha_venc or not referente:
                # No es el formato esperado
                continue
                
            mes = fecha_venc.month
            anio = fecha_venc.year
            
            clave_unica = f"{referente}-{mes}-{anio}"
            if clave_unica in procesados:
                continue
            procesados.add(clave_unica)
            
            # Buscar config para este referente
            config = next((c for c in configs if c.referente == referente), None)
            if not config:
                logs.append(ImportacionLog(
                    referente=referente, descripcion="Desconocido", monto=monto, 
                    mes=mes, anio=anio, fecha_vencimiento=fecha_venc.isoformat(), accion="ignorado", 
                    detalle="Referente no configurado en el sistema"
                ))
                continue

            # Lógica de creación / actualización del gasto
            gasto_existente = db.exec(
                select(GastoMensual)
                .where(GastoMensual.descripcion == config.descripcion)
                .where(GastoMensual.es_fijo == True)
                .where(
                    (GastoMensual.mes_fin == None) | 
                    ((GastoMensual.anio_fin * 12 + GastoMensual.mes_fin) >= (anio * 12 + mes))
                )
                .order_by(GastoMensual.id.desc())
            ).first()

            try:
                if gasto_existente:
                    gasto_existente.mes = mes
                    gasto_existente.anio = anio
                    
                    if gasto_existente.monto == monto:
                        # sin_cambios (pero fecha actualizada)
                        db.add(gasto_existente)
                        logs.append(ImportacionLog(
                            referente=referente, descripcion=config.descripcion, monto=monto, 
                            mes=mes, anio=anio, fecha_vencimiento=fecha_venc.isoformat(), accion="sin_cambios", 
                            detalle="El gasto ya existe y tiene el mismo monto (fecha actualizada)"
                        ))
                    else:
                        monto_anterior = gasto_existente.monto
                        gasto_existente.monto = monto
                        db.add(gasto_existente)
                        logs.append(ImportacionLog(
                            referente=referente, descripcion=config.descripcion, monto=monto, 
                            mes=mes, anio=anio, fecha_vencimiento=fecha_venc.isoformat(), accion="actualizado", 
                            detalle=f"Monto actualizado de {monto_anterior} a {monto}"
                        ))
                else:
                    # Crear nuevo
                    nuevo_gasto = GastoMensual(
                        descripcion=config.descripcion,
                        monto=monto,
                        mes=mes,
                        anio=anio,
                        es_fijo=True,
                        notas=f"Importado automáticamente de Personal (Ref: {referente})"
                    )
                    db.add(nuevo_gasto)
                    logs.append(ImportacionLog(
                        referente=referente, descripcion=config.descripcion, monto=monto, 
                        mes=mes, anio=anio, fecha_vencimiento=fecha_venc.isoformat(), accion="creado", 
                        detalle="Nuevo gasto mensual creado"
                    ))
                    
            except Exception as e:
                logs.append(ImportacionLog(
                    referente=referente, descripcion=config.descripcion, monto=monto, 
                    mes=mes, anio=anio, fecha_vencimiento=fecha_venc.isoformat(), accion="error", 
                    detalle=f"Error al procesar: {str(e)}"
                ))

    # Flujo B: configs con tipo_parser != "referente"
    configs_directas = db.exec(
        select(GmailImporterConfig)
        .where(GmailImporterConfig.activo == True)
        .where(GmailImporterConfig.tipo_parser != "referente")
    ).all()

    for config in configs_directas:
        logs_nuevos = _importar_por_remitente(service, db, config, dias_atras)
        logs.extend(logs_nuevos)

    # Guardar logs en la BD
    for log in logs:
        db.add(log)
    db.commit()
    
    return logs
