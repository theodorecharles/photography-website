#!/bin/bash

# Function to log messages with timestamps
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to handle errors
handle_error() {
    log "ERROR: $1"
    exit 1
}

# Pull latest changes
log "Pulling latest changes from GitHub..."
if ! git pull origin master; then
    handle_error "Failed to pull from GitHub"
fi

# Backend deployment
log "Building backend..."
cd backend || handle_error "Failed to cd into backend directory"
if ! npm run build; then
    handle_error "Backend build failed"
fi

log "Restarting backend with PM2..."
if ! pm2 restart backend; then
    log "Backend not running, starting it..."
    if ! pm2 start npm --name "backend" -- start; then
        handle_error "Failed to start backend"
    fi
fi

# Frontend deployment
log "Building frontend..."
cd ../frontend || handle_error "Failed to cd into frontend directory"
if ! npm run build; then
    handle_error "Frontend build failed"
fi

log "Restarting frontend with PM2..."
if ! pm2 restart frontend; then
    log "Frontend not running, starting it..."
    if ! pm2 start npm --name "frontend" -- start; then
        handle_error "Failed to start frontend"
    fi
fi

log "Deployment completed successfully!"
pm2 list 