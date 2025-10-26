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

# Read concurrency from config.json, default to 4 if not found
CONCURRENCY=$(grep -A 2 '"optimization"' config/config.json 2>/dev/null | grep '"concurrency"' | grep -o '[0-9]*' || echo "4")

# Animation state files
STATE_DIR=$(mktemp -d)
PROGRESS_FILE="$STATE_DIR/progress"
STATUS_FILE="$STATE_DIR/status"
TOTAL_FILE="$STATE_DIR/total"
ALBUM_TIMES_FILE="$STATE_DIR/album_times"
START_TIME=$(date +%s)

# Initialize state files
echo "0" > "$PROGRESS_FILE"
echo "running" > "$STATUS_FILE"
echo "0" > "$TOTAL_FILE"
touch "$ALBUM_TIMES_FILE"

# Create thread status files (one for each concurrent worker)
for ((i=1; i<=CONCURRENCY; i++)); do
    echo "" > "$STATE_DIR/thread_$i"
done

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

# Get next available thread ID
get_thread_id() {
    for ((i=1; i<=CONCURRENCY; i++)); do
        if [ ! -f "$STATE_DIR/thread_${i}_busy" ]; then
            touch "$STATE_DIR/thread_${i}_busy"
            echo "$i"
            return
        fi
    done
    echo "1"  # Fallback
}

# Release thread ID
release_thread_id() {
    local thread_id=$1
    rm -f "$STATE_DIR/thread_${thread_id}_busy"
    echo "" > "$STATE_DIR/thread_$thread_id"
}

# Function to process a single image file (all three versions)
process_single_image() {
    local file="$1"
    local thread_id=$(get_thread_id)
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
        echo "[T$thread_id] thumbnail: $filename" > "$STATE_DIR/thread_$thread_id"
        if convert "$file" -resize "${THUMBNAIL_MAX_DIM}x${THUMBNAIL_MAX_DIM}>" -quality $THUMBNAIL_QUALITY "$thumb_path" 2>/dev/null; then
            increment_progress
        fi
    fi
    
    # Create modal version
    if [ ! -f "$modal_path" ]; then
        echo "[T$thread_id] modal: $filename" > "$STATE_DIR/thread_$thread_id"
        if convert "$file" -resize "${MODAL_MAX_DIM}x${MODAL_MAX_DIM}>" -quality $MODAL_QUALITY "$modal_path" 2>/dev/null; then
            increment_progress
        fi
    fi
    
    # Create download version
    if [ ! -f "$download_path" ]; then
        echo "[T$thread_id] download: $filename" > "$STATE_DIR/thread_$thread_id"
        if convert "$file" -resize "${DOWNLOAD_MAX_DIM}x${DOWNLOAD_MAX_DIM}>" -quality $DOWNLOAD_QUALITY "$download_path" 2>/dev/null; then
            increment_progress
        fi
    fi
    
    release_thread_id "$thread_id"
}

# Function to collect albums and their images
collect_albums() {
    local base_dir="$1"
    declare -A albums
    
    # Find all directories under photos
    while IFS= read -r dir; do
        local album_name=$(basename "$dir")
        # Find images in this album
        while IFS= read -r file; do
            if [ -n "$file" ]; then
                albums["$album_name"]+="$file"$'\n'
            fi
        done < <(find "$dir" -maxdepth 1 -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) 2>/dev/null)
    done < <(find "$base_dir" -type d)
    
    # Output albums and their images
    for album in "${!albums[@]}"; do
        echo "ALBUM:$album"
        echo -n "${albums[$album]}"
    done
}

# Function to process a single album
process_album() {
    local album_name="$1"
    shift
    local images=("$@")
    local album_start=$(date +%s)
    
    # Process images in parallel with concurrency limit
    for file in "${images[@]}"; do
        # Wait if we have CONCURRENCY jobs running
        while [ $(jobs -r | wc -l) -ge $CONCURRENCY ]; do
            sleep 0.1
        done
        
        # Start processing this image in background
        process_single_image "$file" &
    done
    
    # Wait for all images in this album to complete
    wait
    
    # Calculate album processing time
    local album_end=$(date +%s)
    local album_time=$((album_end - album_start))
    
    # Print album completion message
    echo "$album_name optimized in $album_time seconds ✓" >> "$ALBUM_TIMES_FILE"
    
    return 0
}

# Function to process all albums
process_directory() {
    local current_album=""
    local album_images=()
    
    # Collect and process albums
    while IFS= read -r line; do
        if [[ "$line" =~ ^ALBUM: ]]; then
            # Process previous album if exists
            if [ -n "$current_album" ] && [ ${#album_images[@]} -gt 0 ]; then
                process_album "$current_album" "${album_images[@]}"
                album_images=()
            fi
            # Start new album
            current_album="${line#ALBUM:}"
        elif [ -n "$line" ]; then
            album_images+=("$line")
        fi
    done < <(collect_albums "photos")
    
    # Process last album
    if [ -n "$current_album" ] && [ ${#album_images[@]} -gt 0 ]; then
        process_album "$current_album" "${album_images[@]}"
    fi
    
    return 0
}

# Function to get CPU usage percentage
get_cpu_usage() {
    # Use vmstat to get CPU usage (more reliable than top)
    local cpu_percent=$(vmstat 1 2 | tail -1 | awk '{print 100 - $15}')
    
    # Fallback to /proc/loadavg if vmstat doesn't work
    if [ -z "$cpu_percent" ] || [ "$cpu_percent" = "" ] || [ "$cpu_percent" = "us.0" ]; then
        # Get load average and convert to approximate CPU usage
        local load_avg=$(cat /proc/loadavg | awk '{print $1}')
        local cpu_count=$(nproc)
        cpu_percent=$(awk "BEGIN {printf \"%.0f\", ($load_avg / $cpu_count) * 100}")
    fi
    
    # Ensure we have a valid number
    if ! [[ "$cpu_percent" =~ ^[0-9]+$ ]]; then
        cpu_percent=0
    fi
    
    echo "${cpu_percent:-0}"
}

# Animation display function (runs in foreground)
animate_display() {
    local hex_toggle=0
    
    # Print initial blank lines for header + progress + threads + extra
    local total_lines=$((CONCURRENCY + 3))
    for ((i=0; i<total_lines; i++)); do
        printf "\n"
    done
    
    while true; do
        local status=$(cat "$STATUS_FILE" 2>/dev/null || echo "done")
        if [ "$status" = "done" ]; then
            break
        fi
        
        local progress=$(cat "$PROGRESS_FILE" 2>/dev/null || echo "0")
        local total=$(cat "$TOTAL_FILE" 2>/dev/null || echo "0")
        
        # Calculate total lines needed (header + progress + threads + blank)
        local total_lines=$((CONCURRENCY + 3))
        
        # Move cursor up to redraw all lines
        printf "\033[${total_lines}A"
        
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
        
        # Get CPU usage
        local cpu_usage=$(get_cpu_usage)
        
        # Print status line with progress count and CPU usage
        if [ "$total" -gt 0 ]; then
            printf " ${hex_color}${hex_symbol}\033[0m Optimizing: %d/%d (%d threads)%*s\033[K\n" "$progress" "$total" "$CONCURRENCY" $((term_width - 30 - ${#progress} - ${#total})) "CPU: ${cpu_usage}%"
        else
            printf " ${hex_color}${hex_symbol}\033[0m Optimizing:%*s\033[K\n" $((term_width - 15)) "CPU: ${cpu_usage}%"
        fi
        
        # Print progress bar
        if [ "$total" -gt 0 ]; then
            printf "%s %2.0f%%\033[K\n" "$bar" "$percentage"
        else
            printf "Scanning images...\033[K\n"
        fi
        
        # Print each thread's status
        for ((i=1; i<=CONCURRENCY; i++)); do
            local thread_status=$(cat "$STATE_DIR/thread_$i" 2>/dev/null || echo "")
            if [ -n "$thread_status" ]; then
                # Truncate if too long
                if [ ${#thread_status} -gt $((term_width - 1)) ]; then
                    thread_status="${thread_status:0:$((term_width - 4))}..."
                fi
                printf "%s\033[K\n" "$thread_status"
            else
                printf "\033[K\n"
            fi
        done
        
        # Print blank line
        printf "\033[K\n"
        
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
total_lines=$((CONCURRENCY + 3))
printf "\033[${total_lines}A"

# Clear the animation lines
for ((i=0; i<total_lines; i++)); do
    printf "\033[K\n"
done

# Move back up
printf "\033[${total_lines}A"

# Print album completion messages
if [ -f "$ALBUM_TIMES_FILE" ] && [ -s "$ALBUM_TIMES_FILE" ]; then
    while IFS= read -r album_msg; do
        printf "%s\n" "$album_msg"
    done < "$ALBUM_TIMES_FILE"
    printf "\n"
fi

# Print final success message
printf " \033[32m✓\033[0m Done!\033[K\n"
printf "Generated %d optimized versions of %d images in %d seconds.\033[K\n" "$final_progress" "$total_original" "$ELAPSED"

if [ $exit_code -ne 0 ]; then
    exit 1
fi
