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
const configPath = path.join(__dirname, 'data', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Set ALL environment variables from config.json
const frontendConfig = config.environment.frontend;

// Derive site URL from API URL
// If apiUrl includes localhost, change port from 3001 to 3000
// Otherwise, replace api. or api- with www. or www-
const apiUrl = frontendConfig.apiUrl;
const siteUrl = apiUrl.includes('localhost')
  ? apiUrl.replace(':3001', ':3000')
  : apiUrl.replace(/api(-dev)?\./, 'www$1.');

process.env.VITE_API_URL = frontendConfig.apiUrl;
process.env.VITE_SITE_URL = siteUrl;
process.env.VITE_SITE_NAME = config.branding.siteName;
process.env.VITE_ANALYTICS_ENABLED = String(config.analytics?.openobserve?.enabled || false);

// Additional values for HTML meta tags
process.env.VITE_SITE_URL_FULL = siteUrl;
process.env.VITE_API_URL_FULL = frontendConfig.apiUrl;
process.env.VITE_AVATAR_PATH = config.branding.avatarPath;
process.env.SITE_URL = siteUrl; // For backend sitemap generation

console.log('Environment variables set from config.json:');
console.log(`  VITE_API_URL=${process.env.VITE_API_URL}`);
console.log(`  VITE_SITE_URL=${process.env.VITE_SITE_URL}`);
console.log(`  VITE_SITE_NAME=${process.env.VITE_SITE_NAME}`);
console.log(`  VITE_ANALYTICS_ENABLED=${process.env.VITE_ANALYTICS_ENABLED}`);

// Generate static JSON files for albums (requires backend database)
console.log('\nGenerating static JSON files...');
try {
  execSync('node scripts/generate-static-json.js', {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('✓ Static JSON files generated');
} catch (error) {
  console.warn('⚠ Warning: Static JSON generation failed (this is okay if database is not available yet)');
  console.warn('  You can generate them later with: npm run generate-static-json');
}

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

// Replace placeholders in the built HTML file
console.log('\\nReplacing placeholders in HTML...');
const htmlPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
if (fs.existsSync(htmlPath)) {
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  // Replace placeholders with actual values
  htmlContent = htmlContent.replace(/%VITE_SITE_URL_FULL%/g, siteUrl);
  htmlContent = htmlContent.replace(/%VITE_API_URL_FULL%/g, frontendConfig.apiUrl);
  htmlContent = htmlContent.replace(/%VITE_SITE_NAME%/g, config.branding.siteName);
  htmlContent = htmlContent.replace(/%VITE_AVATAR_PATH%/g, config.branding.avatarPath);
  
  fs.writeFileSync(htmlPath, htmlContent);
  console.log('✓ HTML placeholders replaced');
} else {
  console.warn('⚠ HTML file not found, skipping placeholder replacement');
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

