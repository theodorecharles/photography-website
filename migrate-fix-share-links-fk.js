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

console.log('Starting share_links foreign key fix migration...');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Error: gallery.db not found.');
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

try {
  // Check if the table already has the correct FK constraint
  const foreignKeys = db.pragma('foreign_key_list(share_links)');
  const hasUpdateCascade = foreignKeys.some(fk => 
    fk.table === 'albums' && fk.on_update === 'CASCADE'
  );
  
  if (hasUpdateCascade) {
    console.log('✓ share_links already has ON UPDATE CASCADE, skipping');
    db.close();
    process.exit(0);
  }
  
  console.log('✓ Recreating share_links table with ON UPDATE CASCADE...');
  
  // Get existing data
  const existingLinks = db.prepare('SELECT * FROM share_links').all();
  
  // Start transaction
  db.exec('BEGIN TRANSACTION');
  
  // Temporarily disable foreign keys
  db.pragma('foreign_keys = OFF');
  
  // Drop old table
  db.exec('DROP TABLE IF EXISTS share_links');
  
  // Recreate with proper foreign key constraint
  db.exec(`
    CREATE TABLE share_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      album TEXT NOT NULL,
      secret_key TEXT NOT NULL UNIQUE,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (album) REFERENCES albums(name) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  
  // Restore data
  if (existingLinks.length > 0) {
    const insertStmt = db.prepare(`
      INSERT INTO share_links (id, album, secret_key, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const link of existingLinks) {
      insertStmt.run(link.id, link.album, link.secret_key, link.expires_at, link.created_at);
    }
    
    console.log(`✓ Restored ${existingLinks.length} share link(s)`);
  }
  
  // Re-enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Commit transaction
  db.exec('COMMIT');
  
  console.log('✓ Migration completed successfully!');
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  try {
    db.exec('ROLLBACK');
  } catch (rollbackError) {
    // Ignore rollback errors
  }
  process.exit(1);
} finally {
  db.close();
}

