# 📋 BRIEF TÉCNICO: Módulo de Préstamos Bancarios
## Para: Dev Jr (Gemini Flash) — Leer COMPLETO antes de escribir una sola línea

---

## ⛔ AVISO CRÍTICO DE SEGURIDAD — LEER PRIMERO

> **PROHIBICIÓN ESTRICTA E INNEGOCIABLE:**
>
> El archivo `backend/services/gemini_parser.py` está **BAJO CANDADO DE SEGURIDAD**.
>
> **NO está permitido:**
> - Modificar la lógica interna del archivo
> - Cambiar el modelo de IA (`gemini-2.5-flash`)
> - Alterar la librería `google-genai`
> - Ni siquiera refactorizar el código del parser
>
> **Extensión de esta restricción:** Cualquier archivo que interactúe directamente con modelos de IA (Google Gemini, Claude, GPT, etc.) está igualmente protegido. **Si considerás que hay una razón válida para tocar estos archivos, debés pedir autorización explícita al Product Owner antes de escribir una sola línea.**
>
> La violación de este candado puede romper la cadena de parseo automático de gastos y la categorización inteligente, funciones críticas del sistema.

---

## 1. CONTEXTO DEL PROYECTO

Sos el dev Jr de **"AURA — Gastos Familiares"**, una app de gestión financiera familiar. El stack es:
- **Backend**: Python 3.12 + FastAPI + SQLModel + SQLite
- **Frontend**: React + Vite + TypeScript + TailwindCSS (tema oscuro Aura)
- **Infra**: Docker Compose en Raspberry Pi, deploy vía `./deploy.sh`

El proyecto vive en: `/home/flink/Documentos/Gastos Familia/`

### 📚 Antes de tocar una línea de código, leé:
- `.agents/rules/rule-dev.md` → convenciones de código y commits
- `.agents/rules/rule-design.md` → sistema de diseño Aura (dark mode)
- `docs/GUIA_ESTILO_AURA.md` → paleta de colores y componentes UI
- `docs/MANUAL_TECNICO.md` → arquitectura y modelo de datos actualizado
- `docs/MANUAL_FUNCIONAL.md` → cómo funciona la app para el usuario

---

## 2. ESTADO DE LO IMPLEMENTADO (QUÉ YA ESTÁ HECHO)

Esta funcionalidad **ya fue implementada por el Arquitecto Sr.** Lo que describimos aquí es la implementación completa para que puedas:
1. Entender el sistema y poder mantenerlo
2. Documentar los cambios en los docstrings/comentarios inline si faltan
3. Agregar tests si los solicitamos

### 2.1. Backend — Ya existe

| Archivo | Estado |
|---------|--------|
| `backend/models/prestamo.py` | ✅ Implementado |
| `backend/schemas/prestamo.py` | ✅ Implementado |
| `backend/routers/prestamos.py` | ✅ Implementado |
| `backend/routers/dashboard.py` | ✅ Actualizado |
| `backend/services/proyeccion.py` | ✅ Actualizado |
| `backend/database.py` | ✅ Actualizado |
| `backend/main.py` | ✅ Actualizado |

### 2.2. Frontend — Ya existe

| Archivo | Estado |
|---------|--------|
| `frontend/src/api/prestamos.ts` | ✅ Implementado |
| `frontend/src/pages/Dashboard.tsx` | ✅ Actualizado |
| `frontend/src/pages/Movimientos.tsx` | ✅ Actualizado |
| `frontend/src/components/dashboard/InlineCreateForm.tsx` | ✅ Actualizado |
| `frontend/src/components/dashboard/InlineEditForm.tsx` | ✅ Actualizado |
| `frontend/src/components/ui/MetricCard.tsx` | ✅ Actualizado |

---

## 3. QUÉ ES UN PRÉSTAMO EN ESTE SISTEMA

### 3.1. Regla de Negocio

Un préstamo es un compromiso financiero con una **entidad bancaria** que:
1. Se carga UNA sola vez con el monto total y la cantidad de cuotas
2. El sistema calcula automáticamente el valor de cada cuota
3. Aparece automáticamente en el Dashboard cada mes hasta terminar de pagarlo
4. NO requiere ninguna intervención mensual por parte del usuario
5. **El banco maneja la tasa, la amortización, etc. El sistema solo trackea la cuota fija**

### 3.2. Ejemplo real

```
El usuario tomó un préstamo personal en Banco Galicia:
  → Monto total: $ 600.000
  → Cuotas: 12
  → Primera cuota: Mayo 2026

El sistema calcula:
  → monto_cuota = 600.000 / 12 = $ 50.000
  → fecha_ultima_cuota = Mayo 2026 + 11 meses = Abril 2027

Resultado:
  May 2026 → $ 50.000 aparece en el Dashboard (cuota 1/12)
  Jun 2026 → $ 50.000 (cuota 2/12)
  ...
  Abr 2027 → $ 50.000 (cuota 12/12) ← último mes
  May 2027 → desaparece automáticamente
```

---

## 4. EL MODELO DE DATOS

### `backend/models/prestamo.py`

```python
from typing import Optional
from datetime import date
from sqlmodel import SQLModel, Field

class Prestamo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    entidad: str                    # "Banco Galicia", "ICBC", etc.
    descripcion: str                # "Préstamo Personal Mayo 2026"
    monto_total: float              # Monto total del préstamo
    monto_cuota: float              # Calculado: monto_total / cuotas
    cuotas: int                     # Cantidad de cuotas
    fecha_primera_cuota: date       # Fecha de la primera cuota
    fecha_ultima_cuota: date        # Calculado: fecha_primera + (cuotas-1) meses
    notas: Optional[str] = None
```

> ⚠️ **Importante**: `monto_cuota` y `fecha_ultima_cuota` son **siempre calculados automáticamente por el backend** al crear o actualizar. El frontend no los envía.

---

## 5. SCHEMAS (Pydantic)

### `backend/schemas/prestamo.py`

```python
class PrestamoCreate(BaseModel):
    entidad: str
    descripcion: str
    monto_total: float
    cuotas: int
    fecha_primera_cuota: date
    notas: Optional[str] = None

class PrestamoUpdate(BaseModel):  # todos opcionales para PATCH/PUT
    entidad: Optional[str] = None
    descripcion: Optional[str] = None
    monto_total: Optional[float] = None
    cuotas: Optional[int] = None
    fecha_primera_cuota: Optional[date] = None
    notas: Optional[str] = None

class PrestamoResponse(PrestamoBase):
    id: int
    monto_cuota: float          # Calculado
    fecha_ultima_cuota: date    # Calculado
```

---

## 6. API ENDPOINTS

### `backend/routers/prestamos.py`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/prestamos/` | Lista todos los préstamos |
| POST | `/api/prestamos/` | Crea un préstamo (calcula cuota y fecha fin) |
| PUT | `/api/prestamos/{id}` | Actualiza un préstamo (recalcula automático) |
| DELETE | `/api/prestamos/{id}` | Elimina un préstamo |

### Lógica de cálculo (en `calcular_cuotas_y_fechas`):
```python
def calcular_cuotas_y_fechas(prestamo, data):
    prestamo.monto_cuota = prestamo.monto_total / data.cuotas
    meses_a_sumar = prestamo.cuotas - 1
    prestamo.fecha_ultima_cuota = prestamo.fecha_primera_cuota + relativedelta(months=meses_a_sumar)
```

---

## 7. INTEGRACIÓN CON EL DASHBOARD

### 7.1. Cómo aparecen en el Dashboard

El endpoint `GET /api/dashboard/?mes=X&anio=Y` ahora incluye:

```json
{
  "total_prestamos": 50000.0,          // Nueva métrica
  "prestamos_por_entidad": [           // Nuevo detalle
    {"entidad": "Banco Galicia", "monto": 50000.0}
  ],
  "movimientos_mes": [
    {
      "tipo": "prestamo",              // Identificador
      "origen": "Préstamos",
      "descripcion": "Préstamo Personal (1/12)",
      "monto": 50000.0,
      "monto_total": 600000.0,
      "tarjeta_color": "#10B981"       // Verde esmeralda fijo para préstamos
    }
  ]
}
```

### 7.2. Cómo se proyectan (próximos 6 y 12 meses)

En `dashboard.py` y `services/proyeccion.py`, los préstamos se proyectan con la misma lógica de mes absoluto que las cuotas:

```python
# Un préstamo impacta en un mes si:
inicio_val = fecha_primera_cuota.year * 12 + fecha_primera_cuota.month
fin_val = fecha_ultima_cuota.year * 12 + fecha_ultima_cuota.month

if inicio_val <= mes_actual_val <= fin_val:
    # Aparece en el total del mes
```

---

## 8. INTEGRACIÓN CON EL FRONTEND

### 8.1. API Client (`frontend/src/api/prestamos.ts`)

```typescript
export const getPrestamos = async () => { ... }    // GET /prestamos/
export const createPrestamo = async (data) => { ... }  // POST /prestamos/
export const updatePrestamo = async (id, data) => { ... }  // PUT /prestamos/{id}
export const deletePrestamo = async (id) => { ... }  // DELETE /prestamos/{id}
```

### 8.2. Dashboard

- **Nueva MetricCard**: `"Préstamos"` con variante `info` (color indigo) junto a Ingresos, Cuotas y Ahorro
- **Nuevo grupo en listado**: `"Préstamos"` aparece en la tabla con la misma estructura que Cuotas de Tarjeta
- El filtro en el `useMemo` agrupa por `tipo === 'prestamo'`

### 8.3. Movimientos (nueva pestaña)

En `/movimientos` se agregó la pestaña **"Préstamos"** (color indigo) donde el usuario puede:
- Ver todos los préstamos cargados
- Crear uno nuevo (con campo Entidad/Banco y selector de cuotas con preset [1, 3, 6, 12, 18, 24])
- Editar (recalcula automáticamente)
- Eliminar

---

## 9. REGLAS DE UX/DISEÑO PARA PRÉSTAMOS

El color identificativo de préstamos en el Dashboard es `#10B981` (verde esmeralda). **Este color NO viene de la API como en las tarjetas de crédito — está hardcodeado en el backend.**

Las tarjetas en el listado muestran:
```
Descripción del préstamo (cuota actual / cuotas totales)
Entidad / Banco
Valor cuota del mes
```

---

## 10. TU TAREA (si hay algo pendiente)

> ✅ La implementación base está completa. Si el Product Owner te asigna una subtarea de este módulo, las más probables son:

### 10.1. Posibles mejoras futuras
1. **Baja lógica de préstamos**: Similar a Gastos Fijos, poder "cancelar" un préstamo en un mes específico sin borrar el historial
2. **Detalle de préstamo**: Vista expandida con el calendario de cuotas completo
3. **Recalculo de cuota**: Si el monto cambia (refinanciación), el sistema debería crear un registro nuevo (patrón "split" ya implementado en Gastos Fijos)

---

## 11. ARCHIVOS QUE NUNCA DEBÉS TOCAR SIN AUTORIZACIÓN

```
backend/services/gemini_parser.py    ← 🔒 CANDADO ABSOLUTO
backend/services/gmail_importer.py   ← 🔒 SOLO con autorización
backend/services/cuotas.py           ← 🔒 Lógica crítica validada
```

---

## 12. CHECKLIST — ANTES DE ENTREGAR

- [ ] Los endpoints `GET/POST/PUT/DELETE /api/prestamos/` responden correctamente
- [ ] Al crear un préstamo con 12 cuotas desde Mayo 2026 → la cuota aparece hasta Abril 2027 exclusive
- [ ] El Dashboard muestra la MetricCard de Préstamos
- [ ] La proyección de 6 meses suma correctamente las cuotas de préstamo
- [ ] La pestaña "Préstamos" en `/movimientos` permite CRUD completo
- [ ] Sin `console.log` en producción
- [ ] `npm run build` sin errores TypeScript
- [ ] Commits con mensaje convencional en español (`feat: ...`, `fix: ...`)

---

*Brief generado por Antigravity — Arquitecto Sr del proyecto — 10/05/2026*
