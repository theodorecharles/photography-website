#!/usr/bin/env node

/**
 * Database Migration Script - Add Share Links Table
 * Adds a new table for managing shareable links to unpublished albums
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'gallery.db');

console.log('Starting share links migration...');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

// Create share_links table
db.exec(`
  CREATE TABLE IF NOT EXISTS share_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album TEXT NOT NULL,
    secret_key TEXT NOT NULL UNIQUE,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (album) REFERENCES albums(name) ON DELETE CASCADE
  )
`);

console.log('✓ Share links table created/verified');

// Create index for faster lookups by secret key
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_share_links_secret_key 
  ON share_links(secret_key)
`);

console.log('✓ Created index on secret_key column');

// Create index for cleanup queries (finding expired links)
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_share_links_expires_at 
  ON share_links(expires_at)
`);

console.log('✓ Created index on expires_at column');

db.close();

console.log('✓ Share links migration completed successfully!');
