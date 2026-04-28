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
    
    # Lógica de Split para Gastos Fijos
    # Si es fijo y el mes de edición es posterior al mes de inicio del registro
    if gasto.es_fijo and data.mes_edicion and data.anio_edicion:
        orig_val = gasto.anio * 12 + gasto.mes
        edit_val = data.anio_edicion * 12 + data.mes_edicion
        
        if edit_val > orig_val:
            # 1. Finalizar el registro viejo el mes anterior
            if data.mes_edicion == 1:
                gasto.mes_fin = 12
                gasto.anio_fin = data.anio_edicion - 1
            else:
                gasto.mes_fin = data.mes_edicion - 1
                gasto.anio_fin = data.anio_edicion
            
            session.add(gasto)
            
            # 2. Crear el registro nuevo desde este mes
            update_data = data.model_dump(exclude_unset=True)
            update_data.pop('mes_edicion', None)
            update_data.pop('anio_edicion', None)
            
            nuevo_gasto = GastoMensual(
                descripcion=data.descripcion if data.descripcion else gasto.descripcion,
                monto=data.monto if data.monto is not None else gasto.monto,
                mes=data.mes_edicion,
                anio=data.anio_edicion,
                es_fijo=True,
                tarjeta_id=data.tarjeta_id if data.tarjeta_id is not None else gasto.tarjeta_id,
                notas=data.notas if data.notas else gasto.notas
            )
            session.add(nuevo_gasto)
            session.commit()
            session.refresh(nuevo_gasto)
            return nuevo_gasto

    # Edición normal (mismo mes o no fijo)
    update_dict = data.model_dump(exclude_unset=True)
    update_dict.pop('mes_edicion', None)
    update_dict.pop('anio_edicion', None)
    
    for key, value in update_dict.items():
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
