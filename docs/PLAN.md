# PLAN.md — Sistema de Gestión de Gastos Familiares
> Documento de contexto para el agente Antigravity. Leer completo antes de ejecutar cualquier tarea.

---

## 1. Contexto del proyecto

### ¿Qué es esto?
Una web app **Mobile First** de gestión de gastos familiares para dos usuarios (Baso y Juli). Reemplaza un Google Sheet complejo que trackea gastos en cuotas, tarjetas de crédito, gastos fijos/variables mensuales y proyecciones de ahorro.

### Usuarios
- **Baso** — admin, carga y edita todo
- **Juli** — acceso completo (lectura + carga) desde el celular

### Filosofía de diseño
- **Mobile First, Web Enhanced**: diseñar primero para pantalla de celular (375px), luego adaptar para desktop. Nunca al revés.
- La app debe funcionar perfectamente desde el celular de Juli sin necesidad de desktop.
- En desktop, aprovechar el espacio con layouts de 2-3 columnas, sidebars y más datos visibles simultáneamente.
- Sin instalar nada: es una PWA (Progressive Web App) instalable desde el browser.

### Infraestructura
- **Deploy**: Raspberry Pi 3B+ corriendo Ubuntu/Raspberry Pi OS
- **Workflow de deploy**:
  1. Desarrollar localmente en Ubuntu PC
  2. Push a GitHub (`github.com/Basu22/[repo-name]`)
  3. En RPI: `git pull && docker compose down && docker compose up -d --build`
- **Stack**: Docker con 3 servicios: `backend`, `frontend`, `cloudflare-tunnel`
- **Acceso externo**: vía Cloudflare Tunnel (sin abrir puertos del router)

---

## 2. Stack técnico decidido

```
Frontend:  React 18 + Vite + TypeScript
Styling:   Tailwind CSS v3 (Mobile First por defecto)
Charts:    Recharts
Routing:   React Router v6
State:     Zustand (global) + React Query (server state)
Forms:     React Hook Form + Zod

Backend:   Python 3.11 + FastAPI
DB:        SQLite (dev/prod inicial) → PostgreSQL (cuando escale)
ORM:       SQLModel (SQLAlchemy + Pydantic integrado)
Auth:      JWT con refresh tokens (simple, 2 usuarios)
PDF parse: pdfminer.six (para resúmenes de tarjeta, Fase 3)
AI:        Claude API - claude-sonnet-4-5 (categorización, Fase 3)

Infra:     Docker Compose
           Nginx (reverse proxy interno)
           Cloudflare Tunnel
```

---

## 3. Estructura de carpetas

```
/
├── docker-compose.yml
├── deploy.sh
├── PLAN.md                    ← este archivo
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── public/
│   │   ├── manifest.json      ← PWA manifest
│   │   └── icons/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── ui/            ← componentes base (Button, Card, Badge, etc.)
│       │   ├── layout/        ← AppShell, BottomNav, Sidebar, TopBar
│       │   └── charts/        ← wrappers de Recharts
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Movimientos.tsx
│       │   ├── NuevoGasto.tsx
│       │   ├── Simulador.tsx
│       │   ├── Tarjetas.tsx
│       │   └── Login.tsx
│       ├── stores/            ← Zustand stores
│       ├── hooks/             ← custom hooks
│       ├── api/               ← funciones de fetch (React Query)
│       └── types/             ← TypeScript types compartidos
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── main.py
    ├── database.py
    ├── models/
    │   ├── usuario.py
    │   ├── tarjeta.py
    │   ├── movimiento.py
    │   └── gasto_mensual.py
    ├── routers/
    │   ├── auth.py
    │   ├── movimientos.py
    │   ├── tarjetas.py
    │   ├── gastos_mensuales.py
    │   ├── dashboard.py
    │   └── importar.py
    └── services/
        ├── cuotas.py          ← lógica de proyección de cuotas
        ├── simulador.py
        └── importar_csv.py
```

---

## 4. Modelo de datos

### Concepto clave: cada cuota es una fila
En el sheet, una compra en 12 cuotas genera 12 entradas en el resumen mensual. En la DB, guardamos **la compra una sola vez** y calculamos las cuotas al vuelo.

```sql
-- Tarjetas disponibles
CREATE TABLE tarjeta (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,           -- "BASO VISA", "JULI MASTER", etc.
    usuario TEXT NOT NULL,          -- "baso" | "juli"
    banco TEXT,                     -- "Santander", "BBVA", etc.
    tipo TEXT,                      -- "visa" | "master" | "cencosud" | etc.
    activa BOOLEAN DEFAULT TRUE,
    color TEXT                      -- hex color para UI
);

-- Cada compra (en cuotas o no)
CREATE TABLE movimiento (
    id INTEGER PRIMARY KEY,
    tarjeta_id INTEGER REFERENCES tarjeta(id),
    descripcion TEXT NOT NULL,      -- "River", "Starlink", "Heladera"
    categoria TEXT,                 -- "entretenimiento" | "servicios" | etc.
    monto_total REAL NOT NULL,      -- monto total de la compra
    cuotas INTEGER DEFAULT 1,       -- cantidad de cuotas
    monto_cuota REAL NOT NULL,      -- monto_total / cuotas
    fecha_primera_cuota DATE NOT NULL,
    fecha_ultima_cuota DATE NOT NULL, -- calculado: fecha_primera + (cuotas-1) meses
    notas TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    creado_por TEXT                 -- "baso" | "juli"
);

-- Gastos fijos/variables mensuales (proyectados a todo el año)
CREATE TABLE gasto_mensual (
    id INTEGER PRIMARY KEY,
    descripcion TEXT NOT NULL,      -- "Comida", "Nafta", "Expensas Fincas"
    categoria TEXT,
    monto REAL NOT NULL,
    mes INTEGER NOT NULL,           -- 1-12
    anio INTEGER NOT NULL,
    es_fijo BOOLEAN DEFAULT FALSE,  -- si es fijo, se replica a meses futuros
    notas TEXT
);

-- Ingresos mensuales proyectados
CREATE TABLE ingreso (
    id INTEGER PRIMARY KEY,
    descripcion TEXT DEFAULT 'Sueldo',
    monto REAL NOT NULL,
    mes INTEGER NOT NULL,
    anio INTEGER NOT NULL
);

-- Usuarios (solo 2)
CREATE TABLE usuario (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,  -- "baso" | "juli"
    password_hash TEXT NOT NULL,
    nombre TEXT,
    es_admin BOOLEAN DEFAULT FALSE
);
```

### Función clave: `proyectar_cuotas(mes, anio)`
```python
# Dado un mes/año, devuelve la suma de cuotas activas de cada tarjeta
# Una cuota está activa si: fecha_primera <= mes/año <= fecha_ultima
def get_cuotas_mes(tarjeta_id: int, mes: int, anio: int) -> float:
    # Filtra movimientos donde el mes/año cae dentro del rango de cuotas
    # Suma monto_cuota de cada uno
    pass
```

---

## 5. Diseño Mobile First — Reglas para el agente

### Breakpoints (Tailwind)
```
móvil:   default (sin prefijo) → 375px+
tablet:  sm: → 640px+
desktop: lg: → 1024px+
```

### Layout principal
**En móvil**: Bottom Navigation Bar (4 ítems: Dashboard, Gastos, Nuevo, Tarjetas)
**En desktop**: Sidebar izquierda fija (240px) + contenido principal

```tsx
// AppShell.tsx — estructura que cambia según pantalla
<div className="flex flex-col min-h-screen lg:flex-row">
  {/* Sidebar — oculto en móvil */}
  <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:h-screen">
    <Sidebar />
  </aside>

  {/* Contenido principal */}
  <main className="flex-1 lg:ml-60 pb-20 lg:pb-0">
    {/* TopBar — solo en móvil */}
    <TopBar className="lg:hidden" />
    <Outlet />
  </main>

  {/* Bottom Nav — solo en móvil */}
  <BottomNav className="fixed bottom-0 left-0 right-0 lg:hidden" />
</div>
```

### Componentes clave y su comportamiento responsive

**Dashboard cards (métricas)**
```
móvil:   grid de 2 columnas, cards compactas
desktop: grid de 4 columnas, cards más grandes con más detalle
```

**Gráfico de cuotas por mes**
```
móvil:   gráfico de barras horizontal scrolleable (3 meses visibles)
desktop: gráfico completo 12 meses visible simultáneamente
```

**Lista de movimientos**
```
móvil:   lista vertical, cada item muestra descripción + cuota mensual + tarjeta
desktop: tabla con columnas: descripción, tarjeta, total, cuotas, cuota/mes, desde, hasta
```

**Formulario nuevo gasto**
```
móvil:   pantalla completa (full screen sheet), campos apilados
desktop: modal centrado de 480px, mismos campos
```

### Paleta de colores (por tarjeta)
```
BASO VISA:       azul     #3B82F6
JULI VISA:       violeta  #8B5CF6
JULI MASTER:     rojo     #EF4444
JULI CENCOSUD:   verde    #10B981
MONI GALICIA:    naranja  #F59E0B
JULI BBVA:       celeste  #06B6D4
BASO ICBC:       índigo   #6366F1
SELE SANTANDER:  rosa     #EC4899
```

---

## 6. API REST — Endpoints

```
AUTH
POST   /api/auth/login          → { access_token, refresh_token }
POST   /api/auth/refresh
POST   /api/auth/logout

DASHBOARD
GET    /api/dashboard?mes=&anio=  → resumen completo del mes

MOVIMIENTOS
GET    /api/movimientos?mes=&anio=&tarjeta_id=
POST   /api/movimientos
PUT    /api/movimientos/{id}
DELETE /api/movimientos/{id}
GET    /api/movimientos/{id}/preview-cuotas  → preview de impacto antes de guardar

TARJETAS
GET    /api/tarjetas
POST   /api/tarjetas
PUT    /api/tarjetas/{id}

GASTOS MENSUALES
GET    /api/gastos-mensuales?mes=&anio=
POST   /api/gastos-mensuales
PUT    /api/gastos-mensuales/{id}
DELETE /api/gastos-mensuales/{id}

INGRESOS
GET    /api/ingresos?anio=
POST   /api/ingresos
PUT    /api/ingresos/{id}

SIMULADOR
POST   /api/simulador/calcular
  body: { monto_total, cuotas, tarjeta_id, fecha_inicio }
  resp: { impacto_por_mes: [{ mes, anio, cuota, total_comprometido, saldo }] }

IMPORTAR
POST   /api/importar/csv         → importa el Google Sheet exportado como CSV
POST   /api/importar/pdf         → (Fase 3) parsea resumen bancario PDF

REPORTES
GET    /api/reportes/anual?anio=  → datos para comparativa interanual
```

### Formato de respuesta del Dashboard
```json
{
  "mes": 4,
  "anio": 2026,
  "ingreso": 5300000,
  "total_cuotas": 1236062,
  "total_gastos_mensuales": 2908019,
  "total_mes": 4144081,
  "ahorro_proyectado": 1155919,
  "cuotas_por_tarjeta": [
    { "tarjeta_id": 1, "nombre": "BASO VISA", "monto": 443880, "color": "#3B82F6" },
    ...
  ],
  "proximos_6_meses": [
    { "mes": 5, "anio": 2026, "total_cuotas": 1413049, "total_mes": 4492543 },
    ...
  ]
}
```

---

## 7. PWA — Configuración

```json
// public/manifest.json
{
  "name": "Gastos Familiares",
  "short_name": "Gastos",
  "description": "Gestión de gastos y cuotas familiares",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3B82F6",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

El agente debe registrar un service worker básico para que la app sea instalable. Usar `vite-plugin-pwa` para generarlo automáticamente.

---

## 8. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: gastos_backend
    restart: unless-stopped
    volumes:
      - ./data:/app/data          # SQLite persiste aquí
    environment:
      - DATABASE_URL=sqlite:///./data/gastos.db
      - SECRET_KEY=${SECRET_KEY}
      - ALLOWED_ORIGINS=https://gastos.tudominio.com
    networks:
      - gastos_net

  frontend:
    build: ./frontend
    container_name: gastos_frontend
    restart: unless-stopped
    depends_on:
      - backend
    networks:
      - gastos_net

  nginx:
    image: nginx:alpine
    container_name: gastos_nginx
    restart: unless-stopped
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - frontend
      - backend
    networks:
      - gastos_net

  cloudflare-tunnel:
    image: cloudflare/cloudflared:latest
    container_name: gastos_tunnel
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - nginx
    networks:
      - gastos_net

networks:
  gastos_net:
    driver: bridge
```

```nginx
# nginx.conf
server {
  listen 80;

  location /api/ {
    proxy_pass http://backend:8000/;
    proxy_set_header Host $host;
  }

  location / {
    proxy_pass http://frontend:80;
    proxy_set_header Host $host;
  }
}
```

---

## 9. Fases de desarrollo

### FASE 1 — MVP: Dashboard + importar datos (Semanas 1–4)
**Objetivo**: App funcionando en el RPI con los datos del sheet importados y dashboard visual.

**Tareas en orden (ejecutar secuencialmente):**

- [ ] **1.1** Inicializar repo con estructura de carpetas definida en sección 3
- [ ] **1.2** Backend: configurar FastAPI + SQLModel + base de datos + migraciones iniciales
- [ ] **1.3** Backend: crear todos los modelos (sección 4) y seed de tarjetas iniciales
- [ ] **1.4** Backend: endpoint `/api/auth/login` con JWT
- [ ] **1.5** Backend: endpoint `/api/dashboard` con lógica de proyección de cuotas
- [ ] **1.6** Backend: endpoint `POST /api/importar/csv` que parsea el sheet exportado
- [ ] **1.7** Frontend: setup Vite + React + TypeScript + Tailwind + React Router
- [ ] **1.8** Frontend: configurar `vite-plugin-pwa` + manifest.json + íconos
- [ ] **1.9** Frontend: AppShell con BottomNav (móvil) + Sidebar (desktop)
- [ ] **1.10** Frontend: página Login (mobile-first, centrada, limpia)
- [ ] **1.11** Frontend: Dashboard — cards de métricas (grid 2col móvil / 4col desktop)
- [ ] **1.12** Frontend: Dashboard — gráfico de barras "cuotas por tarjeta" (Recharts)
- [ ] **1.13** Frontend: Dashboard — gráfico de líneas "proyección 6 meses" (Recharts)
- [ ] **1.14** Frontend: página Tarjetas — lista de tarjetas con totales del mes
- [ ] **1.15** Docker Compose completo + deploy.sh + probar en RPI

### FASE 2 — Carga manual + simulador (Semanas 5–9)
**Objetivo**: Baso y Juli pueden cargar gastos. El simulador muestra impacto de compras futuras.

- [ ] **2.1** Backend: CRUD completo de movimientos con validaciones
- [ ] **2.2** Backend: endpoint simulador con cálculo de impacto mes a mes
- [ ] **2.3** Backend: CRUD gastos mensuales + ingresos
- [ ] **2.4** Frontend: página Movimientos — lista responsive (lista en móvil, tabla en desktop)
- [ ] **2.5** Frontend: formulario Nuevo Gasto (bottom sheet en móvil, modal en desktop)
  - Selector de tarjeta con color
  - Campo descripción con autocompletado (últimas descripciones usadas)
  - Selector de cuotas (1, 3, 6, 12, 18, 24...)
  - Fecha de primera cuota
  - Preview instantáneo: "Vas a pagar $X por mes durante N meses"
- [ ] **2.6** Frontend: Simulador — página dedicada con slider de cuotas y gráfico de impacto
  - Input: monto, cuotas, tarjeta, mes de inicio
  - Output: gráfico de barras apiladas mostrando cómo quedan los próximos 12 meses
  - Indicador visual: verde (viable) / amarillo (ajustado) / rojo (peligroso) por mes
- [ ] **2.7** Frontend: edición y eliminación de movimientos (swipe-to-delete en móvil)
- [ ] **2.8** Frontend: página Gastos Mensuales con formulario de carga

### FASE 3 — Semi-automatización (Semanas 10–16)
- [ ] **3.1** Backend: parser de PDFs de resúmenes bancarios argentinos (pdfminer)
- [ ] **3.2** Backend: integración Claude API para categorización automática
- [ ] **3.3** Frontend: UI de importación PDF con revisión/confirmación antes de guardar
- [ ] **3.4** Frontend: sistema de alertas (mes muy cargado, próximo vencimiento)
- [ ] **3.5** PWA: notificaciones push para alertas

### FASE 4 — Inteligencia + reportes (Semanas 17–24)
- [ ] **4.1** Comparativa interanual (2024 vs 2025 vs 2026)
- [ ] **4.2** Chat con IA sobre los propios datos (RAG sobre gastos)
- [ ] **4.3** Exportar a Google Sheets como backup
- [ ] **4.4** Reporte PDF mensual automático

---

## 10. Reglas de desarrollo para el agente

### Siempre
- Escribir código **TypeScript estricto** en el frontend (no `any`)
- Usar **Tailwind Mobile First**: clases base para móvil, `lg:` para desktop
- Todos los componentes deben funcionar bien a 375px de ancho
- Los formularios deben ser usables con teclado de celular (inputs grandes, min 44px touch target)
- Usar `React Query` para todo fetch de datos (caché, loading states, error states)
- Usar `Zod` para validación tanto en frontend como en backend (schemas compartidos)
- Commits descriptivos en español: `feat: agregar formulario de nuevo gasto`

### Nunca
- No usar `px` fijos para tamaños de fuente (usar las escalas de Tailwind)
- No hardcodear URLs del backend (usar variable de entorno `VITE_API_URL`)
- No guardar tokens JWT en localStorage (usar httpOnly cookies)
- No hacer fetch directo en componentes (siempre a través de hooks de React Query)
- No crear componentes de más de 200 líneas sin partirlos

### Convenciones de nombres
- Componentes: PascalCase (`NuevoGastoForm.tsx`)
- Hooks: camelCase con prefijo `use` (`useMovimientos.ts`)
- Stores Zustand: camelCase con sufijo `Store` (`authStore.ts`)
- API functions: camelCase con verbo (`getMovimientos`, `createMovimiento`)
- Variables en español cuando representan conceptos del dominio (`cuota`, `tarjeta`, `ahorro`)

### Testing manual antes de cada deploy
1. Abrir la app desde el celular (Chrome Android / Safari iOS)
2. Verificar que la Bottom Nav funcione y no tape contenido
3. Verificar que los formularios sean usables con teclado móvil
4. Verificar que los gráficos sean legibles en 375px
5. Probar la instalación como PWA ("Agregar a pantalla de inicio")

---

## 11. Variables de entorno

```bash
# backend/.env
SECRET_KEY=genera-una-clave-larga-y-aleatoria
DATABASE_URL=sqlite:///./data/gastos.db
CLAUDE_API_KEY=sk-ant-...          # Fase 3
ALLOWED_ORIGINS=https://gastos.tudominio.com

# frontend/.env
VITE_API_URL=https://gastos.tudominio.com/api
```

---

## 12. Datos iniciales (seed)

Al inicializar la DB, crear automáticamente:

```python
# Tarjetas iniciales (exactamente las del sheet)
tarjetas_seed = [
    {"nombre": "BASO VISA",       "usuario": "baso", "banco": "Santander", "color": "#3B82F6"},
    {"nombre": "JULI VISA",       "usuario": "juli", "banco": "Santander", "color": "#8B5CF6"},
    {"nombre": "JULI MASTER",     "usuario": "juli", "banco": "ICBC",      "color": "#EF4444"},
    {"nombre": "JULI CENCOSUD",   "usuario": "juli", "banco": "Cencosud",  "color": "#10B981"},
    {"nombre": "JULI CENCOSUD",   "usuario": "juli", "banco": "Cencosud",  "color": "#10B981"},
    {"nombre": "MONI GALICIA",    "usuario": "baso", "banco": "Galicia",   "color": "#F59E0B"},
    {"nombre": "BASO MASTER",     "usuario": "baso", "banco": "Santander", "color": "#64748B"},
    {"nombre": "JULI BBVA",       "usuario": "juli", "banco": "BBVA",      "color": "#06B6D4"},
    {"nombre": "BASO ICBC",       "usuario": "baso", "banco": "ICBC",      "color": "#6366F1"},
    {"nombre": "SELE SANTANDER",  "usuario": "baso", "banco": "Santander", "color": "#EC4899"},
]

# Usuarios iniciales
usuarios_seed = [
    {"username": "baso", "nombre": "Baso", "es_admin": True},
    {"username": "juli", "nombre": "Juli", "es_admin": False},
]
```

---

## 13. Comando de inicio para el agente

**Empezar por aquí — Tarea 1.1:**

```
Inicializar el repositorio del proyecto con la estructura de carpetas definida en la sección 3 de este PLAN.md.
Crear todos los archivos base vacíos (con su contenido mínimo funcional):
- docker-compose.yml (sección 8)
- deploy.sh
- frontend/package.json con las dependencias de sección 2
- frontend/vite.config.ts
- frontend/tailwind.config.ts
- backend/requirements.txt con las dependencias de sección 2
- backend/main.py con FastAPI configurado
- backend/database.py

No avanzar a la tarea 1.2 sin confirmar que la estructura compila y los contenedores levantan.
```

---

*Última actualización: Abril 2026 | Proyecto: Gastos Familiares | Deploy: RPI 3B+*
