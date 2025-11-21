/**
 * Migration: Add push notification subscriptions table
 * 
 * This migration creates a table for storing Web Push API subscriptions,
 * allowing the server to send push notifications to authenticated users.
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

console.log(`[Migration] Using database: ${DB_PATH}`);

// Open database connection
const db = new Database(DB_PATH);

// Set pragmas for performance and safety
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

try {
  // Check if push_subscriptions table already exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='push_subscriptions'
  `).get();

  if (tableExists) {
    console.log('✓ push_subscriptions table already exists, skipping migration');
    process.exit(0);
  }

  console.log('Creating push_subscriptions table...');

  // Create push_subscriptions table
  // Each user can have multiple subscriptions (different browsers/devices)
  db.exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create index on user_id for fast lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
    ON push_subscriptions(user_id)
  `);

  console.log('✓ push_subscriptions table created successfully');
  console.log('✓ Index created on user_id');

  // Verify table structure
  const columns = db.prepare(`PRAGMA table_info(push_subscriptions)`).all();
  console.log('\nTable structure:');
  columns.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

  console.log('\n✅ Migration completed successfully');
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

