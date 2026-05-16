from sqlmodel import SQLModel, Field
from datetime import date

class Reserva(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    nombre: str
    color: str = "#64748B"
    descripcion: str | None = None
    activa: bool = True
    monto_fijo_mensual: float = Field(default=0.0)
    fecha_baja: date | None = Field(default=None)
    created_at: date = Field(default_factory=date.today)
