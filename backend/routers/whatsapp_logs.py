from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from database import get_session, engine
from models.whatsapp_log import WhatsappLog

router = APIRouter()

@router.get("/", response_model=List[WhatsappLog])
def get_whatsapp_logs(session: Session = Depends(get_session)):
    query = select(WhatsappLog).order_by(WhatsappLog.creado_en.desc()).limit(50)
    return session.exec(query).all()

@router.get("/{id}", response_model=WhatsappLog)
def get_whatsapp_log(id: int, session: Session = Depends(get_session)):
    log = session.get(WhatsappLog, id)
    if not log:
        raise HTTPException(status_code=404, detail="Log no encontrado")
    return log

@router.delete("/{id}")
def delete_whatsapp_log(id: int, session: Session = Depends(get_session)):
    log = session.get(WhatsappLog, id)
    if not log:
        raise HTTPException(status_code=404, detail="Log no encontrado")
    session.delete(log)
    session.commit()
    return {"ok": True}
