from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class CompraDeseada(SQLModel, table=True):
    __tablename__ = "compra_deseada"
    id: Optional[int] = Field(default=None, primary_key=True)
    descripcion: str = Field(description="Nombre del artículo o compra")
    categoria: Optional[str] = None         # "tecnología", "ropa", "hogar", "otro"
    precio_estimado: Optional[float] = None # Puede dejarse vacío
    prioridad: str = Field(default="media") # "alta" | "media" | "baja"
    estado: str = Field(default="pendiente") # "pendiente" | "comprado"
    notas: Optional[str] = None
    comprado_en: Optional[datetime] = None  # Se rellena al marcar como comprado
    creado_en: datetime = Field(default_factory=datetime.utcnow)
