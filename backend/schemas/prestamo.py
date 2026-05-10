from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


class CuotaPrestamoInput(BaseModel):
    numero_cuota: int
    mes: int = Field(ge=1, le=12)
    anio: int = Field(gt=2000)
    monto: float = Field(gt=0)


class CuotaPrestamoResponse(BaseModel):
    id: int
    prestamo_id: int
    numero_cuota: int
    mes: int
    anio: int
    monto: float

    class Config:
        from_attributes = True


class PrestamoCreate(BaseModel):
    entidad: str
    descripcion: str
    categoria: Optional[str] = None
    cuotas: int = Field(ge=1)
    fecha_primera_cuota: date
    notas: Optional[str] = None
    detalle_cuotas: List[CuotaPrestamoInput]


class PrestamoUpdate(BaseModel):
    entidad: Optional[str] = None
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    cuotas: Optional[int] = None
    fecha_primera_cuota: Optional[date] = None
    notas: Optional[str] = None
    detalle_cuotas: Optional[List[CuotaPrestamoInput]] = None


class PrestamoResponse(BaseModel):
    id: int
    entidad: str
    descripcion: str
    categoria: Optional[str] = None
    cuotas: int
    monto_total: float
    fecha_primera_cuota: date
    fecha_ultima_cuota: date
    notas: Optional[str] = None
    detalle_cuotas: List[CuotaPrestamoResponse] = []

    class Config:
        from_attributes = True
