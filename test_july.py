import asyncio
from sqlmodel import Session, create_engine
from backend.database import get_session
from backend.routers.dashboard import get_dashboard_summary
from backend.schemas.dashboard import DashboardSummary

engine = create_engine("sqlite:///backend/data/gastos.db")
session = Session(engine)

try:
    summary = get_dashboard_summary(mes=7, anio=2026, session=session)
    valid_summary = DashboardSummary.model_validate(summary.model_dump())
    print("Success validation")
except Exception as e:
    import traceback
    traceback.print_exc()

