# PROMPT ITERACIÓN 02 — Fix crítico: cálculo de cuotas
> Un solo bug central está rompiendo todos los números. Resolver SOLO esto, no tocar nada más.

---

## El problema

La función que calcula cuánto se paga por tarjeta en un mes dado está usando `monto_total` en lugar de `monto_cuota`. Esto infla los números ~30x.

**Valor actual (incorrecto):** Total Cuotas Abril = $42.888.986  
**Valor esperado (correcto):** Total Cuotas Abril = $1.236.062

---

## Paso 1 — Encontrar el bug en el backend

Buscar en el backend la función que calcula las cuotas para un mes dado. Probablemente está en `services/cuotas.py` o dentro del router de dashboard. Debe verse algo así:

```python
# ❌ INCORRECTO — usa monto_total
def get_cuotas_mes(mes: int, anio: int, db: Session):
    movimientos = db.query(Movimiento).filter(
        Movimiento.fecha_primera_cuota <= fecha_limite,
        Movimiento.fecha_ultima_cuota >= fecha_inicio
    ).all()
    return sum(m.monto_total for m in movimientos)  # BUG AQUÍ

# ✅ CORRECTO — usa monto_cuota
def get_cuotas_mes(mes: int, anio: int, db: Session):
    movimientos = db.query(Movimiento).filter(
        Movimiento.fecha_primera_cuota <= fecha_limite,
        Movimiento.fecha_ultima_cuota >= fecha_inicio
    ).all()
    return sum(m.monto_cuota for m in movimientos)  # monto_total / cuotas
```

La lógica correcta para filtrar si una cuota está activa en un mes/año dado:

```python
from datetime import date
from dateutil.relativedelta import relativedelta

def cuota_activa_en_mes(movimiento, mes: int, anio: int) -> bool:
    """
    Una cuota está activa en mes/año si:
    fecha_primera_cuota <= primer día del mes/año <= fecha_ultima_cuota
    """
    fecha_consulta = date(anio, mes, 1)
    return movimiento.fecha_primera_cuota <= fecha_consulta <= movimiento.fecha_ultima_cuota

def get_cuotas_mes(mes: int, anio: int, db: Session) -> float:
    movimientos = db.query(Movimiento).all()
    activos = [m for m in movimientos if cuota_activa_en_mes(m, mes, anio)]
    return sum(m.monto_cuota for m in activos)

def get_cuotas_mes_por_tarjeta(mes: int, anio: int, db: Session) -> list:
    tarjetas = db.query(Tarjeta).all()
    resultado = []
    for tarjeta in tarjetas:
        movimientos = db.query(Movimiento).filter(
            Movimiento.tarjeta_id == tarjeta.id
        ).all()
        activos = [m for m in movimientos if cuota_activa_en_mes(m, mes, anio)]
        monto = sum(m.monto_cuota for m in activos)
        resultado.append({
            "tarjeta_id": tarjeta.id,
            "nombre": tarjeta.nombre,
            "monto": round(monto, 2),
            "color": tarjeta.color
        })
    return resultado
```

---

## Paso 2 — Verificar con curl antes de tocar el frontend

```bash
curl "http://localhost:8000/api/dashboard?mes=4&anio=2026" | python3 -m json.tool
```

Los valores que DEBEN aparecer (tolerancia ±500 pesos):

| Campo | Valor esperado |
|-------|---------------|
| `ingreso` | 5.300.000 |
| `total_cuotas` | 1.236.062 |
| `total_gastos_mensuales` | 2.908.019 |
| `total_mes` | 4.144.081 |
| `ahorro_proyectado` | 1.155.919 |

Y en `cuotas_por_tarjeta`:

| Tarjeta | Monto esperado |
|---------|---------------|
| BASO VISA | ~443.880 |
| JULI VISA | ~434.824 |
| BASO ICBC | ~280.646 |
| JULI CENCOSUD | ~189.806 |
| JULI MASTER | ~121.398 |
| JULI BBVA | ~139.386 |
| MONI GALICIA | ~70.000 |
| BASO MASTER | 0 |
| SELE SANTANDER | 0 |

**⛔ No continuar al paso 3 si estos números no cuadran.**

---

## Paso 3 — Verificar el gráfico de proyección

Una vez corregido el backend, el gráfico de Proyección 6 Meses debe mostrar:

| Mes | Total Mes esperado |
|-----|--------------------|
| Abr | ~4.144.081 |
| May | ~4.492.543 |
| Jun | ~4.711.386 |
| Jul | ~4.483.789 |
| Ago | ~3.989.649 |
| Sep | ~3.882.463 |
| Oct | ~3.833.554 |

Ningún punto debe estar en $0 ni por debajo de $3.000.000.
La línea de Ingreso ($5.300.000) debe estar SIEMPRE por encima de las otras líneas.

---

## Paso 4 — Ajustar seed de gastos mensuales

Si `total_gastos_mensuales` da $2.777.795 en lugar de $2.908.019, significa que faltan gastos en el seed. Agregar los que falten hasta completar $2.908.019:

```python
# Gastos que podrían estar faltando:
{"descripcion": "Compra dolares",  "monto": 284000, "mes": 4, "anio": 2026},
{"descripcion": "Cuotas MP",       "monto": 52287,  "mes": 4, "anio": 2026},
# Diferencia entre $2.777.795 y $2.908.019 = $130.224
# Ajustar sumando los gastos faltantes hasta llegar al total correcto
```

---

## ✅ Checklist de verificación final

- [ ] `curl dashboard` devuelve `total_cuotas: ~1236062` (NO 42 millones)
- [ ] `curl dashboard` devuelve `ahorro_proyectado: ~1155919` (positivo, NO negativo)
- [ ] Gráfico de barras: BASO VISA y JULI VISA son las barras más largas (no BASO ICBC)
- [ ] Gráfico de proyección: ningún punto cae a $0 ni a valores negativos
- [ ] La línea verde de ingresos está por encima de todas las demás líneas

---

## ⚠️ Reglas

- **NO** tocar el frontend más allá de lo que cambió el fix del backend (los gráficos deberían actualizarse solos con datos correctos)
- **NO** modificar la estructura de componentes ni el layout
- **NO** tocar páginas Gastos, Nuevo Gasto ni Tarjetas
- Commit al final: `fix: corregir cálculo de monto_cuota vs monto_total en proyección`
