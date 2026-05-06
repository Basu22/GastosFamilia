from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import List, Dict, Any
from datetime import date
import datetime

from database import get_session
from models.tarjeta import Tarjeta
from models.gasto_mensual import GastoMensual
from models.ingreso import Ingreso
from services.cuotas import get_cuotas_mes, get_cuotas_por_tarjeta, cuota_activa_en_mes
from models.movimiento import Movimiento
from schemas.dashboard import DashboardSummary, DebugCuotasResponse

from services.disponibilidad import get_meses_disponibles

router = APIRouter()

@router.get("/meses-disponibles", response_model=List[Dict[str, int]])
def list_meses_disponibles(session: Session = Depends(get_session)) -> List[Dict[str, int]]:
    return get_meses_disponibles(session)

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
        i_fin_val = (i.anio_fin * 12 + i.mes_fin) if i.anio_fin and i.mes_fin else 999999
        
        if (i.mes == mes and i.anio == anio) or (i.es_fijo and i_val <= mes_actual_val <= i_fin_val):
            total_ingreso += i.monto
    
    # 2. Total Cuotas del mes
    total_cuotas = get_cuotas_mes(mes, anio, session)
    
    # 3. Gastos mensuales fijos/variables
    gastos_db = session.exec(select(GastoMensual)).all()
    total_gastos = 0.0
    mes_actual_val = anio * 12 + mes
    
    for g in gastos_db:
        g_val = g.anio * 12 + g.mes
        g_fin_val = (g.anio_fin * 12 + g.mes_fin) if g.anio_fin and g.mes_fin else 999999
        
        # Se suma si:
        # 1. Es el mes exacto
        # 2. O es fijo Y el mes consultado está dentro del rango de validez
        if (g.mes == mes and g.anio == anio) or (g.es_fijo and g_val <= mes_actual_val <= g_fin_val):
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
            i_fin_val = (i.anio_fin * 12 + i.mes_fin) if i.anio_fin and i.mes_fin else 999999
            if (i.mes == curr_mes and i.anio == curr_anio) or (i.es_fijo and i_val <= mes_step_val <= i_fin_val):
                step_ingreso += i.monto

        # Cuotas proyectadas
        step_cuotas = get_cuotas_mes(curr_mes, curr_anio, session)
        
        # Gastos proyectados
        step_gastos = 0.0
        for g in gastos_db:
            g_val = g.anio * 12 + g.mes
            g_fin_val = (g.anio_fin * 12 + g.mes_fin) if g.anio_fin and g.mes_fin else 999999
            if (g.mes == curr_mes and g.anio == curr_anio) or (g.es_fijo and g_val <= mes_step_val <= g_fin_val):
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

    # 7. Listado Unificado de Movimientos del Mes
    movimientos_mes = []
    
    # Agregar Ingresos
    for i in ingresos_db:
        i_val = i.anio * 12 + i.mes
        i_fin_val = (i.anio_fin * 12 + i.mes_fin) if i.anio_fin and i.mes_fin else 999999
        if (i.mes == mes and i.anio == anio) or (i.es_fijo and i_val <= mes_actual_val <= i_fin_val):
            movimientos_mes.append({
                "id": i.id,
                "tipo": "ingreso",
                "origen": "Ingresos",
                "medio_pago": "Efectivo / Transf.",
                "descripcion": i.descripcion,
                "monto": i.monto,
                "es_fijo": i.es_fijo,
                "fecha_referencia": f"{i.anio}-{i.mes:02d}-01"
            })
            
    # Agregar Gastos Mensuales
    for g in gastos_db:
        g_val = g.anio * 12 + g.mes
        g_fin_val = (g.anio_fin * 12 + g.mes_fin) if g.anio_fin and g.mes_fin else 999999
        if (g.mes == mes and g.anio == anio) or (g.es_fijo and g_val <= mes_actual_val <= g_fin_val):
            t = tarjetas_dict.get(g.tarjeta_id) if g.tarjeta_id else None
            is_previsionado = g.es_fijo and not (g.mes == mes and g.anio == anio)
            movimientos_mes.append({
                "id": g.id,
                "tipo": "gasto",
                "origen": "Gastos Fijos" if g.es_fijo else "Gastos Variados",
                "medio_pago": t.nombre if t else "Efectivo / Transf.",
                "descripcion": g.descripcion,
                "monto": g.monto,
                "es_fijo": g.es_fijo,
                "previsionado": is_previsionado,
                "tarjeta_nombre": t.nombre if t else None,
                "tarjeta_color": t.color if t else None,
                "fecha_referencia": f"{g.anio}-{g.mes:02d}-01"
            })
            
    # Agregar Movimientos de Tarjeta (Cuotas activas)
    for m in movs_all:
        if cuota_activa_en_mes(m, mes, anio):
            t = tarjetas_dict.get(m.tarjeta_id) if m.tarjeta_id else None
            
            # Calcular que número de cuota es
            fecha_primera = date.fromisoformat(m.fecha_primera_cuota) if isinstance(m.fecha_primera_cuota, str) else m.fecha_primera_cuota
            inicio_val = fecha_primera.year * 12 + fecha_primera.month
            n_cuota = (mes_actual_val - inicio_val) + 1
            
            movimientos_mes.append({
                "id": m.id,
                "tipo": "tarjeta",
                "origen": "Cuotas",
                "medio_pago": t.nombre if t else "Tarjeta S/N",
                "descripcion": f"{m.descripcion} ({n_cuota}/{m.cuotas})",
                "monto": m.monto_cuota,
                "es_fijo": False,
                "tarjeta_nombre": t.nombre if t else None,
                "tarjeta_color": t.color if t else None,
                "fecha_referencia": f"{anio}-{mes:02d}-01"
            })

    # Ordenar por tipo e importe
    movimientos_mes.sort(key=lambda x: (x["tipo"], -x["monto"]))

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
        proximos_vencimientos=vencimientos,
        movimientos_mes=movimientos_mes
    )
