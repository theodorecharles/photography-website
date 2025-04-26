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

# Kill any existing processes
pkill -f "node server.js"

# Create optimized image directories if they don't exist
mkdir -p photos/optimized/{thumbnail,modal,download}

# Function to optimize images
optimize_images() {
    local src_dir="photos"
    local optimized_dir="photos/optimized"
    
    # Process each image in the photos directory
    find "$src_dir" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | while read -r image; do
        # Skip if the file is in the optimized directory
        if [[ "$image" == "$optimized_dir"* ]]; then
            continue
        fi
        
        # Get the filename without the path
        local filename=$(basename "$image")
        
        # Define output paths
        local thumb_path="$optimized_dir/thumbnail/$filename"
        local modal_path="$optimized_dir/modal/$filename"
        local download_path="$optimized_dir/download/$filename"
        
        # Create thumbnail if it doesn't exist
        if [ ! -f "$thumb_path" ]; then
            convert "$image" -resize "512x512>" "$thumb_path"
            echo "Created thumbnail for $filename"
        fi
        
        # Create modal image if it doesn't exist
        if [ ! -f "$modal_path" ]; then
            convert "$image" -resize "2048x2048>" "$modal_path"
            echo "Created modal image for $filename"
        fi
        
        # Create download image if it doesn't exist
        if [ ! -f "$download_path" ]; then
            cp "$image" "$download_path"
            echo "Created download version for $filename"
        fi
    done
}

# Run the optimization function
optimize_images

# Start the server
node server.js

log "Deployment completed successfully!"
pm2 list 