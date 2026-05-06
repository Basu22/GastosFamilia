"""
Gastos Familiares — Backend API
FastAPI + SQLModel + SQLite
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import create_db_and_tables, seed_initial_data
from models import config # Importante para que SQLModel cree las tablas
from routers import auth, movimientos, tarjetas, gastos_mensuales, dashboard, importar, ingresos, proyeccion, configuracion, simulador, importaciones

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlmodel import Session
from database import engine
from services.gmail_importer import importar_facturas

load_dotenv()

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost").split(",")


scheduler = AsyncIOScheduler()

def job_importador():
    print("⏰ Ejecutando importador de Gmail automático...")
    with Session(engine) as session:
        importar_facturas(session)
        print("✅ Importación automática finalizada")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ejecuta al iniciar la app: crea tablas y seed inicial."""
    create_db_and_tables()
    seed_initial_data()
    
    # Iniciar cron jobs
    scheduler.add_job(job_importador, 'cron', hour=6, minute=0)
    scheduler.add_job(job_importador, 'cron', hour=23, minute=0)
    scheduler.start()
    
    yield
    
    scheduler.shutdown()


app = FastAPI(
    title="Gastos Familiares API",
    description="API para gestión de gastos familiares con cuotas y proyecciones",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(movimientos.router, prefix="/movimientos", tags=["movimientos"])
app.include_router(tarjetas.router, prefix="/tarjetas", tags=["tarjetas"])
app.include_router(gastos_mensuales.router, prefix="/gastos-mensuales", tags=["gastos-mensuales"])
app.include_router(ingresos.router, prefix="/ingresos", tags=["ingresos"])
app.include_router(importar.router, prefix="/importar", tags=["importar"])
app.include_router(proyeccion.router, prefix="/proyeccion", tags=["proyeccion"])
app.include_router(configuracion.router, prefix="/configuracion", tags=["configuracion"])
app.include_router(simulador.router, prefix="/simulador", tags=["simulador"])
app.include_router(importaciones.router, prefix="/importaciones", tags=["importaciones"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "gastos-backend"}
