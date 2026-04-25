# PROMPT ITERACIÓN 03 — Fix filtro de fecha en cuotas
> El bug anterior se redujo a la mitad pero no se resolvió. El problema ahora es el filtro de fecha.

---

## Diagnóstico

**Total Cuotas actual:** $21.444.493  
**Total Cuotas correcto:** $1.236.062  
**Ratio:** ~17x — está sumando cuotas de múltiples meses en lugar de solo Abril 2026.

El agente cambió `monto_total` por `monto_cuota` (bien), pero la query **no está filtrando por mes/año**. Está trayendo TODOS los movimientos de la DB y sumando `monto_cuota` de todos ellos, en lugar de solo los que tienen una cuota activa en el mes consultado.

---

## El fix — función `cuota_activa_en_mes`

Localizar la función que calcula cuotas en el backend y reemplazarla completamente por esta implementación:

```python
from datetime import date
from calendar import monthrange

def cuota_activa_en_mes(movimiento, mes: int, anio: int) -> bool:
    """
    Una cuota está activa en mes/año si el mes consultado
    cae dentro del rango [fecha_primera_cuota, fecha_ultima_cuota].
    
    Comparamos el primer día del mes consultado contra ese rango.
    """
    primer_dia_mes = date(anio, mes, 1)
    return (
        movimiento.fecha_primera_cuota <= primer_dia_mes
        and primer_dia_mes <= movimiento.fecha_ultima_cuota
    )


def get_cuotas_mes(mes: int, anio: int, db: Session) -> float:
    """Suma de monto_cuota de todos los movimientos activos en ese mes."""
    movimientos = db.query(Movimiento).all()
    total = sum(
        m.monto_cuota
        for m in movimientos
        if cuota_activa_en_mes(m, mes, anio)
    )
    return round(total, 2)


def get_cuotas_por_tarjeta(mes: int, anio: int, db: Session) -> list:
    """Monto por tarjeta de cuotas activas en ese mes."""
    tarjetas = db.query(Tarjeta).filter(Tarjeta.activa == True).all()
    resultado = []
    for tarjeta in tarjetas:
        movimientos = db.query(Movimiento).filter(
            Movimiento.tarjeta_id == tarjeta.id
        ).all()
        monto = sum(
            m.monto_cuota
            for m in movimientos
            if cuota_activa_en_mes(m, mes, anio)
        )
        resultado.append({
            "tarjeta_id": tarjeta.id,
            "nombre": tarjeta.nombre,
            "monto": round(monto, 2),
            "color": tarjeta.color
        })
    return resultado
```

---

## Verificación obligatoria con curl

```bash
curl "http://localhost:8000/api/dashboard?mes=4&anio=2026" | python3 -m json.tool
```

### Valores que DEBEN aparecer (±500 pesos de tolerancia):

```
total_cuotas          →  1.236.062   ✅  (NO 21 millones)
total_gastos_mensuales →  2.908.019   ✅  (ya estaba bien)
ingreso               →  5.300.000   ✅  (ya estaba bien)
total_mes             →  4.144.081   ✅
ahorro_proyectado     →  1.155.919   ✅  (positivo, NO negativo)
```

### Cuotas por tarjeta:
```
BASO VISA       →   ~443.880
JULI VISA       →   ~434.824
BASO ICBC       →   ~280.646   ← debe ser MENOR que BASO VISA
JULI CENCOSUD   →   ~189.806
JULI BBVA       →   ~139.386
JULI MASTER     →   ~121.398
MONI GALICIA    →    ~70.000
BASO MASTER     →         0
SELE SANTANDER  →         0
```

**⛔ Si `total_cuotas` sigue siendo mayor a $2.000.000, hay otro bug. No continuar.**

---

## Debug adicional si sigue fallando

Si el curl sigue mostrando números incorrectos, agregar este endpoint temporal de debug:

```python
@router.get("/debug/cuotas")
def debug_cuotas(mes: int, anio: int, db: Session = Depends(get_db)):
    movimientos = db.query(Movimiento).all()
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
    return {"total": total, "detalle": detalle}
```

Llamar con: `curl "http://localhost:8000/api/debug/cuotas?mes=4&anio=2026"`

Esto muestra exactamente qué movimientos están siendo contados y cuáles no. Si hay movimientos marcados como `activo_en_mes: true` que no deberían estarlo, el problema está en las fechas guardadas en la DB.

---

## ✅ Checklist final

- [ ] `total_cuotas` ≈ 1.236.062 (no millones)
- [ ] `ahorro_proyectado` es positivo (~1.155.919)
- [ ] En el gráfico de barras: BASO VISA es la barra más larga (no BASO ICBC)
- [ ] El gráfico de proyección no cae a cero en ningún mes
- [ ] Commit: `fix: filtrar cuotas por mes activo en fecha_primera/ultima_cuota`

---

## ⚠️ Reglas

- **NO** tocar frontend
- **NO** tocar otras páginas
- **NO** cambiar el modelo de datos
- Resolver SOLO el filtro de fecha en la función de cuotas
