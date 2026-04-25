from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import List, Dict, Any
import datetime

from database import get_session
from models.tarjeta import Tarjeta
from models.gasto_mensual import GastoMensual
from models.ingreso import Ingreso
from services.cuotas import get_cuotas_mes, get_cuotas_por_tarjeta, cuota_activa_en_mes
from models.movimiento import Movimiento
from schemas.dashboard import DashboardSummary, DebugCuotasResponse

router = APIRouter()

@router.get("/debug/cuotas", response_model=DebugCuotasResponse)
def debug_cuotas(mes: int, anio: int, db: Session = Depends(get_session)) -> DebugCuotasResponse:
    movimientos = db.exec(select(Movimiento)).all()
    detalle = []
    for m in movimientos:
        activo = cuota_activa_en_mes(m, mes, anio)
        detalle.append({
            "descripcion": m.descripcion,
            "monto_cuota": m.monto_cuota,
            "fecha_primera": str(m.fecha_primera_cuota),
            "fecha_ultima": str(m.fecha_ultima_cuota),
            "activo_en_mes": activo
        })
    total = sum(d["monto_cuota"] for d in detalle if d["activo_en_mes"])
    return DebugCuotasResponse(total=total, detalle=detalle)

@router.get("/", response_model=DashboardSummary)
def get_dashboard_summary(
    mes: int = None,
    anio: int = None,
    session: Session = Depends(get_session)
) -> DashboardSummary:
    if mes is None: mes = datetime.date.today().month
    if anio is None: anio = datetime.date.today().year
    
    # 1. Ingresos del mes (Exacto o Fijo)
    ingresos_db = session.exec(select(Ingreso)).all()
    total_ingreso = 0.0
    mes_actual_val = anio * 12 + mes
    
    for i in ingresos_db:
        i_val = i.anio * 12 + i.mes
        if (i.mes == mes and i.anio == anio) or (i.es_fijo and mes_actual_val >= i_val):
            total_ingreso += i.monto
    
    # 2. Total Cuotas del mes
    total_cuotas = get_cuotas_mes(mes, anio, session)
    
    # 3. Gastos mensuales fijos/variables
    gastos_db = session.exec(select(GastoMensual)).all()
    total_gastos = 0.0
    mes_actual_val = anio * 12 + mes
    
    for g in gastos_db:
        g_val = g.anio * 12 + g.mes
        # Se suma si:
        # 1. Es el mes exacto
        # 2. O es fijo Y el mes consultado es igual o posterior al mes en que se creó
        if (g.mes == mes and g.anio == anio) or (g.es_fijo and mes_actual_val >= g_val):
            total_gastos += g.monto
            
    # Calculos principales
    total_mes = total_cuotas + total_gastos
    ahorro_proyectado = total_ingreso - total_mes

    # 4. Cuotas por tarjeta
    cuotas_por_tarjeta = get_cuotas_por_tarjeta(mes, anio, session)
    cuotas_por_tarjeta.sort(key=lambda x: x["monto"], reverse=True)

    # 5. Proyeccion proximos 6 meses
    proximos_6_meses = []
    curr_mes = mes
    curr_anio = anio
    
    for step in range(1, 7):
        curr_mes += 1
        if curr_mes > 12:
            curr_mes = 1
            curr_anio += 1
            
        mes_step_val = curr_anio * 12 + curr_mes
        
        # Ingreso proyectado
        step_ingreso = 0.0
        for i in ingresos_db:
            i_val = i.anio * 12 + i.mes
            if (i.mes == curr_mes and i.anio == curr_anio) or (i.es_fijo and mes_step_val >= i_val):
                step_ingreso += i.monto

        # Cuotas proyectadas
        step_cuotas = get_cuotas_mes(curr_mes, curr_anio, session)
        
        # Gastos proyectados
        step_gastos = 0.0
        for g in gastos_db:
            g_val = g.anio * 12 + g.mes
            if (g.mes == curr_mes and g.anio == curr_anio) or (g.es_fijo and mes_step_val >= g_val):
                step_gastos += g.monto
                
        proximos_6_meses.append({
            "mes": curr_mes,
            "anio": curr_anio,
            "total_cuotas": step_cuotas,
            "total_mes": step_cuotas + step_gastos,
            "ingreso": step_ingreso
        })

    # 6. Próximos Vencimientos (cuotas restantes <= 2)
    # Re-usamos movimientos activos para identificar los que están por terminar
    vencimientos = []
    movs_all = session.exec(select(Movimiento)).all()
    tarjetas_dict = {t.id: t for t in session.exec(select(Tarjeta)).all()}
    
    actual_val = anio * 12 + mes
    
    for m in movs_all:
        if m.tarjeta_id is not None and m.cuotas > 1 and cuota_activa_en_mes(m, mes, anio):
            # Calcular cuotas restantes
            # fecha_ultima_cuota es el mes de la ultima
            ultima_val = m.fecha_ultima_cuota.year * 12 + m.fecha_ultima_cuota.month
            restantes = (ultima_val - actual_val) + 1
            
            if 1 <= restantes <= 2:
                t = tarjetas_dict.get(m.tarjeta_id)
                vencimientos.append({
                    "descripcion": m.descripcion,
                    "tarjeta_nombre": t.nombre if t else "N/A",
                    "tarjeta_color": t.color if t else "#gray-400",
                    "cuotas_restantes": restantes,
                    "monto_cuota": m.monto_cuota
                })
    
    # Sort by less remaining first
    vencimientos.sort(key=lambda x: x["cuotas_restantes"])

    return DashboardSummary(
        mes=mes,
        anio=anio,
        ingreso=total_ingreso,
        total_cuotas=total_cuotas,
        total_gastos_mensuales=total_gastos,
        total_mes=total_mes,
        ahorro_proyectado=ahorro_proyectado,
        cuotas_por_tarjeta=cuotas_por_tarjeta,
        proximos_6_meses=proximos_6_meses,
        proximos_vencimientos=vencimientos
    )
