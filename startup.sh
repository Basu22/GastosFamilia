#!/bin/bash
echo "Limpiando base de datos para evitar cuotas duplicadas..."
sudo rm -f data/gastos.db

echo "Reiniciando servidor para crear tablas limpias..."
sudo docker-compose restart backend
sleep 3

echo "Cambiando permisos del Docker para que podamos escribir..."
sudo chown -R $USER:$USER data/

echo "Levantando el último código de backend..."
cd backend
source venv/bin/activate

echo "Asegurando dependencias de Python..."
pip install pandas openpyxl

echo "Apuntando a la base de datos principal..."
export DATABASE_URL="sqlite:///../data/gastos.db"

echo "Inyectando Historial (Excel)..."
python importar_excel.py

echo "Inyectando Gastos e Ingresos del mes base (Abril)..."
python seed_abril.py

echo "¡TODO LISTO! Presioná F5 en tu navegador."
