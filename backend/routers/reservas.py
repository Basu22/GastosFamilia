from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict, Any
from pydantic import BaseModel
import datetime

from database import get_session
from models.reserva import Reserva
from models.asignacion_reserva import AsignacionReserva
from models.ajuste_reserva import AjusteReserva
from models.gasto_mensual import GastoMensual
from services.reservas import get_saldos_todas_reservas, calcular_saldo_reserva

router = APIRouter()

# --- Schemas ---
class ReservaCreate(BaseModel):
    nombre: str
    color: str = "#64748B"
    descripcion: str | None = None
    monto_fijo_mensual: float = 0.0
    fecha_baja: str | None = None

class ReservaUpdate(BaseModel):
    nombre: str | None = None
    color: str | None = None
    descripcion: str | None = None
    monto_fijo_mensual: float | None = None
    fecha_baja: str | None = None

class AsignacionCreate(BaseModel):
    reserva_id: int
    mes: int
    anio: int
    monto: float
    notas: str | None = None

class AjusteCreate(BaseModel):
    tipo: str # "reasignacion" | "liberacion"
    reserva_origen_id: int
    reserva_destino_id: int | None = None
    monto: float
    mes: int
    anio: int
    notas: str | None = None

class MigracionReserva(BaseModel):
    gasto_mensual_id: int
    nombre: str
    color: str

# --- Endpoints Reservas ---

@router.get("", response_model=List[Reserva])
def listar_reservas(session: Session = Depends(get_session)):
    return session.exec(select(Reserva).where(Reserva.activa == True)).all()

@router.post("", response_model=Reserva)
def crear_reserva(res: ReservaCreate, session: Session = Depends(get_session)):
    db_res = Reserva(**res.model_dump())
    session.add(db_res)
    session.commit()
    session.refresh(db_res)
    return db_res

@router.put("/{reserva_id}", response_model=Reserva)
def actualizar_reserva(reserva_id: int, res: ReservaUpdate, session: Session = Depends(get_session)):
    db_res = session.get(Reserva, reserva_id)
    if not db_res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    update_data = res.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_res, key, value)
        
    session.add(db_res)
    session.commit()
    session.refresh(db_res)
    return db_res

@router.delete("/{reserva_id}")
def desactivar_reserva(reserva_id: int, session: Session = Depends(get_session)):
    db_res = session.get(Reserva, reserva_id)
    if not db_res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    db_res.activa = False
    session.add(db_res)
    session.commit()
    return {"message": "Reserva desactivada"}

# --- Endpoints Asignaciones ---

@router.get("/asignaciones")
def listar_asignaciones(mes: int, anio: int, session: Session = Depends(get_session)):
    return session.exec(
        select(AsignacionReserva).where(
            AsignacionReserva.mes == mes,
            AsignacionReserva.anio == anio
        )
    ).all()

@router.post("/asignaciones", response_model=AsignacionReserva)
def crear_asignacion(asig: AsignacionCreate, session: Session = Depends(get_session)):
    # Check if exists
    existente = session.exec(
        select(AsignacionReserva).where(
            AsignacionReserva.reserva_id == asig.reserva_id,
            AsignacionReserva.mes == asig.mes,
            AsignacionReserva.anio == asig.anio
        )
    ).first()
    
    if existente:
        existente.monto += asig.monto
        if asig.notas:
            existente.notas = asig.notas
        db_asig = existente
    else:
        db_asig = AsignacionReserva(**asig.model_dump())
        
    session.add(db_asig)
    session.commit()
    session.refresh(db_asig)
    return db_asig

@router.delete("/asignaciones/{asignacion_id}")
def borrar_asignacion(asignacion_id: int, session: Session = Depends(get_session)):
    asig = session.get(AsignacionReserva, asignacion_id)
    if not asig:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    session.delete(asig)
    session.commit()
    return {"message": "Asignación borrada"}

# --- Endpoints Ajustes ---

@router.post("/ajustes", response_model=AjusteReserva)
def crear_ajuste(ajuste: AjusteCreate, session: Session = Depends(get_session)):
    if ajuste.tipo not in ["reasignacion", "liberacion"]:
        raise HTTPException(status_code=400, detail="Tipo de ajuste inválido")
    if ajuste.tipo == "reasignacion" and not ajuste.reserva_destino_id:
        raise HTTPException(status_code=400, detail="Reasignación requiere reserva_destino_id")
        
    db_ajuste = AjusteReserva(**ajuste.model_dump())
    session.add(db_ajuste)
    session.commit()
    session.refresh(db_ajuste)
    return db_ajuste

# --- Endpoints Saldos ---

@router.get("/saldos")
def obtener_saldos(mes: int, anio: int, session: Session = Depends(get_session)):
    return get_saldos_todas_reservas(mes, anio, session)

# --- Endpoint de Migración ---

@router.post("/migrar")
def migrar_reservas(migraciones: List[MigracionReserva], session: Session = Depends(get_session)):
    hoy = datetime.date.today()
    mes_actual = hoy.month
    anio_actual = hoy.year
    
    resultados = []
    
    for mig in migraciones:
        gasto = session.get(GastoMensual, mig.gasto_mensual_id)
        if not gasto:
            continue
            
        # 1. Crear Reserva
        reserva = Reserva(nombre=mig.nombre, color=mig.color, descripcion=gasto.descripcion)
        session.add(reserva)
        session.flush() # Para tener el ID
        
        # 2. Crear Asignaciones por cada mes desde el mes de inicio del gasto hasta el mes_fin o mes actual
        mes_inicio = gasto.mes
        anio_inicio = gasto.anio
        
        # Calcular meses a procesar (solo creamos asignaciones hasta el mes actual o hasta que termino)
        mes_fin = gasto.mes_fin if gasto.mes_fin else mes_actual
        anio_fin = gasto.anio_fin if gasto.anio_fin else anio_actual
        
        # Limit it to current month + 1 year max just in case
        anio_limite = anio_actual + 1
        
        m_curr = mes_inicio
        a_curr = anio_inicio
        
        asignaciones_creadas = 0
        while (a_curr * 12 + m_curr) <= (anio_fin * 12 + mes_fin) and (a_curr * 12 + m_curr) <= (anio_limite * 12 + 12):
            asignacion = AsignacionReserva(
                reserva_id=reserva.id,
                mes=m_curr,
                anio=a_curr,
                monto=gasto.monto,
                notas="Migrado desde Gasto Mensual"
            )
            session.add(asignacion)
            asignaciones_creadas += 1
            
            m_curr += 1
            if m_curr > 12:
                m_curr = 1
                a_curr += 1
                
        # 3. Desactivar gasto original
        gasto.activo = False
        if not gasto.fecha_baja:
            gasto.fecha_baja = datetime.date(anio_actual, mes_actual, 1)
            
        session.add(gasto)
        
        resultados.append({
            "gasto_id": gasto.id,
            "reserva_id": reserva.id,
            "asignaciones": asignaciones_creadas
        })
        
    session.commit()
    return {"message": "Migración completada", "resultados": resultados}
