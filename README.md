# Photography Website

A modern, secure, and fully-featured photography portfolio website built with React, TypeScript, Express, and Node.js. Features optimized image delivery, comprehensive admin panel, analytics tracking, and responsive design.

## Features

### Core Features
- 📸 **Album-based Photo Organization** - Organize photos in folders that automatically become albums
- 🚀 **Optimized Image Delivery** - Automatic image optimization with multiple sizes (thumbnail, modal, download)
- 📱 **Responsive Design** - Works beautifully on desktop, tablet, and mobile devices
- ⚡ **Fast Performance** - Lazy loading, caching, and optimized builds

### Admin Panel
- 🔐 **Google OAuth Authentication** - Secure admin login with authorized email whitelist
- 🎨 **Branding Management** - Customize site name, colors, meta tags, and avatar via UI
- 📝 **Album Management** - Create/delete albums directly from the admin panel
- 🖼️ **Photo Upload** - Upload and manage photos with automatic optimization
- 🔗 **Links Management** - Configure external navigation links via admin interface
- 📊 **Visual Admin Dashboard** - Intuitive interface for all site management

### Analytics & Tracking
- 📈 **OpenObserve Integration** - Track user interactions and page views
- 🔒 **HMAC-Signed Events** - Secure analytics with tamper-proof event signatures
- 📊 **Comprehensive Event Tracking** - Page views, photo interactions, admin actions
- 🎯 **Privacy-Focused** - Server-side analytics with no client-side tracking scripts

### Security
- 🔒 **Security Hardened** - Rate limiting, CORS protection, input validation, CSP headers
- 🛡️ **CSRF Protection** - Token-based CSRF protection on all mutating operations
- 🔐 **Path Traversal Protection** - Sanitized inputs on all file operations
- 🚨 **Host Validation** - Prevents open redirect attacks
- ✅ **HMAC Validation** - Analytics events verified with cryptographic signatures

### Developer Experience
- 📚 **Complete API Documentation** - OpenAPI 3.0 specification with Swagger support
- 🔄 **Automated Deployment** - PM2 ecosystem and restart scripts
- 🛠️ **Type Safety** - Full TypeScript implementation
- 📖 **Comprehensive Docs** - API guides, security policies, and examples

## Project Structure

```
photography-website/
├── backend/                 # Express API server
│   ├── src/
│   │   ├── server.ts       # Main server file
│   │   ├── security.ts     # Security middleware (CSRF, rate limiting)
│   │   └── routes/         # API route handlers
│   │       ├── albums.ts           # Public album/photo endpoints
│   │       ├── album-management.ts # Admin album operations
│   │       ├── auth.ts             # Google OAuth authentication
│   │       ├── branding.ts         # Branding configuration
│   │       ├── external-links.ts   # External links management
│   │       ├── analytics.ts        # Analytics event tracking
│   │       ├── health.ts           # Health check
│   │       ├── sitemap.ts          # Dynamic sitemap generation
│   │       └── year.ts             # Current year endpoint
│   ├── dist/               # Compiled JavaScript (generated)
│   ├── openapi.yaml        # OpenAPI 3.0 API specification
│   ├── API.md              # API documentation and guide
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── App.tsx         # Main React component
│   │   ├── components/     # React components
│   │   │   ├── AdminPortal.tsx  # Admin dashboard
│   │   │   ├── PhotoGrid.tsx    # Photo gallery
│   │   │   ├── Footer.tsx       # Site footer
│   │   │   └── SEO.tsx          # SEO meta tags
│   │   ├── utils/
│   │   │   └── analytics.ts     # Analytics tracking utilities
│   │   └── config.ts       # Frontend configuration
│   ├── public/             # Static assets
│   ├── dist/               # Production build (generated)
│   ├── server.js           # Production server
│   └── package.json
├── photos/                 # Your original photos
│   ├── album1/
│   ├── album2/
│   └── homepage/          # Photos for homepage
├── optimized/             # Optimized images (generated)
│   ├── thumbnail/
│   ├── modal/
│   └── download/
├── config/
│   ├── config.json        # Main configuration (all settings)
│   └── config.example.json # Configuration template
├── optimize_images.sh     # Image optimization script
├── restart.sh            # Deployment restart script
└── SECURITY.md           # Security policies and guidelines
```

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **ImageMagick** (for image optimization): `brew install imagemagick` (macOS) or `apt-get install imagemagick` (Linux)
- **Git** (for cloning)
- **Google OAuth Credentials** (for admin authentication - optional for public viewing)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/theodoreroddy/photography-website.git
   cd photography-website
   ```

2. **Install dependencies**

   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   cd ..
   ```

3. **Configure your settings**

   Edit `config/config.json` to customize your site. Key sections to update:

   ```json
   {
     "branding": {
       "siteName": "Your Name",
       "primaryColor": "#4ade80",
       "metaDescription": "Your photography portfolio"
     },
     "auth": {
       "google": {
         "clientId": "your-google-client-id",
         "clientSecret": "your-google-client-secret"
       },
       "sessionSecret": "generate-a-random-secret-key",
       "authorizedEmails": ["your-email@example.com"]
     },
     "analytics": {
       "openobserve": {
         "enabled": true,
         "endpoint": "your-openobserve-endpoint",
         "username": "your-username",
         "password": "your-password"
       },
       "hmacSecret": "generate-a-random-hmac-secret"
     }
   }
   ```

   **For local development**, the default settings work without authentication. For production with admin features, you'll need:
   - Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com)
   - OpenObserve account (optional, for analytics)

4. **Set up your photos**

   ```bash
   mkdir photos
   mkdir photos/homepage
   mkdir photos/nature
   mkdir photos/portfolio
   ```

   Copy your photos into these folders. Each folder becomes an album!

5. **Optimize your images**

   ```bash
   chmod +x optimize_images.sh
   ./optimize_images.sh
   ```

   This creates three optimized versions of each photo (thumbnail, modal, download).

6. **Start development servers**

   In separate terminal windows:

   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

7. **Open your browser**

   Visit http://localhost:5173

## Admin Panel

### Accessing the Admin Panel

1. Navigate to `/admin` on your site
2. Click "Sign in with Google"
3. Authenticate with an authorized email (configured in `config.json`)

### Admin Features

The admin panel provides a complete interface for managing your site:

#### **Albums Tab**
- Create new albums
- Delete albums (removes all photos)
- Upload photos (up to 20 files, 50MB each)
- Delete individual photos
- Real-time optimization status

#### **Links Tab**
- Add/edit/remove external navigation links
- Support for external URLs or relative paths
- Drag-and-drop ordering (via JSON editor)

#### **Branding Tab**
- Upload avatar/logo (automatically becomes favicon)
- Edit site name
- Configure SEO meta description and keywords
- Real-time preview of changes

All changes are saved to `config/config.json` and apply immediately.

## Analytics

### Event Tracking

The site automatically tracks:

**Public Events:**
- Page views
- Photo clicks and navigation
- Photo downloads
- Album navigation
- External link clicks

**Admin Events:**
- Login/logout
- Tab navigation
- Album create/delete
- Photo upload/delete
- Settings updates

### OpenObserve Integration

Analytics events are sent to OpenObserve with HMAC signatures for security:

1. Events generated in frontend (`utils/analytics.ts`)
2. Signed with HMAC-SHA256
3. Proxied through backend (`/api/analytics/track`)
4. Forwarded to OpenObserve with authentication

This keeps credentials secure and prevents event tampering.

### Configuration

```json
{
  "analytics": {
    "openobserve": {
      "enabled": true,
      "endpoint": "https://your-o2-instance.com/api/org/stream/_json",
      "username": "your-email@example.com",
      "password": "your-api-token"
    },
    "hmacSecret": "your-256-bit-hex-secret"
  }
}
```

Generate secrets:
```bash
# Session secret (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# HMAC secret (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API Documentation

### Complete API Reference

See `backend/API.md` for detailed documentation including:
- Authentication flows
- All endpoint specifications
- Request/response examples
- Security details
- Error codes

### OpenAPI Specification

View the interactive API documentation:

```bash
# Using Swagger UI
docker run -p 8080:8080 -e SWAGGER_JSON=/openapi.yaml \
  -v $(pwd)/backend:/app swaggerapi/swagger-ui

# Using Redoc
npx @redocly/cli preview-docs backend/openapi.yaml
```

Or paste `backend/openapi.yaml` into [Swagger Editor](https://editor.swagger.io/)

### Quick API Examples

```bash
# List albums
curl https://api.yourdomain.com/api/albums

# Get photos in album
curl https://api.yourdomain.com/api/albums/nature/photos

# Get branding config
curl https://api.yourdomain.com/api/branding

# Health check
curl https://api.yourdomain.com/api/health
```

## Photo Management

### Adding Photos via Admin Panel

1. Log in to `/admin`
2. Select or create an album
3. Click "Upload Photos"
4. Select up to 20 images (50MB each)
5. Photos are automatically optimized in the background

### Adding Photos via File System

1. Create a folder in `photos/` directory
2. Add photos (`.jpg`, `.jpeg`, `.png`, `.gif`)
3. Run `./optimize_images.sh`
4. Refresh website - album appears automatically

### Image Optimization

Three versions are generated:
- **Thumbnail** (400x400px, 60% quality) - Grid display
- **Modal** (1920px max, 60% quality) - Lightbox view
- **Download** (4096px max, 100% quality) - Full resolution

Configure in `optimize_images.sh`:
```bash
THUMBNAIL_QUALITY=60
MODAL_QUALITY=60
DOWNLOAD_QUALITY=100
```

## Configuration

### Main Configuration File

All settings in `config/config.json`:

```json
{
  "development": {
    "frontend": {
      "port": 3000,
      "apiUrl": "http://localhost:3001"
    },
    "backend": {
      "port": 3001,
      "photosDir": "photos",
      "allowedOrigins": ["http://localhost:5173"]
    },
    "security": {
      "allowedHosts": ["localhost:3000", "localhost:5173"],
      "rateLimitWindowMs": 1000,
      "rateLimitMaxRequests": 50
    }
  },
  "production": {
    "frontend": {
      "apiUrl": "https://api.yourdomain.com"
    },
    "backend": {
      "allowedOrigins": [
        "https://yourdomain.com",
        "https://www.yourdomain.com"
      ]
    },
    "security": {
      "allowedHosts": ["yourdomain.com", "www.yourdomain.com"],
      "redirectFrom": ["olddomain.com"],
      "redirectTo": "yourdomain.com"
    }
  },
  "branding": {
    "siteName": "Your Name",
    "avatarPath": "/photos/avatar.png",
    "primaryColor": "#4ade80",
    "secondaryColor": "#22c55e",
    "metaDescription": "Photography portfolio",
    "metaKeywords": "photography, portfolio"
  },
  "auth": {
    "google": {
      "clientId": "your-client-id",
      "clientSecret": "your-client-secret"
    },
    "sessionSecret": "your-session-secret",
    "authorizedEmails": ["admin@example.com"]
  },
  "analytics": {
    "openobserve": {
      "enabled": true,
      "endpoint": "https://...",
      "username": "...",
      "password": "..."
    },
    "hmacSecret": "your-hmac-secret"
  },
  "externalLinks": [
    {"title": "Youtube", "url": "https://youtube.com/@yourname"},
    {"title": "Github", "url": "https://github.com/yourusername"}
  ]
}
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://api.yourdomain.com/api/auth/google/callback`
6. Copy Client ID and Client Secret to `config.json`

## Production Deployment

### Build for Production

```bash
# Build both frontend and backend
cd backend && npm run build
cd ../frontend && npm run build
```

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start both services
pm2 start ecosystem.config.cjs

# Save configuration for auto-restart
pm2 save
pm2 startup

# Management commands
pm2 list          # View running services
pm2 logs          # View logs
pm2 restart all   # Restart all services
```

The `ecosystem.config.cjs` file automatically sets `NODE_ENV=production`.

### Using the Restart Script

```bash
chmod +x restart.sh
./restart.sh
```

This script:
1. Pulls latest changes from Git
2. Optimizes all images
3. Builds backend and frontend
4. Restarts services with PM2

### Environment Setup

```bash
export NODE_ENV=production
```

Edit `config/config.json` production section for your domain.

## Security Features

### Implemented Protections

- ✅ **Rate Limiting** - 50 requests/second per IP (configurable)
- ✅ **CORS Protection** - Whitelist-based origin validation  
- ✅ **CSRF Protection** - Token-based protection on all mutations
- ✅ **Input Validation** - Path traversal protection, sanitized inputs
- ✅ **Security Headers** - CSP, X-Frame-Options, HSTS, XSS protection
- ✅ **HTTPS Enforcement** - Automatic redirect in production
- ✅ **Host Validation** - Prevents open redirect attacks
- ✅ **Request Size Limits** - Prevents memory exhaustion
- ✅ **HMAC Signatures** - Cryptographically signed analytics events
- ✅ **OAuth Authentication** - Secure Google OAuth with email whitelist
- ✅ **Session Security** - HTTP-only, secure cookies with secrets

### Security Best Practices

- Keep `config.json` secrets private (not in Git)
- Use strong random secrets (32+ bytes)
- Restrict authorized emails to trusted users
- Enable HTTPS in production
- Keep dependencies updated
- Review `SECURITY.md` for detailed policies

## Development

### Project Stack

**Frontend:**
- React 19 + TypeScript
- React Router 7
- Vite (build tool)
- Custom CSS

**Backend:**
- Node.js 18+
- Express 5 + TypeScript
- Passport.js (OAuth)
- Multer (file uploads)
- csurf (CSRF protection)

**Image Processing:**
- ImageMagick (shell script)

### Available Scripts

**Backend:**
- `npm run dev` - Development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production build

**Frontend:**
- `npm run dev` - Vite dev server (port 5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm start` - Run production server

### Development Workflow

1. Make changes to source files
2. Hot reload automatically updates
3. Test changes locally
4. Commit to Git
5. Run `./restart.sh` on production server

### Adding New Features

**New API Endpoint:**
1. Create route file in `backend/src/routes/`
2. Add authentication middleware if needed
3. Register route in `backend/src/server.ts`
4. Update `backend/openapi.yaml`

**New Frontend Component:**
1. Create component in `frontend/src/components/`
2. Add route in `frontend/src/App.tsx` if needed
3. Import and use in parent components

**New Analytics Event:**
1. Add tracking function in `frontend/src/utils/analytics.ts`
2. Call function where event occurs
3. Document event type in `backend/openapi.yaml`

## Troubleshooting

### Images not showing
- Run `./optimize_images.sh`
- Check `optimized/` directory exists
- Verify backend is serving files correctly
- Check browser console for errors

### CORS errors
- Update `allowedOrigins` in `config.json`
- Restart backend server
- Clear browser cache

### Authentication not working
- Verify Google OAuth credentials
- Check authorized redirect URIs
- Confirm email is in `authorizedEmails` list
- Check browser cookies are enabled

### Analytics not tracking
- Verify `hmacSecret` is configured
- Check OpenObserve credentials
- View backend logs for errors
- Test with: `curl -X POST http://localhost:3001/api/analytics/track`

### Rate limiting (429 errors)
- Increase `rateLimitMaxRequests` in config
- Check if legitimate traffic or attack
- Review rate limit logs

### Build errors
- Delete `node_modules` and reinstall
- Ensure Node.js version is 18+
- Check TypeScript compiler errors
- Clear `dist/` directories

## License

Creative Commons Attribution 4.0 International (CC BY 4.0)

See the `/license` page on the website or `frontend/src/components/License.tsx` for details.

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Security

Found a security issue? Please review `SECURITY.md` and report responsibly to me@tedcharles.net

## Credits

Built with ❤️ by [Ted Charles](https://tedcharles.net)

Using React, TypeScript, Express, and modern web technologies.

---

## Quick Reference

### Essential Commands

```bash
# Development
cd backend && npm run dev              # Start backend
cd frontend && npm run dev             # Start frontend
./optimize_images.sh                   # Optimize images

# Production
./restart.sh                           # Deploy everything
pm2 list                               # Check services
pm2 logs                               # View logs
pm2 restart all                        # Restart services

# Photo Management
mkdir photos/new-album                 # Create album
cp *.jpg photos/new-album/             # Add photos
./optimize_images.sh                   # Optimize

# Admin
open http://localhost:5173/admin       # Local admin
open https://yourdomain.com/admin      # Production admin
```

### Important Files

| File | Purpose |
|------|---------|
| `config/config.json` | **Main configuration** - all settings |
| `backend/openapi.yaml` | Complete API specification |
| `backend/API.md` | API documentation guide |
| `SECURITY.md` | Security policies |
| `optimize_images.sh` | Image optimization script |
| `restart.sh` | Deployment automation |
| `ecosystem.config.cjs` | PM2 configuration |

### Ports

| Service | Development | Production |
|---------|-------------|------------|
| Frontend (Vite) | 5173 | - |
| Frontend (Prod) | - | 3000 |
| Backend | 3001 | 3001 |

### Directory Structure

| Directory | Purpose | Tracked in Git |
|-----------|---------|----------------|
| `photos/` | Original photos | ❌ No |
| `optimized/` | Generated images | ❌ No |
| `backend/dist/` | Compiled JS | ❌ No |
| `frontend/dist/` | Production build | ❌ No |
| `config/config.json` | Configuration | ⚠️ Exclude secrets |

---

## Links

- **Live Demo**: [tedcharles.net](https://tedcharles.net)
- **Repository**: [github.com/theodoreroddy/photography-website](https://github.com/theodoreroddy/photography-website)
- **Issues**: [Submit an issue](https://github.com/theodoreroddy/photography-website/issues)
- **API Docs**: See `backend/API.md` or `backend/openapi.yaml`

For questions or support, please open an issue on GitHub or email me@tedcharles.net
