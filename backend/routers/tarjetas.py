from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from database import get_session
from models.tarjeta import Tarjeta
from schemas.tarjeta import TarjetaResponse, TarjetaCreate, TarjetaUpdate

router = APIRouter(tags=["Tarjetas"])

@router.get("/", response_model=List[TarjetaResponse])
def get_tarjetas(session: Session = Depends(get_session)):
    query = select(Tarjeta).where(Tarjeta.activa == True)
    return session.exec(query).all()

@router.post("/", response_model=TarjetaResponse)
def create_tarjeta(data: TarjetaCreate, session: Session = Depends(get_session)):
    tarjeta = Tarjeta(**data.model_dump())
    session.add(tarjeta)
    session.commit()
    session.refresh(tarjeta)
    return tarjeta

@router.put("/{tarjeta_id}", response_model=TarjetaResponse)
def update_tarjeta(tarjeta_id: int, data: TarjetaUpdate, session: Session = Depends(get_session)):
    tarjeta = session.get(Tarjeta, tarjeta_id)
    if not tarjeta:
        raise HTTPException(status_code=404, detail="Tarjeta no encontrada")
        
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(tarjeta, key, value)
        
    session.add(tarjeta)
    session.commit()
    session.refresh(tarjeta)
    return tarjeta

@router.delete("/{tarjeta_id}")
def delete_tarjeta(tarjeta_id: int, session: Session = Depends(get_session)):
    tarjeta = session.get(Tarjeta, tarjeta_id)
    if not tarjeta:
        raise HTTPException(status_code=404, detail="Tarjeta no encontrada")
    
    # Usamos soft-delete (inactivación) para no romper foreign keys en movimientos históricos
    tarjeta.activa = False
    session.add(tarjeta)
    session.commit()
    
    return {"ok": True}
