# Manual Técnico — AURA Gastos Familiares
> Última actualización: Mayo 2026

Este documento detalla la arquitectura, el modelo de datos y los procesos técnicos del sistema. Es la guía de referencia para mantenimiento y escalabilidad.

---

## ⛔ ZONA RESTRINGIDA — ARCHIVOS CON CANDADO

Los siguientes archivos **NO pueden ser modificados sin autorización explícita del Product Owner**:

| Archivo | Motivo |
|---------|--------|
| `backend/services/gemini_parser.py` | Usa modelo IA `gemini-2.5-flash` — cualquier cambio puede romper el parseo automático |
| `backend/services/gmail_importer.py` | Integración OAuth2 con Gmail — credenciales delicadas |
| `backend/services/cuotas.py` | Lógica validada de cálculo de cuotas — no tocar sin tests |

---

## 1. Arquitectura del Sistema

El sistema se despliega mediante **Docker Compose** en una Raspberry Pi y usa Nginx como proxy inverso.

```
Internet
   │
Cloudflare Tunnel
   │
Nginx Proxy (puerto 80/443)
   ├── /           → Frontend React (Nginx interno)
   └── /api/       → Backend FastAPI (puerto 8000)
              │
              SQLite (volumen ./data/gastos.db)
```

- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS. Servido por Nginx.
- **Backend**: FastAPI + SQLModel + SQLite. Puerto 8000 interno.
- **Deploy**: `git pull` en la RPI → `./deploy.sh` reconstruye imágenes Docker.
- **Dev Local**: `./start-dev-local.sh` levanta backend (uvicorn) y frontend (vite) en paralelo.

---

## 2. Modelo de Datos (SQLite)

### 2.1. Entidades Principales

#### `Movimiento` (tarjeta de crédito)
Representa una compra en cuotas con tarjeta de crédito.
```python
class Movimiento(SQLModel, table=True):
    id, descripcion, monto_total, monto_cuota
    cuotas: int                     # Cantidad de cuotas
    fecha_primera_cuota: date       # Mes desde el que impacta
    fecha_ultima_cuota: date        # Mes en el que termina (calculado)
    tarjeta_id: Optional[int]       # FK → Tarjeta
    notas: Optional[str]
```

#### `GastoMensual`
Gastos recurrentes o puntuales. Si `es_fijo=True`, se proyectan automáticamente cada mes.
```python
class GastoMensual(SQLModel, table=True):
    id, descripcion, monto, mes, anio
    es_fijo: bool                   # True = se repite cada mes
    mes_fin, anio_fin               # Fin del período (baja lógica o edición)
    activo: bool                    # False = dado de baja (pero historial preservado)
    fecha_baja: Optional[date]      # Fecha en que se dio de baja
    tarjeta_id: Optional[int]       # FK → Tarjeta (medio de pago)
```

#### `Ingreso`
Igual estructura que GastoMensual pero para entradas de dinero.
```python
class Ingreso(SQLModel, table=True):
    id, descripcion, monto, mes, anio
    es_fijo: bool
    mes_fin, anio_fin
    tarjeta_id: Optional[int]
```

#### `Prestamo` (Nuevo — Mayo 2026)
Cabecera de préstamos bancarios. El monto total es dinámico (suma de sus cuotas).
```python
class Prestamo(SQLModel, table=True):
    id, entidad, descripcion
    cuotas: int                     # Cantidad de cuotas
    fecha_primera_cuota: date       # Mes de inicio
    categoria: Optional[str]        # Para categorización de gastos
    notas: Optional[str]
```

#### `CuotaPrestamo` (Nuevo — Mayo 2026)
Detalle individual de cada mes de un préstamo.
```python
class CuotaPrestamo(SQLModel, table=True):
    id, prestamo_id
    numero_cuota: int               # Ej: 1, 2, 3...
    mes, anio: int                  # Período de impacto
    monto: float                    # Importe específico del mes
```

#### `Tarjeta`
Catálogo de tarjetas y medios de pago.
```python
class Tarjeta(SQLModel, table=True):
    id, nombre, color               # color: hex string, ej "#3B82F6"
    limite: Optional[float]
    activa: bool
```

#### `Categoria`
Catálogo de categorías de gasto con iconos Lucide.

#### `ProyeccionOverride`
Sobreescribe el valor proyectado de un ítem (ingreso o gasto) para un mes específico.
```python
class ProyeccionOverride(SQLModel, table=True):
    tipo: str                       # "ingreso" | "gasto_mensual"
    referencia_id: int              # FK al registro base
    mes, anio: int
    monto: float                    # Valor que sobreescribe al base
```

---

## 3. Lógica de Mes Absoluto

Toda comparación de períodos usa **mes absoluto** para evitar bugs de meses y años:

```python
mes_absoluto = anio * 12 + mes

# Un ítem es activo en un mes si:
inicio_val <= mes_consulta_val <= fin_val
# donde fin_val = 999999 si no tiene fecha de fin (= infinito)
```

Esta lógica aplica a: Movimientos (cuotas), GastosMensuales, Ingresos, **Préstamos**.

---

## 4. Baja Lógica de Gastos Fijos

Implementada en Mayo 2026. Permite "cerrar" un gasto fijo sin borrar el historial.

### Flujo:
1. Usuario hace clic en "Dar de baja" en el mes `M`
2. El frontend envía `PATCH /gastos-mensuales/{id}/baja?mes=M&anio=A`
3. El backend setea `mes_fin = M-1`, `anio_fin = ...`, `activo = False`
4. El gasto ya no aparece desde el mes `M` en adelante
5. El historial previo (hasta `M-1`) queda intacto

### Reactivación:
`PATCH /gastos-mensuales/{id}/reactivar` → limpia `mes_fin`, `activo = True`

### Visual en Dashboard:
- El gasto aparece **tachado y opaco** solo en su último mes activo
- Botón "Reactivar" disponible en ese mismo mes

---

## 5. Módulo de Préstamos (Nuevo — Mayo 2026)

### Cómo funciona:
1. El usuario carga un préstamo definiendo la cantidad de cuotas.
2. El sistema genera un formulario con N casilleros (uno por mes).
3. El usuario completa manualmente el importe real de cada mes.
4. El Dashboard y las Proyecciones consultan la tabla `CuotaPrestamo` para obtener el valor exacto de cada período.

### Integración en el Dashboard:
- Nueva **MetricCard** "Préstamos" (variante `info`, color indigo).
- Nueva sección "Préstamos" en el listado de movimientos.
- El monto total mostrado en el Dashboard es la sumatoria de las cuotas del mes consultado.

### Endpoints:
```
GET    /api/prestamos/        → Lista todos
POST   /api/prestamos/        → Crea (calcula cuota y fecha fin)
PUT    /api/prestamos/{id}    → Actualiza (recalcula)
DELETE /api/prestamos/{id}    → Elimina
```

---

## 6. Servicios Especiales

### 6.1. Proyección Financiera (`backend/services/proyeccion.py`)
Calcula el balance para los próximos **12 meses** combinando:
- Ingresos fijos y variables
- Gastos mensuales fijos y variables
- Cuotas de tarjeta activas
- **Cuotas de préstamos activos** (agregado Mayo 2026)
- Overrides manuales por mes

### 6.2. Cálculo de Cuotas (`backend/services/cuotas.py`)
🔒 **No tocar.** Calcula el total de cuotas activas de tarjetas para un mes dado.

### 6.3. Parser IA (`backend/services/gemini_parser.py`)
🔒 **CANDADO ABSOLUTO.** Usa Gemini 2.5 Flash para parsear/categorizar gastos. Solo el Product Owner puede autorizar cambios.

### 6.4. Importador Gmail (`backend/services/gmail_importer.py`)
🔒 **Solo con autorización.** Conecta via OAuth2 a Gmail, busca facturas de servicios (Personal, Flow, Edesur) y las importa automáticamente.

---

## 7. Estructura de Carpetas

```
backend/
├── models/           # Entidades SQLModel (una por archivo)
│   ├── movimiento.py
│   ├── gasto_mensual.py
│   ├── ingreso.py
│   ├── prestamo.py       # Cabecera de préstamos
│   ├── cuota_prestamo.py # Detalle de cuotas variables
│   ├── tarjeta.py
│   └── ...
├── routers/          # Endpoints FastAPI (un dominio por archivo)
│   ├── dashboard.py
│   ├── movimientos.py
│   ├── gastos_mensuales.py
│   ├── prestamos.py  ← NUEVO
│   └── ...
├── schemas/          # Pydantic schemas de request/response
├── services/         # Lógica de negocio pura (sin FastAPI)
│   ├── cuotas.py     ← 🔒
│   ├── proyeccion.py
│   └── gemini_parser.py  ← 🔒 CANDADO
└── database.py       # Init de tablas SQLite

frontend/
├── src/
│   ├── api/          # Funciones de fetch (una por dominio)
│   │   ├── prestamos.ts  ← NUEVO
│   │   └── ...
│   ├── components/
│   │   ├── ui/       # Componentes base (MetricCard, Badge, etc.)
│   │   ├── layout/   # AppShell, Sidebar, BottomNav, TopBar
│   │   └── dashboard/# InlineEditForm, InlineCreateForm, PanelArca
│   ├── pages/        # Una página por ruta
│   ├── stores/       # Zustand stores
│   └── utils/        # format.ts (formatARS, MESES_CORTO)
```

---

## 8. Variables de Entorno

### Backend (`.env`)
```
SECRET_KEY=
DATABASE_URL=sqlite:///./data/gastos.db
CLAUDE_API_KEY=        # Fase 3 — no se usa aún
GEMINI_API_KEY=        # Para gemini_parser.py — no modificar
ALLOWED_ORIGINS=
```

### Frontend (`.env`)
```
VITE_API_URL=          # URL base del backend
```

---

## 9. Infraestructura y Deploy

### Proceso de actualización en producción (RPI):
```bash
git pull
docker compose down
docker compose up -d --build
```

O directamente: `./deploy.sh`

### Dev Local:
```bash
./start-dev-local.sh   # Levanta backend + frontend en paralelo
```

---

## 10. Troubleshooting

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| 502 Bad Gateway | Caché DNS de Nginx | `docker restart proxy_unificado` |
| Error TypeScript en build | Variables no usadas o `any` sin tipo | Revisar errores con `npm run build` |
| Token Gmail expirado | OAuth vencido | Borrar `credentials/gmail_token.json` y re-autenticar |
| Dashboard 500 error | Columna faltante en SQLite | Verificar que `database.py` crea todas las tablas |
| Préstamo no aparece | `fecha_primera_cuota` fuera de rango del mes consultado | Verificar las fechas del registro |
