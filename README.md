# Photography Website

A modern, secure, and fully-featured photography portfolio website built with React 19, TypeScript, Express 5, and Node.js. Features optimized image delivery, comprehensive admin panel, analytics tracking, and responsive design.

![Hero image showing the main photo gallery view](screenshots/Hero%20image%20showing%20the%20main%20photo%20gallery%20view.png)

---

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Admin Panel](#admin-panel)
- [Analytics](#analytics)
- [API Documentation](#api-documentation)
- [Photo Management](#photo-management)
- [Configuration](#configuration)
- [Production Deployment](#production-deployment)
- [Security Features](#security-features)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

### 🎨 Core Features

- **📸 Album-based Photo Organization** - Organize photos in folders that automatically become albums
- **🚀 Optimized Image Delivery** - Automatic image optimization with three sizes (thumbnail, modal, download)
- **📱 Fully Responsive** - Beautiful design on desktop, tablet, and mobile devices
- **⚡ Lightning Fast** - Lazy loading, aggressive caching, and optimized builds
- **🔍 SEO Optimized** - Dynamic sitemap, meta tags, structured data, and robots.txt
- **🎯 Homepage Grid** - Randomized photo grid from all albums for homepage

### 🛠️ Admin Panel

- **🔐 Google OAuth Authentication** - Secure admin login with authorized email whitelist
- **🎨 Visual Branding Management** - Customize site name, colors, meta tags, and avatar via UI
- **📝 Album Management** - Create/delete albums directly from the admin dashboard
- **🖼️ Photo Upload & Management** - Upload up to 20 photos at once with automatic optimization
- **🔗 External Links Manager** - Configure navigation links (YouTube, Instagram, etc.) via admin interface
- **📊 Analytics Dashboard** - Built-in metrics dashboard with charts and insights
- **🎯 Intuitive Interface** - Clean, modern UI for all site management tasks

![Admin portal dashboard overview](screenshots/Admin%20portal%20dashboard%20overview.png)

### 📊 Analytics & Tracking

- **📈 OpenObserve Integration** - Track user interactions and page views with powerful open-source analytics
- **📊 Comprehensive Event Tracking** - Page views, photo interactions, downloads, admin actions
- **🎯 Privacy-Focused** - Server-side analytics with no client-side tracking scripts or cookies
- **📉 Visual Metrics** - Built-in dashboard with recharts for data visualization

### 🔒 Security

- **🛡️ Security Hardened** - Rate limiting, CORS protection, input validation, CSP headers
- **🔐 CSRF Protection** - Token-based CSRF protection on all state-changing operations
- **🚨 Path Traversal Protection** - Sanitized inputs on all file operations
- **✅ Host Validation** - Prevents open redirect attacks
- **🔒 HTTPS Enforcement** - Automatic redirect to HTTPS in production
- **👮 OAuth Security** - Email whitelist ensures only authorized users can access admin

### 👨‍💻 Developer Experience

- **📚 Complete API Documentation** - OpenAPI 3.0 specification with detailed examples
- **🔄 Automated Deployment** - PM2 ecosystem configuration and restart scripts
- **🛠️ Full Type Safety** - 100% TypeScript implementation across frontend and backend
- **📖 Comprehensive Docs** - API guides, security policies, and setup instructions
- **🔥 Hot Reload** - Fast development with Vite and nodemon

---

## Screenshots

### Public Gallery View
![Main gallery showing photo grid with responsive layout](screenshots/Main%20gallery%20showing%20photo%20grid%20with%20responsive%20layout.png)

### Photo Modal/Lightbox
![Full-screen photo modal with navigation arrows](screenshots/Full-screen%20photo%20modal%20with%20navigation%20arrows.png)

### Mobile Responsive View
![Mobile view showing responsive design on phone](screenshots/Mobile%20view%20showing%20responsive%20design%20on%20phone.png)

### Admin Portal - Albums Tab
![Admin interface showing album management](screenshots/Admin%20interface%20showing%20album%20management.png)

### Admin Portal - Branding Tab
![Branding customization interface with color pickers](screenshots/Branding%20customization%20interface%20with%20color%20pickers.png)

### Admin Portal - Links Tab
![External links management interface](screenshots/External%20links%20management%20interface.png)

### Admin Portal - Metrics Tab
![Analytics dashboard with charts and graphs](screenshots/Analytics%20dashboard%20with%20charts%20and%20graphs.png)

### Photo Upload Interface
![Photo upload interface with progress indicators](screenshots/Photo%20upload%20interface%20with%20progress%20indicators.png)

---

## Project Structure

```
photography-website/
├── backend/                    # Express API server
│   ├── src/
│   │   ├── server.ts          # Main server file with middleware setup
│   │   ├── config.ts          # Configuration loader
│   │   ├── security.ts        # Security middleware & validation
│   │   └── routes/            # API route handlers
│   │       ├── albums.ts              # Public album/photo endpoints
│   │       ├── album-management.ts    # Admin album operations (auth)
│   │       ├── auth.ts                # Google OAuth authentication
│   │       ├── branding.ts            # Branding configuration (auth)
│   │       ├── external-links.ts      # External links management (auth)
│   │       ├── external-pages.ts      # External page content
│   │       ├── analytics.ts           # Analytics event tracking
│   │       ├── metrics.ts             # Admin metrics dashboard (auth)
│   │       ├── health.ts              # Health check endpoint
│   │       ├── sitemap.ts             # Dynamic sitemap generation
│   │       └── year.ts                # Current year endpoint
│   ├── dist/                  # Compiled JavaScript (generated)
│   ├── openapi.yaml           # OpenAPI 3.0 API specification
│   ├── API.md                 # Human-readable API documentation
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── App.tsx           # Main React component with routing
│   │   ├── main.tsx          # React entry point
│   │   ├── config.ts         # Frontend configuration
│   │   ├── components/       # React components
│   │   │   ├── AdminPortal.tsx    # Complete admin dashboard
│   │   │   ├── PhotoGrid.tsx      # Photo gallery component
│   │   │   ├── Metrics.tsx        # Analytics charts (recharts)
│   │   │   ├── Footer.tsx         # Site footer with links
│   │   │   ├── SEO.tsx            # Dynamic SEO meta tags
│   │   │   ├── StructuredData.tsx # Schema.org structured data
│   │   │   ├── NotFound.tsx       # 404 page
│   │   │   ├── AuthError.tsx      # OAuth error page
│   │   │   ├── License.tsx        # CC BY 4.0 license page
│   │   │   └── ScrollToTop.tsx    # Route change scroll behavior
│   │   └── utils/
│   │       ├── analytics.ts       # Analytics tracking functions
│   │       └── fetchWrapper.ts    # Fetch utility with error handling
│   ├── public/               # Static assets
│   │   ├── favicon.ico
│   │   ├── favicon.png
│   │   ├── apple-touch-icon.png
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   ├── manifest.json
│   │   ├── robots.txt
│   │   └── primes/           # Easter egg: prime number calculator
│   ├── dist/                 # Production build (generated)
│   ├── server.js             # Production Express server
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts        # Vite build configuration
│   └── eslint.config.js
│
├── photos/                   # Your original photos (not in Git)
│   ├── homepage/            # Photos for homepage random grid
│   ├── nature/              # Example album
│   ├── people/              # Example album
│   └── [your-albums]/       # Each folder = one album
│
├── optimized/               # Auto-generated optimized images (not in Git)
│   ├── thumbnail/           # 400x400px - Grid display
│   ├── modal/               # 1920px max - Lightbox view
│   └── download/            # 4096px max - Full resolution download
│
├── config/
│   ├── config.json          # Main configuration (all settings)
│   └── config.example.json  # Configuration template
│
├── optimize_images.sh       # ImageMagick optimization script
├── restart.sh              # Production deployment script
├── build.js                # Build orchestration script
├── ecosystem.config.cjs    # PM2 process management config
├── package.json            # Root package.json
└── README.md              # This file
```

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **ImageMagick** (for image optimization):
  - macOS: `brew install imagemagick`
  - Ubuntu/Debian: `sudo apt-get install imagemagick`
  - Windows: Download from [imagemagick.org](https://imagemagick.org)
- **Git** (for cloning)
- **Google OAuth Credentials** (optional - only needed for admin features)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/theodoreroddy/photography-website.git
cd photography-website
```

2. **Install dependencies**

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

3. **Configure your settings**

Copy the example configuration and customize it:

```bash
cp config/config.example.json config/config.json
```

Edit `config/config.json` with your settings:

```json
{
  "branding": {
    "siteName": "Your Name",
    "primaryColor": "#4ade80",
    "secondaryColor": "#22c55e",
    "metaDescription": "Professional photography portfolio"
  },
  "auth": {
    "google": {
      "clientId": "your-google-client-id.apps.googleusercontent.com",
      "clientSecret": "your-google-client-secret"
    },
    "sessionSecret": "generate-a-random-secret-here",
    "authorizedEmails": ["your-email@example.com"]
  },
  "analytics": {
    "openobserve": {
      "enabled": true,
      "endpoint": "https://your-instance.openobserve.ai/api/org/stream/_json",
      "username": "your-email@example.com",
      "password": "your-api-token"
    },
  }
}
```

**For local development**, the default settings work without authentication. For production with admin features, you'll need:
- [Google OAuth credentials](#google-oauth-setup) from Google Cloud Console
- [OpenObserve account](https://openobserve.ai) (optional, for analytics)

**Generate secure secrets:**

```bash
# Session secret (64 hex chars = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

4. **Set up your photos**

Create album folders and add your photos:

```bash
mkdir -p photos/homepage photos/nature photos/portfolio
```

Copy your photos into these folders. Each folder becomes an album automatically!

**Supported formats:** `.jpg`, `.jpeg`, `.png`, `.gif`

5. **Optimize your images**

This creates three optimized versions of each photo:

```bash
chmod +x optimize_images.sh
./optimize_images.sh
```

**What this does:**
- **Thumbnail** (400x400px, 60% quality) - For grid display
- **Modal** (1920px max, 60% quality) - For lightbox view
- **Download** (4096px max, 100% quality) - Full resolution download

6. **Start development servers**

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

7. **Open your browser**

Visit **http://localhost:5173** to see your site!

## Admin Panel

### Accessing the Admin Panel

1. Navigate to `/admin` on your site (e.g., `http://localhost:5173/admin`)
2. Click **"Sign in with Google"**
3. Authenticate with an email listed in `config.json` → `auth.authorizedEmails`

![Google OAuth login screen](screenshots/Google%20OAuth%20login%20screen.png)

### Admin Features Overview

The admin panel provides a complete interface for managing your site with four main tabs:

#### 📁 Albums Tab

**Manage your photo albums:**
- ✅ View all albums with photo counts
- ✅ Create new albums (automatically creates folders)
- ✅ Delete albums (removes all photos)
- ✅ Upload photos (up to 20 files, 50MB each)
- ✅ Delete individual photos
- ✅ View optimization status (optimized/total)
- ✅ Real-time updates

**Workflow:**
1. Select an album from the dropdown or create a new one
2. Click "Upload Photos" and select images
3. Photos are automatically optimized in the background
4. Optimization happens via the `optimize_images.sh` script

![Albums tab with upload interface](screenshots/Admin%20interface%20showing%20album%20management.png)

#### 🔗 Links Tab

**Manage external navigation links:**
- ✅ Add links to YouTube, Instagram, GitHub, etc.
- ✅ Edit link titles and URLs
- ✅ Remove links
- ✅ Reorder links (via JSON editor)
- ✅ Immediate updates to footer and navigation

**JSON Format:**
```json
[
  {
    "title": "YouTube",
    "url": "https://youtube.com/@your-channel"
  },
  {
    "title": "Instagram",
    "url": "https://instagram.com/your-profile"
  }
]
```

![Links management interface](screenshots/External%20links%20management%20interface.png)

#### 🎨 Branding Tab

**Customize your site's appearance:**
- ✅ Upload avatar/logo (automatically becomes favicon)
- ✅ Edit site name (updates all pages)
- ✅ Choose primary and secondary colors
- ✅ Configure SEO meta description
- ✅ Set meta keywords for search engines
- ✅ Real-time preview (refresh to see changes)

**Color customization:**
- Primary color: Main accent color (buttons, links)
- Secondary color: Hover states and secondary elements

![Branding tab with color picker](screenshots/Branding%20customization%20interface%20with%20color%20pickers.png)

#### 📊 Metrics Tab

**View site analytics:**
- ✅ Visual charts with recharts library
- ✅ Page view trends over time
- ✅ Most popular albums
- ✅ Photo interaction statistics
- ✅ Admin activity tracking
- ✅ Filter by date range
- ✅ Export data (via OpenObserve dashboard)

**Tracked metrics:**
- Total page views
- Unique visitors
- Photo views and downloads
- Album popularity
- Admin actions (uploads, deletions, etc.)

![Metrics dashboard with charts](screenshots/Analytics%20dashboard%20with%20charts%20and%20graphs.png)

### Admin Technical Details

**Authentication Flow:**
1. User clicks "Sign in with Google"
2. Redirects to Google OAuth consent screen
3. Google redirects back with authorization code
4. Backend exchanges code for user profile
5. Backend validates email against `authorizedEmails` list
6. Session cookie created with `connect.sid`
7. User redirected to admin portal

**Session Security:**
- HTTP-only cookies (not accessible to JavaScript)
- Secure flag in production (HTTPS only)
- SameSite='lax' (CSRF protection)
- 24-hour session expiration

**CSRF Protection:**
- All POST/PUT/DELETE requests require CSRF token
- Token generated on session creation
- Validated by backend before processing requests

---

## Analytics

### Event Tracking Overview

The site automatically tracks user interactions without client-side cookies or tracking scripts, making it privacy-friendly and GDPR-compliant.

### Public Events Tracked

**Navigation:**
- `pageview` - Page loads (album pages, homepage, etc.)
- `album_navigation` - Album link clicks
- `external_link_click` - Footer/nav link clicks

**Photo Interactions:**
- `photo_click` - Photo opened in modal/lightbox
- `photo_navigation` - Next/previous photo in modal
- `photo_download` - Download button clicked
- `modal_close` - Modal closed (ESC key or X button)

**Errors:**
- `error` - JavaScript errors or failed requests

### Admin Events Tracked

**Authentication:**
- `admin_auth` - Login/logout events

**Navigation:**
- `admin_tab_change` - Tab switches in admin portal

**Content Management:**
- `admin_album_management` - Album created/deleted
- `admin_photo_management` - Photos uploaded/deleted
- `admin_external_links_update` - Links modified
- `admin_branding_update` - Branding settings changed
- `admin_avatar_upload` - Avatar/logo uploaded

### OpenObserve Integration

**Architecture:**

1. **Frontend** (`utils/analytics.ts`) generates events
2. **Backend proxy** (`/api/analytics/track`) forwards events
3. **OpenObserve** receives authenticated events

**Benefits:**
- 🔒 Credentials never exposed to client
- 🎯 Server-side tracking (no ad-blockers)
- 📊 Powerful dashboards and querying
- 🔐 Secure authentication via backend proxy

**Configuration:**

```json
{
  "analytics": {
    "openobserve": {
      "enabled": true,
      "endpoint": "https://api.openobserve.ai/api/default/default/_json",
      "username": "your-email@example.com",
      "password": "your-api-token-here"
    },
  }
}
```

**Get OpenObserve:**
- Sign up at [openobserve.ai](https://openobserve.ai)
- Or self-host: [GitHub](https://github.com/openobserve/openobserve)

![OpenObserve dashboard showing tracked events](screenshots/OpenObserve%20dashboard%20showing%20tracked%20events.png)

---

## API Documentation

### Complete API Reference

See **`backend/API.md`** for detailed documentation including:
- Authentication flows and session management
- All endpoint specifications with examples
- Request/response schemas
- Security details (CSRF, rate limiting)
- Error codes and handling

### OpenAPI Specification

Interactive API documentation using **OpenAPI 3.0**:

**Online Viewers:**
- [Swagger Editor](https://editor.swagger.io/) - Paste contents of `backend/openapi.yaml`
- [Redoc](https://redocly.github.io/redoc/) - Beautiful API docs

**Local Tools:**
```bash
# Using Swagger UI (Docker)
docker run -p 8080:8080 \
  -e SWAGGER_JSON=/openapi.yaml \
  -v $(pwd)/backend:/app \
  swaggerapi/swagger-ui

# Using Redoc (npx)
npx @redocly/cli preview-docs backend/openapi.yaml
```

### Quick API Examples

**Public Endpoints:**
```bash
# List all albums
curl https://api.yourdomain.com/api/albums

# Get photos in an album
curl https://api.yourdomain.com/api/albums/nature/photos

# Get all photos (randomized - for homepage)
curl https://api.yourdomain.com/api/random-photos

# Get branding configuration
curl https://api.yourdomain.com/api/branding

# Get external links
curl https://api.yourdomain.com/api/external-links

# Get sitemap
curl https://api.yourdomain.com/api/sitemap

# Health check
curl https://api.yourdomain.com/api/health
```

**Authenticated Endpoints:**
```bash
# Check auth status (with cookies)
curl -b cookies.txt https://api.yourdomain.com/api/auth/status

# Create album (requires auth + CSRF token)
curl -X POST \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"vacation-2024"}' \
  https://api.yourdomain.com/api/albums

# Upload photos (requires auth + CSRF token)
curl -X POST \
  -b cookies.txt \
  -F "photos=@photo1.jpg" \
  -F "photos=@photo2.jpg" \
  https://api.yourdomain.com/api/albums/vacation-2024/upload
```

### Response Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 302  | Redirect (OAuth flow) |
| 400  | Bad request (validation error) |
| 401  | Not authenticated |
| 403  | Forbidden (invalid CSRF) |
| 404  | Resource not found |
| 429  | Rate limit exceeded |
| 500  | Server error |

---

## Photo Management

### Adding Photos via Admin Panel

**Easiest method - web interface:**

1. Log in to `/admin`
2. Navigate to the **Albums** tab
3. Select an album or create a new one
4. Click **"Upload Photos"**
5. Select up to 20 images (max 50MB each)
6. Photos automatically uploaded and queued for optimization

**Upload limits:**
- **Format:** `.jpg`, `.jpeg`, `.png`, `.gif`
- **Max files:** 20 per upload
- **Max size:** 50MB per file
- **Concurrent uploads:** Handled automatically

### Adding Photos via File System

**For bulk uploads or local development:**

1. **Create album folder:**
```bash
mkdir photos/my-new-album
```

2. **Copy photos:**
```bash
cp ~/Pictures/vacation/*.jpg photos/my-new-album/
```

3. **Optimize images:**
```bash
./optimize_images.sh
```

4. **View on site:**
   - Refresh your website
   - Album appears automatically in navigation
   - Photos display in grid

### Image Optimization Details

The `optimize_images.sh` script uses **ImageMagick** to generate three versions:

| Version | Size | Quality | Purpose |
|---------|------|---------|---------|
| **Thumbnail** | 400x400px | 60% | Grid display (fast loading) |
| **Modal** | 1920px max | 60% | Lightbox view (good quality) |
| **Download** | 4096px max | 100% | Full resolution (preserve details) |

**Optimization Script Configuration:**

Edit `optimize_images.sh` to customize:

```bash
# Quality settings (0-100)
THUMBNAIL_QUALITY=60
MODAL_QUALITY=60
DOWNLOAD_QUALITY=100

# Size settings
THUMBNAIL_SIZE="400x400"
MODAL_SIZE="1920x1920"
DOWNLOAD_SIZE="4096x4096"
```

**Script features:**
- ✅ Maintains aspect ratios (no cropping)
- ✅ Preserves EXIF data in downloads
- ✅ Strips EXIF from thumbnails/modals (privacy)
- ✅ Handles spaces and special characters in filenames
- ✅ Skips already-optimized images
- ✅ Shows progress for each file

**Manual optimization:**
```bash
# Optimize all photos
./optimize_images.sh

# Optimize specific album
./optimize_images.sh photos/nature

# Force re-optimization
rm -rf optimized/thumbnail/nature
rm -rf optimized/modal/nature
rm -rf optimized/download/nature
./optimize_images.sh photos/nature
```

### Album Organization Best Practices

**Naming conventions:**
- Use lowercase with hyphens: `summer-vacation-2024`
- Avoid spaces and special characters
- Keep names descriptive and concise

**Special albums:**
- **`homepage`** - Photos appear in random grid on main page
- Other albums appear in navigation alphabetically

**Photo filenames:**
- Use descriptive names: `sunset-beach.jpg` not `IMG_1234.jpg`
- Avoid special characters
- Spaces are okay but hyphens/underscores preferred

---

## Configuration

### Main Configuration File

All settings are in **`config/config.json`**:

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
      "optimizedDir": "optimized",
      "allowedOrigins": [
        "http://localhost:5173",
        "http://localhost:3000"
      ]
    },
    "security": {
      "allowedHosts": [
        "localhost:3000",
        "localhost:5173",
        "localhost:3001"
      ],
      "rateLimitWindowMs": 1000,
      "rateLimitMaxRequests": 50
    }
  },
  "production": {
    "frontend": {
      "port": 3000,
      "apiUrl": "https://api.yourdomain.com"
    },
    "backend": {
      "port": 3001,
      "photosDir": "photos",
      "optimizedDir": "optimized",
      "allowedOrigins": [
        "https://yourdomain.com",
        "https://www.yourdomain.com"
      ]
    },
    "security": {
      "allowedHosts": [
        "yourdomain.com",
        "www.yourdomain.com",
        "api.yourdomain.com"
      ],
      "redirectFrom": ["olddomain.com"],
      "redirectTo": "yourdomain.com",
      "rateLimitWindowMs": 60000,
      "rateLimitMaxRequests": 100
    }
  },
  "branding": {
    "siteName": "Your Name Photography",
    "avatarPath": "/optimized/download/derpatar.png",
    "primaryColor": "#4ade80",
    "secondaryColor": "#22c55e",
    "metaDescription": "Professional photography portfolio showcasing nature, portraits, and landscape photography",
    "metaKeywords": "photography, portfolio, nature photography, professional photographer",
    "faviconPath": "/optimized/thumbnail/derpatar.png"
  },
  "auth": {
    "google": {
      "clientId": "your-client-id.apps.googleusercontent.com",
      "clientSecret": "your-client-secret"
    },
    "sessionSecret": "your-64-char-hex-session-secret",
    "authorizedEmails": [
      "admin@example.com",
      "photographer@example.com"
    ]
  },
  "analytics": {
    "openobserve": {
      "enabled": true,
      "endpoint": "https://api.openobserve.ai/api/default/default/_json",
      "username": "your-email@example.com",
      "password": "your-openobserve-api-token"
    },
  },
  "externalLinks": [
    {
      "title": "YouTube",
      "url": "https://youtube.com/@your-channel"
    },
    {
      "title": "Instagram",
      "url": "https://instagram.com/your-profile"
    },
    {
      "title": "GitHub",
      "url": "https://github.com/your-username"
    }
  ]
}
```

### Google OAuth Setup

1. **Go to [Google Cloud Console](https://console.cloud.google.com)**

2. **Create or select a project**

3. **Enable Google+ API** (or Google Identity services)

4. **Create OAuth 2.0 Credentials:**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Choose **Web application**
   - Add authorized redirect URIs:
     - Development: `http://localhost:3001/api/auth/google/callback`
     - Production: `https://api.yourdomain.com/api/auth/google/callback`
   - Add authorized JavaScript origins:
     - Development: `http://localhost:5173`
     - Production: `https://yourdomain.com`

5. **Copy credentials to `config.json`:**
   - Client ID → `auth.google.clientId`
   - Client Secret → `auth.google.clientSecret`

6. **Add authorized emails:**
   - List emails in `auth.authorizedEmails`
   - Only these emails can access admin panel

### Configuration Sections Explained

**`development` / `production`:**
- Environment-specific settings
- Selected based on `NODE_ENV` variable
- Development has looser security for easier testing

**`branding`:**
- Visual appearance and SEO settings
- Can be edited via admin panel
- Changes apply immediately without restart

**`auth`:**
- Google OAuth credentials
- Session secret for cookie signing
- Email whitelist for admin access

**`analytics`:**
- OpenObserve endpoint and credentials
- Can be disabled by setting `enabled: false`

**`externalLinks`:**
- Footer navigation links
- Can be edited via admin panel
- Support internal or external URLs

**`security`:**
- Rate limiting configuration
- CORS allowed origins
- Host validation and redirects

---

## Production Deployment

### Build for Production

```bash
# Build backend
cd backend
npm run build
cd ..

# Build frontend
cd frontend
npm run build
cd ..
```

This creates:
- `backend/dist/` - Compiled TypeScript → JavaScript
- `frontend/dist/` - Optimized production bundle

### Using PM2 (Recommended)

**PM2** is a production process manager for Node.js with built-in load balancing and automatic restarts.

**Install PM2:**
```bash
npm install -g pm2
```

**Start services:**
```bash
# Start both frontend and backend
pm2 start ecosystem.config.cjs

# Save configuration for auto-restart on reboot
pm2 save
pm2 startup
```

**Management commands:**
```bash
pm2 list              # View running services
pm2 logs              # View logs (all services)
pm2 logs backend      # View backend logs only
pm2 logs frontend     # View frontend logs only
pm2 restart all       # Restart all services
pm2 restart backend   # Restart backend only
pm2 stop all          # Stop all services
pm2 delete all        # Remove all services
pm2 monit             # Real-time monitoring
```

**Ecosystem configuration** (`ecosystem.config.cjs`):
```javascript
module.exports = {
  apps: [
    {
      name: 'photography-backend',
      script: './src/server.ts',
      cwd: './backend',
      interpreter: 'node',
      interpreterArgs: '--loader ts-node/esm',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      max_memory_restart: '500M'
    },
    {
      name: 'photography-frontend',
      script: './server.js',
      cwd: './frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      max_memory_restart: '300M'
    }
  ]
};
```

### Using the Automated Restart Script

The **`restart.sh`** script handles the complete deployment workflow:

```bash
chmod +x restart.sh
./restart.sh
```

**What it does:**
1. ✅ Pulls latest changes from Git
2. ✅ Runs image optimization script
3. ✅ Builds backend TypeScript
4. ✅ Builds frontend React app
5. ✅ Restarts services with PM2

**Script contents:**
```bash
#!/bin/bash
echo "🔄 Pulling latest changes..."
git pull

echo "🖼️  Optimizing images..."
./optimize_images.sh

echo "🏗️  Building backend..."
cd backend
npm run build

echo "🏗️  Building frontend..."
cd ../frontend
npm run build
cd ..

echo "♻️  Restarting services..."
pm2 restart ecosystem.config.cjs

echo "✅ Deployment complete!"
pm2 list
```

### Environment Setup

**Set production mode:**
```bash
export NODE_ENV=production
```

**Or add to `.bashrc` / `.zshrc`:**
```bash
echo 'export NODE_ENV=production' >> ~/.bashrc
source ~/.bashrc
```

**Update `config.json` production settings:**
- Frontend `apiUrl`: Your API domain
- Backend `allowedOrigins`: Your frontend domain(s)
- Security `allowedHosts`: Your domain(s)

### Nginx Configuration (Optional)

If using Nginx as reverse proxy:

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL/HTTPS with Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal (already set up by certbot)
sudo certbot renew --dry-run
```

---

## Security Features

### Implemented Protections

- ✅ **Rate Limiting** - Configurable requests per window (default: 100/minute)
- ✅ **CORS Protection** - Whitelist-based origin validation
- ✅ **CSRF Protection** - Token-based protection on all state-changing operations
- ✅ **Input Validation** - Path traversal protection, sanitized inputs
- ✅ **Security Headers** - CSP, X-Frame-Options, HSTS, X-Content-Type-Options, XSS Protection
- ✅ **HTTPS Enforcement** - Automatic redirect in production
- ✅ **Host Validation** - Prevents open redirect attacks
- ✅ **Request Size Limits** - Prevents memory exhaustion (50MB max per file)
- ✅ **OAuth Authentication** - Secure Google OAuth 2.0 with email whitelist
- ✅ **Session Security** - HTTP-only, secure cookies with strong secrets
- ✅ **File Upload Validation** - Type checking and size limits
- ✅ **Path Sanitization** - Prevents directory traversal in all file operations

### Security Headers

Implemented via Helmet middleware:

```javascript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", config.frontend.apiUrl],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
})
```

### Security Best Practices

**Secrets Management:**
- ❌ Never commit `config.json` to Git
- ✅ Use strong random secrets (32+ bytes)
- ✅ Rotate secrets periodically
- ✅ Use environment variables for production secrets

**Access Control:**
- ✅ Restrict authorized emails to trusted users only
- ✅ Review admin access logs regularly
- ✅ Use strong Google account passwords + 2FA

**Production Deployment:**
- ✅ Always use HTTPS in production
- ✅ Keep Node.js and dependencies updated
- ✅ Set strict CORS origins
- ✅ Enable rate limiting
- ✅ Monitor security logs

**File Operations:**
- ✅ All file paths are validated and sanitized
- ✅ No user input directly used in file paths
- ✅ Album/photo names restricted to alphanumeric + hyphens/underscores

### Rate Limiting Configuration

Adjust in `config.json`:

```json
{
  "security": {
    "rateLimitWindowMs": 60000,        // 1 minute
    "rateLimitMaxRequests": 100        // 100 requests per minute
  }
}
```

**Recommendations:**
- **Development:** 50 requests/second (loose for testing)
- **Production:** 100 requests/minute (prevents abuse)
- **Public endpoints:** More generous
- **Admin endpoints:** Stricter limits

---

## Development

### Tech Stack

**Frontend:**
- ⚛️ **React 19** - Modern UI library with latest features
- 📘 **TypeScript 5.7** - Type-safe development
- 🚦 **React Router 7** - Client-side routing
- ⚡ **Vite 6** - Lightning-fast build tool
- 📊 **Recharts 3** - Beautiful, responsive charts
- 🎨 **Custom CSS** - No framework overhead

**Backend:**
- 🟢 **Node.js 18+** - JavaScript runtime
- 🚂 **Express 5** - Web framework
- 📘 **TypeScript 5.8** - Type-safe backend
- 🔐 **Passport.js** - OAuth authentication
- 📁 **Multer 2** - File upload handling
- 🛡️ **Helmet** - Security headers
- 🚦 **express-rate-limit** - Rate limiting

**Image Processing:**
- 🎨 **ImageMagick** - Powerful CLI image manipulation

**Development Tools:**
- 🔥 **Vite Dev Server** - Hot module replacement
- 🔄 **Nodemon** - Auto-restart on changes
- 🧪 **ts-node** - TypeScript execution
- 📋 **ESLint** - Code linting
- 🎯 **TypeScript ESLint** - TS-specific linting

### Available Scripts

**Root:**
```bash
npm run build          # Build both frontend and backend
```

**Backend:**
```bash
npm run dev            # Development server with hot reload (nodemon + ts-node)
npm run build          # Build TypeScript to JavaScript
npm start              # Run production build
```

**Frontend:**
```bash
npm run dev            # Vite dev server on port 5173
npm run build          # Build optimized production bundle
npm run preview        # Preview production build locally
npm start              # Run production Express server on port 3000
npm run lint           # Run ESLint
```

### Development Workflow

**Daily development:**

1. **Start backend** (Terminal 1):
```bash
cd backend
npm run dev
```

2. **Start frontend** (Terminal 2):
```bash
cd frontend
npm run dev
```

3. **Make changes:**
   - Edit source files
   - Changes auto-reload (hot module replacement)
   - View changes at `http://localhost:5173`

4. **Test features:**
   - Test public pages without auth
   - Test admin features with Google OAuth
   - Check browser console for errors

5. **Commit changes:**
```bash
git add .
git commit -m "Add feature: description"
git push
```

6. **Deploy to production:**
```bash
ssh your-server
cd /path/to/photography-website
./restart.sh
```

### Adding New Features

#### New API Endpoint

1. **Create route file:**
```bash
touch backend/src/routes/my-feature.ts
```

2. **Implement endpoint:**
```typescript
import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

router.get('/my-feature', (req, res) => {
  res.json({ message: 'Hello from my feature!' });
});

router.post('/my-feature', isAuthenticated, (req, res) => {
  // Auth required for POST
  res.json({ success: true });
});

export default router;
```

3. **Register in `server.ts`:**
```typescript
import myFeatureRouter from './routes/my-feature.ts';

app.use('/api/my-feature', myFeatureRouter);
```

4. **Update `openapi.yaml`** with new endpoint documentation

#### New Frontend Component

1. **Create component:**
```bash
touch frontend/src/components/MyComponent.tsx
touch frontend/src/components/MyComponent.css
```

2. **Implement component:**
```typescript
import './MyComponent.css';

interface MyComponentProps {
  title: string;
}

const MyComponent = ({ title }: MyComponentProps) => {
  return (
    <div className="my-component">
      <h1>{title}</h1>
    </div>
  );
};

export default MyComponent;
```

3. **Add route (if needed) in `App.tsx`:**
```typescript
import MyComponent from './components/MyComponent';

<Route path="/my-page" element={<MyComponent title="Hello" />} />
```

#### New Analytics Event

1. **Add tracking function in `utils/analytics.ts`:**
```typescript
export const trackMyEvent = (details: string) => {
  trackEvent('my_custom_event', {
    event_type: 'my_custom_event',
    details,
    timestamp: new Date().toISOString(),
  });
};
```

2. **Call function where event occurs:**
```typescript
import { trackMyEvent } from '../utils/analytics';

const handleClick = () => {
  trackMyEvent('User clicked the button');
};
```

3. **Document in `openapi.yaml`** under analytics events

### Project Architecture

**Frontend Architecture:**
```
App.tsx (Router)
  ├── Home (PhotoGrid with random photos)
  ├── Album/:name (PhotoGrid with album photos)
  ├── Admin (AdminPortal)
  │   ├── Albums Tab
  │   ├── Links Tab
  │   ├── Branding Tab
  │   └── Metrics Tab
  ├── License
  ├── NotFound (404)
  └── AuthError (OAuth errors)

Shared Components:
  ├── SEO (dynamic meta tags)
  ├── StructuredData (schema.org)
  ├── Footer (links + copyright)
  └── ScrollToTop (route change behavior)

Utils:
  ├── analytics.ts (event tracking)
  └── fetchWrapper.ts (API calls)
```

**Backend Architecture:**
```
server.ts (Express app)
  ├── Middleware:
  │   ├── helmet (security headers)
  │   ├── cors (origin validation)
  │   ├── rateLimit (rate limiting)
  │   ├── session (cookie sessions)
  │   ├── passport (OAuth)
  │   └── csurf (CSRF protection)
  │
  └── Routes:
      ├── /api/albums (public)
      ├── /api/albums (admin - requires auth)
      ├── /api/auth (OAuth flow)
      ├── /api/branding (public + admin)
      ├── /api/external-links (public + admin)
      ├── /api/analytics
      ├── /api/metrics (admin)
      ├── /api/sitemap (public)
      └── /api/health (public)

Security:
  ├── security.ts (validation functions)
  └── CSRF tokens (auto-injected)
```

### Debugging Tips

**Backend debugging:**
```bash
# Add debug logs
console.log('Debug:', variable);

# View all logs
pm2 logs backend --lines 100

# Check for errors
pm2 logs backend --err

# Restart to apply changes
pm2 restart backend
```

**Frontend debugging:**
```javascript
// Browser console
console.log('Debug:', variable);

// React DevTools (Chrome extension)
// Inspect component state and props

// Network tab
// View API requests and responses
```

**Common debugging scenarios:**

**Images not loading:**
```bash
# Check optimized directory exists
ls -la optimized/thumbnail/
ls -la optimized/modal/
ls -la optimized/download/

# Re-run optimization
./optimize_images.sh

# Check backend is serving images
curl http://localhost:3001/optimized/thumbnail/nature/photo.jpg
```

**Auth not working:**
```bash
# Check Google OAuth config
cat config/config.json | grep -A 5 '"auth"'

# Check authorized emails
cat config/config.json | grep -A 3 'authorizedEmails'

# View auth logs
pm2 logs backend | grep -i 'auth'
```

---

## Troubleshooting

### Images not showing

**Symptoms:** Broken image icons, 404 errors in console

**Solutions:**
```bash
# 1. Run image optimization
./optimize_images.sh

# 2. Check directories exist
ls optimized/thumbnail/
ls optimized/modal/
ls optimized/download/

# 3. Check permissions
chmod -R 755 optimized/

# 4. Verify backend is serving files
curl http://localhost:3001/optimized/thumbnail/homepage/some-photo.jpg

# 5. Check browser console for errors
# Open DevTools → Console tab
```

### CORS errors

**Symptoms:** "CORS policy" errors in browser console

**Solutions:**

1. **Update `config.json` allowed origins:**
```json
{
  "development": {
    "backend": {
      "allowedOrigins": [
        "http://localhost:5173",
        "http://localhost:3000"
      ]
    }
  }
}
```

2. **Restart backend:**
```bash
pm2 restart backend
```

3. **Clear browser cache:**
   - Chrome: Ctrl+Shift+Delete → Clear cache
   - Hard reload: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Authentication not working

**Symptoms:** Can't log in, "Unauthorized" errors, redirect loops

**Solutions:**

1. **Verify Google OAuth credentials:**
```bash
cat config/config.json | grep -A 5 '"google"'
```

2. **Check authorized redirect URIs in Google Cloud Console:**
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://api.yourdomain.com/api/auth/google/callback`

3. **Confirm email is in authorized list:**
```json
{
  "auth": {
    "authorizedEmails": ["your-email@gmail.com"]
  }
}
```

4. **Check cookies are enabled:**
   - Browser settings → Privacy → Cookies: Allowed
   - Incognito/private mode might block cookies

5. **Regenerate session secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
   - Update `auth.sessionSecret` in config
   - Restart backend

6. **View auth errors:**
```bash
pm2 logs backend | grep -i 'auth\|oauth\|passport'
```

### Analytics not tracking

**Symptoms:** Events not appearing in OpenObserve

**Solutions:**

1. **Check OpenObserve credentials:**
```json
{
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

2. **Test OpenObserve connection:**
```bash
curl -X POST "https://your-instance.openobserve.ai/api/default/default/_json" \
  -u "your-email:your-token" \
  -H "Content-Type: application/json" \
  -d '[{"event_type":"test"}]'
```

3. **View analytics logs:**
```bash
pm2 logs backend | grep -i 'analytics'
```

4. **Check frontend analytics:**
   - Open browser DevTools → Console
   - Look for analytics errors
   - Check Network tab for `/api/analytics/track` requests

### Rate limiting (429 errors)

**Symptoms:** "Too Many Requests" errors, legitimate traffic blocked

**Solutions:**

1. **Increase rate limits in `config.json`:**
```json
{
  "security": {
    "rateLimitWindowMs": 60000,
    "rateLimitMaxRequests": 200
  }
}
```

2. **Restart backend:**
```bash
pm2 restart backend
```

3. **Check if legitimate traffic or attack:**
```bash
pm2 logs backend | grep '429'
```

4. **Whitelist specific IPs (advanced):**
   - Edit `backend/src/server.ts`
   - Add IP whitelist to rate limiter config

### Build errors

**Symptoms:** TypeScript errors, missing dependencies, build failures

**Solutions:**

1. **Clean install:**
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

2. **Check Node.js version:**
```bash
node --version  # Should be 18.x or higher
```

3. **Update Node.js if needed:**
```bash
# Using nvm
nvm install 18
nvm use 18

# Or download from nodejs.org
```

4. **Clear build directories:**
```bash
rm -rf backend/dist
rm -rf frontend/dist
```

5. **Rebuild:**
```bash
cd backend && npm run build
cd ../frontend && npm run build
```

6. **Check TypeScript errors:**
```bash
# Backend
cd backend
npx tsc --noEmit

# Frontend
cd frontend
npx tsc -b --noEmit
```

### PM2 issues

**Symptoms:** Services not starting, not auto-restarting, memory issues

**Solutions:**

1. **View detailed status:**
```bash
pm2 describe photography-backend
pm2 describe photography-frontend
```

2. **Check logs:**
```bash
pm2 logs --lines 100
```

3. **Delete and restart:**
```bash
pm2 delete all
pm2 start ecosystem.config.cjs
pm2 save
```

4. **Check memory usage:**
```bash
pm2 monit
```

5. **Increase memory limit in `ecosystem.config.cjs`:**
```javascript
max_memory_restart: '1G'  // Increase from 500M
```

6. **Reset PM2:**
```bash
pm2 kill
pm2 resurrect
```

### Port already in use

**Symptoms:** "EADDRINUSE" errors, can't start server

**Solutions:**

1. **Check what's using the port:**
```bash
# Linux/Mac
lsof -i :3001
lsof -i :3000

# Windows
netstat -ano | findstr :3001
```

2. **Kill the process:**
```bash
# Linux/Mac
kill -9 <PID>

# Windows
taskkill /PID <PID> /F
```

3. **Or use different ports in `config.json`:**
```json
{
  "backend": {
    "port": 3002
  },
  "frontend": {
    "port": 3100
  }
}
```

---

## License

**Creative Commons Attribution 4.0 International (CC BY 4.0)**

You are free to:
- ✅ **Share** - Copy and redistribute the material
- ✅ **Adapt** - Remix, transform, and build upon the material for any purpose

Under the following terms:
- 📝 **Attribution** - You must give appropriate credit

See the `/license` page on the website or `frontend/src/components/License.tsx` for full details.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
```bash
git fork https://github.com/theodoreroddy/photography-website
```

2. **Create a feature branch**
```bash
git checkout -b feature/my-new-feature
```

3. **Make your changes**
   - Write clean, documented code
   - Follow existing code style
   - Test thoroughly

4. **Commit your changes**
```bash
git add .
git commit -m "Add feature: description of feature"
```

5. **Push to your fork**
```bash
git push origin feature/my-new-feature
```

6. **Submit a pull request**
   - Describe your changes
   - Reference any related issues
   - Include screenshots if UI changes

### Contribution Guidelines

- ✅ Write TypeScript (not plain JavaScript)
- ✅ Follow existing code style
- ✅ Add comments for complex logic
- ✅ Update documentation if needed
- ✅ Test your changes thoroughly
- ❌ Don't commit `config.json` or secrets
- ❌ Don't commit `node_modules` or build artifacts

---

## Security

Found a security issue? Please report it responsibly.

**Contact:**
- 📧 Email: [me@tedcharles.net](mailto:me@tedcharles.net)
- 🐛 GitHub Issues: [Report an issue](https://github.com/theodoreroddy/photography-website/issues) (for non-sensitive issues)

**Please do NOT:**
- ❌ Open public issues for security vulnerabilities
- ❌ Exploit vulnerabilities for malicious purposes

**Please DO:**
- ✅ Email security concerns privately
- ✅ Include steps to reproduce the issue
- ✅ Allow reasonable time for a fix before public disclosure

---

## Credits

**Built by:** [Ted Charles](https://tedcharles.net)

**Technologies:**
- ⚛️ React 19
- 📘 TypeScript
- 🚂 Express 5
- ⚡ Vite 6
- 📊 Recharts 3
- 🔐 Passport.js
- 🎨 ImageMagick

**Special Thanks:**
- OpenObserve for analytics platform
- Google for OAuth services
- The open-source community

---

## Quick Reference

### Essential Commands

```bash
# Development
cd backend && npm run dev              # Start backend (port 3001)
cd frontend && npm run dev             # Start frontend (port 5173)
./optimize_images.sh                   # Optimize images

# Production
./restart.sh                           # Full deploy (pull, build, restart)
pm2 list                               # Check services
pm2 logs                               # View logs
pm2 restart all                        # Restart services
pm2 monit                             # Real-time monitoring

# Photo Management
mkdir photos/new-album                 # Create album
cp *.jpg photos/new-album/             # Add photos
./optimize_images.sh                   # Optimize new photos

# Admin Access
open http://localhost:5173/admin       # Local admin
open https://yourdomain.com/admin      # Production admin

# Secrets Generation
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Important Files

| File | Purpose |
|------|---------|
| `config/config.json` | **All settings** - branding, auth, analytics |
| `backend/openapi.yaml` | Complete API specification (OpenAPI 3.0) |
| `backend/API.md` | Human-readable API documentation |
| `optimize_images.sh` | Image optimization script |
| `restart.sh` | Production deployment automation |
| `ecosystem.config.cjs` | PM2 process management config |
| `backend/src/server.ts` | Main backend entry point |
| `frontend/src/App.tsx` | Main frontend entry point |

### Ports

| Service | Development | Production |
|---------|-------------|------------|
| Frontend (Vite dev) | 5173 | - |
| Frontend (Production) | - | 3000 |
| Backend | 3001 | 3001 |

### Directory Structure

| Directory | Purpose | Git Tracked |
|-----------|---------|-------------|
| `photos/` | Original photos (your files) | ❌ No (.gitignore) |
| `optimized/` | Generated optimized images | ❌ No (.gitignore) |
| `backend/dist/` | Compiled TypeScript | ❌ No (.gitignore) |
| `frontend/dist/` | Production React build | ❌ No (.gitignore) |
| `backend/src/` | Backend source code | ✅ Yes |
| `frontend/src/` | Frontend source code | ✅ Yes |
| `config/` | Configuration files | ⚠️ Partial (exclude secrets) |

---

## Links

- **🌐 Live Demo:** [tedcharles.net](https://tedcharles.net)
- **📦 Repository:** [github.com/theodoreroddy/photography-website](https://github.com/theodoreroddy/photography-website)
- **🐛 Report Issues:** [GitHub Issues](https://github.com/theodoreroddy/photography-website/issues)
- **📖 API Documentation:** See `backend/API.md` or `backend/openapi.yaml`
- **📧 Contact:** [me@tedcharles.net](mailto:me@tedcharles.net)

---

## Support

**Need help?**

1. 📖 Check this README and documentation
2. 🐛 Search [existing issues](https://github.com/theodoreroddy/photography-website/issues)
3. 💬 Open a new issue with details
4. 📧 Email me@tedcharles.net for direct support

**When reporting issues, please include:**
- Operating system and version
- Node.js version (`node --version`)
- Error messages and stack traces
- Steps to reproduce the problem
- Screenshots if relevant

---

**Happy photographing! 📸**
