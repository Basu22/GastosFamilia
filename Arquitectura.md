# Arquitectura de Sistema — AURA (Gastos Familiares)
> Última actualización consolidada: Junio 2026

Este documento constituye la fuente única de verdad técnica, de infraestructura y de datos para el proyecto **AURA — Gastos Familiares**. Centraliza y unifica toda la documentación previa del sistema para facilitar su mantenimiento, extensión y despliegue.

---

## ⛔ ZONA RESTRINGIDA — ARCHIVOS CON CANDADO DE SEGURIDAD

Para garantizar la estabilidad del núcleo del sistema, existen archivos críticos que **NO pueden ser modificados sin autorización explícita y justificación detallada ante el Product Owner**:

| Archivo / Componente | Motivo |
|:---|:---|
| `backend/services/gemini_parser.py` | Integra el modelo de IA `gemini-2.5-flash` mediante la librería `google-genai`. Cualquier alteración en sus prompts o estructura de datos puede romper el parseo automático multimodal. |
| `backend/services/gmail_importer.py` | Gestiona la autenticación OAuth2 de Google API y el análisis de facturas por correo. Contiene credenciales y flujos de análisis de alta sensibilidad. |
| `backend/services/cuotas.py` | Lógica central y matemáticamente validada para calcular la vigencia de cuotas de tarjetas de crédito y amortizaciones. |

---

## 1. Visión General del Producto y Negocio

**AURA — Gastos Familiares** es una plataforma web monorepo y un asistente conversacional móvil concebidos para centralizar la gestión de las finanzas de un grupo familiar. Su foco no es solo la contabilidad fría, sino proveer claridad, previsión y una interfaz "etérica" y calma.

### 1.1. Problema y Solución
El seguimiento manual de las compras en cuotas de múltiples tarjetas de crédito, préstamos personales de tasa variable y suscripciones mensuales recurrentes suele fragmentar la información familiar. AURA consolida estos datos en un único flujo de caja, proyecta los saldos a 12 meses y simplifica la entrada de información a través de una aplicación web responsive y un chatbot inteligente de WhatsApp.

### 1.2. Miembros de la Familia y Roles
- **Basilio (BASO)**: Titular de tarjetas VISA Baso, MASTER Baso, ICBC Baso. Administrador del sistema.
- **Julieta (JULI)**: Titular de tarjetas VISA Juli, MASTER Juli, CENCOSUD Juli, BBVA Juli. Usuaria.
- **Mónica (MONI)**: Titular de tarjeta GALICIA Moni.
- **Selene (SELE)**: Titular de tarjeta SANTANDER Sele.

---

## 2. Stack Tecnológico

El proyecto se desarrolla bajo una estructura de monorepo simplificada:

### 2.1. Backend
- **Tecnología Base**: Python 3.11.
- **Framework**: FastAPI (v0.111.0) con servidor ASGI Uvicorn (v0.29.0).
- **ORM / Capa de Datos**: SQLModel (v0.0.19) - que combina SQLAlchemy y Pydantic para validación y persistencia de schemas unificados.
- **Base de Datos**: SQLite (almacenado en `data/gastos.db`).
- **Planificación de Tareas**: APScheduler (v3.10.4) para la importación periódica de facturas desde Gmail.
- **Integraciones principales**:
  - `google-genai` (>=v0.5.0) para interactuar con Google Gemini 2.5 Flash.
  - `python-jose` (v3.3.0) + `passlib[bcrypt]` (v1.7.4) para el flujo de login y JWT (JSON Web Tokens).
  - `pdfminer.six` y `pdfplumber` para la extracción de texto en archivos adjuntos de facturas.
  - `httpx` (v0.27.0) para clientes HTTP asíncronos (comunicación con Meta Cloud API).

### 2.2. Frontend
- **Framework**: React 18 / Vite / TypeScript (en modo estricto).
- **Enrutamiento**: React Router Dom v7.
- **Capa de Estado y API**: 
  - Zustand (v5.0.5) para el estado del cliente (autenticación).
  - React Query (TanStack Query v5) para la caché de datos de servidor y sincronización asíncrona.
- **Visualización de Datos**: Recharts (v2.15.3) para los gráficos interactivos de proyección y barras.
- **Estilos**: Tailwind CSS v3.4 con diseño responsive Mobile-First y tema personalizado Aura.
- **Iconografía**: Lucide React.

---

## 3. Arquitectura de Infraestructura y Despliegue

AURA se despliega localmente en el hogar de la familia sobre un servidor doméstico de bajo consumo (**Raspberry Pi 4**).

```
                             [ Red Externa ]
                                    │
                            Cloudflare Tunnel
                                    │ (HTTPS seguro)
                             [ Raspberry Pi ]
                                    │
                       Nginx Reverse Proxy (Puerto 80)
                        ├── /     → Frontend React SPA (Nginx Interno)
                        └── /api/ → Backend FastAPI (Uvicorn :8000)
                                        │
                                   SQLModel ORM
                                        │
                                   SQLite DB
                             (Volumen ./data/gastos.db)
```

### 3.1. Dockerización del Entorno
El sistema corre bajo **Docker Compose** aislando tres servicios principales:

#### A) docker-compose.yml
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    container_name: gastos-backend
    restart: unless-stopped
    volumes:
      - ./backend:/app
      - ./data:/app/data
    environment:
      - DATABASE_URL=sqlite:///./data/gastos.db
      - SECRET_KEY
      - ALLOWED_ORIGINS
      - GEMINI_API_KEY
      - WHATSAPP_TOKEN
      - PHONE_NUMBER_ID
      - WHATSAPP_VERIFY_TOKEN
      - WHATSAPP_APP_SECRET
      - WHATSAPP_NUMEROS_AUTORIZADOS
    networks:
      - gastos_net

  frontend:
    build: ./frontend
    container_name: gastos-frontend
    restart: unless-stopped
    ports:
      - "8082:80"
    depends_on:
      - backend
    networks:
      - gastos_net

  cloudflare-tunnel:
    image: cloudflare/cloudflared:latest
    container_name: gastos_tunnel
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - frontend
    profiles:
      - production
    networks:
      - gastos_net

networks:
  gastos_net:
    driver: bridge
```

#### B) Backend Dockerfile
Usa la imagen base `python:3.11-slim`. Instala `gcc` (para compilar bcrypt y librerías de encriptación) y luego instala las dependencias de `requirements.txt`. El volumen `./data` en el host mapea a `/app/data` en el contenedor para persistir el archivo de base de datos SQLite. Ejecuta el servidor uvicorn en el puerto `8000`.

#### C) Frontend Dockerfile (Multi-stage)
- **Fase de Construcción**: Usa `node:20-alpine`, descarga dependencias y compila la SPA (`npm run build`).
- **Fase de Servido**: Usa `nginx:alpine` para servir el build estático. Inyecta una configuración local de Nginx que:
  - Resuelve peticiones estáticas en el directorio raíz.
  - Setea directivas de `no-cache` para evitar almacenamiento de versiones viejas del HTML.
  - Proxyea de forma transparente todas las peticiones bajo el prefijo `/api/` hacia el endpoint del backend en `http://gastos-backend:8000`.
  - Soporta el enrutamiento del lado del cliente mediante la directiva `try_files $uri $uri/ /index.html`.

### 3.2. Scripts del Ciclo de Vida del Proyecto
- **`deploy.sh`**: Script para despliegue automático en la Raspberry Pi. Realiza un `git pull` de la rama `main`, actualiza las variables del entorno, copia credenciales OAuth de Gmail y reconstruye los contenedores de Docker Compose.
- **`start-dev-local.sh`**: Inicia el entorno local de desarrollo. Ejecuta el backend (FastAPI con `--reload`) y el frontend (Vite dev server) de manera paralela controlando puertos y matando procesos previos.
- **`reset_db.sh`**: Elimina el archivo `data/gastos.db` y ejecuta el script de inicialización de SQLModel recreando el esquema de cero.
- **`startup.sh`**: Script de inicialización de la app. Restablece la base de datos y ejecuta importaciones iniciales desde un archivo histórico de Excel.
- **`check_integrity.sh`**: Script pre-deploy para verificar que no falten archivos clave en backend y frontend, y ejecuta el chequeo de tipos de TypeScript en el frontend (`npx tsc --noEmit`).

---

## 4. Estructura de Datos (SQLModel / SQLite)

AURA implementa un esquema de base de datos relacional dinámico pero liviano utilizando **SQLite**.

### 4.1. Configuración de Base de Datos
La conexión se inicializa en `backend/database.py`. SQLite se configura en modo **WAL (Write-Ahead Logging)** para permitir múltiples lecturas simultáneas y evitar bloqueos en operaciones de escritura. Se aplica `check_same_thread=False` para compatibilidad asíncrona con FastAPI.

#### Migraciones Automáticas
El sistema no utiliza Alembic. En su lugar, el arranque en `database.py` chequea la estructura de las tablas existentes mediante consultas a `PRAGMA table_info()` de SQLite y ejecuta sentencias `ALTER TABLE ADD COLUMN` dinámicamente si detecta columnas nuevas en los modelos SQLModel.

### 4.2. Diagrama de Relaciones de Base de Datos

```
                    ┌──────────────┐
                    │   Reserva    │
                    └──────┬───────┘
                           │ 1
                           │
                           │ 0..*
 ┌──────────────┐   ┌──────▼───────┐   ┌────────────────┐
 │   Tarjeta    ├───┤  Movimiento  ├───┤  Medio de Pago  │
 └──────┬───────┘ 1 │ (Tarjeta)    │ 1 └────────────────┘
        │           └──────────────┘
        │ 1
        ├──────────────────────┐
        │ 0..*                 │ 0..*
 ┌──────▼───────┐       ┌──────▼───────┐
 │ GastoMensual │       │   Ingreso    │
 └──────────────┘       └──────────────┘

 ┌──────────────┐ 1     ┌────────────────┐
 │   Prestamo   ├───────┤ CuotaPrestamo  │
 └──────────────┘  0..* └────────────────┘

 ┌──────────────────┐   ┌────────────────┐
 │ProyeccionOverride│   │ CompraDeseada  │
 └──────────────────┘   └────────────────┘

 ┌──────────────┐       ┌────────────────┐
 │   Usuario    │       │  WhatsappLog   │
 └──────────────┘       └────────────────┘
```

### 4.3. Diccionario de Entidades

#### 1. Usuario (`usuario`)
Representa los perfiles de la aplicación para control de acceso y logins.
* `id`: `Optional[int]` (PK, Auto)
* `username`: `str` (Único, Indexado)
* `password_hash`: `str` (Hash Bcrypt de la contraseña)
* `nombre`: `Optional[str]` (Nombre amigable para mostrar en UI)
* `es_admin`: `bool` (Default `False`)

#### 2. Tarjeta (`tarjeta`)
Catálogo de plásticos y límites de crédito de la familia.
* `id`: `Optional[int]` (PK, Auto)
* `nombre`: `str` (Ej: "VISA", "MASTER")
* `usuario`: `str` (Nombre del miembro titular, ej: "Baso", "Juli")
* `banco`: `Optional[str]` (Ej: "Santander", "Galicia")
* `tipo`: `Optional[str]` (Crédito, Débito)
* `activa`: `bool` (Flag de eliminación lógica, default `True`)
* `color`: `Optional[str]` (Representación hex color, ej: `#3B82F6`)

#### 3. Movimiento (`movimiento`)
Registra transacciones de compras puntuales o en cuotas efectuadas a través de tarjetas de crédito o afectando a una reserva de ahorros.
* `id`: `Optional[int]` (PK, Auto)
* `tarjeta_id`: `Optional[int]` (FK -> `tarjeta.id`)
* `reserva_id`: `Optional[int]` (FK -> `reserva.id`, opcional para consumos de ahorros)
* `descripcion`: `str` (Nombre del gasto o comercio)
* `categoria`: `Optional[str]` (Ej: "Supermercado", "Servicios")
* `monto_total`: `float` (Importe total de la compra)
* `cuotas`: `int` (Número de cuotas de la compra, default `1`)
* `monto_cuota`: `float` (Monto unitario mensual, calculado como `monto_total / cuotas`)
* `fecha_primera_cuota`: `date` (Primer mes de impacto en el flujo mensual)
* `fecha_ultima_cuota`: `date` (Último mes en el que impacta, calculado por lógica del backend)
* `notas`: `Optional[str]`
* `creado_en`: `datetime` (Default `now()`)
* `creado_por`: `Optional[str]` (Identifica si fue cargado vía web, excel o bot de WhatsApp)

#### 4. GastoMensual (`gasto_mensual`)
Gastos fijos recurrentes (ej: luz, streaming) o gastos específicos de un mes determinado.
* `id`: `Optional[int]` (PK, Auto)
* `descripcion`: `str`
* `categoria`: `Optional[str]`
* `monto`: `float`
* `mes`: `int` (Mes de inicio)
* `anio`: `int` (Año de inicio)
* `es_fijo`: `bool` (Determina si se proyecta indefinidamente cada mes)
* `mes_fin`: `Optional[int]` (Mes finalizador en caso de baja o cambio de monto)
* `anio_fin`: `Optional[int]` (Año finalizador en caso de baja o cambio de monto)
* `tarjeta_id`: `Optional[int]` (FK -> `tarjeta.id`, medio de pago asociado)
* `reserva_id`: `Optional[int]` (FK -> `reserva.id`, reserva de ahorros asociada)
* `notas`: `Optional[str]`
* `activo`: `Optional[bool]` (Flag de baja lógica, default `True`)
* `fecha_baja`: `Optional[date]` (Fecha exacta del registro de la baja)

#### 5. Ingreso (`ingreso`)
Entradas monetarias recurrentes o extraordinarias. Posee la misma estructura temporal que los gastos fijos.
* `id`: `Optional[int]` (PK, Auto)
* `descripcion`: `str` (Default "Sueldo")
* `categoria`: `Optional[str]`
* `monto`: `float`
* `mes`: `int`
* `anio`: `int`
* `es_fijo`: `bool` (Default `False`)
* `mes_fin`: `Optional[int]`
* `anio_fin`: `Optional[int]`
* `notas`: `Optional[str]`

#### 6. Prestamo (`prestamo`)
Cabecera para préstamos personales tomados por el grupo familiar. El monto total es dinámico.
* `id`: `Optional[int]` (PK, Auto)
* `entidad`: `str` (Banco o financiera)
* `descripcion`: `str`
* `cuotas`: `int` (Cantidad total de cuotas pactadas)
* `fecha_primera_cuota`: `date` (Mes/Año del pago de la cuota número 1)
* `categoria`: `Optional[str]` (Default "Préstamo")
* `notas`: `Optional[str]`
* `creado_en`: `datetime`
* `creado_por`: `Optional[str]`

#### 7. CuotaPrestamo (`cuota_prestamo`)
Detalle de importes de cada cuota individual de un préstamo. Permite montos variables por inflación/tasas (UVA/UVI).
* `id`: `Optional[int]` (PK, Auto)
* `prestamo_id`: `int` (FK -> `prestamo.id`, indexado)
* `numero_cuota`: `int` (Índice de la cuota, ej: 1, 2, 3...)
* `mes`: `int` (Período mensual en el que se abona)
* `anio`: `int` (Período anual en el que se abona)
* `monto`: `float` (Importe exacto cobrado ese mes)

#### 8. ProyeccionOverride (`proyeccion_override`)
Permite sobreescribir temporalmente el monto proyectado de un ingreso o gasto para un mes en particular.
* `id`: `Optional[int]` (PK, Auto)
* `tipo`: `str` ("ingreso" o "gasto_mensual")
* `referencia_id`: `int` (Identificador del registro original que se sobreescribe)
* `mes`: `int`
* `anio`: `int`
* `monto`: `float` (Monto que reemplaza al valor proyectado original en el mes/año indicados)
* `notas`: `Optional[str]`

#### 9. GmailImporterConfig (`gmail_importer_config`)
Reglas de importación automatizada de emails para mapear a gastos mensuales fijos.
* `id`: `Optional[int]` (PK, Auto)
* `remitente`: `str` (Dirección de email que envía la factura, ej: `facturacion@email.personal.com.ar`)
* `etiqueta_gmail`: `str` (Etiqueta o label a buscar en el inbox)
* `referente`: `str` (Número identificador del cliente o servicio en la factura)
* `descripcion`: `str` (Nombre amigable a asignar al gasto, ej: "Personal Flow")
* `activo`: `bool` (Default `True`)
* `tipo_parser`: `str` (Mecanismo de parseo: `"referente"`, `"html_body"` o `"pdf"`)
* `incluir_en_arca`: `bool` (Si el gasto se lista en los resúmenes impositivos presentados)

#### 10. ImportacionLog (`importacion_log`)
Auditoría e historial de ejecuciones del importador automático.
* `id`: `Optional[int]` (PK, Auto)
* `fecha`: `str` (Fecha de ejecución en formato ISO)
* `referente`: `str`
* `descripcion`: `str`
* `monto`: `float`
* `mes`: `int`
* `anio`: `int`
* `fecha_vencimiento`: `Optional[str]` ("YYYY-MM-DD")
* `incluir_en_arca`: `bool`
* `accion`: `str` ("creado", "actualizado", "sin_cambios", "error")
* `detalle`: `str`

#### 11. MedioPago (`medio_pago`)
Tipos de pago complementarios.
* `id`: `Optional[int]` (PK, Auto)
* `nombre`: `str`
* `tipo`: `str` ("Efectivo", "Billetera Digital", "Débito")
* `color`: `str` (Representación hex color)
* `activo`: `bool` (Default `True`)

#### 12. Categoria (`categoria`)
Administración de categorías y tags del sistema.
* `id`: `Optional[int]` (PK, Auto)
* `nombre`: `str`
* `tipo`: `str` ("Gasto", "Ingreso" o "Ambos")
* `icono`: `str` (Nombre de ícono Lucide, ej: "Tag")
* `color`: `str`
* `activa`: `bool` (Default `True`)

#### 13. CompraDeseada (`compra_deseada`)
Lista de compras planificadas o deseos familiares (Wishlist).
* `id`: `Optional[int]` (PK, Auto)
* `descripcion`: `str` (Artículo o servicio deseado)
* `categoria`: `Optional[str]`
* `precio_estimado`: `Optional[float]`
* `prioridad`: `str` (Chips de prioridad: `"alta"`, `"media"`, `"baja"`)
* `estado`: `str` (Estado actual: `"pendiente"`, `"comprado"`)
* `notas`: `Optional[str]`
* `comprado_en`: `Optional[datetime]` (Fecha y hora al marcar como comprado)
* `creado_en`: `datetime` (Default `utcnow`)

#### 14. WhatsappLog (`whatsapp_log`)
Auditoría completa del canal conversacional de WhatsApp.
* `id`: `Optional[int]` (PK, Auto)
* `telefono`: `str` (Número internacional del remitente)
* `tipo_mensaje`: `str` ("texto", "imagen", "audio", "pdf")
* `mensaje_recibido`: `Optional[str]` (Mensaje enviado o transcripción de audio)
* `respuesta_enviada`: `Optional[str]` (Respuesta del bot)
* `estado`: `str` (Ciclo de confirmación: `"pendiente"`, `"confirmado"`, `"cancelado"`)
* `datos_extraidos`: `Optional[str]` (JSON estructurado extraído por la IA)
* `creado_en`: `datetime` (Default `utcnow`)

#### 15. Reserva (`reserva`)
Fondos y metas de ahorro del grupo familiar.
* `id`: `Optional[int]` (PK, Auto)
* `nombre`: `str` (Ej: "Vacaciones 2027")
* `color`: `str` (Hexadecimal)
* `descripcion`: `Optional[str]`
* `activa`: `bool` (Default `True`)
* `monto_fijo_mensual`: `float` (Importe de asignación mensual automatizada)
* `fecha_baja`: `Optional[date]`
* `created_at`: `date` (Default hoy)

#### 16. AsignacionReserva (`asignacion_reserva`)
Aportes explícitos mensuales a una reserva específica.
* `id`: `Optional[int]` (PK, Auto)
* `reserva_id`: `int` (FK -> `reserva.id`)
* `mes`: `int`
* `anio`: `int`
* `monto`: `float`
* `notas`: `Optional[str]`
* `created_at`: `date`

#### 17. AjusteReserva (`ajuste_reserva`)
Traspasos de dinero entre reservas (reasignación) o consumo/liberación al flujo disponible general.
* `id`: `Optional[int]` (PK, Auto)
* `tipo`: `str` ("reasignacion" o "liberacion")
* `reserva_origen_id`: `int` (FK -> `reserva.id`)
* `reserva_destino_id`: `Optional[int]` (FK -> `reserva.id`, requerido solo si tipo es reasignacion)
* `monto`: `float`
* `mes`: `int`
* `anio`: `int`
* `notas`: `Optional[str]`
* `created_at`: `date`

---

## 5. Lógica de Negocio y Reglas de Negocio Centrales

### 5.1. Comparación por Mes Absoluto
Para prevenir bugs generados por cálculos con desbordes de fin de año o diferencias de zona horaria, el sistema opera con valores de **Mes Absoluto**:
$$\text{mes\_absoluto} = \text{anio} \times 12 + \text{mes}$$

Cualquier ítem temporal (cuotas de tarjeta, gastos mensuales, ingresos, cuotas de préstamos, reasignaciones) se considera activo o vigente en un mes bajo la consulta de un período si:
$$\text{mes\_inicio\_absoluto} \le \text{mes\_consulta\_absoluto} \le \text{mes\_fin\_absoluto}$$
Si el ítem no tiene fecha de fin (`mes_fin` o `anio_fin` en `None`), su valor de fin absoluto se evalúa como `999999` (infinito).

### 5.2. Mapeo de Egresos por Tarjeta (Descalce de 1 Mes)
Para gastos variables vinculados a una tarjeta de crédito, el impacto real del pago se calcula con **descalce de 1 mes** (lógica de cobro al mes siguiente). El sistema calcula dinámicamente si el consumo ingresa en el período en curso o se desplaza al período subsiguiente de acuerdo al día de cierre configurado para dicha tarjeta.

### 5.3. Módulo de Préstamos (1:N Manual)
Pasó de ser un promedio simple calculado a una carga modular granular para lidiar con la inflación argentina y cuotas UVA/UVI variables:
1. El usuario define la cabecera del préstamo (`entidad`, `cuotas`, `fecha_primera_cuota`).
2. El frontend despliega automáticamente un grid de $N$ inputs para que el usuario complete cada mes con el importe real.
3. El backend almacena las $N$ filas de `CuotaPrestamo` vinculadas en una sola transacción.
4. Para la liquidación mensual, el Dashboard y el motor de Proyecciones obtienen el monto real directo de `CuotaPrestamo` en base al mes y año de consulta, evitando estimaciones.

### 5.4. Baja Lógica de Gastos Fijos
Cuando un usuario descontrata un servicio (ej: Netflix), el gasto no debe borrarse, ya que de lo contrario se perdería el registro de egreso en el histórico de balances:
1. El usuario presiona "Dar de baja" en un mes determinado $M$.
2. El backend realiza un `PATCH` que setea `mes_fin = M - 1` (último mes de vigencia), `activo = False`, y asigna la fecha de baja.
3. A partir del mes $M$, la proyección ya no sumará este gasto.
4. En el mes $M - 1$, el listado de movimientos mostrará el item tachado y opaco, con la opción de reactivarlo (que simplemente borra `mes_fin` y vuelve a marcarlo como `activo = True`).

### 5.5. Lista de Compras (Conversión a Gasto)
La lista de compras (wishlist) es independiente y no impacta el balance. Al marcarse como comprada, ofrece dos flujos:
- **Solo confirmar**: Pasa al histórico colapsado de comprados.
- **Registrar como Gasto**: Navega al formulario de egresos de la app pre-completando la descripción y el monto estimado para agilizar la carga.

---

## 6. Integraciones y Servicios Especiales

### 6.1. Extracción de Tickets e IA (Gemini 2.5 Flash) 🔒
- **Función**: `backend/services/gemini_parser.py` (LOCKED).
- **Proceso**: Recibe bytes de archivos (PDFs de facturas, fotos de tickets, audios de voz en formato OGG) y ejecuta una llamada estructurada a la API de Gemini 2.5 Flash con un prompt robusto.
- **Resultado**: Devuelve estrictamente un objeto JSON que detalla: `descripcion` normalizada, `monto`, `tipo` (gasto vs movimiento), `es_fijo`, cantidad de `cuotas`, sugerencia de tarjeta del listado oficial, nivel de confianza, y justificación.

```python
# Mapeo estricto del parser de IA para tarjetas conocidas
TARJETAS_DISPONIBLES = [
    "VISA Baso", "VISA Juli", "MASTER Juli", "CENCOSUD Juli",
    "GALICIA Moni", "MASTER Baso", "BBVA Juli", "ICBC Baso", "SANTANDER Sele"
]
```

### 6.2. Importador de Correo Electrónico (Gmail API) 🔒
- **Función**: `backend/services/gmail_importer.py` (LOCKED).
- **Mapeo**: Registra un cron job ejecutado mediante APScheduler dos veces al día (06:00 y 23:00).
- **OAuth2**: Utiliza credenciales de cliente OAuth almacenadas en `backend/credentials/gmail_token.json`.
- **Mecanismos de Parseo**:
  - **Filtro de Referente**: Scanea emails de servicios como Personal/Flow buscando referentes específicos e inyecta montos.
  - **HTML Body Parser**: Descarga y extrae datos directos de correos (ej: Edesur).
  - **PDF Attachment Parser**: Descarga adjuntos y lee el stream del PDF usando `pdfplumber` (ej: Starlink, expensas Fincas).

### 6.3. WhatsApp Bot y Webhook (Meta Business API)
AURA integra un chatbot para interactuar con Meta Cloud API.

```
Usuario ──[Mensaje de Voz/Foto/PDF]──▶ Meta Cloud API ──[Webhook HTTPS]──▶ FastAPI
                                                                             │
                                                                   Background Task
                                                                             │
   FastAPI ◀──[Respuesta del Bot: Confirmar?]── whatsapp_sender ◀────────────┘
```

1. **GET `/api/whatsapp/webhook`**: Endpoint que valida el `hub.challenge` y el token de verificación con la plataforma de Meta developers.
2. **POST `/api/whatsapp/webhook`**: Endpoint de recepción de mensajes. Valida la firma `X-Hub-Signature-256` utilizando HMAC-SHA256 y la clave secreta `WHATSAPP_APP_SECRET`. Si la verificación es correcta, delega el procesamiento de forma asíncrona a un `BackgroundTasks` de FastAPI y retorna un código `200` de forma inmediata.
3. **Control de Sesión**: La clase `whatsapp_sessions` almacena temporalmente (TTL de 10 minutos) las confirmaciones pendientes en memoria por número telefónico. Este almacenamiento incluye:
   - `estado`: Estado conversacional actual (`esperando_confirmacion`, `esperando_tarjeta`, `esperando_cuotas`, `esperando_reserva`).
   - `tarjetas_temp` y `reservas_temp`: Listados numerados en caché para facilitar la selección.
4. **Flujo Conversacional Interactivo**:
   - **Registro de Gasto**: Al recibir un ticket/texto, el bot formatea los datos y pre-selecciona el medio sugerido. Invita al usuario a confirmar (`OK`) o cambiar el medio enviando:
     - `1`: Cambia el pago a Efectivo/Transferencia (tipo `gasto_mensual`).
     - `2`: Muestra un listado de todas las **Tarjetas** activas en base de datos. Al responder el número de tarjeta, solicita ingresar la cantidad de **Cuotas** antes de retornar al resumen.
     - `3`: Muestra un listado de todas las **Reservas** activas en base de datos para financiar la compra directamente desde allí.
     - En cualquier sub-menú, enviar `0` o `volver` retorna al paso anterior.
   - **Comando Global `opciones`**: Enviar `opciones` o `ver pagos` en cualquier momento muestra una lista con todas las tarjetas y reservas activas registradas en el sistema.
   - **Corrección**: Si el usuario envía texto libre con datos numéricos o aclaraciones, el bot re-analiza el mensaje y regenera el borrador.

---

## 7. Diseño de Interfaz y Buenas Prácticas

### 7.1. Mobile First
- **Viewport base**: Optimizado estrictamente para pantallas de **375px** de ancho de forma nativa.
- **Tailwind**: Utilizar clases sin prefijos responsivos para el layout mobile por defecto. Reservar los prefijos `sm:`, `md:`, `lg:`, `xl:` para escalar de forma ascendente a desktop.
- **Facilidad Táctil**: Todos los botones de acción e inputs de texto del sistema deben tener una **altura mínima de 44px** (generalmente controlado con `py-3` o `h-11`) para evitar errores de touch.
- **Tamaño de texto**: Mínimo `text-base` (16px) en inputs de formularios. Esto previene que el navegador móvil (iOS / Safari) fuerce un zoom automático molesto al hacer foco.

### 7.2. Paleta Aura (Ethereal Dark Mode)
Para mitigar la fatiga visual de la familia, AURA implementa un modo oscuro etéreo de marca:
- **Fondo General**: `#0F1219` (Deep Slate - azul grisáceo ultra oscuro).
- **Cards y Superficies**: `#1E293B` con opacidad del 60% al 80% (`backdrop-filter: blur(12px)`).
- **Bordes y Divisiones**: `#334155` (bajos contrastes).
- **Aura Mint (Ingresos)**: `#A7F3D0` (verde menta pastel).
- **Aura Coral (Egresos)**: `#FCA5A5` (coral cálido en vez de rojo chillón).
- **Aura Lavender (Balance)**: `#C7D2FE` (lavanda).
- **Aura Gold (Avisos)**: `#FDE68A` (dorado apagado).

#### Colores de Tarjetas
El frontend recibe dinámicamente de la base de datos los siguientes colores asignados a las tarjetas y no los hardcodea en el lado del cliente:
- BASO VISA: `#3B82F6` (blue)
- JULI VISA: `#8B5CF6` (violet)
- JULI MASTER: `#EF4444` (red)
- JULI CENCOSUD: `#10B981` (emerald)
- MONI GALICIA: `#F59E0B` (amber)
- BASO MASTER: `#64748B` (slate)
- JULI BBVA: `#06B6D4` (cyan)
- BASO ICBC: `#6366F1` (indigo)
- SELE SANTANDER: `#EC4899` (pink)
*Nota: La visualización del módulo de préstamos se unifica con el color esmeralda `#10B981` directamente desde el backend.*

### 7.3. HTML5 Semántico (Regla Anti-Divs)
Evitar estructuras basadas en anidamientos masivos de `div`.
- Contenedor de página: `<main>`
- Navigations principales: `<nav>`
- Cabeceras de página/cards: `<header>`
- Tarjetas de movimientos u opciones: `<article>`
- Secciones internas: `<section>`

### 7.4. Identificadores Únicos
Todos los elementos interactivos o contenedores principales deben incorporar un atributo `id` descriptivo escrito en formato `kebab-case` bajo la regla: `[pagina]-[componente]-[accion]` (ej: `dashboard-btn-guardar`, `movimientos-tab-prestamos`).

### 7.5. Panel de Sobres / Reservas
El componente de Sobres y Reservas tiene un diseño de tarjeta personalizado con las siguientes especificaciones:
- **Botonera**: Se ubica de forma permanente (siempre visible) en la parte inferior de la tarjeta, centrada horizontalmente. Cuenta con tres botones:
  1. *Fondeo* (ícono verde): Abre el modal de fondeo de la reserva.
  2. *Ajuste* (ícono gris): Abre el modal de reasignación o liberación de saldo.
  3. *Ver Detalle* (ícono de ojo azul): Abre un modal detallado de movimientos (ver item siguiente).
- **Nombre de la Reserva**: Ocupa el 100% de la cabecera de la tarjeta para evitar recortes prematuros del texto.
- **Saldo Acumulado**: Sigue las directrices de tamaño unificadas con la sección de Tarjetas de Crédito, empleando `text-lg font-black`.
- **Información Mensual**: Los montos de "Asignado mes" y "Consumido mes" se presentan con salto de línea entre la etiqueta y el valor, manteniendo los colores semánticos correspondientes (verde para asignación y rojo para consumos).
- **Modal de Detalle (ModalReservaDetalle)**: Al presionar el botón de ver detalle, despliega una vista modal que lista de manera segregada todos los movimientos del mes asociados a la reserva (tanto ingresos/fondeos en verde como consumos/gastos en rojo), incluyendo un pie con los totales asignados y consumidos del período y el saldo actual de la misma. Incorpora además un botón de edición inline (`Edit3`) para los consumos de la reserva que despliega el formulario `InlineEditForm` de manera interactiva, sincronizando de forma automática los saldos del modal y del dashboard tras guardar.
- **Comportamiento del medio de pago en cuotas**: Cuando se selecciona "Efectivo / Transferencia" o un "Sobre / Reserva" como medio de pago en cualquier formulario de creación o edición (por ejemplo, en `Movimientos.tsx`, `InlineCreateForm.tsx` o `InlineEditForm.tsx`), el sistema automáticamente oculta todos los controles de cuotas (forzando `cuotas = 1` y `entryMode = 'total'`) ya que estos medios de pago son inmediatos y no admiten financiamiento.

### 7.6. Módulo de Filtro (Visualización y Detalle de Movimientos)
El antiguo bloque "A Pagar" fue reestructurado y expandido bajo el nombre de **"Filtro"** en el [Dashboard](file:///home/flink/Documentos/Gastos%20Familia/frontend/src/pages/Dashboard.tsx):
- **Estructura de Visualización**:
  - **Por Tarjeta**: Muestra el total consolidado de tarjetas de crédito ordenado bajo el encabezado "A PAGAR". Las tarjetas se visualizan en una grilla simétrica de **3 columnas por fila** en pantallas grandes.
  - **Por Movimiento**: Agrupa e identifica todos los tipos de movimientos (Ingresos, Cuotas de Tarjeta, Gastos Fijos, Gastos Variables, y Efectivo/Transferencias) en una grilla de 3 columnas para optimizar la organización.
- **Detalle Dinámico y Acciones Integradas (ModalTarjetaDetalle)**:
  - Al abrir el modal detallado, se renderiza la lista de consumos. Si se visualiza por Tarjeta, agrupa los ítems por tipo; si se visualiza por Movimiento, los lista de manera plana incluyendo una etiqueta de procedencia de fondos.
  - Cuenta con un botón de adición rápida `+` (en el encabezado de grupo en tarjetas o en el tope del modal en movimientos) que abre el formulario `InlineCreateForm` para registrar nuevos consumos al vuelo sin abandonar el modal.
  - Cada fila posee un botón de edición que despliega el formulario `InlineEditForm` directamente debajo del ítem seleccionado, permitiendo cambios interactivos reactivos.
- **Formateador de Cuotas de Tarjeta (Regex Parser)**:
  - En los modales del módulo de filtros, cuando el movimiento está financiado por tarjeta, se extrae el índice de cuotas (ej: `(X/Y)`) al final de la descripción original mediante una expresión regular (`/\s*\((\d+)\/(\d+)\)$/`).
  - La descripción del movimiento se limpia para remover el sufijo `(X/Y)`.
  - El badge del tipo de consumo se muestra como `CUOTAS` (en plural) y se renderiza de forma contigua el texto en mayúsculas `CUOTA X/Y` en color gris, manteniendo el estilo original de AURA.

---

## 8. Guía de Configuración Inicial (Bot de WhatsApp)

Pasos para registrar el Webhook y configurar la plataforma Meta Cloud API para el bot conversacional familiar.

### 8.1. Prerrequisitos de Configuración
1. **API Key de Gemini**: Obtenida en [aistudio.google.com](https://aistudio.google.com) y cargada bajo la variable `GEMINI_API_KEY` en el archivo `.env`.
2. **App en Meta for Developers**:
   - Crear una app de tipo **Business** en [developers.facebook.com](https://developers.facebook.com).
   - Configurar el producto **WhatsApp**.
   - Registrar un número de teléfono de destino (SIM limpia o número de Twilio).
3. **Tokens de Acceso**:
   - Copiar el **ID del número de teléfono** y el **Token de acceso** de Meta y cargarlos en `.env` (`PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`).
   - Obtener el **App Secret** de la app de Meta y cargarlo como `WHATSAPP_APP_SECRET` para validar la firma de los webhooks de Meta.
4. **Registro del Webhook**:
   - Registrar la URL de callback apuntando a tu servidor externo seguro expuesto en HTTPS: `https://tu-dominio.com/api/whatsapp/webhook`.
   - Utilizar el verify token configurado en `.env` (ej: `gastos_familia_webhook_2026`).
   - Suscribirse a los eventos de tipo **`messages`**.

### 8.2. Variables de Entorno del Sistema (.env)

#### Backend (`backend/.env`)
```bash
SECRET_KEY=clave_secreta_jwt_para_firmar_tokens
DATABASE_URL=sqlite:///./data/gastos.db
ALLOWED_ORIGINS=http://localhost,http://192.168.1.185:8082

# API Keys e Integración Inteligente
GEMINI_API_KEY=AIzaSy...TuAPIKeyDeGoogle
WHATSAPP_APP_SECRET=tu_app_secret_de_meta

# WhatsApp Cloud API
WHATSAPP_TOKEN=EAABc...TokenDeMeta
PHONE_NUMBER_ID=12345678901234
WHATSAPP_VERIFY_TOKEN=gastos_familia_webhook_2026
WHATSAPP_NUMEROS_AUTORIZADOS=5491112345678,5491187654321
```

#### Frontend (`frontend/.env`)
```bash
VITE_API_URL=https://tu-dominio.com
```

---

## 9. Troubleshooting Común

| Síntoma | Causa Frecuente | Solución Sugerida |
|:---|:---|:---|
| **Error 502 Bad Gateway** | El proxy unificado en Raspberry Pi perdió el ruteo interno por caída o reinicio del contenedor del backend. | Correr `docker restart proxy_unificado` y verificar el estado de los servicios con `docker compose ps`. |
| **Error 403 Firma Inválida (WhatsApp)** | La firma de Meta `X-Hub-Signature-256` no coincide con la generada localmente. | Comprobar que `WHATSAPP_APP_SECRET` en `.env` coincida exactamente con la clave de Meta. |
| **Error TypeScript en compilación** | Fallo en variables sin tipo o uso de `any` durante el build. | Correr `cd frontend && npx tsc --noEmit` de forma manual para auditar y tipar las variables. |
| **Pérdida de sesión de confirmación** | Superados los 10 minutos de TTL de la conversación por WhatsApp. | Enviar un nuevo archivo o descripción para re-abrir el estado en `whatsapp_sessions`. |
| **Fallo en sincronización de facturas** | El archivo `gmail_token.json` OAuth2 expiró o fue revocado. | Eliminar `backend/credentials/gmail_token.json` y volver a ejecutar `python backend/scripts/gmail_auth.py` para re-autenticar. |
