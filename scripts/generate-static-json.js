#!/usr/bin/env node

/**
 * Generate static JSON files for all albums
 * Standalone script that reads directly from SQLite database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../gallery.db');
const OUTPUT_DIR = path.join(__dirname, '../frontend/public/albums-data');

console.log('🚀 Starting static JSON generation...');
console.log(`   Database: ${DB_PATH}`);
console.log(`   Output directory: ${OUTPUT_DIR}`);

try {
  // Open database
  const db = new Database(DB_PATH, { readonly: true });

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`   Created output directory`);
  }

  function writeJSON(filename, data) {
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(data));
    const size = (fs.statSync(filepath).size / 1024).toFixed(1);
    console.log(`   ✅ Generated: ${filename} (${Array.isArray(data) ? data.length : 'N/A'} items, ${size} KB)`);
  }

  // Optimized format: just [filename, title] arrays
  // Frontend will reconstruct full photo objects
  function transformImageToOptimized(image) {
    return [
      image.filename,
      image.title || image.filename
    ];
  }

  // Get all albums (including unpublished)
  console.log('\n📁 Fetching albums...');
  const albums = db.prepare('SELECT name FROM albums ORDER BY sort_order, name').all();
  console.log(`   Found ${albums.length} albums (including unpublished)`);

  // Generate JSON for each album
  console.log('\n📸 Generating album JSON files...');
  for (const albumRow of albums) {
    const album = albumRow.name;
    try {
      const images = db.prepare(`
        SELECT filename, title, description 
        FROM image_metadata 
        WHERE album = ? 
        ORDER BY sort_order, filename
      `).all(album);
      
      // Generate optimized format: array of [filename, title]
      const photos = images.map(transformImageToOptimized);
      writeJSON(`${album}.json`, photos);
    } catch (error) {
      console.error(`   ⚠️  Error generating JSON for "${album}":`, error.message);
    }
  }

  // Generate homepage JSON (shuffled photos from published albums only)
  console.log('\n🏠 Generating homepage JSON...');
  try {
    const publishedAlbums = db.prepare('SELECT name FROM albums WHERE published = 1').all();
    const publishedAlbumNames = publishedAlbums.map(a => a.name);
    
    if (publishedAlbumNames.length > 0) {
      const placeholders = publishedAlbumNames.map(() => '?').join(',');
      const images = db.prepare(`
        SELECT filename, title, description, album 
        FROM image_metadata 
        WHERE album IN (${placeholders})
        ORDER BY RANDOM()
      `).all(...publishedAlbumNames);
      
      // Homepage format: [filename, title, album] (need album for multi-album homepage)
      const photos = images.map(img => [
        img.filename,
        img.title || img.filename,
        img.album
      ]);
      writeJSON('homepage.json', photos);
    } else {
      writeJSON('homepage.json', []);
    }
  } catch (error) {
    console.error(`   ⚠️  Could not generate homepage.json:`, error.message);
  }

  // Generate albums list
  console.log('\n📋 Generating albums list...');
  const albumNames = albums.map(a => a.name);
  writeJSON('albums-list.json', albumNames);

  // Generate metadata file
  const metadata = {
    generatedAt: new Date().toISOString(),
    albumCount: albums.length,
    albums: albumNames
  };
  writeJSON('_metadata.json', metadata);

  db.close();

  console.log('\n✨ Static JSON generation complete!');
  console.log(`   Total albums: ${albums.length}`);
  process.exit(0);
} catch (error) {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
