# Manual de Buenas Prácticas — Gastos Familiares

Este manual define los estándares de diseño, codificación y usabilidad que deben seguirse en el proyecto. Es de cumplimiento obligatorio para garantizar la consistencia y calidad del software.

---

## 1. Filosofía de Diseño: Mobile First
> **Regla de Oro**: Siempre diseñamos para una pantalla de **375px** (Samsung A56 / iPhone) primero. Luego escalamos hacia arriba para tablets y desktop.

### 1.1. Estrategia Tailwind CSS
- **Clases Base**: Se aplican a móvil. No usar prefijos para el layout de celular.
- **Prefijos Responsivos**: Solo usamos `sm:`, `md:`, `lg:`, `xl:` para adaptar el diseño a pantallas más grandes.
- **Contenedores**: 
  - Móvil: `px-4 py-4`.
  - Desktop (`lg:`): `px-8 py-8`.
- **Touch Targets**: Todos los botones e inputs deben tener una **altura mínima de 44px** (`py-3` o `h-11/12`) para facilitar el uso táctil.

### 1.2. Tipografía y Espaciado
- **Fuentes**: Inter (sans-serif del sistema).
- **Tamaños**: 
  - Mínimo 16px (`text-base`) para cuerpo de texto para evitar zoom automático en inputs.
  - Títulos: `text-xl` a `text-2xl` en móvil, hasta `lg:text-3xl` en desktop.
- **Pesos**: Usar `font-black` para énfasis "Premium" en títulos y números importantes.

---

## 2. HTML5 Semántico (Regla Anti-Divs)
Queda prohibido el abuso de etiquetas `<div>`. Se deben usar etiquetas semánticas para mejorar el SEO y la accesibilidad.

| En lugar de usar... | Se debe usar... | Propósito |
|---|---|---|
| `<div className="app">` | `<main>` | Contenedor principal de la página. |
| `<div className="nav">` | `<nav>` | Menú de navegación (Sidebar, BottomNav). |
| `<div className="header">` | `<header>` | Cabecera de sección o página. |
| `<div className="seccion">` | `<section>` | Agrupación temática. |
| `<div className="card">` | `<article>` | Componente independiente o tarjeta de información. |
| `<div className="footer">` | `<footer>` | Pie de página. |

---

## 3. Identificadores Únicos (IDs) Obligatorios
Para facilitar pruebas automatizadas y depuración, todos los elementos interactivos o contenedores principales deben llevar un `id`.
- **Formato**: `kebab-case`.
- **Estructura**: `[pagina]-[componente]-[accion/nombre]` (ej: `dashboard-btn-guardar`).

---

## 4. Convenciones de Código (Frontend)
- **TypeScript Estricto**: Prohibido el uso de `any`. Definir siempre interfaces para props y respuestas de API.
- **React Query**: Obligatorio para toda comunicación con el backend. No usar `useEffect` para fetch de datos.
- **Componentización**: Si un patrón se repite > 2 veces, extraerlo a `components/ui/`.
- **Lógica en Componentes**: Máximo 200 líneas por archivo. Si es más grande, partir en sub-componentes.

---

## 5. Convenciones de Código (Backend)
- **Nomenclatura**:
  - Funciones: `snake_case` con verbo (ej: `get_movimientos`).
  - Modelos: `PascalCase` (ej: `Movimiento`).
  - Variables de dominio: Español (ej: `monto_cuota`).
  - Variables técnicas: Inglés (ej: `session`, `request`).
- **Tipado**: Todas las funciones deben tener tipado de parámetros y retorno explícito.
- **Errores**: No retornar 200 con mensaje de error. Usar `HTTPException` con códigos de estado correctos (404, 400, etc.) y mensajes en español.

---

## 6. Git y Gestión de Cambios
- **Commits**: Seguir el estándar de *Conventional Commits* en español.
  - `feat`: Nueva funcionalidad.
  - `fix`: Corrección de bug.
  - `docs`: Cambios en documentación.
  - `style`: Cambios de diseño/CSS.
- **Un cambio = Un commit**: No mezclar refactorizaciones técnicas con cambios visuales.

---

## 7. Checklist de Calidad
Antes de finalizar una tarea, verificar:
- [ ] ¿Funciona a 375px sin scroll horizontal?
- [ ] ¿Los botones tienen altura mínima de 44px?
- [ ] ¿Se usaron etiquetas semánticas (`main`, `article`)?
- [ ] ¿Se incluyeron IDs únicos?
- [ ] ¿Se eliminaron los `console.log` y variables no usadas?
