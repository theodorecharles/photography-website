import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for JSON files
const jsonCache = new Map();
const JSON_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

// Load configuration (or use defaults for setup mode)
// In Docker, DATA_DIR env var points to mounted volume
const dataDir = process.env.DATA_DIR || path.join(__dirname, "../data");
const configPath = path.join(dataDir, "config.json");
let configFile;
let config;
let isSetupMode = false;

// Use API_URL from environment if provided (for Docker)
const envApiUrl = process.env.API_URL || process.env.BACKEND_DOMAIN;

if (fs.existsSync(configPath)) {
  configFile = JSON.parse(fs.readFileSync(configPath, "utf8"));
  config = configFile.environment;
  
  // Override API URL from environment if provided
  if (envApiUrl) {
    config.frontend.apiUrl = envApiUrl;
    console.log(`[Config] Using API URL from environment: ${envApiUrl}`);
  }
} else {
  // Setup mode - use defaults
  console.log("⚠️  config.json not found - using defaults for setup mode");
  isSetupMode = true;
  configFile = {
    analytics: {},
  };
  config = {
    frontend: {
      port: 3000,
      apiUrl: envApiUrl || "http://localhost:3001",
    },
    security: {
      allowedHosts: ["localhost:3000", "127.0.0.1:3000"],
      redirectFrom: [],
      redirectTo: null,
    },
  };
}

const app = express();
const port = process.env.PORT || config.frontend.port;

// Security headers middleware (except CSP which needs runtime API URL)
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Enable XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Permissions policy
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );
  // CSP is set in catch-all route to use runtime API URL
  next();
});

// Allowed hosts for security (prevent open redirect attacks)
const allowedHosts = config.security.allowedHosts;

// HTTPS redirect middleware (only in production)
app.use((req, res, next) => {
  const host = req.get("host");

  // Skip host validation during setup mode (OOBE)
  if (!isSetupMode) {
    // Validate host to prevent open redirect attacks
    if (!allowedHosts.includes(host)) {
      return res.status(400).send("Invalid host header");
    }
  }

  // Redirect to HTTPS if apiUrl uses https (production/remote dev)
  const isProduction = config.frontend.apiUrl.startsWith("https://");
  if (isProduction && req.headers["x-forwarded-proto"] !== "https") {
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  }
  next();
});

// Domain redirect middleware (optional, for redirecting old domains)
app.use((req, res, next) => {
  const host = req.get("host");
  const redirectFrom = config.security.redirectFrom || [];
  const redirectTo = config.security.redirectTo;

  if (redirectFrom.length > 0 && redirectFrom.includes(host) && redirectTo) {
    return res.redirect(301, `https://${redirectTo}${req.originalUrl}`);
  }
  next();
});

// Serve primes page BEFORE React app (prevents React router from catching it)
// Handle both /primes and /primes/ with directory index support
app.use(
  "/primes",
  express.static(path.join(__dirname, "dist", "primes"), {
    index: "index.html",
  })
);

// Serve albums-data JSON files with no caching (must always be fresh)
app.get('/albums-data/*.json', (req, res, next) => {
  const jsonPath = path.join(__dirname, "dist", req.path);
  
  // Always read fresh from disk (no caching)
  fs.readFile(jsonPath, 'utf8', (err, data) => {
    if (err) {
      return next(); // Fall through to express.static
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate'); // Never cache
    res.setHeader('X-Cache', 'NONE');
    res.send(data);
  });
});

// Health check endpoint (must come before static files to avoid conflicts)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Frontend server is running' });
});

// Serve static files from the dist directory
// But exclude index.html so we can inject runtime config
app.use(express.static(path.join(__dirname, "dist"), {
  index: false, // Don't serve index.html automatically - let catch-all handle it
}));

// Handle client-side routing (catch-all for React routes)
// This must come AFTER all other routes
app.get("*", async (req, res) => {
  const indexPath = path.join(__dirname, "dist", "index.html");
  
  // Check if this is a shared album link
  const sharedMatch = req.path.match(/^\/shared\/([a-f0-9]{64})$/i);
  if (sharedMatch) {
    const secretKey = sharedMatch[1];
    
    try {
      // Fetch shared album data from backend
      const apiUrl = config.frontend.apiUrl;
      const response = await fetch(`${apiUrl}/api/shared/${secretKey}`);
      
      if (response.ok) {
        const data = await response.json();
        const albumName = data.album;
        const photos = data.photos || [];
        
        // Get first photo as preview image
        const firstPhoto = photos[0];
        
        if (firstPhoto) {
          // Escape HTML special characters
          const escapeHtml = (str) => str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          
          const safeAlbumName = escapeHtml(albumName);
          const albumTitleCase = albumName.charAt(0).toUpperCase() + albumName.slice(1);
          
          // Build URLs
          let siteUrl;
          if (apiUrl.includes('localhost')) {
            siteUrl = apiUrl.replace(':3001', ':3000');
          } else {
            siteUrl = apiUrl.replace(/api(-dev)?\./, 'www$1.');
          }
          
          // Use 2x2 grid preview image
          const gridUrl = `${apiUrl}/api/preview-grid/shared/${secretKey}`;
          const pageUrl = `${siteUrl}/shared/${secretKey}`;
          
          // Log meta tag injection
          console.log(`[Meta Injection] Shared album link detected:`);
          console.log(`  Album: ${albumName}`);
          console.log(`  Secret Key: ${secretKey}`);
          console.log(`  Preview Image: ${gridUrl}`);
          console.log(`  Page URL: ${pageUrl}`);
          
          // Read and modify index.html
          const html = fs.readFileSync(indexPath, 'utf8');
          const modifiedHtml = html
            .replace(
              /<title>.*?<\/title>/,
              `<title>${safeAlbumName} - Shared Album - Ted Charles Photography</title>`
            )
            .replace(
              /<meta name="title" content=".*?" \/>/,
              `<meta name="title" content="${safeAlbumName} - Shared Album" />`
            )
            .replace(
              /<meta name="description" content=".*?" \/>/,
              `<meta name="description" content="View the ${safeAlbumName} album shared by Ted Charles. ${photos.length} photo${photos.length !== 1 ? 's' : ''} available." />`
            )
            .replace(
              /<link rel="canonical" href=".*?" \/>/,
              `<link rel="canonical" href="${pageUrl}" />`
            )
            .replace(
              /<meta property="og:type" content=".*?" \/>/,
              `<meta property="og:type" content="article" />`
            )
            .replace(
              /<meta property="og:url" content=".*?" \/>/,
              `<meta property="og:url" content="${pageUrl}" />`
            )
            .replace(
              /<meta property="og:title" content=".*?" \/>/,
              `<meta property="og:title" content="${albumTitleCase} - Shared Album" />`
            )
            .replace(
              /<meta property="og:description" content=".*?" \/>/,
              `<meta property="og:description" content="View the ${albumTitleCase} album shared by Ted Charles. ${photos.length} photo${photos.length !== 1 ? 's' : ''} available." />`
            )
            .replace(
              /<meta property="og:image" content=".*?" \/>/,
              `<meta property="og:image" content="${gridUrl}" />\n    <meta property="og:image:secure_url" content="${gridUrl.replace('http://', 'https://')}" />\n    <meta property="og:image:alt" content="${safeAlbumName} - Photography by Ted Charles" />\n    <meta property="og:image:type" content="image/jpeg" />\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />`
            )
            .replace(
              /<meta property="twitter:url" content=".*?" \/>/,
              `<meta property="twitter:url" content="${pageUrl}" />`
            )
            .replace(
              /<meta property="twitter:title" content=".*?" \/>/,
              `<meta property="twitter:title" content="${albumTitleCase} - Shared Album" />`
            )
            .replace(
              /<meta property="twitter:description" content=".*?" \/>/,
              `<meta property="twitter:description" content="View the ${albumTitleCase} album shared by Ted Charles. ${photos.length} photos available." />`
            )
            .replace(
              /<meta property="twitter:image" content=".*?" \/>/,
              `<meta property="twitter:image" content="${gridUrl}" />`
            );
          
          return res.send(modifiedHtml);
        }
      }
    } catch (error) {
      console.error('[Meta Injection] Error fetching shared album data:', error);
      // Fall through to default index.html
    }
  }
  
  // Check if this is an album route
  const urlPath = req.path;
  const photoParam = req.query.photo;
  const albumMatch = urlPath.match(/^\/album\/([^\/]+)$/);
  
  // Handle album page (without specific photo)
  if (albumMatch && !photoParam) {
    const albumName = albumMatch[1];
    const apiUrl = config.frontend.apiUrl;
    
    try {
      // Fetch album data to get photo count
      const response = await fetch(`${apiUrl}/api/albums/${albumName}/photos`);
      
      if (response.ok) {
        const photos = await response.json();
        
        if (photos.length > 0) {
          // Derive site URL
          let siteUrl;
          if (apiUrl.includes('localhost')) {
            siteUrl = apiUrl.replace(':3001', ':3000');
          } else {
            siteUrl = apiUrl.replace(/api(-dev)?\./, 'www$1.');
          }
          
          // Use 2x2 grid preview image
          const gridUrl = `${apiUrl}/api/preview-grid/album/${albumName}`;
          const pageUrl = `${siteUrl}/album/${albumName}`;
          const albumTitleCase = albumName.charAt(0).toUpperCase() + albumName.slice(1);
          
          console.log(`[Meta Injection] Album page detected:`);
          console.log(`  Album: ${albumName}`);
          console.log(`  Photos: ${photos.length}`);
          console.log(`  Preview Image: ${gridUrl}`);
          console.log(`  Page URL: ${pageUrl}`);
          
          const escapeHtml = (str) => str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          
          const safeAlbumName = escapeHtml(albumTitleCase);
          
          // Read and modify HTML
          const html = fs.readFileSync(indexPath, 'utf8');
          const modifiedHtml = html
            .replace(
              /<title>.*?<\/title>/,
              `<title>${safeAlbumName} - Ted Charles Photography</title>`
            )
            .replace(
              /<meta name="title" content=".*?" \/>/,
              `<meta name="title" content="${safeAlbumName} - Photography Collection" />`
            )
            .replace(
              /<meta name="description" content=".*?" \/>/,
              `<meta name="description" content="Explore ${photos.length} photo${photos.length !== 1 ? 's' : ''} from the ${safeAlbumName} collection by Ted Charles." />`
            )
            .replace(
              /<link rel="canonical" href=".*?" \/>/,
              `<link rel="canonical" href="${pageUrl}" />`
            )
            .replace(
              /<meta property="og:type" content=".*?" \/>/,
              `<meta property="og:type" content="website" />`
            )
            .replace(
              /<meta property="og:url" content=".*?" \/>/,
              `<meta property="og:url" content="${pageUrl}" />`
            )
            .replace(
              /<meta property="og:title" content=".*?" \/>/,
              `<meta property="og:title" content="${safeAlbumName} - Photography Collection" />`
            )
            .replace(
              /<meta property="og:description" content=".*?" \/>/,
              `<meta property="og:description" content="Explore ${photos.length} photo${photos.length !== 1 ? 's' : ''} from the ${safeAlbumName} collection." />`
            )
            .replace(
              /<meta property="og:image" content=".*?" \/>/,
              `<meta property="og:image" content="${gridUrl}" />\n    <meta property="og:image:secure_url" content="${gridUrl.replace('http://', 'https://')}" />\n    <meta property="og:image:alt" content="${safeAlbumName} - Photography by Ted Charles" />\n    <meta property="og:image:type" content="image/jpeg" />\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />`
            )
            .replace(
              /<meta property="twitter:url" content=".*?" \/>/,
              `<meta property="twitter:url" content="${pageUrl}" />`
            )
            .replace(
              /<meta property="twitter:title" content=".*?" \/>/,
              `<meta property="twitter:title" content="${safeAlbumName} - Photography Collection" />`
            )
            .replace(
              /<meta property="twitter:description" content=".*?" \/>/,
              `<meta property="twitter:description" content="Explore ${photos.length} photo${photos.length !== 1 ? 's' : ''} from the ${safeAlbumName} collection." />`
            )
            .replace(
              /<meta property="twitter:image" content=".*?" \/>/,
              `<meta property="twitter:image" content="${gridUrl}" />`
            );
          
          return res.send(modifiedHtml);
        }
      }
    } catch (error) {
      console.error('[Meta Injection] Error fetching album data:', error);
      // Fall through to default handling
    }
  }
  
  // Handle photo permalink (album route with photo parameter)
  if (albumMatch && photoParam) {
    const albumName = albumMatch[1];
    const photoFilename = photoParam;
    
    // Generate photo title from filename (remove extension, replace separators with spaces)
    const photoTitle = photoFilename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[-_]/g, ' '); // Replace hyphens and underscores with spaces
    
    // Escape HTML special characters in photo title for safe insertion
    const escapeHtml = (str) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const safePhotoTitle = escapeHtml(photoTitle);
    
    // Build URLs for the photo
    const apiUrl = config.frontend.apiUrl;
    // Derive site URL from API URL:
    // Production: https://api.tedcharles.net -> https://www.tedcharles.net
    // Development: http://localhost:3001 -> http://localhost:3000
    // Dev server: https://api-dev.tedcharles.net -> https://www-dev.tedcharles.net
    let siteUrl;
    if (apiUrl.includes('localhost')) {
      siteUrl = apiUrl.replace(':3001', ':3000');
    } else {
      // Handle both api. and api-dev. patterns
      siteUrl = apiUrl.replace(/api(-dev)?\./, 'www$1.');
    }
    
    // Ensure thumbnail URL uses HTTPS for production (Telegram requirement)
    // Use full URL with protocol for social media crawlers
    let thumbnailUrl = `${apiUrl}/optimized/thumbnail/${albumName}/${photoFilename}`;
    
    const pageUrl = `${siteUrl}/album/${albumName}?photo=${encodeURIComponent(photoFilename)}`;
    const albumTitleCase = albumName.charAt(0).toUpperCase() + albumName.slice(1);
    
    // Log meta tag injection for debugging
    console.log(`[Meta Injection] Photo permalink detected:`);
    console.log(`  Album: ${albumName}`);
    console.log(`  Photo: ${photoFilename}`);
    console.log(`  Title: ${photoTitle}`);
    console.log(`  OG Image: ${thumbnailUrl}`);
    console.log(`  OG Image (secure): ${thumbnailUrl.replace('http://', 'https://')}`);
    console.log(`  Page URL: ${pageUrl}`);
    
    // Read the index.html file
    fs.readFile(indexPath, 'utf8', (err, html) => {
      if (err) {
        console.error('Error reading index.html:', err);
        return res.sendFile(indexPath);
      }
      
      // Replace meta tags with photo-specific content
      let modifiedHtml = html
          // Update page title
          .replace(
            /<title>.*?<\/title>/,
            `<title>${safePhotoTitle} - ${albumTitleCase} - Ted Charles Photography</title>`
          )
          // Update meta title
          .replace(
            /<meta name="title" content=".*?" \/>/,
            `<meta name="title" content="${safePhotoTitle} - ${albumTitleCase} - Ted Charles Photography" />`
          )
          // Update meta description
          .replace(
            /<meta name="description" content=".*?" \/>/,
            `<meta name="description" content="View '${safePhotoTitle}' from the ${albumTitleCase} collection by Ted Charles. Professional photography portfolio." />`
          )
          // Update canonical URL
          .replace(
            /<link rel="canonical" href=".*?" \/>/,
            `<link rel="canonical" href="${pageUrl}" />`
          )
          // Update og:type to article for individual photos
          .replace(
            /<meta property="og:type" content=".*?" \/>/,
            `<meta property="og:type" content="article" />`
          )
          // Update og:url
          .replace(
            /<meta property="og:url" content=".*?" \/>/,
            `<meta property="og:url" content="${pageUrl}" />`
          )
          // Update og:title
          .replace(
            /<meta property="og:title" content=".*?" \/>/,
            `<meta property="og:title" content="${safePhotoTitle} - ${albumTitleCase}" />`
          )
          // Update og:description
          .replace(
            /<meta property="og:description" content=".*?" \/>/,
            `<meta property="og:description" content="View '${safePhotoTitle}' from the ${albumTitleCase} collection by Ted Charles." />`
          )
          // Update og:image to the photo thumbnail
          .replace(
            /<meta property="og:image" content=".*?" \/>/,
            `<meta property="og:image" content="${thumbnailUrl}" />\n    <meta property="og:image:secure_url" content="${thumbnailUrl.replace('http://', 'https://')}" />\n    <meta property="og:image:alt" content="${safePhotoTitle} - Photography by Ted Charles" />\n    <meta property="og:image:type" content="image/jpeg" />`
          )
          // Update twitter:url
          .replace(
            /<meta property="twitter:url" content=".*?" \/>/,
            `<meta property="twitter:url" content="${pageUrl}" />`
          )
          // Update twitter:title
          .replace(
            /<meta property="twitter:title" content=".*?" \/>/,
            `<meta property="twitter:title" content="${safePhotoTitle} - ${albumTitleCase}" />`
          )
          // Update twitter:description
          .replace(
            /<meta property="twitter:description" content=".*?" \/>/,
            `<meta property="twitter:description" content="View '${safePhotoTitle}' from the ${albumTitleCase} collection by Ted Charles." />`
          )
          // Update twitter:image to the photo thumbnail
          .replace(
            /<meta property="twitter:image" content=".*?" \/>/,
            `<meta property="twitter:image" content="${thumbnailUrl}" />`
        );
      
      res.send(modifiedHtml);
    });
    
    return;
  }
  
  // Default: serve the standard index.html
  // Inject runtime API URL for OOBE support
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return res.sendFile(indexPath);
    }
    
    // Determine runtime API URL
    // Priority: 1) Environment variable, 2) Auto-detect from headers, 3) Config file
    let runtimeApiUrl;
    
    if (process.env.BACKEND_DOMAIN || process.env.API_URL) {
      // Use environment variable if provided (Docker deployments)
      runtimeApiUrl = process.env.BACKEND_DOMAIN || process.env.API_URL;
    } else if (isSetupMode || !config.frontend.apiUrl || config.frontend.apiUrl.includes('localhost')) {
      // Auto-detect from request headers (setup mode or missing/localhost config)
      const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      const hostHeader = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:3000';
      const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
      
      if (host.includes('localhost')) {
        runtimeApiUrl = 'http://localhost:3001';
      } else if (host.startsWith('www-')) {
        // www-dev.tedcharles.net -> api-dev.tedcharles.net
        runtimeApiUrl = `${protocol}://api-${host.substring(4)}`;
      } else if (host.startsWith('www.')) {
        // www.tedcharles.net -> api.tedcharles.net
        runtimeApiUrl = `${protocol}://api.${host.substring(4)}`;
      } else {
        runtimeApiUrl = `${protocol}://api.${host}`;
      }
    } else {
      // Use config file value
      runtimeApiUrl = config.frontend.apiUrl;
    }
    
    // Set Content Security Policy with runtime API URL
    const apiDomainHttps = runtimeApiUrl.replace("http://", "https://");
    const analyticsScriptPath = configFile.analytics?.scriptPath || '';
    const analyticsScriptHost = analyticsScriptPath && analyticsScriptPath.startsWith('http') 
      ? new URL(analyticsScriptPath).origin 
      : '';
    
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
      `script-src 'self' 'unsafe-inline'${analyticsScriptHost ? ' ' + analyticsScriptHost : ''}; ` +
      "style-src 'self' 'unsafe-inline'; " +
      "worker-src 'self'; " +
      `img-src 'self' ${apiDomainHttps} ${runtimeApiUrl} data: blob: https://*.basemaps.cartocdn.com https://www.gravatar.com; ` +
      `connect-src 'self' ${apiDomainHttps} ${runtimeApiUrl}; ` +
      "font-src 'self'; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'none';"
    );
    
    // Inject runtime config before other scripts
    const modifiedHtml = html.replace(
      '<script type="module"',
      `<script>window.__RUNTIME_API_URL__ = "${runtimeApiUrl}";</script>\n    <script type="module"`
    );
    
    res.send(modifiedHtml);
  });
});

// Listen on 0.0.0.0 for remote dev/production, 127.0.0.1 for localhost
// Allow HOST environment variable to override
const isLocalhost = config.frontend.apiUrl.includes('localhost');
const bindHost = process.env.HOST || (isLocalhost ? '127.0.0.1' : '0.0.0.0');

app.listen(port, bindHost, () => {
  console.log(`Frontend server running on ${bindHost}:${port}`);
  console.log(`API URL: ${config.frontend.apiUrl}`);
});
