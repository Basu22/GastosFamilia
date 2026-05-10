from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class PrestamoBase(BaseModel):
    entidad: str
    descripcion: str
    monto_total: float
    cuotas: int
    fecha_primera_cuota: date
    notas: Optional[str] = None

class PrestamoCreate(PrestamoBase):
    pass

class PrestamoUpdate(BaseModel):
    entidad: Optional[str] = None
    descripcion: Optional[str] = None
    monto_total: Optional[float] = None
    cuotas: Optional[int] = None
    fecha_primera_cuota: Optional[date] = None
    notas: Optional[str] = None
    mes_edicion: Optional[int] = None
    anio_edicion: Optional[int] = None

class PrestamoResponse(PrestamoBase):
    id: int
    monto_cuota: float
    fecha_ultima_cuota: date

    class Config:
        from_attributes = True
