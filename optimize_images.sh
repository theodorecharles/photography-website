#!/bin/bash
set -euo pipefail  # Exit on error, undefined variables, and pipe failures
IFS=$'\n\t'        # Set Internal Field Separator for safer word splitting

# Configuration variables
# Compression levels (0-100, where 100 is highest quality)
THUMBNAIL_QUALITY=60
MODAL_QUALITY=60
DOWNLOAD_QUALITY=100

# Resolution settings (max dimensions)
THUMBNAIL_MAX_DIM=1024
MODAL_MAX_DIM=2048
DOWNLOAD_MAX_DIM=4096

# Animation state files
STATE_DIR=$(mktemp -d)
PROGRESS_FILE="$STATE_DIR/progress"
CURRENT_FILE="$STATE_DIR/current"
STATUS_FILE="$STATE_DIR/status"
TOTAL_FILE="$STATE_DIR/total"
START_TIME=$(date +%s)

# Initialize state files
echo "0" > "$PROGRESS_FILE"
echo "" > "$CURRENT_FILE"
echo "running" > "$STATUS_FILE"
echo "0" > "$TOTAL_FILE"

# Cleanup function
cleanup() {
    echo "done" > "$STATUS_FILE"
    wait  # Wait for background processes
    rm -f "$PROGRESS_FILE.lock" 2>/dev/null
    rm -rf "$STATE_DIR"
}
trap cleanup EXIT INT TERM

# Function to count total images that need processing
count_images() {
    local dir="$1"
    local count=0
    
    for file in "$dir"/*; do
        if [ -d "$file" ]; then
            count=$((count + $(count_images "$file")))
        elif [[ "$file" =~ \.(jpg|jpeg|png)$ ]]; then
            # Count how many versions need to be created (max 3 per file)
            local relative_path=${file#photos/}
            local album_path=$(dirname "$relative_path")
            local filename=$(basename "$file")
            
            [ ! -f "optimized/thumbnail/$album_path/$filename" ] && count=$((count + 1))
            [ ! -f "optimized/modal/$album_path/$filename" ] && count=$((count + 1))
            [ ! -f "optimized/download/$album_path/$filename" ] && count=$((count + 1))
        fi
    done
    
    echo "$count"
}

# Function to atomically increment progress counter
increment_progress() {
    (
        flock -x 200
        local progress=$(cat "$PROGRESS_FILE")
        echo $((progress + 1)) > "$PROGRESS_FILE"
    ) 200>"$PROGRESS_FILE.lock"
}

# Function to process a single image file (all three versions)
process_single_image() {
    local file="$1"
    local relative_path=${file#photos/}
    local album_path=$(dirname "$relative_path")
    local filename=$(basename "$file")
    
    # Create album directories in optimized folders if they don't exist
    mkdir -p "optimized/thumbnail/$album_path" 2>/dev/null
    mkdir -p "optimized/modal/$album_path" 2>/dev/null
    mkdir -p "optimized/download/$album_path" 2>/dev/null
    
    # Define output paths for different image versions
    local thumb_path="optimized/thumbnail/$album_path/$filename"
    local modal_path="optimized/modal/$album_path/$filename"
    local download_path="optimized/download/$album_path/$filename"
    
    # Create thumbnail version
    if [ ! -f "$thumb_path" ]; then
        echo "Generating thumbnail for $filename" > "$CURRENT_FILE"
        if convert "$file" -resize "${THUMBNAIL_MAX_DIM}x${THUMBNAIL_MAX_DIM}>" -quality $THUMBNAIL_QUALITY "$thumb_path" 2>/dev/null; then
            increment_progress
        fi
    fi
    
    # Create modal version
    if [ ! -f "$modal_path" ]; then
        echo "Generating modal for $filename" > "$CURRENT_FILE"
        if convert "$file" -resize "${MODAL_MAX_DIM}x${MODAL_MAX_DIM}>" -quality $MODAL_QUALITY "$modal_path" 2>/dev/null; then
            increment_progress
        fi
    fi
    
    # Create download version
    if [ ! -f "$download_path" ]; then
        echo "Generating download for $filename" > "$CURRENT_FILE"
        if convert "$file" -resize "${DOWNLOAD_MAX_DIM}x${DOWNLOAD_MAX_DIM}>" -quality $DOWNLOAD_QUALITY "$download_path" 2>/dev/null; then
            increment_progress
        fi
    fi
}

# Function to collect all image files recursively
collect_images() {
    local dir="$1"
    
    for file in "$dir"/*; do
        if [ -d "$file" ]; then
            collect_images "$file"
        elif [[ "$file" =~ \.(jpg|jpeg|png)$ ]]; then
            echo "$file"
        fi
    done
}

# Function to process images in parallel
process_directory() {
    local max_jobs=8
    local job_count=0
    
    # Collect all image files
    local images=()
    while IFS= read -r file; do
        images+=("$file")
    done < <(collect_images "photos")
    
    # Process images in parallel with max_jobs limit
    for file in "${images[@]}"; do
        # Wait if we have max_jobs running
        while [ $(jobs -r | wc -l) -ge $max_jobs ]; do
            sleep 0.1
        done
        
        # Start processing this image in background
        process_single_image "$file" &
    done
    
    # Wait for all remaining jobs to complete
    wait
    
    return 0
}

# Animation display function (runs in foreground)
animate_display() {
    local hex_toggle=0
    
    # Print initial 3 blank lines
    printf "\n\n\n"
    
    while true; do
        local status=$(cat "$STATUS_FILE" 2>/dev/null || echo "done")
        if [ "$status" = "done" ]; then
            break
        fi
        
        local progress=$(cat "$PROGRESS_FILE" 2>/dev/null || echo "0")
        local total=$(cat "$TOTAL_FILE" 2>/dev/null || echo "0")
        local current=$(cat "$CURRENT_FILE" 2>/dev/null || echo "")
        
        # Always move cursor up 3 lines to redraw
        printf "\033[3A"
        
        # Alternate hexagon symbol
        local hex_symbol
        local hex_color
        if [ $hex_toggle -eq 0 ]; then
            hex_symbol="⬢"
            hex_color="\033[32m"  # Green
        else
            hex_symbol="⬡"
            hex_color="\033[32m"  # Green
        fi
        hex_toggle=$((1 - hex_toggle))
        
        # Calculate percentage
        local percentage=0
        if [ "$total" -gt 0 ]; then
            percentage=$(awk "BEGIN {printf \"%.2f\", ($progress / $total) * 100}")
        fi
        
        # Get terminal width directly from terminal device
        local term_width=$(stty size 2>/dev/null </dev/tty | cut -d' ' -f2)
        if [ -z "$term_width" ] || [ "$term_width" -eq 0 ]; then
            term_width=$(tput cols 2>/dev/null || echo 80)
        fi
        # Account for percentage display: " 100%" = 5 characters total (to be safe)
        local bar_width=$((term_width - 5))
        # Ensure minimum bar width
        if [ $bar_width -lt 20 ]; then
            bar_width=20
        fi
        
        # Create progress bar with better characters
        local filled=$(awk "BEGIN {printf \"%.0f\", ($percentage / 100) * $bar_width}")
        local empty=$((bar_width - filled))
        local bar=""
        for ((i=0; i<filled; i++)); do bar="${bar}█"; done
        for ((i=0; i<empty; i++)); do bar="${bar}░"; done
        
        # Print status line with progress count
        if [ "$total" -gt 0 ]; then
            printf " ${hex_color}${hex_symbol}\033[0m Optimizing: %d/%d\033[K\n" "$progress" "$total"
        else
            printf " ${hex_color}${hex_symbol}\033[0m Optimizing:\033[K\n"
        fi
        
        # Print progress bar
        if [ "$total" -gt 0 ]; then
            printf "%s %2.0f%%\033[K\n" "$bar" "$percentage"
        else
            printf "Scanning images...\033[K\n"
        fi
        
        # Print current file (truncate to fit terminal width)
        if [ -n "$current" ]; then
            # Truncate the filename if it's longer than terminal width
            if [ ${#current} -gt $term_width ]; then
                local truncated="${current:0:$((term_width - 3))}..."
                printf "%s\033[K\n" "$truncated"
            else
                printf "%s\033[K\n" "$current"
            fi
        else
            printf "\033[K\n"
        fi
        
        sleep 0.25
    done
}

# Check if photos directory exists
if [ ! -d "photos" ]; then
    echo "ERROR: Photos directory does not exist"
    exit 1
fi

# Create optimized image directories if they don't exist
mkdir -p optimized/{thumbnail,modal,download} 2>/dev/null || {
    echo "ERROR: Failed to create optimized directories"
    exit 1
}

# Count total images to process
total_count=$(count_images "photos")
echo "$total_count" > "$TOTAL_FILE"

# Count total original images for final summary
total_original=$(find photos -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | wc -l | tr -d ' ')

# Start image processing in background
(
    process_directory "photos"
    exit_code=$?
    echo "done" > "$STATUS_FILE"
    exit $exit_code
) &
PROCESSOR_PID=$!

# Run animation in foreground (has terminal access)
animate_display

# Wait for processing to complete
wait $PROCESSOR_PID
exit_code=$?

# Calculate elapsed time
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

# Get final progress count
final_progress=$(cat "$PROGRESS_FILE")

# Move cursor up to overwrite the last animated display
printf "\033[3A"

# Print final success message
printf " \033[32m✓\033[0m Done!\033[K\n"
printf "Generated %d optimized versions of %d images in %d seconds.\033[K\n" "$final_progress" "$total_original" "$ELAPSED"
printf "\033[K\n"

if [ $exit_code -ne 0 ]; then
    exit 1
fi
