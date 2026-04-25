from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List

class Tarjeta(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str
    usuario: str
    banco: Optional[str] = None
    tipo: Optional[str] = None
    activa: bool = Field(default=True)
    color: Optional[str] = None

    # Relationship to Movimientos
    movimientos: List["Movimiento"] = Relationship(back_populates="tarjeta")
