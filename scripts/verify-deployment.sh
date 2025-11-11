#!/bin/bash
# Deployment Verification Script
# Run this after deployment to verify everything is working

set -e

echo "🔍 Verifying deployment..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must be run from project root${NC}"
    exit 1
fi

# Check if static JSON files exist
echo "📁 Checking static JSON files..."
JSON_DIR="frontend/public/albums-data"

if [ -d "$JSON_DIR" ]; then
    JSON_COUNT=$(find "$JSON_DIR" -name "*.json" -type f | wc -l)
    if [ "$JSON_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓${NC} Found $JSON_COUNT static JSON files"
        ls -lh "$JSON_DIR"/*.json 2>/dev/null | tail -5
    else
        echo -e "${YELLOW}⚠${NC}  No static JSON files found (will be generated on first album change)"
    fi
else
    echo -e "${YELLOW}⚠${NC}  Directory $JSON_DIR not found (will be created automatically)"
fi

echo ""

# Check if service worker exists
echo "🔧 Checking service worker..."
SW_FILE="frontend/public/sw.js"

if [ -f "$SW_FILE" ]; then
    echo -e "${GREEN}✓${NC} Service worker found"
    echo "   Size: $(wc -c < "$SW_FILE") bytes"
else
    echo -e "${RED}❌${NC} Service worker NOT found at $SW_FILE"
fi

echo ""

# Check if frontend build exists
echo "📦 Checking frontend build..."
DIST_DIR="frontend/dist"

if [ -d "$DIST_DIR" ]; then
    echo -e "${GREEN}✓${NC} Frontend build found"
    echo "   Files: $(find "$DIST_DIR" -type f | wc -l)"
    echo "   Size: $(du -sh "$DIST_DIR" | cut -f1)"
else
    echo -e "${RED}❌${NC} Frontend build NOT found at $DIST_DIR"
    echo "   Run: npm run build"
fi

echo ""

# Check if backend is compiled
echo "⚙️  Checking backend build..."
BACKEND_DIST="backend/dist"

if [ -d "$BACKEND_DIST" ]; then
    echo -e "${GREEN}✓${NC} Backend build found"
    echo "   Files: $(find "$BACKEND_DIST" -type f -name "*.js" | wc -l) JavaScript files"
else
    echo -e "${RED}❌${NC} Backend build NOT found at $BACKEND_DIST"
    echo "   Run: npm run build"
fi

echo ""

# Check if PM2 is running the services
echo "🚀 Checking PM2 processes..."

if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "online"; then
        echo -e "${GREEN}✓${NC} PM2 processes running"
        pm2 list | grep -E "backend|frontend" || echo "   (no backend/frontend processes found)"
    else
        echo -e "${YELLOW}⚠${NC}  PM2 processes not running"
        echo "   Start with: pm2 start ecosystem.config.cjs"
    fi
else
    echo -e "${YELLOW}⚠${NC}  PM2 not installed"
fi

echo ""

# Check if backend is responding
echo "🌐 Checking backend API..."
BACKEND_URL="http://localhost:3001/api/health"

if curl -s -f "$BACKEND_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend API responding"
    echo "   $BACKEND_URL"
else
    echo -e "${RED}❌${NC} Backend API not responding"
    echo "   Expected: $BACKEND_URL"
fi

echo ""

# Check if frontend is responding
echo "🖥️  Checking frontend..."
FRONTEND_URL="http://localhost:3000"

if curl -s -f "$FRONTEND_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Frontend responding"
    echo "   $FRONTEND_URL"
else
    echo -e "${RED}❌${NC} Frontend not responding"
    echo "   Expected: $FRONTEND_URL"
fi

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Verification complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Check DevTools → Application → Service Workers"
echo "3. Check DevTools → Network → Look for static JSON files"
echo "4. Run Lighthouse performance test"
echo ""
echo "To generate static JSON manually:"
echo "  npm run generate-static-json"
echo ""
echo "To view PM2 logs:"
echo "  pm2 logs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

