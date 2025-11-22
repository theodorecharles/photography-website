#!/usr/bin/env node
/**
 * Split translations into frontend and backend
 * 
 * Backend-only keys:
 * - notifications.backend.* (push notification messages)
 * - email.* (email templates)
 * 
 * Everything else stays in frontend
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendLocalesDir = path.join(__dirname, '../frontend/src/i18n/locales');
const backendLocalesDir = path.join(__dirname, '../backend/src/i18n/locales');

// Ensure backend directory exists
if (!fs.existsSync(backendLocalesDir)) {
  fs.mkdirSync(backendLocalesDir, { recursive: true });
}

const locales = fs.readdirSync(frontendLocalesDir).filter(f => f.endsWith('.json'));

console.log('🔀 Splitting translations into frontend and backend...\n');

locales.forEach(locale => {
  const frontendPath = path.join(frontendLocalesDir, locale);
  const backendPath = path.join(backendLocalesDir, locale);
  
  const data = JSON.parse(fs.readFileSync(frontendPath, 'utf8'));
  
  // Create backend-only data
  const backendData = {
    notifications: {
      backend: data.notifications?.backend || {}
    },
    email: data.email || {}
  };
  
  // Create frontend data (remove backend-only keys)
  const frontendData = { ...data };
  if (frontendData.notifications?.backend) {
    delete frontendData.notifications.backend;
  }
  if (frontendData.email) {
    delete frontendData.email;
  }
  
  // Calculate sizes
  const originalSize = JSON.stringify(data).length;
  const frontendSize = JSON.stringify(frontendData).length;
  const backendSize = JSON.stringify(backendData).length;
  const savings = originalSize - frontendSize;
  const savingsPercent = ((savings / originalSize) * 100).toFixed(1);
  
  // Write files
  fs.writeFileSync(frontendPath, JSON.stringify(frontendData, null, 2) + '\n');
  fs.writeFileSync(backendPath, JSON.stringify(backendData, null, 2) + '\n');
  
  console.log(`✅ ${locale}`);
  console.log(`   Frontend: ${(frontendSize / 1024).toFixed(1)}KB (${savingsPercent}% smaller)`);
  console.log(`   Backend:  ${(backendSize / 1024).toFixed(1)}KB`);
});

console.log('\n✨ Translation split complete!');
console.log('📦 Frontend bundles will be significantly smaller');
console.log('🔒 Backend translations stay server-side only');
