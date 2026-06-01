from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class GastoMensualCreate(BaseModel):
    descripcion: str
    categoria: Optional[str] = None
    monto: float = Field(gt=0)
    mes: int = Field(ge=1, le=12)
    anio: int = Field(gt=2000)
    es_fijo: bool = False
    tarjeta_id: Optional[int] = None
    reserva_id: Optional[int] = None
    notas: Optional[str] = None

class GastoMensualUpdate(BaseModel):
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    monto: Optional[float] = Field(None, gt=0)
    mes: Optional[int] = Field(None, ge=1, le=12)
    anio: Optional[int] = Field(None, gt=2000)
    es_fijo: Optional[bool] = None
    tarjeta_id: Optional[int] = None
    reserva_id: Optional[int] = None
    notas: Optional[str] = None
    mes_edicion: Optional[int] = None
    anio_edicion: Optional[int] = None

class GastoMensualResponse(BaseModel):
    id: int
    descripcion: str
    categoria: Optional[str]
    monto: float
    mes: int
    anio: int
    es_fijo: bool
    tarjeta_id: Optional[int] = None
    reserva_id: Optional[int] = None
    notas: Optional[str]
    activo: Optional[bool] = True
    fecha_baja: Optional[date] = None
