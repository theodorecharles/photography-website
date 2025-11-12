#!/bin/bash

# Test Setup Wizard Script
# This script resets your local installation to test the setup wizard

set -e

echo "🧹 Cleaning up existing configuration..."

# Remove config file
if [ -f "config/config.json" ]; then
    echo "  ✓ Removing config/config.json"
    rm config/config.json
fi

# Remove database
if [ -f "gallery.db" ]; then
    echo "  ✓ Removing gallery.db"
    rm gallery.db
fi

# Remove photos directory (optional - comment out if you want to keep photos)
if [ -d "photos" ]; then
    echo "  ✓ Removing photos/ directory"
    rm -rf photos
fi

# Remove optimized directory (optional - comment out if you want to keep optimized images)
if [ -d "optimized" ]; then
    echo "  ✓ Removing optimized/ directory"
    rm -rf optimized
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "🚀 Now you can test the setup wizard:"
echo ""
echo "  1. Run: npm run dev"
echo "  2. Open: http://localhost:3000"
echo "  3. Follow the setup wizard"
echo ""
echo "💡 Tip: The setup wizard will automatically appear since config.json is missing"
echo ""

