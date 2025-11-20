#!/bin/bash

# Test Setup Wizard Script
# This script resets your local installation to test the setup wizard
# It clears the data/ folder to simulate a fresh installation
#
# Usage:
#   ./test-setup-wizard.sh         - Reset data only
#   ./test-setup-wizard.sh --force - Reset data + node_modules + dist + package-locks

set -e

# Check for --force flag
FORCE_CLEAN=false
if [[ "$1" == "--force" ]]; then
    FORCE_CLEAN=true
    echo "🧹 Resetting data folder + dependencies for setup wizard testing..."
else
    echo "🧹 Resetting data folder for setup wizard testing..."
fi

# Create a backup of data folder (just in case)
if [ -d "data" ]; then
    BACKUP_DIR="data-backup-$(date +%Y%m%d-%H%M%S)"
    echo "  📦 Creating backup: $BACKUP_DIR"
    cp -r data "$BACKUP_DIR"
    echo "  ✓ Backup created"
fi

# Remove config file
if [ -f "data/config.json" ]; then
    echo "  ✓ Removing data/config.json"
    rm data/config.json
fi

# Remove ecosystem config (generated during setup)
if [ -f "ecosystem.config.cjs" ]; then
    echo "  ✓ Removing ecosystem.config.cjs"
    rm ecosystem.config.cjs
fi

# Remove database and SQLite WAL files
if [ -f "data/gallery.db" ]; then
    echo "  ✓ Removing data/gallery.db"
    rm data/gallery.db
fi
if [ -f "data/gallery.db-shm" ]; then
    echo "  ✓ Removing data/gallery.db-shm"
    rm data/gallery.db-shm
fi
if [ -f "data/gallery.db-wal" ]; then
    echo "  ✓ Removing data/gallery.db-wal"
    rm data/gallery.db-wal
fi

# Remove photos directory
if [ -d "data/photos" ]; then
    echo "  ✓ Removing data/photos/ directory"
    rm -rf data/photos
fi

# Remove optimized directory
if [ -d "data/optimized" ]; then
    echo "  ✓ Removing data/optimized/ directory"
    rm -rf data/optimized
fi

# Recreate empty data directory structure
mkdir -p data/photos
mkdir -p data/optimized

# Remove static JSON files
if [ -d "frontend/public/albums-data" ]; then
    echo "  ✓ Removing frontend/public/albums-data/"
    rm -rf frontend/public/albums-data
fi

# Remove icon files (will be regenerated from defaults in config/icons/)
if [ -f "frontend/public/icon-192.png" ]; then
    echo "  ✓ Removing frontend/public/icon-192.png"
    rm frontend/public/icon-192.png
fi
if [ -f "frontend/public/icon-512.png" ]; then
    echo "  ✓ Removing frontend/public/icon-512.png"
    rm frontend/public/icon-512.png
fi
if [ -f "frontend/public/apple-touch-icon.png" ]; then
    echo "  ✓ Removing frontend/public/apple-touch-icon.png"
    rm frontend/public/apple-touch-icon.png
fi
if [ -f "frontend/public/favicon.ico" ]; then
    echo "  ✓ Removing frontend/public/favicon.ico"
    rm frontend/public/favicon.ico
fi
if [ -f "frontend/public/favicon.png" ]; then
    echo "  ✓ Removing frontend/public/favicon.png"
    rm frontend/public/favicon.png
fi

# Stop any running PM2 processes
echo "  🛑 Stopping PM2 processes..."
pm2 stop all 2>/dev/null || true

# Only clean dependencies if --force flag is provided
if [ "$FORCE_CLEAN" = true ]; then
    echo ""
    echo "⚠️  Force clean enabled - removing dependencies..."
    
    # Remove node_modules folders
    echo "  🗑️  Removing node_modules folders..."
    if [ -d "node_modules" ]; then
        echo "    • Removing root node_modules/"
        rm -rf node_modules
    fi
    if [ -d "backend/node_modules" ]; then
        echo "    • Removing backend/node_modules/"
        rm -rf backend/node_modules
    fi
    if [ -d "frontend/node_modules" ]; then
        echo "    • Removing frontend/node_modules/"
        rm -rf frontend/node_modules
    fi

    # Remove dist folders
    echo "  🗑️  Removing dist folders..."
    if [ -d "backend/dist" ]; then
        echo "    • Removing backend/dist/"
        rm -rf backend/dist
    fi
    if [ -d "frontend/dist" ]; then
        echo "    • Removing frontend/dist/"
        rm -rf frontend/dist
    fi

    # Remove package-lock files
    echo "  🗑️  Removing package-lock.json files..."
    if [ -f "package-lock.json" ]; then
        echo "    • Removing root package-lock.json"
        rm package-lock.json
    fi
    if [ -f "backend/package-lock.json" ]; then
        echo "    • Removing backend/package-lock.json"
        rm backend/package-lock.json
    fi
    if [ -f "frontend/package-lock.json" ]; then
        echo "    • Removing frontend/package-lock.json"
        rm frontend/package-lock.json
    fi
else
    echo ""
    echo "💡 Tip: Use --force to also remove node_modules, dist, and package-lock files"
fi

echo ""
echo "✅ Data folder reset complete!"
echo ""
echo "📦 Backup saved to: $BACKUP_DIR"
echo ""
echo "🚀 Now you can test the setup wizard:"
echo ""
if [ "$FORCE_CLEAN" = true ]; then
    echo "  1. Run: npm install (in root, backend/, and frontend/ directories)"
    echo "  2. Run: npm run dev (in both frontend/ and backend/ directories)"
    echo "  3. Open: http://localhost:3000"
    echo "  4. Follow the setup wizard"
else
    echo "  1. Run: npm run dev (in both frontend/ and backend/ directories)"
    echo "  2. Open: http://localhost:3000"
    echo "  3. Follow the setup wizard"
fi
echo ""
echo "💡 Tip: The setup wizard will automatically appear since config.json is missing"
echo ""
echo "⚠️  To restore your backup: rm -rf data && mv $BACKUP_DIR data"
echo ""

