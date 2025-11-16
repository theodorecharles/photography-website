# Photography Website

A modern, secure photography portfolio website built with React 19, TypeScript, Express 5, and Node.js. Features optimized image delivery, admin panel, analytics tracking, and responsive design.

![Hero image showing the main photo gallery view](screenshots/Hero%20image%20showing%20the%20main%20photo%20gallery%20view.png)

**🌐 Live Demo:** [tedcharles.net](https://tedcharles.net)

---

## Features

- 📸 **Album-based Organization** - Folders automatically become albums
- 🚀 **Optimized Images** - Three sizes generated (thumbnail, modal, download)
- 📱 **Fully Responsive** - Beautiful on all devices
- 🔐 **Multiple Auth Methods** - Google OAuth, password-based, or passkey authentication
- 🎨 **Visual Branding Manager** - Customize colors, meta tags, and avatar via UI
- 📊 **Analytics Dashboard** - Built-in OpenObserve integration with recharts and visitor map
- 🔗 **Links Manager** - Configure external navigation links
- 🖼️ **Photo Upload** - Upload up to 20 photos with automatic optimization
- 🤖 **AI Title Generation** - Optional OpenAI integration for photo descriptions
- 🔍 **SEO Optimized** - Dynamic sitemap, meta tags, structured data
- 🔒 **Security Hardened** - CSRF protection, rate limiting, input validation
- 📲 **Telegram Notifications** - Deployment status alerts via Telegram bot
- 🔗 **Share Links** - Generate shareable album links with optional expiration
- 👁️ **Password Visibility Toggle** - Eye icon to view/copy sensitive settings
- 🐳 **Docker Support** - Single container deployment with PM2

---

## Screenshots

<table>
<tr>
<td width="50%">

### Public Gallery
![Main gallery](screenshots/Main%20gallery%20showing%20photo%20grid%20with%20responsive%20layout.png)

</td>
<td width="50%">

### Photo Modal
![Photo modal](screenshots/Full-screen%20photo%20modal%20with%20navigation%20arrows.png)

</td>
</tr>
<tr>
<td width="50%">

### Admin Portal
![Admin portal](screenshots/Admin%20portal%20dashboard%20overview.png)

</td>
<td width="50%">

### Analytics Dashboard
![Analytics](screenshots/Analytics%20dashboard%20with%20charts%20and%20graphs.png)

</td>
</tr>
</table>

---

## Quick Start

### Prerequisites

- **Node.js** 18+ (for development)
- **Docker & Docker Compose** (for Docker deployment)
- **Google OAuth credentials** (optional, for admin features)

---

## Deployment Options

### 🐳 Docker Deployment (Recommended)

**Single container deployment with PM2 process management.**

#### Quick Start

1. **Clone the repository:**
```bash
git clone https://github.com/theodoreroddy/photography-website.git
cd photography-website
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
```

4. **Mount your data directory** in `docker-compose.yml`:
```yaml
volumes:
  - ~/galleria-data:/data
```

5. **Build and start:**
```bash
docker-compose up -d --build
```

6. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Admin Panel: http://localhost:3000/admin

#### Docker Environment Variables

**Required:**
- `DATA_DIR` - Path to data directory inside container (default: `/data`)
- `FRONTEND_DOMAIN` - Frontend domain (e.g., `http://localhost:3000` or `https://www.yourdomain.com`)
- `BACKEND_DOMAIN` - Backend API domain (e.g., `http://localhost:3001` or `https://api.yourdomain.com`)

**Optional:**
- `ALLOWED_ORIGINS` - Additional allowed CORS origins (comma-separated)
- `PORT` - Override default ports (3000 for frontend, 3001 for backend)

#### Docker CORS Configuration

The backend automatically allows:
- **Localhost** - Any port (for development)
- **Internal IPs** - Ports 3000 and 3001 (for Docker networking)
- **Provided Domains** - From `FRONTEND_DOMAIN` and `BACKEND_DOMAIN` environment variables
- **Config.json** - Origins from `config.json` (if not overridden by env vars)

#### Docker Usage Scenarios

**Localhost Development:**
```yaml
environment:
  - FRONTEND_DOMAIN=http://localhost:3000
  - BACKEND_DOMAIN=http://localhost:3001
```

**Production with Nginx:**
```yaml
environment:
  - FRONTEND_DOMAIN=https://www.yourdomain.com
  - BACKEND_DOMAIN=https://api.yourdomain.com
```

Nginx should proxy:
- `www.yourdomain.com` → `container:3000` (frontend)
- `api.yourdomain.com` → `container:3001` (backend)

#### Docker Commands

```bash
# Start containers
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop containers
docker-compose down

# Rebuild after code changes
docker-compose build app
docker-compose up -d

# View PM2 process status
docker exec galleria pm2 list

# View backend logs
docker exec galleria tail -f /data/logs/backend-out.log
```

#### Docker Architecture

- **Single Container** - Both frontend and backend run in one container
- **PM2 Process Manager** - Manages both processes with automatic restarts
- **Volume Mounting** - Data directory mounted from host for persistence
- **Health Checks** - Automatic health monitoring and restart on failure
- **ARM64 Support** - Native ARM64 builds for Apple Silicon and ARM servers

**For detailed Docker documentation, see [README.docker.md](README.docker.md)**

---

### 💻 Development Setup

#### 🎉 Interactive Setup Wizard

**For first-time setup, we now have an interactive setup wizard!**

1. **Clone and install dependencies:**
```bash
git clone https://github.com/theodoreroddy/photography-website.git
cd photography-website
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
- Admin account creation (password or Google OAuth)
- Color customization
- Optional Google OAuth setup
- Automatic database and directory creation

**📖 For detailed setup instructions, see [SETUP_GUIDE.md](SETUP_GUIDE.md)**

#### Manual Configuration (Alternative)

If you prefer manual configuration:

```bash
cp config/config.example.json data/config.json
```

Edit `data/config.json` with your settings:
- Update `branding` section (site name, colors)
- Add Google OAuth credentials (see [Google OAuth Setup](#google-oauth-setup))
- Add your email to `authorizedEmails`
- Configure OpenObserve for analytics (optional)

**Generate secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Note:** See [Configuration](#configuration) for complete config structure with environment-specific settings.

3. **Add your photos:**
```bash
mkdir -p data/photos/homepage data/photos/nature data/photos/portfolio
# Copy your photos into these folders
```

4. **Optimize images:**
```bash
node scripts/optimize_all_images.js
```

This creates three versions: thumbnail (512px), modal (2048px), download (4096px).

> **Note:** For single image optimization (used automatically during uploads), there's also `scripts/optimize_new_image.js` that optimizes one image at a time.

5. **Start development:**
```bash
# Single command to run both frontend and backend
npm run dev
```

Or if you prefer separate terminals:
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

6. **Open browser**: http://localhost:5173

---

## Admin Panel

Access at `/admin` → Sign in with Google, password, or passkey → Manage everything:

- **Albums Tab** - Create/delete albums, upload photos, generate share links
- **Links Tab** - Manage external navigation links
- **Branding Tab** - Customize colors, site name, avatar
- **Metrics Tab** - View analytics, charts, and visitor location map
- **Settings Tab** - Configure OpenAI, optimization, analytics, and authentication

![Admin interface](screenshots/Admin%20interface%20showing%20album%20management.png)

---

## Production Deployment

### Docker Deployment (Recommended)

See [Docker Deployment](#-docker-deployment-recommended) section above.

### Traditional PM2 Deployment

#### Build

**Using the unified build script (recommended):**
```bash
npm run build
```

This runs `build.js` which automatically:
- Builds both frontend and backend
- Injects config values as environment variables
- Updates robots.txt with your sitemap URL

**Or build individually:**
```bash
cd backend && npm run build
cd ../frontend && npm run build
```

#### Using PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

#### Automated Deployment

**Via GitHub Actions (recommended):**

Push to `master` (prod) or `devel` branch, and GitHub Actions automatically:
- Pulls latest changes on the target VM
- Runs the restart script with full deployment

**Manual deployment:**
```bash
git pull origin <branch>
./restart.sh
```

The `restart.sh` script handles:
- Install all dependencies (root, backend, frontend)
- Optimize all images
- Build both frontend and backend
- Restart services via PM2
- Send Telegram notifications on success/failure

**Set production mode:**
```bash
export NODE_ENV=production
```

Update `config.json` production section with your domain and HTTPS settings.

---

## Configuration

Main config file: `data/config.json` (copy from `config/config.example.json`)

**Structure:**
```json
{
  "environment": {
    "frontend": {
      "port": 3000,
      "apiUrl": "http://localhost:3001"
    },
    "backend": {
      "port": 3001,
      "photosDir": "photos",
      "allowedOrigins": ["http://localhost:5173"]
    },
    "optimization": {
      "concurrency": 4,
      "images": {
        "thumbnail": { "quality": 60, "maxDimension": 512 },
        "modal": { "quality": 90, "maxDimension": 2048 },
        "download": { "quality": 100, "maxDimension": 4096 }
      }
    },
    "security": {
      "allowedHosts": ["localhost:3000"],
      "rateLimitWindowMs": 1000,
      "rateLimitMaxRequests": 30
    },
    "auth": {
      "google": {
        "clientId": "your-client-id",
        "clientSecret": "your-client-secret"
      },
      "sessionSecret": "generate-random-secret",
      "authorizedEmails": ["your-email@example.com"]
    }
  },
  "branding": {
    "siteName": "Your Name",
    "avatarPath": "/photos/avatar.png",
    "primaryColor": "#4ade80",
    "secondaryColor": "#22c55e",
    "metaDescription": "Photography portfolio",
    "metaKeywords": "photography, portfolio",
    "faviconPath": "/favicon.ico"
  },
  "analytics": {
    "scriptPath": "",
    "openobserve": {
      "enabled": false,
      "endpoint": "https://log.yourdomain.com/api/",
      "organization": "your-org",
      "stream": "website",
      "username": "user",
      "password": "pass"
    }
  },
  "notifications": {
    "telegram": {
      "enabled": false,
      "botToken": "your-bot-token",
      "chatId": "your-chat-id"
    }
  },
  "externalLinks": [
    { "title": "My Blog", "url": "https://blog.example.com" },
    { "title": "Login", "url": "/admin" }
  ]
}
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://api.yourdomain.com/api/auth/google/callback`
4. Copy Client ID and Secret to `config.json`

---

## Tech Stack

**Frontend:** React 19, TypeScript, React Router 7, Vite 6, Recharts  
**Backend:** Express 5, TypeScript, Passport.js, Multer  
**Image Processing:** Sharp (Node.js)  
**Analytics:** OpenObserve  
**Process Management:** PM2  
**Containerization:** Docker, Docker Compose

---

## Project Structure

```
photography-website/
├── backend/              # Express API
│   ├── src/
│   │   ├── server.ts    # Main server
│   │   ├── routes/      # API endpoints
│   │   └── security.ts  # Security middleware
│   └── package.json
├── frontend/            # React app
│   ├── src/
│   │   ├── App.tsx
│   │   └── components/
│   ├── dist/            # Production build
│   └── package.json
├── data/                # Data directory (not in Git)
│   ├── config.json      # Main configuration
│   ├── photos/          # Original photos
│   ├── optimized/       # Generated images
│   ├── gallery.db       # SQLite database
│   └── logs/            # Application logs
├── config/
│   └── config.example.json  # Config template
├── scripts/
│   ├── optimize_all_images.js   # Bulk image optimization
│   ├── optimize_new_image.js    # Single image optimization
│   └── generate-ai-titles.js   # AI title generation
├── Dockerfile           # Single container Dockerfile
├── docker-compose.yml   # Docker Compose configuration
├── start.sh             # PM2 startup script
├── ecosystem.config.cjs # PM2 configuration
├── build.js             # Unified build script
├── restart.sh           # Automated deployment
└── package.json         # Root dependencies
```

---

## Common Tasks

**Add photos via admin:**
1. Navigate to `/admin`
2. Select album → Upload Photos
3. Images auto-optimize in background

**Add photos via filesystem:**
```bash
mkdir data/photos/new-album
cp *.jpg data/photos/new-album/
node scripts/optimize_all_images.js
```

**Generate AI titles (optional):**
```bash
# Add OpenAI API key to config.json first
node scripts/generate-ai-titles.js
```

**View logs (PM2):**
```bash
pm2 logs
```

**View logs (Docker):**
```bash
docker exec galleria pm2 logs
# or
docker exec galleria tail -f /data/logs/backend-out.log
```

**Restart services (PM2):**
```bash
pm2 restart all
```

**Restart services (Docker):**
```bash
docker-compose restart
# or via admin panel restart button
```

---

## API Endpoints

**Key endpoints:**
```bash
# Public endpoints
GET  /api/albums                    # List all albums
GET  /api/albums/:album/photos      # Get photos in album
GET  /api/branding                  # Get branding config
GET  /api/external-links            # Get navigation links
GET  /api/sitemap.xml               # SEO sitemap
GET  /api/health                    # Health check

# Admin endpoints (require authentication)
POST /api/album-management/albums   # Create album
POST /api/album-management/:album/upload  # Upload photos
DELETE /api/album-management/albums/:album  # Delete album
PUT  /api/branding                  # Update branding
GET  /api/metrics                   # Get analytics

# Authentication
GET  /api/auth/google               # Initiate OAuth
GET  /api/auth/google/callback      # OAuth callback
POST /api/auth-extended/login       # Password login
POST /api/auth-extended/passkey/auth  # Passkey authentication
GET  /api/auth/status               # Get current user
POST /api/auth/logout               # Logout
```

See backend source code in `backend/src/routes/` for complete API implementation.

---

## Security

- ✅ CSRF protection on all mutations
- ✅ Rate limiting (configurable)
- ✅ Input validation and sanitization
- ✅ Path traversal protection
- ✅ Security headers (Helmet)
- ✅ HTTPS enforcement in production
- ✅ Multiple auth methods (OAuth, password, passkey)
- ✅ HTTP-only secure cookies
- ✅ Role-based access control (viewer, manager, admin)

**Best practices:**
- Never commit `config.json` to Git
- Use strong random secrets (32+ bytes)
- Keep dependencies updated
- Enable HTTPS in production
- Use Docker for isolated deployment

---

## Troubleshooting

**Images not showing:**
```bash
node scripts/optimize_all_images.js
chmod -R 755 data/optimized/
```

**CORS errors:**
- Update `allowedOrigins` in `config.json` and restart backend
- For Docker: Check `FRONTEND_DOMAIN` and `BACKEND_DOMAIN` environment variables

**Authentication issues:**
- Verify Google OAuth redirect URIs
- Check email is in `authorizedEmails`
- Ensure cookies are enabled
- For password auth: Check user exists and password is set

**Port conflicts:**
```bash
lsof -i :3001  # Check what's using port
kill -9 <PID>  # Kill the process
```

**Docker issues:**
- Check container logs: `docker-compose logs -f app`
- Verify data directory permissions: `chmod -R 755 ~/galleria-data`
- Check PM2 status: `docker exec galleria pm2 list`
- View backend logs: `docker exec galleria tail -f /data/logs/backend-out.log`

**Optimization failures:**
- Ensure `sharp` dependencies are installed (handled automatically in Docker)
- Check image file permissions
- Verify `DATA_DIR` environment variable is set correctly

---

## License

Creative Commons Attribution 4.0 International (CC BY 4.0)

You are free to share and adapt with attribution.

---

## Links

- **📦 Repository:** [github.com/theodoreroddy/photography-website](https://github.com/theodoreroddy/photography-website)
- **🐛 Issues:** [GitHub Issues](https://github.com/theodoreroddy/photography-website/issues)
- **📧 Contact:** [me@tedcharles.net](mailto:me@tedcharles.net)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Submit a pull request

---

**Built by [Ted Charles](https://tedcharles.net) with React, TypeScript, and Express**

**Happy photographing! 📸**
