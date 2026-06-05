from sqlmodel import Session, create_engine, select
from backend.database import get_session
from backend.models.reserva import Reserva

engine = create_engine("sqlite:///backend/data/gastos.db")
session = Session(engine)

r = session.exec(select(Reserva)).first()
if r:
    print(type(r.fecha_baja), type(r.created_at))
