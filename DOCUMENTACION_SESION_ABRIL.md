# Documentación de Mejoras — Abril 2026

## 1. Sistema de Versionado de Gastos e Ingresos Fijos (Timeline)

Se implementó una arquitectura de "línea de tiempo" para todos los ítems recurrentes. Esto permite actualizar montos (aumentos de sueldo, incrementos de servicios) sin corromper los datos históricos de meses anteriores.

### Lógica de "Split" (División)
Al editar un gasto o ingreso marcado como `es_fijo`:
- **Si se edita en un mes posterior al de su creación**: El sistema detecta que es una actualización de futuro.
- **Acción en el registro original**: Se le asigna una fecha de fin (`mes_fin`, `anio_fin`) correspondiente al mes anterior al de la edición.
- **Acción de creación**: Se crea un nuevo registro con los datos actualizados, que comienza en el mes de la edición y continúa hacia adelante.

### Cambios en Base de Datos
Se agregaron las columnas `mes_fin` e `anio_fin` a las tablas `gastomensual` e `ingreso`.
- Si ambas son `NULL`, el registro es válido indefinidamente hacia el futuro.
- Si tienen valor, el registro deja de contarse en los totales y de aparecer en las listas a partir del mes siguiente al indicado.

---

## 2. Automatización de Infraestructura

### Auto-Migraciones
Se integró un sistema de **Auto-Migración** en el arranque del backend (`database.py`).
- Cada vez que el contenedor inicia, verifica la existencia de las columnas necesarias.
- Si no existen (como en un nuevo deploy o en la Raspberry), las crea automáticamente mediante SQL directo.
- Esto elimina la necesidad de correr scripts de migración manuales por SSH.

### Compatibilidad de Entornos
Se ajustó la estructura de paquetes de Python (`__init__.py`) para asegurar que los imports funcionen de manera idéntica en:
- Localhost (Docker Desktop / WSL)
- Servidor de Producción (Raspberry Pi / Linux nativo)

---

## 3. Mejoras en Interfaz de Usuario (Dashboard)

### Categorías Persistentes
Se modificó el renderizado de grupos en el Dashboard para que las categorías (Ingresos, Gastos Fijos, Gastos Variados) sean visibles permanentemente, incluso si no tienen movimientos en el mes consultado. Esto permite:
- Mantener una UI consistente.
- Utilizar el botón `+` (Inline Create) de forma inmediata sin navegar a otras pantallas.

### Estado Inicial Colapsado
Para optimizar la carga visual y el foco del usuario, todas las secciones de movimientos en el Dashboard arrancan **colapsadas** por defecto. El usuario expande manualmente la sección que desea gestionar.

### Visualización de Datos
- Se integró `LabelList` en los gráficos de barras para mostrar importes internos.
- Se implementó una política de **No Truncamiento** en las descripciones de los movimientos para asegurar legibilidad total de los conceptos.

---

## 4. Referencia Técnica para Desarrolladores

- **Archivo de Lógica Crítica**: `backend/routers/dashboard.py` (Filtrado por rango de validez).
- **Archivos de Persistencia**: `backend/models/gasto_mensual.py`, `backend/models/ingreso.py`.
- **Componente Core Frontend**: `frontend/src/pages/Dashboard.tsx` (Gestión de estados de colapso y visibilidad).
- **Endpoint de Edición**: `backend/routers/gastos_mensuales.py` y `backend/routers/ingresos.py` (Lógica de split/versionado).

---
*Documentación generada el 28 de Abril de 2026.*
