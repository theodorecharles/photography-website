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
# npm workspaces hoists all dependencies to root node_modules for sharing
RUN npm ci && \
    echo "✓ Workspace dependencies installed" && \
    echo "Verifying dependencies are hoisted to root node_modules..." && \
    ls -la node_modules/sharp node_modules/better-sqlite3 node_modules/openai && \
    ls -la node_modules/cors node_modules/express node_modules/helmet && \
    ls -la node_modules/react node_modules/react-dom && \
    echo "✓ All dependencies verified and hoisted correctly"

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

