from typing import List, Dict
from sqlalchemy import text
from sqlmodel import Session
from datetime import datetime

def get_meses_disponibles(session: Session) -> List[Dict[str, int]]:
    """
    Retorna una lista de diccionarios {mes, anio} únicos que tienen algún tipo de registro.
    Ordenados cronológicamente descendente.
    """
    # Consulta unificada para obtener meses/años de todas las fuentes
    query = text("""
        SELECT DISTINCT mes, anio FROM movimientos
        UNION
        SELECT DISTINCT mes, anio FROM gastos_mensuales
        UNION
        SELECT DISTINCT mes, anio FROM ingresos
        ORDER BY anio DESC, mes DESC
    """)
    
    result = session.execute(query).all()
    
    return [{"mes": r.mes, "anio": r.anio} for r in result]
