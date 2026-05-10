from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CompraDeseadaCreate(BaseModel):
    descripcion: str
    categoria: Optional[str] = None
    precio_estimado: Optional[float] = None
    prioridad: str = "media"
    notas: Optional[str] = None

class CompraDeseadaUpdate(BaseModel):
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    precio_estimado: Optional[float] = None
    prioridad: Optional[str] = None
    estado: Optional[str] = None
    notas: Optional[str] = None
    comprado_en: Optional[datetime] = None

class CompraDeseadaResponse(BaseModel):
    id: int
    descripcion: str
    categoria: Optional[str]
    precio_estimado: Optional[float]
    prioridad: str
    estado: str
    notas: Optional[str]
    comprado_en: Optional[datetime]
    creado_en: datetime

    class Config:
        from_attributes = True
