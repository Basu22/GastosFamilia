from pydantic import BaseModel, Field
from typing import Optional

class IngresoCreate(BaseModel):
    descripcion: str = "Sueldo"
    monto: float = Field(gt=0)
    mes: int = Field(ge=1, le=12)
    anio: int = Field(gt=2000)
    es_fijo: bool = False
    notas: Optional[str] = None

class IngresoUpdate(BaseModel):
    descripcion: Optional[str] = None
    monto: Optional[float] = Field(None, gt=0)
    mes: Optional[int] = Field(None, ge=1, le=12)
    anio: Optional[int] = Field(None, gt=2000)
    es_fijo: Optional[bool] = None
    notas: Optional[str] = None

class IngresoResponse(BaseModel):
    id: int
    descripcion: str
    monto: float
    mes: int
    anio: int
    es_fijo: bool
    notas: Optional[str]
