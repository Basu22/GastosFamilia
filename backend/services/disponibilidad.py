from typing import List, Dict
from sqlalchemy import text
from sqlmodel import Session, select
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from models.ingreso import Ingreso
from models.gasto_mensual import GastoMensual
from models.movimiento import Movimiento

def get_meses_disponibles(session: Session) -> List[Dict[str, int]]:
    """
    Versión ultra-robusta para detectar meses disponibles.
    """
    meses_set = set()
    now = date.today()
    
    # 1. Mes actual siempre
    meses_set.add((now.month, now.year))

    # 2. Consultar TODOS los ingresos y gastos para ver si hay fijos
    # Usamos una forma más genérica de chequear booleanos por si SQLite los tiene como 1/0
    ingresos = session.exec(select(Ingreso)).all()
    gastos = session.exec(select(GastoMensual)).all()
    
    has_fijos = any(i.es_fijo for i in ingresos) or any(g.es_fijo for g in gastos)
    
    if has_fijos:
        # Si hay fijos, habilitar ventana amplia
        for i in range(-12, 24): # 2 años a futuro por las dudas
            d = now + relativedelta(months=i)
            meses_set.add((d.month, d.year))

    # 3. Consultar rangos de cuotas directamente desde los objetos del modelo
    movimientos = session.exec(select(Movimiento)).all()
    for m in movimientos:
        if m.fecha_primera_cuota and m.fecha_ultima_cuota:
            # Asegurar que sean objetos date
            start = m.fecha_primera_cuota
            end = m.fecha_ultima_cuota
            
            if isinstance(start, str): start = date.fromisoformat(start[:10])
            if isinstance(end, str): end = date.fromisoformat(end[:10])
            
            # Caminar desde el inicio al fin de la compra
            curr = date(start.year, start.month, 1)
            limit = date(end.year, end.month, 1)
            
            # Seguridad para evitar loops infinitos si la fecha está mal
            count = 0
            while curr <= limit and count < 120: # Máximo 10 años
                meses_set.add((curr.month, curr.year))
                curr += relativedelta(months=1)
                count += 1

    # 4. Incluir meses de creación de todo lo demás
    for i in ingresos: meses_set.add((i.mes, i.anio))
    for g in gastos: meses_set.add((g.mes, g.anio))
            
    # Convertir, ordenar y retornar
    resultado = [{"mes": m, "anio": a} for m, a in meses_set]
    resultado.sort(key=lambda x: (x["anio"], x["mes"]), reverse=True)
    
    return resultado
