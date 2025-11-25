#!/usr/bin/env node

/**
 * Check what images are in a specific album
 */

import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/gallery.db');

const albumName = process.argv[2];

if (!albumName) {
  console.error('Usage: node check-album-images.js <album-name>');
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

try {
  const images = db.prepare(`
    SELECT id, album, filename, title, description, sort_order, created_at, updated_at
    FROM image_metadata
    WHERE album = ?
    ORDER BY sort_order, filename
  `).all(albumName);

  if (images.length === 0) {
    console.log(`❌ No images found in album: ${albumName}`);
    process.exit(0);
  }

  console.log(`\n📁 Album: ${albumName}`);
  console.log(`   Total images: ${images.length}\n`);

  images.forEach((img, idx) => {
    const hasGoodTitle = img.title && img.title !== img.filename;
    const normalized = img.filename.toLowerCase().replace(/[-\s]/g, '');
    console.log(`${idx + 1}. ID ${img.id} | sort_order: ${img.sort_order}`);
    console.log(`   Filename: ${img.filename}`);
    console.log(`   Title: ${img.title} ${hasGoodTitle ? '✨' : '❌'}`);
    console.log(`   Normalized: ${normalized}`);
    console.log(`   Created: ${img.created_at}`);
    console.log('');
  });

  // Check for potential duplicates
  console.log('\n🔍 Checking for potential duplicates...\n');
  const seenNormalized = new Map();
  
  images.forEach(img => {
    const normalized = img.filename.toLowerCase().replace(/[-\s]/g, '');
    if (seenNormalized.has(normalized)) {
      console.log(`⚠️  DUPLICATE DETECTED:`);
      console.log(`   Previous: ID ${seenNormalized.get(normalized).id} - ${seenNormalized.get(normalized).filename}`);
      console.log(`   Current:  ID ${img.id} - ${img.filename}`);
      console.log('');
    } else {
      seenNormalized.set(normalized, img);
    }
  });

  if (seenNormalized.size === images.length) {
    console.log('✅ No duplicates found!');
  }

} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  db.close();
}

