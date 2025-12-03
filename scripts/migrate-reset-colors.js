#!/usr/bin/env node

/**
 * Migration: Reset branding colors to defaults
 *
 * Changes:
 * - Resets primaryColor to default (#4ade80)
 * - Resets secondaryColor to default (#22c55e)
 *
 * This migration removes any custom color configurations set during
 * the OOBE or through the admin portal, returning them to defaults.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default colors
const DEFAULT_PRIMARY_COLOR = '#4ade80';
const DEFAULT_SECONDARY_COLOR = '#22c55e';

// Determine config path
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '../data');
const CONFIG_PATH = join(DATA_DIR, 'config.json');

function runMigration() {
  console.log('Starting color reset migration...');
  console.log(`Config path: ${CONFIG_PATH}`);

  // Check if config file exists
  if (!existsSync(CONFIG_PATH)) {
    console.log('⚠️  Config file does not exist. Nothing to migrate.');
    console.log('ℹ️  New installations will use default colors automatically.');
    return;
  }

  try {
    // Read current config
    const configContent = readFileSync(CONFIG_PATH, 'utf8');
    const config = JSON.parse(configContent);

    // Track what we're changing
    const oldPrimaryColor = config.branding?.primaryColor;
    const oldSecondaryColor = config.branding?.secondaryColor;

    console.log('\nCurrent colors:');
    console.log(`  Primary:   ${oldPrimaryColor || '(not set)'}`);
    console.log(`  Secondary: ${oldSecondaryColor || '(not set)'}`);

    // Check if migration is needed
    const needsMigration =
      oldPrimaryColor !== DEFAULT_PRIMARY_COLOR ||
      oldSecondaryColor !== DEFAULT_SECONDARY_COLOR;

    if (!needsMigration) {
      console.log('\n✓ Colors are already at default values. No migration needed.');
      return;
    }

    // Ensure branding object exists
    if (!config.branding) {
      config.branding = {};
    }

    // Reset colors to defaults
    config.branding.primaryColor = DEFAULT_PRIMARY_COLOR;
    config.branding.secondaryColor = DEFAULT_SECONDARY_COLOR;

    // Write updated config
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');

    console.log('\nNew colors:');
    console.log(`  Primary:   ${DEFAULT_PRIMARY_COLOR}`);
    console.log(`  Secondary: ${DEFAULT_SECONDARY_COLOR}`);

    console.log('\n✅ Migration completed successfully!');
    console.log('ℹ️  Colors have been reset to default values.');
    console.log('ℹ️  You may need to restart the server for changes to take effect.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
runMigration();
