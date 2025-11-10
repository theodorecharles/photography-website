#!/usr/bin/env node

/**
 * Migration script to add sort_order column to image_metadata table
 * This enables custom ordering of images within albums
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'gallery.db');

console.log('Starting database migration: Adding sort_order column');
console.log(`Database path: ${DB_PATH}`);

// Open database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

try {
  // Check if sort_order column already exists
  const tableInfo = db.prepare("PRAGMA table_info(image_metadata)").all();
  const hasSortOrder = tableInfo.some(col => col.name === 'sort_order');
  
  if (hasSortOrder) {
    console.log('✓ sort_order column already exists, skipping migration');
    db.close();
    process.exit(0);
  }
  
  console.log('Adding sort_order column to image_metadata table...');
  
  // Add sort_order column (defaults to NULL, which means use default ordering)
  db.exec(`
    ALTER TABLE image_metadata 
    ADD COLUMN sort_order INTEGER
  `);
  
  console.log('✓ sort_order column added successfully');
  
  // Create index for faster ordering queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_album_sort_order 
    ON image_metadata(album, sort_order)
  `);
  
  console.log('✓ Index created for sort_order');
  console.log('✓ Migration completed successfully!');
  
} catch (error) {
  console.error('✗ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

