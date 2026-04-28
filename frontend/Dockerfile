# Stage 1 — build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2 — serve com nginx
FROM nginx:alpine

# Remove config padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Config customizada pra SPA (fallback pro index.html em qualquer rota)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia o build gerado pelo stage anterior
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
