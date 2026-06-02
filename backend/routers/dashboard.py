from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import List, Dict, Any
from datetime import date
import datetime
from models.reserva import Reserva
from models.asignacion_reserva import AsignacionReserva
from models.reserva import Reserva
from models.asignacion_reserva import AsignacionReserva

from database import get_session
from models.tarjeta import Tarjeta
from models.gasto_mensual import GastoMensual
from models.ingreso import Ingreso
from services.cuotas import get_cuotas_mes, get_cuotas_por_tarjeta, cuota_activa_en_mes
from models.movimiento import Movimiento
from schemas.dashboard import DashboardSummary, DebugCuotasResponse
from models.prestamo import Prestamo
from models.cuota_prestamo import CuotaPrestamo
from models.config import Categoria

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
            if getattr(g, "reserva_id", None) is not None:
                continue # Los gastos con reserva NO suman al total_gastos porque la Asignacion ya los descontó
            total_gastos += g.monto
            
    # 3.5. Asignaciones a Reserva (Se restan del disponible, como si fueran un gasto fijo del mes)
    asignaciones_db = session.exec(
        select(AsignacionReserva).where(AsignacionReserva.mes == mes, AsignacionReserva.anio == anio)
    ).all()
    total_asignaciones = sum(a.monto for a in asignaciones_db)
    total_gastos += total_asignaciones
            
    # 4. Préstamos del mes (desde cuotas individuales)
    cuotas_prestamo_mes = session.exec(
        select(CuotaPrestamo).where(CuotaPrestamo.mes == mes, CuotaPrestamo.anio == anio)
    ).all()
    prestamos_db = session.exec(select(Prestamo)).all()
    prestamos_dict = {p.id: p for p in prestamos_db}
    
    total_prestamos = 0.0
    prestamos_por_entidad = {}
    
    for cp in cuotas_prestamo_mes:
        p = prestamos_dict.get(cp.prestamo_id)
        if p:
            total_prestamos += cp.monto
            if p.entidad in prestamos_por_entidad:
                prestamos_por_entidad[p.entidad] += cp.monto
            else:
                prestamos_por_entidad[p.entidad] = cp.monto

    lista_prestamos_entidad = [
        {"entidad": k, "monto": v} for k, v in prestamos_por_entidad.items()
    ]
    lista_prestamos_entidad.sort(key=lambda x: x["monto"], reverse=True)

    # Calculos principales
    total_mes = total_cuotas + total_gastos + total_prestamos
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
                if getattr(g, "reserva_id", None) is not None:
                    continue
                step_gastos += g.monto
                
        # Asignaciones proyectadas (las asignaciones pasadas no se proyectan automáticamente salvo que hiciéramos asignaciones fijas,
        # pero asumimos que el usuario no tiene "asignaciones fijas" por ahora, o sí? Dejamos step_asignaciones = 0)
        step_asignaciones = 0.0
        step_gastos += step_asignaciones
                
        # Préstamos proyectados (desde cuotas individuales)
        step_prestamos = 0.0
        step_cuotas_prestamo = session.exec(
            select(CuotaPrestamo).where(CuotaPrestamo.mes == curr_mes, CuotaPrestamo.anio == curr_anio)
        ).all()
        for scp in step_cuotas_prestamo:
            step_prestamos += scp.monto
                
        proximos_6_meses.append({
            "mes": curr_mes,
            "anio": curr_anio,
            "total_cuotas": step_cuotas,
            "total_prestamos": step_prestamos,
            "total_mes": step_cuotas + step_gastos + step_prestamos,
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

    # 7. Agrupación por Categorías
    categorias_db = {c.nombre: c for c in session.exec(select(Categoria)).all()}
    
    gastos_por_cat = {}
    ingresos_por_cat = {}
    
    def add_to_cat(mapa, cat_name, monto):
        name = cat_name if cat_name else "Sin Categoría"
        if name not in mapa:
            cat_obj = categorias_db.get(name)
            mapa[name] = {
                "nombre": name,
                "monto": 0,
                "color": cat_obj.color if cat_obj else "#64748B",
                "icono": cat_obj.icono if cat_obj else "Tag"
            }
        mapa[name]["monto"] += monto

    # Diccionario de Reservas para buscar info rapida
    reservas_db = session.exec(select(Reserva)).all()
    reservas_dict = {r.id: r for r in reservas_db}

    # 8. Listado Unificado de Movimientos del Mes
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
                "categoria": i.categoria,
                "fecha_referencia": f"{i.anio}-{i.mes:02d}-01"
            })
            add_to_cat(ingresos_por_cat, i.categoria, i.monto)
            
    # Agregar Gastos Mensuales
    for g in gastos_db:
        g_val = g.anio * 12 + g.mes
        g_fin_val = (g.anio_fin * 12 + g.mes_fin) if g.anio_fin and g.mes_fin else 999999
        if (g.mes == mes and g.anio == anio) or (g.es_fijo and g_val <= mes_actual_val <= g_fin_val):
            t = tarjetas_dict.get(g.tarjeta_id) if g.tarjeta_id else None
            r = reservas_dict.get(g.reserva_id) if getattr(g, 'reserva_id', None) else None
            is_previsionado = g.es_fijo and not (g.mes == mes and g.anio == anio)
            is_baja_effect = (g.activo is False) and (mes == g.mes_fin and anio == g.anio_fin)
            
            medio_pago = "Efectivo / Transf."
            if t:
                medio_pago = t.nombre
            elif r:
                medio_pago = r.nombre
                
            movimientos_mes.append({
                "id": g.id,
                "tipo": "gasto",
                "origen": "Gastos Fijos" if g.es_fijo else "Gastos Variados",
                "medio_pago": medio_pago,
                "descripcion": g.descripcion,
                "monto": g.monto,
                "es_fijo": g.es_fijo,
                "previsionado": is_previsionado,
                "activo": not is_baja_effect,
                "fecha_baja": f"{g.anio_fin}-{g.mes_fin:02d}-01" if is_baja_effect else None,
                "tarjeta_nombre": t.nombre if t else None,
                "tarjeta_color": t.color if t else None,
                "reserva_nombre": r.nombre if r else None,
                "reserva_color": r.color if r else None,
                "categoria": g.categoria,
                "fecha_referencia": f"{g.anio}-{g.mes:02d}-01"
            })
            if not is_baja_effect and not r:
                # Los gastos con reserva NO afectan el total por categoria porque no son del "flujo" mensual de gastos sino consumos de ahorros pasados/presentes
                add_to_cat(gastos_por_cat, g.categoria, g.monto)
            
    # Agregar Asignaciones a Reservas
    for a in asignaciones_db:
        r = reservas_dict.get(a.reserva_id)
        movimientos_mes.append({
            "id": a.id,
            "tipo": "asignacion_reserva",
            "origen": "Asignación a Reserva",
            "medio_pago": "Efectivo / Transf.",
            "descripcion": f"Fondeo: {r.nombre if r else 'Reserva'}",
            "monto": a.monto,
            "es_fijo": False,
            "previsionado": False,
            "activo": True,
            "categoria": "Ahorro/Reserva",
            "fecha_referencia": f"{anio}-{mes:02d}-01"
        })
        # Las asignaciones no van a categorias de gastos, o si quieres sí. Lo dejamos fuera de categorias por ahora.
            
    # Agregar Movimientos de Tarjeta (Cuotas activas)
    for m in movs_all:
        if cuota_activa_en_mes(m, mes, anio):
            t = tarjetas_dict.get(m.tarjeta_id) if m.tarjeta_id else None
            r = reservas_dict.get(m.reserva_id) if getattr(m, 'reserva_id', None) else None
            
            # Calcular que número de cuota es
            fecha_primera = date.fromisoformat(m.fecha_primera_cuota) if isinstance(m.fecha_primera_cuota, str) else m.fecha_primera_cuota
            inicio_val = fecha_primera.year * 12 + fecha_primera.month
            n_cuota = (mes_actual_val - inicio_val) + 1
            
            medio_pago = "Tarjeta S/N"
            if t:
                medio_pago = t.nombre
            elif r:
                medio_pago = r.nombre
            
            movimientos_mes.append({
                "id": m.id,
                "tipo": "tarjeta",
                "origen": "Cuotas",
                "medio_pago": medio_pago,
                "descripcion": m.descripcion if r else f"{m.descripcion} ({n_cuota}/{m.cuotas})",
                "monto": m.monto_cuota,
                "monto_total": m.monto_total,
                "cuota_actual": n_cuota,
                "cuotas_total": m.cuotas,
                "es_fijo": False,
                "tarjeta_nombre": t.nombre if t else None,
                "tarjeta_color": t.color if t else None,
                "reserva_nombre": r.nombre if r else None,
                "reserva_color": r.color if r else None,
                "categoria": m.categoria,
                "fecha_referencia": f"{anio}-{mes:02d}-01"
            })
            add_to_cat(gastos_por_cat, m.categoria, m.monto_cuota)

    # Agregar Préstamos (usando cuotas individuales del mes)
    for cp in cuotas_prestamo_mes:
        p = prestamos_dict.get(cp.prestamo_id)
        if p:
            # Calcular monto total sumando todas las cuotas del préstamo
            todas_cuotas = session.exec(
                select(CuotaPrestamo).where(CuotaPrestamo.prestamo_id == p.id)
            ).all()
            monto_total_prestamo = sum(c.monto for c in todas_cuotas)
            
            movimientos_mes.append({
                "id": p.id,
                "tipo": "prestamo",
                "origen": "Préstamos",
                "medio_pago": p.entidad,
                "descripcion": f"{p.descripcion} ({cp.numero_cuota}/{p.cuotas})",
                "monto": cp.monto,
                "monto_total": monto_total_prestamo,
                "cuota_actual": cp.numero_cuota,
                "cuotas_total": p.cuotas,
                "es_fijo": False,
                "tarjeta_nombre": None,
                "tarjeta_color": "#10B981",
                "categoria": p.categoria or "Préstamos",
                "fecha_referencia": f"{anio}-{mes:02d}-01"
            })
            add_to_cat(gastos_por_cat, p.categoria or "Préstamos", cp.monto)

    # Ordenar por tipo, estado activo e importe
    movimientos_mes.sort(key=lambda x: (x["tipo"], not x.get("activo", True), -x["monto"]))

    return DashboardSummary(
        mes=mes,
        anio=anio,
        ingreso=total_ingreso,
        total_cuotas=total_cuotas,
        total_prestamos=total_prestamos,
        total_gastos_mensuales=total_gastos,
        total_mes=total_mes,
        ahorro_proyectado=total_ingreso - total_mes,
        cuotas_por_tarjeta=cuotas_por_tarjeta,
        prestamos_por_entidad=lista_prestamos_entidad,
        proximos_6_meses=proximos_6_meses,
        proximos_vencimientos=vencimientos,
        gastos_por_categoria=list(gastos_por_cat.values()),
        ingresos_por_categoria=list(ingresos_por_cat.values()),
        movimientos_mes=movimientos_mes
    )
