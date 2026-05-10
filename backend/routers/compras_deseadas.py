from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

from database import get_session
from models.compra_deseada import CompraDeseada
from schemas.compra_deseada import CompraDeseadaCreate, CompraDeseadaUpdate, CompraDeseadaResponse

router = APIRouter()

@router.get("/", response_model=List[CompraDeseadaResponse])
def get_compras_deseadas(
    estado: Optional[str] = Query(None),
    session: Session = Depends(get_session)
):
    query = select(CompraDeseada)
    if estado:
        query = query.where(CompraDeseada.estado == estado)
    return session.exec(query).all()

@router.post("/", response_model=CompraDeseadaResponse)
def create_compra_deseada(data: CompraDeseadaCreate, session: Session = Depends(get_session)):
    compra = CompraDeseada(**data.model_dump())
    session.add(compra)
    session.commit()
    session.refresh(compra)
    return compra

@router.put("/{id}", response_model=CompraDeseadaResponse)
def update_compra_deseada(id: int, data: CompraDeseadaUpdate, session: Session = Depends(get_session)):
    compra = session.get(CompraDeseada, id)
    if not compra:
        raise HTTPException(status_code=404, detail="Compra deseada no encontrada")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(compra, key, value)
    
    session.add(compra)
    session.commit()
    session.refresh(compra)
    return compra

@router.patch("/{id}/comprar", response_model=CompraDeseadaResponse)
def marcar_comprada(id: int, session: Session = Depends(get_session)):
    compra = session.get(CompraDeseada, id)
    if not compra:
        raise HTTPException(status_code=404, detail="Compra deseada no encontrada")
    
    compra.estado = "comprado"
    compra.comprado_en = datetime.utcnow()
    
    session.add(compra)
    session.commit()
    session.refresh(compra)
    return compra

@router.delete("/{id}")
def delete_compra_deseada(id: int, session: Session = Depends(get_session)):
    compra = session.get(CompraDeseada, id)
    if not compra:
        raise HTTPException(status_code=404, detail="Compra deseada no encontrada")
    
    session.delete(compra)
    session.commit()
    return {"ok": True}
