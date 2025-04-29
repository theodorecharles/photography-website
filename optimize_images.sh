#!/bin/bash

# Configuration variables
# Compression levels (0-100, where 100 is highest quality)
THUMBNAIL_QUALITY=40
MODAL_QUALITY=60
DOWNLOAD_QUALITY=100

# Resolution settings (max dimensions)
THUMBNAIL_MAX_DIM=512
MODAL_MAX_DIM=1024
DOWNLOAD_MAX_DIM=3840

# Image Optimization Script
# This script processes all images in the photos directory, creating optimized versions
# for different use cases (thumbnails, modal view, and downloads).
# It maintains the original directory structure and handles errors gracefully.

# Function to log messages with timestamps
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to handle errors and exit the script
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

# Function to process a directory and its subdirectories
process_directory() {
    local dir="$1"
    local success=0  # 0 means success, 1 means failure
    
    # Process all files in the current directory
    for file in "$dir"/*; do
        # Skip if it's a directory
        if [ -d "$file" ]; then
            # Recursively process subdirectories
            process_directory "$file"
            if [ $? -ne 0 ]; then
                success=1
            fi
            continue
        fi
        
        # Skip if it's not an image file
        if [[ ! "$file" =~ \.(jpg|jpeg|png)$ ]]; then
            continue
        fi
        
        # Get the relative path from photos directory
        local relative_path=${file#photos/}
        local album_path=$(dirname "$relative_path")
        local filename=$(basename "$file")
        
        # Create album directories in optimized folders if they don't exist
        mkdir -p "optimized/thumbnail/$album_path"
        mkdir -p "optimized/modal/$album_path"
        mkdir -p "optimized/download/$album_path"
        
        # Define output paths for different image versions
        local thumb_path="optimized/thumbnail/$album_path/$filename"
        local modal_path="optimized/modal/$album_path/$filename"
        local download_path="optimized/download/$album_path/$filename"
        
        # Create thumbnail version
        if [ ! -f "$thumb_path" ]; then
            log "Creating thumbnail for $relative_path"
            if ! convert "$file" -resize "${THUMBNAIL_MAX_DIM}x${THUMBNAIL_MAX_DIM}>" -quality $THUMBNAIL_QUALITY "$thumb_path"; then
                log "ERROR: Failed to create thumbnail for $relative_path"
                success=1
                continue
            fi
            log "Successfully created thumbnail for $relative_path"
        else
            log "Thumbnail already exists for $relative_path"
        fi
        
        # Create modal version
        if [ ! -f "$modal_path" ]; then
            log "Creating modal image for $relative_path"
            if ! convert "$file" -resize "${MODAL_MAX_DIM}x${MODAL_MAX_DIM}>" -quality $MODAL_QUALITY "$modal_path"; then
                log "ERROR: Failed to create modal image for $relative_path"
                success=1
                continue
            fi
            log "Successfully created modal image for $relative_path"
        else
            log "Modal image already exists for $relative_path"
        fi
        
        # Create download version
        if [ ! -f "$download_path" ]; then
            log "Creating download version for $relative_path"
            if ! convert "$file" -resize "${DOWNLOAD_MAX_DIM}x${DOWNLOAD_MAX_DIM}>" -quality $DOWNLOAD_QUALITY "$download_path"; then
                log "ERROR: Failed to create download version for $relative_path"
                success=1
                continue
            fi
            log "Successfully created download version for $relative_path"
        else
            log "Download version already exists for $relative_path"
        fi
    done
    
    return $success
}

# Run the optimization function
log "Starting image optimization..."
process_directory "photos"
if [ $? -ne 0 ]; then
    handle_error "Image optimization failed"
fi
log "Image optimization completed successfully" 