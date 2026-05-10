from pydantic import BaseModel
from typing import List, Optional

class CuotaTarjeta(BaseModel):
    tarjeta_id: int
    nombre: str
    monto: float
    color: str

class ProyeccionMes(BaseModel):
    mes: int
    anio: int
    total_cuotas: float
    total_prestamos: float = 0.0
    total_mes: float
    ingreso: float

class ProxVencimiento(BaseModel):
    descripcion: str
    tarjeta_nombre: str
    tarjeta_color: str
    cuotas_restantes: int # 1 o 2
    monto_cuota: float

class MovimientoDetalle(BaseModel):
    id: int
    tipo: str # "ingreso", "gasto", "tarjeta"
    origen: str # "Gastos Fijos", "Gastos Variados", "Cuotas", "Ingresos"
    medio_pago: str
    descripcion: str
    monto: float
    monto_total: Optional[float] = None
    cuota_actual: Optional[int] = None
    cuotas_total: Optional[int] = None
    tarjeta_nombre: Optional[str] = None
    tarjeta_color: Optional[str] = None
    es_fijo: bool = False
    previsionado: Optional[bool] = False
    activo: Optional[bool] = True
    fecha_baja: Optional[str] = None
    categoria: Optional[str] = None
    fecha_referencia: str # Para ordenar

class DashboardSummary(BaseModel):
    mes: int
    anio: int
    ingreso: float
    total_cuotas: float
    total_prestamos: float = 0.0
    total_gastos_mensuales: float
    total_mes: float
    ahorro_proyectado: float
    cuotas_por_tarjeta: List[CuotaTarjeta]
    prestamos_por_entidad: List[dict] = []
    proximos_6_meses: List[ProyeccionMes]
    proximos_vencimientos: List[ProxVencimiento]
    gastos_por_categoria: List[dict] = []
    ingresos_por_categoria: List[dict] = []
    movimientos_mes: List[MovimientoDetalle]

class MovimientoDebug(BaseModel):
    descripcion: str
    monto_cuota: float
    fecha_primera: str
    fecha_ultima: str
    activo_en_mes: bool

class DebugCuotasResponse(BaseModel):
    total: float
    detalle: List[MovimientoDebug]
