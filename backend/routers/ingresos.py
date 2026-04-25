from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional

from database import get_session
from models.ingreso import Ingreso
from schemas.ingreso import IngresoCreate, IngresoUpdate, IngresoResponse

router = APIRouter()

@router.get("/", response_model=List[IngresoResponse])
def get_ingresos(
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    session: Session = Depends(get_session)
):
    query = select(Ingreso)
    resultados = session.exec(query).all()
    
    # Filtrar por mes actual o si es fijo (y el mes actual es >= al mes de inicio)
    response = []
    if mes and anio:
        val_actual = anio * 12 + mes
        for i in resultados:
            i_val = i.anio * 12 + i.mes
            if (i.mes == mes and i.anio == anio) or (i.es_fijo and val_actual >= i_val):
                response.append(i)
    else:
        response = resultados
        
    return response

@router.post("/", response_model=IngresoResponse)
def create_ingreso(data: IngresoCreate, session: Session = Depends(get_session)):
    nuevo = Ingreso(**data.model_dump())
    session.add(nuevo)
    session.commit()
    session.refresh(nuevo)
    return nuevo

@router.put("/{ingreso_id}", response_model=IngresoResponse)
def update_ingreso(ingreso_id: int, data: IngresoUpdate, session: Session = Depends(get_session)):
    ingreso = session.get(Ingreso, ingreso_id)
    if not ingreso:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")
        
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(ingreso, key, value)
        
    session.add(ingreso)
    session.commit()
    session.refresh(ingreso)
    return ingreso

@router.delete("/{ingreso_id}")
def delete_ingreso(ingreso_id: int, session: Session = Depends(get_session)):
    ingreso = session.get(Ingreso, ingreso_id)
    if not ingreso:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")
    session.delete(ingreso)
    session.commit()
    return {"ok": True}
