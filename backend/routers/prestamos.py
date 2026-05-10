from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from dateutil.relativedelta import relativedelta

from database import get_session
from models.prestamo import Prestamo
from models.cuota_prestamo import CuotaPrestamo
from schemas.prestamo import PrestamoCreate, PrestamoUpdate, PrestamoResponse, CuotaPrestamoResponse

router = APIRouter()


def _build_response(prestamo: Prestamo, cuotas: List[CuotaPrestamo]) -> PrestamoResponse:
    """Construye la respuesta unificada de un préstamo con sus cuotas."""
    monto_total = sum(c.monto for c in cuotas)
    cuotas_response = [
        CuotaPrestamoResponse(
            id=c.id,
            prestamo_id=c.prestamo_id,
            numero_cuota=c.numero_cuota,
            mes=c.mes,
            anio=c.anio,
            monto=c.monto
        )
        for c in sorted(cuotas, key=lambda x: (x.anio, x.mes))
    ]
    return PrestamoResponse(
        id=prestamo.id,
        entidad=prestamo.entidad,
        descripcion=prestamo.descripcion,
        categoria=prestamo.categoria,
        cuotas=prestamo.cuotas,
        monto_total=monto_total,
        fecha_primera_cuota=prestamo.fecha_primera_cuota,
        fecha_ultima_cuota=prestamo.fecha_ultima_cuota,
        notas=prestamo.notas,
        detalle_cuotas=cuotas_response
    )


@router.get("/", response_model=List[PrestamoResponse])
def get_prestamos(session: Session = Depends(get_session)):
    prestamos = session.exec(select(Prestamo)).all()
    result = []
    for p in prestamos:
        cuotas = session.exec(
            select(CuotaPrestamo).where(CuotaPrestamo.prestamo_id == p.id)
        ).all()
        result.append(_build_response(p, cuotas))
    return result


@router.get("/{prestamo_id}", response_model=PrestamoResponse)
def get_prestamo(prestamo_id: int, session: Session = Depends(get_session)):
    prestamo = session.get(Prestamo, prestamo_id)
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    cuotas = session.exec(
        select(CuotaPrestamo).where(CuotaPrestamo.prestamo_id == prestamo_id)
    ).all()
    return _build_response(prestamo, cuotas)


@router.post("/", response_model=PrestamoResponse)
def create_prestamo(data: PrestamoCreate, session: Session = Depends(get_session)):
    # Calcular fecha_ultima_cuota desde las cuotas enviadas
    if data.detalle_cuotas:
        ultima = max(data.detalle_cuotas, key=lambda c: c.anio * 12 + c.mes)
        from datetime import date as date_type
        fecha_ultima = date_type(ultima.anio, ultima.mes, 1)
    else:
        fecha_ultima = data.fecha_primera_cuota + relativedelta(months=data.cuotas - 1)

    prestamo = Prestamo(
        entidad=data.entidad,
        descripcion=data.descripcion,
        categoria=data.categoria,
        cuotas=data.cuotas,
        fecha_primera_cuota=data.fecha_primera_cuota,
        fecha_ultima_cuota=fecha_ultima,
        notas=data.notas,
        creado_por="baso"
    )
    session.add(prestamo)
    session.commit()
    session.refresh(prestamo)

    # Crear las cuotas individuales
    cuotas_db = []
    for cuota_input in data.detalle_cuotas:
        cuota = CuotaPrestamo(
            prestamo_id=prestamo.id,
            numero_cuota=cuota_input.numero_cuota,
            mes=cuota_input.mes,
            anio=cuota_input.anio,
            monto=cuota_input.monto
        )
        session.add(cuota)
        cuotas_db.append(cuota)

    session.commit()
    for c in cuotas_db:
        session.refresh(c)

    return _build_response(prestamo, cuotas_db)


@router.put("/{prestamo_id}", response_model=PrestamoResponse)
def update_prestamo(prestamo_id: int, data: PrestamoUpdate, session: Session = Depends(get_session)):
    prestamo = session.get(Prestamo, prestamo_id)
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")

    # Actualizar campos del header
    if data.entidad is not None:
        prestamo.entidad = data.entidad
    if data.descripcion is not None:
        prestamo.descripcion = data.descripcion
    if data.categoria is not None:
        prestamo.categoria = data.categoria
    if data.notas is not None:
        prestamo.notas = data.notas
    if data.fecha_primera_cuota is not None:
        prestamo.fecha_primera_cuota = data.fecha_primera_cuota

    # Si vienen cuotas nuevas, reemplazar todas
    if data.detalle_cuotas is not None:
        # Borrar cuotas viejas
        old_cuotas = session.exec(
            select(CuotaPrestamo).where(CuotaPrestamo.prestamo_id == prestamo_id)
        ).all()
        for oc in old_cuotas:
            session.delete(oc)

        # Actualizar cantidad y fecha última
        prestamo.cuotas = len(data.detalle_cuotas)
        if data.detalle_cuotas:
            ultima = max(data.detalle_cuotas, key=lambda c: c.anio * 12 + c.mes)
            from datetime import date as date_type
            prestamo.fecha_ultima_cuota = date_type(ultima.anio, ultima.mes, 1)

        # Crear nuevas cuotas
        cuotas_db = []
        for cuota_input in data.detalle_cuotas:
            cuota = CuotaPrestamo(
                prestamo_id=prestamo_id,
                numero_cuota=cuota_input.numero_cuota,
                mes=cuota_input.mes,
                anio=cuota_input.anio,
                monto=cuota_input.monto
            )
            session.add(cuota)
            cuotas_db.append(cuota)

        session.add(prestamo)
        session.commit()
        for c in cuotas_db:
            session.refresh(c)
        session.refresh(prestamo)
        return _build_response(prestamo, cuotas_db)

    # Si no vienen cuotas, solo actualizamos el header
    session.add(prestamo)
    session.commit()
    session.refresh(prestamo)

    cuotas = session.exec(
        select(CuotaPrestamo).where(CuotaPrestamo.prestamo_id == prestamo_id)
    ).all()
    return _build_response(prestamo, cuotas)


@router.delete("/{prestamo_id}")
def delete_prestamo(prestamo_id: int, session: Session = Depends(get_session)):
    prestamo = session.get(Prestamo, prestamo_id)
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")

    # Borrar cuotas hijas primero
    cuotas = session.exec(
        select(CuotaPrestamo).where(CuotaPrestamo.prestamo_id == prestamo_id)
    ).all()
    for c in cuotas:
        session.delete(c)

    session.delete(prestamo)
    session.commit()
    return {"ok": True}
