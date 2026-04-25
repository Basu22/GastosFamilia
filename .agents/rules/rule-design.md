---
trigger: always_on
---

# Reglas de Diseño — Gastos Familiares
> Sistema de diseño del proyecto. El agente debe aplicar estas reglas en cada componente sin excepción.

---

## 1. Principio fundamental: Mobile First

**Diseñar siempre para 375px primero. Luego escalar hacia arriba.**

```css
/* ✅ CORRECTO — mobile first */
.container { padding: 1rem; }
@media (min-width: 1024px) { .container { padding: 2rem; } }

/* ❌ INCORRECTO — desktop first */
.container { padding: 2rem; }
@media (max-width: 768px) { .container { padding: 1rem; } }
```

En Tailwind, esto significa:
```
clase base        → móvil (375px+)
sm:clase          → tablet (640px+)
lg:clase          → desktop (1024px+)
xl:clase          → desktop grande (1280px+)
```

---

## 2. Tokens de diseño

### Colores del sistema (CSS variables via Tailwind)
```
Fondo principal:    bg-white / bg-gray-50
Fondo secundario:   bg-gray-100
Borde:              border-gray-200
Texto principal:    text-gray-900
Texto secundario:   text-gray-500
Texto terciario:    text-gray-400
```

### Colores semánticos
```
Éxito / positivo:   emerald  → bg-emerald-50  border-emerald-200  text-emerald-700
Advertencia:        amber    → bg-amber-50    border-amber-200    text-amber-700
Peligro / negativo: red      → bg-red-50      border-red-200      text-red-700
Info / neutro:      blue     → bg-blue-50     border-blue-200     text-blue-700
```

### Colores por tarjeta (inmutables — no cambiar)
```
BASO VISA:       #3B82F6  (blue-500)
JULI VISA:       #8B5CF6  (violet-500)
JULI MASTER:     #EF4444  (red-500)
JULI CENCOSUD:   #10B981  (emerald-500)
MONI GALICIA:    #F59E0B  (amber-500)
BASO MASTER:     #64748B  (slate-500)
JULI BBVA:       #06B6D4  (cyan-500)
BASO ICBC:       #6366F1  (indigo-500)
SELE SANTANDER:  #EC4899  (pink-500)
```

### Tipografía
```
Font family:   Inter (sans-serif del sistema)
               font-sans → Inter, system-ui, sans-serif

Escala de tamaños:
  xs:   12px  → text-xs   → etiquetas, badges, metadatos
  sm:   14px  → text-sm   → cuerpo secundario, subtítulos
  base: 16px  → text-base → cuerpo principal
  lg:   18px  → text-lg   → títulos de sección
  xl:   20px  → text-xl   → títulos de página
  2xl:  24px  → text-2xl  → números grandes en cards
  3xl:  30px  → text-3xl  → hero numbers

Pesos:
  400 → font-normal  → cuerpo
  500 → font-medium  → etiquetas, nav items
  600 → font-semibold → títulos
  700 → font-bold    → números destacados, headings
```

### Espaciado
```
Padding interno componentes:  p-3 (12px) → p-4 (16px) → p-6 (24px)
Gap entre elementos:          gap-3 (12px) → gap-4 (16px) → gap-6 (24px)
Margen entre secciones:       mb-4 → mb-6 → mb-8
Padding de página móvil:      px-4 py-4
Padding de página desktop:    px-8 py-8
```

### Border radius
```
Pequeño (badges, tags):    rounded    → 4px
Mediano (inputs, botones): rounded-lg → 8px
Grande (cards):            rounded-xl → 12px
Completo (avatares):       rounded-full
```

---

## 3. Clases CSS — Nomenclatura BEM adaptada a Tailwind

Para clases CSS custom (cuando Tailwind no alcanza), usar BEM:

```css
/* Bloque */
.metric-card { }

/* Elemento */
.metric-card__label { }
.metric-card__value { }
.metric-card__icon { }

/* Modificador */
.metric-card--success { }
.metric-card--danger { }
.metric-card--warning { }
```

**En Tailwind**, usar variantes composables en lugar de clases custom:
```tsx
// ✅ Preferido — composición con Tailwind
const variants = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  danger:  'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
}

// ❌ Evitar — clase custom que repite Tailwind
.card-success { background: #ecfdf5; border-color: #a7f3d0; }
```

---

## 4. Componentes base

### Card
```tsx
// Uso estándar
<div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
  {children}
</div>

// Card con hover (clickeable)
<div className="bg-white rounded-xl border border-gray-200 p-4 
                hover:border-gray-300 hover:shadow-sm 
                transition-all cursor-pointer">
  {children}
</div>
```

### MetricCard
```tsx
// Estructura obligatoria
<div className={`rounded-xl border p-4 ${variantClasses}`}>
  <p className="text-xs font-medium uppercase tracking-wide opacity-70">
    {label}
  </p>
  <p className="text-2xl font-bold mt-1">
    {formatARS(value)}
  </p>
  {subtitle && (
    <p className="text-xs mt-1 opacity-60">{subtitle}</p>
  )}
</div>
```

### Badge / Tag
```tsx
// Tamaño estándar
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                 bg-blue-100 text-blue-700">
  {label}
</span>
```

### Botón primario
```tsx
<button className="w-full lg:w-auto px-6 py-3 rounded-lg
                   bg-blue-600 text-white font-medium text-sm
                   hover:bg-blue-700 active:scale-95
                   transition-all disabled:opacity-50 disabled:cursor-not-allowed">
  {label}
</button>
```

### Botón secundario
```tsx
<button className="w-full lg:w-auto px-6 py-3 rounded-lg
                   bg-white text-gray-700 font-medium text-sm
                   border border-gray-200
                   hover:bg-gray-50 active:scale-95
                   transition-all">
  {label}
</button>
```

### Input
```tsx
<input className="w-full px-4 py-3 rounded-lg
                  border border-gray-200 bg-white
                  text-gray-900 text-base
                  placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-colors" />
```

**Regla crítica para mobile:** Todos los inputs y botones deben tener mínimo `py-3` (48px de altura) para ser usables con el dedo. Nunca menos.

---

## 5. Layout — AppShell

### Mobile (default)
```
┌─────────────────────┐
│ TopBar (sticky)     │  h-14, bg-white, border-b
├─────────────────────┤
│                     │
│   Contenido         │  px-4 py-4, pb-24
│   (página)          │  (pb-24 para no tapar con BottomNav)
│                     │
├─────────────────────┤
│ BottomNav (fixed)   │  h-16, bg-white, border-t
└─────────────────────┘
```

### Desktop (lg:)
```
┌──────────┬──────────────────────┐
│          │                      │
│ Sidebar  │   Contenido          │
│ (fixed)  │   (página)           │
│ w-60     │   px-8 py-8          │
│          │                      │
└──────────┴──────────────────────┘
```

### BottomNav — ítem activo vs inactivo
```tsx
// Activo
<span className="text-blue-600 font-medium">

// Inactivo
<span className="text-gray-400">
```

---

## 6. Gráficos (Recharts)

### Paleta de colores en gráficos
- Usar siempre el campo `color` que viene de la API para las tarjetas
- Para líneas de proyección:
  ```
  Total Mes:  #EF4444  (rojo)
  Cuotas:     #8B5CF6  (violeta)
  Ingreso:    #10B981  (verde — línea de referencia punteada)
  ```

### Formato de ejes
```tsx
// Eje Y — siempre formato compacto
tickFormatter={(v) => formatARSCompact(v)}

// Eje X — siempre meses en español
const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
tickFormatter={(mes) => MESES[mes]}

// Tooltip — siempre formato completo ARS
formatter={(value: number) => [formatARS(value), '']}
```

### Tamaño responsive
```tsx
// Siempre usar ResponsiveContainer
<ResponsiveContainer width="100%" height={280}>
  ...
</ResponsiveContainer>

// En mobile, reducir altura
<ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
```

---

## 7. Estados de UI

### Loading
```tsx
// Skeleton — nunca spinners en toda la página
<div className="animate-pulse">
  <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
  <div className="h-32 bg-gray-200 rounded" />
</div>
```

### Error
```tsx
<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
  {mensaje}
</div>
```

### Empty state
```tsx
<div className="text-center py-12 text-gray-400">
  <p className="text-4xl mb-3">📭</p>
  <p className="font-medium text-gray-500">Sin movimientos este mes</p>
  <p className="text-sm mt-1">Agregá tu primer gasto con el botón +</p>
</div>
```

---

## 8. Checklist de diseño antes de cada commit

- [ ] Componente funciona a 375px sin scroll horizontal
- [ ] Todos los touch targets tienen mínimo 44px de altura
- [ ] Inputs tienen `py-3` como mínimo
- [ ] Números de dinero usan `formatARS()` o `formatARSCompact()`
- [ ] Colores de tarjeta vienen de la API, no hardcodeados en el frontend
- [ ] Estados de loading y error implementados en cada vista
- [ ] Empty state implementado si la lista puede estar vacía
- [ ] Transiciones con `transition-all` en elementos interactivos