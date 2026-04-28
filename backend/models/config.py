from sqlmodel import SQLModel, Field
from typing import Optional

class MedioPago(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str
    tipo: str = "Efectivo" # Efectivo, Tarjeta, Debito, etc.
    color: str = "#3B82F6"
    activo: bool = True

class Categoria(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str
    icono: str = "Tag" # Nombre del icono de Lucide
    color: str = "#64748B"
    activa: bool = True
