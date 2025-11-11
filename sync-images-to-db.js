#!/usr/bin/env node

/**
 * Sync Images to Database
 * Scans the photos directory and ensures all images are in the database
 * This is needed after migrating from filesystem scans to database queries
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'gallery.db');
const PHOTOS_DIR = path.join(__dirname, 'photos');

function syncImagesToDatabase() {
  const db = new Database(DB_PATH);
  
  console.log('🔄 Syncing images from filesystem to database...\n');
  
  // Get all albums (directories in photos/)
  const albums = fs.readdirSync(PHOTOS_DIR)
    .filter(file => {
      const albumPath = path.join(PHOTOS_DIR, file);
      return fs.statSync(albumPath).isDirectory() && file !== 'homepage';
    });
  
  let addedCount = 0;
  let existingCount = 0;
  let totalImages = 0;
  
  // Prepare SQL statements
  const checkStmt = db.prepare('SELECT 1 FROM image_metadata WHERE album = ? AND filename = ?');
  const insertStmt = db.prepare(`
    INSERT INTO image_metadata (album, filename, title, description)
    VALUES (?, ?, NULL, NULL)
    ON CONFLICT(album, filename) DO NOTHING
  `);
  
  // Scan each album
  for (const album of albums) {
    const albumPath = path.join(PHOTOS_DIR, album);
    
    // Get all image files
    const images = fs.readdirSync(albumPath)
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
    
    console.log(`📁 ${album} (${images.length} images)`);
    
    for (const filename of images) {
      totalImages++;
      
      // Check if image exists in database
      const exists = checkStmt.get(album, filename);
      
      if (!exists) {
        // Add to database
        insertStmt.run(album, filename);
        console.log(`  ✅ Added: ${filename}`);
        addedCount++;
      } else {
        existingCount++;
      }
    }
  }
  
  db.close();
  
  console.log(`\n✨ Sync complete!`);
  console.log(`   Total images: ${totalImages}`);
  console.log(`   Added to DB: ${addedCount}`);
  console.log(`   Already in DB: ${existingCount}`);
}

try {
  syncImagesToDatabase();
} catch (error) {
  console.error('❌ Error syncing images:', error);
  process.exit(1);
}

