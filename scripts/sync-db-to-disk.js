#!/usr/bin/env node

/**
 * Sync database filenames with actual files on disk
 * Database should match what actually exists
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

console.log('🔄 Syncing database with actual files on disk...\n');

const db = new Database(DB_PATH);

try {
  // Get all albums
  const albums = db.prepare('SELECT DISTINCT album FROM image_metadata').all();
  
  let fixed = 0;
  let notFound = 0;

  for (const { album } of albums) {
    const albumPath = path.join(PHOTOS_DIR, album);
    if (!fs.existsSync(albumPath)) {
      console.log(`⚠️  Album directory not found: ${album}`);
      continue;
    }

    // Get DB entries
    const dbImages = db.prepare('SELECT id, filename FROM image_metadata WHERE album = ?').all(album);
    
    // Get actual files
    const diskFiles = fs.readdirSync(albumPath).filter(f => 
      /\.(jpg|jpeg|png|gif|mp4|mov|avi|mkv|webm)$/i.test(f)
    );

    console.log(`\n📁 ${album}: ${dbImages.length} in DB, ${diskFiles.length} on disk`);

    for (const dbImg of dbImages) {
      // Check if file exists with exact name
      if (diskFiles.includes(dbImg.filename)) {
        continue; // Perfect match
      }

      // Try to find a match (case-insensitive)
      const match = diskFiles.find(f => f.toLowerCase() === dbImg.filename.toLowerCase());
      
      if (match) {
        console.log(`   Updating DB: "${dbImg.filename}" -> "${match}"`);
        db.prepare('UPDATE image_metadata SET filename = ? WHERE id = ?').run(match, dbImg.id);
        fixed++;
      } else {
        console.log(`   ❌ File not found on disk: ${dbImg.filename}`);
        notFound++;
      }
    }
  }

  console.log(`\n✅ Fixed ${fixed} entries`);
  if (notFound > 0) {
    console.log(`⚠️  ${notFound} files not found on disk`);
  }
  
  console.log('\n💡 Now run:');
  console.log('   node scripts/generate-static-json.js');
  console.log('   pm2 restart backend frontend');

} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  db.close();
}

