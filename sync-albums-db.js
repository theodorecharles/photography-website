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
const PHOTOS_DIR = process.env.PHOTOS_DIR || '/mnt/user/appdata/website/';

console.log('Starting album database sync...');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Error: gallery.db not found.');
  process.exit(1);
}

if (!fs.existsSync(PHOTOS_DIR)) {
  console.error(`❌ Error: Photos directory not found: ${PHOTOS_DIR}`);
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

try {
  // Get all albums from database
  const dbAlbums = db.prepare('SELECT name FROM albums').all();
  const dbAlbumNames = new Set(dbAlbums.map(a => a.name));
  
  // Get all directories from filesystem (exclude hidden files and .png files)
  const fsAlbums = fs.readdirSync(PHOTOS_DIR)
    .filter(item => {
      const fullPath = path.join(PHOTOS_DIR, item);
      return fs.statSync(fullPath).isDirectory() && !item.startsWith('.');
    })
    .sort();
  const fsAlbumNames = new Set(fsAlbums);
  
  console.log('\n📊 Current State:');
  console.log(`  Database: ${dbAlbumNames.size} albums`);
  console.log(`  Filesystem: ${fsAlbumNames.size} albums`);
  
  // Find albums in filesystem but not in database
  const missingInDb = fsAlbums.filter(name => !dbAlbumNames.has(name));
  
  // Find albums in database but not in filesystem
  const missingInFs = Array.from(dbAlbumNames).filter(name => !fsAlbumNames.has(name));
  
  if (missingInDb.length > 0) {
    console.log('\n➕ Adding albums to database:');
    const insertStmt = db.prepare(`
      INSERT INTO albums (name, published, created_at, updated_at)
      VALUES (?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    for (const albumName of missingInDb) {
      insertStmt.run(albumName);
      console.log(`   ✓ Added: ${albumName}`);
    }
  }
  
  if (missingInFs.length > 0) {
    console.log('\n⚠️  Albums in database but not in filesystem:');
    missingInFs.forEach(name => console.log(`   - ${name}`));
    console.log('\n   These will NOT be automatically deleted. Remove manually if needed.');
  }
  
  if (missingInDb.length === 0 && missingInFs.length === 0) {
    console.log('\n✓ Database and filesystem are in sync!');
  } else {
    console.log('\n✓ Sync completed!');
  }
  
} catch (error) {
  console.error('❌ Sync failed:', error);
  process.exit(1);
} finally {
  db.close();
}

