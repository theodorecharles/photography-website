/**
 * Frontend config - ALL values are injected from config.json via build process
 * NO hardcoded values - everything comes from config/config.json
 */

// These MUST be set by the build process from config.json
// If they're undefined, the build is misconfigured
export const API_URL = import.meta.env.VITE_API_URL;
export const SITE_URL = import.meta.env.VITE_SITE_URL;
export const SITE_NAME = import.meta.env.VITE_SITE_NAME;
export const ANALYTICS_ENABLED = import.meta.env.VITE_ANALYTICS_ENABLED === 'true';
export const cacheBustValue = 0;

// Additional values for HTML meta tags
export const SITE_URL_FULL = import.meta.env.VITE_SITE_URL_FULL;
export const API_URL_FULL = import.meta.env.VITE_API_URL_FULL;
export const AVATAR_PATH = import.meta.env.VITE_AVATAR_PATH;

// Validate that required config is present
if (!API_URL || !SITE_URL || !SITE_NAME) {
  throw new Error('Missing required configuration. Run: npm run build');
} 