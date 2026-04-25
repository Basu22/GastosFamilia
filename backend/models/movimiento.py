from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import date, datetime

class Movimiento(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tarjeta_id: Optional[int] = Field(default=None, foreign_key="tarjeta.id")
    descripcion: str
    categoria: Optional[str] = None
    monto_total: float
    cuotas: int = Field(default=1)
    monto_cuota: float
    fecha_primera_cuota: date
    fecha_ultima_cuota: date
    notas: Optional[str] = None
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    creado_por: Optional[str] = None

    # Relationship to Tarjeta
    tarjeta: Optional["Tarjeta"] = Relationship(back_populates="movimientos")
