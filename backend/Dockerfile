# Backend Dockerfile
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

# Install dependencies
RUN npm ci

# Install backend dependencies and rebuild native modules for ARM64
RUN cd backend && npm ci && npm rebuild better-sqlite3

# Install tsx globally to run TypeScript directly
RUN npm install -g tsx

# Copy source code
COPY backend/ ./backend/
COPY scripts/ ./scripts/

# Expose port
EXPOSE 3001

# Set working directory to backend
WORKDIR /app/backend

# Use tsx to run TypeScript directly (no compilation needed)
CMD ["tsx", "src/server.ts"]

