import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const configPath = path.join(__dirname, "../config/config.json");
const configFile = JSON.parse(fs.readFileSync(configPath, "utf8"));
const config = configFile.environment;

const app = express();
const port = process.env.PORT || config.frontend.port;

// Security headers middleware
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
  // Content Security Policy
  const apiDomain = config.frontend.apiUrl;
  const apiDomainHttps = apiDomain.replace("http://", "https://");
  
  // Get external analytics script host if configured
  const analyticsScriptPath = configFile.analytics?.scriptPath || '';
  const analyticsScriptHost = analyticsScriptPath && analyticsScriptPath.startsWith('http') 
    ? new URL(analyticsScriptPath).origin 
    : '';
  
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    `script-src 'self' 'unsafe-inline'${analyticsScriptHost ? ' ' + analyticsScriptHost : ''}; ` + // unsafe-inline needed for React inline scripts
    "style-src 'self' 'unsafe-inline'; " +
    "worker-src 'self'; " + // Allow web workers from same origin
    `img-src 'self' ${apiDomainHttps} ${apiDomain} data: https://*.basemaps.cartocdn.com; ` + // Allow CartoDB map tiles
    `connect-src 'self' ${apiDomainHttps} ${apiDomain}; ` + // No need to allow OpenObserve - backend handles it
    "font-src 'self'; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'none';"
  );
  next();
});

// Allowed hosts for security (prevent open redirect attacks)
const allowedHosts = config.security.allowedHosts;

// HTTPS redirect middleware (only in production)
app.use((req, res, next) => {
  const host = req.get("host");

  // Validate host to prevent open redirect attacks
  if (!allowedHosts.includes(host)) {
    return res.status(400).send("Invalid host header");
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

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, "dist")));

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
          
          const thumbnailUrl = `${apiUrl}/optimized/thumbnail/${albumName}/${firstPhoto.filename}`;
          const pageUrl = `${siteUrl}/shared/${secretKey}`;
          
          // Log meta tag injection
          console.log(`[Meta Injection] Shared album link detected:`);
          console.log(`  Album: ${albumName}`);
          console.log(`  Secret Key: ${secretKey}`);
          console.log(`  Preview Image: ${thumbnailUrl}`);
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
              `<meta property="og:image" content="${thumbnailUrl}" />\n    <meta property="og:image:secure_url" content="${thumbnailUrl.replace('http://', 'https://')}" />\n    <meta property="og:image:alt" content="${safeAlbumName} - Photography by Ted Charles" />\n    <meta property="og:image:type" content="image/jpeg" />`
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
              `<meta property="twitter:image" content="${thumbnailUrl}" />`
            );
          
          return res.send(modifiedHtml);
        }
      }
    } catch (error) {
      console.error('[Meta Injection] Error fetching shared album data:', error);
      // Fall through to default index.html
    }
  }
  
  // Check if this is a photo permalink (album route with photo parameter)
  const urlPath = req.path;
  const photoParam = req.query.photo;
  
  if (urlPath.startsWith('/album/') && photoParam) {
    // Extract album name from path (e.g., /album/nature -> nature)
    const albumMatch = urlPath.match(/^\/album\/([^\/]+)/);
    if (albumMatch) {
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
  }
  
  // Default: serve the standard index.html
  res.sendFile(indexPath);
});

// Listen on 0.0.0.0 for remote dev/production, 127.0.0.1 for localhost
const isLocalhost = config.frontend.apiUrl.includes('localhost');
const bindHost = isLocalhost ? '127.0.0.1' : '0.0.0.0';

app.listen(port, bindHost, () => {
  console.log(`Frontend server running on ${bindHost}:${port}`);
  console.log(`API URL: ${config.frontend.apiUrl}`);
});
