#!/usr/bin/env node

/**
 * Nuclear option: Delete all albums from database and disk
 * Fresh start
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/gallery.db');
const PHOTOS_DIR = path.join(__dirname, '../data/photos');
const OPTIMIZED_DIR = path.join(__dirname, '../data/optimized');

console.log('💣 NUCLEAR OPTION: Deleting all albums...\n');
console.log('This will delete:');
console.log('  - All database entries');
console.log('  - All photos from data/photos/');
console.log('  - All optimized images');
console.log('\n⚠️  Press Ctrl+C now to cancel, or wait 5 seconds...');

await new Promise(resolve => setTimeout(resolve, 5000));

console.log('\n🔥 Starting deletion...\n');

const db = new Database(DB_PATH);

try {
  // Delete from database
  console.log('📊 Clearing database...');
  db.prepare('DELETE FROM image_metadata').run();
  db.prepare('DELETE FROM albums WHERE name != "avatar.png"').run();
  console.log('   ✅ Database cleared\n');

  // Delete photo directories (except avatar.png)
  console.log('📁 Deleting photo directories...');
  const photoDirs = fs.readdirSync(PHOTOS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());
  
  for (const dir of photoDirs) {
    const dirPath = path.join(PHOTOS_DIR, dir.name);
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`   🗑️  ${dir.name}`);
  }

  // Delete optimized directories
  console.log('\n🖼️  Deleting optimized images...');
  ['thumbnail', 'modal', 'download'].forEach(size => {
    const sizeDir = path.join(OPTIMIZED_DIR, size);
    if (fs.existsSync(sizeDir)) {
      const dirs = fs.readdirSync(sizeDir, { withFileTypes: true })
        .filter(d => d.isDirectory());
      
      for (const dir of dirs) {
        const dirPath = path.join(sizeDir, dir.name);
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    }
  });
  console.log('   ✅ Optimized images cleared\n');

  console.log('✨ All albums deleted!');
  console.log('\n💡 Now:');
  console.log('   1. Upload fresh albums via admin panel');
  console.log('   2. Photo reordering will work perfectly');

} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  db.close();
}

