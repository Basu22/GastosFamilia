# PROMPT ITERACIÓN 04 — Debug y fix de fechas en movimientos seed
> El filtro de fecha ahora funciona pero los movimientos están guardados con fechas incorrectas en la DB.

---

## Diagnóstico

**Total Cuotas actual:** $403.870 (solo JULI VISA y JULI MASTER)  
**Total Cuotas correcto:** $1.236.062 (9 tarjetas)  
**Causa:** Los movimientos de BASO VISA, BASO ICBC, JULI CENCOSUD, JULI BBVA y MONI GALICIA tienen fechas mal cargadas en la DB, por eso el filtro correcto los excluye.

---

## Paso 1 — Inspeccionar la DB directamente

Ejecutar este comando para ver exactamente qué hay en la tabla `movimiento`:

```bash
sqlite3 ./data/gastos.db "SELECT id, descripcion, tarjeta_id, monto_cuota, fecha_primera_cuota, fecha_ultima_cuota FROM movimiento ORDER BY tarjeta_id;"
```

O con Python si no hay sqlite3 disponible:

```bash
docker exec gastos_backend python3 -c "
from database import engine
from sqlalchemy import text
with engine.connect() as conn:
    rows = conn.execute(text('SELECT id, descripcion, tarjeta_id, monto_cuota, fecha_primera_cuota, fecha_ultima_cuota FROM movimiento ORDER BY tarjeta_id')).fetchall()
    for r in rows:
        print(r)
"
```

**Lo que se espera ver** — cada movimiento debe tener:
- `fecha_primera_cuota` en algún mes de 2024, 2025 o 2026
- `fecha_ultima_cuota` en algún mes de 2026 o posterior
- Para que aparezca en Abril 2026: `fecha_primera <= 2026-04-01 <= fecha_ultima`

---

## Paso 2 — Borrar y recrear el seed completo

El problema casi seguro está en el seed. **Borrar todos los movimientos existentes** y recargar con fechas correctas basadas en los datos reales del sheet:

```python
# Script de seed completo — ejecutar como script independiente
# Archivo: backend/seed_movimientos.py

from datetime import date
from dateutil.relativedelta import relativedelta
from database import engine, get_db
from sqlalchemy.orm import Session
from models.movimiento import Movimiento
from models.tarjeta import Tarjeta

def fecha_ultima(primera: date, cuotas: int) -> date:
    """Calcula la fecha de la última cuota."""
    return primera + relativedelta(months=cuotas - 1)

# Datos reales del sheet — movimientos vigentes en Abril 2026
MOVIMIENTOS_SEED = [
    # ══════════════════════════════════════════════
    # BASO VISA (tarjeta_id=1, color=#3B82F6)
    # Total esperado en Abril 2026: ~$443.880
    # ══════════════════════════════════════════════
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
    {"tarjeta_id": 1, "descripcion": "Pasajes",         "monto_cuota": 567415, "cuotas": 1,  "primera": date(2026, 1, 1)},

    # ══════════════════════════════════════════════
    # JULI VISA (tarjeta_id=2, color=#8B5CF6)
    # Total esperado en Abril 2026: ~$434.824
    # ══════════════════════════════════════════════
    {"tarjeta_id": 2, "descripcion": "Placard",         "monto_cuota": 41699,  "cuotas": 18, "primera": date(2025, 12, 1)},
    {"tarjeta_id": 2, "descripcion": "Heladera",        "monto_cuota": 104444, "cuotas": 12, "primera": date(2026, 3, 1)},
    {"tarjeta_id": 2, "descripcion": "Mueble cuarto inv", "monto_cuota": 72462, "cuotas": 12, "primera": date(2026, 3, 1)},
    {"tarjeta_id": 2, "descripcion": "Seguro al viajero", "monto_cuota": 32887, "cuotas": 9, "primera": date(2025, 8, 1)},
    {"tarjeta_id": 2, "descripcion": "Starlink",        "monto_cuota": 56100,  "cuotas": 24, "primera": date(2025, 3, 1)},
    {"tarjeta_id": 2, "descripcion": "Spotify",         "monto_cuota": 6642,   "cuotas": 24, "primera": date(2025, 1, 1)},
    {"tarjeta_id": 2, "descripcion": "Municipalidad",   "monto_cuota": 61211,  "cuotas": 24, "primera": date(2025, 1, 1)},
    {"tarjeta_id": 2, "descripcion": "Peajes",          "monto_cuota": 27701,  "cuotas": 1,  "primera": date(2026, 4, 1)},

    # ══════════════════════════════════════════════
    # JULI MASTER (tarjeta_id=3, color=#EF4444)
    # Total esperado en Abril 2026: ~$121.398
    # ══════════════════════════════════════════════
    {"tarjeta_id": 3, "descripcion": "Fravega caloventores", "monto_cuota": 36708, "cuotas": 6, "primera": date(2025, 7, 1)},
    {"tarjeta_id": 3, "descripcion": "Tv Samsung 50''", "monto_cuota": 34061,  "cuotas": 12, "primera": date(2025, 11, 1)},
    {"tarjeta_id": 3, "descripcion": "Honrito Electrico", "monto_cuota": 19543, "cuotas": 12, "primera": date(2025, 11, 1)},
    {"tarjeta_id": 3, "descripcion": "Protector silicona", "monto_cuota": 5139, "cuotas": 12, "primera": date(2025, 11, 1)},
    {"tarjeta_id": 3, "descripcion": "Manguera",        "monto_cuota": 1946,   "cuotas": 12, "primera": date(2025, 11, 1)},

    # ══════════════════════════════════════════════
    # JULI CENCOSUD (tarjeta_id=4, color=#10B981)
    # Total esperado en Abril 2026: ~$189.806
    # ══════════════════════════════════════════════
    {"tarjeta_id": 4, "descripcion": "Ladrillo+pintura+placa", "monto_cuota": 79568, "cuotas": 12, "primera": date(2025, 12, 1)},
    {"tarjeta_id": 4, "descripcion": "Easy (chulengo)", "monto_cuota": 50554,  "cuotas": 12, "primera": date(2025, 1, 1)},
    {"tarjeta_id": 4, "descripcion": "Easy muebles",   "monto_cuota": 78402,  "cuotas": 3,  "primera": date(2026, 2, 1)},
    {"tarjeta_id": 4, "descripcion": "Impuestos",      "monto_cuota": 8932,   "cuotas": 24, "primera": date(2025, 3, 1)},

    # ══════════════════════════════════════════════
    # MONI GALICIA (tarjeta_id=5, color=#F59E0B)
    # Total esperado en Abril 2026: ~$70.000
    # ══════════════════════════════════════════════
    {"tarjeta_id": 5, "descripcion": "Arredo",         "monto_cuota": 70000,  "cuotas": 12, "primera": date(2025, 5, 1)},

    # ══════════════════════════════════════════════
    # BASO MASTER (tarjeta_id=6) → $0 en Abril 2026
    # ══════════════════════════════════════════════
    # Sin movimientos activos en Abril 2026

    # ══════════════════════════════════════════════
    # JULI BBVA (tarjeta_id=7, color=#06B6D4)
    # Total esperado en Abril 2026: ~$139.386
    # ══════════════════════════════════════════════
    {"tarjeta_id": 7, "descripcion": "Préstamo BBVA",  "monto_cuota": 139386, "cuotas": 24, "primera": date(2024, 6, 1)},

    # ══════════════════════════════════════════════
    # BASO ICBC (tarjeta_id=8, color=#6366F1)
    # Total esperado en Abril 2026: ~$280.646
    # ══════════════════════════════════════════════
    {"tarjeta_id": 8, "descripcion": "Préstamo ICBC",  "monto_cuota": 280646, "cuotas": 24, "primera": date(2024, 7, 1)},

    # ══════════════════════════════════════════════
    # SELE SANTANDER (tarjeta_id=9) → $0 en Abril 2026
    # ══════════════════════════════════════════════
    # Sin movimientos activos en Abril 2026
]


def run_seed(db: Session):
    # 1. Borrar todos los movimientos existentes
    db.query(Movimiento).delete()
    db.commit()
    print("Movimientos existentes borrados.")

    # 2. Insertar movimientos con fechas calculadas
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
        db.add(movimiento)

    db.commit()
    print(f"Seed completado: {len(MOVIMIENTOS_SEED)} movimientos insertados.")

    # 3. Verificar totales por tarjeta en Abril 2026
    from datetime import date as d
    abril = d(2026, 4, 1)
    movimientos = db.query(Movimiento).all()
    
    print("\n=== VERIFICACIÓN ABRIL 2026 ===")
    total_global = 0
    for tarjeta_id in range(1, 10):
        activos = [
            m for m in movimientos
            if m.tarjeta_id == tarjeta_id
            and m.fecha_primera_cuota <= abril <= m.fecha_ultima_cuota
        ]
        total = sum(m.monto_cuota for m in activos)
        total_global += total
        print(f"Tarjeta {tarjeta_id}: ${total:,.0f} ({len(activos)} movimientos activos)")
    
    print(f"\nTOTAL CUOTAS ABRIL 2026: ${total_global:,.0f}")
    print(f"Esperado:                $1.236.062")
    print(f"Diferencia:              ${abs(total_global - 1236062):,.0f}")


if __name__ == "__main__":
    from database import SessionLocal
    db = SessionLocal()
    run_seed(db)
    db.close()
```

Ejecutar el seed:
```bash
docker exec gastos_backend python3 seed_movimientos.py
```

---

## Paso 3 — Verificación final con curl

```bash
curl "http://localhost:8000/api/dashboard?mes=4&anio=2026" | python3 -m json.tool
```

### Valores esperados:
| Campo | Valor |
|-------|-------|
| `total_cuotas` | ~1.236.062 ✅ |
| `total_gastos_mensuales` | ~2.908.019 ✅ |
| `ingreso` | 5.300.000 ✅ |
| `ahorro_proyectado` | ~1.155.919 ✅ (positivo) |

### Gráfico de barras — orden esperado (de mayor a menor):
```
BASO VISA      ████████████████  ~443k
JULI VISA      ██████████████    ~434k
BASO ICBC      █████████         ~280k
JULI CENCOSUD  ██████            ~189k
JULI BBVA      ████              ~139k
JULI MASTER    ████              ~121k
MONI GALICIA   ██                ~70k
BASO MASTER    ▏                  0
SELE SANTANDER ▏                  0
```

---

## ✅ Checklist

- [ ] Script de seed ejecutado sin errores
- [ ] Output del seed muestra "TOTAL CUOTAS ABRIL 2026: ~$1.236.062"
- [ ] curl devuelve `total_cuotas` ≈ 1.236.062
- [ ] curl devuelve `ahorro_proyectado` positivo
- [ ] Gráfico barras muestra 7 tarjetas con valores (no solo 2)
- [ ] BASO VISA es la barra más larga (no JULI VISA ni BASO ICBC)
- [ ] Proyección 6 meses: valores entre $3.8M y $4.7M, sin caída a cero
- [ ] Commit: `fix: seed completo con fechas correctas por tarjeta`

---

## ⚠️ Reglas

- **NO** tocar frontend
- **NO** tocar otras páginas  
- **NO** cambiar la lógica del filtro de fecha (ya está bien)
- **SOLO** corregir los datos seed con las fechas correctas
