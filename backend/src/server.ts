/**
 * Main server file for the photography website backend.
 * This file sets up the Express server, configures middleware,
 * and defines the main routes for the application.
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Import configuration
import {
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

// Get the current directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express application
const app = express();

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
        callback(new Error("Not allowed by CORS"));
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
app.use("/photos", express.static(photosDir)); // Serve original photos
app.use(
  "/optimized",
  express.static(optimizedDir, {
    maxAge: "1y",
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      res.setHeader("Cache-Control", "public, max-age=31536000"); // 1 year
    },
  })
); // Serve optimized photos

// Store directory paths in app for use in routes
app.set("photosDir", photosDir);
app.set("optimizedDir", optimizedDir);

// Register route handlers
app.use(albumsRouter);
app.use(externalPagesRouter);
app.use(healthRouter);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (process.env.NODE_ENV === "development") {
    console.log(`Photos directory: ${photosDir}`);
  }
});
