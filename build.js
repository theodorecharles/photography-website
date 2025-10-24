#!/usr/bin/env node
/**
 * Build script that reads config.json and builds both frontend and backend
 * Injects safe config values into frontend via environment variables
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read config.json
const configPath = path.join(__dirname, 'config', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Determine environment
const env = process.env.NODE_ENV || 'production';
console.log(`Building for ${env} environment...`);

// Set ALL environment variables from config.json
const frontendConfig = config[env].frontend;

// For production: derive site URL from API URL (remove "api." subdomain)
// For development: derive from API URL (change port from 3001 to 3000)
const siteUrl = env === 'production' 
  ? frontendConfig.apiUrl.replace('api.', '') 
  : frontendConfig.apiUrl.replace(':3001', ':3000');

process.env.VITE_API_URL = frontendConfig.apiUrl;
process.env.VITE_SITE_URL = siteUrl;
process.env.VITE_SITE_NAME = config.branding.siteName;
process.env.VITE_ANALYTICS_ENABLED = String(config.analytics?.openobserve?.enabled || false);
process.env.SITE_URL = siteUrl; // For backend sitemap generation

console.log('Environment variables set from config.json:');
console.log(`  VITE_API_URL=${process.env.VITE_API_URL}`);
console.log(`  VITE_SITE_URL=${process.env.VITE_SITE_URL}`);
console.log(`  VITE_SITE_NAME=${process.env.VITE_SITE_NAME}`);
console.log(`  VITE_ANALYTICS_ENABLED=${process.env.VITE_ANALYTICS_ENABLED}`);

// Update robots.txt with correct sitemap URL from config.json
console.log('\nUpdating robots.txt with sitemap URL from config.json...');
const robotsTxtPath = path.join(__dirname, 'frontend', 'public', 'robots.txt');
const robotsTxt = `User-agent: *
Disallow: /primes/

Sitemap: ${siteUrl}/sitemap.xml
`;
fs.writeFileSync(robotsTxtPath, robotsTxt);
console.log(`✓ Updated robots.txt with sitemap: ${siteUrl}/sitemap.xml`);

// Build frontend
console.log('\nBuilding frontend...');
try {
  execSync('npm run build', { 
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('✓ Frontend built successfully');
} catch (error) {
  console.error('✗ Frontend build failed');
  process.exit(1);
}

// Build backend (just compile TypeScript)
console.log('\nCompiling backend...');
try {
  execSync('npm run build', { 
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit'
  });
  console.log('✓ Backend compiled successfully');
} catch (error) {
  console.error('✗ Backend build failed');
  process.exit(1);
}

console.log('\n✓ Build complete!');

