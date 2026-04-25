---
trigger: always_on
---

# Reglas de Desarrollo — Gastos Familiares
> Convenciones obligatorias para el agente. Aplicar en cada archivo generado sin excepción.

---

## 1. Git — Ramas y commits

### Nomenclatura de ramas
```
main          → producción estable (deploy en RPI)
dev           → integración de features
feat/nombre   → nueva funcionalidad
fix/nombre    → corrección de bug
chore/nombre  → tareas de infraestructura, deps, config
```

**Ejemplos correctos:**
```
feat/formulario-nuevo-gasto
feat/simulador-cuotas
fix/calculo-monto-cuota
fix/filtro-fecha-movimientos
chore/docker-compose-nginx
chore/seed-movimientos
```

### Commits — Conventional Commits en español
```
feat:    nueva funcionalidad
fix:     corrección de bug
chore:   cambios de infraestructura o dependencias
refactor: refactor sin cambio de comportamiento
style:   cambios de CSS/UI sin lógica
test:    agregar o modificar tests
docs:    documentación
```

**Ejemplos correctos:**
```
feat: agregar formulario de nuevo gasto con preview de cuotas
fix: corregir filtro de fecha en cálculo de cuotas activas
chore: actualizar docker-compose con servicio nginx
style: aplicar colores por tarjeta en gráfico de barras
refactor: extraer lógica de proyección a servicio independiente
```

**Regla:** Un commit = una cosa. Nunca mezclar fix de backend con cambios de UI en el mismo commit.

---

## 2. Backend — Python / FastAPI

### Estructura de archivos
```
routers/      → un archivo por dominio (movimientos.py, dashboard.py, etc.)
services/     → lógica de negocio pura, sin FastAPI (cuotas.py, simulador.py)
models/       → modelos SQLModel, uno por entidad
schemas/      → Pydantic schemas de request/response si difieren del modelo
```

### Convenciones de nombres
```python
# Funciones: snake_case con verbo
def get_cuotas_mes(mes: int, anio: int) -> float: ...
def create_movimiento(data: MovimientoCreate, db: Session) -> Movimiento: ...
def delete_movimiento(id: int, db: Session) -> None: ...

# Modelos SQLModel: PascalCase
class Movimiento(SQLModel, table=True): ...
class GastoMensual(SQLModel, table=True): ...

# Variables de dominio: español
monto_cuota, fecha_primera_cuota, tarjeta_id, gasto_mensual

# Variables técnicas: inglés
session, engine, router, response, request
```

### Endpoints REST
```
GET    /api/{recurso}           → listar
GET    /api/{recurso}/{id}      → obtener uno
POST   /api/{recurso}           → crear
PUT    /api/{recurso}/{id}      → actualizar completo
PATCH  /api/{recurso}/{id}      → actualizar parcial
DELETE /api/{recurso}/{id}      → eliminar
```

### Manejo de errores
```python
# Siempre usar HTTPException con mensajes descriptivos en español
raise HTTPException(status_code=404, detail="Movimiento no encontrado")
raise HTTPException(status_code=400, detail="La fecha de primera cuota no puede ser futura")

# Nunca retornar 200 con error embebido en el body
# ❌ return {"error": "no encontrado"}
# ✅ raise HTTPException(status_code=404, detail="...")
```

### Tipado estricto
```python
# Siempre tipar parámetros y retornos
def get_cuotas_mes(mes: int, anio: int, db: Session) -> float:
    ...

# Nunca usar Any ni omitir tipos en funciones públicas
```

---

## 3. Frontend — React / TypeScript

### Estructura de archivos
```
components/ui/        → componentes base reutilizables (Button, Card, Badge)
components/layout/    → AppShell, BottomNav, Sidebar, TopBar
components/charts/    → wrappers de Recharts tipados
pages/               → una página por ruta, lógica mínima
hooks/               → custom hooks con prefijo "use"
api/                 → funciones de fetch, una por dominio
stores/              → Zustand stores
types/               → interfaces y tipos TypeScript
```

### Convenciones de nombres
```typescript
// Componentes: PascalCase
NuevoGastoForm.tsx
MetricCard.tsx
CuotasPorTarjetaChart.tsx

// Hooks: camelCase con prefijo "use"
useMovimientos.ts
useDashboard.ts
useSimulador.ts

// Stores: camelCase con sufijo "Store"
authStore.ts
uiStore.ts

// API functions: camelCase con verbo
getDashboard(mes, anio)
createMovimiento(data)
deleteMovimiento(id)
getMovimientos(filters)

// Types/interfaces: PascalCase con sufijo descriptivo
interface MovimientoCreate { ... }
interface DashboardResponse { ... }
type TarjetaColor = string
```

### Reglas de componentes
```typescript
// Máximo 200 líneas por componente — si supera, partir en subcomponentes
// Props siempre tipadas con interface, nunca inline
// ❌ function Card({ title, value }: { title: string, value: number })
// ✅ interface CardProps { title: string; value: number }
//    function Card({ title, value }: CardProps)

// Nunca usar "any"
// Nunca hacer fetch directo en componentes — siempre via React Query hooks
// Nunca usar localStorage para tokens — httpOnly cookies
```

### Formato de números en pesos argentinos
```typescript
// SIEMPRE usar esta función para mostrar montos
export const formatARS = (n: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(n)
// Output: $ 1.236.062

// Para valores compactos en gráficos
export const formatARSCompact = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${n}`
}
// Output: $1.2M | $443k | $500
```

---

## 4. Variables de entorno

### Backend (.env)
```bash
SECRET_KEY=           # JWT secret — nunca hardcodear
DATABASE_URL=         # sqlite:///./data/gastos.db
CLAUDE_API_KEY=       # Fase 3 — categorización IA
ALLOWED_ORIGINS=      # https://gastos.tudominio.com
```

### Frontend (.env)
```bash
VITE_API_URL=         # URL base del backend
```

**Regla:** Nunca commitear archivos `.env`. Siempre están en `.gitignore`. Proveer `.env.example` con claves vacías.

---

## 5. Docker y deploy

### Workflow obligatorio
```bash
# 1. Desarrollar localmente
# 2. Commit y push a GitHub
git add . && git commit -m "feat: ..." && git push origin feat/nombre

# 3. En RPI — deploy.sh
git pull
docker compose down
docker compose up -d --build
```

### Reglas Docker
- Cada servicio tiene su propio `Dockerfile`
- No usar `docker compose up` sin `-d` en producción
- Volumen `./data` siempre mapeado para persistir SQLite
- Variables de entorno via `.env`, nunca hardcodeadas en `docker-compose.yml`

---

## 6. Checklist antes de cada commit

- [ ] TypeScript sin errores (`tsc --noEmit`)
- [ ] Sin `console.log` en código de producción
- [ ] Sin `any` en TypeScript
- [ ] Variables de entorno en `.env`, no hardcodeadas
- [ ] Probado en viewport 375px (DevTools mobile)
- [ ] Probado en desktop 1280px
- [ ] Commit message sigue la convención