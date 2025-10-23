# Photography Website

A modern, secure, and performant photography portfolio website built with React, TypeScript, Express, and Node.js. Features optimized image delivery, album management, and a responsive design.

## Features

- 📸 **Album-based Photo Organization** - Organize photos in folders that automatically become albums
- 🚀 **Optimized Image Delivery** - Automatic image optimization with multiple sizes (thumbnail, modal, download)
- 🔒 **Security Hardened** - Rate limiting, CORS protection, input validation, CSP headers, and more
- 📱 **Responsive Design** - Works beautifully on desktop, tablet, and mobile devices
- ⚡ **Fast Performance** - Lazy loading, caching, and optimized builds
- 🎨 **Customizable** - Easy configuration for your own domain and branding
- 🔗 **External Links** - Configurable external links menu

## Project Structure

```
photography-website/
├── backend/                 # Express API server
│   ├── src/
│   │   ├── server.ts       # Main server file
│   │   └── routes/         # API route handlers
│   ├── dist/               # Compiled JavaScript (generated)
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── App.tsx         # Main React component
│   │   ├── components/     # React components
│   │   └── config.ts       # Frontend configuration
│   ├── public/             # Static assets
│   ├── dist/               # Production build (generated)
│   ├── server.js           # Production server
│   └── package.json
├── photos/                 # Your original photos (create this folder)
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
└── restart.sh            # Deployment restart script
```

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **ImageMagick** (for image optimization): `brew install imagemagick` (macOS) or `apt-get install imagemagick` (Linux)
- **Git** (for cloning)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/photography-website.git
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

   The project uses a single configuration file: `config/config.json`

   This file is already set up with default development settings. To customize:

   ```bash
   # The config.json file contains both development and production settings
   # Edit config/config.json to update your domains, ports, and directories
   ```

   For local development, the defaults should work as-is. For production, update the `production` section in `config/config.json`:

   ```json
   {
     "production": {
       "frontend": {
         "apiUrl": "https://api.yourdomain.com"
       },
       "backend": {
         "allowedOrigins": ["https://yourdomain.com"]
       },
       "security": {
         "allowedHosts": ["yourdomain.com"]
       }
     }
   }
   ```

4. **Set up your photos**

   ```bash
   mkdir photos
   mkdir photos/homepage
   mkdir photos/album1
   mkdir photos/album2
   ```

   Copy your photos into these folders. Each folder becomes an album! The folder name is the album name.

5. **Optimize your images**

   ```bash
   chmod +x optimize_images.sh
   ./optimize_images.sh
   ```

   This creates optimized versions (thumbnails, modal views, and downloads) of all your photos.

6. **Configure external links** (optional)

   Edit the `externalLinks` section in `config/config.json`:

   ```json
   {
     "externalLinks": [
       {
         "title": "My Blog",
         "url": "https://blog.example.com"
       },
       {
         "title": "YouTube",
         "url": "https://youtube.com/@yourname"
       }
     ]
   }
   ```

7. **Start development servers**

   In separate terminal windows:

   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

8. **Open your browser**

   Visit http://localhost:5173

## Photo Management

### Adding Photos

1. Create a folder in the `photos/` directory for each album
2. Add your photos (`.jpg`, `.jpeg`, `.png`, `.gif`) to these folders
3. Run the optimization script: `./optimize_images.sh`
4. Refresh your website - the new album appears automatically!

### Album Organization

- **Folder name = Album name**: A folder named `vacation` becomes an album called "Vacation"
- **Homepage album**: Put photos in `photos/homepage/` to show on the homepage
- **Album names**: Use lowercase with hyphens or underscores (e.g., `my-trip`, `family_photos`)
- **File formats**: Supported formats are JPG, JPEG, PNG, and GIF

### Image Optimization

The `optimize_images.sh` script creates three versions of each photo:

- **Thumbnail** (1024px max, 60% quality) - For grid display
- **Modal** (2048px max, 60% quality) - For lightbox/modal view
- **Download** (4096px max, 100% quality) - For full-resolution downloads

You can adjust these settings in `optimize_images.sh`:

```bash
THUMBNAIL_QUALITY=60
MODAL_QUALITY=60
DOWNLOAD_QUALITY=100

THUMBNAIL_MAX_DIM=1024
MODAL_MAX_DIM=2048
DOWNLOAD_MAX_DIM=4096
```

## Configuration

All configuration is managed in a single file: **`config/config.json`**

### Main Configuration (`config/config.json`)

This file contains settings for both development and production environments:

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
    // ... same structure, but with your production domains
  }
}
```

**What each setting does:**

- `frontend.port` - Port for the frontend server (production)
- `frontend.apiUrl` - Backend API URL
- `backend.port` - Port for the backend server
- `backend.photosDir` - Path to your photos directory (use `photos` - relative to project root)
- `backend.allowedOrigins` - CORS allowed origins (your frontend domains)
- `security.allowedHosts` - Valid hostnames (prevents redirect attacks)
- `security.rateLimitWindowMs` - Rate limit time window in milliseconds
- `security.rateLimitMaxRequests` - Max requests per window per IP
- `security.redirectFrom` - (Optional) Old domains to redirect from
- `security.redirectTo` - (Optional) New domain to redirect to
- `externalLinks` - Array of external links shown in the navigation menu
  - Each link has a `title` and `url`
  - Internal links (like `/primes/`) work too

**Note:** The `optimized` directory is always `optimized/` at the project root (generated by `optimize_images.sh`).

### Branding

- **Site title**: Edit `frontend/src/App.tsx` - look for "Ted Charles"
- **Avatar**: Replace `photos/derpatar.png` with your own avatar image
- **Favicon**: Replace `frontend/public/vite.svg`
- **Colors**: Edit `frontend/src/App.css` and `frontend/src/index.css`

## Production Deployment

### Build for Production

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build
```

### Configure for Production

Edit `config/config.json` and update the `production` section with your domain and paths:

```json
{
  "production": {
    "frontend": {
      "port": 3000,
      "apiUrl": "https://api.yourdomain.com"
    },
    "backend": {
      "port": 3001,
      "photosDir": "./photos",
      "allowedOrigins": ["https://yourdomain.com", "https://www.yourdomain.com"]
    },
    "security": {
      "allowedHosts": ["yourdomain.com", "www.yourdomain.com"],
      "rateLimitWindowMs": 1000,
      "rateLimitMaxRequests": 50,
      "redirectFrom": ["olddomain.com"],
      "redirectTo": "yourdomain.com"
    }
  }
}
```

Set the NODE_ENV environment variable:

```bash
export NODE_ENV=production
```

### Using PM2 (Recommended)

The project includes a `ecosystem.config.js` file that properly configures both services with production environment variables.

```bash
# Install PM2 globally
npm install -g pm2

# Start both services using the ecosystem file
pm2 start ecosystem.config.js

# Save PM2 configuration for auto-restart on reboot
pm2 save
pm2 startup

# View running services
pm2 list

# View logs
pm2 logs

# Restart services
pm2 restart ecosystem.config.js --update-env
```

**Important:** The ecosystem file sets `NODE_ENV=production` automatically. Edit `ecosystem.config.js` to change paths or ports if needed.

### Using the Restart Script

The included `restart.sh` script automates deployment:

```bash
chmod +x restart.sh
./restart.sh
```

This script:

1. Pulls latest changes from Git
2. Optimizes all images
3. Builds backend and frontend
4. Restarts both services with PM2

## Security Features

This project includes comprehensive security measures:

- ✅ **Rate Limiting** - 50 requests/second per IP (configurable)
- ✅ **CORS Protection** - Whitelist-based origin validation
- ✅ **Input Validation** - Path traversal protection, sanitized inputs
- ✅ **Security Headers** - CSP, X-Frame-Options, XSS protection, etc.
- ✅ **HTTPS Enforcement** - Automatic redirect in production
- ✅ **Host Validation** - Prevents open redirect attacks
- ✅ **Request Size Limits** - Prevents memory exhaustion
- ✅ **No Authentication Required** - Public portfolio site (as intended)

## Development

### Project Stack

- **Frontend**: React 19, TypeScript, React Router, Material-UI
- **Backend**: Node.js, Express 5, TypeScript
- **Build Tools**: Vite, TypeScript Compiler
- **Image Processing**: ImageMagick (via shell script)

### Available Scripts

**Backend:**

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production build

**Frontend:**

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm start` - Run production server (server.js)

### Adding New Features

1. **New API Endpoints**: Add routes in `backend/src/routes/`
2. **New React Components**: Add components in `frontend/src/components/`
3. **New Pages**: Add routes in `frontend/src/App.tsx`

## Troubleshooting

### Images not showing

- Check that `optimize_images.sh` ran successfully
- Verify `photos/` and `optimized/` directories exist
- Check browser console for CORS errors
- Ensure backend ALLOWED_ORIGINS includes your frontend URL

### CORS errors

- Update `backend/.env` ALLOWED_ORIGINS to include your frontend domain
- Restart the backend server after changing .env

### Rate limiting (429 errors)

- Check rate limit configuration in `backend/src/server.ts`
- Rate limit is 50 requests/second by default
- Only applies to `/api/*` endpoints

### Build errors

- Delete `node_modules` and `package-lock.json` in both frontend and backend
- Run `npm install` again
- Ensure Node.js version is 18+

## License

See the LICENSE section on the website footer (configurable in `frontend/src/components/License.tsx`).

## Contributing

Feel free to submit issues and pull requests!

## Credits

Built with ❤️ using React, TypeScript, Express, and modern web technologies.

---

## Quick Reference

### Essential Commands

```bash
# Development
cd backend && npm run dev        # Start backend
cd frontend && npm run dev       # Start frontend
./optimize_images.sh             # Optimize images

# Production
./restart.sh                     # Deploy everything
pm2 list                         # Check running services
pm2 logs                         # View logs

# Image Management
mkdir photos/new-album           # Create new album
cp *.jpg photos/new-album/       # Add photos
./optimize_images.sh             # Optimize new photos
```

### Important Files

- `config/config.json` - **Main configuration file** (all settings, domains, external links, etc.)
- `config/config.example.json` - Configuration template for new users
- `photos/` - Your original photos (organized in album folders)
- `optimized/` - Generated optimized images (auto-created by script)
- `optimize_images.sh` - Image optimization script
- `restart.sh` - Deployment script

### Ports

- Frontend Dev: 5173 (Vite)
- Frontend Prod: 3000 (configurable)
- Backend: 3001 (configurable)

---

For more information or support, please open an issue on GitHub.
