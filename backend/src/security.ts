/**
 * Security utilities and configuration management
 * Handles sensitive data and security-related functions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load configuration with environment variable overrides for sensitive data
 */
export function loadSecureConfig() {
  // Use DATA_DIR from environment or default to project_root/data
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
  const configPath = path.join(dataDir, 'config.json');
  const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  const envConfig = rawConfig.environment;
  
  // Merge root-level config (analytics, branding, etc.) with environment config
  const fullConfig = {
    ...envConfig,
    analytics: rawConfig.analytics,
    branding: rawConfig.branding,
    externalLinks: rawConfig.externalLinks
  };
  
  // Override sensitive data with environment variables if available
  if (process.env.GOOGLE_CLIENT_SECRET) {
    fullConfig.auth.google.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  }
  
  if (process.env.SESSION_SECRET) {
    fullConfig.auth.sessionSecret = process.env.SESSION_SECRET;
  }
  
  if (process.env.ANALYTICS_USERNAME) {
    fullConfig.analytics.openobserve.username = process.env.ANALYTICS_USERNAME;
  }
  
  if (process.env.ANALYTICS_PASSWORD) {
    fullConfig.analytics.openobserve.password = process.env.ANALYTICS_PASSWORD;
  }
  
  if (process.env.ANALYTICS_SERVICE_TOKEN) {
    fullConfig.analytics.openobserve.serviceToken = process.env.ANALYTICS_SERVICE_TOKEN;
  }
  
  return fullConfig;
}

/**
 * Validate that required security configuration is present in production
 */
export function validateProductionSecurity() {
  const secureConfig = loadSecureConfig();
  const isProduction = secureConfig.frontend?.apiUrl?.startsWith('https://');
  
  if (isProduction) {
    // Load the config to check if required values are present
    const requiredChecks = [
      { name: 'GOOGLE_CLIENT_SECRET', value: secureConfig.auth?.google?.clientSecret },
      { name: 'SESSION_SECRET', value: secureConfig.auth?.sessionSecret },
      { name: 'ANALYTICS_USERNAME', value: secureConfig.analytics?.openobserve?.username },
      { name: 'ANALYTICS_PASSWORD', value: secureConfig.analytics?.openobserve?.password }
    ];
    
    const missing = requiredChecks.filter(check => !check.value);
    
    if (missing.length > 0) {
      console.error('❌ SECURITY ERROR: Missing required security configuration in production:');
      missing.forEach(check => console.error(`  - ${check.name}`));
      console.error('\nPlease ensure these values are properly configured in config.json.');
      process.exit(1);
    }
  }
}

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes that could break JSON
    .trim()
    .substring(0, 1000); // Limit length
}

/**
 * Validate file upload security
 */
export function validateFileUpload(file: Express.Multer.File): { valid: boolean; error?: string } {
  // Check file size (50MB max)
  if (file.size > 50 * 1024 * 1024) {
    return { valid: false, error: 'File too large (max 50MB)' };
  }
  
  // Check MIME type
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return { valid: false, error: 'Invalid file type' };
  }
  
  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return { valid: false, error: 'Invalid file extension' };
  }
  
  // Check for suspicious filenames
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    return { valid: false, error: 'Invalid filename' };
  }
  
  return { valid: true };
}

/**
 * Simple CSRF protection middleware
 * For state-changing operations, require a valid session
 */
export function csrfProtection(req: any, res: any, next: any) {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // For POST/PUT/DELETE, require authentication
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required for this operation' });
  }
  
  // Additional check: ensure the request comes from the same origin
  const origin = req.get('Origin') || req.get('Referer');
  const allowedOrigins = config.backend.allowedOrigins;
  
  if (origin) {
    const isAllowedOrigin = allowedOrigins.some((allowed: string) => origin.startsWith(allowed));
    if (!isAllowedOrigin) {
      return res.status(403).json({ error: 'Request origin not allowed' });
    }
  }
  
  next();
}