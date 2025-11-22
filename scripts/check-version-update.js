#!/usr/bin/env node
/**
 * Version Update Checker
 * Checks if Galleria has been updated to a new version and sends notifications
 * 
 * This script should be run after deployment (e.g., in restart.sh)
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root
const projectRoot = path.resolve(__dirname, '..');

// Read current version from package.json
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// Version tracking file
const versionFilePath = path.join(projectRoot, 'data', '.last-version');

// Check if this is a new version
let isNewVersion = false;
let previousVersion = null;

if (fs.existsSync(versionFilePath)) {
  previousVersion = fs.readFileSync(versionFilePath, 'utf8').trim();
  isNewVersion = previousVersion !== currentVersion;
} else {
  // First run, just record the version
  isNewVersion = false;
}

// Write current version
fs.writeFileSync(versionFilePath, currentVersion, 'utf8');

if (isNewVersion && previousVersion) {
  console.log(`[VersionCheck] ✨ Version updated: ${previousVersion} → ${currentVersion}`);
  
  // Send notification to all admins
  try {
      // Dynamic import TypeScript files via tsx
      const { getAllUsers } = await import('../backend/src/database-users.ts');
      const { sendNotificationToUser } = await import('../backend/src/push-notifications.ts');
      const { translateNotificationForUser } = await import('../backend/src/i18n-backend.ts');
    
    const admins = getAllUsers().filter(u => u.role === 'admin');
    
    for (const admin of admins) {
      const title = await translateNotificationForUser(admin.id, 'notifications.backend.versionUpdateTitle', { version: currentVersion });
      const body = await translateNotificationForUser(admin.id, 'notifications.backend.versionUpdateBody', { version: currentVersion });
      
      await sendNotificationToUser(admin.id, {
        title,
        body,
        tag: 'version-update',
        requireInteraction: true
      }, 'versionUpdate');
      
      console.log(`[VersionCheck] Sent update notification to ${admin.email}`);
    }
  } catch (err) {
    console.error('[VersionCheck] Failed to send notifications:', err);
  }
} else if (!previousVersion) {
  console.log(`[VersionCheck] First run, current version: ${currentVersion}`);
} else {
  console.log(`[VersionCheck] No version change (${currentVersion})`);
}
