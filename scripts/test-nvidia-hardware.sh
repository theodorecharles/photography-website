#!/bin/bash
# Diagnostic script to test NVIDIA hardware acceleration in Docker

echo "=========================================="
echo "NVIDIA Hardware Acceleration Diagnostics"
echo "=========================================="
echo ""

echo "1. Checking NVIDIA GPU visibility..."
if [ -c /dev/nvidia0 ]; then
    echo "✓ NVIDIA device nodes present (/dev/nvidia0)"
    if command -v nvidia-smi >/dev/null 2>&1; then
        nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader 2>/dev/null || echo "(nvidia-smi found but query failed)"
        echo "✓ nvidia-smi is available"
    else
        echo "⚠ nvidia-smi not in container (this is OK if /dev/nvidia* exists)"
    fi
else
    echo "✗ No NVIDIA device nodes found"
    echo "  Make sure you're using --runtime=nvidia or --gpus all"
    echo "  Host must have nvidia-container-toolkit installed"
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
    echo "✓ h264_nvenc encoder is available in ffmpeg"
    
    # Try to actually use it
    echo ""
    echo "5. Testing actual NVENC encoding (creating test file)..."
    echo "   This will fail if NVIDIA drivers aren't accessible..."
    
    # Capture both stdout and stderr, show last few lines
    if ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=30 -c:v h264_nvenc -t 1 /tmp/test_nvenc.mp4 -y 2>&1 | tee /tmp/ffmpeg_test.log | tail -10; then
        if [ -f "/tmp/test_nvenc.mp4" ] && [ -s "/tmp/test_nvenc.mp4" ]; then
            echo ""
            echo "✅ NVENC test encoding SUCCEEDED!"
            echo "   GPU acceleration is working correctly!"
            rm -f /tmp/test_nvenc.mp4 /tmp/ffmpeg_test.log
        else
            echo ""
            echo "✗ NVENC encoding failed - check output above"
            echo "   Common issues:"
            echo "   - NVIDIA drivers not accessible in container"
            echo "   - Wrong GPU device or no --runtime=nvidia"
            rm -f /tmp/ffmpeg_test.log
        fi
    else
        echo ""
        echo "✗ NVENC test encoding failed"
        if grep -q "Cannot load libcuda" /tmp/ffmpeg_test.log 2>/dev/null; then
            echo "   Issue: Cannot load NVIDIA libraries"
            echo "   Solution: Make sure nvidia-container-toolkit is installed on host"
        elif grep -q "No NVENC capable devices found" /tmp/ffmpeg_test.log 2>/dev/null; then
            echo "   Issue: No NVENC-capable GPU found"
            echo "   Solution: Check --runtime=nvidia and NVIDIA_VISIBLE_DEVICES"
        fi
        rm -f /tmp/ffmpeg_test.log
    fi
else
    echo "✗ h264_nvenc encoder NOT available in ffmpeg"
    echo ""
    echo "   This means ffmpeg wasn't compiled with NVENC support."
    echo "   The image needs to be rebuilt with NVENC-enabled ffmpeg."
fi
echo ""

echo "=========================================="
echo "Diagnosis Complete"
echo "=========================================="

