import os
from sqlmodel import Session, create_engine, select
from models.movimiento import Movimiento
from models.gasto_mensual import GastoMensual
from models.ingreso import Ingreso
from models.tarjeta import Tarjeta

DATABASE_URL = "sqlite:///./data/gastos.db"
engine = create_engine(DATABASE_URL)

def inspect():
    with Session(engine) as session:
        print("\n--- RESUMEN DE BASE DE DATOS ---")
        
        tarjetas = session.exec(select(Tarjeta)).all()
        print(f"💳 Tarjetas: {len(tarjetas)}")
        
        movimientos = session.exec(select(Movimiento)).all()
        print(f"🛒 Movimientos (Cuotas): {len(movimientos)}")
        
        gastos = session.exec(select(GastoMensual)).all()
        print(f"📝 Gastos Fijos/Var: {len(gastos)}")
        
        ingresos = session.exec(select(Ingreso)).all()
        print(f"💰 Ingresos registrados: {len(ingresos)}")
        
        print("\n--- ÚLTIMOS 5 MOVIMIENTOS ---")
        for m in movimientos[-5:]:
            print(f"- {m.descripcion}: {m.monto_cuota} (x{m.cuotas})")
            
        print("\n--- GASTOS FIJOS ---")
        fijos = [g for g in gastos if g.es_fijo]
        for g in fijos:
            print(f"- {g.descripcion}: ${g.monto}")

if __name__ == "__main__":
    if not os.path.exists("./data/gastos.db"):
        print("❌ El archivo de base de datos no existe.")
    else:
        inspect()
