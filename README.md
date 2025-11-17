# Galleria

A modern photography portfolio website built with React 19, TypeScript, Express 5, and SQLite. Features optimized image delivery, admin panel, analytics tracking, and responsive design.

**🌐 Live Demo:** [tedcharles.net](https://tedcharles.net)

---

## Quick Start

### Prerequisites

- **Node.js** 18+ (for development)
- **Docker & Docker Compose** (for Docker deployment)
- **Google OAuth credentials** (optional - password-based authentication works without it)

---

## 🚀 Getting Started

### Option 1: Docker (Recommended)

**Single container deployment with PM2 process management.**

1. **Clone the repository:**
```bash
git clone https://github.com/theodorecharles/Galleria.git
cd Galleria
```

2. **Create a data directory:**
```bash
mkdir -p ~/galleria-data
```

3. **Configure environment variables** in `docker-compose.yml`:
```yaml
environment:
  - DATA_DIR=/data
  - FRONTEND_DOMAIN=http://localhost:3000  # or https://www.yourdomain.com
  - BACKEND_DOMAIN=http://localhost:3001   # or https://api.yourdomain.com
volumes:
  - ~/galleria-data:/data
```

4. **Build and start:**
```bash
docker-compose up -d --build
```

5. **Access the application:**
- Frontend: http://localhost:3000
- Admin Panel: http://localhost:3000/admin

**📖 For detailed Docker documentation, see [README.docker.md](README.docker.md)**

---

### Option 2: Development Setup

1. **Clone and install dependencies:**
```bash
git clone https://github.com/theodorecharles/Galleria.git
cd Galleria
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

2. **Start the development server:**
```bash
npm run dev
```

3. **Open your browser:**
Navigate to `http://localhost:3000` - the setup wizard will guide you through initial configuration.

---

## 📦 Production Deployment

### Using PM2

```bash
# Build both frontend and backend
npm run build

# Install PM2 globally
npm install -g pm2

# Start services
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Using Docker

See [Docker Deployment](#option-1-docker-recommended) section above.

### Automated Deployment

**Via GitHub Actions:**

Push to `master` (prod) or `devel` branch, and GitHub Actions automatically deploys.

**Manual deployment:**
```bash
git pull origin <branch>
./restart.sh
```

The `restart.sh` script handles:
- Install all dependencies
- Optimize all images
- Build both frontend and backend
- Restart services via PM2
- Send Telegram notifications on success/failure

---

## ⚙️ Configuration

Configuration is managed through environment variables or the admin panel - you don't need to edit config files directly.

### Docker Deployment

Configure via environment variables in `docker-compose.yml`:

```yaml
environment:
  - DATA_DIR=/data
  - FRONTEND_DOMAIN=http://localhost:3000  # or https://www.yourdomain.com
  - BACKEND_DOMAIN=http://localhost:3001   # or https://api.yourdomain.com
```

**📖 For detailed Docker configuration, see [README.docker.md](README.docker.md)**

### Non-Docker Deployment

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your settings:**
   ```bash
   FRONTEND_DOMAIN=http://localhost:3000
   BACKEND_DOMAIN=http://localhost:3001
   DATA_DIR=./data
   ```

After initial setup, all configuration is managed through the **Admin Panel** at `/admin` → Settings.

### Google OAuth Setup (Optional)

Google OAuth is completely optional. You can use password-based authentication without any OAuth setup.

**To enable Google OAuth login:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://api.yourdomain.com/api/auth/google/callback`
4. Configure OAuth credentials in Admin Panel → Settings → Advanced Settings → Authentication

---

## 📸 Adding Photos

**Via Admin Panel:**
1. Navigate to `/admin`
2. Select album → Upload Photos
3. Images auto-optimize in background

**Via Filesystem:**
```bash
mkdir data/photos/new-album
cp *.jpg data/photos/new-album/
node scripts/optimize_all_images.js
```

---

## 🛠️ Common Tasks

**View logs (PM2):**
```bash
pm2 logs
```

**View logs (Docker):**
```bash
docker exec galleria pm2 logs
```

**Restart services:**
```bash
pm2 restart all
# or
docker-compose restart
```

**Optimize images:**
```bash
node scripts/optimize_all_images.js
```

---

## 📚 Project Structure

```
galleria/
├── backend/              # Express API
│   ├── src/
│   │   ├── server.ts    # Main server
│   │   └── routes/      # API endpoints
│   └── package.json
├── frontend/            # React app
│   ├── src/
│   └── package.json
├── data/                # Data directory (not in Git)
│   ├── config.json      # Configuration (auto-generated, managed via admin panel)
│   ├── photos/          # Original photos
│   ├── optimized/       # Generated images
│   └── gallery.db       # SQLite database
├── .env.example         # Environment variables template (copy to .env)
├── scripts/             # Utility scripts
├── Dockerfile           # Docker container
├── docker-compose.yml   # Docker Compose config
└── package.json         # Root dependencies
```

---

## 🔒 Security

- ✅ CSRF protection on all mutations
- ✅ Rate limiting (configurable)
- ✅ Input validation and sanitization
- ✅ Path traversal protection
- ✅ Security headers (Helmet)
- ✅ HTTPS enforcement in production
- ✅ Multiple auth methods (OAuth, password, passkey)
- ✅ Role-based access control (viewer, manager, admin)

---

## 🐛 Troubleshooting

**Images not showing:**
```bash
node scripts/optimize_all_images.js
```

**CORS errors:**
- For Docker: Check `FRONTEND_DOMAIN` and `BACKEND_DOMAIN` environment variables in `docker-compose.yml`
- For non-Docker: Check `FRONTEND_DOMAIN` and `BACKEND_DOMAIN` in `.env` file
- Restart services after changing configuration

**Authentication issues:**
- For password auth: Ensure user account exists and password is set
- For Google OAuth: Verify OAuth redirect URIs are correct (if using OAuth)
- Check OAuth configuration in Admin Panel → Settings → Advanced Settings → Authentication
- Ensure cookies are enabled

**Port conflicts:**
```bash
lsof -i :3001  # Check what's using port
kill -9 <PID>  # Kill the process
```

---

## 📖 Additional Documentation

- **[README.docker.md](README.docker.md)** - Detailed Docker deployment guide

---

## 🔗 Links

- **📦 Repository:** [github.com/theodorecharles/Galleria](https://github.com/theodorecharles/Galleria)
- **🐛 Issues:** [GitHub Issues](https://github.com/theodorecharles/Galleria/issues)
- **📧 Contact:** [me@tedcharles.net](mailto:me@tedcharles.net)

---

## License

GNU General Public License v3.0

Copyright (c) 2025 Ted Charles

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

---

**Built by [Ted Charles](https://tedcharles.net) with React, TypeScript, and Express**
