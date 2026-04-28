# Manual Técnico — Gastos Familiares
> **⚠️ Documento Vivo**: Este manual DEBE actualizarse cada vez que se modifica el código, la base de datos, la lógica de negocio, o se agrega una dependencia.  
> Última actualización: Abril 2026

---

## 1. Stack Tecnológico

### Backend
| Tecnología | Versión | Rol |
|---|---|---|
| Python | 3.11+ | Lenguaje de backend |
| FastAPI | 0.111.0 | Framework HTTP y API REST |
| Uvicorn | 0.29.0 | Servidor ASGI |
| SQLModel | 0.0.19 | ORM + modelos Pydantic integrados |
| SQLite | - | Base de datos (archivo `.db`) |
| Passlib + bcrypt | 1.7.4 | Hash de contraseñas |
| python-jose | 3.3.0 | Generación y validación de JWT |
| python-dotenv | 1.0.1 | Variables de entorno desde `.env` |

### Frontend
| Tecnología | Versión | Rol |
|---|---|---|
| React | 18.x | Framework UI |
| TypeScript | 5.x | Tipado estricto |
| Vite | 5.x | Build tool y servidor de desarrollo |
| Tailwind CSS | 3.x | Estilos utilitarios (soporte dark mode `class`) |
| Recharts | - | Gráficos (barras, líneas, referencia) |
| TanStack Query | 5.x | Cache y gestión de estado del servidor |
| Zustand | 4.x | Manejo de estado global UI (ThemeStore) |
| Axios | - | Cliente HTTP hacia el backend |
| React Router | 6.x | Enrutamiento SPA |
| Lucide React | - | Iconos |

### Infraestructura
| Tecnología | Rol |
|---|---|
| Docker + Docker Compose | Orquestación de servicios unificada |
| Nginx (proxy_unificado) | Reverse proxy compartido (Dashboard + Gastos) |
| Cloudflare Tunnel | Exposición segura vía `graficosagiles.site` |
| Raspberry Pi 4 | Servidor de producción (8GB RAM) |

---

## 2. Arquitectura de Servicios Unificada

```
Internet (graficosagiles.site)
    │
    ▼
Cloudflare Tunnel (tunnel_unificado)
    │
    ▼
Nginx :80 / :8080 (proxy_unificado)
    │
    ├── Puerto 80: Agility Dashboard (Externo)
    │
    └── Puerto 8080: Gastos Familia (Interno/VPN)
         ├── /api/*  → Backend FastAPI :8000 (gastos_backend)
         └── /*      → Frontend React   :80   (gastos_frontend)

Red interna Docker: app_network (bridge)
Volumen persistente: ~/GastosFamilia/backend/data/
```

### En desarrollo local
```
http://localhost:5173 → Frontend (Vite dev server)
http://localhost:8000 → Backend (Uvicorn)
Proxy Vite: /api/* → http://127.0.0.1:8000
```

> [!IMPORTANT]
> El proxy de Vite en `vite.config.ts` reescribe las rutas: `/api/dashboard/` se convierte en `/dashboard/` al llegar al backend.

---

## 3. Estructura de Archivos

```
Gastos Familia/
├── backend/
│   ├── main.py             # Entry point: registra routers, CORS, lifespan
│   ├── database.py         # Engine SQLite, get_session, seed inicial
│   ├── security.py         # JWT helpers (create/verify token)
│   ├── importar_excel.py   # Script de importación desde Google Sheets
│   ├── inspect_db.py       # Script de diagnóstico de la DB
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── models/
│   │   ├── usuario.py
│   │   ├── tarjeta.py
│   │   ├── movimiento.py
│   │   ├── gasto_mensual.py
│   │   └── ingreso.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── dashboard.py    # ⭐ Router principal del Dashboard
│   │   ├── movimientos.py
│   │   ├── tarjetas.py
│   │   ├── gastos_mensuales.py
│   │   ├── ingresos.py
│   │   └── importar.py
│   ├── schemas/
│   │   └── dashboard.py    # Pydantic schemas de respuesta del Dashboard
│   └── services/
│       └── cuotas.py       # ⭐ Lógica de cuotas activas y proyección
│
├── frontend/
│   └── src/
│       ├── App.tsx          # Routing principal
│       ├── main.tsx         # Entry point React
│       ├── api/
│       │   └── client.ts    # Axios + funciones de fetch por dominio
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppShell.tsx   # Contenedor con Sidebar + BottomNav
│       │   │   ├── Sidebar.tsx    # Navegación desktop
│       │   │   └── BottomNav.tsx  # Navegación mobile
│       │   └── ui/
│       │       └── MetricCard.tsx # Card de métrica reutilizable
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   └── Login.tsx
│       └── utils/
│           └── format.ts    # formatARS(), formatARSCompact(), MESES_CORTO
│
├── docker-compose.yml
├── nginx.conf
├── start-dev-local.sh   # Inicia backend + frontend en modo dev
├── reset_db.sh          # Borra DB y vuelve a importar desde Excel
├── deploy.sh            # Deploy en producción (Raspberry Pi)
└── .env                 # Variables de entorno (nunca al repo)
```

---

## 4. Base de Datos

### Tablas y Campos

#### `usuario`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Auto-incremental |
| `username` | TEXT | Nombre de usuario único (`baso`, `juli`) |
| `nombre` | TEXT | Nombre para mostrar |
| `password_hash` | TEXT | Hash bcrypt de la contraseña |
| `es_admin` | BOOLEAN | Si tiene privilegios de administrador |

#### `tarjeta`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Auto-incremental |
| `nombre` | TEXT | Ej: "BASO VISA", "JULI MASTER" |
| `usuario` | TEXT | A quién pertenece (`baso`, `juli`) |
| `banco` | TEXT | Entidad bancaria |
| `tipo` | TEXT | `visa`, `master`, `cencosud` |
| `color` | TEXT | Hex del color (#3B82F6). **Inmutable.** |
| `activa` | BOOLEAN | Si se usa en filtros y gráficos |

#### `movimiento` ⭐
Representa una compra en cuotas realizada con tarjeta.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Auto-incremental |
| `tarjeta_id` | INTEGER FK | Relación a `tarjeta.id`. **Puede ser nulo** (Efectivo/Transferencia) |
| `descripcion` | TEXT | Nombre de la compra (ej: "Placard") |
| `categoria` | TEXT (nullable) | Categoría opcional |
| `monto_total` | FLOAT | Precio total de la compra |
| `cuotas` | INTEGER | Cantidad de cuotas (default: 1) |
| `monto_cuota` | FLOAT | `monto_total / cuotas` |
| `fecha_primera_cuota` | DATE | Primer mes de impacto |
| `fecha_ultima_cuota` | DATE | Último mes de impacto |
| `notas` | TEXT (nullable) | Notas libres |
| `creado_en` | DATETIME | Timestamp de creación |

> [!IMPORTANT]
> **La comparación de cuotas activas usa siempre MES ABSOLUTO, no fechas con día.**  
> `mes_absoluto = año * 12 + mes`  
> Esto evita bugs donde el día de la fecha (ej: día 15) cause que la cuota no aparezca en su primer o último mes.

#### `gastomensual`
Representa un gasto fijo (servicios) o variable (supermercado puntual).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Auto-incremental |
| `descripcion` | TEXT | Nombre del gasto (ej: "Expensas") |
| `categoria` | TEXT (nullable) | Categoría opcional |
| `monto` | FLOAT | Importe |
| `mes` | INTEGER | Mes de referencia (1–12) |
| `anio` | INTEGER | Año de referencia |
| `es_fijo` | BOOLEAN | Si se repite todos los meses |
| `notas` | TEXT (nullable) | Notas libres |

> [!CAUTION]
> Un gasto con `es_fijo = True` se suma en **todos los meses desde su mes/año de creación en adelante**.  
> No es retroactivo: no aparece en meses anteriores a `mes/anio`.

#### `ingreso`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Auto-incremental |
| `descripcion` | TEXT | Ej: "Sueldo" |
| `monto` | FLOAT | Importe |
| `mes` | INTEGER | Mes de referencia |
| `anio` | INTEGER | Año de referencia |
| `es_fijo` | BOOLEAN | Si se repite todos los meses |
| `notas` | TEXT (nullable) | Notas libres |

> [!CAUTION]
> Misma regla que `gastomensual`: los ingresos fijos son válidos desde su mes de creación en adelante. No son retroactivos.

---

## 5. Lógica de Cálculo del Dashboard

### 5.1 Función `cuota_activa_en_mes(movimiento, mes, anio)` → `bool`

**Archivo:** `backend/services/cuotas.py`

```python
mes_consulta = anio * 12 + mes
mes_inicio   = fecha_primera.year * 12 + fecha_primera.month
mes_fin      = fecha_ultima.year  * 12 + fecha_ultima.month

return mes_inicio <= mes_consulta <= mes_fin
```

### 5.2 Fórmulas del Dashboard

```python
# Ingresos
total_ingreso = Σ ingreso.monto
    para todos i en Ingreso donde:
    (i.mes == mes Y i.anio == anio)
    O (i.es_fijo Y (i.anio * 12 + i.mes) <= (anio * 12 + mes))

# Cuotas
total_cuotas = Σ movimiento.monto_cuota
    para todos m en Movimiento donde:
    cuota_activa_en_mes(m, mes, anio) == True

# Gastos Fijos/Var
total_gastos = Σ gasto.monto
    para todos g en GastoMensual donde:
    (g.mes == mes Y g.anio == anio)
    O (g.es_fijo Y (g.anio * 12 + g.mes) <= (anio * 12 + mes))

# Derivados
total_mes          = total_cuotas + total_gastos
ahorro_proyectado  = total_ingreso - total_mes
```

### 5.3 Cuotas a Finalizar

```python
for m in movimientos:
    si m.tarjeta_id != None Y m.cuotas > 1 Y cuota_activa_en_mes(m, mes, anio):
        restantes = (m.fecha_ultima_cuota.year * 12 + m.fecha_ultima_cuota.month) - (anio * 12 + mes) + 1
        si 1 <= restantes <= 2:
            → incluir en la lista
```

---

## 6. API REST — Endpoints

### Auth
| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/auth/login` | Login con username/password, retorna JWT |

### Dashboard
| Método | Endpoint | Parámetros | Descripción |
|---|---|---|---|
| `GET` | `/dashboard/` | `?mes=4&anio=2026` | Resumen financiero del mes (usa hoy si no se pasan) |
| `GET` | `/dashboard/debug/cuotas` | `?mes=4&anio=2026` | Debug: detalle de cada cuota activa |

### Otros (en desarrollo)
| Prefijo | Estado |
|---|---|
| `/movimientos` | CRUD completo implementado (GET, POST, DELETE, GET `/preview`) |
| `/tarjetas` | CRUD completo implementado (Baja lógica / Soft delete en `DELETE`) |
| `/gastos-mensuales` | CRUD completo implementado |
| `/ingresos` | CRUD completo implementado |
| `/importar` | Deprecado (Google Sheets eliminado en Fase 2) |

---

## 7. Convenciones de Código Obligatorias

### Backend (Python)
- **Funciones**: `snake_case` con verbo. Ej: `get_cuotas_mes()`, `cuota_activa_en_mes()`
- **Modelos**: `PascalCase`. Ej: `Movimiento`, `GastoMensual`
- **Variables de dominio**: español. Ej: `monto_cuota`, `fecha_primera_cuota`
- **Variables técnicas**: inglés. Ej: `session`, `engine`, `router`
- **Todas las funciones públicas deben tener tipo de retorno explícito**
- **Nunca usar `db.query()` (SQLAlchemy legacy)** → Siempre `session.exec(select(...))`
- **Nunca retornar 200 con error en el body** → Usar `HTTPException`
- **Mensajes de error en español**

### Frontend (TypeScript / React)
- **Componentes**: `PascalCase`. Ej: `MetricCard`, `DashboardSkeleton`
- **Hooks**: camelCase con prefijo `use`. Ej: `useDashboard()`
- **API functions**: camelCase con verbo. Ej: `getDashboardInfo()`
- **Interfaces de Props**: siempre definidas como `interface`, nunca inline
- **Nunca usar `any`** — si es necesario temporalmente, documentar el porqué
- **Nunca hacer fetch directo en componentes** → siempre a través de `api/client.ts` y React Query
- **Formateo de montos**: siempre `formatARS()` o `formatARSCompact()` desde `utils/format.ts`
- **Inputs Monetarios**: usar `NumericFormat` de `react-number-format` (configurado con `thousandSeparator="."`, `decimalSeparator=","`)

### Diseño (Mobile First) y Semántica (HTML5)
- **Regla Estricta**: Seguir el documento `MANUAL_BUENAS_PRACTICAS_HTML_CSS.md`.
- No usar `div-soup`. Utilizar siempre etiquetas semánticas (`<main>`, `<header>`, `<section>`, `<article>`, `<nav>`).
- Todo elemento interactivo o contenedor clave debe tener un atributo `id` único.
- **Mobile First**: Diseñar para **375px** primero (referencia: Samsung A56 / iPhone). Usar prefijos responsivos de Tailwind (`lg:`) únicamente para expandir la vista a desktop.
- **Touch Targets**: Botones e inputs deben tener un área mínima de **44px de altura** (`py-3` o `h-11/12`) para garantizar usabilidad táctil.
- Estados de loading: **Skeleton**, nunca spinner de página entera.
- Estado de error: recuadro `border-red-200 bg-red-50 text-red-700`.
- Estado vacío: icono + texto descriptivo + sugerencia de acción.

---

## 8. Variables de Entorno

### Backend (`.env` en raíz del proyecto)
```bash
SECRET_KEY=             # JWT secret — obligatorio en producción
DATABASE_URL=           # sqlite:///./data/gastos.db
ALLOWED_ORIGINS=        # URL del frontend en producción
```

### Frontend (`.env` en `frontend/`)
```bash
VITE_API_URL=           # URL base del backend (vacío = usa proxy Vite local)
```

> [!WARNING]
> Nunca commitear archivos `.env`. Siempre proveer `.env.example` con claves vacías.

---

## 9. Scripts de Utilidad

| Script | Comando | ¿Qué hace? |
|---|---|---|
| Desarrollo local | `bash start-dev-local.sh` | Levanta backend (8000) + frontend (5173) en paralelo |
| Resetear DB | `bash reset_db.sh` | Borra DB, re-crea tablas y base de tarjetas |
| Inspeccionar DB | `python3 backend/inspect_db.py` | Muestra resumen de la DB en la terminal |
| Importar Excel | `python3 backend/importar_excel.py` | (DEPRECADO) Importaba movimientos desde Google Sheets |
| Deploy prod | `bash deploy.sh` | Hace `git pull` + `docker compose up --build` en la Raspberry |

---

## 10. Importación desde Excel (Google Sheets) [DEPRECADO]

> [!WARNING]
> **A partir de la Fase 2, este mecanismo está oficialmente DEPRECADO.**
> La aplicación utiliza exclusivamente entrada de datos manual a través de la web (formularios con validación Zod).
> El archivo `backend/importar_excel.py` se mantiene temporalmente por motivos de referencia histórica.

---

## 11. Flujo de Trabajo con GitHub

El repositorio en GitHub actúa como el puente de sincronización entre el entorno de desarrollo y producción.

### 11.1 El Ciclo de Vida del Cambio
1. **Desarrollo (PC Lenovo):** Se realizan los cambios, se prueban localmente con `bash start-dev-local.sh`.
2. **Commit y Push:** Se suben los cambios a GitHub.
3. **Pull (Raspberry Pi 4):** Se ingresa por SSH y se ejecuta `git pull` dentro de la carpeta del proyecto.
4. **Redeploy:** Se ejecuta `./deploy.sh` para reconstruir los contenedores con el código nuevo.

### 11.2 Seguridad y Secretos (.gitignore)
Por seguridad, los siguientes archivos **TIENEN PROHIBIDO** subir a GitHub:
- `.env`: Contiene claves de API y secretos de JWT.
- `backend/data/*.db`: La base de datos real con tus gastos.
- `node_modules/` y `__pycache__/`: Basura técnica.

> [!IMPORTANT]
> Si clonás el repo en una máquina nueva, deberás crear el `.env` manualmente y copiar la base de datos `gastos.db` desde el backup.

---

## 12. Flujo de Deploy (Producción)

> [!NOTE]
> El volumen `./data/` está montado fuera del contenedor. La base de datos **no se borra** al hacer un redeploy normal.  
> Para reiniciar la DB en producción: ejecutar `bash reset_db.sh` **dentro del contenedor backend** o borrar manualmente el archivo `./data/gastos.db`.

---

## 13. Resolución de Problemas (Troubleshooting)

### 13.1 Fallos en el Build de Frontend (TypeScript)
Si `npm run build` falla con errores de tipo o variables no usadas:
- **Variables no usadas**: El linter de producción (`tsc`) bloquea el build si hay variables o imports declarados pero no usados. Se deben limpiar antes de deployar.
- **Tipos de Vite**: Si `import.meta.env` no se reconoce, verificar la existencia de `src/vite-env.d.ts` con la referencia `/// <reference types="vite/client" />`.

### 13.2 Error "ModuleNotFoundError: No module named 'dateutil'"
Este error ocurre si el backend intenta calcular fechas proyectadas sin la librería `python-dateutil`. 
**Solución**: Asegurarse de que esté en `requirements.txt` y reconstruir la imagen (`--build`).

### 13.3 Error "502 Bad Gateway" en Nginx
Suele deberse a dos causas en esta infraestructura:
1. **Nombres de Host**: Docker DNS resuelve servicios usando el nombre del *Service* en el compose (ej: `gastos-backend`), NO el `container_name`. Si el `nginx.conf` tiene guiones bajos `_` en lugar de medios `-`, el proxy fallará.
2. **Crasheos del Backend**: Si el backend entra en un bucle de reinicio (ver `docker ps`), Nginx no podrá conectarse. Ver logs con `docker logs gastos_backend`.

---

## 14. Historial de Cambios Técnicos

| Fecha | Cambio |
|---|---|
| Abr 2026 | Stack inicial: FastAPI + SQLModel + React + Vite + Docker |
| Abr 2026 | Dashboard endpoint con cuotas, gastos, ingresos y proyección |
| Abr 2026 | Refactor: `cuotas.py` migrado de `db.query()` a `session.exec(select())` |
| Abr 2026 | Schemas Pydantic creados en `backend/schemas/dashboard.py` |
| Abr 2026 | Motor de fechas corregido: comparación por mes absoluto (`año*12+mes`) |
| Abr 2026 | Campo `es_fijo` agregado a modelo `Ingreso` |
| Abr 2026 | Ciclo de vida de gastos/ingresos fijos: no retroactivos, desde mes de creación |
| Abr 2026 | **Base de Datos**: Migración de tabla `gastomensual` para incluir `tarjeta_id` (FOREIGN KEY a `tarjeta`). |
| Abr 2026 | **Lógica**: Refactor de `get_cuotas_por_tarjeta` para incluir gastos fijos vinculados a tarjetas en los totales. |
| Abr 2026 | **UI**: Implementación de CSS global para ocultar flechas en inputs de tipo `number`. |
| Abr 2026 | **Smart Forms**: Lógica de entrada de cuotas (Sugerencias vs Manual) con estados locales `cuotasMode`. |
| Abr 2026 | **Frontend**: Centralización de lógica de edición en `InlineEditForm.tsx`. Refactor de Dashboard para usar `Fragment` y renderizado de filas expansivas. |
| Abr 2026 | **Fixes**: Corrección de dependencias (`python-dateutil`) y limpieza de tipos de TypeScript para build de producción. |
| Abr 2026 | **Frontend**: Centralización de lógica de edición en `InlineEditForm.tsx`. Refactor de Dashboard para usar `Fragment` y renderizado de filas expansivas. |
| Abr 2026 | Frontend: Formulario `/tarjetas` creado con `react-hook-form` y validaciones `zod`. Soporte de edición (click en card) y baja (botón de basura). |
| Abr 2026 | Bugfix: Corregido error 404 en APIs al remover prefijos duplicados en los `APIRouter` (ya se incluían en `main.py`). |
| Abr 2026 | Backend: `PUT /tarjetas/{id}` y `DELETE /tarjetas/{id}` (Soft Delete) implementados. |
| Abr 2026 | Frontend: Interfaz unificada en `/gastos` para Egresos e Ingresos utilizando pestañas (*tabs*). |
| Abr 2026 | Frontend: Integración de `react-number-format` para formatear inputs de moneda con estilo argentino (`.` miles, `,` decimales). |
| Abr 2026 | Frontend: Soporte para Modo Oscuro/Claro (`dark:` en Tailwind) gobernado por `Zustand` (`themeStore.ts`). |
| Abr 2026 | Backend: Nuevo modelo `ProyeccionOverride` y servicio `services/proyeccion.py` para proyección financiera de 12 meses con overrides por mes. |
| Abr 2026 | Backend: Nuevo router `routers/proyeccion.py` con endpoints GET /proyeccion/, POST /proyeccion/override, DELETE /proyeccion/override/{id}. |
| Abr 2026 | Frontend: Nueva página `/proyeccion` con gráfico de barras apiladas (Recharts) y tabla interactiva con edición inline de valores proyectados. |
| Abr 2026 | Docs: Actualización de Guía de Buenas Prácticas con foco estricto en Mobile First y Touch Targets para dispositivos modernos (Samsung A56). |
| Abr 2026 | **Infra**: Diagnóstico y documentación del bug de DNS caching en `proxy_unificado`. Fix: `docker restart proxy_unificado` tras recrear contenedores de Gastos. |
| Abr 2026 | **Infra**: Fix permanente del DNS caching agregando `resolver 127.0.0.11` al `nginx.conf` de `infra-unificada`. |
| Abr 2026 | **Backend**: Nuevos modelos `MedioPago` y `Categoria` en `models/config.py` para gestión dinámica de metadatos. |
| Abr 2026 | **Backend**: Implementación de `routers/configuracion.py` con soporte para Pydantic v1/v2 (`model_dump` fallback). |
| Abr 2026 | **Frontend**: Implementación de diseño híbrido en Dashboard mediante clases condicionales de Tailwind (`lg:hidden` vs `hidden lg:block`). |
| Abr 2026 | **Infra**: Integración de `docker restart proxy_unificado` en `deploy.sh` como paso de mitigación post-deploy. |

---

## 15. Sistema de Configuración Dinámica

### 15.1 Modelos de Configuración (`models/config.py`)
Para desacoplar la lógica de negocio del código, se introdujeron tablas de metadatos:
- **`MedioPago`**: Permite definir orígenes de fondos (Tarjetas, Efectivo, Billeteras Virtuales). Incluye campos de `tipo` y `color`.
- **`Categoria`**: Permite agrupar gastos con iconos de Lucide.

### 15.2 Diseño Híbrido Responsivo (Dashboard)
El Dashboard utiliza una técnica de **renderizado dual condicional** en CSS:
```tsx
{/* Vista Mobile (lg:hidden) */}
<div className="grid lg:hidden"> ... Cards ... </div>

{/* Vista Desktop (hidden lg:block) */}
<div className="hidden lg:block"> ... Table ... </div>
```
Esta aproximación evita la complejidad de hooks de JS (`useMediaQuery`) y garantiza que no haya "layout shift" durante la carga inicial.

---

## 15. Mantenimiento y Despliegue Seguro (Zero Downtime)

Dado que este proyecto convive con otros en una **Infraestructura Unificada**, se deben seguir estas reglas para evitar caídas de servicio:

### 14.1 El Mandamiento del Despliegue Quirúrgico
**NUNCA** ejecutar `docker compose up -d` a secas en la Raspberry. Siempre se debe especificar el servicio para no afectar a los demás proyectos. 
El script `deploy.sh` de la PC ya lo hace automáticamente:
`docker compose up -d --build gastos_backend gastos_frontend`

### 14.2 Prohibición del `down`
No usar `docker compose down` en la carpeta `infra-unificada` a menos que se desee apagar TODOS los servicios de la casa (incluyendo Dashboard e Internet).

### 14.3 Actualización de Nginx
Si se modifica el archivo `nginx.conf`, no es necesario reiniciar todo. Basta con:
```bash
docker restart proxy_unificado
```

### 14.4 ⚠️ Bug conocido: DNS Caching en Nginx (502 Bad Gateway)

**Síntoma:** Después de recrear los contenedores `gastos_backend` o `gastos_frontend`, la app en `192.168.1.185:8080` muestra un error 502 Bad Gateway.

**Causa raíz:** Nginx resuelve el DNS de los servicios Docker **una sola vez al arrancar**. Cuando los contenedores se recrean, obtienen nuevas IPs internas. El `proxy_unificado` (que lleva más tiempo corriendo) sigue apuntando a las IPs viejas.

**Fix inmediato:**
```bash
docker restart proxy_unificado
```
## 16. Resolución de Errores Comunes de Build (TypeScript)

### 16.1 Error: `Property '$$typeof' is missing` en Iconos
- **Causa**: Pasar un elemento renderizado `<Icon />` a un prop que espera el componente base `LucideIcon`.
- **Solución**: Pasar el nombre del componente sin los brackets: `icon={PiggyBank}` en lugar de `icon={<PiggyBank />}`.

### 16.2 Error: `TS6133: 'Variable' is declared but its value is never read`
- **Causa**: El compilador de producción (`tsc`) no permite variables o imports sin uso.
- **Solución**: Eliminar cualquier import o constante que no se esté utilizando activamente en el renderizado o la lógica.

### 16.3 Error: `Type 'string' is not assignable to type 'variant'`
- **Causa**: Intentar usar un color de variante no definido en la interfaz del componente (ej: `info` o `primary`).
- **Solución**: Ajustarse estrictamente a los valores definidos: `default`, `success`, `danger` o `warning`.

### 16.4 Uso del Script de Integridad
Antes de cada deploy, se recomienda ejecutar:
```bash
bash check_integrity.sh
```
Este script simula el proceso de build de producción y detecta estos errores antes de que lleguen a la Raspberry Pi.

**Fix permanente** — Agregar el `resolver` de Docker al `nginx.conf` de `infra-unificada`:
```nginx
server {
    listen 8080;
    server_name _;

    # Resolver de Docker: resuelve DNS dinámicamente
    resolver 127.0.0.11 valid=30s;

    location /api/ {
        set $gastos_backend http://gastos-backend:8000;
        proxy_pass $gastos_backend/;
    }

    location / {
        set $gastos_frontend http://gastos-frontend:80;
        proxy_pass $gastos_frontend;
    }
}
```

> [!IMPORTANT]
> El uso de variables (`set $backend`) junto con `resolver 127.0.0.11` hace que Nginx re-resuelva el DNS en cada request, evitando el problema permanentemente.
