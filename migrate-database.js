#!/usr/bin/env node

/**
 * Database Migration Script
 * Migrates from image-metadata.db to gallery.db and creates albums table
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const OLD_DB_PATH = path.join(__dirname, 'image-metadata.db');
const NEW_DB_PATH = path.join(__dirname, 'gallery.db');
const PHOTOS_DIR = path.join(__dirname, 'photos');

console.log('Starting database migration...');

// Step 1: Rename old database if it exists
if (fs.existsSync(OLD_DB_PATH) && !fs.existsSync(NEW_DB_PATH)) {
  console.log('✓ Found old database, renaming to gallery.db...');
  fs.renameSync(OLD_DB_PATH, NEW_DB_PATH);
  
  // Also rename WAL and SHM files if they exist
  const oldWal = path.join(__dirname, 'image-metadata.db-wal');
  const oldShm = path.join(__dirname, 'image-metadata.db-shm');
  const newWal = path.join(__dirname, 'gallery.db-wal');
  const newShm = path.join(__dirname, 'gallery.db-shm');
  
  if (fs.existsSync(oldWal)) {
    fs.renameSync(oldWal, newWal);
  }
  if (fs.existsSync(oldShm)) {
    fs.renameSync(oldShm, newShm);
  }
  
  console.log('✓ Database renamed successfully');
} else if (fs.existsSync(NEW_DB_PATH)) {
  console.log('✓ gallery.db already exists');
} else {
  console.log('✓ No existing database found, will create new one');
}

// Step 2: Open/create gallery.db and ensure albums table exists
const db = new Database(NEW_DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

// Create albums table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    published BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('✓ Albums table created/verified');

// Step 3: Check if we need to populate albums table
const albumCount = db.prepare('SELECT COUNT(*) as count FROM albums').get().count;

if (albumCount === 0) {
  console.log('✓ Populating albums table with existing albums (all marked as published)...');
  
  // Get all album directories
  if (fs.existsSync(PHOTOS_DIR)) {
    const albums = fs.readdirSync(PHOTOS_DIR)
      .filter(file => {
        const fullPath = path.join(PHOTOS_DIR, file);
        return fs.statSync(fullPath).isDirectory() && file !== 'homepage';
      });
    
    if (albums.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO albums (name, published)
        VALUES (?, 1)
        ON CONFLICT(name) DO NOTHING
      `);
      
      const insertMany = db.transaction((albumList) => {
        for (const album of albumList) {
          insertStmt.run(album);
        }
      });
      
      insertMany(albums);
      console.log(`✓ Added ${albums.length} existing albums as published`);
    } else {
      console.log('✓ No existing albums found to migrate');
    }
  } else {
    console.log('✓ Photos directory not found, skipping album population');
  }
} else {
  console.log(`✓ Albums table already has ${albumCount} entries, skipping population`);
}

// Step 4: Add sort_order column to albums table if it doesn't exist
const tableInfo = db.pragma('table_info(albums)');
const hasSortOrder = tableInfo.some((col) => col.name === 'sort_order');

if (!hasSortOrder) {
  console.log('✓ Adding sort_order column to albums table...');
  db.exec(`ALTER TABLE albums ADD COLUMN sort_order INTEGER`);
  
  // Set initial sort order based on name (alphabetical)
  const albums = db.prepare('SELECT id, name FROM albums ORDER BY name').all();
  const updateStmt = db.prepare('UPDATE albums SET sort_order = ? WHERE id = ?');
  
  albums.forEach((album, index) => {
    updateStmt.run(index, album.id);
  });
  
  console.log(`✓ Added sort_order column and set initial order for ${albums.length} albums`);
} else {
  console.log('✓ Albums table already has sort_order column');
}

// Step 5: Verify image_metadata table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS image_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album TEXT NOT NULL,
    filename TEXT NOT NULL,
    title TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(album, filename)
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_album_filename 
  ON image_metadata(album, filename)
`);

console.log('✓ Image metadata table verified');

db.close();

console.log('✓ Database migration completed successfully!');
