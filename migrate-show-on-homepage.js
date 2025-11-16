#!/usr/bin/env node

/**
 * Database Migration: Add show_on_homepage column to albums table
 * 
 * This migration adds a new boolean column to control which published albums
 * appear on the homepage. By default, all published albums will be shown.
 * 
 * Usage: node migrate-show-on-homepage.js
 */

import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use DATA_DIR environment variable or default to ./data
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'gallery.db');

console.log('🔄 Starting migration: Add show_on_homepage column to albums table');
console.log(`   Database: ${DB_PATH}`);

try {
  const db = new Database(DB_PATH);
  
  // Set pragmas for safe operation
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  
  // Check if column already exists
  const tableInfo = db.pragma('table_info(albums)');
  const hasColumn = tableInfo.some(col => col.name === 'show_on_homepage');
  
  if (hasColumn) {
    console.log('✅ Column show_on_homepage already exists in albums table');
    console.log('   No migration needed');
    db.close();
    process.exit(0);
  }
  
  console.log('➕ Adding show_on_homepage column to albums table...');
  
  // Add column with default value of 1 (true)
  // This ensures all published albums are shown on homepage by default
  db.exec('ALTER TABLE albums ADD COLUMN show_on_homepage BOOLEAN NOT NULL DEFAULT 1');
  
  console.log('✅ Successfully added show_on_homepage column');
  console.log('   Default value: true (all published albums will appear on homepage)');
  
  // Verify the column was added
  const updatedTableInfo = db.pragma('table_info(albums)');
  const columnExists = updatedTableInfo.some(col => col.name === 'show_on_homepage');
  
  if (!columnExists) {
    throw new Error('Migration failed: Column was not added successfully');
  }
  
  // Log current state
  const albumCount = db.prepare('SELECT COUNT(*) as count FROM albums').get().count;
  const publishedCount = db.prepare('SELECT COUNT(*) as count FROM albums WHERE published = 1').get().count;
  const homepageCount = db.prepare('SELECT COUNT(*) as count FROM albums WHERE show_on_homepage = 1').get().count;
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`   Total albums: ${albumCount}`);
  console.log(`   Published albums: ${publishedCount}`);
  console.log(`   Albums on homepage: ${homepageCount}`);
  
  db.close();
  
  console.log('\n✨ Migration completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
