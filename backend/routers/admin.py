"""
Router de administración — Sincronización de base de datos.
Permite exportar, descargar y restaurar la DB SQLite entre entornos.
"""

import os
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import FileResponse
from pydantic import BaseModel

router = APIRouter()

# --- Configuración ---
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
ADMIN_SYNC_TOKEN = os.getenv("ADMIN_SYNC_TOKEN", "")
RPI_API_URL = os.getenv("RPI_API_URL", "http://192.168.1.185:8082")

# Resolver la ruta de la DB relativa al directorio de trabajo
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/gastos.db")
DB_PATH = Path(DATABASE_URL.replace("sqlite:///", "")).resolve()
BACKUP_DIR = DB_PATH.parent
MAX_BACKUPS = 3


# --- Schemas ---
class BackupInfo(BaseModel):
    filename: str
    size_bytes: int
    fecha: str


class DbInfoResponse(BaseModel):
    size_bytes: int
    ultima_modificacion: str
    environment: str
    rpi_api_url: str
    backups: List[BackupInfo]


class SyncResultResponse(BaseModel):
    ok: bool
    mensaje: str
    backup_creado: Optional[str] = None
    size_bytes: Optional[int] = None


class RestoreRequest(BaseModel):
    filename: str


# --- Helpers ---
def _verificar_token(token: str) -> None:
    """Verifica que el token de admin sea válido."""
    if not ADMIN_SYNC_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="ADMIN_SYNC_TOKEN no configurado en el servidor"
        )
    if token != ADMIN_SYNC_TOKEN:
        raise HTTPException(
            status_code=403,
            detail="Token de administración inválido"
        )


def _verificar_entorno_dev() -> None:
    """Verifica que estemos en entorno de desarrollo."""
    if ENVIRONMENT != "development":
        raise HTTPException(
            status_code=403,
            detail="Esta operación solo está disponible en entorno de desarrollo"
        )


def _listar_backups() -> List[BackupInfo]:
    """Lista los backups disponibles en el directorio de datos."""
    backups: List[BackupInfo] = []
    for f in sorted(BACKUP_DIR.glob("gastos.db.backup-*"), reverse=True):
        stat = f.stat()
        backups.append(BackupInfo(
            filename=f.name,
            size_bytes=stat.st_size,
            fecha=datetime.fromtimestamp(stat.st_mtime).isoformat()
        ))
    return backups


def _limpiar_backups_viejos() -> None:
    """Mantiene solo los últimos MAX_BACKUPS backups."""
    backups = sorted(BACKUP_DIR.glob("gastos.db.backup-*"), reverse=True)
    for old_backup in backups[MAX_BACKUPS:]:
        old_backup.unlink()


def _crear_backup() -> str:
    """Crea un backup de la DB actual y retorna el nombre del archivo."""
    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    backup_name = f"gastos.db.backup-{timestamp}"
    backup_path = BACKUP_DIR / backup_name
    shutil.copy2(DB_PATH, backup_path)
    _limpiar_backups_viejos()
    return backup_name


def _forzar_reinicio_backend() -> None:
    """Toca main.py para que uvicorn --reload reinicie el backend."""
    main_py = Path(__file__).resolve().parent.parent / "main.py"
    if main_py.exists():
        main_py.touch()


# --- Endpoints ---

@router.get("/db-export")
def exportar_db(x_admin_token: str = Header(...)):
    """
    Retorna el archivo SQLite completo como descarga binaria.
    Disponible en todos los entornos (producción y dev).
    Protegido por token de admin via header X-Admin-Token.
    """
    _verificar_token(x_admin_token)

    if not DB_PATH.exists():
        raise HTTPException(status_code=404, detail="Base de datos no encontrada")

    # Forzar WAL checkpoint para que todo esté en el archivo principal
    try:
        db_path_str = str(DB_PATH)
        conn = sqlite3.connect(db_path_str)
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        conn.close()
    except Exception as e:
        print(f"⚠️ WAL checkpoint falló (no crítico): {e}")

    return FileResponse(
        path=str(DB_PATH),
        media_type="application/octet-stream",
        filename="gastos.db",
        headers={"Content-Disposition": "attachment; filename=gastos.db"}
    )


@router.get("/db-info", response_model=DbInfoResponse)
def obtener_info_db(x_admin_token: str = Header(...)):
    """Retorna información de la DB local y backups disponibles."""
    _verificar_token(x_admin_token)

    if not DB_PATH.exists():
        raise HTTPException(status_code=404, detail="Base de datos no encontrada")

    stat = DB_PATH.stat()
    return DbInfoResponse(
        size_bytes=stat.st_size,
        ultima_modificacion=datetime.fromtimestamp(stat.st_mtime).isoformat(),
        environment=ENVIRONMENT,
        rpi_api_url=RPI_API_URL,
        backups=_listar_backups()
    )


@router.post("/sync-db", response_model=SyncResultResponse)
def sincronizar_db(x_admin_token: str = Header(...)):
    """
    Descarga la DB de producción via HTTP y reemplaza la local.
    Solo disponible en ENVIRONMENT=development.
    """
    _verificar_token(x_admin_token)
    _verificar_entorno_dev()

    # 1. Descargar DB de producción
    export_url = f"{RPI_API_URL.rstrip('/')}/api/admin/db-export"
    try:
        response = httpx.get(
            export_url,
            headers={"X-Admin-Token": ADMIN_SYNC_TOKEN},
            timeout=30.0
        )
        response.raise_for_status()
    except httpx.ConnectError:
        raise HTTPException(
            status_code=502,
            detail=f"No se pudo conectar a la RPI en {RPI_API_URL}. ¿Está encendida y en la misma red?"
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Timeout al descargar la DB de producción"
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Error del servidor de producción: {e.response.text}"
        )

    db_content = response.content
    if len(db_content) < 100:
        raise HTTPException(
            status_code=502,
            detail="La respuesta de producción es demasiado pequeña para ser una DB válida"
        )

    # 2. Crear backup local
    backup_name = _crear_backup()

    # 3. Reemplazar la DB local
    try:
        DB_PATH.write_bytes(db_content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al escribir la DB descargada: {e}"
        )

    # 4. Forzar reinicio del backend
    _forzar_reinicio_backend()

    return SyncResultResponse(
        ok=True,
        mensaje=f"✅ Base de datos sincronizada desde producción ({len(db_content):,} bytes)",
        backup_creado=backup_name,
        size_bytes=len(db_content)
    )


@router.post("/restore-backup", response_model=SyncResultResponse)
def restaurar_backup(data: RestoreRequest, x_admin_token: str = Header(...)):
    """
    Restaura la DB desde un backup local seleccionado.
    Solo disponible en ENVIRONMENT=development.
    """
    _verificar_token(x_admin_token)
    _verificar_entorno_dev()

    backup_path = BACKUP_DIR / data.filename

    # Validar que el archivo exista y sea un backup válido
    if not backup_path.exists():
        raise HTTPException(status_code=404, detail="Backup no encontrado")

    if not data.filename.startswith("gastos.db.backup-"):
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido")

    # Crear backup de la DB actual antes de restaurar
    backup_name = _crear_backup()

    # Restaurar
    try:
        shutil.copy2(backup_path, DB_PATH)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al restaurar el backup: {e}"
        )

    # Forzar reinicio
    _forzar_reinicio_backend()

    restored_size = backup_path.stat().st_size

    return SyncResultResponse(
        ok=True,
        mensaje=f"✅ Base de datos restaurada desde {data.filename}",
        backup_creado=backup_name,
        size_bytes=restored_size
    )
