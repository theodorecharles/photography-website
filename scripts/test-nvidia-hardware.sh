#!/bin/sh
# Diagnostic script to test NVIDIA hardware acceleration in Docker

echo "=========================================="
echo "NVIDIA Hardware Acceleration Diagnostics"
echo "=========================================="
echo ""

echo "1. Checking NVIDIA GPU visibility..."
if command -v nvidia-smi >/dev/null 2>&1; then
    nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
    echo "✓ nvidia-smi is available"
else
    echo "✗ nvidia-smi not found"
fi
echo ""

echo "2. Checking config.json hardware acceleration setting..."
if [ -f "/app/data/config.json" ]; then
    HW_ACCEL=$(cat /app/data/config.json | grep -A 5 '"video"' | grep 'hardwareAcceleration' | grep -o 'true\|false')
    echo "Hardware Acceleration in config: $HW_ACCEL"
else
    echo "✗ config.json not found"
fi
echo ""

echo "3. Checking FFmpeg encoders..."
echo "Available encoders:"
ffmpeg -hide_banner -encoders 2>/dev/null | grep -E "h264|hevc|nvenc" || echo "No h264/nvenc encoders found"
echo ""

echo "4. Testing NVIDIA NVENC encoder..."
if ffmpeg -hide_banner -encoders 2>/dev/null | grep -q "h264_nvenc"; then
    echo "✓ h264_nvenc encoder is available"
    
    # Try to actually use it
    echo "5. Testing actual NVENC encoding (creating test file)..."
    ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=30 -c:v h264_nvenc -t 1 /tmp/test_nvenc.mp4 -y 2>&1 | tail -5
    
    if [ -f "/tmp/test_nvenc.mp4" ]; then
        echo "✓ NVENC test encoding succeeded!"
        rm /tmp/test_nvenc.mp4
    else
        echo "✗ NVENC test encoding failed"
    fi
else
    echo "✗ h264_nvenc encoder NOT available"
    echo ""
    echo "This is the problem! FFmpeg doesn't have NVENC support."
    echo "The Alpine ffmpeg package doesn't include NVIDIA encoder support."
fi
echo ""

echo "=========================================="
echo "Diagnosis Complete"
echo "=========================================="

