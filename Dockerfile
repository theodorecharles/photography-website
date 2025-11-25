# Combined Frontend + Backend Dockerfile
FROM node:22-alpine

# Install build dependencies for better-sqlite3 and sharp, plus wget for health checks, ffmpeg for video processing
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev \
    wget \
    ffmpeg

WORKDIR /app

# Copy package files for workspace
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install ALL dependencies via root workspace (this installs frontend + backend + root deps)
# npm workspaces handles everything, don't run npm ci in subdirectories
RUN npm ci && \
    echo "✓ Workspace dependencies installed" && \
    echo "Checking root dependencies..." && \
    ls -la node_modules/sharp node_modules/better-sqlite3 node_modules/openai && \
    echo "Checking backend dependencies..." && \
    ls -la backend/node_modules/cors backend/node_modules/express backend/node_modules/helmet && \
    echo "Checking frontend dependencies..." && \
    ls -la frontend/node_modules/react frontend/node_modules/react-dom && \
    echo "✓ All dependencies verified"

# Rebuild native modules for correct architecture
RUN npm rebuild better-sqlite3 --build-from-source

# Install tsx and PM2 globally
RUN npm install -g tsx pm2

# Copy source code
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY scripts/ ./scripts/

# Build frontend (create empty data dir for build)
RUN mkdir -p ./data && npm run build --workspace=frontend

# Expose ports
EXPOSE 3000 3001

# Copy frontend server to frontend directory (where node_modules are)
# Copy startup script and Docker PM2 config
COPY start-docker.sh ./start-docker.sh
COPY ecosystem.docker.cjs ./ecosystem.docker.cjs
RUN chmod +x ./start-docker.sh

# Create logs directory
RUN mkdir -p /data/logs

# Use the startup script
CMD ["./start-docker.sh"]

