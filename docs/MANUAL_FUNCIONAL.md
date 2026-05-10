# Manual Funcional — AURA Gastos Familiares
> Última actualización: Mayo 2026

Este documento describe el propósito, las funcionalidades y la evolución del sistema desde la perspectiva del usuario. Es la fuente de verdad para entender **qué hace** la app.

---

## 1. Propósito del Sistema

**AURA — Gastos Familiares** es una herramienta de gestión financiera diseñada para:

- Trackear gastos en cuotas de tarjetas de crédito y visualizar su impacto mensual real
- Registrar préstamos bancarios y seguir su evolución cuota por cuota
- Gestionar gastos fijos (servicios, suscripciones) con baja lógica cuando se cancelan
- Proyectar el flujo de caja y ahorro neto para los próximos 12 meses
- Automatizar la carga de gastos mediante la lectura de correos electrónicos (Gmail)

---

## 2. Pantallas Principales

### 2.1. Dashboard (`/dashboard`)

El centro de control de toda la finanza familiar. Permite navegar entre meses usando las flechas o el selector de calendario.

**Métricas Principales (4 cards en la parte superior):**
- 💚 **Ingresos**: Total de entradas del mes
- 🟡 **Cuotas Tarjeta**: Suma de cuotas activas de tarjetas de crédito
- 🔵 **Préstamos**: Suma de cuotas activas de préstamos bancarios ← NUEVO
- **Balance del Mes**: Ingresos − (Cuotas + Préstamos + Gastos Fijos) = lo que queda

**Listado de Movimientos (tabla interactiva):**
El listado está dividido en secciones expandibles:
1. **Ingresos** (sueldos, extras)
2. **Cuotas de Tarjeta** (compras en cuotas)
3. **Préstamos** (cuotas de préstamos bancarios) ← NUEVO
4. **Gastos Fijos** (servicios, suscripciones recurrentes)
5. **Gastos Variados** (gastos puntuales)

Cada fila permite edición inline sin cambiar de pantalla.

**Panel de Alertas:**
- Cuotas próximas a vencer (quedan 1 o 2 cuotas)
- Resumen por tarjeta con gráfico de barras

**Proyección 6 Meses:**
Gráfico de línea que muestra cómo evolucionará el egreso total (cuotas + préstamos + gastos) en los próximos 6 meses.

---

### 2.2. Movimientos (`/movimientos`)

Interfaz unificada para carga y edición de todos los tipos de movimientos, dividida en **4 pestañas**:

| Pestaña | Color | Para qué sirve |
|---------|-------|---------------|
| **Egresos** | 🔴 Rojo | Gastos puntuales o fijos (con o sin tarjeta) |
| **Tarjetas** | 🔵 Azul | Compras en cuotas (con preview del impacto mensual) |
| **Préstamos** | 🔵 Indigo | Préstamos bancarios (cuota calculada automáticamente) ← NUEVO |
| **Ingresos** | 💚 Verde | Sueldos y entradas de dinero |

**Cómo cargar un Préstamo:**
1. Ir a la pestaña "Préstamos"
2. Completar: Entidad/Banco, Descripción, Monto Total, Cuotas, Fecha primera cuota
3. El sistema calcula automáticamente el valor de la cuota mensual
4. El préstamo aparecerá solo en el Dashboard desde el mes indicado hasta completar las cuotas

---

### 2.3. Gestión de Tarjetas (`/tarjetas`)

Visualización y edición de plásticos activos: nombre, color identificativo, límite y estado.

> ⚠️ **Los colores de tarjeta son inmutables una vez asignados** para mantener consistencia en todos los gráficos históricos.

---

### 2.4. Proyección (`/proyeccion`)

Vista expandida de proyección a **12 meses** con detalle de:
- Ingresos proyectados
- Gastos mensuales (fijos y variables)
- Cuotas de tarjeta activas
- Cuotas de préstamos activos ← NUEVO
- Ahorro proyectado por mes
- Overrides manuales (puedo cambiar el valor proyectado de un mes sin alterar el registro base)

---

### 2.5. Configuración (`/configuracion`)

Gestión de:
- **Medios de Pago**: Tarjetas, efectivo, billeteras digitales
- **Categorías**: Clasificación de gastos con iconos Lucide
- **Importador Gmail**: Historial de sincronización y botón de importación manual

---

## 3. Reglas de Negocio Clave

### 3.1. Cuotas de Tarjeta
- Una cuota impacta en un mes si `fecha_primera_cuota ≤ mes_consulta ≤ fecha_ultima_cuota`
- El valor de la cuota se calcula: `monto_total / cantidad_cuotas`
- Los colores de cada tarjeta son fijos y se usan en todos los gráficos

### 3.2. Gastos Fijos (Baja Lógica)
- Un gasto fijo se proyecta automáticamente mes a mes desde su creación
- Al "dar de baja" un gasto: **no se borra**, se cierra en el mes anterior al actual
- El historial completo queda visible (para consultar meses pasados)
- Se puede **reactivar** si el servicio se restablece
- Los gastos dados de baja aparecen tachados en su último mes activo

### 3.3. Préstamos Bancarios (Nuevo — Mayo 2026)
- El usuario carga: entidad, descripción, monto total, cuotas y fecha de primera cuota
- El sistema calcula automáticamente: `cuota mensual` y `fecha última cuota`
- Los cálculos financieros complejos (tasa, amortización) son responsabilidad del banco
- El sistema solo trackea la cuota fija mensual
- El préstamo desaparece del Dashboard automáticamente al mes siguiente del último pago

### 3.4. Proyección
- Todos los elementos (gastos, cuotas, préstamos) se proyectan con la misma lógica de "mes absoluto"
- Los overrides permiten ajustar valores proyectados para un mes específico sin alterar el registro base

### 3.5. Formato de Montos
- Todos los montos se muestran en Pesos Argentinos: `$ 1.234.567`
- En gráficos, formato compacto: `$1.2M`, `$443k`

---

## 4. Hoja de Ruta (Roadmap)

### ✅ Fase 1: MVP (Completado — Abril 2026)
- Estructura base React + FastAPI
- Dashboard con métricas y gráficos básicos
- Importación inicial desde Excel

### ✅ Fase 2: Carga Manual y UI Premium (Completado — Abril/Mayo 2026)
- Rediseño completo Mobile First (Samsung A56 / iPhone)
- ABM unificado de movimientos y tarjetas
- Edición inline en Dashboard (sin cambio de pantalla)
- Gestión dinámica de categorías y medios de pago

### ✅ Fase 2.5: Historial y Baja Lógica (Completado — Mayo 2026)
- Baja lógica de Gastos Fijos: historial preservado, sin borrado de datos
- Reactivación de gastos dados de baja
- Visualización diferenciada de gastos inactivos

### ✅ Fase 2.6: Módulo de Préstamos (Completado — Mayo 2026)
- Registro y tracking de préstamos bancarios
- Cálculo automático de cuota y fecha de finalización
- Integración completa en Dashboard, Proyección y Listados

### 🔄 Fase 3: Automatización Inteligente (En curso)
- **Importador Gmail**: Lectura automática de facturas (Personal, Flow, Edesur) ← Implementado
- **Categorización IA**: Uso de Gemini para clasificar gastos automáticamente ← Implementado
- **WhatsApp Bot**: Carga de gastos por voz y texto desde WhatsApp ← En planificación

### 📋 Backlog
- Registro de compras compartido (lista de deseos familiar)
- Baja lógica de Préstamos (cancelación anticipada)
- Vista detallada de cuotas futuras por préstamo

---

## 5. Historial de Versiones

| Fecha | Cambio |
|-------|--------|
| Abril 2026 | Lanzamiento inicial y migración de Google Sheets a Web |
| Mayo 2026 (semana 1) | Rediseño total de UI Aura (dark mode, glassmorphism) |
| Mayo 2026 (semana 2) | Importador Gmail y Proyección 12 meses |
| Mayo 2026 (semana 3) | Baja lógica de Gastos Fijos con preservación de historial |
| Mayo 2026 (semana 3) | Módulo de Préstamos Bancarios completo |
