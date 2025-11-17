# Frontend Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci
RUN cd frontend && npm ci

# Copy source code
COPY frontend/ ./frontend/

# Create empty data directory (config.json will be mounted at runtime)
# Vite build will use defaults if config.json doesn't exist
RUN mkdir -p ./data

# Build frontend
# Note: Vite will read config.json from data/ directory if available
# In Docker, config.json is mounted at runtime, so build uses defaults
RUN cd frontend && npm run build

# Production stage - serve static files
FROM node:22-alpine

# Install wget for health checks
RUN apk add --no-cache wget

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/frontend/dist ./dist
COPY frontend/server.js ./server.js
COPY package.json ./

# Expose port
EXPOSE 3000

# Use the custom server.js to serve static files
# DATA_DIR and API_URL can be set via environment variables
CMD ["node", "server.js"]

