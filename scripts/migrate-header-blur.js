#!/usr/bin/env node

/**
 * Migration script to convert headerBlur from boolean to number
 *
 * In earlier versions, headerBlur was a boolean (true/false for on/off).
 * It's now a number (0-20) representing blur amount in pixels.
 *
 * Usage: node scripts/migrate-header-blur.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine config path
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const configPath = path.join(dataDir, 'config.json');

console.log(`[Migration] Checking config at: ${configPath}`);

if (!fs.existsSync(configPath)) {
  console.log('[Migration] Config file not found, nothing to migrate');
  process.exit(0);
}

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  if (!config.branding) {
    console.log('[Migration] No branding section found, nothing to migrate');
    process.exit(0);
  }

  const currentValue = config.branding.headerBlur;

  if (typeof currentValue === 'boolean') {
    const newValue = currentValue ? 10 : 0;
    console.log(`[Migration] Converting headerBlur from boolean (${currentValue}) to number (${newValue})`);
    config.branding.headerBlur = newValue;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('[Migration] Successfully migrated headerBlur');
  } else if (typeof currentValue === 'number') {
    console.log(`[Migration] headerBlur is already a number (${currentValue}), no migration needed`);
  } else if (currentValue === undefined) {
    console.log('[Migration] headerBlur not set, will use default (0)');
  } else {
    console.log(`[Migration] Unexpected headerBlur type: ${typeof currentValue}, setting to 0`);
    config.branding.headerBlur = 0;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('[Migration] Set headerBlur to 0');
  }

  process.exit(0);
} catch (err) {
  console.error('[Migration] Error:', err.message);
  process.exit(1);
}
