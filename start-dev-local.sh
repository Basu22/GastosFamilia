#!/bin/bash

# Script de arranque de DESARROLLO (Localhost) — Gastos Familiares
# Inicia el backend (Uvicorn) y el frontend (Vite) en paralelo

echo "🛠️  Iniciando entorno de desarrollo local — Gastos Familiares..."

# 0. Limpieza preventiva (Matar procesos viejos)
echo "🧹 Limpiando puertos 8000 (Backend) y 5173 (Frontend)..."
# Intentamos matar por puerto. 
sudo fuser -k 8000/tcp 5173/tcp 2>/dev/null || echo "Info: Puertos ya estaban libres."

# 1. Backend (FastAPI)
echo "🐍 Levantando el Backend..."
cd backend
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "⚠️  Venv no encontrado en /backend, intentando con python3 global..."
fi

# Exportamos la URL de la base de datos local para desarrollo
export DATABASE_URL="sqlite:///../data/gastos.db"

# --reload permite que los cambios en Python se vean al instante
# Nota: Usamos main:app porque main.py está en la raíz de /backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACK_PID=$!
cd ..

# 2. Frontend (Vite)
echo "⚡ Levantando el Frontend..."
cd frontend

# Validar versión de Node
NODE_VER=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VER" -lt 18 ]; then
    echo "❌ ERROR: Necesitás al menos Node 18 para este proyecto. Tenés $NODE_VER."
    kill $BACK_PID
    exit 1
fi

npm run dev -- --host --port 5173 &
FRONT_PID=$!
cd ..

# 3. Manejar el cierre (CTRL+C)
trap "echo '🛑 Deteniendo servicios...'; kill $BACK_PID $FRONT_PID 2>/dev/null; exit" SIGINT SIGTERM

echo ""
echo "✨ TODO LISTO ✨"
echo "🔗 App: http://localhost:5173"
echo "📂 Swagger: http://localhost:8000/docs"
echo "------------------------------------------------"
echo "Presioná CTRL+C para detener ambos servicios."

# Esperar a los procesos
wait
