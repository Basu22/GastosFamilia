FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Crear directorio de datos
RUN mkdir -p /app/data

EXPOSE 8000

# Producción: no usamos --reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
