from sqlmodel import SQLModel, Field
from datetime import date

class AjusteReserva(SQLModel, table=True):
    __tablename__ = "ajuste_reserva"

    id: int | None = Field(default=None, primary_key=True)
    tipo: str  # "reasignacion" | "liberacion"
    reserva_origen_id: int = Field(foreign_key="reserva.id")
    reserva_destino_id: int | None = Field(default=None, foreign_key="reserva.id")
    monto: float
    mes: int
    anio: int
    notas: str | None = None
    created_at: date = Field(default_factory=date.today)
