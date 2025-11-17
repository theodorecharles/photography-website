# Deployment Guide

## Two Deployment Methods

### 1. Docker Deployment

**Use Case**: Production servers, consistent environments

**Configuration**: Set environment variables in `docker-compose.yml`

```yaml
environment:
  FRONTEND_DOMAIN: https://www.mydomain.com
  BACKEND_DOMAIN: https://api.mydomain.com
  DATA_DIR: /data
```

**CORS Support**:
- Works on localhost
- Works on 127.0.0.1
- Works on any internal IP (e.g., `4.20.69.195:3000`)
- Works with nginx reverse proxy pointing domains to container IPs

**Scripts**:
- `start-docker.sh` - Starts PM2 with `ecosystem.docker.cjs`
- Run: `docker-compose up -d`

---

### 2. Non-Docker Deployment (Local/Dev/Prod Servers)

**Use Case**: Local development, direct server deployment

**Configuration**: Create `.env` file from `.env.example`

**For local laptop**:
```bash
FRONTEND_DOMAIN=http://localhost:3000
BACKEND_DOMAIN=http://localhost:3001
```

**For dev server**:
```bash
FRONTEND_DOMAIN=https://www-dev.tedcharles.net
BACKEND_DOMAIN=https://api-dev.tedcharles.net
```

**For prod server**:
```bash
FRONTEND_DOMAIN=https://www.tedcharles.net
BACKEND_DOMAIN=https://api.tedcharles.net
```

**Scripts**:
- `restart.sh` - Deploys and starts PM2 with `ecosystem.config.cjs`
- Run: `./restart.sh`

---

## CORS Configuration

Both setups automatically allow:
- Localhost on any port (for development)
- 127.0.0.1 on any port
- Internal IPs on ports 3000/3001 (for Docker networking)
- Domains specified in FRONTEND_DOMAIN and BACKEND_DOMAIN
- During OOBE setup, any HTTPS origin is allowed

---

## File Overview

| File | Purpose |
|------|---------|
| `.env` | Environment variables for non-Docker deployment |
| `.env.example` | Template for `.env` with examples |
| `ecosystem.local.cjs` | PM2 config for non-Docker (reads `.env`) |
| `ecosystem.docker.cjs` | PM2 config for Docker |
| `ecosystem.config.cjs` | Generated at runtime (gitignored) |
| `restart.sh` | Deploy script for non-Docker (copies ecosystem.local.cjs) |
| `start-docker.sh` | Startup script for Docker (copies ecosystem.docker.cjs) |
| `docker-compose.yml` | Docker orchestration |

---

## Quick Start

### Local Development (Laptop)
```bash
cp .env.example .env
# Edit .env to use localhost (default)
./restart.sh
```
Access: http://localhost:3000

### Dev/Prod Server
```bash
cp .env.example .env
# Edit .env with your domains
./restart.sh
```
Access: https://www-dev.tedcharles.net (or your configured domain)

### Docker
```bash
# Edit docker-compose.yml environment variables
docker-compose up -d
```
Access: http://your-server-ip:3000 or https://www.mydomain.com

