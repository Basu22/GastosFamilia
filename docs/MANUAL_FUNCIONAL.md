# Manual Funcional — Gastos Familiares

> **URL de Acceso (Producción):** `http://192.168.1.185:8080` (Acceso interno/VPN)  
> **⚠️ Documento Vivo**: Este manual DEBE actualizarse cada vez que se agrega, modifica o elimina una funcionalidad del sistema.  
> Última actualización: Abril 2026

---

## 1. Propósito del Sistema

**Gastos Familiares** es una herramienta web de gestión financiera personal, diseñada para que una familia pueda:

- Visualizar en tiempo real cuánto se gasta en **cuotas de tarjetas de crédito** cada mes.
- Sumar y proyectar los **gastos fijos/variables** (servicios, expensas, supermercado).
- Registrar los **ingresos** mensuales y calcular el **ahorro neto proyectado**.
- Detectar qué cuotas están **a punto de vencer** para anticipar el alivio financiero.
- Ver la **proyección de gastos para los próximos 6 meses** y planificar el presupuesto familiar.

---

## 2. Usuarios del Sistema

| Perfil | Username | Rol | Descripción |
|---|---|---|---|
| Administrador | `baso` | Admin | Puede ver y gestionar todos los datos. |
| Familiar | `juli` | Usuario | Puede consultar el dashboard y sus gastos. |

---

## 3. Estructura de Navegación

El sistema tiene una barra de navegación lateral en **desktop** y una barra inferior en **móvil** con las siguientes secciones:

```
/dashboard     → Dashboard principal (pantalla de inicio)
/gastos        → Gastos mensuales fijos y variables (en desarrollo)
/nuevo         → Formulario de nuevo gasto (en desarrollo)
/tarjetas      → Listado y gestión de tarjetas (en desarrollo)
/login         → Pantalla de inicio de sesión
```

---

## 4. Pantallas y Comportamiento Esperado

### 4.1 Login (`/login`)

**¿Qué hace?**  
El usuario ingresa su nombre de usuario y contraseña. Al presionar "Ingresar", el sistema lo redirige al Dashboard.

**Estado actual (Abril 2026):**  
La autenticación está simulada (mock). Cualquier usuario/contraseña permite entrar. Pendiente de conectar al endpoint real `/auth/login`.

**Comportamiento esperado:**
- El campo de usuario debe aceptar `baso` o `juli`.
- Si las credenciales son incorrectas, debe mostrar un mensaje de error en rojo.
- El botón "Ingresar" debe mostrar un spinner de carga mientras procesa.

---

### 4.2 Dashboard (`/dashboard`)

Es la pantalla principal. Muestra el **resumen financiero del mes actual**.

| Card | ¿Qué muestra? | Color esperado | Comportamiento |
|---|---|---|---|
| **Ingresos** | Suma de todos los sueldos/bonos cargados para este mes. | Verde | Clic para filtrar solo ingresos. |
| **Cuotas** | Total mensual de todas las cuotas de tarjeta activas. | Amarillo | Clic para filtrar solo cuotas. |
| **Gastos Fijos/Var** | Suma de servicios, expensas y gastos únicos del mes. | Amarillo | Clic para filtrar solo gastos fijos. |
| **Ahorro Neto** | `Ingresos - (Cuotas + Gastos)`. | Verde / Rojo | Clic para limpiar filtros y ver todo. |

---

#### Sección B — Navegación Temporal y Selector de Meses
Ubicada en la cabecera del Dashboard, permite navegar entre meses:
- **Flechas `<-` y `->`**: Permiten retroceder o avanzar entre los meses que tienen registros.
- **Selector de Mes (Título)**: Al hacer clic en el nombre del mes, se despliega una lista de todos los meses y años que contienen datos en el sistema para un salto rápido.

**Regla de negocio clave:**  
Un gasto fijo (ej: expensas) aparece en **todos los meses** desde el mes en que fue creado en adelante. Un ingreso fijo (ej: sueldo) funciona de la misma manera.

---

#### Sección B — Cuotas a Finalizar

Aparece **únicamente** si hay cuotas de tarjeta con 1 o 2 meses restantes.

Muestra una lista de compras en cuotas que están por "liberarse" del presupuesto mensual.

Cada ítem muestra:
- El color de la tarjeta (a la izquierda).
- El nombre de la compra.
- El nombre de la tarjeta.
- El monto de la cuota.
- Un badge: **"ÚLTIMA"** (rojo, 1 mes restante) o **"2 RESTAN"** (azul, 2 meses restantes).

**Regla de negocio clave:**  
Solo se muestran movimientos que son **compras en cuotas** (`cuotas > 1`) con **tarjeta asignada**. No aparecen gastos fijos ni servicios.

---

#### Sección C — Cuotas por Tarjeta (Gráfico de Barras)

Muestra cuánto aporta cada tarjeta al total de cuotas del mes. Las barras usan el **color oficial de cada tarjeta** (definido en la tabla de Tarjetas, no en el frontend).

Las tarjetas con monto $0 en el mes **no aparecen** en el gráfico.

---

#### Sección E — Detalle de Movimientos y Totalizador

Muestra el desglose de todo lo que compone el resumen del mes. 
- **Filtrado dinámico**: Si se activó un filtro desde las MetricCards, la tabla solo muestra esos ítems y el encabezado lo indica.
- **Totalizador (Pie de Tabla)**: Una fila final que suma automáticamente los montos de lo que se está viendo en pantalla (si hay filtro, suma solo lo filtrado).
- **Acceso a Edición**: El icono del lápiz (`Edit3`) lleva directamente a la pantalla de edición correspondiente (`/nuevo` para cuotas, `/gastos` para el resto).

- **Línea violeta**: Total de cuotas mes a mes.
- **Línea roja**: Gasto total (cuotas + gastos fijos/var).
- **Línea verde punteada**: Nivel de ingreso mensual (referencia).

**Regla de negocio clave:**  
La proyección de ingresos usa el mismo mecanismo que el mes actual: si hay ingresos fijos cargados, los proyecta. Si no, muestra $0 para meses futuros.

---

#### Estado de Carga (Loading)

Mientras el Dashboard carga los datos del servidor, se muestra un **skeleton animado** (bloques grises parpadeantes) que simulan la estructura de la pantalla. No se usa un spinner genérico.

#### Estado de Error

Si el servidor no responde o devuelve un error, se muestra un recuadro rojo con el mensaje:  
> "Error cargando el dashboard. Por favor, intente nuevamente."

---

### 4.3 Nuevo Gasto (`/nuevo`)

**¿Qué hace?**  
Permite cargar manualmente una compra en cuotas al sistema.

**Comportamiento esperado:**
- Formulario Mobile First, validado en tiempo real.
- El usuario selecciona la Tarjeta (desplegable), ingresa Descripción, Monto Total, Primera Cuota (mes y año) y selecciona la cantidad de Cuotas (1, 3, 6, 12, 18, 24).
- **Preview Dinámico**: Al llenar el monto y las cuotas, aparece un recuadro informativo indicando el monto exacto por mes y la fecha de la última cuota, para que el usuario verifique antes de guardar.
- Al guardar, el sistema recarga el Dashboard para reflejar el impacto.

### 4.4 Tarjetas (`/tarjetas`)

**¿Qué hace?**  
Permite listar visualmente las tarjetas activas y cargar nuevas.

**Comportamiento esperado:**
- Muestra una grilla con tarjetas de crédito como bloques visuales (con sus respectivos colores, dueño y banco).
- **Edición**: Al hacer clic en una tarjeta existente, el formulario se autocompleta con sus datos. El título cambia a "Editando Tarjeta" y el botón a verde ("Actualizar Tarjeta").
- Debajo, un formulario permite agregar nuevas tarjetas o editar la seleccionada.
- El usuario debe especificar un "Color" que servirá luego para la generación de gráficos en el Dashboard.

### 4.5 Gastos & Ingresos (`/gastos`)

**¿Qué hace?**  
Permite gestionar (ABM completo) todos los ingresos (sueldos, bonos) y egresos mensuales (expensas, servicios, súper).

**Comportamiento esperado:**
- **Pestañas (Tabs)**: La pantalla está dividida en dos vistas alternables: "Egresos Mensuales" (rojo) e "Ingresos" (verde).
- El listado inferior muestra tarjetas con el detalle de cada movimiento, indicando el mes desde el cual aplican y un badge especial de **"FIJO"** si el ítem es recurrente.
- **Edición rápida**: Al tocar cualquier tarjeta del listado, los datos suben al formulario y se habilita la edición o eliminación del registro.
- Todo cambio impacta de inmediato en los cálculos y gráficos del Dashboard.

---

## 5. Flujos de Usuario Principales

### Flujo 1: Ver el resumen del mes actual

1. El usuario abre la app en el navegador.
2. El sistema lo redirige automáticamente al Dashboard (`/dashboard`).
3. Aparece el skeleton de carga mientras trae los datos del mes actual.
4. Se muestran las 4 métricas, los vencimientos cercanos y los gráficos.

### Flujo 2: Cargar una nueva compra en cuotas

1. El usuario navega a la sección **Nuevo Gasto** desde la barra inferior (o menú lateral).
2. Completa los datos requeridos: Tarjeta, Descripción, Monto Total, Fecha de Primera Cuota.
3. Selecciona la cantidad de cuotas usando los botones rápidos.
4. Revisa el cuadro de "Preview" que le anticipa cuánto pagará por mes y cuándo termina.
5. Presiona "Guardar Gasto".
6. El sistema guarda la información y redirige al Dashboard, donde las métricas (Cuotas, Ahorro Neto) y los gráficos se actualizan automáticamente.

---

## 6. Reglas Globales del Negocio

| # | Regla | Impacto |
|---|---|---|
| R1 | Una cuota está activa en un mes si ese mes está dentro del rango `[fecha_primera_cuota, fecha_ultima_cuota]` | Cálculo de Cuotas del Dashboard |
| R2 | Los gastos fijos se suman en todos los meses desde su mes de creación en adelante | Cálculo de Gastos y Proyección |
| R3 | Los ingresos fijos se suman en todos los meses desde su mes de creación en adelante | Cálculo de Ingresos y Proyección |
| R4 | Solo aparecen en "Cuotas a Finalizar" movimientos de tarjeta con más de 1 cuota total | Sección de Vencimientos |
| R5 | Los colores de las tarjetas son inmutables y vienen de la base de datos | Gráficos y Tarjetas |
| R6 | Los pagos en Efectivo/Transferencia no requieren tarjeta asignada (quedan nulos) | Formulario de Gastos |
| R7 | **Formato de Moneda**: Todos los importes deben mostrarse e ingresarse con formato local (puntos para miles, comas para decimales) | UI Global |
| R8 | **Tema (Oscuro/Claro)**: El usuario puede alternar la apariencia del sistema tocando el icono del Sol/Luna. Esta preferencia se recuerda en el dispositivo. | AppShell / UI Global |
| R9 | **Proyección Override**: Para un mes con override, se usa el monto del override. Si no hay override, se usa el monto base del registro (si aplica por `es_fijo` o mes exacto). | Proyección Financiera |
| R10 | **Alcance de Proyección**: La proyección siempre abarca los próximos 12 meses desde el mes actual (inclusive). No se limita al año calendario. | Proyección Financiera |

---

## 7. Tarjetas del Sistema

| Nombre | Usuario | Banco | Color |
|---|---|---|---|
| BASO VISA | baso | Santander | `#3B82F6` (Azul) |
| JULI VISA | juli | Santander | `#8B5CF6` (Violeta) |
| JULI MASTER | juli | ICBC | `#EF4444` (Rojo) |
| JULI CENCOSUD | juli | Cencosud | `#10B981` (Verde) |
| MONI GALICIA | baso | Galicia | `#F59E0B` (Ámbar) |
| BASO MASTER | baso | Santander | `#64748B` (Slate) |
| JULI BBVA | juli | BBVA | `#06B6D4` (Cyan) |
| BASO ICBC | baso | ICBC | `#6366F1` (Indigo) |
| SELE SANTANDER | baso | Santander | `#EC4899` (Rosa) |

---

## 8. Historial de Cambios Funcionales

| Fecha | Cambio |
|---|---|
| Abr 2026 | Dashboard inicial: 4 métricas + gráfico de barras y líneas |
| Abr 2026 | Sección "Cuotas a Finalizar" con filtro de tarjeta y más de 1 cuota |
| Abr 2026 | Implementación de ingresos y gastos fijos con ciclo de vida (no infinito hacia atrás) |
| Abr 2026 | Proyección a 6 meses con ingreso dinámico por mes |
| Abr 2026 | Deprecación de Google Sheets. Implementación de carga manual vía formulario (`/nuevo`) con preview dinámico. |
| Abr 2026 | Soporte para Efectivo / Transferencia en `/nuevo` (sin requerir tarjeta). |
| Abr 2026 | Pantalla visual de Gestión de Tarjetas (`/tarjetas`) con alta, listado, edición y baja. |
| Abr 2026 | Pantalla unificada de ABM de Egresos Mensuales e Ingresos (`/gastos`) mediante pestañas interactivas. |
| Abr 2026 | Actualización de estándares de usabilidad móvil (Mobile First) para optimización en dispositivos de alta densidad (Samsung A56). |
| Abr 2026 | **Dashboard Interactivo**: Navegación por meses con datos, filtros rápidos vía MetricCards y totalizador automático en tabla de movimientos. |
