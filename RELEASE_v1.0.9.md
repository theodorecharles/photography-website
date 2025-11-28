# Galleria v1.0.9

## 🎉 First Public Release

Self-hosted photography portfolio platform built with React 19, TypeScript, and Express 5.

## ✨ Highlights

- Image optimization with automatic size generation
- Video support with hardware-accelerated encoding
- 37 languages with full localization
- Google OAuth, password auth, passkeys, and MFA
- Role-based access control (Viewer, Manager, Admin)
- Analytics integration with OpenObserve
- Private album sharing with expiration
- Docker images available on Docker Hub

## 🚀 Quick Start

```bash
docker pull tedcharles/galleria:latest
docker run -d --name galleria \
  -p 3000:3000 -p 3001:3001 \
  -v ~/galleria-data:/data \
  -e DATA_DIR=/data \
  -e FRONTEND_DOMAIN=http://localhost:3000 \
  -e BACKEND_DOMAIN=http://localhost:3001 \
  tedcharles/galleria:latest
```

Visit `http://localhost:3000` to complete setup.

**Live Demo**: [tedcharles.net](https://tedcharles.net) | **Docker Hub**: [hub.docker.com/r/tedcharles/galleria](https://hub.docker.com/r/tedcharles/galleria)

