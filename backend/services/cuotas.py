from datetime import date
from sqlmodel import Session, select
from models.movimiento import Movimiento
from models.tarjeta import Tarjeta
from models.gasto_mensual import GastoMensual
from typing import List, Dict, Any

def cuota_activa_en_mes(movimiento: Movimiento, mes: int, anio: int) -> bool:
    """
    Una cuota está activa en mes/año si el mes consultado
    cae dentro del rango [fecha_primera_cuota, fecha_ultima_cuota].
    Usamos comparación de mes absoluto (Anio * 12 + Mes) para evitar
    problemas con los días del mes.
    """
    # Manejar conversión si las fechas vienen como string desde la DB
    fecha_primera = (
        date.fromisoformat(movimiento.fecha_primera_cuota) 
        if isinstance(movimiento.fecha_primera_cuota, str) 
        else movimiento.fecha_primera_cuota
    )
    fecha_ultima = (
        date.fromisoformat(movimiento.fecha_ultima_cuota) 
        if isinstance(movimiento.fecha_ultima_cuota, str) 
        else movimiento.fecha_ultima_cuota
    )
        
    mes_consulta = anio * 12 + mes
    mes_inicio = fecha_primera.year * 12 + fecha_primera.month
    mes_fin = fecha_ultima.year * 12 + fecha_ultima.month
    
    return mes_inicio <= mes_consulta <= mes_fin


def get_cuotas_mes(mes: int, anio: int, session: Session) -> float:
    """Suma de monto_cuota de todos los movimientos activos en ese mes."""
    statement = select(Movimiento)
    movimientos = session.exec(statement).all()
    
    total = sum(
        m.monto_cuota
        for m in movimientos
        if cuota_activa_en_mes(m, mes, anio)
    )
    return round(float(total), 2)


def get_cuotas_por_tarjeta(mes: int, anio: int, session: Session) -> List[Dict[str, Any]]:
    """Monto por tarjeta de cuotas activas + gastos mensuales con tarjeta en ese mes."""
    statement_tarjetas = select(Tarjeta).where(Tarjeta.activa == True)
    tarjetas = session.exec(statement_tarjetas).all()
    
    mes_actual_val = anio * 12 + mes
    resultado = []
    
    for tarjeta in tarjetas:
        # 1. Sumar Movimientos (Cuotas)
        statement_movs = select(Movimiento).where(Movimiento.tarjeta_id == tarjeta.id)
        movimientos = session.exec(statement_movs).all()
        
        monto_cuotas = sum(
            m.monto_cuota
            for m in movimientos
            if cuota_activa_en_mes(m, mes, anio)
        )
        
        # 2. Sumar Gastos Mensuales vinculados a esta tarjeta
        statement_gastos = select(GastoMensual).where(GastoMensual.tarjeta_id == tarjeta.id)
        gastos = session.exec(statement_gastos).all()
        
        monto_gastos = 0.0
        for g in gastos:
            g_val = g.anio * 12 + g.mes
            g_fin_val = (g.anio_fin * 12 + g.mes_fin) if g.anio_fin and g.mes_fin else 999999
            if (g.mes == mes and g.anio == anio) or (g.es_fijo and g_val <= mes_actual_val <= g_fin_val):
                monto_gastos += g.monto
        
        total_tarjeta = monto_cuotas + monto_gastos
        
        if total_tarjeta > 0:
            resultado.append({
                "tarjeta_id": tarjeta.id,
                "nombre": tarjeta.nombre,
                "monto": round(float(total_tarjeta), 2),
                "color": tarjeta.color
            })
            
    return resultado
