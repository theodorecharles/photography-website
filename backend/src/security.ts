/**
 * Security utilities and configuration management
 * Handles sensitive data and security-related functions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load configuration with environment variable overrides for sensitive data
 */
export function loadSecureConfig() {
  const configPath = path.join(__dirname, '../../config/config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  const env = process.env.NODE_ENV || 'development';
  const envConfig = config[env];
  
  // Override sensitive data with environment variables if available
  if (process.env.GOOGLE_CLIENT_SECRET) {
    envConfig.auth.google.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  }
  
  if (process.env.SESSION_SECRET) {
    envConfig.auth.sessionSecret = process.env.SESSION_SECRET;
  }
  
  if (process.env.ANALYTICS_PASSWORD) {
    envConfig.analytics.openobserve.password = process.env.ANALYTICS_PASSWORD;
  }
  
  if (process.env.ANALYTICS_HMAC_SECRET) {
    envConfig.analytics.hmacSecret = process.env.ANALYTICS_HMAC_SECRET;
  }
  
  return envConfig;
}

/**
 * Validate that required security configuration is present in production
 */
export function validateProductionSecurity() {
  if (process.env.NODE_ENV === 'production') {
    // Load the config to check if required values are present
    const config = loadSecureConfig();
    
    const requiredChecks = [
      { name: 'GOOGLE_CLIENT_SECRET', value: config.auth?.google?.clientSecret },
      { name: 'SESSION_SECRET', value: config.auth?.sessionSecret },
      { name: 'ANALYTICS_PASSWORD', value: config.analytics?.openobserve?.password },
      { name: 'ANALYTICS_HMAC_SECRET', value: config.analytics?.hmacSecret }
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
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? ['https://tedcharles.net', 'https://www.tedcharles.net']
    : ['http://localhost:5173', 'http://localhost:3000'];
  
  if (origin) {
    const isAllowedOrigin = allowedOrigins.some(allowed => origin.startsWith(allowed));
    if (!isAllowedOrigin) {
      return res.status(403).json({ error: 'Request origin not allowed' });
    }
  }
  
  next();
}