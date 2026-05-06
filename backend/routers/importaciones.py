from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List

from database import get_session
from models.importacion import GmailImporterConfig, ImportacionLog
from services.gmail_importer import importar_facturas

router = APIRouter()

@router.post("/ejecutar", response_model=List[ImportacionLog])
def ejecutar_importacion_manual(db: Session = Depends(get_session)):
    """Ejecuta el proceso de importación de Gmail de forma manual."""
    # Retorna la lista de logs generados en esta ejecución
    logs = importar_facturas(db, dias_atras=30)
    return logs

@router.get("/historial", response_model=List[ImportacionLog])
def obtener_historial_importaciones(limit: int = 50, db: Session = Depends(get_session)):
    """Obtiene los últimos N registros de log de importación."""
    logs = db.exec(
        select(ImportacionLog)
        .order_by(ImportacionLog.id.desc())
        .limit(limit)
    ).all()
    return logs

@router.get("/config", response_model=List[GmailImporterConfig])
def obtener_configuraciones(db: Session = Depends(get_session)):
    """Obtiene las configuraciones activas de importación."""
    configs = db.exec(select(GmailImporterConfig)).all()
    return configs

@router.get("/arca/{mes}/{anio}")
def get_arca_mes(mes: int, anio: int, db: Session = Depends(get_session)):
    """
    Devuelve el último log de importación por referente para un mes/año dado.
    Usado en el módulo 'Presentación ARCA' del Dashboard.
    """
    from sqlmodel import func
    # Obtener el ID máximo de ImportacionLog para cada descripcion que deba incluirse en arca
    # Limitando a los logs que son de este mes o de meses anteriores
    subquery = (
        select(func.max(ImportacionLog.id))
        .where(ImportacionLog.accion != "error")
        .where(ImportacionLog.incluir_en_arca == True)
        .where(
            (ImportacionLog.anio < anio) | 
            ((ImportacionLog.anio == anio) & (ImportacionLog.mes <= mes))
        )
        .group_by(ImportacionLog.descripcion)
    )
    logs = db.exec(
        select(ImportacionLog)
        .where(ImportacionLog.id.in_(subquery))
    ).all()
    
    items = []
    total = 0
    for log in logs:
        # Es previsionado si el mes/año del log es estrictamente anterior al mes/año solicitado
        is_previsionado = (log.anio < anio) or (log.anio == anio and log.mes < mes)
        
        items.append({
            "id": log.id,
            "descripcion": log.descripcion,
            "monto": log.monto,
            "fecha_vencimiento": log.fecha_vencimiento,
            "previsionado": is_previsionado
        })
        total += log.monto
        
    return {"items": items, "total": total}
