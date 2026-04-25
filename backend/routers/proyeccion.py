"""
routers/proyeccion.py — Endpoints de proyección financiera.

Endpoints:
    GET  /proyeccion/             → Proyección de los próximos 12 meses
    POST /proyeccion/override     → Crear o actualizar un override de mes
    DELETE /proyeccion/override/{id} → Eliminar un override (vuelve al valor base)
    GET  /proyeccion/overrides    → Lista todos los overrides activos
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Any, Dict
from pydantic import BaseModel

from database import get_session
from models.proyeccion_override import ProyeccionOverride
from services.proyeccion import get_proyeccion_12_meses

router = APIRouter()


# ─── Schemas de Request/Response ──────────────────────────────────────────────

class OverrideCreate(BaseModel):
    tipo: str           # "ingreso" | "gasto_mensual"
    referencia_id: int
    mes: int
    anio: int
    monto: float
    notas: str | None = None


class OverrideResponse(BaseModel):
    id: int
    tipo: str
    referencia_id: int
    mes: int
    anio: int
    monto: float
    notas: str | None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/")
def get_proyeccion(session: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    """
    Retorna la proyección financiera para los próximos 12 meses
    desde el mes actual, con detalle de ingresos y gastos por mes.
    """
    return get_proyeccion_12_meses(session)


@router.get("/overrides", response_model=List[OverrideResponse])
def get_all_overrides(session: Session = Depends(get_session)) -> List[ProyeccionOverride]:
    """Lista todos los overrides activos en la base de datos."""
    return session.exec(select(ProyeccionOverride)).all()


@router.post("/override", response_model=OverrideResponse)
def upsert_override(
    data: OverrideCreate,
    session: Session = Depends(get_session)
) -> ProyeccionOverride:
    """
    Crea un override para un mes específico, o lo actualiza si ya existía
    (upsert: tipo + referencia_id + mes + anio son la clave única).
    """
    if data.tipo not in ("ingreso", "gasto_mensual"):
        raise HTTPException(
            status_code=400,
            detail="El tipo debe ser 'ingreso' o 'gasto_mensual'"
        )
    if not (1 <= data.mes <= 12):
        raise HTTPException(status_code=400, detail="El mes debe estar entre 1 y 12")
    if data.monto < 0:
        raise HTTPException(status_code=400, detail="El monto no puede ser negativo")

    # Buscar si ya existe un override para esta combinación
    statement = select(ProyeccionOverride).where(
        ProyeccionOverride.tipo == data.tipo,
        ProyeccionOverride.referencia_id == data.referencia_id,
        ProyeccionOverride.mes == data.mes,
        ProyeccionOverride.anio == data.anio,
    )
    existente = session.exec(statement).first()

    if existente:
        # Actualizar el existente
        existente.monto = data.monto
        existente.notas = data.notas
        session.add(existente)
        session.commit()
        session.refresh(existente)
        return existente
    else:
        # Crear nuevo
        nuevo = ProyeccionOverride(**data.model_dump())
        session.add(nuevo)
        session.commit()
        session.refresh(nuevo)
        return nuevo


@router.delete("/override/{override_id}")
def delete_override(
    override_id: int,
    session: Session = Depends(get_session)
) -> Dict[str, str]:
    """
    Elimina un override. El ítem volverá a usar su valor base
    en la proyección.
    """
    override = session.get(ProyeccionOverride, override_id)
    if not override:
        raise HTTPException(status_code=404, detail="Override no encontrado")

    session.delete(override)
    session.commit()
    return {"message": "Override eliminado. El valor base será usado en la proyección."}
