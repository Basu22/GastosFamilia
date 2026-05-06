# Manual Funcional — Gastos Familiares

Este documento describe el propósito, las funcionalidades y la evolución del sistema. Es la fuente de verdad para entender cómo funciona la aplicación desde la perspectiva del usuario.

---

## 1. Propósito del Sistema
**Gastos Familiares** es una herramienta de gestión financiera diseñada para:
- Trackear gastos en cuotas de tarjetas de crédito y visualizar su impacto mensual.
- Gestionar gastos fijos (servicios) e ingresos.
- Proyectar el flujo de caja y ahorro neto para los próximos 12 meses.
- Automatizar la carga de gastos mediante la lectura de correos electrónicos (Gmail).

---

## 2. Pantallas Principales

### 2.1. Dashboard (`/dashboard`)
El centro de control. Muestra:
- **Métricas Clave**: Ingresos, Cuotas, Gastos y Ahorro Proyectado.
- **Gráfico de Cuotas**: Desglose por tarjeta con colores identificativos.
- **Proyección**: Evolución financiera a 12 meses.
- **Detalle de Movimientos**: Tabla interactiva con edición inline (sin cambio de pantalla).

### 2.2. Movimientos (`/movimientos`)
Interfaz unificada para la carga manual de datos dividida en pestañas:
- **Egresos**: Gastos puntuales o fijos (pueden asociarse a una tarjeta).
- **Tarjetas**: Compras en cuotas (con preview dinámico del impacto).
- **Ingresos**: Carga de sueldos o entradas de dinero.

### 2.3. Gestión de Tarjetas (`/tarjetas`)
Visualización de plásticos activos, edición de límites, colores y estados.

### 2.4. Configuración (`/configuracion`)
Gestión dinámica de:
- **Medios de Pago**: Tarjetas, Efectivo, Billeteras.
- **Categorías**: Clasificación de gastos con iconos.
- **Importador Gmail**: Historial de sincronización y botón de importación manual.

---

## 3. Reglas de Negocio Claves
1. **Cuotas Activas**: Una cuota impacta en un mes si `mes_inicio <= mes_consulta <= mes_fin`.
2. **Gastos/Ingresos Fijos**: Se proyectan automáticamente desde su mes de creación hacia el futuro (no son retroactivos).
3. **Colores Inmutables**: Cada tarjeta tiene un color asignado en la DB que se respeta en todos los gráficos.
4. **Formato ARS**: Todos los montos se muestran en Pesos Argentinos (`$ 1.234.567`).

---

## 4. Hoja de Ruta (Roadmap)

### Fase 1: MVP (Completado)
- Estructura base React + FastAPI.
- Dashboard con métricas y gráficos básicos.
- Importación inicial desde Excel.

### Fase 2: Carga Manual y UI Premium (Completado)
- Rediseño Mobile First (Samsung A56).
- ABM unificado de movimientos y tarjetas.
- Edición inline y filtros rápidos en Dashboard.
- Gestión dinámica de categorías y medios de pago.

### Fase 3: Automatización Inteligente (En curso)
- **Importador Gmail**: Lectura automática de facturas (Personal, Flow, Edesur).
- **Categorización IA**: Uso de Claude para clasificar gastos automáticamente.
- **Alertas**: Notificaciones de vencimientos próximos.

---

## 5. Historial de Versiones (Resumen)
- **Abril 2026**: Lanzamiento inicial y migración de Google Sheets a Web.
- **Mayo 2026**: Rediseño total de UI, incorporación de Importador Gmail y optimización de visualización de cuotas.
