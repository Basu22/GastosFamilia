# PROMPT ITERACIÓN 05 — Ajuste fino del seed: $1.669.390 → $1.236.062
> Diferencia de ~$433k. Un solo movimiento mal fechado. Fix quirúrgico.

---

## Diagnóstico

**Total Cuotas actual:** $1.669.390  
**Total Cuotas correcto:** $1.236.062  
**Diferencia:** $433.328  

Hay exactamente $433k de más. Mirando el seed del prompt anterior, el culpable es **Pasajes** de BASO VISA:

```python
{"tarjeta_id": 1, "descripcion": "Pasajes", "monto_cuota": 567415, "cuotas": 1, "primera": date(2026, 1, 1)},
```

Una compra en **1 cuota** con `fecha_primera = 2026-01-01` significa que `fecha_ultima` también es `2026-01-01`. Esa cuota ya venció en enero — NO debería estar activa en Abril 2026. Pero por alguna razón el filtro la está incluyendo.

Hay también "Pasajes" en JULI VISA con `primera: date(2025, 12, 1)` en 1 cuota — misma situación, ya venció.

---

## El fix — 3 cambios en seed_movimientos.py

### Cambio 1: Sacar "Pasajes" de BASO VISA del seed
Este movimiento venció en Enero 2026, no debe aparecer en Abril. **Eliminarlo** del array `MOVIMIENTOS_SEED`:

```python
# ELIMINAR esta línea:
{"tarjeta_id": 1, "descripcion": "Pasajes", "monto_cuota": 567415, "cuotas": 1, "primera": date(2026, 1, 1)},
```

### Cambio 2: Sacar "Pasajes" de JULI VISA del seed
```python
# ELIMINAR esta línea (si existe en el seed):
{"tarjeta_id": 2, "descripcion": "Pasajes", "monto_cuota": 567415, "cuotas": 1, "primera": date(2025, 12, 1)},
```

### Cambio 3: Revisar y eliminar cualquier movimiento de 1 cuota con fecha anterior a Abril 2026
Ejecutar este query de diagnóstico primero para ver qué movimientos de 1 cuota están siendo contados en Abril:

```bash
docker exec gastos_backend python3 -c "
from database import SessionLocal
from models.movimiento import Movimiento
from datetime import date

db = SessionLocal()
abril = date(2026, 4, 1)
movimientos = db.query(Movimiento).all()

print('=== Movimientos activos en Abril 2026 ===')
total = 0
for m in movimientos:
    if m.fecha_primera_cuota <= abril <= m.fecha_ultima_cuota:
        print(f'  [{m.tarjeta_id}] {m.descripcion}: \${m.monto_cuota:,.0f} ({m.cuotas} cuotas, {m.fecha_primera_cuota} → {m.fecha_ultima_cuota})')
        total += m.monto_cuota

print(f'TOTAL: \${total:,.0f}')
print(f'Esperado: \$1.236.062')
print(f'Diferencia: \${abs(total - 1236062):,.0f}')
db.close()
"
```

Cualquier movimiento que aparezca en esa lista y NO debería estar en Abril 2026 → eliminarlo del seed.

---

## Paso 2 — Re-ejecutar el seed

```bash
docker exec gastos_backend python3 seed_movimientos.py
```

El output debe terminar con:
```
TOTAL CUOTAS ABRIL 2026: $1.236.062
Esperado:                $1.236.062
Diferencia:              $0
```

(Tolerancia aceptable: ±5.000 pesos por redondeos)

---

## Paso 3 — Verificar curl

```bash
curl "http://localhost:8000/api/dashboard?mes=4&anio=2026" | python3 -m json.tool
```

### Valores finales esperados:

| Campo | Valor esperado |
|-------|---------------|
| `ingreso` | 5.300.000 ✅ |
| `total_cuotas` | ~1.236.062 |
| `total_gastos_mensuales` | ~2.908.019 ✅ |
| `total_mes` | ~4.144.081 |
| `ahorro_proyectado` | ~1.155.919 |

### Proyección 6 meses esperada:

| Mes | Total Mes |
|-----|-----------|
| Abr | ~4.144.081 |
| May | ~4.492.543 |
| Jun | ~4.711.386 |
| Jul | ~4.483.789 |
| Ago | ~3.989.649 |
| Sep | ~3.882.463 |
| Oct | ~3.833.554 |

---

## ✅ Checklist

- [ ] Script de diagnóstico no muestra movimientos de 1 cuota con fecha vencida
- [ ] Seed re-ejecutado, output dice ~$1.236.062
- [ ] `curl` devuelve `total_cuotas` ≈ 1.236.062
- [ ] `curl` devuelve `ahorro_proyectado` ≈ 1.155.919
- [ ] Dashboard muestra Ahorro ~$1.155.919 (no $722k)
- [ ] Proyección: mes de Abril arranca en ~$4.1M (no $4.5M)
- [ ] Commit: `fix: eliminar movimientos vencidos del seed, cuotas correctas`

---

## ⚠️ Reglas

- **NO** tocar frontend
- **NO** tocar la lógica del filtro de fechas (está correcta)
- **NO** tocar otras páginas
- Modificar **únicamente** el array `MOVIMIENTOS_SEED` en `seed_movimientos.py`
- Si la diferencia después del fix sigue siendo mayor a $10.000, correr el script de diagnóstico del Paso 1 y reportar qué movimientos aparecen listados
