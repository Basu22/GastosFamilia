from sqlmodel import Session, select
from typing import List, Dict, Any
from sqlalchemy import func

from models.reserva import Reserva
from models.asignacion_reserva import AsignacionReserva
from models.ajuste_reserva import AjusteReserva
from models.movimiento import Movimiento

def calcular_saldo_reserva(reserva_id: int, hasta_mes: int, hasta_anio: int, session: Session) -> float:
    # 1. Total Asignado
    total_asignado = session.exec(
        select(func.coalesce(func.sum(AsignacionReserva.monto), 0))
        .where(
            AsignacionReserva.reserva_id == reserva_id,
            (AsignacionReserva.anio * 12 + AsignacionReserva.mes) <= (hasta_anio * 12 + hasta_mes)
        )
    ).first() or 0.0

    # 2. Total Consumido (Movimientos)
    total_consumido = session.exec(
        select(func.coalesce(func.sum(Movimiento.monto_total), 0))
        .where(
            Movimiento.reserva_id == reserva_id,
            # Extraemos año y mes de la fecha de primera cuota para saber cuándo se consumió
            # sqlite func: strftime('%Y', fecha), etc.
            # Pero sqlmodel no tiene func.year fácil en sqlite, comparamos string.
            func.strftime('%Y', Movimiento.fecha_primera_cuota) * 12 + func.strftime('%m', Movimiento.fecha_primera_cuota) <= (hasta_anio * 12 + hasta_mes)
        )
    ).first() or 0.0

    # 3. Total Entrante (Reasignaciones recibidas)
    total_entrante = session.exec(
        select(func.coalesce(func.sum(AjusteReserva.monto), 0))
        .where(
            AjusteReserva.reserva_destino_id == reserva_id,
            AjusteReserva.tipo == "reasignacion",
            (AjusteReserva.anio * 12 + AjusteReserva.mes) <= (hasta_anio * 12 + hasta_mes)
        )
    ).first() or 0.0

    # 4. Total Saliente (Reasignaciones enviadas + Liberaciones)
    total_saliente = session.exec(
        select(func.coalesce(func.sum(AjusteReserva.monto), 0))
        .where(
            AjusteReserva.reserva_origen_id == reserva_id,
            (AjusteReserva.anio * 12 + AjusteReserva.mes) <= (hasta_anio * 12 + hasta_mes)
        )
    ).first() or 0.0

    return float(total_asignado - total_consumido + total_entrante - total_saliente)

def get_saldos_todas_reservas(hasta_mes: int, hasta_anio: int, session: Session) -> List[Dict[str, Any]]:
    reservas = session.exec(select(Reserva).where(Reserva.activa == True)).all()
    
    # Optimizacion futura: hacerlo en una sola query. Por ahora iteramos.
    resultado = []
    for r in reservas:
        saldo = calcular_saldo_reserva(r.id, hasta_mes, hasta_anio, session)
        
        # Calcular consumo y asignacion del mes actual
        asignacion_mes = session.exec(
            select(AsignacionReserva.monto)
            .where(
                AsignacionReserva.reserva_id == r.id,
                AsignacionReserva.mes == hasta_mes,
                AsignacionReserva.anio == hasta_anio
            )
        ).first() or 0.0
        
        consumo_mes = session.exec(
            select(func.coalesce(func.sum(Movimiento.monto_total), 0))
            .where(
                Movimiento.reserva_id == r.id,
                func.strftime('%Y', Movimiento.fecha_primera_cuota) == str(hasta_anio),
                func.strftime('%m', Movimiento.fecha_primera_cuota) == f"{hasta_mes:02d}"
            )
        ).first() or 0.0

        resultado.append({
            "id": r.id,
            "nombre": r.nombre,
            "color": r.color,
            "saldo_actual": saldo,
            "asignacion_mes": asignacion_mes,
            "consumo_mes": consumo_mes
        })
    return resultado
