import datetime
from sqlmodel import Session, select
from typing import List, Dict, Any
from sqlalchemy import func

from models.reserva import Reserva
from models.asignacion_reserva import AsignacionReserva
from models.ajuste_reserva import AjusteReserva
from models.movimiento import Movimiento
from models.gasto_mensual import GastoMensual

def parse_date(d):
    if not d:
        return None
    if isinstance(d, str):
        return datetime.date.fromisoformat(d.split('T')[0])
    return d

def calcular_saldo_reserva(reserva_id: int, hasta_mes: int, hasta_anio: int, session: Session) -> float:
    # 1. Total Asignado
    reserva = session.get(Reserva, reserva_id)
    if not reserva:
        return 0.0

    asignaciones = session.exec(
        select(AsignacionReserva)
        .where(
            AsignacionReserva.reserva_id == reserva_id,
            (AsignacionReserva.anio * 12 + AsignacionReserva.mes) <= (hasta_anio * 12 + hasta_mes)
        )
    ).all()
    
    asignaciones_dict = {(a.anio * 12 + a.mes): a.monto for a in asignaciones}
    
    r_created_at = parse_date(reserva.created_at)
    start_val = r_created_at.year * 12 + r_created_at.month if r_created_at else (hasta_anio * 12 + hasta_mes)
    if asignaciones_dict:
        start_val = min(start_val, min(asignaciones_dict.keys()))
        
    end_val = hasta_anio * 12 + hasta_mes
    
    total_asignado = 0.0
    r_fecha_baja = parse_date(reserva.fecha_baja)
    for val in range(start_val, end_val + 1):
        mes_val = val % 12
        anio_val = val // 12
        if mes_val == 0:
            mes_val = 12
            anio_val -= 1
            
        if r_fecha_baja and r_fecha_baja <= datetime.date(anio_val, mes_val, 1):
            continue
            
        if val in asignaciones_dict:
            total_asignado += asignaciones_dict[val]
        elif reserva.activa and reserva.monto_fijo_mensual > 0:
            total_asignado += reserva.monto_fijo_mensual

    # 2. Total Consumido (Movimientos / Cuotas / Tarjetas)
    total_consumido = session.exec(
        select(func.coalesce(func.sum(Movimiento.monto_total), 0))
        .where(
            Movimiento.reserva_id == reserva_id,
            func.strftime('%Y', Movimiento.fecha_primera_cuota) * 12 + func.strftime('%m', Movimiento.fecha_primera_cuota) <= (hasta_anio * 12 + hasta_mes)
        )
    ).first() or 0.0

    # 2.5. Total Consumido (Gastos Mensuales)
    gastos_reserva = session.exec(
        select(GastoMensual)
        .where(GastoMensual.reserva_id == reserva_id)
    ).all()
    
    total_consumido_gastos = 0.0
    mes_limite = hasta_anio * 12 + hasta_mes
    
    for g in gastos_reserva:
        val_inicio = g.anio * 12 + g.mes
        if g.es_fijo:
            val_fin = (g.anio_fin * 12 + g.mes_fin) if (g.anio_fin and g.mes_fin) else mes_limite
        else:
            val_fin = val_inicio
            
        limite_superior = min(val_fin, mes_limite)
        if val_inicio <= limite_superior:
            meses_activos = (limite_superior - val_inicio) + 1
            total_consumido_gastos += meses_activos * g.monto

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

    return float(total_asignado - total_consumido - total_consumido_gastos + total_entrante - total_saliente)

def get_saldos_todas_reservas(hasta_mes: int, hasta_anio: int, session: Session) -> List[Dict[str, Any]]:
    reservas = session.exec(select(Reserva).where(Reserva.activa == True)).all()
    
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
        ).first()
        
        if asignacion_mes is None:
            if r.activa and r.monto_fijo_mensual > 0:
                r_fecha_baja = parse_date(r.fecha_baja)
                if not (r_fecha_baja and r_fecha_baja <= datetime.date(hasta_anio, hasta_mes, 1)):
                    asignacion_mes = r.monto_fijo_mensual
                else:
                    asignacion_mes = 0.0
            else:
                asignacion_mes = 0.0
        
        consumo_mes = session.exec(
            select(func.coalesce(func.sum(Movimiento.monto_total), 0))
            .where(
                Movimiento.reserva_id == r.id,
                func.strftime('%Y', Movimiento.fecha_primera_cuota) == str(hasta_anio),
                func.strftime('%m', Movimiento.fecha_primera_cuota) == f"{hasta_mes:02d}"
            )
        ).first() or 0.0
        
        # Sumar también consumos de GastoMensual en el mes actual
        gastos_activos_mes = session.exec(
            select(GastoMensual)
            .where(GastoMensual.reserva_id == r.id)
        ).all()
        
        mes_consulta_abs = hasta_anio * 12 + hasta_mes
        for g in gastos_activos_mes:
            g_start = g.anio * 12 + g.mes
            g_end = (g.anio_fin * 12 + g.mes_fin) if (g.es_fijo and g.anio_fin and g.mes_fin) else (g_start if not g.es_fijo else 999999)
            if g_start <= mes_consulta_abs <= g_end:
                consumo_mes += g.monto

        resultado.append({
            "id": r.id,
            "nombre": r.nombre,
            "color": r.color,
            "saldo_actual": saldo,
            "asignacion_mes": asignacion_mes,
            "consumo_mes": consumo_mes
        })
    return resultado
