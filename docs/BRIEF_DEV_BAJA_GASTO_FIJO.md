# 📋 BRIEF TÉCNICO: Baja Lógica de Gastos Fijos Mensuales
## Para: Dev Jr (Gemini) — Leer COMPLETO antes de escribir una sola línea

---

## 1. CONTEXTO DEL PROYECTO

Sos el dev Jr de **"AURA — Gastos Familiares"**, una app de gestión financiera familiar. El stack es:
- **Backend**: Python 3.11 + FastAPI + SQLModel + SQLite
- **Frontend**: React + Vite + TypeScript + TailwindCSS (tema oscuro Aura)
- **Infra**: Docker Compose en Raspberry Pi, deploy vía `./deploy.sh`

El proyecto vive en: `/home/flink/Documentos/Gastos Familia/`

Antes de tocar una línea de código, leé:
- `.agents/rules/rule-dev.md` → convenciones de código y commits
- `.agents/rules/rule-design.md` → sistema de diseño Aura (dark mode)
- `docs/GUIA_ESTILO_AURA.md` → paleta de colores y componentes UI
- `docs/MANUAL_TECNICO.md` → arquitectura y modelo de datos

---

## 2. EL PROBLEMA ACTUAL

Hoy, si querés "dar de baja" un gasto fijo en la app, **la única opción es eliminarlo** con el botón de borrar. Esto destruye todo el historial y la trazabilidad del gasto.

### Ejemplo real que define esta feature:

```
Ago 2025 → Google Drive creado con $3.000 (es_fijo = True)
Oct 2025 → El usuario lo edita a $2.700 (por el dólar)
           [El sistema crea un registro NUEVO desde Oct 2025
            y cierra el viejo con mes_fin=Sep 2025] ← ya funciona así
May 2026 → El usuario ya no puede pagarlo. Lo da de baja.

RESULTADO ESPERADO:
  - El gasto NO aparece más en Jun 2026, Jul 2026, etc.
  - El gasto SÍ aparece cuando consulto Ago 2025... Apr 2026
  - Se puede reactivar si se quiere retomar el servicio
  - NO se borra ningún registro de la DB
```

---

## 3. EL MODELO ACTUAL (leer antes de modificar)

### `backend/models/gasto_mensual.py` — Estado actual:

```python
class GastoMensual(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    descripcion: str
    categoria: Optional[str] = None
    monto: float
    mes: int          # mes de INICIO (1-12)
    anio: int         # año de INICIO
    es_fijo: bool = Field(default=False)
    mes_fin: Optional[int] = Field(default=None)
    anio_fin: Optional[int] = Field(default=None)
    tarjeta_id: Optional[int] = Field(default=None, foreign_key="tarjeta.id")
    notas: Optional[str] = None
```

### El patrón de "Split" ya existe para ediciones:
Cuando el usuario edita el monto de un gasto fijo en un mes posterior al inicio:
1. El registro viejo se "cierra" con `mes_fin / anio_fin = mes_anterior_a_la_edicion`
2. Se crea un registro NUEVO desde el mes de la edición

Este mismo patrón es la base de la baja lógica.

### La lógica de `mes_absoluto`:
```python
# El sistema compara períodos usando "mes absoluto"
mes_absoluto = anio * 12 + mes
# Un gasto fijo está "activo" si: g_val <= mes_actual_val <= g_fin_val
# donde g_fin_val = 999999 si no tiene mes_fin (= infinito)
```

---

## 4. TU TAREA

Implementar la **baja lógica** de un gasto fijo: una operación que lo "cierra" en el mes actual sin borrar ningún dato histórico.

---

## 5. CAMBIOS EN BACKEND

### 5.1. Migración del modelo — `backend/models/gasto_mensual.py`

Agregar DOS campos nuevos al final del modelo:

```python
from datetime import date

class GastoMensual(SQLModel, table=True):
    # ... todos los campos existentes sin tocar ...
    activo: bool = Field(default=True)
    fecha_baja: Optional[date] = Field(default=None)
```

> ⚠️ SQLite agrega columnas nuevas automáticamente en el primer arranque. Sin embargo, los registros existentes quedarán con `activo = NULL`. En todos los filtros del backend, tratar `activo IS NULL` como `activo = True`.

---

### 5.2. Endpoints de Baja y Reactivar — `backend/routers/gastos_mensuales.py`

```python
from datetime import date

@router.patch("/{gasto_id}/baja", response_model=GastoMensualResponse)
def dar_baja_gasto(gasto_id: int, session: Session = Depends(get_session)):
    gasto = session.get(GastoMensual, gasto_id)
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    if gasto.activo == False:
        raise HTTPException(status_code=400, detail="El gasto ya está dado de baja")

    hoy = date.today()

    # Calcular último mes activo (mes anterior al actual)
    if hoy.month == 1:
        mes_fin = 12
        anio_fin = hoy.year - 1
    else:
        mes_fin = hoy.month - 1
        anio_fin = hoy.year

    # Si el gasto empezó este mismo mes, cerrar en este mes
    if gasto.anio * 12 + gasto.mes >= hoy.year * 12 + hoy.month:
        mes_fin = hoy.month
        anio_fin = hoy.year

    gasto.mes_fin = mes_fin
    gasto.anio_fin = anio_fin
    gasto.activo = False
    gasto.fecha_baja = hoy

    session.add(gasto)
    session.commit()
    session.refresh(gasto)
    return gasto


@router.patch("/{gasto_id}/reactivar", response_model=GastoMensualResponse)
def reactivar_gasto(gasto_id: int, session: Session = Depends(get_session)):
    gasto = session.get(GastoMensual, gasto_id)
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    if gasto.activo != False:
        raise HTTPException(status_code=400, detail="El gasto ya está activo")

    gasto.mes_fin = None
    gasto.anio_fin = None
    gasto.activo = True
    gasto.fecha_baja = None

    session.add(gasto)
    session.commit()
    session.refresh(gasto)
    return gasto
```

---

### 5.3. Schema — `backend/schemas/gasto_mensual.py`

Agregar los nuevos campos al `GastoMensualResponse`:

```python
from datetime import date

class GastoMensualResponse(SQLModel):
    # ... campos existentes ...
    activo: Optional[bool] = True
    fecha_baja: Optional[date] = None
```

---

### 5.4. Lógica de cuotas — `backend/services/cuotas.py`

🔒 **NO tocar este archivo.** La baja lógica setea `mes_fin` correctamente, así que la lógica existente de `g_fin_val` ya excluirá automáticamente el gasto de los meses futuros. No se requiere ningún cambio.

---

## 6. CAMBIOS EN FRONTEND

### 6.1. Tipo TypeScript

```typescript
interface GastoMensual {
  // ... campos existentes ...
  activo?: boolean      // undefined = activo (registros sin el campo)
  fecha_baja?: string   // ISO date "YYYY-MM-DD"
}
```

---

### 6.2. API — `frontend/src/api/gastos_mensuales.ts`

```typescript
export const darBajaGastoMensual = async (id: number): Promise<GastoMensual> => {
  const res = await fetch(`${API_URL}/gastos-mensuales/${id}/baja`, { method: 'PATCH' })
  if (!res.ok) throw new Error('Error al dar de baja el gasto')
  return res.json()
}

export const reactivarGastoMensual = async (id: number): Promise<GastoMensual> => {
  const res = await fetch(`${API_URL}/gastos-mensuales/${id}/reactivar`, { method: 'PATCH' })
  if (!res.ok) throw new Error('Error al reactivar el gasto')
  return res.json()
}
```

---

### 6.3. UI — Botón "Dar de Baja" en el formulario de edición

Cuando el gasto a editar **es fijo (`es_fijo = true`) y activo (`activo !== false`)**, mostrar al final del formulario:

```
┌──────────────────────────────────────────┐
│  [CANCELAR]         [GUARDAR CAMBIOS]    │
│                                          │
│  ──────────────────────────────────────  │
│  🔴 Dar de baja este gasto fijo          │
│  El gasto dejará de proyectarse desde    │
│  el próximo mes. El historial anterior   │
│  queda preservado.                       │
│                             [DAR DE BAJA]│
└──────────────────────────────────────────┘
```

Clases del botón:
```typescript
className="px-4 py-2 rounded-xl text-xs font-bold
           bg-red-500/10 text-red-400 border border-red-500/20
           hover:bg-red-500/20 transition-all active:scale-95"
```

Confirmación obligatoria antes de ejecutar:
```typescript
const confirmar = window.confirm(
  `¿Dar de baja "${gasto.descripcion}"? El gasto dejará de proyectarse desde el próximo mes. El historial queda preservado.`
)
if (!confirmar) return
```

Al confirmar: llamar `darBajaGastoMensual(id)` → invalidar queries `['dashboard', 'gastos-mensuales']` → cerrar form.

---

### 6.4. UI — Visual para gastos dados de baja en el listado

Los gastos con `activo === false` deben aparecer **al final del listado** con estilo diferenciado:

```
Estado ACTIVO (normal):
┌─────────────────────────────────────┐
│ ▌  Google Drive          $ 2.700   │  ← normal
└─────────────────────────────────────┘

Estado DADO DE BAJA:
┌─────────────────────────────────────┐
│ ▌  ~~Google Drive~~      $ 2.700   │  ← opaco + tachado
│    VISA Baso · Baja: May 2026 🔴   │  ← badge con mes de baja
│                       [REACTIVAR]   │  ← botón pequeño
└─────────────────────────────────────┘
```

Clases para el wrapper dado de baja:
```typescript
// Barra de color lateral
style={{ backgroundColor: color, opacity: 0.3 }}

// Texto tachado y opaco
className="line-through opacity-50"

// Badge de baja
className="text-[9px] font-bold text-red-400 uppercase tracking-widest"

// Botón reactivar
className="text-[9px] px-2 py-0.5 rounded border border-aura-mint/30
           text-aura-mint hover:bg-aura-mint/10 transition-all"
```

---

## 7. DIAGRAMA DE FLUJO COMPLETO

```
EJEMPLO REAL — "Google Drive":

 Ago 2025   Sep 2025   Oct 2025   ...   Apr 2026   May 2026   Jun 2026
──────────  ─────────  ─────────        ─────────  ─────────  ─────────
Registro A: mes=8/2025  monto=$3.000  es_fijo=True
✅ activo   ✅ activo   [CIERRE]→ mes_fin=9/2025 (por edición en Oct)

            Registro B: mes=10/2025  monto=$2.700  es_fijo=True
                        ✅ activo   ✅ activo   ✅ activo   [BAJA]→
                        activo=False  fecha_baja=2026-05-10
                        mes_fin=4/2026  anio_fin=2026

RESULTADO:
¿Cuánto pagué Ago 2025?  → Reg A: $3.000 ✅
¿Cuánto pagué Oct 2025?  → Reg B: $2.700 ✅
¿Cuánto pago May 2026?   → Reg B cerrado en Abr 2026 → $0 ✅
¿Cuánto pago Jun 2026?   → $0 ✅
Historial completo?       → Reg A + Reg B visibles en listado ✅
```

---

## 8. ARCHIVOS A MODIFICAR

| Archivo | Acción |
|---------|--------|
| `backend/models/gasto_mensual.py` | Agregar `activo` y `fecha_baja` |
| `backend/schemas/gasto_mensual.py` | Agregar campos al Response |
| `backend/routers/gastos_mensuales.py` | Agregar endpoints `/baja` y `/reactivar` |
| `frontend/src/types/` | Agregar campos al tipo |
| `frontend/src/api/gastos_mensuales.ts` | Agregar funciones de baja/reactivar |
| `frontend/src/components/dashboard/InlineEditForm.tsx` | Agregar sección "Dar de Baja" |
| `frontend/src/pages/Dashboard.tsx` | Estilo visual para datos de baja |

> 🔒 **CANDADO**: NO tocar `backend/services/cuotas.py` ni `backend/services/gemini_parser.py`.

---

## 9. CHECKLIST — DONE CUANDO:

- [ ] Campos `activo` y `fecha_baja` en el modelo sin romper datos existentes
- [ ] `PATCH /gastos-mensuales/{id}/baja` cierra el período correctamente
- [ ] `PATCH /gastos-mensuales/{id}/reactivar` limpia la baja
- [ ] Google en Ago 2025 → `$3.000` ✅
- [ ] Google en Oct 2025 → `$2.700` ✅
- [ ] Google en May 2026 → no aparece en el total ✅
- [ ] Google en Jun 2026 → no aparece ✅
- [ ] Gastos dados de baja con estilo diferente al final del listado
- [ ] Botón "Dar de Baja" pide confirmación antes de ejecutar
- [ ] Botón "Reactivar" solo aparece en gastos dados de baja
- [ ] Sin `console.log` en producción
- [ ] `npm run build` sin errores TypeScript
- [ ] Commits con mensaje convencional en español

---

*Brief generado por Antigravity — Arquitecto Sr del proyecto — 10/05/2026*
