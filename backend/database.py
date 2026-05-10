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
    from models.prestamo import Prestamo
    from models.cuota_prestamo import CuotaPrestamo

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
            
            # Nueva migración: categoria en ingreso
            if tabla == "ingreso" and "categoria" not in columnas_actuales:
                print("🚀 Migración automática: Agregando categoria a tabla ingreso...")
                cursor.execute("ALTER TABLE ingreso ADD COLUMN categoria TEXT DEFAULT 'Sueldo'")
        
        # Migración para baja lógica en GastoMensual
        cursor.execute("PRAGMA table_info(gastomensual)")
        columnas_actuales = [row[1] for row in cursor.fetchall()]
        if "activo" not in columnas_actuales:
            print("🚀 Migración automática: Agregando activo a tabla gastomensual...")
            cursor.execute("ALTER TABLE gastomensual ADD COLUMN activo INTEGER DEFAULT 1")
        if "fecha_baja" not in columnas_actuales:
            print("🚀 Migración automática: Agregando fecha_baja a tabla gastomensual...")
            cursor.execute("ALTER TABLE gastomensual ADD COLUMN fecha_baja TEXT")

        # Migración para Categoria (tipo)
        cursor.execute("PRAGMA table_info(categoria)")
        columnas_actuales = [row[1] for row in cursor.fetchall()]
        if "tipo" not in columnas_actuales:
            print("🚀 Migración automática: Agregando tipo a tabla categoria...")
            cursor.execute("ALTER TABLE categoria ADD COLUMN tipo TEXT DEFAULT 'Gasto'")

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
        
        # Migración para Prestamo (categoria)
        cursor.execute("PRAGMA table_info(prestamo)")
        columnas_prestamo = [row[1] for row in cursor.fetchall()]
        if "categoria" not in columnas_prestamo:
            print("🚀 Migración automática: Agregando categoria a tabla prestamo...")
            cursor.execute("ALTER TABLE prestamo ADD COLUMN categoria TEXT")

        # Migración de datos: convertir préstamos existentes a cuotas individuales
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='cuota_prestamo'")
        if cursor.fetchone() is None:
            print("🚀 Migración automática: Creando tabla cuota_prestamo...")
            cursor.execute("""
                CREATE TABLE cuota_prestamo (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prestamo_id INTEGER NOT NULL REFERENCES prestamo(id),
                    numero_cuota INTEGER NOT NULL,
                    mes INTEGER NOT NULL,
                    anio INTEGER NOT NULL,
                    monto REAL NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_cuota_prestamo_prestamo_id ON cuota_prestamo(prestamo_id)")
            
            # Migrar datos existentes: crear cuotas individuales con el monto_cuota fijo
            if "monto_cuota" in columnas_prestamo:
                cursor.execute("SELECT id, cuotas, monto_cuota, fecha_primera_cuota FROM prestamo")
                prestamos_existentes = cursor.fetchall()
                from dateutil.relativedelta import relativedelta
                from datetime import date as date_type
                for p_id, p_cuotas, p_monto_cuota, p_fecha_inicio in prestamos_existentes:
                    if p_monto_cuota and p_cuotas:
                        try:
                            fecha = date_type.fromisoformat(p_fecha_inicio)
                            for i in range(p_cuotas):
                                f = fecha + relativedelta(months=i)
                                cursor.execute(
                                    "INSERT INTO cuota_prestamo (prestamo_id, numero_cuota, mes, anio, monto) VALUES (?, ?, ?, ?, ?)",
                                    (p_id, i + 1, f.month, f.year, p_monto_cuota)
                                )
                            print(f"   ✅ Préstamo #{p_id}: {p_cuotas} cuotas migradas")
                        except Exception as ex:
                            print(f"   ⚠️ Error migrando préstamo #{p_id}: {ex}")

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

    # Seed de Categorías
    with Session(engine) as session:
        from models.config import Categoria
        cats_existentes = session.exec(select(Categoria)).first()
        if not cats_existentes:
            print("🌱 Iniciando seed de Categorías...")
            cats_seed = [
                Categoria(nombre="Sueldo", tipo="Ingreso", icono="Briefcase", color="#10B981"),
                Categoria(nombre="Venta", tipo="Ingreso", icono="Tag", color="#3B82F6"),
                Categoria(nombre="Comida", tipo="Gasto", icono="Utensils", color="#EF4444"),
                Categoria(nombre="Supermercado", tipo="Gasto", icono="ShoppingCart", color="#F59E0B"),
                Categoria(nombre="Servicios", tipo="Gasto", icono="Zap", color="#6366F1"),
                Categoria(nombre="Hogar", tipo="Gasto", icono="Home", color="#8B5CF6"),
                Categoria(nombre="Salud", tipo="Gasto", icono="Activity", color="#EC4899"),
                Categoria(nombre="Transporte", tipo="Gasto", icono="Truck", color="#64748B"),
                Categoria(nombre="Ocio", tipo="Gasto", icono="Coffee", color="#06B6D4"),
                Categoria(nombre="Educación", tipo="Gasto", icono="Book", color="#3B82F6"),
            ]
            for c in cats_seed:
                session.add(c)
            session.commit()
            print("✅ Seed completado: 10 categorías iniciales")
