/**
 * Backend configuration - reads from config/config.json
 * This is the ONLY source of truth for all configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Centralized data directory for all persistent data
// This allows easy Docker volume mounting at /data
export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');

// Load config.json (the single source of truth)
const configPath = path.join(DATA_DIR, 'config.json');

// Default configuration for when config.json doesn't exist yet
const defaultConfig = {
  environment: {
    frontend: {
      port: 3000,
      apiUrl: "http://localhost:3001"
    },
    backend: {
      port: 3001,
      allowedOrigins: ["http://localhost:3000"]
    },
    security: {
      allowedHosts: ["localhost:3000"],
      rateLimitWindowMs: 1000,
      rateLimitMaxRequests: 30
    },
    auth: {
      google: {
        clientId: "",
        clientSecret: ""
      },
      sessionSecret: "temporary-session-secret-for-setup",
      authorizedEmails: []
    }
  },
  branding: {
    siteName: "Photography Portfolio",
    avatarPath: "/photos/avatar.png",
    primaryColor: "#4ade80",
    secondaryColor: "#22c55e",
    metaDescription: "Photography portfolio",
    metaKeywords: "photography, portfolio",
    faviconPath: "/favicon.ico"
  },
  analytics: {
    scriptPath: "",
    openobserve: {
      enabled: false,
      endpoint: "",
      organization: "",
      stream: "website",
      username: "",
      password: ""
    }
  },
  externalLinks: []
};

// Configuration state that can be reloaded
let fullConfig: any;
let configExists = false;

// Function to load/reload configuration
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      configExists = true;
      console.log(`✓ Loaded configuration from config.json`);
      return true;
    } else {
      console.log(`⚠️  config.json not found - using defaults for setup mode`);
      fullConfig = defaultConfig;
      configExists = false;
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to load config.json, using defaults:`, error);
    fullConfig = defaultConfig;
    configExists = false;
    return false;
  }
}

// Load config on startup
loadConfig();

// Export hardcoded data directory paths (no longer configurable)
export const PHOTOS_DIR = path.join(DATA_DIR, 'photos');
export const OPTIMIZED_DIR = path.join(DATA_DIR, 'optimized');
export const DB_PATH = path.join(DATA_DIR, 'gallery.db');

// Export dynamic getters for config values that can change
export function getAllowedOrigins(): string[] {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map((o: string) => o.trim());
  }
  return fullConfig.environment.backend.allowedOrigins;
}

// Export constants
export const PORT = process.env.PORT ? parseInt(process.env.PORT) : fullConfig.environment.backend.port;
export const RATE_LIMIT_WINDOW_MS = fullConfig.environment.security.rateLimitWindowMs;
export const RATE_LIMIT_MAX_REQUESTS = fullConfig.environment.security.rateLimitMaxRequests;
export const ALLOWED_ORIGINS = getAllowedOrigins();

// Export flag indicating if config exists
export const CONFIG_EXISTS = configExists;

// Export function to reload configuration (called after setup wizard completes)
export function reloadConfig() {
  console.log('🔄 Reloading configuration...');
  const success = loadConfig();
  if (success) {
    console.log('✅ Configuration reloaded successfully');
  }
  return { success, configExists };
}

// Export function to get current config (always fresh)
export function getCurrentConfig() {
  return {
    ...fullConfig.environment,
    analytics: fullConfig.analytics,
    branding: fullConfig.branding,
    externalLinks: fullConfig.externalLinks,
    email: fullConfig.email,
    frontend: fullConfig.environment.frontend,
    configExists
  };
}

// Export the full config for routes that need it (analytics, sitemap, etc)
export default {
  ...fullConfig.environment,
  analytics: fullConfig.analytics,
  branding: fullConfig.branding,
  externalLinks: fullConfig.externalLinks,
  email: fullConfig.email,
  frontend: fullConfig.environment.frontend
};

