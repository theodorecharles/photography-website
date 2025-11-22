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
mkdir -p data/video
log "Data directory structure verified"

# Validate translations before deployment
log "Validating translations..."
if ! node scripts/validate-translations.js; then
    handle_error "Translation validation failed! Run 'node scripts/fix-translations.js' to auto-fix missing keys."
fi
log "✓ All translations validated successfully"

# Install root dependencies (for optimization and AI scripts)
log "Installing root dependencies..."
if ! npm install; then
    handle_error "Root npm install failed"
fi

# Run database migrations (if database exists)
if [ -f "data/gallery.db" ]; then
    log "Running database migrations..."
    if ! node scripts/migrate-share-links-cascade.js; then
        handle_error "Database migration (share links) failed"
    fi
    if ! node scripts/migrate-add-video-support.js; then
        handle_error "Database migration (video support) failed"
    fi
    if ! node scripts/migrate-push-notifications.js; then
        handle_error "Database migration (push notifications) failed"
    fi
    if ! node migrate-share-link-notifications.js; then
        handle_error "Database migration (share link notifications) failed"
    fi
    log "✓ Database migrations completed"
else
    log "Skipping database migrations (database not initialized yet)"
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

# Generate favicons from icon-192.png (before frontend build)
cd ..
log "Generating favicons and setting up icons..."
if ! node scripts/generate-favicons.js; then
    handle_error "Favicon generation failed"
fi

log "Building frontend..."
cd frontend || handle_error "Failed to cd into frontend directory"
if ! npm run build; then
    handle_error "Frontend build failed"
fi

# Return to project root
cd ..

# Check if PM2 processes exist (for zero-downtime reload vs fresh start)
PM2_PROCESSES_EXIST=false
if pm2 list 2>/dev/null | grep -q "online\|stopped\|errored"; then
    PM2_PROCESSES_EXIST=true
    log "Found existing PM2 processes - will use graceful reload"
else
    log "No existing PM2 processes found - will do fresh start"
fi

# Function to kill ALL processes on a specific port
kill_port() {
    local PORT=$1
    local PIDS=""
    local KILLED=0
    
    # Try lsof first (most reliable, -t returns only PIDs)
    if command -v lsof &> /dev/null; then
        PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
    # Fallback to fuser
    elif command -v fuser &> /dev/null; then
        PIDS=$(fuser $PORT/tcp 2>/dev/null || true)
    # Fallback to ss (faster than netstat)
    elif command -v ss &> /dev/null; then
        PIDS=$(ss -lptn "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true)
    # Final fallback to netstat
    elif command -v netstat &> /dev/null; then
        PIDS=$(netstat -tlnp 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1 || true)
    fi
    
    if [ -n "$PIDS" ]; then
        # Kill each PID (there might be multiple)
        for PID in $PIDS; do
            if [ -n "$PID" ] && [ "$PID" != "-" ]; then
                log "Found process on port $PORT (PID: $PID), killing it..."
                kill -9 $PID 2>/dev/null || true
                KILLED=1
            fi
        done
        
        if [ $KILLED -eq 1 ]; then
            sleep 1
            return 0
        fi
    fi
    
    log "No process found on port $PORT"
    return 1
}

# Function to check if port is free
check_port_free() {
    local PORT=$1
    
    if command -v lsof &> /dev/null; then
        if lsof -i:$PORT &> /dev/null; then
            return 1
        fi
    elif command -v fuser &> /dev/null; then
        if fuser $PORT/tcp &> /dev/null 2>&1; then
            return 1
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tln 2>/dev/null | grep -q ":$PORT "; then
            return 1
        fi
    fi
    return 0
}

# Only clean ports if doing a fresh start (not a reload)
if [ "$PM2_PROCESSES_EXIST" = false ]; then
    # Kill any orphaned node processes that might be using our ports
    log "Checking for orphaned node processes..."
    ORPHANED=$(ps aux | grep -E "node.*server\.(js|ts)|tsx.*server\.ts" | grep -v grep | awk '{print $2}' || true)
    if [ -n "$ORPHANED" ]; then
        log "Found orphaned node processes, killing them..."
        echo "$ORPHANED" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi

    # Clean up both frontend (3000) and backend (3001) ports
    log "Checking and cleaning up ports..."

    for PORT in 3000 3001; do
        log "Cleaning port $PORT..."
        
        # Try up to 3 times to kill processes on this port
        for ATTEMPT in 1 2 3; do
            if check_port_free $PORT; then
                log "✓ Port $PORT is free and ready"
                break
            fi
            
            log "Attempt $ATTEMPT: Port $PORT is in use, killing process..."
            kill_port $PORT || true
            sleep 2
            
            if [ $ATTEMPT -eq 3 ] && ! check_port_free $PORT; then
                # Last resort: find and kill with lsof directly
                log "Final attempt: Force killing all processes on port $PORT..."
                lsof -ti:$PORT 2>/dev/null | xargs -r kill -9 2>/dev/null || true
                sleep 2
                
                if ! check_port_free $PORT; then
                    handle_error "Port $PORT is STILL in use after 3 attempts! Manual intervention required: sudo lsof -ti:$PORT | xargs kill -9"
                fi
            fi
        done
    done
fi

# Copy ecosystem.local.cjs to ecosystem.config.cjs (PM2 requires this name)
rm -f ecosystem.config.cjs
cp ecosystem.local.cjs ecosystem.config.cjs

# Check for version updates and notify admins BEFORE restart
log "Checking for version updates..."
if ! node scripts/check-version-update.js; then
    log "WARNING: Version check failed (non-fatal)"
fi

# Use graceful reload if processes exist, otherwise fresh start
if [ "$PM2_PROCESSES_EXIST" = true ]; then
    log "Performing zero-downtime reload..."
    if ! pm2 reload ecosystem.config.cjs --update-env; then
        log "Reload failed, falling back to restart..."
        pm2 restart ecosystem.config.cjs --update-env || handle_error "Failed to restart services"
    fi
    log "Services reloaded successfully (zero downtime)"
else
    log "Starting services with PM2..."
    if ! pm2 start ecosystem.config.cjs; then
        handle_error "Failed to start services"
    fi
    log "Services started successfully"
fi

# Save PM2 process list to ensure it persists across reboots and remote sessions
log "Saving PM2 process list..."
pm2 save --force 2>/dev/null || true

# Ensure PM2 daemon persists (startup hook for systemd/init)
pm2 startup systemd -u ted --hp /home/ted 2>/dev/null || true

# Poll for services to be online (max 10 seconds)
log "Verifying services are online..."
for i in {1..20}; do
    if pm2 list | grep -q "online"; then
        log "✓ All services verified running (took ${i}/2 seconds)"
        break
    fi
    
    if [ $i -eq 20 ]; then
        log "WARNING: Services did not come online within 10 seconds"
        pm2 list
        handle_error "Services are not running after start"
    fi
    
    sleep 0.5
done

# Generate static JSON files for performance optimization (only if configured)
if [ -f "data/config.json" ]; then
    log "Generating static JSON files..."
    if node scripts/generate-static-json.js; then
        log "Static JSON generated successfully"
    else
        log "WARNING: Static JSON generation failed (site will use API fallback)"
    fi
    
    # Generate pre-rendered homepage HTML with all initial data baked in
    log "Generating pre-rendered homepage HTML..."
    if node scripts/generate-homepage-html.js; then
        log "Pre-rendered homepage HTML generated successfully"
    else
        log "WARNING: Homepage HTML generation failed (site will use dynamic rendering)"
    fi
else
    log "Skipping static JSON and HTML generation (system not configured yet)"
fi

log "Deployment completed successfully!"