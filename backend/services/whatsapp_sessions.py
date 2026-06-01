from datetime import datetime, timedelta

# Estructura del estado pendiente por número de teléfono
# {
#   "+5491112345678": {
#       "tipo": "gasto_mensual",    # o "movimiento"
#       "datos": { ... },           # datos extraídos por Gemini
#       "timestamp": datetime       # para limpiar sesiones viejas
#   }
# }
pendientes: dict[str, dict] = {}

def guardar_pendiente(
    telefono: str, 
    tipo: str, 
    datos: dict, 
    estado: str = "esperando_confirmacion", 
    tarjetas_temp: list = None, 
    reservas_temp: list = None
) -> None:
    """Guarda un gasto pendiente de confirmación."""
    pendientes[telefono] = {
        "tipo": tipo,
        "datos": datos,
        "estado": estado,
        "tarjetas_temp": tarjetas_temp or [],
        "reservas_temp": reservas_temp or [],
        "timestamp": datetime.now()
    }

def obtener_pendiente(telefono: str) -> dict | None:
    """Retorna el gasto pendiente si existe y no expiró (10 min)."""
    limpiar_sesiones_viejas()
    return pendientes.get(telefono)

def limpiar_pendiente(telefono: str) -> None:
    """Elimina el registro pendiente de un número."""
    if telefono in pendientes:
        del pendientes[telefono]

def limpiar_sesiones_viejas() -> None:
    """Limpia sesiones con más de 10 minutos de antigüedad."""
    ahora = datetime.now()
    limite = ahora - timedelta(minutes=10)
    
    a_eliminar = [tel for tel, sesion in pendientes.items() if sesion["timestamp"] < limite]
    for tel in a_eliminar:
        del pendientes[tel]
