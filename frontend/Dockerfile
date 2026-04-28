# Etapa 1: Construcción de la App (React + Vite)
FROM node:20-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa 2: Servidor Web de Producción (Nginx)
FROM nginx:alpine as production-stage

# Gzip y optimizaciones básicas
RUN sed -i '1i gzip on; gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;' /etc/nginx/conf.d/default.conf

# Copiar archivos compilados
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Configuración de Nginx para manejar SPA y Proxy al Backend
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Resolver de Docker para que encuentre "gastos-backend" \
    resolver 127.0.0.11 valid=30s; \
    \
    location /api/ { \
        set $backend_upstream http://gastos-backend:8000; \
        proxy_pass $backend_upstream/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
