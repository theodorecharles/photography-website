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

# Create optimized image directories if they don't exist
log "Creating optimized image directories..."
mkdir -p optimized/{thumbnail,modal,download} || handle_error "Failed to create optimized directories"

# Function to optimize images
optimize_images() {
    local src_dir="photos"
    local optimized_dir="optimized"
    local success=true
    local total_images=0
    local processed_images=0
    
    # Count total images first
    total_images=$(find "$src_dir" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | wc -l)
    log "Found $total_images images to process in $src_dir"
    
    # Process each image in the photos directory
    find "$src_dir" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | while read -r image; do
        processed_images=$((processed_images + 1))
        log "Processing image $processed_images/$total_images: $image"
        
        # Skip if the file is in the optimized directory
        if [[ "$image" == "$optimized_dir"* ]]; then
            log "Skipping $image (already in optimized directory)"
            continue
        fi
        
        # Get the relative path from photos directory
        local relative_path=${image#$src_dir/}
        local album_path=$(dirname "$relative_path")
        local filename=$(basename "$image")
        
        # Create album directories in optimized folders if they don't exist
        mkdir -p "$optimized_dir/thumbnail/$album_path"
        mkdir -p "$optimized_dir/modal/$album_path"
        mkdir -p "$optimized_dir/download/$album_path"
        
        # Define output paths
        local thumb_path="$optimized_dir/thumbnail/$album_path/$filename"
        local modal_path="$optimized_dir/modal/$album_path/$filename"
        local download_path="$optimized_dir/download/$album_path/$filename"
        
        # Create thumbnail if it doesn't exist
        if [ ! -f "$thumb_path" ]; then
            log "Creating thumbnail for $relative_path"
            if ! convert "$image" -resize "512x512>" "$thumb_path"; then
                log "ERROR: Failed to create thumbnail for $relative_path"
                success=false
                continue
            fi
            log "Successfully created thumbnail for $relative_path"
        else
            log "Thumbnail already exists for $relative_path"
        fi
        
        # Create modal image if it doesn't exist
        if [ ! -f "$modal_path" ]; then
            log "Creating modal image for $relative_path"
            if ! convert "$image" -resize "2048x2048>" "$modal_path"; then
                log "ERROR: Failed to create modal image for $relative_path"
                success=false
                continue
            fi
            log "Successfully created modal image for $relative_path"
        else
            log "Modal image already exists for $relative_path"
        fi
        
        # Create download image if it doesn't exist
        if [ ! -f "$download_path" ]; then
            log "Creating download version for $relative_path"
            if ! cp "$image" "$download_path"; then
                log "ERROR: Failed to create download version for $relative_path"
                success=false
                continue
            fi
            log "Successfully created download version for $relative_path"
        else
            log "Download version already exists for $relative_path"
        fi
    done
    
    # Check if any errors occurred during optimization
    if [ "$success" = false ]; then
        handle_error "Image optimization failed"
    fi
}

# Run the optimization function
log "Starting image optimization..."
optimize_images
log "Image optimization completed successfully"

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

# Start the server
node server.js

log "Deployment completed successfully!"
pm2 list 