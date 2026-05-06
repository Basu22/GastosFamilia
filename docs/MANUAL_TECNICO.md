# Manual Técnico — Gastos Familiares

Este documento detalla la arquitectura, el modelo de datos y los procesos técnicos del sistema. Es la guía para el mantenimiento y escalabilidad del código.

---

## 1. Arquitectura del Sistema
El sistema se despliega mediante **Docker Compose** en una Raspberry Pi y utiliza una red interna para la comunicación entre servicios.

- **Frontend**: React + Vite + TypeScript. Servido por Nginx en puerto 80 (interno).
- **Backend**: FastAPI + SQLModel + SQLite. Escuchando en puerto 8000 (interno).
- **Proxy**: Nginx Unificado que actúa como gateway para múltiples apps.
- **Túnel**: Cloudflare Tunnel para exposición segura a internet.

---

## 2. Modelo de Datos (SQLite)

### 2.1. Entidades Principales
- **Movimiento**: Representa una compra. Si tiene `cuotas > 1`, el sistema calcula el impacto mensual dinámicamente.
- **GastoMensual / Ingreso**: Registros de flujo de caja. Si `es_fijo = True`, se proyectan al futuro desde el mes de creación.
- **Tarjeta / MedioPago**: Catálogos de origen de fondos.
- **Categoria**: Catálogo de clasificación con iconos de Lucide.

### 2.2. Lógica de Cuotas
La comparación de cuotas activas se realiza mediante **Mes Absoluto** para evitar problemas con los días del mes:
`mes_absoluto = (año * 12) + mes`

---

## 3. Servicios Especiales

### 3.1. Importador Gmail (`backend/services/gmail_importer.py`)
- Se conecta vía OAuth2 a la API de Gmail.
- Busca correos de proveedores específicos (Personal, Flow, Edesur).
- Utiliza Regex y Parsers de PDF para extraer montos y fechas.
- Se ejecuta automáticamente mediante un cron job o manualmente desde la UI.

### 3.2. Proyección Financiera (`backend/services/proyeccion.py`)
- Calcula el balance esperado para los próximos 12 meses.
- Soporta **Overrides**: Permite al usuario editar manualmente el valor proyectado de un mes sin alterar el registro base.

---

## 4. Infraestructura y Deploy

### 4.1. Proceso de Actualización
1. **Desarrollo**: Cambios en PC local.
2. **Push**: Subida a GitHub.
3. **Pull**: Descarga en Raspberry Pi.
4. **Deploy**: Ejecución de `./deploy.sh`.
   - Reconstruye imágenes Docker.
   - Sincroniza credenciales (`credentials/`).
   - Reinicia el Proxy Nginx para limpiar el caché de DNS.

### 4.2. Variables de Entorno
- **Backend**: `SECRET_KEY`, `DATABASE_URL`, `ALLOWED_ORIGINS`.
- **Frontend**: `VITE_API_URL`.

---

## 5. Troubleshooting (Resolución de Problemas)
- **502 Bad Gateway**: Generalmente causado por el caché de DNS de Nginx. Solución: `docker restart proxy_unificado`.
- **Errores de Build (TS)**: El compilador `tsc` en producción es estricto. No permite variables no usadas ni errores de tipo `any`.
- **Token Gmail expirado**: Si falla la importación, borrar `credentials/gmail_token.json` y re-autenticar localmente.
