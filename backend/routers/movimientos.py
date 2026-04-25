from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import date
from dateutil.relativedelta import relativedelta

from database import get_session
from models.movimiento import Movimiento
from models.tarjeta import Tarjeta
from schemas.movimiento import MovimientoCreate, MovimientoUpdate, MovimientoResponse, MovimientoPreview, CuotaPreview

router = APIRouter(tags=["Movimientos"])

def calcular_fecha_ultima_cuota(primera: date, cuotas: int) -> date:
    # Restamos 1 mes porque la primera cuota ya es el mes 1
    return primera + relativedelta(months=cuotas - 1)

@router.get("/", response_model=List[MovimientoResponse])
def get_movimientos(
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    tarjeta_id: Optional[int] = None,
    session: Session = Depends(get_session)
):
    query = select(Movimiento, Tarjeta).join(Tarjeta, isouter=True)
    if tarjeta_id:
        query = query.where(Movimiento.tarjeta_id == tarjeta_id)
    
    resultados = session.exec(query).all()
    
    response = []
    for mov, tarj in resultados:
        # Filtrar por mes activo si se solicita
        if mes and anio:
            val_inicio = mov.fecha_primera_cuota.year * 12 + mov.fecha_primera_cuota.month
            val_fin = mov.fecha_ultima_cuota.year * 12 + mov.fecha_ultima_cuota.month
            val_actual = anio * 12 + mes
            if not (val_inicio <= val_actual <= val_fin):
                continue

        response.append(MovimientoResponse(
            id=mov.id,
            tarjeta_id=mov.tarjeta_id,
            tarjeta_nombre=tarj.nombre if tarj else "N/A",
            tarjeta_color=tarj.color if tarj else None,
            descripcion=mov.descripcion,
            categoria=mov.categoria,
            monto_total=mov.monto_total,
            cuotas=mov.cuotas,
            monto_cuota=mov.monto_cuota,
            fecha_primera_cuota=mov.fecha_primera_cuota,
            fecha_ultima_cuota=mov.fecha_ultima_cuota,
            notas=mov.notas
        ))
    return response

@router.get("/preview", response_model=MovimientoPreview)
def preview_movimiento(
    monto_total: float = Query(..., gt=0),
    cuotas: int = Query(..., ge=1),
    fecha_inicio: date = Query(...)
):
    monto_cuota = monto_total / cuotas
    fecha_fin = calcular_fecha_ultima_cuota(fecha_inicio, cuotas)
    
    desglose = []
    curr_date = fecha_inicio
    for _ in range(cuotas):
        desglose.append(CuotaPreview(
            mes=curr_date.month,
            anio=curr_date.year,
            monto_cuota=monto_cuota
        ))
        curr_date = curr_date + relativedelta(months=1)
        
    return MovimientoPreview(
        monto_total=monto_total,
        cuotas=cuotas,
        monto_cuota=monto_cuota,
        fecha_primera_cuota=fecha_inicio,
        fecha_ultima_cuota=fecha_fin,
        desglose=desglose
    )

@router.post("/", response_model=MovimientoResponse)
def create_movimiento(data: MovimientoCreate, session: Session = Depends(get_session)):
    tarjeta = None
    if data.tarjeta_id is not None:
        tarjeta = session.get(Tarjeta, data.tarjeta_id)
        if not tarjeta:
            raise HTTPException(status_code=400, detail="Tarjeta no encontrada")
        
    monto_cuota = data.monto_total / data.cuotas
    fecha_ultima = calcular_fecha_ultima_cuota(data.fecha_primera_cuota, data.cuotas)
    
    mov = Movimiento(
        tarjeta_id=data.tarjeta_id,
        descripcion=data.descripcion,
        categoria=data.categoria,
        monto_total=data.monto_total,
        cuotas=data.cuotas,
        monto_cuota=monto_cuota,
        fecha_primera_cuota=data.fecha_primera_cuota,
        fecha_ultima_cuota=fecha_ultima,
        notas=data.notas,
        creado_por="baso" # TODO: sacar del JWT
    )
    
    session.add(mov)
    session.commit()
    session.refresh(mov)
    
    return MovimientoResponse(
        id=mov.id,
        tarjeta_id=mov.tarjeta_id,
        tarjeta_nombre=tarjeta.nombre,
        tarjeta_color=tarjeta.color,
        descripcion=mov.descripcion,
        categoria=mov.categoria,
        monto_total=mov.monto_total,
        cuotas=mov.cuotas,
        monto_cuota=mov.monto_cuota,
        fecha_primera_cuota=mov.fecha_primera_cuota,
        fecha_ultima_cuota=mov.fecha_ultima_cuota,
        notas=mov.notas
    )

@router.delete("/{mov_id}")
def delete_movimiento(mov_id: int, session: Session = Depends(get_session)):
    mov = session.get(Movimiento, mov_id)
    if not mov:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    session.delete(mov)
    session.commit()
    return {"ok": True}
