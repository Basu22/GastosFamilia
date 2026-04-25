# Manual de Buenas Prácticas Frontend (HTML5 y CSS3)
> **⚠️ Documento Obligatorio**: Todas las vistas de React generadas en este proyecto deben adherirse estrictamente a estas normativas. Queda prohibido el "div soup" (abuso de etiquetas `<div>`).

---

## 1. HTML5 Semántico (Regla Anti-Divs)

Para mejorar la accesibilidad, el SEO y la mantenibilidad del código, debemos utilizar las etiquetas semánticas provistas por HTML5 en lugar de genéricas.

### Mapeo de Etiquetas Permitidas:

| En lugar de usar... | Se debe usar... | Propósito |
|---|---|---|
| `<div className="app-container">` | `<main>` | Contenedor principal y único de la página. |
| `<div className="navbar">` | `<nav>` | Menú de navegación (Sidebar, BottomNav). |
| `<div className="header">` | `<header>` | Cabecera de la página (títulos, migas de pan). |
| `<div className="footer">` | `<footer>` | Pie de página. |
| `<div className="seccion">` | `<section>` | Agrupación temática de contenido (ej: sección de gráficos). |
| `<div className="tarjeta">` | `<article>` | Componente independiente o tarjeta de información (MetricCard). |
| `<div className="sidebar">` | `<aside>` | Contenido lateral o menús colapsables. |
| `<span className="title">` | `<h1>` a `<h6>` | Jerarquía de títulos correcta. Solo un `<h1>` por página. |

**Ejemplo de refactorización:**

❌ *Incorrecto (Abuso de Divs):*
```tsx
<div id="dashboard-view" className="flex flex-col">
  <div className="top-bar">Dashboard</div>
  <div className="content">
    <div className="card">Métrica</div>
  </div>
</div>
```

✅ *Correcto (Semántico):*
```tsx
<main id="dashboard-main" className="flex flex-col">
  <header id="dashboard-header" className="top-bar">
    <h1 id="dashboard-title">Dashboard</h1>
  </header>
  <section id="dashboard-metrics" className="content">
    <article id="metric-card-ingresos" className="card">Métrica</article>
  </section>
</main>
```

---

## 2. Identificadores Únicos (IDs) Obligatorios

Para facilitar la automatización de pruebas (Testing), la depuración en herramientas de desarrollo y la selección de elementos por herramientas externas, **todos los elementos interactivos o contenedores principales deben llevar un atributo `id`**.

### Reglas de Nomenclatura para IDs:
1.  **Formato**: `kebab-case` (letras minúsculas separadas por guiones).
2.  **Estructura**: `[pagina]-[componente]-[accion/nombre]`
3.  **Unicidad**: Garantizar que el ID no se repita en la vista.

### Casos donde el ID es MANDATORIO:

*   **Páginas / Vistas**: El contenedor raíz de la página (ej: `<main id="page-dashboard">`).
*   **Formularios e Inputs**: (ej: `<form id="form-nuevo-gasto">`, `<input id="input-monto" />`).
*   **Botones y Links**: (ej: `<button id="btn-guardar-gasto">`, `<a id="nav-link-tarjetas">`).
*   **Secciones o Bloques de Datos**: (ej: `<section id="seccion-proximos-vencimientos">`, `<ul id="lista-tarjetas">`).

---

## 3. CSS3, Tailwind CSS y Mobile First
> **Regla de Oro**: Siempre diseñamos para una pantalla de **375px** primero. Luego escalamos hacia arriba para tablets y desktop.

El proyecto utiliza Tailwind CSS como motor de estilos. No se deben usar hojas de estilo externas (`.css`) salvo para configuraciones globales.

### 3.1. Estrategia Mobile First (Samsung A56 / iPhone / Pixel)
Para garantizar que la aplicación se vea perfecta en dispositivos modernos como el Samsung A56, debemos seguir estos lineamientos:

1.  **Prioridad de Clases**: Las clases sin prefijo de Tailwind se aplican a **móvil**. Solo usamos prefijos (`sm:`, `md:`, `lg:`) para añadir o cambiar estilos en pantallas más grandes.
    *   ❌ *Incorrecto (Desktop-first)*: `w-full lg:w-1/2` (si el default es full, no hace falta).
    *   ✅ *Correcto*: `p-4 lg:p-8` (menos padding en móvil, más en desktop).
2.  **Touch Targets (Zonas de toque)**: En móviles como el Samsung A56, el dedo es menos preciso que el mouse.
    *   Todos los botones y elementos clickeables deben tener una **altura mínima de 44px** (`py-3` o superior).
    *   Los inputs de formularios deben ser amplios (`py-3`) para facilitar el foco al tocar.
3.  **Contenedores Responsivos**:
    *   Padding lateral de página en móvil: `px-4`.
    *   Padding lateral de página en desktop (`lg:`): `px-8`.
    *   Evitar anchos fijos (`w-[400px]`). Usar siempre porcentajes o `w-full max-w-X`.
4.  **Tipografía Adaptable**:
    *   Títulos en móvil: `text-xl` o `text-2xl`.
    *   Títulos en desktop: `lg:text-3xl`.
    *   Cuerpo de texto: Siempre `text-base` (16px) como mínimo para evitar que el navegador haga zoom automático en los inputs de iOS/Android.

---

## 4. Composición y Componentes
1.  **No usar estilos en línea**: Prohibido usar `style={{ color: 'red' }}` a menos que el valor sea dinámico desde una variable de JavaScript (ej: el color de la tarjeta que viene de la BD).
2.  **Abstracción**: Si un patrón de Tailwind se repite más de 3 veces (ej: el diseño de un botón), debe abstraerse en un componente de React (ej: `<Button>`).
3.  **Estados de UI**: Todos los componentes interactivos deben tener definidos sus estados `hover:`, `active:` (para feedback táctil) y `disabled:`.

---

## 5. Checklist para Pull Requests / Revisiones de Código

Antes de dar por finalizada la creación de una vista o componente, se debe verificar:

- [ ] ¿El contenedor principal es un `<main>`, `<section>` o `<article>` en vez de un `<div>`?
- [ ] ¿Todos los botones tienen un atributo `id` descriptivo?
- [ ] ¿Todos los inputs tienen un `id` asociado a un `<label>` mediante `htmlFor`?
- [ ] ¿Hay un solo `<h1>` por página?
- [ ] ¿Los estilos siguen la norma Mobile-First de Tailwind?
