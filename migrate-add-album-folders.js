#!/usr/bin/env node

/**
 * Database Migration Script - Add Album Folders
 * Adds album_folders table and folder_id to albums table
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'gallery.db');

console.log('Starting album folders migration...');

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Error: gallery.db not found. Please run migrate-database.js first.');
  process.exit(1);
}

// Open database
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

try {
  // Step 1: Create album_folders table if it doesn't exist
  console.log('✓ Creating album_folders table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS album_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      published BOOLEAN NOT NULL DEFAULT 0,
      sort_order INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✓ album_folders table created');

  // Step 2: Check if folder_id column exists in albums table
  const tableInfo = db.pragma('table_info(albums)');
  const hasFolderId = tableInfo.some((col) => col.name === 'folder_id');

  if (!hasFolderId) {
    console.log('✓ Adding folder_id column to albums table...');
    db.exec(`ALTER TABLE albums ADD COLUMN folder_id INTEGER REFERENCES album_folders(id) ON DELETE SET NULL`);
    console.log('✓ folder_id column added to albums table');
  } else {
    console.log('✓ folder_id column already exists in albums table');
  }

  // Step 3: Create index for faster folder lookups
  console.log('✓ Creating index on folder_id...');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_albums_folder_id 
    ON albums(folder_id)
  `);
  console.log('✓ Index created');

  console.log('✓ Album folders migration completed successfully!');
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

