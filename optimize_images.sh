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

# Function to process a directory
process_directory() {
    local dir="$1"
    local success=true
    
    # Process all files in the current directory
    for file in "$dir"/*; do
        # Skip if it's a directory
        if [ -d "$file" ]; then
            # Recursively process subdirectories
            process_directory "$file"
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
        
        # Define output paths
        local thumb_path="optimized/thumbnail/$album_path/$filename"
        local modal_path="optimized/modal/$album_path/$filename"
        local download_path="optimized/download/$album_path/$filename"
        
        # Create thumbnail if it doesn't exist
        if [ ! -f "$thumb_path" ]; then
            log "Creating thumbnail for $relative_path"
            if ! convert "$file" -resize "512x512>" "$thumb_path"; then
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
            if ! convert "$file" -resize "2048x2048>" "$modal_path"; then
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
            if ! cp "$file" "$download_path"; then
                log "ERROR: Failed to create download version for $relative_path"
                success=false
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