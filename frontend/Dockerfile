# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm ci

COPY frontend/ ./frontend/
WORKDIR /app/frontend
# Emitting VITE_BACKEND_URL means the frontend proxies through Nginx (same domain)
ENV VITE_BACKEND_URL=""
RUN npm run build

# Stage 2: Production Nginx Proxy
FROM nginx:alpine AS production

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Do not run Nginx as root
RUN chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx && \
    chmod -R 777 /var/cache/nginx /var/run /var/log/nginx
USER nginx

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
