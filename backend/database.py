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
    """Crea todas las tablas definidas en los modelos y maneja migraciones."""
    # Importar todos los modelos para que SQLModel los registre
    from models.usuario import Usuario
    from models.tarjeta import Tarjeta
    from models.movimiento import Movimiento
    from models.gasto_mensual import GastoMensual
    from models.ingreso import Ingreso
    from models.proyeccion_override import ProyeccionOverride
    from models.importacion import GmailImporterConfig, ImportacionLog

    # 1. Crear tablas si no existen
    SQLModel.metadata.create_all(engine)

    # 2. Migraciones Automáticas (Agregar columnas nuevas si faltan)
    import sqlite3
    # Extraer el path de la DB desde la URL (sqlite:///./data/gastos.db -> ./data/gastos.db)
    db_path = engine.url.database if engine.url.database else "data/gastos.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Columnas a agregar
        nuevas_columnas = ["mes_fin", "anio_fin"]
        tablas = ["gastomensual", "ingreso"]
        
        for tabla in tablas:
            # Obtener info de columnas existentes
            cursor.execute(f"PRAGMA table_info({tabla})")
            columnas_actuales = [row[1] for row in cursor.fetchall()]
            
            for col in nuevas_columnas:
                if col not in columnas_actuales:
                    print(f"🚀 Migración automática: Agregando {col} a tabla {tabla}...")
                    cursor.execute(f"ALTER TABLE {tabla} ADD COLUMN {col} INTEGER")

        # Migración para logs de importación
        cursor.execute("PRAGMA table_info(importacionlog)")
        columnas_actuales = [row[1] for row in cursor.fetchall()]
        if "fecha_vencimiento" not in columnas_actuales:
            print("🚀 Migración automática: Agregando fecha_vencimiento a tabla importacionlog...")
            cursor.execute("ALTER TABLE importacionlog ADD COLUMN fecha_vencimiento TEXT")
        if "incluir_en_arca" not in columnas_actuales:
            print("🚀 Migración automática: Agregando incluir_en_arca a tabla importacionlog...")
            cursor.execute("ALTER TABLE importacionlog ADD COLUMN incluir_en_arca INTEGER DEFAULT 1")

        # Migración para GmailImporterConfig
        cursor.execute("PRAGMA table_info(gmailimporterconfig)")
        columnas = [row[1] for row in cursor.fetchall()]
        if "tipo_parser" not in columnas:
            cursor.execute("ALTER TABLE gmailimporterconfig ADD COLUMN tipo_parser TEXT DEFAULT 'referente'")
        if "incluir_en_arca" not in columnas:
            cursor.execute("ALTER TABLE gmailimporterconfig ADD COLUMN incluir_en_arca INTEGER DEFAULT 1")
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠️ Error en migración automática: {e}")


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
        if not usuarios_existentes:
            print("🌱 Iniciando seed de usuarios y tarjetas...")

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

            # Tarjetas iniciales (simplificado para el seed)
            tarjetas_seed = [
                Tarjeta(nombre="VISA", banco="Macro BMA", titular="Baso", color="#3B82F6"),
                Tarjeta(nombre="VISA", banco="Galicia", titular="Juli", color="#8B5CF6"),
                Tarjeta(nombre="MASTER", banco="Galicia", titular="Juli", color="#EF4444"),
                Tarjeta(nombre="CENCOSUD", banco="Cencosud", titular="Juli", color="#10B981"),
                Tarjeta(nombre="GALICIA", banco="Galicia", titular="Moni", color="#F59E0B"),
                Tarjeta(nombre="MASTER", banco="Macro BMA", titular="Baso", color="#64748B"),
                Tarjeta(nombre="BBVA", banco="BBVA", titular="Juli", color="#06B6D4"),
                Tarjeta(nombre="ICBC", banco="ICBC", titular="Baso", color="#6366F1"),
                Tarjeta(nombre="SANTANDER", banco="Santander", titular="Sele", color="#EC4899"),
            ]
            for t in tarjetas_seed:
                session.add(t)

            session.commit()
            print("✅ Seed completado: 2 usuarios + 9 tarjetas")

    # Seed independiente para Gmail Importer Configs (puede correr después del inicial)
    with Session(engine) as session:
        from models.importacion import GmailImporterConfig
        configs_existentes = session.exec(select(GmailImporterConfig)).first()
        if not configs_existentes:
            print("🌱 Iniciando seed de Configs de Gmail...")
            configs_seed = [
                GmailImporterConfig(
                    remitente="facturacion@email.personal.com.ar",
                    etiqueta_gmail="Personal",
                    referente="1002577507810001",
                    descripcion="Línea Móvil (11)44063833 + (11)50535029"
                ),
                GmailImporterConfig(
                    remitente="facturacion@email.personal.com.ar",
                    etiqueta_gmail="Personal",
                    referente="1002577507810003",
                    descripcion="Línea Móvil (11)60430151"
                ),
                GmailImporterConfig(
                    remitente="facturacion@email.personal.com.ar",
                    etiqueta_gmail="Personal",
                    referente="1002577507810004",
                    descripcion="Servicio de Flow"
                )
            ]
            for c in configs_seed:
                session.add(c)
            session.commit()
            print("✅ Seed completado: 3 configuraciones de Gmail")

        # Solo insertar si no existen
        edesur = session.exec(
            select(GmailImporterConfig).where(GmailImporterConfig.descripcion == "Edesur")
        ).first()

        if not edesur:
            nuevas_configs = [
                GmailImporterConfig(
                    remitente="noresponder@facturas.edesur.com.ar",
                    etiqueta_gmail="CASA/Edesur",
                    referente="",
                    descripcion="Edesur",
                    tipo_parser="html_body",
                    incluir_en_arca=True,
                ),
                GmailImporterConfig(
                    remitente="no-reply@starlink.com",
                    etiqueta_gmail="CASA/Starlink",
                    referente="",
                    descripcion="Starlink",
                    tipo_parser="pdf",
                    incluir_en_arca=True,
                ),
                GmailImporterConfig(
                    remitente="expensas@smtp.fincasallsports.com.ar",
                    etiqueta_gmail="CASA/Fincas de San Vicente",
                    referente="",
                    descripcion="Fincas de San Vicente - Expensas",
                    tipo_parser="pdf",
                    incluir_en_arca=False,
                ),
            ]
            for c in nuevas_configs:
                session.add(c)
            session.commit()
            print("✅ Seed: 3 nuevas configs de Gmail (Edesur, Starlink, Fincas)")
