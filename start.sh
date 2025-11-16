#!/bin/sh
set -e

# Use PM2 to manage processes in Docker
cd /app

# Start both services from Docker-specific PM2 config
pm2 start ecosystem.docker.cjs

# Keep container running and show logs
pm2 logs --lines 0

