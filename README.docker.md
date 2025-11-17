# Docker Setup Guide

This guide explains how to run Galleria in Docker containers.

## Prerequisites

- Docker and Docker Compose installed
- A data directory (will be created automatically if it doesn't exist)

## Quick Start

1. **Set environment variables** in `docker-compose.yml`:
   ```yaml
   environment:
     - DATA_DIR=/data
     - FRONTEND_DOMAIN=https://www.tedcharles.net
     - BACKEND_DOMAIN=https://api.tedcharles.net
   ```

2. **Mount your data directory**:
   ```yaml
   volumes:
     - /path/to/your/data:/data
   ```

3. **Build and start**:
   ```bash
   docker-compose up -d --build
   ```

## Environment Variables

### Required

- `DATA_DIR` - Path to data directory inside container (default: `/data`)
- `FRONTEND_DOMAIN` - Frontend domain (e.g., `www.tedcharles.net` or `https://www.tedcharles.net`)
- `BACKEND_DOMAIN` - Backend API domain (e.g., `api.tedcharles.net` or `https://api.tedcharles.net`)

### Optional

- `ALLOWED_ORIGINS` - Additional allowed CORS origins (comma-separated)
- `PORT` - Backend port (default: 3001) or Frontend port (default: 3000)

## CORS Configuration

The backend automatically allows:

1. **Localhost** - Any port (for development)
   - `http://localhost:*`
   - `http://127.0.0.1:*`

2. **Internal IPs** - Ports 3000 and 3001 (for Docker networking)
   - `http://192.168.*.*:3000`
   - `http://192.168.*.*:3001`
   - `http://10.*.*.*:3000`
   - `http://10.*.*.*:3001`
   - `http://172.16-31.*.*:3000`
   - `http://172.16-31.*.*:3001`

3. **Provided Domains** - From `FRONTEND_DOMAIN` and `BACKEND_DOMAIN` environment variables

## Usage Scenarios

### Localhost Development

```yaml
environment:
  - FRONTEND_DOMAIN=http://localhost:3000
  - BACKEND_DOMAIN=http://localhost:3001
```

### Internal Network (Docker)

Works automatically - internal IPs on ports 3000/3001 are allowed.

### Production with Nginx

```yaml
environment:
  - FRONTEND_DOMAIN=https://www.tedcharles.net
  - BACKEND_DOMAIN=https://api.tedcharles.net
```

Nginx should proxy:
- `www.tedcharles.net` → `frontend:3000`
- `api.tedcharles.net` → `backend:3001`

## Volume Mounting

Mount your data directory to `/data` in both containers:

```yaml
volumes:
  - /host/path/to/data:/data        # Backend (read-write)
  - /host/path/to/data:/data:ro     # Frontend (read-only)
```

The data directory will contain (created automatically):
- `config.json` - Application configuration (auto-generated via setup wizard or admin panel)
- `photos/` - Original photos (create albums here)
- `optimized/` - Optimized images (generated automatically)
- `gallery.db` - SQLite database (created automatically)
- `logs/` - Application logs

## Health Checks

Both services include health checks:
- Backend: `http://localhost:3001/api/health`
- Frontend: `http://localhost:3000`

## Troubleshooting

### CORS Errors

If you see CORS errors, check:
1. `FRONTEND_DOMAIN` matches the actual frontend URL
2. `BACKEND_DOMAIN` matches the actual backend URL
3. For localhost, ensure you're using the correct port

### Config Not Found

If `config.json` doesn't exist:
1. The app will run in setup mode
2. Access `/setup` to configure via the setup wizard
3. Configuration will be saved automatically to `/data/config.json`
4. After initial setup, manage configuration via Admin Panel → Settings

### Port Conflicts

If ports 3000 or 3001 are in use:
```yaml
ports:
  - "3002:3000"  # Map host port 3002 to container port 3000
```

### Database Permissions

Ensure the data directory is writable:
```bash
chmod -R 755 /path/to/data
```

## Building

Build images individually:
```bash
docker-compose build backend
docker-compose build frontend
```

Or build all:
```bash
docker-compose build
```

## Logs

View logs:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Stopping

Stop containers:
```bash
docker-compose down
```

Remove volumes (⚠️ deletes data):
```bash
docker-compose down -v
```

