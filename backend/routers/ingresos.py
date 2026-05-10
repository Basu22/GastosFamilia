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
        
    # Lógica de Split para Ingresos Fijos
    if ingreso.es_fijo and data.mes_edicion and data.anio_edicion:
        orig_val = ingreso.anio * 12 + ingreso.mes
        edit_val = data.anio_edicion * 12 + data.mes_edicion
        
        if edit_val > orig_val:
            # 1. Finalizar el viejo el mes anterior
            if data.mes_edicion == 1:
                ingreso.mes_fin = 12
                ingreso.anio_fin = data.anio_edicion - 1
            else:
                ingreso.mes_fin = data.mes_edicion - 1
                ingreso.anio_fin = data.anio_edicion
                
            session.add(ingreso)
            
            # 2. Crear nuevo
            nuevo = Ingreso(
                descripcion=data.descripcion if data.descripcion else ingreso.descripcion,
                categoria=data.categoria if data.categoria else ingreso.categoria,
                monto=data.monto if data.monto is not None else ingreso.monto,
                mes=data.mes_edicion,
                anio=data.anio_edicion,
                es_fijo=True,
                notas=data.notas if data.notas else ingreso.notas
            )
            session.add(nuevo)
            session.commit()
            session.refresh(nuevo)
            return nuevo

    # Edición normal
    update_dict = data.model_dump(exclude_unset=True)
    update_dict.pop('mes_edicion', None)
    update_dict.pop('anio_edicion', None)
    
    for key, value in update_dict.items():
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
