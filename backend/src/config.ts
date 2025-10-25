/**
 * Backend configuration - reads from config/config.json
 * This is the ONLY source of truth for all configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config.json (the single source of truth)
const configPath = path.join(__dirname, '../../config/config.json');
const fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const config = fullConfig.environment;

console.log(`Loaded configuration from config.json`);

// Export values from config.json (environment variables can override)
export const PORT = process.env.PORT ? parseInt(process.env.PORT) : config.backend.port;
export const PHOTOS_DIR = process.env.PHOTOS_DIR || config.backend.photosDir;
export const OPTIMIZED_DIR = 'optimized';
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map((o: string) => o.trim())
  : config.backend.allowedOrigins;
export const RATE_LIMIT_WINDOW_MS = config.security.rateLimitWindowMs;
export const RATE_LIMIT_MAX_REQUESTS = config.security.rateLimitMaxRequests;

// Export the full config for routes that need it (analytics, sitemap, etc)
export default {
  ...config,
  analytics: fullConfig.analytics,
  branding: fullConfig.branding,
  externalLinks: fullConfig.externalLinks,
  frontend: config.frontend
};

