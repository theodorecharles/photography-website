#!/usr/bin/env node

/**
 * Automatic Migration Runner
 *
 * Discovers and runs all migration scripts in the scripts/ directory.
 * Migration scripts must follow the naming pattern: migrate-*.js
 *
 * Exit codes:
 *   0 - All migrations succeeded
 *   1 - One or more migrations failed
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine data directory and check if database exists
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'data');
const DB_PATH = join(DATA_DIR, 'gallery.db');

if (!existsSync(DB_PATH)) {
  console.log('[Migrations] Database does not exist yet, skipping migrations');
  process.exit(0);
}

console.log('[Migrations] Discovering migration scripts...');

// Find all migration scripts
const scriptsDir = __dirname;
const files = readdirSync(scriptsDir);
const migrationScripts = files
  .filter(file => file.startsWith('migrate-') && file.endsWith('.js'))
  .sort(); // Sort alphabetically for consistent execution order

if (migrationScripts.length === 0) {
  console.log('[Migrations] No migration scripts found');
  process.exit(0);
}

console.log(`[Migrations] Found ${migrationScripts.length} migration scripts`);

let failedMigrations = [];
let successfulMigrations = [];

// Run each migration
for (const script of migrationScripts) {
  const scriptPath = join(scriptsDir, script);
  const scriptName = script.replace('migrate-', '').replace('.js', '');

  console.log(`[Migrations] Running: ${script}...`);

  const result = spawnSync('node', [scriptPath], {
    stdio: 'inherit',
    env: { ...process.env }
  });

  if (result.status === 0) {
    console.log(`[Migrations] ✓ ${scriptName} completed successfully`);
    successfulMigrations.push(script);
  } else {
    console.error(`[Migrations] ✗ ${scriptName} failed with exit code ${result.status}`);
    failedMigrations.push(script);
  }
}

// Summary
console.log('\n[Migrations] Summary:');
console.log(`  Successful: ${successfulMigrations.length}`);
console.log(`  Failed: ${failedMigrations.length}`);

if (failedMigrations.length > 0) {
  console.error('[Migrations] Failed migrations:', failedMigrations.join(', '));
  process.exit(1);
}

console.log('[Migrations] All migrations completed successfully');
process.exit(0);
