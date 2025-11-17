#!/bin/sh
set -e

# Use PM2 to manage processes in Docker
cd /app

# Ensure data directory structure exists
echo "Ensuring data directory structure..."
mkdir -p /data/photos
mkdir -p /data/optimized
mkdir -p /data/logs
echo "✓ Data directories ready"

# Copy Docker PM2 config to ecosystem.config.cjs (PM2 requires this name)
cp ecosystem.docker.cjs ecosystem.config.cjs

# Start both services
pm2 start ecosystem.config.cjs

# Keep container running and show logs
pm2 logs --lines 0

