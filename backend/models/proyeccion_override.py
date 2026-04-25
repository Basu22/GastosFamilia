from sqlmodel import SQLModel, Field
from typing import Optional


class ProyeccionOverride(SQLModel, table=True):
    """
    Sobrescritura de valor para un Ingreso o GastoMensual en un mes específico.
    
    Permite "pisar" el monto base de un registro para un mes/año puntual
    sin alterar el comportamiento del registro en los demás meses.
    
    Escalabilidad: el campo 'tipo' soporta "movimiento" en el futuro
    para proyectar cuotas de tarjeta.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    tipo: str                    # "ingreso" | "gasto_mensual" | (futuro: "movimiento")
    referencia_id: int           # FK lógica al ID del Ingreso o GastoMensual
    mes: int = Field(ge=1, le=12)
    anio: int = Field(ge=2020)
    monto: float                 # Valor que reemplaza al base para este mes/año
    notas: Optional[str] = None
