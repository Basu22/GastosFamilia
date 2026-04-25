# Plan de Implementación: Proyector Anual de Finanzas

## El Problema que Resolvemos

El sistema actual calcula las proyecciones "al vuelo" usando la lógica de gastos/ingresos fijos. Esto es un **snapshot del presente**: si el sueldo de mayo es $500k fijo, el sistema proyecta $500k para todos los meses siguientes. No hay forma de decirle "en junio hay aguinaldo, así que ese mes serán $900k".

La solución es crear un sistema de **"overrides" (sobrescrituras) por mes**: cada ítem de ingreso o gasto mensual tiene su valor base. Podés pisar ese valor para un mes específico sin alterar la regla base de todos los demás meses.

---

## Concepto Clave: Override por Mes

```
Ingreso base "Sueldo"    → $500.000 (fijo, desde Ene 2026)
  └─ Override Jun 2026   → $900.000 (aguinaldo incluido)
  └─ Override Sep 2026   → $700.000 (aumento de sueldo)

Gasto base "Expensas"    → $85.000 (fijo, desde Ene 2026)
  └─ Override Mar 2026   → $102.000 (aumento de expensas)
  └─ Override Jul 2026   → $110.000 (otro aumento)
```

El **Proyector** recorre mes a mes desde el mes actual hasta diciembre y para cada ítem pregunta: ¿existe un override para este mes? → usa ese valor. Si no → usa el valor base del registro.

---

## User Review Required

> [!IMPORTANT]
> **Decisión de diseño:** ¿Querés que los overrides se ingresen **directamente en la vista de Proyección** (editando celdas en la tabla), o preferís una pantalla separada de ABM de overrides? El plan propone la primera opción (edición inline en la tabla), que es más fluida pero más compleja de construir.

> [!IMPORTANT]
> **Alcance de la proyección:** El plan proyecta desde el mes actual hasta **diciembre del año en curso**. ¿Querés que el alcance sea siempre "hasta fin de año" o preferís que sea configurable (ej: proyectar los próximos 12 meses)?

---

## Open Questions

- ¿Los overrides aplican solo a **Ingresos** y **Gastos Mensuales** (Egresos), o también querés poder "marcar" que una cuota de tarjeta no va a estar en un mes específico?
- ¿Querés exportar la proyección a PDF/Excel en algún momento? (No lo haremos ahora, solo para saber si la estructura de datos debe preverlo.)

---

## Proposed Changes

---

### 1. Backend — Nuevo Modelo y Servicio

#### [NEW] `backend/models/proyeccion_override.py`
Nuevo modelo SQLModel para guardar los "pises" de valor por mes:
```python
class ProyeccionOverride(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tipo: str          # "ingreso" | "gasto_mensual"
    referencia_id: int # ID del Ingreso o GastoMensual al que aplica
    mes: int
    anio: int
    monto: float       # El valor que reemplaza al base para ese mes
    notas: Optional[str] = None
```

#### [MODIFY] `backend/database.py`
Crear la nueva tabla al arrancar el servidor (como hacemos con todos los demás modelos).

#### [NEW] `backend/services/proyeccion.py`
Nuevo servicio con la lógica de proyección. Función central:
```python
def get_proyeccion_anual(anio: int, session: Session) -> List[MesProyectado]
```
Para cada mes del año, calcula:
- **Cuotas**: `get_cuotas_mes()` (servicio ya existente, no cambia nada)
- **Ingresos**: suma de ingresos, respetando overrides del mes
- **Gastos Mensuales**: suma de egresos, respetando overrides del mes
- **Ahorro Neto**: `ingresos - cuotas - gastos_mensuales`

#### [NEW] `backend/routers/proyeccion.py`
Tres endpoints:
- `GET /api/proyeccion/?anio=2026` → devuelve la proyección mes a mes del año
- `POST /api/proyeccion/override` → guarda o actualiza un override
- `DELETE /api/proyeccion/override/{id}` → elimina un override (vuelve al valor base)

#### [MODIFY] `backend/main.py`
Registrar el nuevo router `proyeccion`.

---

### 2. Frontend — Nueva Página

#### [NEW] `frontend/src/api/proyeccion.ts`
Funciones de fetch tipadas para los 3 nuevos endpoints.

#### [NEW] `frontend/src/pages/Proyeccion.tsx`
Nueva página `/proyeccion` con dos secciones:

**Sección 1 — Gráfico de Barras Apiladas (Recharts)**
- Eje X: Meses (Ene → Dic)
- Barras apiladas: Cuotas (violeta) + Gastos Fijos (rojo)  
- Línea de referencia: Ingreso del mes (verde punteado)
- Visualmente muestra en qué meses el egreso supera al ingreso

**Sección 2 — Tabla Interactiva Mes a Mes**
- Una fila por mes con columnas: Mes | Ingresos | Gastos | Cuotas | Total Egresos | Ahorro
- Los meses pasados: solo lectura, datos históricos reales
- Los meses futuros: campos editables con `NumericFormat` para modificar valores inline
- Un indicador visual (✎ ícono) cuando un mes tiene un override activo
- Botón "Guardar cambios" al final

#### [MODIFY] `frontend/src/components/layout/Sidebar.tsx` y `BottomNav.tsx`
Agregar ícono de navegación a `/proyeccion` (ícono `BarChart2` de Lucide).

#### [MODIFY] `frontend/src/App.tsx`
Agregar `Route` para `/proyeccion`.

---

## Verification Plan

### Automated Tests
- Reiniciar backend y verificar que la nueva tabla `proyeccionoverride` se crea sin errores
- `GET /api/proyeccion/?anio=2026` retorna 12 meses con valores correctos
- `POST /api/proyeccion/override` guarda el override y el próximo GET lo refleja
- `DELETE /api/proyeccion/override/{id}` revierte al valor base

### Manual Verification
- Navegar a `/proyeccion` y ver el gráfico y la tabla
- Editar el monto de ingresos de un mes futuro → verificar que el ahorro se recalcula al guardar
- Volver al Dashboard → verificar que el mini-gráfico de proyección de 6 meses **no cambió** (son sistemas independientes)
- Probar en modo oscuro y claro
- Probar en viewport 375px (mobile)
