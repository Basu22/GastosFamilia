# Guía de Estilo de Marca: AURA (Zen Financiero)

Esta guía define la identidad visual de **AURA**, una aplicación de gestión de gastos familiares diseñada para transmitir calma, claridad y protección. El objetivo es alejarse de las interfaces contables frías y crear una experiencia "etérica" y humana.

---

## 1. Principios de Diseño
* **Fluidez:** Nada de esquinas afiladas. Todo debe ser curvo y suave.
* **Claridad:** Priorizar el espacio en blanco (o espacio negativo) para evitar el agobio visual.
* **Protección:** Uso de sutiles resplandores (glows) que "abrazan" el contenido.
* **Jerarquía Humana:** El dinero es una herramienta para la familia, no solo un número.

---

## 2. Paleta de Colores (Ethereal Dark Mode)

No utilizar negro puro (#000000). Usar una base de "Deep Slate" para reducir la fatiga visual.

### Colores Base
* **Background Principal:** `#0F1219` (Deep Slate - Un azul grisáceo muy oscuro y profundo).
* **Superficies (Cards/Modales):** `#1E293B` con opacidad del 60% al 80% (Glassmorphism).
* **Bordes:** `#334155` (Sutiles y de bajo contraste).

### Colores de Acento (Aura Palette)
* **Aura Mint (Ingresos/Prosperidad):** `#A7F3D0` - Un verde menta suave, no chillón.
* **Aura Coral (Gastos/Humanidad):** `#FCA5A5` - Reemplaza al rojo de "peligro" por un coral cálido.
* **Aura Lavender (Balance/Paz):** `#C7D2FE` - El color del equilibrio y la visión general.
* **Aura Gold (Avisos/Previsionado):** `#FDE68A` - Un dorado suave para estados de espera.

---

## 3. Tipografía

**Fuentes Recomendadas:** `Poppins`, `Quicksand` o `Geist Sans`.
* **Headers (h1, h2):** Semi-bold (600), con interletraje ligeramente reducido (-0.02em).
* **Números de Balance:** Deben ser el elemento más grande de la pantalla. Usar un peso Bold (700) pero con terminaciones redondeadas.
* **Body:** Medium (500) para asegurar legibilidad sobre fondos oscuros. Tamaño base: `16px`.

---

## 4. Componentes de Interfaz (UI)

### Cards (Contenedores)
* **Border-radius:** `24px` (Muy redondeado).
* **Efecto Glassmorphism:** `backdrop-filter: blur(12px)`.
* **Sombra Aura:** En lugar de sombras negras, usar `box-shadow` muy difuso con el color de acento correspondiente al contenido (ej. un glow verde muy suave de 40px de radio y 10% de opacidad para el card de ingresos).

### Botones
* **Acción Principal:** Fondo con degradado lineal suave (ej. de `#C7D2FE` a `#A7F3D0`). Texto en color oscuro para contraste.
* **Acción Secundaria:** Borde sutil con efecto de cristal y texto en color de acento.
* **Botón (+) Añadir:** Debe tener un resplandor circular sutil detrás de él para que parezca que flota sobre la interfaz.

### Gráficos y Visualización de Datos
* **Líneas:** Grosor de `3px`, siempre con suavizado (curvas Bezier), nunca líneas rectas angulares.
* **Barras:** Esquinas superiores totalmente redondeadas (`border-radius: 10px 10px 0 0`).
* **Degradados:** Las áreas debajo de las líneas de tendencia deben tener un degradado que se desvanece hacia el fondo (`opacity: 0.3` a `0`).

### Grids de Entrada (Cuotas Variables)
* **Estructura:** Grid responsivo de 2 columnas (móvil) a 4 columnas (desktop).
* **Inputs:** Usar labels internos o superiores muy pequeños (`text-[10px]`) para no saturar.
* **Scroll:** Contenedores con altura fija (`max-h-[400px]`) y scroll vertical interno. Evitar el scroll horizontal a toda costa.
* **Feedback:** Mostrar siempre un "Total Acumulado" destacado mientras se editan las celdas del grid.

---

## 5. Micro-interacciones
* **Hover:** Los elementos no deben "brillar" de golpe, sino que el resplandor (aura) debe expandirse suavemente (transición de `0.4s`).
* **Transiciones de Pantalla:** Usar desvanecimientos cruzados (cross-fade) suaves, evitando desplazamientos bruscos.

---

## 6. Ejemplo de Estructura de Dashboard (Instrucciones para IA)

1.  **Sidebar:** Ancho fijo, fondo `#0F1219`. Iconos minimalistas en línea fina (`2px`). El logo "Aura" arriba con un sutil resplandor lavanda detrás.
2.  **Top Stats:** 4 Cards horizontales con el mismo ancho. Cada uno con un borde superior de 4px del color de su categoría (Verde para ingresos, Coral para gastos).
3.  **Main Content:** Fondo con un degradado radial casi imperceptible de `#1E293B` en el centro hacia el fondo oscuro en los bordes.
4.  **Tablas/Listas:** No usar líneas divisorias blancas. Usar cambios sutiles de tono de fondo o espacios generosos. Los estados (ej. "Provisionado") deben ir en cápsulas (pills) con bordes muy redondeados y colores pastel.

---

## 7. Identidad Visual por Tipo de Dato (Actualizado — Mayo 2026)

### 7.1. MetricCards del Dashboard

| Card | Color | Variante | Qué representa |
|------|-------|----------|---------------|
| Ingresos | `#A7F3D0` Mint | `success` | Total entradas del mes |
| Cuotas Tarjeta | `#FDE68A` Gold | `warning` | Total cuotas tarjetas activas |
| Préstamos | `#818CF8` Indigo | `info` | Total cuotas préstamos activos |
| Balance del Mes | Mint/Coral | `success`/`danger` | Saldo disponible |

### 7.2. Color de Préstamos en Listados
El color `#10B981` (esmeralda) identifica filas de préstamos en el listado del Dashboard. Está **hardcodeado en el backend** — no viene de la configuración de tarjetas.

### 7.3. Colores de Tarjetas (Inmutables — vienen de la DB)
```
BASO VISA: #3B82F6 | JULI VISA: #8B5CF6 | JULI MASTER: #EF4444
JULI CENCOSUD: #10B981 | MONI GALICIA: #F59E0B | BASO MASTER: #64748B
JULI BBVA: #06B6D4 | BASO ICBC: #6366F1 | SELE SANTANDER: #EC4899
```
> ⚠️ El frontend NUNCA hardcodea estos colores — siempre usa el campo `color` de la API.

---
*Última actualización: Mayo 2026*
