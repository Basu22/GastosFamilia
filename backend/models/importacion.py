from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime

class GmailImporterConfig(SQLModel, table=True):
    """Configuración para mapear correos a Gastos Fijos."""
    id: Optional[int] = Field(default=None, primary_key=True)
    remitente: str          # ej: facturacion@email.personal.com.ar
    etiqueta_gmail: str     # ej: Personal
    referente: str          # ej: 1002577507810001
    descripcion: str        # ej: Línea Móvil (11)44063833 + (11)50535029
    activo: bool = Field(default=True)
    tipo_parser: str = Field(default="referente")  # "referente" | "html_body" | "pdf"
    incluir_en_arca: bool = Field(default=True)

class ImportacionLog(SQLModel, table=True):
    """Historial de cada ejecución del importador."""
    id: Optional[int] = Field(default=None, primary_key=True)
    fecha: str = Field(default_factory=lambda: datetime.now().isoformat())
    referente: str
    descripcion: str
    monto: float
    mes: int
    anio: int
    fecha_vencimiento: Optional[str] = Field(default=None)  # formato: "2026-05-06"
    incluir_en_arca: bool = Field(default=True)
    accion: str   # creado | actualizado | sin_cambios | error
    detalle: str  # Mensaje descriptivo
