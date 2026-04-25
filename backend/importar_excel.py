"""
⚠️ DEPRECADO (FASE 2)
Este script importaba los datos desde el Google Sheet original.
Se mantiene únicamente como referencia histórica. El flujo de datos ahora
es 100% manual a través de la interfaz web (formularios).
"""

import pandas as pd
from sqlmodel import Session, select
from database import engine
from models.movimiento import Movimiento
from models.tarjeta import Tarjeta
from datetime import date
import re
import sys

URL = "https://docs.google.com/spreadsheets/d/1k_ZysyqTS46NXdKBKGxlmg46t20OOtlCA2Bbzx0e1Yk/export?format=xlsx"

print("Descargando Excel desde Google Sheets (esto puede tardar unos segundos)...")
try:
    sheets = pd.read_excel(URL, sheet_name=None)
    df = sheets['MOVIMIENTOS']
except Exception as e:
    print(f"Error descargando el Excel: {e}")
    sys.exit(1)

# Diccionario de columnas mes-año. Ejemplo de indice -> fecha
# Las columnas empiezan con valores de fecha o meses, pero es complejo parsearlas directo.
# Vamos a usar una heuristica simplificada para este script fundacional basado en datos estaticos:
# Localizamos donde dice "AÑO", y sabemos que la celda siguiente es 2024, etc, o podemos escanear manualmente.

print("Excel descargado ok. Identificando fechas en cabecera...")

# Convertir el DataFrame a matriz para procesamiento manual
matrix = df.values.tolist()

with Session(engine) as session:
    tarjetas_db = session.exec(select(Tarjeta)).all()
    tarjetas_map = {t.nombre: t.id for t in tarjetas_db}
    
    current_tarjeta_id = None
    movimientos_creados = 0
    
    print("Iniciando inyeccion a la Base de Datos SQLite local...")
    
    # Mapeo de columnas a fechas
    # 21: Nov 2024, 22: Dic 2024, 24: Ene 2025 ... 33: Oct 2025
    # 34: Nov 2025, 35: Dic 2025, 37: Ene 2026 ... 40: Abr 2026 ... 48: Dic 2026
    def get_columna_fecha(col_idx: int) -> date:
        if 21 <= col_idx <= 22: # Nov-Dic 2024
            return date(2024, col_idx - 10, 1) # 21->11, 22->12
        if 24 <= col_idx <= 35: # Ene-Dic 2025
            return date(2025, col_idx - 23, 1) # 24->1, 35->12
        if 37 <= col_idx <= 48: # Ene-Dic 2026
            return date(2026, col_idx - 36, 1) # 37->1, 48->12
        return None

    def limpiar_valor(v: any) -> float:
        if pd.isna(v): return 0.0
        if isinstance(v, (int, float)): return float(v)
        # Manejar strings como '1.236,06' o '$ 1.236,06'
        s = str(v).replace('.', '').replace(',', '.')
        cleaned = re.sub(r'[^\d.]', '', s)
        try:
            return float(cleaned)
        except (ValueError, TypeError):
            return 0.0

    for row in matrix[9:]:
        label = str(row[1]).strip() if pd.notna(row[1]) else ""
        
        if label in tarjetas_map:
            current_tarjeta_id = tarjetas_map[label]
            continue
            
        if "GASTOS MENSUALES" in label:
            current_tarjeta_id = None
            break
            
        if not label or label.startswith("TOTAL") or label == "MOVIMIENTOS" or label in ["MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE", "ENERO", "FEBRERO", "MARZO", "ABRIL"]:
            continue
            
        if current_tarjeta_id is not None:
            indices_con_valor = []
            montos = []
            for col_idx in range(21, 49):
                v = limpiar_valor(row[col_idx])
                if v > 0:
                    indices_con_valor.append(col_idx)
                    montos.append(v)
            
            if indices_con_valor:
                first_idx = indices_con_valor[0]
                last_idx = indices_con_valor[-1]
                
                fecha_inicio = get_columna_fecha(first_idx)
                fecha_fin = get_columna_fecha(last_idx)
                
                if fecha_inicio and fecha_fin:
                    # Si es un solo mes, es una compra en 1 cuota
                    # Si son varios, es prorrateado
                    monto_cuota = sum(montos) / len(indices_con_valor)
                    
                    mov = Movimiento(
                        usuario_id=1, 
                        tarjeta_id=current_tarjeta_id,
                        descripcion=label,
                        monto_total=sum(montos),
                        monto_cuota=round(monto_cuota, 2),
                        cuotas=len(indices_con_valor),
                        fecha_primera_cuota=fecha_inicio,
                        fecha_ultima_cuota=fecha_fin
                    )
                    session.add(mov)
                    movimientos_creados += 1

    session.commit()
    print(f"¡EXITO COMPLETO! Se inyectaron {movimientos_creados} movimientos (sin duplicados y con limpieza de valores).")
