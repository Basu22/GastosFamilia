# 📋 BRIEF TÉCNICO: Listado de Compras + WhatsApp Sprint 4
## Para: Dev Jr (Gemini Flash) — Leer COMPLETO antes de escribir una sola línea de código

---

## ⚠️ REGLAS DE SEGURIDAD — LEER PRIMERO, SIN EXCEPCIÓN

> **PROHIBICIÓN ABSOLUTA**: Los siguientes archivos están bajo un candado de seguridad. Bajo **NINGÚN** concepto se permite modificarlos, ni siquiera para "arreglar" o "mejorar" algo:
>
> - `backend/services/gemini_parser.py` → Contiene la integración con Gemini 2.5 Flash. **NO TOCAR.**
> - `backend/services/gmail_importer.py` → Importador de Gmail con PDF. **NO TOCAR.**
> - Cualquier archivo de modelo ya existente en `backend/models/` → Solo crear modelos **nuevos**.
> - Cualquier router o service ya existente: **solo agregar** nuevos. Nunca modificar la firma de funciones ya existentes.
>
> Si detectás que una mejora requiere modificar alguno de estos archivos, **detené el trabajo y consultá** antes de continuar.

---

## 1. CONTEXTO DEL PROYECTO

"Gastos Familiares" es una app de gestión financiera familiar. El stack es:

- **Backend**: Python 3.11 + FastAPI + SQLModel + SQLite
- **Frontend**: React + TypeScript + Vite + TailwindCSS + React Query
- **Infra**: Docker Compose en Raspberry Pi 4, expuesto con Cloudflare Tunnel (HTTPS ya activo)
- **Proyecto**: `/home/flink/Documentos/Gastos Familia/`

### Estructura de archivos clave que YA EXISTEN (no tocar sin permiso):

```
backend/
├── main.py                     ← Aquí se registran los routers. Agregar los nuevos aquí.
├── database.py                 ← get_session(), engine. Importar desde aquí.
├── models/
│   ├── movimiento.py           ← Compras en tarjeta en cuotas
│   ├── gasto_mensual.py        ← Gastos fijos y variables mensuales
│   ├── prestamo.py             ← Préstamos personales
│   ├── ingreso.py              ← Ingresos mensuales
│   └── tarjeta.py              ← Tarjetas de crédito
├── routers/
│   ├── movimientos.py
│   ├── gastos_mensuales.py
│   ├── ingresos.py
│   ├── prestamos.py
│   ├── whatsapp.py             ← Webhook WhatsApp ya implementado (Sprint 1-3 ✅)
│   └── dashboard.py
└── services/
    ├── gemini_parser.py        ← 🔒 CANDADO — NO MODIFICAR
    ├── gmail_importer.py       ← 🔒 CANDADO — NO MODIFICAR
    ├── whatsapp_media.py       ← Descarga archivos desde Meta CDN (ya existe)
    ├── whatsapp_sender.py      ← Envía mensajes de vuelta al usuario (ya existe)
    └── whatsapp_sessions.py    ← Gestiona sesiones pendientes (ya existe)

frontend/src/
├── api/
│   ├── client.ts               ← Axios con baseURL. Importar desde aquí.
│   ├── movimientos.ts
│   ├── gastos_mensuales.ts
│   ├── ingresos.ts
│   ├── prestamos.ts
│   └── tarjetas.ts
├── pages/
│   ├── Dashboard.tsx
│   └── Movimientos.tsx         ← Tiene las pestañas: egresos | tarjetas | ingresos | prestamos
└── components/
    └── ui/
        ├── MetricCard.tsx
        └── ...
```

---

## 2. TAREA A — LISTADO DE COMPRAS (Wishlist)

### 2.1. Qué es

Una **página nueva e independiente** llamada **"Lista de Compras"** que vive en el menú principal de navegación, al mismo nivel que Dashboard, Movimientos, Tarjetas, Proyección, Simulador y Configuración. **NO va como pestaña dentro de Movimientos.** Sirve para registrar cosas que la familia quiere/necesita comprar en el futuro. No tienen fecha ni impacto en el presupuesto hasta que se marcan como "compradas".

### 2.2. Modelo de datos — Backend

Crear el archivo **`backend/models/compra_deseada.py`**:

```python
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class CompraDeseada(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    descripcion: str = Field(description="Nombre del artículo o compra")
    categoria: Optional[str] = None         # "tecnología", "ropa", "hogar", "otro"
    precio_estimado: Optional[float] = None # Puede dejarse vacío
    prioridad: str = Field(default="media") # "alta" | "media" | "baja"
    estado: str = Field(default="pendiente") # "pendiente" | "comprado"
    notas: Optional[str] = None
    comprado_en: Optional[datetime] = None  # Se rellena al marcar como comprado
    creado_en: datetime = Field(default_factory=datetime.utcnow)
```

### 2.3. Schemas — Backend

Crear **`backend/schemas/compra_deseada.py`**:

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CompraDeseadaCreate(BaseModel):
    descripcion: str
    categoria: Optional[str] = None
    precio_estimado: Optional[float] = None
    prioridad: str = "media"
    notas: Optional[str] = None

class CompraDeseadaUpdate(BaseModel):
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    precio_estimado: Optional[float] = None
    prioridad: Optional[str] = None
    estado: Optional[str] = None
    notas: Optional[str] = None
    comprado_en: Optional[datetime] = None

class CompraDeseadaResponse(BaseModel):
    id: int
    descripcion: str
    categoria: Optional[str]
    precio_estimado: Optional[float]
    prioridad: str
    estado: str
    notas: Optional[str]
    comprado_en: Optional[datetime]
    creado_en: datetime

    class Config:
        from_attributes = True
```

### 2.4. Router — Backend

Crear **`backend/routers/compras_deseadas.py`** con los siguientes endpoints:

```
GET    /compras-deseadas/           → Listar todas (filtrables por ?estado=pendiente)
POST   /compras-deseadas/           → Crear nueva
PUT    /compras-deseadas/{id}       → Editar (descripción, precio, prioridad)
PATCH  /compras-deseadas/{id}/comprar → Marcar como comprada (setea estado="comprado" y comprado_en=now())
DELETE /compras-deseadas/{id}       → Eliminar
```

**Registrar el router** en `backend/main.py`:
```python
from routers import compras_deseadas
app.include_router(compras_deseadas.router, prefix="/compras-deseadas", tags=["compras-deseadas"])
```

**IMPORTANTE**: También importar el modelo en `backend/main.py` para que SQLModel cree la tabla:
```python
from models import compra_deseada  # Agregar esta línea junto a los otros imports de models
```

### 2.5. API — Frontend

Crear **`frontend/src/api/compras_deseadas.ts`**:

```typescript
import { apiClient } from './client';

export const getComprasDeseadas = (estado?: string) =>
  apiClient.get('/compras-deseadas/', { params: estado ? { estado } : {} }).then(r => r.data);

export const createCompraDeseada = (data: any) =>
  apiClient.post('/compras-deseadas/', data).then(r => r.data);

export const updateCompraDeseada = (id: number, data: any) =>
  apiClient.put(`/compras-deseadas/${id}`, data).then(r => r.data);

export const marcarComprada = (id: number) =>
  apiClient.patch(`/compras-deseadas/${id}/comprar`).then(r => r.data);

export const deleteCompraDeseada = (id: number) =>
  apiClient.delete(`/compras-deseadas/${id}`).then(r => r.data);
```

### 2.6. Frontend — Página independiente en el menú principal

> ⚠️ **IMPORTANTE**: Lista de Compras es una **página propia**, NO una pestaña dentro de `Movimientos.tsx`. No tocar ese archivo.

**Archivos a crear/modificar:**

#### a) Crear la página: `frontend/src/pages/ListaCompras.tsx`

Estructura de la página (componente principal, máx 200 líneas — extraer subcomponentes si hace falta):

- Header con título "Lista de Compras" + ícono `ShoppingCart`.
- Formulario de carga rápida en la parte superior: campo `descripción` (obligatorio) + `precio estimado` (opcional) + selector de `prioridad` (chips: 🔴 Alta / 🟡 Media / 🟢 Baja) + `categoría` (dropdown).
- Lista de items pendientes con estado visual:
  - Cards con borde izquierdo del color de prioridad (rojo=alta, amarillo=media, verde=baja).
  - Botón "✓ Comprado" que al hacer click muestra un modal de confirmación: *"¿Lo compraste? ¿Querés registrarlo como gasto?"* con dos acciones:
    - **"Solo marcar"** → llama `PATCH /compras-deseadas/{id}/comprar` y queda en la lista de comprados.
    - **"Registrar como gasto"** → navega a `/movimientos` y pre-rellena el form de Gastos Variables con descripción y precio estimado (pasarlos via `useNavigate` + state o query params).
  - Botón de eliminar en cada ítem (con confirmación inline).
- Sección colapsable de **"Comprados"** al final, con items tachados y fecha de compra.
- Empty state cuando lista vacía: `"📝 Tu lista de deseos está vacía. ¡Agregá el primero!"`

#### b) Agregar la ruta: `frontend/src/App.tsx` (o donde esté el router)

Buscar donde están definidas las rutas y agregar:
```tsx
<Route path="/lista-compras" element={<ListaCompras />} />
```

#### c) Agregar el ítem al menú Sidebar: `frontend/src/components/layout/Sidebar.tsx`

El array `menuItems` actualmente tiene:
```typescript
{ name: 'Dashboard',     path: '/dashboard',     icon: LayoutDashboard },
{ name: 'Movimientos',   path: '/movimientos',   icon: PlusCircle },
{ name: 'Tarjetas',      path: '/tarjetas',      icon: CreditCard },
{ name: 'Proyección',    path: '/proyeccion',    icon: BarChart2 },
{ name: 'Simulador',     path: '/simulador',     icon: Calculator },
{ name: 'Configuración', path: '/configuracion', icon: Settings },
```

Agregar **después de Movimientos** (posición 3):
```typescript
{ name: 'Lista Compras', path: '/lista-compras', icon: ShoppingCart },
```

Importar `ShoppingCart` desde lucide-react en la misma línea de imports de íconos.

#### d) Agregar el ítem al BottomNav mobile: `frontend/src/components/layout/BottomNav.tsx`

Leer ese archivo primero para entender su estructura y agregar el ítem `Lista Compras` con el ícono `ShoppingCart`, siguiendo el mismo patrón de los otros ítems.

### 2.7. Diseño — Reglas a seguir

Seguir estrictamente la `docs/GUIA_ESTILO_AURA.md` y las reglas de `docs/rule-design.md`:
- Paleta oscura glass-card con bordes de color semántico.
- Chips de prioridad con variantes: `bg-red-500/20 border-red-500/40 text-red-300` (alta), `bg-amber-500/20 border-amber-500/40 text-amber-300` (media), `bg-emerald-500/20 border-emerald-500/40 text-emerald-300` (baja).
- Touch targets mínimo 44px.
- Mobile-first: 375px primero.
- Precio estimado con `formatARS()` de `../utils/format`.

---

## 3. TAREA B — WHATSAPP SPRINT 4 (Seguridad + UI de estado)

### 3.1. Contexto de lo que ya existe

Los Sprints 1 al 3 del bot de WhatsApp **ya están implementados y funcionando**:

- ✅ `GET /whatsapp/webhook` — Verificación con Meta
- ✅ `POST /whatsapp/webhook` — Recibe mensajes de WhatsApp
- ✅ `services/gemini_parser.py` — Analiza PDF, fotos, voz y texto con Gemini 2.5 Flash
- ✅ `services/whatsapp_media.py` — Descarga archivos de Meta CDN
- ✅ `services/whatsapp_sender.py` — Envía mensajes de respuesta
- ✅ `services/whatsapp_sessions.py` — Gestiona estado de confirmaciones pendientes

### 3.2. Tarea B.1 — Verificación de firma HMAC (Seguridad)

Meta firma cada request con HMAC-SHA256. Hay que validarlo en el webhook para rechazar requests falsos.

Modificar **`backend/routers/whatsapp.py`** para agregar la validación de firma en el `POST /webhook`:

```python
import hmac
import hashlib

APP_SECRET = os.getenv("WHATSAPP_APP_SECRET", "")  # Agregar al .env

def verificar_firma_meta(payload: bytes, signature_header: str) -> bool:
    """Valida que el request viene genuinamente de Meta."""
    if not APP_SECRET or not signature_header:
        return True  # Si no está configurado, dejar pasar (dev mode)
    expected = "sha256=" + hmac.new(
        APP_SECRET.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)
```

En el endpoint `POST /webhook`:
```python
@router.post("/webhook")
async def recibir_mensaje(request: Request, background_tasks: BackgroundTasks):
    body_bytes = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    
    if not verificar_firma_meta(body_bytes, signature):
        raise HTTPException(status_code=403, detail="Firma inválida")
    
    data = json.loads(body_bytes)
    # ... resto del código igual que antes
```

> ⚠️ **Nota**: La variable de entorno `WHATSAPP_APP_SECRET` es el "App Secret" que se encuentra en el panel de Meta for Developers → Tu App → Configuración → Básica. Agregar al `.env` y también documentar en `.env.example`.

### 3.3. Tarea B.2 — Tabla de log de mensajes WhatsApp

Para poder ver desde la app qué mensajes llegaron y cuál fue la respuesta, crear una tabla de log.

Crear **`backend/models/whatsapp_log.py`**:

```python
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class WhatsappLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    telefono: str
    tipo_mensaje: str        # "texto" | "imagen" | "audio" | "pdf"
    mensaje_recibido: Optional[str] = None  # Resumen del contenido
    respuesta_enviada: Optional[str] = None # Texto que se le envió al usuario
    estado: str = Field(default="pendiente") # "pendiente" | "confirmado" | "cancelado"
    datos_extraidos: Optional[str] = None   # JSON como string (resultado de Gemini)
    creado_en: datetime = Field(default_factory=datetime.utcnow)
```

Agregar el import del modelo en `backend/main.py`:
```python
from models import whatsapp_log
```

Modificar `backend/routers/whatsapp.py` para que registre en esta tabla cada vez que se procesa un mensaje. La función `procesar_mensaje` debe guardar un log al inicio y actualizar el estado al final (confirmado/cancelado).

### 3.4. Tarea B.3 — Endpoint para ver logs desde el frontend

Crear **`backend/routers/whatsapp_logs.py`**:

```
GET /whatsapp-logs/         → Listar últimos 50 logs ordenados por fecha DESC
GET /whatsapp-logs/{id}     → Ver detalle de un log específico
DELETE /whatsapp-logs/{id}  → Borrar un log
```

Registrar en `main.py`:
```python
from routers import whatsapp_logs
app.include_router(whatsapp_logs.router, prefix="/whatsapp-logs", tags=["whatsapp-logs"])
```

### 3.5. Tarea B.4 — Panel de WhatsApp en el Frontend

Crear una nueva **página** (no pestaña): **`frontend/src/pages/WhatsappLogs.tsx`**

- Ruta: `/whatsapp` (agregar al router de la app)
- Aparece en la navegación lateral (Desktop: Sidebar) y bottom nav (Mobile) con el ícono `MessageCircle` de Lucide.
- **Contenido**:
  - Header con título "Bot WhatsApp" y badge de estado de conexión (verde si el webhook responde, rojo si no).
  - Lista de mensajes recibidos (tipo de card por log):
    - Ícono del tipo de mensaje (🎤 audio, 📄 PDF, 📸 imagen, ✍️ texto)
    - Teléfono del remitente (mostrar solo los últimos 4 dígitos por privacidad: `****1234`)
    - Fecha y hora
    - Badge de estado: `pendiente` (amber), `confirmado` (emerald), `cancelado` (red)
    - Descripción extraída por Gemini (si existe)
  - Empty state si no hay logs: "📱 Todavía no llegaron mensajes al bot."
  - Botón para borrar un log individual.

---

## 4. ORDEN DE IMPLEMENTACIÓN RECOMENDADO

```
1.  [Backend] Crear modelo CompraDeseada + schema + router + registrar en main.py
2.  [Frontend] Crear api/compras_deseadas.ts
3.  [Frontend] Crear pages/ListaCompras.tsx
4.  [Frontend] Agregar ruta /lista-compras en App.tsx
5.  [Frontend] Agregar ítem 'Lista Compras' en Sidebar.tsx (ShoppingCart icon)
6.  [Frontend] Agregar ítem 'Lista Compras' en BottomNav.tsx
7.  [Backend] Agregar HMAC en whatsapp.py (verificar_firma_meta)
8.  [Backend] Crear modelo WhatsappLog + registrar en main.py
9.  [Backend] Loguear mensajes dentro de procesar_mensaje en whatsapp.py
10. [Backend] Crear router whatsapp_logs.py + registrar en main.py
11. [Frontend] Crear api/whatsapp_logs.ts
12. [Frontend] Crear pages/WhatsappLogs.tsx
13. [Frontend] Agregar ruta /whatsapp y nav items para WhatsappLogs
14. [Git] Un commit por paso, usando Conventional Commits en español
```

---

## 5. CHECKLIST PRE-COMMIT (obligatorio antes de cada commit)

- [ ] TypeScript sin errores (`cd frontend && npx tsc --noEmit`)
- [ ] Sin `console.log` de debug en código de producción
- [ ] Sin `any` en TypeScript (usar tipos explícitos)
- [ ] Variables de entorno nuevas documentadas en `.env.example`
- [ ] Componentes de menos de 200 líneas cada uno (extraer subcomponentes si es necesario)
- [ ] Probado en viewport 375px (mobile) y 1280px (desktop)
- [ ] Commit message en Conventional Commits: `feat:`, `fix:`, `style:`, etc.

---

## 6. REFERENCIAS OBLIGATORIAS

Antes de escribir cualquier componente visual, leer:
- `docs/GUIA_ESTILO_AURA.md` — Paleta de colores, glass-cards, variables CSS
- `docs/MANUAL_TECNICO.md` — Arquitectura general del proyecto
- `docs/MANUAL_BUENAS_PRACTICAS.md` — Convenciones de código

---

> **Recordatorio final**: Ante cualquier duda sobre si un cambio afecta un archivo protegido, **no hagas el cambio** y consultá primero. Es preferible preguntar que romper algo que funciona.
