from sqlmodel import SQLModel, Field
from typing import Optional

class GastoMensual(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    descripcion: str
    categoria: Optional[str] = None
    monto: float
    mes: int
    anio: int
    es_fijo: bool = Field(default=False)
    mes_fin: Optional[int] = Field(default=None)
    anio_fin: Optional[int] = Field(default=None)
    tarjeta_id: Optional[int] = Field(default=None, foreign_key="tarjeta.id")
    notas: Optional[str] = None
