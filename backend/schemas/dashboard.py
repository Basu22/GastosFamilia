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
    total_mes: float
    ingreso: float

class ProxVencimiento(BaseModel):
    descripcion: str
    tarjeta_nombre: str
    tarjeta_color: str
    cuotas_restantes: int # 1 o 2
    monto_cuota: float

class DashboardSummary(BaseModel):
    mes: int
    anio: int
    ingreso: float
    total_cuotas: float
    total_gastos_mensuales: float
    total_mes: float
    ahorro_proyectado: float
    cuotas_por_tarjeta: List[CuotaTarjeta]
    proximos_6_meses: List[ProyeccionMes]
    proximos_vencimientos: List[ProxVencimiento]

class MovimientoDebug(BaseModel):
    descripcion: str
    monto_cuota: float
    fecha_primera: str
    fecha_ultima: str
    activo_en_mes: bool

class DebugCuotasResponse(BaseModel):
    total: float
    detalle: List[MovimientoDebug]
