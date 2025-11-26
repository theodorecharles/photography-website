/**
 * Migration: Album View Tracking
 * 
 * Creates album_view_counts table for tracking album views in database.
 * Migrates existing milestone data from .album-milestones.json if it exists.
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'data');
const DB_PATH = join(DATA_DIR, 'gallery.db');
const MILESTONE_FILE = join(DATA_DIR, '.album-milestones.json');

console.log('='.repeat(60));
console.log('Album View Tracking Migration');
console.log('='.repeat(60));

try {
  // Open database
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  // Check if table already exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='album_view_counts'
  `).get();

  if (tableExists) {
    console.log('✓ album_view_counts table already exists');
  } else {
    console.log('Creating album_view_counts table...');
    
    db.exec(`
      CREATE TABLE album_view_counts (
        album TEXT PRIMARY KEY,
        view_count INTEGER NOT NULL DEFAULT 0,
        last_milestone INTEGER NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (album) REFERENCES albums(name) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    
    console.log('✓ Created album_view_counts table');
  }

  // Migrate existing milestone data if file exists
  if (existsSync(MILESTONE_FILE)) {
    console.log(`\nFound existing milestone data at ${MILESTONE_FILE}`);
    console.log('Migrating to database...');
    
    const milestoneData = JSON.parse(readFileSync(MILESTONE_FILE, 'utf8'));
    let migratedCount = 0;
    
    const insertStmt = db.prepare(`
      INSERT INTO album_view_counts (album, view_count, last_milestone, updated_at)
      VALUES (?, 0, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(album) DO UPDATE SET
        last_milestone = MAX(last_milestone, excluded.last_milestone)
    `);
    
    for (const [albumName, lastMilestone] of Object.entries(milestoneData)) {
      insertStmt.run(albumName, lastMilestone);
      migratedCount++;
      console.log(`  ✓ Migrated ${albumName}: last milestone = ${lastMilestone}`);
    }
    
    console.log(`\n✓ Migrated ${migratedCount} album milestone(s)`);
    console.log('\nNote: View counts start at 0. They will increment as albums are viewed.');
    console.log('Old milestone data preserved in .album-milestones.json (can be deleted).');
  } else {
    console.log('\nNo existing milestone data to migrate');
  }

  db.close();
  
  console.log('\n' + '='.repeat(60));
  console.log('Migration completed successfully!');
  console.log('='.repeat(60));
  process.exit(0);

} catch (err) {
  console.error('\n' + '='.repeat(60));
  console.error('Migration failed:', err);
  console.error('='.repeat(60));
  process.exit(1);
}

