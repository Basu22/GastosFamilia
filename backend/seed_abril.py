from sqlmodel import Session, select
from database import engine
from models.ingreso import Ingreso
from models.gasto_mensual import GastoMensual

ingresos = [
    {"descripcion": "Sueldo", "monto": 5300000, "mes": 4, "anio": 2026}
]

gastos_mensuales = [
    {"descripcion": "Expensas Fincas", "monto": 245312,  "mes": 4, "anio": 2026},
    {"descripcion": "Agua",            "monto": 100000,  "mes": 4, "anio": 2026},
    {"descripcion": "Comida",          "monto": 800000,  "mes": 4, "anio": 2026},
    {"descripcion": "Celulares+Flow",  "monto": 73348,   "mes": 4, "anio": 2026},
    {"descripcion": "Nafta",           "monto": 200000,  "mes": 4, "anio": 2026},
    {"descripcion": "Seguro Auto",     "monto": 32848,   "mes": 4, "anio": 2026},
    {"descripcion": "Luz",             "monto": 280000,  "mes": 4, "anio": 2026},
    {"descripcion": "Gustos",          "monto": 500000,  "mes": 4, "anio": 2026},
    {"descripcion": "Comida perros",   "monto": 210000,  "mes": 4, "anio": 2026},
    {"descripcion": "Compra dolares",  "monto": 284000,  "mes": 4, "anio": 2026},
    {"descripcion": "Cuotas MP",       "monto": 52287,   "mes": 4, "anio": 2026},
    {"descripcion": "Ajuste faltante", "monto": 130224,  "mes": 4, "anio": 2026},
]

with Session(engine) as session:
    # Only insert if empty for this month
    if not session.exec(select(Ingreso)).first():
        for i in ingresos:
            session.add(Ingreso(**i))
    
    if not session.exec(select(GastoMensual)).first():
        for g in gastos_mensuales:
            # mark as fixed to project to next months as the rules state
            session.add(GastoMensual(**g, es_fijo=True))
            
    session.commit()
    print("Seed Abril 2026 injected.")
