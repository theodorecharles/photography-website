#!/usr/bin/env node

/**
 * Migration Script: Remove HMAC Secret from config.json
 * 
 * This script removes the deprecated hmacSecret field from the analytics section
 * of the configuration file.
 * 
 * Usage: node migrate-remove-hmac.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, 'config', 'config.json');

// Function to migrate config
function migrateConfig() {
  console.log('Starting migration: Remove HMAC Secret from config.json\n');

  // Check if config file exists
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`❌ Error: Config file not found at ${CONFIG_PATH}`);
    console.log('Please ensure config/config.json exists before running this migration.');
    process.exit(1);
  }

  // Read current config
  let config;
  try {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
    config = JSON.parse(configData);
    console.log('✅ Successfully read config.json');
  } catch (err) {
    console.error('❌ Error reading config.json:', err.message);
    process.exit(1);
  }

  // Check if analytics.hmacSecret exists
  if (!config.analytics || !config.analytics.hmacSecret) {
    console.log('ℹ️  No hmacSecret found in analytics config - nothing to migrate');
    process.exit(0);
  }

  // Create backup
  const backupPath = `${CONFIG_PATH}.backup-${Date.now()}`;
  try {
    fs.copyFileSync(CONFIG_PATH, backupPath);
    console.log(`✅ Created backup at ${backupPath}`);
  } catch (err) {
    console.error('❌ Error creating backup:', err.message);
    process.exit(1);
  }

  // Remove hmacSecret
  const hadHmacSecret = config.analytics.hmacSecret !== undefined;
  delete config.analytics.hmacSecret;

  if (hadHmacSecret) {
    console.log('✅ Removed hmacSecret from analytics configuration');
  }

  // Write updated config
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8');
    console.log('✅ Successfully updated config.json');
  } catch (err) {
    console.error('❌ Error writing config.json:', err.message);
    console.log(`Restoring from backup: ${backupPath}`);
    try {
      fs.copyFileSync(backupPath, CONFIG_PATH);
      console.log('✅ Successfully restored from backup');
    } catch (restoreErr) {
      console.error('❌ Error restoring backup:', restoreErr.message);
    }
    process.exit(1);
  }

  console.log('\n✅ Migration completed successfully!');
  console.log(`Backup saved at: ${backupPath}`);
}

// Run migration
migrateConfig();
