#!/usr/bin/env node

/**
 * Migration: Add ON UPDATE CASCADE to share_links foreign key
 * 
 * Changes:
 * - Recreates share_links table with foreign key ON UPDATE CASCADE
 * - Allows album renames to automatically update share link references
 * - Preserves all existing share link data
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const Database = require('better-sqlite3');

// Determine DB path (same logic as backend/src/config.ts)
// __dirname is scripts/, so we need to go up one level to project root
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '../data');
const DB_PATH = join(DATA_DIR, 'gallery.db');

function runMigration() {
  console.log('Starting share_links foreign key migration...');
  
  const db = new Database(DB_PATH);
  
  // Enable WAL mode and foreign keys
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  
  try {
    // Check if share_links table exists
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='share_links'"
    ).get();
    
    if (!tableExists) {
      console.log('⚠️  share_links table does not exist. Skipping migration.');
      db.close();
      return;
    }
    
    // Check if the table already has the correct constraint by checking the SQL
    const tableSql = db.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='share_links'"
    ).get();
    
    if (tableSql && tableSql.sql.includes('ON UPDATE CASCADE')) {
      console.log('✓ share_links table already has ON UPDATE CASCADE. Migration not needed.');
      db.close();
      return;
    }
    
    console.log('Recreating share_links table with ON UPDATE CASCADE...');
    
    // SQLite doesn't allow modifying foreign keys directly
    // We need to recreate the table
    db.exec(`
      -- Disable foreign keys temporarily for table recreation
      PRAGMA foreign_keys = OFF;
      
      -- Create new table with correct foreign key constraint
      CREATE TABLE IF NOT EXISTS share_links_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        album TEXT NOT NULL,
        secret_key TEXT NOT NULL UNIQUE,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (album) REFERENCES albums(name) ON DELETE CASCADE ON UPDATE CASCADE
      );
      
      -- Copy existing data
      INSERT INTO share_links_new (id, album, secret_key, expires_at, created_at)
      SELECT id, album, secret_key, expires_at, created_at
      FROM share_links;
      
      -- Drop old table
      DROP TABLE share_links;
      
      -- Rename new table
      ALTER TABLE share_links_new RENAME TO share_links;
      
      -- Recreate indexes
      CREATE INDEX IF NOT EXISTS idx_share_links_secret 
      ON share_links(secret_key);
      
      CREATE INDEX IF NOT EXISTS idx_share_links_album 
      ON share_links(album);
      
      -- Re-enable foreign keys
      PRAGMA foreign_keys = ON;
    `);
    
    console.log('✓ Table recreated with ON UPDATE CASCADE');
    
    // Show current share link count
    const linkCount = db.prepare('SELECT COUNT(*) as count FROM share_links').get().count;
    console.log(`\n✓ Migration completed successfully!`);
    console.log(`ℹ️  Preserved ${linkCount} existing share link(s)`);
    console.log('ℹ️  Album renames will now automatically update share links');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run migration
runMigration();

