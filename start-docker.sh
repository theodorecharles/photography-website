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

# Generate pre-rendered homepage HTML if config and database exist
# Environment variables from docker-compose.yml (BACKEND_DOMAIN, FRONTEND_DOMAIN) 
# are automatically available in the container
if [ -f "/data/config.json" ] && [ -f "/data/gallery.db" ]; then
    echo "Generating pre-rendered homepage HTML..."
    if node scripts/generate-homepage-html.js; then
        echo "✓ Homepage HTML generated successfully"
    else
        echo "⚠ Homepage HTML generation failed (site will use dynamic rendering)"
    fi
else
    echo "⚠ Skipping homepage HTML generation (system not configured yet)"
fi

# Generate static JSON files if config exists
if [ -f "/data/config.json" ]; then
    echo "Generating static JSON files..."
    if node scripts/generate-static-json.js; then
        echo "✓ Static JSON generated successfully"
    else
        echo "⚠ Static JSON generation failed (site will use API fallback)"
    fi
fi

# Copy Docker PM2 config to ecosystem.config.cjs (PM2 requires this name)
cp ecosystem.docker.cjs ecosystem.config.cjs

# Start both services
pm2 start ecosystem.config.cjs

# Keep container running and show logs
pm2 logs --lines 0

