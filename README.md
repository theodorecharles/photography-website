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
- 🔍 **SEO Optimized** - Dynamic sitemap, meta tags, structured data
- 🔒 **Security Hardened** - CSRF protection, rate limiting, input validation

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

3. **Add your photos**

```bash
mkdir -p photos/homepage photos/nature photos/portfolio
# Copy your photos into these folders
```

4. **Optimize images**

```bash
chmod +x optimize_images.sh
./optimize_images.sh
```

This creates three versions: thumbnail (400px), modal (1920px), download (4096px).

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
./restart.sh  # Pulls code, optimizes images, builds, restarts
```

**Set production mode:**
```bash
export NODE_ENV=production
```

Update `config.json` production section with your domain and HTTPS settings.

---

## Configuration

Main config file: `config/config.json`

```json
{
  "branding": {
    "siteName": "Your Name",
    "primaryColor": "#4ade80",
    "metaDescription": "Your photography portfolio"
  },
  "auth": {
    "google": {
      "clientId": "your-client-id.apps.googleusercontent.com",
      "clientSecret": "your-client-secret"
    },
    "sessionSecret": "generate-random-secret",
    "authorizedEmails": ["your-email@example.com"]
  },
  "analytics": {
    "openobserve": {
      "enabled": false,
      "endpoint": "https://log.yourdomain.com/api/",
      "organization": "your-organization-id",
      "stream": "website",
      "username": "your-username",
      "password": "your-password",
    }
  }
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
│   ├── openapi.yaml     # API specification
│   └── API.md           # API documentation
├── frontend/            # React app
│   ├── src/
│   │   ├── App.tsx
│   │   └── components/
│   └── dist/            # Production build
├── photos/              # Original photos (not in Git)
├── optimized/           # Generated images (not in Git)
├── config/
│   └── config.json      # Main configuration
├── optimize_images.sh   # Image optimization
├── restart.sh          # Deployment script
└── ecosystem.config.cjs # PM2 config
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
./optimize_images.sh
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

## API Documentation

Complete API reference: `backend/API.md`  
OpenAPI specification: `backend/openapi.yaml`

**Quick examples:**
```bash
# List albums
curl http://localhost:3001/api/albums

# Get photos in album
curl http://localhost:3001/api/albums/nature/photos

# Health check
curl http://localhost:3001/api/health
```

View interactive docs:
```bash
npx @redocly/cli preview-docs backend/openapi.yaml
```

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
./optimize_images.sh
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
- **📖 API Docs:** See `backend/API.md`
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
