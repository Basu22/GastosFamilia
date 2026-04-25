"""
database.py — Configuración de base de datos SQLite con SQLModel.
Incluye creación de tablas y seed de datos iniciales.
"""

import os
from passlib.context import CryptContext
from sqlmodel import SQLModel, Session, create_engine, select

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/gastos.db")

# SQLite: habilitar WAL para mejor concurrencia
connect_args = {"check_same_thread": False}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_db_and_tables():
    """Crea todas las tablas definidas en los modelos."""
    # Importar todos los modelos para que SQLModel los registre
    from models.usuario import Usuario
    from models.tarjeta import Tarjeta
    from models.movimiento import Movimiento
    from models.gasto_mensual import GastoMensual
    from models.ingreso import Ingreso
    from models.proyeccion_override import ProyeccionOverride

    SQLModel.metadata.create_all(engine)


def get_session():
    """Dependencia de FastAPI para obtener sesión de DB."""
    with Session(engine) as session:
        yield session


def seed_initial_data():
    """Carga datos iniciales si la DB está vacía."""
    from models.usuario import Usuario
    from models.tarjeta import Tarjeta

    with Session(engine) as session:
        # Solo hacer seed si no hay usuarios
        usuarios_existentes = session.exec(select(Usuario)).first()
        if usuarios_existentes:
            return

        print("🌱 Iniciando seed de datos...")

        # Usuarios iniciales
        usuarios_seed = [
            Usuario(
                username="baso",
                nombre="Baso",
                password_hash=pwd_context.hash("cambiar-password"),
                es_admin=True,
            ),
            Usuario(
                username="juli",
                nombre="Juli",
                password_hash=pwd_context.hash("cambiar-password"),
                es_admin=False,
            ),
        ]
        for u in usuarios_seed:
            session.add(u)

        # Tarjetas iniciales
        tarjetas_seed = [
            Tarjeta(nombre="BASO VISA",      usuario="baso", banco="Santander", tipo="visa",     color="#3B82F6", activa=True),
            Tarjeta(nombre="JULI VISA",      usuario="juli", banco="Santander", tipo="visa",     color="#8B5CF6", activa=True),
            Tarjeta(nombre="JULI MASTER",    usuario="juli", banco="ICBC",      tipo="master",   color="#EF4444", activa=True),
            Tarjeta(nombre="JULI CENCOSUD",  usuario="juli", banco="Cencosud",  tipo="cencosud", color="#10B981", activa=True),
            Tarjeta(nombre="MONI GALICIA",   usuario="baso", banco="Galicia",   tipo="visa",     color="#F59E0B", activa=True),
            Tarjeta(nombre="BASO MASTER",    usuario="baso", banco="Santander", tipo="master",   color="#64748B", activa=True),
            Tarjeta(nombre="JULI BBVA",      usuario="juli", banco="BBVA",      tipo="visa",     color="#06B6D4", activa=True),
            Tarjeta(nombre="BASO ICBC",      usuario="baso", banco="ICBC",      tipo="master",   color="#6366F1", activa=True),
            Tarjeta(nombre="SELE SANTANDER", usuario="baso", banco="Santander", tipo="master",   color="#EC4899", activa=True),
        ]
        for t in tarjetas_seed:
            session.add(t)

        session.commit()
        print("✅ Seed completado: 2 usuarios + 9 tarjetas")
