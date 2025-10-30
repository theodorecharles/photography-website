/**
 * Main server file for the photography website backend.
 * This file sets up the Express server, configures middleware,
 * and defines the main routes for the application.
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import session from "express-session";
import passport from "passport";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Import configuration
import config, {
  PORT,
  PHOTOS_DIR,
  OPTIMIZED_DIR,
  ALLOWED_ORIGINS,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
} from "./config.ts";
import { validateProductionSecurity } from "./security.ts";

// Import route handlers
import albumsRouter from "./routes/albums.ts";
import albumManagementRouter from "./routes/album-management.ts";
import externalPagesRouter from "./routes/external-pages.ts";
import healthRouter from "./routes/health.ts";
import analyticsRouter from "./routes/analytics.ts";
import metricsRouter from "./routes/metrics.ts";
import sitemapRouter from "./routes/sitemap.ts";
import yearRouter from "./routes/year.ts";
import authRouter from "./routes/auth.ts";
import externalLinksRouter from "./routes/external-links.ts";
import brandingRouter from "./routes/branding.ts";
import imageOptimizationRouter from "./routes/image-optimization.ts";

// Get the current directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate production security before starting
validateProductionSecurity();

// Initialize Express application
const app = express();

// Trust proxy - required for production behind nginx/reverse proxy
// This allows express to read X-Forwarded-* headers correctly
app.set('trust proxy', 1);

// HTTPS redirect middleware (production only)
const isProduction = config.frontend.apiUrl.startsWith('https://');
if (isProduction) {
  app.use((req, res, next) => {
    // Check if request is already HTTPS
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    
    if (!isSecure) {
      // Redirect to HTTPS
      const httpsUrl = `https://${req.headers.host}${req.url}`;
      return res.redirect(301, httpsUrl);
    }
    
    next();
  });
}

// Resolve photo directory paths relative to project root
// PHOTOS_DIR should be relative to where you run the backend (typically backend/ directory)
let photosDir = path.resolve(__dirname, '../../', PHOTOS_DIR);
let optimizedDir = path.resolve(__dirname, '../../', OPTIMIZED_DIR);

// Resolve symlinks to get the real path (important for macOS TCC permissions)
try {
  photosDir = fs.realpathSync(photosDir);
  console.log('Photos directory (real path):', photosDir);
} catch (err) {
  console.warn('Warning: Could not resolve photos directory:', photosDir);
}

try {
  optimizedDir = fs.realpathSync(optimizedDir);
  console.log('Optimized directory (real path):', optimizedDir);
} catch (err) {
  console.warn('Warning: Could not resolve optimized directory:', optimizedDir);
}

// Verify directory paths exist
if (!fs.existsSync(photosDir)) {
  console.warn("Warning: Photos directory does not exist:", photosDir);
}
if (!fs.existsSync(optimizedDir)) {
  console.warn("Warning: Optimized directory does not exist:", optimizedDir);
}

// Configure security middleware
// Set security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images to be loaded from different origins
    contentSecurityPolicy: false, // Disable CSP as we're serving images
    frameguard: { action: 'deny' }, // X-Frame-Options: DENY (prevent clickjacking)
    noSniff: true, // X-Content-Type-Options: nosniff (prevent MIME type sniffing)
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // Referrer-Policy
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    }
  })
);

// Configure CORS with specific origins
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        // Reject origin by passing false (not an Error)
        console.warn(`CORS blocked origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Analytics-Signature'],
  })
);

// Rate limiting to prevent abuse
// Allow up to 50 requests per second per IP - normal users won't hit this
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  // Skip failed requests (don't count them)
  skipFailedRequests: true,
});

app.use("/api/", limiter);

// Parse JSON request bodies with size limit
app.use(express.json({ limit: "1mb" }));

// Configure session middleware for authentication
const sessionSecret = config.auth?.sessionSecret;
if (!sessionSecret) {
  console.error('❌ CRITICAL ERROR: SESSION_SECRET is not configured!');
  console.error('Please set auth.sessionSecret in config.json or SESSION_SECRET environment variable.');
  console.error('Generate a secure secret with: openssl rand -hex 32');
  process.exit(1);
}

// Determine cookie domain based on environment
// For localhost, DON'T set domain (undefined) - browsers handle localhost specially
// For production, extract the base domain to share across subdomains
let cookieDomain: string | undefined = undefined;
try {
  const backendUrl = new URL(config.frontend.apiUrl);
  const hostname = backendUrl.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // For local development, leave domain undefined
    // Setting explicit 'localhost' can cause issues with cookies across ports
    cookieDomain = undefined;
    console.log('Cookie domain: undefined (localhost development)');
  } else {
    // For production, extract base domain (e.g., 'tedcharles.net' from 'api.tedcharles.net')
    // Set to '.domain.com' to share across subdomains
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      // Get last two parts (domain.tld)
      cookieDomain = '.' + parts.slice(-2).join('.');
      console.log(`Cookie domain set to: ${cookieDomain}`);
    }
  }
} catch (err) {
  console.warn('Could not parse backend URL for cookie domain, using undefined');
}

// Use the isProduction variable already defined above (line 56)
// For localhost, disable SameSite to allow cross-port cookies
// For production, use 'lax' for OAuth compatibility
const sameSiteValue = isProduction ? 'lax' : false;

console.log('Session cookie config:', {
  secure: isProduction,
  httpOnly: true,
  sameSite: sameSiteValue,
  domain: cookieDomain,
});

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction, // HTTPS only in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      // Disable SameSite for localhost (different ports = cross-site)
      // Use 'lax' for production (OAuth compatible)
      sameSite: sameSiteValue as any,
      domain: cookieDomain,
    },
  })
);

// Initialize Passport and session support
app.use(passport.initialize());
app.use(passport.session());

// Debug middleware - log requests to metrics endpoints
if (!isProduction) {
  app.use('/api/metrics', (req, res, next) => {
    console.log(`[Metrics Request] ${req.method} ${req.path}`);
    console.log('  Cookies:', req.headers.cookie || 'NONE');
    console.log('  Session ID:', req.sessionID);
    console.log('  Authenticated:', req.isAuthenticated());
    next();
  });
}

// Serve original photos with CORS headers
app.use("/photos", express.static(photosDir, {
  setHeaders: (res, path) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  }
}));

// Serve optimized photos with CORS headers
app.use(
  "/optimized",
  express.static(optimizedDir, {
    maxAge: "1y",
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      res.setHeader("Cache-Control", "public, max-age=31536000"); // 1 year
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// Store directory paths in app for use in routes
app.set("photosDir", photosDir);
app.set("optimizedDir", optimizedDir);

// Register route handlers
// Note: CSRF protection is applied inside individual routers that need it
app.use('/api/auth', authRouter);
app.use('/api/external-links', externalLinksRouter);
app.use('/api/branding', brandingRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/image-optimization', imageOptimizationRouter);
app.use(albumsRouter);
app.use('/api/albums', albumManagementRouter);
app.use(externalPagesRouter);
app.use(healthRouter);
app.use('/api/analytics', analyticsRouter);
app.use(sitemapRouter);
app.use(yearRouter);

// 404 handler - must come after all routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler - must be last
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server error:', err);
  
  // Don't leak error details in production (HTTPS = production)
  const isProduction = config.frontend.apiUrl.startsWith('https://');
  const message = isProduction 
    ? 'Internal server error' 
    : err.message || 'Internal server error';
  
  res.status(err.status || 500).json({ 
    error: message 
  });
});

// Start the server
// For localhost, bind to 127.0.0.1 to avoid macOS permission issues
// For remote dev/production, bind to 0.0.0.0 to accept external connections
const isLocalhost = config.frontend.apiUrl.includes('localhost');
const bindHost = isLocalhost ? '127.0.0.1' : '0.0.0.0';

const server = app.listen(PORT, bindHost, () => {
  console.log(`Server is running on ${bindHost}:${PORT}`);
  console.log(`API URL: ${config.frontend.apiUrl}`);
  console.log(`Photos directory: ${photosDir}`);
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please free the port or use a different one.`);
  } else if (error.code === 'EACCES') {
    console.error(`Permission denied to bind to port ${PORT}. Try using a port above 1024.`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});
