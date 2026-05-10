from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date, datetime


class Prestamo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    entidad: str = Field(description="Banco o entidad que otorgó el préstamo")
    descripcion: str
    categoria: Optional[str] = None
    cuotas: int = Field(default=1)
    fecha_primera_cuota: date
    fecha_ultima_cuota: date
    notas: Optional[str] = None
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    creado_por: Optional[str] = None
