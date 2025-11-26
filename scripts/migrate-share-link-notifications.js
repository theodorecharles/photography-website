#!/usr/bin/env node

/**
 * Migration: Add notified column to share_links table
 * 
 * This migration adds a notified column to track whether admins have been
 * notified about expired share links. This prevents duplicate notifications.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Import Database constructor from better-sqlite3
const Database = require('better-sqlite3');

// Determine data directory and database path
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'data');
const DB_PATH = join(DATA_DIR, 'gallery.db');

console.log('[Migration] Opening database:', DB_PATH);
const db = new Database(DB_PATH);

// Enable WAL mode and pragmas
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

try {
  console.log('[Migration] Checking if notified column exists in share_links...');
  
  // Check if notified column already exists
  const tableInfo = db.pragma('table_info(share_links)');
  const hasNotifiedColumn = tableInfo.some(col => col.name === 'notified');
  
  if (hasNotifiedColumn) {
    console.log('[Migration] ✓ notified column already exists, skipping migration');
  } else {
    console.log('[Migration] Adding notified column to share_links table...');
    
    // Add notified column (default 0 = not notified)
    db.exec(`
      ALTER TABLE share_links 
      ADD COLUMN notified INTEGER DEFAULT 0
    `);
    
    console.log('[Migration] ✓ Added notified column successfully');
    
    // Mark all existing expired links as already notified
    // (to avoid sending notifications for old expired links)
    const result = db.prepare(`
      UPDATE share_links 
      SET notified = 1 
      WHERE expires_at IS NOT NULL 
        AND datetime(expires_at) < datetime('now')
    `).run();
    
    console.log(`[Migration] ✓ Marked ${result.changes} existing expired link(s) as notified`);
  }
  
  console.log('[Migration] Migration completed successfully');
  process.exit(0);
} catch (err) {
  console.error('[Migration] Migration failed:', err);
  process.exit(1);
} finally {
  db.close();
}

