"""
proyeccion.py — Servicio de proyección financiera mensual.

Calcula mes a mes (próximos 12 meses) la situación financiera proyectada
combinando: ingresos, gastos mensuales y cuotas de tarjeta.

Los ingresos y gastos mensuales admiten "overrides" por mes: valores
que pisan el monto base para un mes específico sin alterar el resto.

Escalabilidad: el modelo ProyeccionOverride soporta tipo="movimiento"
para proyectar cuotas de tarjeta en el futuro.
"""

import datetime
from typing import List, Dict, Any
from sqlmodel import Session, select

from models.ingreso import Ingreso
from models.gasto_mensual import GastoMensual
from models.proyeccion_override import ProyeccionOverride
from services.cuotas import get_cuotas_mes


def _siguiente_mes(mes: int, anio: int) -> tuple[int, int]:
    """Avanza un mes, manejando el cambio de año."""
    if mes == 12:
        return 1, anio + 1
    return mes + 1, anio


def _get_overrides_dict(session: Session) -> Dict[str, float]:
    """
    Construye un diccionario de overrides indexado por 'tipo-ref_id-mes-anio'
    para búsqueda O(1) durante la proyección.
    """
    overrides = session.exec(select(ProyeccionOverride)).all()
    resultado: Dict[str, float] = {}
    for o in overrides:
        key = f"{o.tipo}-{o.referencia_id}-{o.mes}-{o.anio}"
        resultado[key] = o.monto
    return resultado


def get_proyeccion_12_meses(session: Session) -> List[Dict[str, Any]]:
    """
    Calcula la proyección financiera para los próximos 12 meses
    (mes actual inclusive).

    Lógica de resolución de monto para cada ítem en cada mes:
    1. ¿Existe un override para este ítem en este mes/año? → usar ese monto
    2. ¿El ítem tiene es_fijo=True y empezó antes o en este mes? → usar monto base
    3. ¿El ítem tiene mes/año exacto? → usar monto base
    4. Si nada aplica → 0 (no contribuye a ese mes)
    """
    hoy = datetime.date.today()
    mes_actual = hoy.month
    anio_actual = hoy.year

    ingresos: List[Ingreso] = session.exec(select(Ingreso)).all()
    gastos: List[GastoMensual] = session.exec(select(GastoMensual)).all()
    overrides = _get_overrides_dict(session)

    resultado = []
    mes = mes_actual
    anio = anio_actual

    for _ in range(12):
        mes_val = anio * 12 + mes

        # --- Ingresos ---
        total_ingresos = 0.0
        detalle_ingresos = []
        for i in ingresos:
            i_val = i.anio * 12 + i.mes
            aplica = (i.mes == mes and i.anio == anio) or (i.es_fijo and mes_val >= i_val)
            if aplica:
                override_key = f"ingreso-{i.id}-{mes}-{anio}"
                monto = overrides.get(override_key, i.monto)
                total_ingresos += monto
                detalle_ingresos.append({
                    "id": i.id,
                    "descripcion": i.descripcion,
                    "monto_base": i.monto,
                    "monto_proyectado": monto,
                    "tiene_override": override_key in overrides
                })

        # --- Gastos Mensuales ---
        total_gastos = 0.0
        detalle_gastos = []
        for g in gastos:
            g_val = g.anio * 12 + g.mes
            aplica = (g.mes == mes and g.anio == anio) or (g.es_fijo and mes_val >= g_val)
            if aplica:
                override_key = f"gasto_mensual-{g.id}-{mes}-{anio}"
                monto = overrides.get(override_key, g.monto)
                total_gastos += monto
                detalle_gastos.append({
                    "id": g.id,
                    "descripcion": g.descripcion,
                    "monto_base": g.monto,
                    "monto_proyectado": monto,
                    "tiene_override": override_key in overrides
                })

        # --- Cuotas de Tarjeta ---
        total_cuotas = get_cuotas_mes(mes, anio, session)

        total_egresos = total_gastos + total_cuotas
        ahorro = total_ingresos - total_egresos

        resultado.append({
            "mes": mes,
            "anio": anio,
            "es_pasado": mes_val < mes_actual * 1 + anio_actual * 12,  # Siempre False en el primer mes
            "total_ingresos": round(total_ingresos, 2),
            "total_gastos_mensuales": round(total_gastos, 2),
            "total_cuotas": round(total_cuotas, 2),
            "total_egresos": round(total_egresos, 2),
            "ahorro_proyectado": round(ahorro, 2),
            "detalle_ingresos": detalle_ingresos,
            "detalle_gastos": detalle_gastos,
        })

        mes, anio = _siguiente_mes(mes, anio)

    return resultado
