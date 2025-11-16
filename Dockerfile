# Combined Frontend + Backend Dockerfile
FROM node:22-alpine

# Install build dependencies for better-sqlite3 and sharp, plus wget for health checks
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev \
    wget

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install root dependencies
RUN npm ci

# Install backend dependencies and rebuild native modules for ARM64
RUN cd backend && npm ci && npm rebuild better-sqlite3

# Install frontend dependencies
RUN cd frontend && npm ci

# Install tsx and PM2 globally
RUN npm install -g tsx pm2

# Copy source code
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY scripts/ ./scripts/

# Rebuild native modules after copying source (ensures ARM64 compatibility)
RUN cd backend && npm rebuild better-sqlite3 --build-from-source

# Build frontend (create empty data dir for build)
RUN mkdir -p ./data && cd frontend && npm run build

# Expose ports
EXPOSE 3000 3001

# Copy frontend server to frontend directory (where node_modules are)
# Copy startup script and Docker PM2 config
COPY start.sh ./start.sh
COPY ecosystem.docker.cjs ./ecosystem.docker.cjs
RUN chmod +x ./start.sh

# Create logs directory
RUN mkdir -p /data/logs

# Use the startup script
CMD ["./start.sh"]

