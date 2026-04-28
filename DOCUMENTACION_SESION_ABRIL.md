# Documentación de Mejoras — Abril 2026

Este documento detalla las funcionalidades implementadas durante la expansión del sistema de Gastos Familiares.

---

## 1. Simulador de Cuotas (Plan 01)
Herramienta para analizar el impacto de un nuevo gasto en cuotas sobre la salud financiera futura.

- **Frontend**: Nueva ruta `/simulador`. Interfaz con sliders para monto y cuotas. Desglose mensual colapsable.
- **Backend**: Micro-router `/api/simulador`.
    - **Lógica**: Realiza una proyección de 12 meses sumando el gasto hipotético a los gastos reales y comparándolo contra los ingresos.
    - **Cálculo de Ahorro**: `Ahorro Simulado = Ahorro Real - Cuota del Mes`.

## 2. Proyección Detallada por Tarjeta (Plan 02)
Se mejoró la vista de proyección de 12 meses para dar visibilidad sobre los consumos de crédito.

- **Backend**: El servicio `proyeccion.py` ahora pre-calcula y agrupa movimientos por tarjeta para cada mes.
- **Frontend**: En `/proyeccion`, cada fila de mes es expandible y muestra una columna de **Cuotas de Tarjeta** con:
    - Pill de color según la tarjeta (configurado en `rule-design.md`).
    - Descripción del movimiento y progreso de cuotas (ej: `2/6`).
    - Subtotales por tarjeta.

## 3. Dashboard de Alta Densidad (Plan 03 & 03.1)
Rediseño total de la página principal para máxima eficiencia.

### Layout Desktop
- **Estructura**: 2 columnas (Izquierda: Movimientos | Derecha: Gráficos).
- **Grupos Colapsables**: Movimientos organizados en:
    1. **Ingresos** (Pills verdes).
    2. **Cuotas de Tarjeta** (Pills naranjas + Resumen por tarjeta).
    3. **Gastos Fijos** (Pills azules).
    4. **Gastos Variados** (Pills grises).

### Interactividad y Edición
- **Filtro por Tarjeta**: Al hacer clic en los totales de tarjeta, se filtra la lista de movimientos automáticamente.
- **Alta Rápida Inline**: Botón `+` en cada sección que abre un formulario de creación directamente en la tabla (usa el componente `InlineCreateForm`).
- **Edición Inline**: Botón de lápiz que permite modificar o eliminar cualquier registro sin navegar a otra página.
- **Navegación Avanzada de Fechas**: 
    - Botón **HOY** para retorno instantáneo al mes actual.
    - **Selector de Meses** (Month Picker) tipo dropdown con grilla y cambio de año integrado.

### Alertas de Estrategia de Deuda (NUEVO)
- **Sección: Cuotas próximas a vencer**:
    - **Estructura**: Grilla de 2 columnas invertidas cronológicamente (Quedan 2 | Última Cuota).
    - **Totales**: Cálculo automático de suma de cuotas por cada grupo para prever liberación de fondos.
    - **Visualización**: Se eliminó el truncado de texto para permitir la lectura completa de las descripciones.

### Visualización de Datos
- **BarChart**: Incluye etiquetas con montos compactos (`$45k`) dentro de las barras.
- **LineChart**: Incluye etiquetas de valor sobre cada punto de tendencia de los próximos 6 meses.
- **Texto Completo**: Se aplicó una política de "Cero Truncamiento" en descripciones para mejorar la claridad operativa.

---

## Notas Técnicas para el Desarrollador

### Componentes Nuevos
- `InlineCreateForm.tsx`: Formulario optimizado para altas rápidas desde el Dashboard.
- `GrupoDesktop`: Sub-componente en `Dashboard.tsx` que maneja la lógica de colapsables, totales y creación inline.

### Integridad
- Se ha mantenido el chequeo de tipos estricto. Cualquier cambio debe validar con `bash check_integrity.sh`.
- Todos los montos usan la utilidad `formatARS()` para consistencia visual.
- El Dashboard soporta un modo responsive que oculta los gráficos en móviles pequeños para priorizar la lista de movimientos.
