#!/bin/bash
# Start script for local development using PM2
# Starts backend and frontend with proper configuration

set -e

cd "$(dirname "$0")"

# Determine data directory (use DATA_DIR env var or default to ./data)
DATA_DIR="${DATA_DIR:-$(pwd)/data}"
LOGS_DIR="$DATA_DIR/logs"

# Ensure logs directory exists
mkdir -p "$LOGS_DIR"

# Delete existing processes
pm2 delete all 2>/dev/null || true

echo "Starting backend..."
cd backend
pm2 start npx --name backend \
  --cwd "$(pwd)" \
  --log "$LOGS_DIR/backend-out.log" \
  --error "$LOGS_DIR/backend-error.log" \
  -- tsx src/server.ts \
  --update-env "NODE_ENV=production,PORT=3001,HOST=0.0.0.0,DATA_DIR=$DATA_DIR"

echo "Starting frontend..."
cd ../frontend
pm2 start node --name frontend \
  --cwd "$(pwd)" \
  --log "$LOGS_DIR/frontend-out.log" \
  --error "$LOGS_DIR/frontend-error.log" \
  -- server.js \
  --update-env "NODE_ENV=production,PORT=3000,HOST=0.0.0.0,DATA_DIR=$DATA_DIR,API_URL=http://localhost:3001"

cd ..

echo ""
echo "✅ Services started!"
echo "Run 'pm2 list' to see status"
echo "Run 'pm2 logs' to see logs"
echo ""
pm2 list
