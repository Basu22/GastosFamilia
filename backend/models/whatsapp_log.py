from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class WhatsappLog(SQLModel, table=True):
    __tablename__ = "whatsapp_log"
    id: Optional[int] = Field(default=None, primary_key=True)
    telefono: str
    tipo_mensaje: str        # "texto" | "imagen" | "audio" | "pdf"
    mensaje_recibido: Optional[str] = None  # Resumen del contenido
    respuesta_enviada: Optional[str] = None # Texto que se le envió al usuario
    estado: str = Field(default="pendiente") # "pendiente" | "confirmado" | "cancelado"
    datos_extraidos: Optional[str] = None   # JSON como string (resultado de Gemini)
    creado_en: datetime = Field(default_factory=datetime.utcnow)
