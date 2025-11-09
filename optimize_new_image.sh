#!/bin/bash
set -euo pipefail  # Exit on error, undefined variables, and pipe failures

# Script to optimize a single image
# Usage: ./optimize_new_image.sh <album_name> <image_filename>

if [ $# -lt 2 ]; then
    echo "ERROR: Missing required arguments"
    echo "Usage: ./optimize_new_image.sh <album_name> <image_filename>"
    exit 1
fi

ALBUM_NAME="$1"
IMAGE_FILENAME="$2"

# Read configuration from config.json
CONFIG_FILE="config/config.json"

# Read image optimization settings from config.json (nested under optimization.images)
THUMBNAIL_QUALITY=$(grep -A 20 '"optimization"' "$CONFIG_FILE" 2>/dev/null | grep -A 15 '"images"' | grep -A 2 '"thumbnail"' | grep '"quality"' | grep -o '[0-9]*' | head -1 || echo "60")
THUMBNAIL_MAX_DIM=$(grep -A 20 '"optimization"' "$CONFIG_FILE" 2>/dev/null | grep -A 15 '"images"' | grep -A 2 '"thumbnail"' | grep '"maxDimension"' | grep -o '[0-9]*' | head -1 || echo "512")

MODAL_QUALITY=$(grep -A 20 '"optimization"' "$CONFIG_FILE" 2>/dev/null | grep -A 15 '"images"' | grep -A 2 '"modal"' | grep '"quality"' | grep -o '[0-9]*' | head -1 || echo "90")
MODAL_MAX_DIM=$(grep -A 20 '"optimization"' "$CONFIG_FILE" 2>/dev/null | grep -A 15 '"images"' | grep -A 2 '"modal"' | grep '"maxDimension"' | grep -o '[0-9]*' | head -1 || echo "2048")

DOWNLOAD_QUALITY=$(grep -A 20 '"optimization"' "$CONFIG_FILE" 2>/dev/null | grep -A 15 '"images"' | grep -A 2 '"download"' | grep '"quality"' | grep -o '[0-9]*' | head -1 || echo "100")
DOWNLOAD_MAX_DIM=$(grep -A 20 '"optimization"' "$CONFIG_FILE" 2>/dev/null | grep -A 15 '"images"' | grep -A 2 '"download"' | grep '"maxDimension"' | grep -o '[0-9]*' | head -1 || echo "4096")

# Define paths
SOURCE_IMAGE="photos/$ALBUM_NAME/$IMAGE_FILENAME"

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "ERROR: Source image not found: $SOURCE_IMAGE"
    exit 1
fi

# Create album directories in optimized folders if they don't exist
mkdir -p "optimized/thumbnail/$ALBUM_NAME" 2>/dev/null || true
mkdir -p "optimized/modal/$ALBUM_NAME" 2>/dev/null || true
mkdir -p "optimized/download/$ALBUM_NAME" 2>/dev/null || true

# Define output paths for different image versions
THUMB_PATH="optimized/thumbnail/$ALBUM_NAME/$IMAGE_FILENAME"
MODAL_PATH="optimized/modal/$ALBUM_NAME/$IMAGE_FILENAME"
DOWNLOAD_PATH="optimized/download/$ALBUM_NAME/$IMAGE_FILENAME"

# Function to handle errors
handle_error() {
    echo "ERROR: Failed to optimize $IMAGE_FILENAME"
    exit 1
}

# Create thumbnail version
echo "Generating thumbnail for: $ALBUM_NAME/$IMAGE_FILENAME"
if ! convert "$SOURCE_IMAGE" -resize "${THUMBNAIL_MAX_DIM}x${THUMBNAIL_MAX_DIM}>" -quality $THUMBNAIL_QUALITY "$THUMB_PATH" 2>&1; then
    handle_error
fi

# Create modal version
echo "Generating modal for: $ALBUM_NAME/$IMAGE_FILENAME"
if ! convert "$SOURCE_IMAGE" -resize "${MODAL_MAX_DIM}x${MODAL_MAX_DIM}>" -quality $MODAL_QUALITY "$MODAL_PATH" 2>&1; then
    handle_error
fi

# Create download version
echo "Generating download for: $ALBUM_NAME/$IMAGE_FILENAME"
if ! convert "$SOURCE_IMAGE" -resize "${DOWNLOAD_MAX_DIM}x${DOWNLOAD_MAX_DIM}>" -quality $DOWNLOAD_QUALITY "$DOWNLOAD_PATH" 2>&1; then
    handle_error
fi

echo "Successfully optimized: $ALBUM_NAME/$IMAGE_FILENAME"
exit 0

