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

// Import route handlers
import albumsRouter from "./routes/albums.ts";
import externalPagesRouter from "./routes/external-pages.ts";
import healthRouter from "./routes/health.ts";
import analyticsRouter from "./routes/analytics.ts";
import sitemapRouter from "./routes/sitemap.ts";
import yearRouter from "./routes/year.ts";
import authRouter from "./routes/auth.ts";
import externalLinksRouter from "./routes/external-links.ts";
import brandingRouter from "./routes/branding.ts";

// Get the current directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express application
const app = express();

// Trust proxy - required for production behind nginx/reverse proxy
// This allows express to read X-Forwarded-* headers correctly
app.set('trust proxy', 1);

// Resolve photo directory paths relative to project root
// PHOTOS_DIR should be relative to where you run the backend (typically backend/ directory)
const photosDir = path.resolve(__dirname, '../../', PHOTOS_DIR);
const optimizedDir = path.resolve(__dirname, '../../', OPTIMIZED_DIR);

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
  })
);

// Configure CORS with specific origins
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (
        ALLOWED_ORIGINS.indexOf(origin) !== -1 ||
        process.env.NODE_ENV === "development"
      ) {
        callback(null, true);
      } else {
        // Reject origin by passing false (not an Error)
        console.warn(`CORS blocked origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
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
const sessionSecret = config.auth?.sessionSecret || 'fallback-secret-change-this';
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax', // 'lax' works for OAuth redirects and same-site requests
      domain: process.env.NODE_ENV === 'production' ? '.tedcharles.net' : undefined, // Share cookie across subdomains
    },
  })
);

// Initialize Passport and session support
app.use(passport.initialize());
app.use(passport.session());

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
app.use('/api/auth', authRouter);
app.use('/api/external-links', externalLinksRouter);
app.use('/api/branding', brandingRouter);
app.use(albumsRouter);
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
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message || 'Internal server error';
  
  res.status(err.status || 500).json({ 
    error: message 
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (process.env.NODE_ENV === "development") {
    console.log(`Photos directory: ${photosDir}`);
  }
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
