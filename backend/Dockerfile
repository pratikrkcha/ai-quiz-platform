# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci

COPY backend/ ./backend/
WORKDIR /app/backend
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci --omit=dev --workspace=backend

COPY --from=builder /app/backend/dist ./backend/dist

# Secure Container execution
RUN chown -R node:node /app
USER node

WORKDIR /app/backend

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

EXPOSE 4000
CMD ["node", "dist/server.js"]
