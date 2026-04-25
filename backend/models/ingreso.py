from sqlmodel import SQLModel, Field
from typing import Optional

class Ingreso(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    descripcion: str = Field(default="Sueldo")
    monto: float
    mes: int
    anio: int
    es_fijo: bool = Field(default=False)
    notas: Optional[str] = None
