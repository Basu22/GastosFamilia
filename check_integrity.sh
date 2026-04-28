#!/bin/bash

echo "🔍 Iniciando chequeo de integridad de Gastos Familiares..."

# 1. Verificar archivos críticos del Backend
echo "--- Backend ---"
CRITICAL_BACKEND=(
  "backend/models/config.py"
  "backend/routers/configuracion.py"
  "backend/main.py"
)

for file in "${CRITICAL_BACKEND[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file existe."
  else
    echo "❌ ERROR: Falta $file"
  fi
done

# 2. Verificar archivos críticos del Frontend
echo -e "\n--- Frontend ---"
CRITICAL_FRONTEND=(
  "frontend/src/pages/Configuracion.tsx"
  "frontend/src/pages/Dashboard.tsx"
  "frontend/src/App.tsx"
)

for file in "${CRITICAL_FRONTEND[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file existe."
  else
    echo "❌ ERROR: Falta $file"
  fi
done

# 3. Prueba de compilación TypeScript (opcional pero recomendada)
echo -e "\n--- Validando tipos TS ---"
cd frontend && npm run build -- --noEmit
if [ $? -eq 0 ]; then
  echo "✅ No hay errores de TypeScript."
else
  echo "❌ ERROR: Falló la validación de tipos."
fi
cd ..

echo -e "\n🏁 Chequeo finalizado."
