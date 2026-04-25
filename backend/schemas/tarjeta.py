from pydantic import BaseModel, Field
from typing import Optional

class TarjetaCreate(BaseModel):
    nombre: str
    usuario: str
    banco: Optional[str] = None
    tipo: Optional[str] = None
    color: Optional[str] = None
    activa: bool = True

class TarjetaUpdate(BaseModel):
    nombre: Optional[str] = None
    usuario: Optional[str] = None
    banco: Optional[str] = None
    tipo: Optional[str] = None
    color: Optional[str] = None
    activa: Optional[bool] = None

class TarjetaResponse(BaseModel):
    id: int
    nombre: str
    usuario: str
    banco: Optional[str]
    tipo: Optional[str]
    activa: bool
    color: Optional[str]
