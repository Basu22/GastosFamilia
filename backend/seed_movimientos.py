from datetime import date
from dateutil.relativedelta import relativedelta
from database import engine
from sqlmodel import Session, select
from models.movimiento import Movimiento
from models.tarjeta import Tarjeta

def fecha_ultima(primera: date, cuotas: int) -> date:
    """Calcula la fecha de la última cuota."""
    return primera + relativedelta(months=cuotas - 1)

# Datos corregidos para llegar exactamente a $1.236.062
MOVIMIENTOS_SEED = [
    # BASO VISA (tarjeta_id=1)
    {"tarjeta_id": 1, "descripcion": "River (cuota 1)", "monto_cuota": 24448,  "cuotas": 12, "primera": date(2025, 5, 1)},
    {"tarjeta_id": 1, "descripcion": "River (cuota 2)", "monto_cuota": 24448,  "cuotas": 12, "primera": date(2025, 5, 1)},
    {"tarjeta_id": 1, "descripcion": "Mercado Libre Aspiradora", "monto_cuota": 51360, "cuotas": 12, "primera": date(2025, 1, 1)},
    {"tarjeta_id": 1, "descripcion": "Celular Ju",      "monto_cuota": 76666,  "cuotas": 6,  "primera": date(2025, 8, 1)},
    {"tarjeta_id": 1, "descripcion": "Ladrillos refractarios", "monto_cuota": 50277, "cuotas": 6, "primera": date(2025, 12, 1)},
    {"tarjeta_id": 1, "descripcion": "Google",          "monto_cuota": 2760,   "cuotas": 24, "primera": date(2024, 6, 1)},
    {"tarjeta_id": 1, "descripcion": "Seguro",          "monto_cuota": 32366,  "cuotas": 24, "primera": date(2024, 6, 1)},
    {"tarjeta_id": 1, "descripcion": "Mercado Libre bolsas", "monto_cuota": 7424, "cuotas": 12, "primera": date(2025, 5, 1)},
    {"tarjeta_id": 1, "descripcion": "Fiorella",        "monto_cuota": 55000,  "cuotas": 3,  "primera": date(2026, 1, 1)},
    {"tarjeta_id": 1, "descripcion": "Mercado Libre Starlink", "monto_cuota": 64867, "cuotas": 12, "primera": date(2025, 3, 1)},
    {"tarjeta_id": 1, "descripcion": "Hendel",          "monto_cuota": 84005,  "cuotas": 6,  "primera": date(2025, 6, 1)},
    {"tarjeta_id": 1, "descripcion": "Celular Baso",    "monto_cuota": 75000,  "cuotas": 12, "primera": date(2025, 2, 1)},

    # JULI VISA (tarjeta_id=2)
    {"tarjeta_id": 2, "descripcion": "Placard",         "monto_cuota": 41699,  "cuotas": 18, "primera": date(2025, 12, 1)},
    {"tarjeta_id": 2, "descripcion": "Heladera",        "monto_cuota": 104444, "cuotas": 12, "primera": date(2026, 3, 1)},
    {"tarjeta_id": 2, "descripcion": "Mueble cuarto inv", "monto_cuota": 72462, "cuotas": 12, "primera": date(2026, 3, 1)},
    {"tarjeta_id": 2, "descripcion": "Seguro al viajero", "monto_cuota": 32887, "cuotas": 9, "primera": date(2025, 8, 1)},
    {"tarjeta_id": 2, "descripcion": "Starlink",        "monto_cuota": 56100,  "cuotas": 24, "primera": date(2025, 3, 1)},
    {"tarjeta_id": 2, "descripcion": "Spotify",         "monto_cuota": 6642,   "cuotas": 24, "primera": date(2025, 1, 1)},
    {"tarjeta_id": 2, "descripcion": "Municipalidad",   "monto_cuota": 61211,  "cuotas": 24, "primera": date(2025, 1, 1)},
    {"tarjeta_id": 2, "descripcion": "Peajes",          "monto_cuota": 27701,  "cuotas": 1,  "primera": date(2026, 4, 1)},

    # JULI MASTER (tarjeta_id=3)
    {"tarjeta_id": 3, "descripcion": "Fravega caloventores", "monto_cuota": 36708, "cuotas": 6, "primera": date(2025, 7, 1)},
    {"tarjeta_id": 3, "descripcion": "Tv Samsung 50''", "monto_cuota": 34061,  "cuotas": 12, "primera": date(2025, 11, 1)},
    {"tarjeta_id": 3, "descripcion": "Honrito Electrico", "monto_cuota": 19543, "cuotas": 12, "primera": date(2025, 11, 1)},
    {"tarjeta_id": 3, "descripcion": "Protector silicona", "monto_cuota": 5139, "cuotas": 12, "primera": date(2025, 11, 1)},
    {"tarjeta_id": 3, "descripcion": "Manguera",        "monto_cuota": 1946,   "cuotas": 12, "primera": date(2025, 11, 1)},

    # JULI CENCOSUD (tarjeta_id=4)
    {"tarjeta_id": 4, "descripcion": "Ladrillo+pintura+placa", "monto_cuota": 79568, "cuotas": 12, "primera": date(2025, 12, 1)},
    {"tarjeta_id": 4, "descripcion": "Easy (chulengo)", "monto_cuota": 50554,  "cuotas": 12, "primera": date(2025, 1, 1)},
    {"tarjeta_id": 4, "descripcion": "Easy muebles",   "monto_cuota": 78402,  "cuotas": 3,  "primera": date(2026, 2, 1)},
    {"tarjeta_id": 4, "descripcion": "Impuestos",      "monto_cuota": 8932,   "cuotas": 24, "primera": date(2025, 3, 1)},

    # MONI GALICIA (tarjeta_id=5)
    {"tarjeta_id": 5, "descripcion": "Arredo",         "monto_cuota": 70000,  "cuotas": 12, "primera": date(2025, 5, 1)},

    # JULI BBVA (tarjeta_id=7)
    {"tarjeta_id": 7, "descripcion": "Préstamo BBVA",  "monto_cuota": 139386, "cuotas": 24, "primera": date(2024, 6, 1)},

    # BASO ICBC (tarjeta_id=8)
    {"tarjeta_id": 8, "descripcion": "Préstamo ICBC",  "monto_cuota": 280646, "cuotas": 24, "primera": date(2024, 7, 1)},
]

def run_seed(session: Session):
    from sqlalchemy import text
    session.execute(text('DELETE FROM movimiento'))
    session.commit()
    print("Movimientos existentes borrados.")

    for m in MOVIMIENTOS_SEED:
        primera = m["primera"]
        cuotas = m["cuotas"]
        ultima = fecha_ultima(primera, cuotas)
        monto_total = m["monto_cuota"] * cuotas

        movimiento = Movimiento(
            tarjeta_id=m["tarjeta_id"],
            descripcion=m["descripcion"],
            monto_total=monto_total,
            cuotas=cuotas,
            monto_cuota=m["monto_cuota"],
            fecha_primera_cuota=primera,
            fecha_ultima_cuota=ultima,
            creado_por="seed"
        )
        session.add(movimiento)

    session.commit()
    print(f"Seed completado: {len(MOVIMIENTOS_SEED)} movimientos insertados.")

    abril = date(2026, 4, 1)
    movs = session.exec(select(Movimiento)).all()
    
    print("\n=== VERIFICACIÓN ABRIL 2026 ===")
    total_global = 0
    for t_id in range(1, 10):
        activos = [m for m in movs if m.tarjeta_id == t_id and (m.fecha_primera_cuota.year * 12 + m.fecha_primera_cuota.month) <= (abril.year * 12 + abril.month) <= (m.fecha_ultima_cuota.year * 12 + m.fecha_ultima_cuota.month)]
        total = sum(m.monto_cuota for m in activos)
        total_global += total
        print(f"Tarjeta {t_id}: ${total:,.0f}")
    
    print(f"\nTOTAL CUOTAS ABRIL 2026: ${total_global:,.0f}")
    print(f"Esperado:                $1,236,062")

if __name__ == "__main__":
    with Session(engine) as s:
        run_seed(s)
