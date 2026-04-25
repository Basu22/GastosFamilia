from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional

from database import get_session
from models.gasto_mensual import GastoMensual
from schemas.gasto_mensual import GastoMensualCreate, GastoMensualUpdate, GastoMensualResponse

router = APIRouter()

@router.get("/", response_model=List[GastoMensualResponse])
def get_gastos_mensuales(
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    session: Session = Depends(get_session)
):
    query = select(GastoMensual)
    resultados = session.exec(query).all()
    
    # Filtrar por mes actual o si es fijo (y el mes actual es >= al mes de inicio)
    response = []
    if mes and anio:
        val_actual = anio * 12 + mes
        for g in resultados:
            g_val = g.anio * 12 + g.mes
            if (g.mes == mes and g.anio == anio) or (g.es_fijo and val_actual >= g_val):
                response.append(g)
    else:
        response = resultados
        
    return response

@router.post("/", response_model=GastoMensualResponse)
def create_gasto_mensual(data: GastoMensualCreate, session: Session = Depends(get_session)):
    nuevo = GastoMensual(**data.model_dump())
    session.add(nuevo)
    session.commit()
    session.refresh(nuevo)
    return nuevo

@router.put("/{gasto_id}", response_model=GastoMensualResponse)
def update_gasto_mensual(gasto_id: int, data: GastoMensualUpdate, session: Session = Depends(get_session)):
    gasto = session.get(GastoMensual, gasto_id)
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
        
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(gasto, key, value)
        
    session.add(gasto)
    session.commit()
    session.refresh(gasto)
    return gasto

@router.delete("/{gasto_id}")
def delete_gasto_mensual(gasto_id: int, session: Session = Depends(get_session)):
    gasto = session.get(GastoMensual, gasto_id)
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    session.delete(gasto)
    session.commit()
    return {"ok": True}
