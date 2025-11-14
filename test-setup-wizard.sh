#!/bin/bash

# Test Setup Wizard Script
# This script resets your local installation to test the setup wizard
# It clears the data/ folder to simulate a fresh installation

set -e

echo "🧹 Resetting data folder for setup wizard testing..."

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

# Stop any running PM2 processes
echo "  🛑 Stopping PM2 processes..."
pm2 stop all 2>/dev/null || true

echo ""
echo "✅ Data folder reset complete!"
echo ""
echo "📦 Backup saved to: $BACKUP_DIR"
echo ""
echo "🚀 Now you can test the setup wizard:"
echo ""
echo "  1. Run: npm run dev (in both frontend/ and backend/ directories)"
echo "  2. Open: http://localhost:3000"
echo "  3. Follow the setup wizard"
echo ""
echo "💡 Tip: The setup wizard will automatically appear since config.json is missing"
echo ""
echo "⚠️  To restore your backup: rm -rf data && mv $BACKUP_DIR data"
echo ""

