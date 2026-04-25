#!/bin/bash

# reset_db.sh — Reinicio total de base de datos para Gastos Familiares

echo "⚠️  ADVERTENCIA: Esto borrará todos los datos locales y volverá a importar desde Excel."
echo "Presioná CTRL+C para cancelar o cualquier tecla para continuar..."
read -n 1 -s

echo "🧹 Borrando base de datos actual..."
rm -f data/gastos.db

echo "🏗️  Creando tablas y cargando usuarios/tarjetas..."
cd backend
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Exportamos la URL correcta para que cree la DB en la carpeta padre
export DATABASE_URL="sqlite:///../data/gastos.db"

# Ejecutamos un script temporal para inicializar la DB
python3 -c "from database import create_db_and_tables, seed_initial_data; create_db_and_tables(); seed_initial_data()"

echo "✅ Proceso completado con éxito."

cd ..
