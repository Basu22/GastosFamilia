import sqlite3
import os

# Ruta correcta según docker-compose
db_path = "../data/gastos.db"

if not os.path.exists(db_path):
    print(f"❌ No se encontró la base de datos en {db_path}")
    # Intentar ruta absoluta para estar seguros
    db_path = "/home/flink/Documentos/Gastos Familia/data/gastos.db"
    if not os.path.exists(db_path):
        print(f"❌ Tampoco en ruta absoluta: {db_path}")
        exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print(f"🚀 Iniciando migración en {db_path}...")

try:
    cursor.execute("ALTER TABLE gastomensual ADD COLUMN mes_fin INTEGER")
    cursor.execute("ALTER TABLE gastomensual ADD COLUMN anio_fin INTEGER")
    print("✅ Columnas mes_fin y anio_fin agregadas a 'gastomensual'")
except sqlite3.OperationalError as e:
    print(f"⚠️  Aviso en 'gastomensual': {e}")

try:
    cursor.execute("ALTER TABLE ingreso ADD COLUMN mes_fin INTEGER")
    cursor.execute("ALTER TABLE ingreso ADD COLUMN anio_fin INTEGER")
    print("✅ Columnas mes_fin y anio_fin agregadas a 'ingreso'")
except sqlite3.OperationalError as e:
    print(f"⚠️  Aviso en 'ingreso': {e}")

conn.commit()
conn.close()
print("🏁 Migración finalizada.")
