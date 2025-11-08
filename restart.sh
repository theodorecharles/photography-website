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
    local CONFIG_FILE="config/config.json"
    
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
    SITE_URL=$(jq -r '.environment.backend.allowedOrigins[0] // ""' "config/config.json" 2>/dev/null || echo "")
    
    # Send error notification to Telegram
    ERROR_NOTIFICATION="❌ Photography Website deployment FAILED!

🌐 Branch: $CURRENT_BRANCH
🔗 URL: $SITE_URL
📦 Commit: $COMMIT_HASH
⚠️ Error: $1"
    
    send_telegram_notification "$ERROR_NOTIFICATION"
    exit 1
}

# Pull latest changes from the repository
log "Pulling latest changes from GitHub..."
# Get current branch name
CURRENT_BRANCH=$(git branch --show-current)
log "Current branch: $CURRENT_BRANCH"
# Use --ff-only to prevent accidental merges
if ! git pull --ff-only origin "$CURRENT_BRANCH"; then
    handle_error "Failed to pull from GitHub (cannot fast-forward)"
fi

# Run image optimization script
log "Starting image optimization..."
if ! ./optimize_images.sh; then
    handle_error "Image optimization failed"
fi

# Install root dependencies (for generate-ai-titles.js script)
log "Installing root dependencies..."
if ! npm install; then
    handle_error "Root npm install failed"
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

# Restart both services using PM2 ecosystem file
log "Restarting services with PM2 using ecosystem config..."
if ! pm2 restart ecosystem.config.cjs --update-env; then
    log "Services not running, starting them with ecosystem config..."
    if ! pm2 start ecosystem.config.cjs; then
        handle_error "Failed to start services"
    fi
fi

# Get commit information for notification
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | head -n 1)
SITE_URL=$(jq -r '.environment.backend.allowedOrigins[0] // ""' "config/config.json" 2>/dev/null || echo "")

log "Deployment completed successfully!"

# Send success notification to Telegram
SUCCESS_NOTIFICATION="✅ Photography Website deployed successfully!

🌐 Branch: $CURRENT_BRANCH
🔗 URL: $SITE_URL
📦 Commit: $COMMIT_HASH
💬 $COMMIT_MSG"

log "Sending deployment notification to Telegram..."
send_telegram_notification "$SUCCESS_NOTIFICATION"

# Display PM2 status
pm2 list