# Galleria - Unraid Setup Guide

Docker image: `tedcharles/galleria:latest`

## Quick Setup

### 1. Pull the Image

In Unraid's Docker tab, search for `tedcharles/galleria` or add it manually.

### 2. Container Configuration

**Container Name:** `galleria`

**Network Type:** `Bridge`

**Ports:**
- Container Port: `3000` → Host Port: `3000` (Frontend)
- Container Port: `3001` → Host Port: `3001` (Backend/API)

**Volumes:**
- Container Path: `/data` → Host Path: `/mnt/user/appdata/galleria` (or your preferred location)

**Environment Variables:**
- `NODE_ENV` = `production`
- `FRONTEND_DOMAIN` = `http://your-unraid-ip:3000` (or your domain)
- `BACKEND_DOMAIN` = `http://your-unraid-ip:3001` (or your API domain)
- `DATA_DIR` = `/data`

### 3. Access

After starting the container:
- Frontend: `http://your-unraid-ip:3000`
- API: `http://your-unraid-ip:3001`

### 4. Initial Setup (OOBE)

On first launch, you'll be guided through the Out-Of-Box Experience setup wizard:
1. Set site name
2. Create admin account
3. Configure basic settings

### 5. Nginx Reverse Proxy (Optional)

If you want to use custom domains (e.g., `www.yourdomain.com` and `api.yourdomain.com`):

1. Set up Nginx Proxy Manager or similar
2. Point your domains to ports 3000 and 3001
3. Update environment variables:
   - `FRONTEND_DOMAIN` = `https://www.yourdomain.com`
   - `BACKEND_DOMAIN` = `https://api.yourdomain.com`
4. Restart the container

## Docker Compose Example

```yaml
services:
  galleria:
    image: tedcharles/galleria:latest
    container_name: galleria
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - FRONTEND_DOMAIN=http://192.168.1.100:3000
      - BACKEND_DOMAIN=http://192.168.1.100:3001
      - DATA_DIR=/data
    volumes:
      - /mnt/user/appdata/galleria:/data
    restart: unless-stopped
```

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console, make sure:
- `FRONTEND_DOMAIN` matches the URL you're accessing in your browser
- `BACKEND_DOMAIN` is reachable from your browser
- Both domains are properly configured

### Container Won't Start

Check logs: `docker logs galleria`

Common issues:
- Volume permissions (make sure `/mnt/user/appdata/galleria` exists and is writable)
- Port conflicts (make sure 3000 and 3001 aren't already in use)

## Data Persistence

All data is stored in the `/data` volume:
- `config.json` - Site configuration
- `gallery.db` - SQLite database
- `photos/` - Original uploaded photos
- `optimized/` - Optimized images (thumbnails, modal, download sizes)
- `logs/` - Application logs

## Updates

To update to the latest version:

```bash
docker pull tedcharles/galleria:latest
docker stop galleria
docker rm galleria
# Then recreate with your settings
```

Or use Unraid's built-in update functionality.

