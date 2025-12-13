#!/usr/bin/env node

/**
 * Migration: Change album default states
 * 
 * Changes:
 * - Updates show_on_homepage default from 1 to 0
 * - Ensures new albums are created unpublished by default
 * - Optionally resets existing albums to unpublished/not-on-homepage
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const Database = require('better-sqlite3');

// Determine database path
// __dirname is scripts/, so we need to go up one level to project root
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '../data');
const DB_PATH = join(DATA_DIR, 'gallery.db');

function runMigration() {
  console.log('Starting album defaults migration...');
  
  const db = new Database(DB_PATH);
  
  // Enable WAL mode
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  
  try {
    // Check if migration is needed by looking at table schema
    const tableInfo = db.prepare("PRAGMA table_info(albums)").all();
    const showOnHomepageColumn = tableInfo.find(col => col.name === 'show_on_homepage');

    if (!showOnHomepageColumn) {
      console.log('⚠️  show_on_homepage column does not exist. Skipping migration.');
      db.close();
      return;
    }

    // Check if migration has already been applied by checking the default value
    // If default is already '0', the migration has been applied
    if (showOnHomepageColumn.dflt_value === '0') {
      console.log('✓ Migration already applied (show_on_homepage default is already 0). Skipping.');
      db.close();
      return;
    }

    // Check if folder_id and sort_order columns exist (they might have been added already)
    const hasFolderId = tableInfo.find(col => col.name === 'folder_id');
    const hasSortOrder = tableInfo.find(col => col.name === 'sort_order');

    // SQLite doesn't allow ALTER TABLE to change default values directly
    // We need to recreate the table with new defaults

    console.log('Creating new albums table with updated defaults...');
    console.log(`  Preserving folder_id: ${hasFolderId ? 'yes' : 'no'}`);
    console.log(`  Preserving sort_order: ${hasSortOrder ? 'yes' : 'no'}`);

    // Build column lists dynamically to preserve all existing columns
    const newTableColumns = `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        published BOOLEAN NOT NULL DEFAULT 0,
        show_on_homepage BOOLEAN NOT NULL DEFAULT 0,
        ${hasSortOrder ? 'sort_order INTEGER,' : ''}
        ${hasFolderId ? 'folder_id INTEGER REFERENCES album_folders(id) ON DELETE SET NULL,' : ''}
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    `;

    const copyColumns = `id, name, published, show_on_homepage${hasSortOrder ? ', sort_order' : ''}${hasFolderId ? ', folder_id' : ''}, created_at, updated_at`;

    db.exec(`
      -- Create new table with correct defaults
      CREATE TABLE IF NOT EXISTS albums_new (
        ${newTableColumns}
      );

      -- Copy existing data (preserving all columns including folder_id and sort_order if they exist)
      INSERT INTO albums_new (${copyColumns})
      SELECT ${copyColumns}
      FROM albums;

      -- Drop old table
      DROP TABLE albums;

      -- Rename new table
      ALTER TABLE albums_new RENAME TO albums;
    `);

    console.log('✓ Table recreated with new defaults (all existing columns preserved)');
    
    // Optional: Ask if we should reset existing albums (for now, we'll just log the state)
    const albumCount = db.prepare('SELECT COUNT(*) as count FROM albums').get().count;
    const publishedCount = db.prepare('SELECT COUNT(*) as count FROM albums WHERE published = 1').get().count;
    const homepageCount = db.prepare('SELECT COUNT(*) as count FROM albums WHERE show_on_homepage = 1').get().count;
    
    console.log('\nCurrent album states:');
    console.log(`  Total albums: ${albumCount}`);
    console.log(`  Published: ${publishedCount}`);
    console.log(`  Shown on homepage: ${homepageCount}`);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('ℹ️  New albums will now default to unpublished and not shown on homepage.');
    console.log('ℹ️  Existing albums were left unchanged. You can modify them via the admin interface.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run migration
runMigration();

