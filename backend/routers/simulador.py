from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import date

from database import get_session
from services.proyeccion import get_proyeccion_12_meses
from services.cuotas import cuota_activa_en_mes
from models.movimiento import Movimiento

router = APIRouter()

class SimuladorInput(BaseModel):
    monto_total: float
    cuotas: int           # mínimo 1, máximo 60
    fecha_primera_cuota: str  # formato "YYYY-MM"
    descripcion: str = "Simulación"

@router.post("/calcular")
def calcular_simulacion(
    data: SimuladorInput,
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    # 1. Calcular monto por cuota
    monto_cuota = round(data.monto_total / data.cuotas, 2)

    # 2. Calcular rango de meses de la simulación
    try:
        anio_ini = int(data.fecha_primera_cuota[:4])
        mes_ini = int(data.fecha_primera_cuota[5:7])
    except (ValueError, IndexError):
        anio_ini = date.today().year
        mes_ini = date.today().month

    mes_abs_ini = anio_ini * 12 + mes_ini
    mes_abs_fin = mes_abs_ini + data.cuotas - 1

    # 3. Obtener cuotas reales activas y tarjetas (para detalle)
    movimientos = session.exec(select(Movimiento)).all()

    # 4. Obtener proyección base real
    proyeccion = get_proyeccion_12_meses(session)

    # 5. Enriquecer cada mes con la simulación
    resultado = []
    for mes_data in proyeccion:
        mes = mes_data["mes"]
        anio = mes_data["anio"]
        
        # ¿La cuota simulada aplica este mes?
        mes_abs = anio * 12 + mes
        cuota_sim = monto_cuota if mes_abs_ini <= mes_abs <= mes_abs_fin else 0.0

        # Separar gastos fijos y variables del detalle
        # El detalle_gastos ahora tiene el campo 'es_fijo' gracias al paso anterior
        gastos_fijos = [g for g in mes_data["detalle_gastos"] if g.get("es_fijo")]
        gastos_variables = [g for g in mes_data["detalle_gastos"] if not g.get("es_fijo")]
        
        total_fijos = sum(g["monto_proyectado"] for g in gastos_fijos)
        total_variables = sum(g["monto_proyectado"] for g in gastos_variables)

        # Detalle cuotas activas reales para este mes específico
        detalle_cuotas = []
        for m in movimientos:
            if cuota_activa_en_mes(m, mes, anio):
                # Calcular qué número de cuota es
                mes_inicio_m = m.fecha_primera_cuota.year * 12 + m.fecha_primera_cuota.month
                mes_cuota_actual = (anio * 12 + mes) - mes_inicio_m + 1
                
                detalle_cuotas.append({
                    "descripcion": m.descripcion,
                    "monto_cuota": m.monto_cuota,
                    "cuota_actual": int(mes_cuota_actual),
                    "cuotas_total": m.cuotas,
                })

        ahorro_real = mes_data["ahorro_proyectado"]
        ahorro_simulado = round(ahorro_real - cuota_sim, 2)

        resultado.append({
            "mes": mes,
            "anio": anio,
            "total_ingresos": mes_data["total_ingresos"],
            "total_gastos_fijos": round(total_fijos, 2),
            "total_gastos_variables": round(total_variables, 2),
            "total_cuotas": mes_data["total_cuotas"],
            "ahorro_real": ahorro_real,
            "cuota_simulada": cuota_sim,
            "ahorro_simulado": ahorro_simulado,
            "detalle_ingresos": mes_data["detalle_ingresos"],
            "detalle_gastos_fijos": gastos_fijos,
            "detalle_gastos_variables": gastos_variables,
            "detalle_cuotas": detalle_cuotas,
        })

    return resultado
