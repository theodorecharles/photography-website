#!/usr/bin/env node

/**
 * Migration: Add video support to the database
 * 
 * Changes:
 * - Adds media_type column to image_metadata table (default: 'photo')
 * - Updates existing rows to have media_type = 'photo'
 * - Allows tracking of both photos and videos in the same table
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const Database = require('better-sqlite3');

// Determine database path
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data');
const DB_PATH = join(DATA_DIR, 'gallery.db');

function runMigration() {
  console.log('Starting video support migration...');
  
  const db = new Database(DB_PATH);
  
  // Enable WAL mode
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  
  try {
    // Check if migration is needed
    const tableInfo = db.prepare("PRAGMA table_info(image_metadata)").all();
    const hasMediaType = tableInfo.some(col => col.name === 'media_type');
    
    if (hasMediaType) {
      console.log('✓ media_type column already exists. Skipping migration.');
      db.close();
      return;
    }
    
    console.log('Adding media_type column to image_metadata table...');
    
    // Add media_type column with default value 'photo'
    db.exec(`
      ALTER TABLE image_metadata 
      ADD COLUMN media_type TEXT NOT NULL DEFAULT 'photo'
    `);
    
    // Update all existing rows to have media_type = 'photo'
    const updateStmt = db.prepare(`
      UPDATE image_metadata 
      SET media_type = 'photo'
      WHERE media_type IS NULL OR media_type = ''
    `);
    
    const result = updateStmt.run();
    
    console.log('✓ media_type column added successfully');
    console.log(`✓ Updated ${result.changes} existing rows to media_type = 'photo'`);
    
    // Get count statistics
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM image_metadata').get().count;
    const photoCount = db.prepare("SELECT COUNT(*) as count FROM image_metadata WHERE media_type = 'photo'").get().count;
    const videoCount = db.prepare("SELECT COUNT(*) as count FROM image_metadata WHERE media_type = 'video'").get().count;
    
    console.log('\nCurrent media statistics:');
    console.log(`  Total items: ${totalCount}`);
    console.log(`  Photos: ${photoCount}`);
    console.log(`  Videos: ${videoCount}`);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('ℹ️  The system now supports both photos and videos.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run migration
runMigration();
