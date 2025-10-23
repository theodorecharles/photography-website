#!/bin/bash
set -euo pipefail  # Exit on error, undefined variables, and pipe failures
IFS=$'\n\t'        # Set Internal Field Separator for safer word splitting

# Restart Script
# This script handles the deployment and restart process for the photography website.
# It pulls the latest changes, optimizes images, and restarts both frontend and backend services.

# Function to log messages with timestamps
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to handle errors and exit the script
handle_error() {
    log "ERROR: $1"
    exit 1
}

# Pull latest changes from the repository
log "Pulling latest changes from GitHub..."
# Use --ff-only to prevent accidental merges
if ! git pull --ff-only origin master; then
    handle_error "Failed to pull from GitHub (cannot fast-forward)"
fi

# Run image optimization script
log "Starting image optimization..."
if ! ./optimize_images.sh; then
    handle_error "Image optimization failed"
fi

# Backend deployment process
log "Building backend..."
cd backend || handle_error "Failed to cd into backend directory"
if ! npm run build; then
    handle_error "Backend build failed"
fi

# Restart backend service using PM2
log "Restarting backend with PM2..."
if ! pm2 restart backend; then
    log "Backend not running, starting it..."
    if ! pm2 start npm --name "backend" -- start; then
        handle_error "Failed to start backend"
    fi
fi

# Frontend deployment process
log "Building frontend..."
cd ../frontend || handle_error "Failed to cd into frontend directory"
if ! npm run build; then
    handle_error "Frontend build failed"
fi

# Restart frontend service using PM2
log "Restarting frontend with PM2..."
if ! pm2 restart frontend; then
    log "Frontend not running, starting it..."
    if ! pm2 start npm --name "frontend" -- start; then
        handle_error "Failed to start frontend"
    fi
fi

# Display PM2 process list
log "Deployment completed successfully!"
pm2 list