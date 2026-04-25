#!/bin/bash
# deploy.sh — Script de deploy para Raspberry Pi
# Uso: ./deploy.sh [--prod]

set -e

echo "🚀 Gastos Familiares — Deploy Script"
echo "======================================"

# Cargar variables de entorno
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo "✅ Variables de entorno cargadas"
else
  echo "⚠️  No se encontró .env — copiando .env.example..."
  cp .env.example .env
  echo "⚠️  Editá .env antes de continuar"
  exit 1
fi

# Pull de últimos cambios
echo ""
echo "📦 Actualizando código..."
git pull origin main

# Build y restart de contenedores
echo ""
echo "🐳 Reiniciando contenedores..."

if [ "$1" = "--prod" ]; then
  echo "   Modo: PRODUCCIÓN (con Cloudflare Tunnel)"
  docker compose --profile production down
  docker compose --profile production up -d --build
else
  echo "   Modo: LOCAL (sin Cloudflare Tunnel)"
  docker compose down
  docker compose up -d --build
fi

# Verificar que los servicios estén corriendo
echo ""
echo "🔍 Verificando servicios..."
sleep 5
docker compose ps

echo ""
echo "✅ Deploy completado!"
echo "   App disponible en: http://localhost:8080"
