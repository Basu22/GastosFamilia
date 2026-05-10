from sqlmodel import SQLModel, Field
from typing import Optional


class CuotaPrestamo(SQLModel, table=True):
    __tablename__ = "cuota_prestamo"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    prestamo_id: int = Field(foreign_key="prestamo.id", index=True)
    numero_cuota: int = Field(description="Número de cuota (1-based)")
    mes: int = Field(ge=1, le=12)
    anio: int = Field(gt=2000)
    monto: float = Field(gt=0, description="Importe real de esta cuota")
