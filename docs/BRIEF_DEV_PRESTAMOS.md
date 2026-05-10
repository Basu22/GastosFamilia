# 📋 BRIEF TÉCNICO: Módulo de Préstamos Bancarios (Variable)
## Para: Dev Jr (Gemini Flash) — Actualizado: Sistema de Cuotas Manuales

---

## ⛔ AVISO CRÍTICO DE SEGURIDAD
El archivo `backend/services/gemini_parser.py` está **BAJO CANDADO**. No modificar.

---

## 1. CONTEXTO DEL REDISEÑO
Originalmente, el sistema de préstamos calculaba una cuota fija (`monto_total / cuotas`). Esto era insuficiente para préstamos con cuotas variables o donde el usuario ya conoce los importes exactos de antemano.

**Cambio realizado en Mayo 2026 (Semana 4):**
Pasamos de un cálculo automático a un **sistema de carga granular**. El usuario define cuántas cuotas tiene el préstamo, y el sistema genera una fila por cada cuota para que el usuario ingrese el importe real de cada mes.

---

## 2. EL MODELO DE DATOS (Relación 1:N)

### `backend/models/prestamo.py`
Ahora el `Prestamo` es una cabecera simplificada. Los montos viven en la tabla hija.

```python
class Prestamo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    entidad: str                    # "Banco Galicia", "ICBC", etc.
    descripcion: str                # "Préstamo Personal"
    cuotas: int                     # Cantidad total de cuotas
    fecha_primera_cuota: date       # Mes de inicio
    notas: Optional[str] = None
    categoria: Optional[str] = None # Categoría para métricas

class CuotaPrestamo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    prestamo_id: int = Field(foreign_key="prestamo.id")
    numero_cuota: int               # 1, 2, 3...
    mes: int
    anio: int
    monto: float                    # Importe específico de ese mes
```

---

## 3. LÓGICA DE NEGOCIO

### 3.1. Carga Manual
1. El usuario ingresa Entidad y Cantidad de Cuotas (ej: 24).
2. El sistema genera 24 casilleros en el frontend con el Mes/Año correspondiente.
3. El usuario completa los importes reales.
4. El backend guarda la cabecera y las N cuotas en una sola transacción.

### 3.2. Proyecciones y Dashboard
Ya no se busca el `monto_cuota` en el objeto `Prestamo`. 
- **Dashboard**: Busca en `CuotaPrestamo` filtrando por `mes == M` y `anio == A`.
- **Proyecciones**: Itera sobre los próximos meses y suma los montos de `CuotaPrestamo` que coincidan con cada período proyectado.

---

## 4. API ENDPOINTS (`backend/routers/prestamos.py`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/prestamos/` | Retorna préstamos con su lista de `detalle_cuotas` |
| POST | `/api/prestamos/` | Crea el préstamo y sus cuotas asociadas |
| PUT | `/api/prestamos/{id}` | Actualiza cabecera y reemplaza/actualiza las cuotas |
| DELETE | `/api/prestamos/{id}` | Elimina cabecera (cascada a cuotas) |

---

## 5. FRONTEND (`frontend/src/pages/Movimientos.tsx`)

### UI de Carga
- Al cambiar la fecha o la cantidad de cuotas, se ejecuta `generarDetalleCuotas`.
- Se muestra un grid compacto de inputs (`NumericFormat`) para cada mes.
- Se calcula un "Total Cargado" en tiempo real para control del usuario.

---

## 6. REGLA DE ORO PARA EL DASHBOARD
En `backend/routers/dashboard.py`, el cálculo de préstamos debe ser:
```python
cuotas_prestamo_mes = session.exec(
    select(CuotaPrestamo).where(CuotaPrestamo.mes == mes, CuotaPrestamo.anio == anio)
).all()
total_prestamos = sum(cp.monto for cp in cuotas_prestamo_mes)
```

---

*Brief actualizado por Antigravity — Arquitecto Sr — 10/05/2026*
