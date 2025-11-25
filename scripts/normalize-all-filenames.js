#!/usr/bin/env node

/**
 * Normalize all filenames by removing dashes from database AND filesystem
 * This ensures database and files are in sync
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

console.log('🔧 Normalizing all filenames (removing dashes)...\n');

const db = new Database(DB_PATH);

try {
  // Get all images with dashes in their filenames
  const images = db.prepare(`
    SELECT id, album, filename
    FROM image_metadata
    WHERE filename LIKE '%-%'
    ORDER BY album, filename
  `).all();

  if (images.length === 0) {
    console.log('✅ No filenames with dashes found!');
    process.exit(0);
  }

  console.log(`Found ${images.length} images with dashes in filename\n`);

  let updated = 0;
  let failed = 0;

  for (const img of images) {
    const oldFilename = img.filename;
    const newFilename = oldFilename.replace(/-/g, ' ');
    
    if (oldFilename === newFilename) continue;

    console.log(`\n📁 Album: ${img.album}`);
    console.log(`   Old: ${oldFilename}`);
    console.log(`   New: ${newFilename}`);

    try {
      // 1. Rename files in photos directory
      const oldPhotoPath = path.join(PHOTOS_DIR, img.album, oldFilename);
      const newPhotoPath = path.join(PHOTOS_DIR, img.album, newFilename);
      
      if (fs.existsSync(oldPhotoPath)) {
        fs.renameSync(oldPhotoPath, newPhotoPath);
        console.log('   ✅ Renamed original photo');
      } else {
        console.log('   ⚠️  Original photo not found (might be OK)');
      }

      // 2. Rename optimized versions
      ['thumbnail', 'modal', 'download'].forEach(size => {
        const oldOptPath = path.join(OPTIMIZED_DIR, size, img.album, oldFilename);
        const newOptPath = path.join(OPTIMIZED_DIR, size, img.album, newFilename);
        
        if (fs.existsSync(oldOptPath)) {
          fs.renameSync(oldOptPath, newOptPath);
          console.log(`   ✅ Renamed ${size}`);
        }
      });

      // 3. Update database
      db.prepare(`
        UPDATE image_metadata
        SET filename = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newFilename, img.id);
      
      console.log('   ✅ Updated database');
      updated++;

    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n✨ Complete!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  
  if (updated > 0) {
    console.log('\n💡 Now run:');
    console.log('   node scripts/generate-static-json.js');
    console.log('   ./restart.sh');
  }

} catch (error) {
  console.error('❌ Fatal error:', error);
  process.exit(1);
} finally {
  db.close();
}

