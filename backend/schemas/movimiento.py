from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date

class MovimientoCreate(BaseModel):
    tarjeta_id: Optional[int] = None
    descripcion: str
    categoria: Optional[str] = None
    monto_total: float = Field(gt=0, description="El monto total de la compra debe ser mayor a 0")
    cuotas: int = Field(ge=1, description="La cantidad de cuotas debe ser al menos 1")
    fecha_primera_cuota: date
    notas: Optional[str] = None

class MovimientoUpdate(BaseModel):
    tarjeta_id: Optional[int] = None
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    monto_total: Optional[float] = Field(None, gt=0)
    cuotas: Optional[int] = Field(None, ge=1)
    fecha_primera_cuota: Optional[date] = None
    notas: Optional[str] = None

class MovimientoResponse(BaseModel):
    id: int
    tarjeta_id: Optional[int] = None
    tarjeta_nombre: str
    tarjeta_color: Optional[str] = None
    descripcion: str
    categoria: Optional[str]
    monto_total: float
    cuotas: int
    monto_cuota: float
    fecha_primera_cuota: date
    fecha_ultima_cuota: date
    notas: Optional[str]

class CuotaPreview(BaseModel):
    mes: int
    anio: int
    monto_cuota: float

class MovimientoPreview(BaseModel):
    monto_total: float
    cuotas: int
    monto_cuota: float
    fecha_primera_cuota: date
    fecha_ultima_cuota: date
    desglose: List[CuotaPreview]
