#!/bin/bash

# 💰 Gastos Familia - Deploy V1 (Infra Unificada)

# --- CONFIGURACIÓN REMOTA ---
RPI_HOST="bossvald@192.168.1.185" 
RPI_PATH="/home/bossvald/GastosFamilia"
INFRA_PATH="/home/bossvald/infra-unificada"
# ----------------------------

REAL_USER=${SUDO_USER:-$(whoami)}

echo "🚀 Iniciando flujo de despliegue para Gastos Familia..."

# 1. Sincronizar GitHub
echo "📥 Sincronizando con GitHub..."
git add .
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" 2>/dev/null
if ! sudo -u $REAL_USER git push origin main; then
    echo "❌ ERROR FATAL: El push falló. El despliegue se detiene."
    exit 1
fi

# 2. Sincronizar secretos (.env)
if [ ! -f .env ]; then
    echo "⚠️ ADVERTENCIA: No se encontró el archivo .env en la raíz. Creando uno básico..."
    cp .env.example .env
fi
echo "🔑 Sincronizando variables de entorno (.env)..."
sudo -u $REAL_USER scp .env "$RPI_HOST:$RPI_PATH/.env"

# 3. ACTUALIZACIÓN REMOTA
echo "📡 Conectando a la Raspberry Pi ($RPI_HOST)..."
echo "🏗️  Actualizando código y reiniciando contenedores..."

sudo -u $REAL_USER ssh -t $RPI_HOST "
    echo '--- Actualizando repositorio ---' && \
    cd $RPI_PATH && \
    git fetch origin && \
    git reset --hard origin/main && \
    echo '--- Reconstruyendo contenedores de Gastos ---' && \
    cd $INFRA_PATH && \
    docker compose up -d --build gastos-backend gastos-frontend && \
    echo '--- Reiniciando Proxy Unificado (Limpieza de caché DNS) ---' && \
    docker restart proxy_unificado
"

echo "✅ Proceso finalizado. Revisá http://192.168.1.185:8080"
