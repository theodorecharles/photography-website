#!/usr/bin/env node

/**
 * Compare database entries with static JSON for an album
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
const JSON_DIR = path.join(__dirname, '../frontend/dist/albums-data');

const albumName = process.argv[2] || 'Animals';

const db = new Database(DB_PATH, { readonly: true });

try {
  // Get from database
  const dbImages = db.prepare(`
    SELECT filename, title
    FROM image_metadata
    WHERE album = ?
    ORDER BY sort_order, filename
  `).all(albumName);

  console.log(`\n📊 Comparing album: ${albumName}\n`);
  console.log(`📁 Database has ${dbImages.length} images`);
  
  // Get from JSON
  const jsonPath = path.join(JSON_DIR, `${albumName}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.log(`❌ Static JSON file not found: ${jsonPath}`);
    process.exit(1);
  }
  
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`📄 JSON has ${jsonData.length} images`);
  
  // Compare
  console.log(`\n🔍 Comparison:\n`);
  
  const dbFilenames = new Set(dbImages.map(img => img.filename));
  const jsonFilenames = new Set(jsonData.map(item => item[0]));
  
  // In DB but not in JSON
  const inDbNotJson = dbImages.filter(img => !jsonFilenames.has(img.filename));
  if (inDbNotJson.length > 0) {
    console.log(`❌ In database but NOT in JSON (${inDbNotJson.length}):`);
    inDbNotJson.forEach(img => {
      console.log(`   - ${img.filename}`);
    });
    console.log('');
  }
  
  // In JSON but not in DB
  const inJsonNotDb = jsonData.filter(item => !dbFilenames.has(item[0]));
  if (inJsonNotDb.length > 0) {
    console.log(`❌ In JSON but NOT in database (${inJsonNotDb.length}):`);
    inJsonNotDb.forEach(item => {
      console.log(`   - ${item[0]}`);
    });
    console.log('');
  }
  
  if (inDbNotJson.length === 0 && inJsonNotDb.length === 0) {
    console.log('✅ Database and JSON are in sync!');
  } else {
    console.log(`\n⚠️  Mismatch detected! Run: node scripts/generate-static-json.js`);
  }
  
  console.log(`\n📋 First 5 from database:`);
  dbImages.slice(0, 5).forEach((img, i) => {
    console.log(`   ${i + 1}. ${img.filename}`);
  });
  
  console.log(`\n📋 First 5 from JSON:`);
  jsonData.slice(0, 5).forEach((item, i) => {
    console.log(`   ${i + 1}. ${item[0]}`);
  });

} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  db.close();
}

