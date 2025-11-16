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

# Function to send Telegram notification
send_telegram_notification() {
    local MESSAGE="$1"
    # Try data/config.json first, fall back to old location
    local CONFIG_FILE="data/config.json"
    if [ ! -f "$CONFIG_FILE" ]; then
        CONFIG_FILE="config/config.json"
    fi
    
    if [ -f "$CONFIG_FILE" ] && command -v jq &> /dev/null; then
        TELEGRAM_ENABLED=$(jq -r '.notifications.telegram.enabled // false' "$CONFIG_FILE")
        
        if [ "$TELEGRAM_ENABLED" = "true" ]; then
            TELEGRAM_BOT_TOKEN=$(jq -r '.notifications.telegram.botToken // ""' "$CONFIG_FILE")
            TELEGRAM_CHAT_ID=$(jq -r '.notifications.telegram.chatId // ""' "$CONFIG_FILE")
            
            if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
                curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
                     -d "chat_id=${TELEGRAM_CHAT_ID}" \
                     -d "text=$MESSAGE" \
                     --silent --output /dev/null --fail || true
            fi
        fi
    fi
}

# Function to handle errors and exit the script
handle_error() {
    log "ERROR: $1"
    
    # Get current branch and commit info
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    # Try data/config.json first, fall back to old location
    SITE_URL=""
    if [ -f "data/config.json" ]; then
        SITE_URL=$(jq -r '.environment.backend.allowedOrigins[0] // ""' "data/config.json" 2>/dev/null || echo "")
    elif [ -f "config/config.json" ]; then
        SITE_URL=$(jq -r '.environment.backend.allowedOrigins[0] // ""' "config/config.json" 2>/dev/null || echo "")
    fi
    
    # Send error notification to Telegram
    ERROR_NOTIFICATION="❌ Photography Website deployment FAILED!

🌐 Branch: $CURRENT_BRANCH
🔗 URL: $SITE_URL
📦 Commit: $COMMIT_HASH
⚠️ Error: $1"
    
    send_telegram_notification "$ERROR_NOTIFICATION"
    exit 1
}

# Get current branch name for notifications
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

# Restart both services using PM2 with ecosystem.local.cjs
log "Restarting services with PM2..."
if pm2 list | grep -q "backend\|frontend"; then
    # Services are running, restart them
    pm2 restart backend frontend --update-env || handle_error "Failed to restart services"
else
    # Services not running, start them using ecosystem.local.cjs
    log "Services not running, starting them..."
    if ! pm2 start ecosystem.local.cjs; then
        handle_error "Failed to start services"
    fi
fi

# Get commit information for notification
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | head -n 1)
# Try data/config.json first, fall back to old location
SITE_URL=""
if [ -f "data/config.json" ]; then
    SITE_URL=$(jq -r '.environment.backend.allowedOrigins[0] // ""' "data/config.json" 2>/dev/null || echo "")
elif [ -f "config/config.json" ]; then
    SITE_URL=$(jq -r '.environment.backend.allowedOrigins[0] // ""' "config/config.json" 2>/dev/null || echo "")
fi

log "Deployment completed successfully!"

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

# Send success notification to Telegram
SUCCESS_NOTIFICATION="✅ Photography Website deployed successfully!

🌐 Branch: $CURRENT_BRANCH
🔗 URL: $SITE_URL
📦 Commit: $COMMIT_HASH
💬 $COMMIT_MSG"

log "Sending deployment notification to Telegram..."
send_telegram_notification "$SUCCESS_NOTIFICATION"