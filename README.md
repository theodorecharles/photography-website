# Photography Website

A modern, secure photography portfolio website built with React 19, TypeScript, Express 5, and Node.js. Features optimized image delivery, admin panel, analytics tracking, and responsive design.

![Hero image showing the main photo gallery view](screenshots/Hero%20image%20showing%20the%20main%20photo%20gallery%20view.png)

**🌐 Live Demo:** [tedcharles.net](https://tedcharles.net)

---

## Features

- 📸 **Album-based Organization** - Folders automatically become albums
- 🚀 **Optimized Images** - Three sizes generated (thumbnail, modal, download)
- 📱 **Fully Responsive** - Beautiful on all devices
- 🔐 **Google OAuth Admin** - Secure admin panel with email whitelist
- 🎨 **Visual Branding Manager** - Customize colors, meta tags, and avatar via UI
- 📊 **Analytics Dashboard** - Built-in OpenObserve integration with recharts
- 🔗 **Links Manager** - Configure external navigation links
- 🖼️ **Photo Upload** - Upload up to 20 photos with automatic optimization
- 🤖 **AI Title Generation** - Optional OpenAI integration for photo descriptions
- 🔍 **SEO Optimized** - Dynamic sitemap, meta tags, structured data
- 🔒 **Security Hardened** - CSRF protection, rate limiting, input validation
- 📲 **Telegram Notifications** - Deployment status alerts via Telegram bot

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

- **Node.js** 18+
- **ImageMagick**: `brew install imagemagick` (macOS) or `sudo apt-get install imagemagick` (Linux)
- **Google OAuth credentials** (optional, for admin features)

### Installation

1. **Clone and install dependencies**

```bash
git clone https://github.com/theodoreroddy/photography-website.git
cd photography-website
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

2. **Configure your site**

```bash
cp config/config.example.json config/config.json
```

Edit `config/config.json` with your settings:
- Update `branding` section (site name, colors)
- Add Google OAuth credentials (see [Google OAuth Setup](#google-oauth-setup))
- Add your email to `authorizedEmails`
- Configure OpenObserve for analytics (optional)

**Generate secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Note:** See [Configuration](#configuration) for complete config structure with environment-specific settings.

3. **Add your photos**

```bash
mkdir -p photos/homepage photos/nature photos/portfolio
# Copy your photos into these folders
```

4. **Optimize images**

```bash
chmod +x optimize_all_images.sh
./optimize_all_images.sh
```

This creates three versions: thumbnail (512px), modal (2048px), download (4096px).

> **Note:** For single image optimization (used automatically during uploads), there's also `optimize_new_image.sh` that optimizes one image at a time.

5. **Start development**

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

6. **Open browser**: http://localhost:5173

---

## Admin Panel

Access at `/admin` → Sign in with Google → Manage everything:

- **Albums Tab** - Create/delete albums, upload photos
- **Links Tab** - Manage external navigation links
- **Branding Tab** - Customize colors, site name, avatar
- **Metrics Tab** - View analytics and charts

![Admin interface](screenshots/Admin%20interface%20showing%20album%20management.png)

---

## Production Deployment

### Build

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

### Using PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Automated Deployment

```bash
./restart.sh  # Full deployment automation
```

This script handles:
- Pull latest changes from Git (with fast-forward only)
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

Main config file: `config/config.json` (copy from `config/config.example.json`)

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
**Image Processing:** ImageMagick  
**Analytics:** OpenObserve

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
├── photos/              # Original photos (not in Git)
├── optimized/           # Generated images (not in Git)
├── config/
│   ├── config.json          # Main configuration
│   └── config.example.json  # Config template
├── build.js                # Unified build script
├── generate-ai-titles.js   # AI title generation
├── image-metadata.db       # SQLite database
├── optimize_all_images.sh  # Bulk image optimization
├── optimize_new_image.sh   # Single image optimization
├── restart.sh             # Automated deployment
├── ecosystem.config.cjs   # PM2 configuration
└── package.json           # Root dependencies
```

---

## Common Tasks

**Add photos via admin:**
1. Navigate to `/admin`
2. Select album → Upload Photos
3. Images auto-optimize in background

**Add photos via filesystem:**
```bash
mkdir photos/new-album
cp *.jpg photos/new-album/
./optimize_all_images.sh
```

**Generate AI titles (optional):**
```bash
# Add OpenAI API key to config.json first
node generate-ai-titles.js
```

**View logs:**
```bash
pm2 logs
```

**Restart services:**
```bash
pm2 restart all
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
POST /api/admin/albums              # Create album
POST /api/admin/upload              # Upload photos
DEL  /api/admin/albums/:album       # Delete album
PUT  /api/admin/branding            # Update branding
GET  /api/admin/metrics             # Get analytics

# Authentication
GET  /api/auth/google               # Initiate OAuth
GET  /api/auth/google/callback      # OAuth callback
GET  /api/auth/user                 # Get current user
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
- ✅ OAuth with email whitelist
- ✅ HTTP-only secure cookies

**Best practices:**
- Never commit `config.json` to Git
- Use strong random secrets (32+ bytes)
- Keep dependencies updated
- Enable HTTPS in production

---

## Troubleshooting

**Images not showing:**
```bash
./optimize_all_images.sh
chmod -R 755 optimized/
```

**CORS errors:**
Update `allowedOrigins` in `config.json` and restart backend.

**Authentication issues:**
- Verify Google OAuth redirect URIs
- Check email is in `authorizedEmails`
- Ensure cookies are enabled

**Port conflicts:**
```bash
lsof -i :3001  # Check what's using port
kill -9 <PID>  # Kill the process
```

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
