#!/bin/bash
set -euo pipefail  # Exit on error, undefined variables, and pipe failures
IFS=$'\n\t'        # Set Internal Field Separator for safer word splitting

# Restart Script
# This script handles the deployment and restart process for the photography website.
# It pulls the latest changes, optimizes images, and restarts both frontend and backend services with PM2.

# Function to log messages with timestamps
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to handle errors and exit the script
handle_error() {
    log "ERROR: $1"
    exit 1
}

# Get current branch name
CURRENT_BRANCH=$(git branch --show-current)
log "Current branch: $CURRENT_BRANCH"

# Create data directory structure if it doesn't exist
log "Ensuring data directory structure exists..."
mkdir -p data/photos
mkdir -p data/optimized/thumbnail
mkdir -p data/optimized/modal
mkdir -p data/optimized/download
log "Data directory structure verified"

# Install root dependencies (for optimization and AI scripts)
log "Installing root dependencies..."
if ! npm install; then
    handle_error "Root npm install failed"
fi

# Run image optimization script (only if configured and albums exist)
if [ -f "data/config.json" ]; then
    # Check if there are any albums (directories) to optimize
    ALBUM_COUNT=$(find data/photos -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
    if [ "$ALBUM_COUNT" -gt 0 ]; then
        log "Starting image optimization..."
        if ! ./scripts/optimize_all_images.js; then
            handle_error "Image optimization failed"
        fi
    else
        log "Skipping image optimization (no albums found)"
    fi
else
    log "Skipping image optimization (system not configured yet)"
fi

# Backend deployment process
log "Installing backend dependencies..."
cd backend || handle_error "Failed to cd into backend directory"
if ! npm install; then
    handle_error "Backend npm install failed"
fi

log "Building backend..."
if ! npm run build; then
    handle_error "Backend build failed"
fi

# Frontend deployment process
log "Installing frontend dependencies..."
cd ../frontend || handle_error "Failed to cd into frontend directory"
if ! npm install; then
    handle_error "Frontend npm install failed"
fi

log "Building frontend..."
if ! npm run build; then
    handle_error "Frontend build failed"
fi

# Return to project root
cd ..

# Stop and delete all PM2 processes to avoid stale configuration
log "Stopping and removing all PM2 processes..."
if pm2 list 2>/dev/null | grep -q "online\|stopped\|errored"; then
    log "Found existing PM2 processes, stopping them..."
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    log "All PM2 processes stopped and deleted"
else
    log "No existing PM2 processes found"
fi

# Start fresh with new builds
log "Starting services with PM2..."

# Copy ecosystem.local.cjs to ecosystem.config.cjs (PM2 requires this name)
rm -f ecosystem.config.cjs
cp ecosystem.local.cjs ecosystem.config.cjs

if ! pm2 start ecosystem.config.cjs; then
    handle_error "Failed to start services"
fi

log "Services started successfully"

# Generate static JSON files for performance optimization (only if configured)
if [ -f "data/config.json" ]; then
    log "Generating static JSON files..."
    if node scripts/generate-static-json.js; then
        log "Static JSON generated successfully"
    else
        log "WARNING: Static JSON generation failed (site will use API fallback)"
    fi
else
    log "Skipping static JSON generation (system not configured yet)"
fi

log "Deployment completed successfully!"