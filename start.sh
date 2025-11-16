#!/bin/sh
set -e

# Use PM2 to manage processes in Docker
cd /app

# Start frontend from config
pm2 start ecosystem.config.cjs --only frontend

# Start backend manually in fork mode (PM2 config has issues with exec_mode)
pm2 start /app/backend --name backend \
  --interpreter tsx \
  --interpreter-args "src/server.ts" \
  --cwd /app/backend \
  --log /data/logs/backend-out.log \
  --error /data/logs/backend-error.log \
  --merge-logs \
  --env NODE_ENV=production,PORT=3001,HOST=0.0.0.0

# Keep container running and show logs
pm2 logs --lines 0

