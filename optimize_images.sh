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

# Check if photos directory exists
if [ ! -d "photos" ]; then
    handle_error "Photos directory does not exist"
fi

# List contents of photos directory for debugging
log "Contents of photos directory:"
ls -la photos

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
    
    # Debug: List all image files found
    log "Searching for images in $src_dir..."
    find "$src_dir" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) -exec echo "Found: {}" \;
    
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