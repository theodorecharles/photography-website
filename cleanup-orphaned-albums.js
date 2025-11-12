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

console.log('Cleaning up orphaned database entries...');

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
  
  // Get all directories from filesystem
  const fsAlbums = fs.readdirSync(PHOTOS_DIR)
    .filter(item => {
      const fullPath = path.join(PHOTOS_DIR, item);
      return fs.statSync(fullPath).isDirectory() && !item.startsWith('.');
    });
  const fsAlbumNames = new Set(fsAlbums);
  
  // Find albums in database but not in filesystem
  const orphaned = dbAlbums.filter(album => !fsAlbumNames.has(album.name));
  
  if (orphaned.length === 0) {
    console.log('✓ No orphaned albums found!');
    process.exit(0);
  }
  
  console.log(`\n⚠️  Found ${orphaned.length} orphaned database entries:`);
  orphaned.forEach(album => console.log(`   - ${album.name}`));
  
  // Delete orphaned entries
  const deleteAlbum = db.prepare('DELETE FROM albums WHERE name = ?');
  const deleteImages = db.prepare('DELETE FROM image_metadata WHERE album = ?');
  const deleteShares = db.prepare('DELETE FROM share_links WHERE album = ?');
  
  const transaction = db.transaction((albums) => {
    for (const album of albums) {
      deleteShares.run(album.name);
      deleteImages.run(album.name);
      deleteAlbum.run(album.name);
      console.log(`   ✓ Deleted: ${album.name}`);
    }
  });
  
  transaction(orphaned);
  
  console.log('\n✓ Cleanup completed!');
  
} catch (error) {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
} finally {
  db.close();
}

