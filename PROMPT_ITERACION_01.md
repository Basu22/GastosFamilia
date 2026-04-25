# PROMPT ITERACIÓN 01 — Dashboard completo + Mobile First
> Pasarle este prompt completo al agente Antigravity. No empezar la siguiente iteración hasta que todos los puntos de verificación estén en verde.

---

## Contexto para el agente

Tenemos una app React + FastAPI de gestión de gastos familiares corriendo en `localhost:8080`. El agente anterior armó la estructura base pero dejó problemas concretos que hay que resolver **en este orden, sin saltear pasos**.

---

## PROBLEMA 1 — Backend: datos incompletos en `/api/dashboard`

**Síntoma**: Las cards muestran `$0` en Ingresos Totales y Gastos Fijos/Var.

**Lo que hay que hacer**:

1. Verificar que la tabla `ingreso` y `gasto_mensual` existen en la DB y tienen datos seed.
2. Si están vacías, insertar estos datos de prueba para Abril 2026:

```python
# Seed de prueba — Abril 2026
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
]
```

3. Asegurarse de que el endpoint `/api/dashboard?mes=4&anio=2026` devuelva exactamente esta estructura:

```json
{
  "mes": 4,
  "anio": 2026,
  "ingreso": 5300000,
  "total_cuotas": 1236062,
  "total_gastos_mensuales": 2908019,
  "total_mes": 4144081,
  "ahorro_proyectado": 1155919,
  "cuotas_por_tarjeta": [
    { "tarjeta_id": 1, "nombre": "BASO VISA",      "monto": 443880, "color": "#3B82F6" },
    { "tarjeta_id": 2, "nombre": "JULI VISA",       "monto": 434824, "color": "#8B5CF6" },
    { "tarjeta_id": 3, "nombre": "JULI MASTER",     "monto": 121398, "color": "#EF4444" },
    { "tarjeta_id": 4, "nombre": "JULI CENCOSUD",   "monto": 189806, "color": "#10B981" },
    { "tarjeta_id": 5, "nombre": "MONI GALICIA",    "monto": 70000,  "color": "#F59E0B" },
    { "tarjeta_id": 6, "nombre": "BASO MASTER",     "monto": 0,      "color": "#64748B" },
    { "tarjeta_id": 7, "nombre": "JULI BBVA",       "monto": 139386, "color": "#06B6D4" },
    { "tarjeta_id": 8, "nombre": "BASO ICBC",       "monto": 280646, "color": "#6366F1" },
    { "tarjeta_id": 9, "nombre": "SELE SANTANDER",  "monto": 0,      "color": "#EC4899" }
  ],
  "proximos_6_meses": [
    { "mes": 5, "anio": 2026, "total_cuotas": 1413049, "total_gastos_mensuales": 3079494, "total_mes": 4492543, "ingreso": 5300000 },
    { "mes": 6, "anio": 2026, "total_cuotas": 1175892, "total_gastos_mensuales": 3535494, "total_mes": 4711386, "ingreso": 5300000 },
    { "mes": 7, "anio": 2026, "total_cuotas": 714294,  "total_gastos_mensuales": 3769494, "total_mes": 4483789, "ingreso": 5300000 },
    { "mes": 8, "anio": 2026, "total_cuotas": 709155,  "total_gastos_mensuales": 3280494, "total_mes": 3989649, "ingreso": 5300000 },
    { "mes": 9, "anio": 2026, "total_cuotas": 676858,  "total_gastos_mensuales": 3205604, "total_mes": 3882463, "ingreso": 5300000 },
    { "mes": 10,"anio": 2026, "total_cuotas": 609974,  "total_gastos_mensuales": 3223580, "total_mes": 3833554, "ingreso": 5300000 }
  ]
}
```

**✅ Verificación 1**: Hacer `curl http://localhost:8000/api/dashboard?mes=4&anio=2026` y confirmar que todos los campos tienen valores reales (no cero, no null).

---

## PROBLEMA 2 — Frontend: colores en el gráfico de barras

**Síntoma**: Todas las barras del gráfico "Cuotas por Tarjeta" son negras.

**Lo que hay que hacer**:

En el componente del gráfico de barras (Recharts), cada `<Bar>` o `<Cell>` debe usar el campo `color` que viene de la API:

```tsx
// Ejemplo correcto con Recharts
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

<ResponsiveContainer width="100%" height={300}>
  <BarChart data={cuotasPorTarjeta} layout="vertical">
    <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
    <YAxis type="category" dataKey="nombre" width={110} tick={{ fontSize: 11 }} />
    <Tooltip formatter={(v: number) => `$${v.toLocaleString('es-AR')}`} />
    <Bar dataKey="monto" radius={[0, 4, 4, 0]}>
      {cuotasPorTarjeta.map((entry, index) => (
        <Cell key={index} fill={entry.color} />
      ))}
    </Bar>
  </BarChart>
</ResponsiveContainer>
```

**✅ Verificación 2**: Cada barra debe tener su color distinto. BASO VISA = azul, JULI VISA = violeta, etc.

---

## PROBLEMA 3 — Frontend: bug en gráfico de Proyección 6 Meses

**Síntoma**: La línea cae a $0 en el mes 10 — el gráfico no termina bien.

**Lo que hay que hacer**:

1. El gráfico debe mostrar TRES líneas: `Ingreso`, `Total Mes` y `Cuotas`.
2. Usar los datos de `proximos_6_meses` del endpoint (que ya tienen valores correctos arriba).
3. El eje X debe mostrar el nombre del mes en español, no el número:

```tsx
const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Formatear el tick del eje X:
tickFormatter={(mes) => MESES[mes]}
```

4. Incluir el mes actual (Abril) como primer punto del gráfico, luego los 6 siguientes.
5. Agregar una línea de referencia punteada en el nivel de ingreso:

```tsx
import { ReferenceLine } from 'recharts'
<ReferenceLine y={ingreso} stroke="#10B981" strokeDasharray="4 4" label={{ value: 'Ingreso', position: 'right', fontSize: 11 }} />
```

**✅ Verificación 3**: El gráfico muestra 7 puntos (mes actual + 6 meses), ninguno en $0, con línea verde de referencia de ingresos.

---

## PROBLEMA 4 — Frontend: Cards de métricas mejoradas

**Síntoma**: Las cards son muy básicas, sin jerarquía visual ni colores semánticos.

**Lo que hay que hacer** — reemplazar las cards actuales por este diseño:

```tsx
// MetricCard.tsx
interface MetricCardProps {
  label: string
  value: number
  icon: string          // emoji o lucide icon name
  variant: 'default' | 'success' | 'danger' | 'warning'
  subtitle?: string     // ej: "vs mes anterior"
}

// Colores por variante (Tailwind):
// default:  bg-white        border-gray-200   text-gray-900
// success:  bg-emerald-50   border-emerald-200 text-emerald-700
// danger:   bg-red-50       border-red-200     text-red-700
// warning:  bg-amber-50     border-amber-200   text-amber-700

// Aplicar:
// Ingresos Totales  → variant="success"
// Total Cuotas      → variant="warning"
// Gastos Fijos/Var  → variant="warning"
// Ahorro Proyectado → variant="success" si > 0, variant="danger" si < 0
```

Formato de números en pesos argentinos:
```tsx
const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
// Output: $ 5.300.000
```

**✅ Verificación 4**: Las 4 cards tienen colores distintos. El ahorro es verde si positivo, rojo si negativo. Los números usan formato `$ X.XXX.XXX`.

---

## PROBLEMA 5 — Mobile First: layout responsive

**Síntoma**: No hay BottomNav en mobile, el sidebar está siempre visible, la app no funciona bien en 375px.

**Lo que hay que hacer**:

### 5.1 — AppShell responsive

```tsx
// AppShell.tsx — estructura completa
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* Sidebar — SOLO desktop */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-gray-200 lg:bg-white lg:z-30">
        <SidebarContent />
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 lg:ml-60">

        {/* TopBar — SOLO mobile */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="text-blue-600 font-semibold text-lg">Gastos Familiares</span>
          <button className="p-2 rounded-lg hover:bg-gray-100">
            {/* Ícono de usuario */}
          </button>
        </header>

        {/* Contenido de la página */}
        <main className="p-4 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* BottomNav — SOLO mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex">
        <BottomNavItem to="/dashboard" icon="dashboard" label="Dashboard" />
        <BottomNavItem to="/gastos"    icon="list"      label="Gastos"    />
        <BottomNavItem to="/nuevo"     icon="plus"      label="Nuevo"     />
        <BottomNavItem to="/tarjetas"  icon="credit-card" label="Tarjetas" />
      </nav>

    </div>
  )
}
```

### 5.2 — Dashboard responsive

```tsx
// En Dashboard.tsx — grid de cards
<div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6 mb-6">
  <MetricCard ... />
  <MetricCard ... />
  <MetricCard ... />
  <MetricCard ... />
</div>

// Grid de gráficos
<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
  <GraficoCuotasTarjeta />
  <GraficoProyeccion />
</div>
```

### 5.3 — Gráficos en mobile

El gráfico de barras en móvil debe mostrar solo las tarjetas con monto > 0 y tener altura adaptable:
```tsx
const height = Math.max(200, cuotasPorTarjeta.filter(t => t.monto > 0).length * 36)
```

**✅ Verificación 5**: 
- En 375px: se ve TopBar arriba, BottomNav abajo, cards en 2 columnas, gráficos apilados.
- En 1024px+: Sidebar izquierda fija, cards en 4 columnas, gráficos lado a lado.
- No hay scroll horizontal en ningún breakpoint.

---

## Orden de ejecución para el agente

```
1. Resolver PROBLEMA 1 (backend) → verificar con curl
2. Resolver PROBLEMA 2 (colores barras) → verificar visualmente
3. Resolver PROBLEMA 3 (bug proyección) → verificar que no cae a 0
4. Resolver PROBLEMA 4 (cards) → verificar colores y formato ARS
5. Resolver PROBLEMA 5 (mobile) → verificar en DevTools a 375px
6. NO tocar las páginas Gastos, Nuevo Gasto ni Tarjetas en esta iteración
7. Hacer commit: "fix: dashboard completo con datos reales, colores y mobile first"
```

---

## Resultado esperado al final de esta iteración

El Dashboard debe verse así:

**Mobile (375px)**:
```
┌─────────────────────────┐
│ Gastos Familiares    👤 │  ← TopBar
├─────────────────────────┤
│ Resumen de Abril 2026   │
│                         │
│ ┌──────────┐┌──────────┐│
│ │ Ingresos ││  Cuotas  ││  ← verde / naranja
│ │$5.300.000││$1.236.062││
│ └──────────┘└──────────┘│
│ ┌──────────┐┌──────────┐│
│ │  Gastos  ││  Ahorro  ││  ← naranja / verde
│ │$2.908.019││$1.155.919││
│ └──────────┘└──────────┘│
│                         │
│ Cuotas por Tarjeta      │
│ [gráfico de barras      │
│  con colores            │
│  scrolleable]           │
│                         │
│ Proyección 6 Meses      │
│ [gráfico de líneas      │
│  3 líneas, sin caída    │
│  a cero]                │
├─────────────────────────┤
│ 🏠  📋  ➕  💳        │  ← BottomNav
└─────────────────────────┘
```

**Desktop (1024px+)**:
```
┌──────────┬──────────────────────────────────────────┐
│          │ Resumen de Abril 2026                    │
│Gastos    │                                          │
│Familiares│ ┌────────┐┌────────┐┌────────┐┌────────┐│
│          │ │Ingresos││ Cuotas ││ Gastos ││ Ahorro ││
│Dashboard │ │$5.300K ││$1.236K ││$2.908K ││$1.155K ││
│Gastos    │ └────────┘└────────┘└────────┘└────────┘│
│NuevoGasto│                                          │
│Tarjetas  │ ┌──────────────────┐┌───────────────────┐│
│          │ │Cuotas x Tarjeta  ││ Proyección 6 Meses││
│          │ │[barras coloreadas]││[3 líneas, ref line]││
│          │ └──────────────────┘└───────────────────┘│
│CerrarSes.│                                          │
└──────────┴──────────────────────────────────────────┘
```

---

## ⚠️ Reglas para esta iteración

- **NO** crear páginas nuevas
- **NO** refactorizar código que no está en esta lista
- **NO** cambiar el modelo de datos ni los endpoints existentes
- **SÍ** hacer commit al final con mensaje descriptivo
- **SÍ** probar en DevTools con viewport 375px antes de entregar
```
