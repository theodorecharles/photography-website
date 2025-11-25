#!/usr/bin/env node

/**
 * Collapse multiple spaces in all database filenames to single spaces
 */

import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/gallery.db');

console.log('🔧 Collapsing multiple spaces in database filenames...\n');

const db = new Database(DB_PATH);

try {
  // Get all images with multiple consecutive spaces
  const images = db.prepare(`
    SELECT id, album, filename
    FROM image_metadata
    WHERE filename LIKE '%  %'
  `).all();

  if (images.length === 0) {
    console.log('✅ No filenames with multiple spaces found!');
    process.exit(0);
  }

  console.log(`Found ${images.length} images with multiple spaces\n`);

  let updated = 0;

  for (const img of images) {
    const oldFilename = img.filename;
    const newFilename = oldFilename.replace(/\s+/g, ' ').trim();
    
    if (oldFilename === newFilename) continue;

    console.log(`${img.album}/${oldFilename}`);
    console.log(`  -> ${newFilename}`);

    db.prepare(`
      UPDATE image_metadata
      SET filename = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newFilename, img.id);

    updated++;
  }

  console.log(`\n✅ Updated ${updated} filenames`);
  console.log('\n💡 Now run:');
  console.log('   node scripts/generate-static-json.js');
  console.log('   pm2 restart backend frontend');

} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  db.close();
}

