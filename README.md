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
Navigate to `http://localhost:3000` and follow the **Setup Wizard**! 🚀

The wizard will guide you through:
- Site name and branding
- Admin account creation (password-based - no OAuth required)
- Color customization
- Optional Google OAuth setup (if you want OAuth login)
- Automatic database and directory creation

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

Main config file: `data/config.json` (copy from `config/config.example.json`)

**Basic structure:**
```json
{
  "environment": {
    "frontend": {
      "port": 3000,
      "apiUrl": "http://localhost:3001"
    },
    "backend": {
      "port": 3001,
      "allowedOrigins": ["http://localhost:5173"]
    },
    "auth": {
      "sessionSecret": "generate-random-secret",
      "authorizedEmails": ["your-email@example.com"]
    }
  },
  "branding": {
    "siteName": "Your Name",
    "primaryColor": "#4ade80",
    "secondaryColor": "#22c55e"
  }
}
```

**Note:** Google OAuth is optional - only add `"google"` section to `auth` if you want OAuth login.

### Google OAuth Setup (Optional)

Google OAuth is completely optional. You can use password-based authentication without any OAuth setup.

**To enable Google OAuth login:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://api.yourdomain.com/api/auth/google/callback`
4. Copy Client ID and Secret to `config.json` under `auth.google`

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
│   ├── config.json      # Main configuration
│   ├── photos/          # Original photos
│   ├── optimized/       # Generated images
│   └── gallery.db       # SQLite database
├── config/
│   └── config.example.json  # Config template
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
- Update `allowedOrigins` in `config.json` and restart backend
- For Docker: Check `FRONTEND_DOMAIN` and `BACKEND_DOMAIN` environment variables

**Authentication issues:**
- For password auth: Ensure user account exists and password is set
- For Google OAuth: Verify OAuth redirect URIs are correct (if using OAuth)
- Check email is in `authorizedEmails` (for OAuth) or user exists (for password)
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

Creative Commons Attribution 4.0 International (CC BY 4.0)

You are free to share and adapt with attribution.

---

**Built by [Ted Charles](https://tedcharles.net) with React, TypeScript, and Express**
