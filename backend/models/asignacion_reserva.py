from sqlmodel import SQLModel, Field
from datetime import date

class AsignacionReserva(SQLModel, table=True):
    __tablename__ = "asignacion_reserva"

    id: int | None = Field(default=None, primary_key=True)
    reserva_id: int = Field(foreign_key="reserva.id")
    mes: int
    anio: int
    monto: float
    notas: str | None = None
    created_at: date = Field(default_factory=date.today)
