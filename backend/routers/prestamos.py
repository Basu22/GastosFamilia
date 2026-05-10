from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import date
from dateutil.relativedelta import relativedelta

from database import get_session
from models.prestamo import Prestamo
from schemas.prestamo import PrestamoCreate, PrestamoUpdate, PrestamoResponse

router = APIRouter()

def calcular_cuotas_y_fechas(prestamo: Prestamo, data):
    if data.cuotas and data.cuotas > 0:
        prestamo.monto_cuota = prestamo.monto_total / data.cuotas
        meses_a_sumar = prestamo.cuotas - 1
        prestamo.fecha_ultima_cuota = prestamo.fecha_primera_cuota + relativedelta(months=meses_a_sumar)
    else:
        prestamo.monto_cuota = prestamo.monto_total
        prestamo.fecha_ultima_cuota = prestamo.fecha_primera_cuota

@router.get("/", response_model=List[PrestamoResponse])
def get_prestamos(session: Session = Depends(get_session)):
    query = select(Prestamo)
    return session.exec(query).all()

@router.post("/", response_model=PrestamoResponse)
def create_prestamo(data: PrestamoCreate, session: Session = Depends(get_session)):
    prestamo = Prestamo(**data.model_dump())
    calcular_cuotas_y_fechas(prestamo, data)
    session.add(prestamo)
    session.commit()
    session.refresh(prestamo)
    return prestamo

@router.put("/{prestamo_id}", response_model=PrestamoResponse)
def update_prestamo(prestamo_id: int, data: PrestamoUpdate, session: Session = Depends(get_session)):
    prestamo = session.get(Prestamo, prestamo_id)
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    
    # Lógica de clonación si se editó desde un mes futuro
    if data.mes_edicion and data.anio_edicion:
        fecha_edicion = date(data.anio_edicion, data.mes_edicion, 1)
        # Comparar con fecha de inicio original (usando año y mes)
        inicio_original = date(prestamo.fecha_primera_cuota.year, prestamo.fecha_primera_cuota.month, 1)
        
        meses_pagados = (fecha_edicion.year - inicio_original.year) * 12 + (fecha_edicion.month - inicio_original.month)
        
        # Si la edición ocurre estrictamente después del inicio del préstamo, y antes del fin
        if 0 < meses_pagados < prestamo.cuotas:
            # 1. "Cerrar" el préstamo viejo
            prestamo.cuotas = meses_pagados
            prestamo.monto_total = prestamo.monto_cuota * meses_pagados
            calcular_cuotas_y_fechas(prestamo, prestamo) # recalcula fecha_ultima_cuota
            session.add(prestamo)
            
            # 2. Crear un nuevo préstamo por el resto de las cuotas con el nuevo importe
            nuevo_cuotas = data.cuotas - meses_pagados if data.cuotas else prestamo.cuotas - meses_pagados
            
            # Si el frontend manda el monto_total basado en el total original de cuotas (ej: cuota nueva * 12)
            # entonces monto_cuota = data.monto_total / data.cuotas
            # y el nuevo monto_total real será (monto_cuota * nuevo_cuotas)
            nuevo_monto_cuota = (data.monto_total / data.cuotas) if (data.cuotas and data.monto_total is not None) else prestamo.monto_cuota
            monto_total_ajustado = nuevo_monto_cuota * nuevo_cuotas

            nuevo_prestamo = Prestamo(
                entidad=data.entidad if data.entidad else prestamo.entidad,
                descripcion=data.descripcion if data.descripcion else prestamo.descripcion,
                fecha_primera_cuota=fecha_edicion,
                cuotas=nuevo_cuotas,
                monto_total=monto_total_ajustado,
                monto_cuota=nuevo_monto_cuota,
                notas=data.notas if data.notas else prestamo.notas,
                creado_por=prestamo.creado_por
            )
            calcular_cuotas_y_fechas(nuevo_prestamo, nuevo_prestamo) # Recalcula ultima cuota
            session.add(nuevo_prestamo)
            session.commit()
            session.refresh(nuevo_prestamo)
            return nuevo_prestamo

    # Edición normal (mismo mes, mes en el pasado, o sin mes de edición)
    update_data = data.model_dump(exclude_unset=True)
    update_data.pop('mes_edicion', None)
    update_data.pop('anio_edicion', None)
    
    for key, value in update_data.items():
        setattr(prestamo, key, value)
        
    calcular_cuotas_y_fechas(prestamo, prestamo) # Recalcular por si cambió monto o cuotas
    
    session.add(prestamo)
    session.commit()
    session.refresh(prestamo)
    return prestamo

@router.delete("/{prestamo_id}")
def delete_prestamo(prestamo_id: int, session: Session = Depends(get_session)):
    prestamo = session.get(Prestamo, prestamo_id)
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    session.delete(prestamo)
    session.commit()
    return {"ok": True}
