#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const DB_PATH = path.join(__dirname, 'gallery.db');

console.log('Starting folder sort_order migration...');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Error: gallery.db not found.');
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

try {
  // Check if sort_order column already exists
  const tableInfo = db.pragma('table_info(album_folders)');
  const hasSortOrder = tableInfo.some((col) => col.name === 'sort_order');
  
  if (!hasSortOrder) {
    console.log('✓ Adding sort_order column to album_folders table...');
    db.exec(`ALTER TABLE album_folders ADD COLUMN sort_order INTEGER`);
    
    // Set initial sort_order values based on id
    console.log('✓ Setting initial sort_order values...');
    db.exec(`
      UPDATE album_folders 
      SET sort_order = id 
      WHERE sort_order IS NULL
    `);
    
    console.log('✓ Migration completed successfully!');
  } else {
    console.log('✓ sort_order column already exists, skipping migration');
  }
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

