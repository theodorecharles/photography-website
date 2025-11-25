#!/usr/bin/env node

/**
 * Find and remove duplicate image entries in the database
 * Keeps the entry with the better title (not just filename)
 */

import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/gallery.db');

console.log('🔍 Checking for duplicate images in database...\n');

const db = new Database(DB_PATH);

try {
  // Find duplicates (same album + similar filename)
  const duplicates = db.prepare(`
    SELECT album, filename, COUNT(*) as count
    FROM image_metadata
    GROUP BY album, LOWER(REPLACE(REPLACE(filename, '-', ''), ' ', ''))
    HAVING count > 1
  `).all();

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    process.exit(0);
  }

  console.log(`Found ${duplicates.length} sets of duplicates:\n`);

  for (const dup of duplicates) {
    console.log(`\n📁 Album: ${dup.album}`);
    
    // Get all entries for this album/filename combination
    const normalizedBase = dup.filename.toLowerCase().replace(/[-\s]/g, '');
    
    const entries = db.prepare(`
      SELECT id, filename, title, description, sort_order, created_at
      FROM image_metadata
      WHERE album = ?
      AND LOWER(REPLACE(REPLACE(filename, '-', ''), ' ', '')) = ?
      ORDER BY created_at ASC
    `).all(dup.album, normalizedBase);

    console.log(`   Found ${entries.length} entries:`);
    entries.forEach(entry => {
      const hasGoodTitle = entry.title && entry.title !== entry.filename;
      console.log(`   - ID ${entry.id}: ${entry.filename} | "${entry.title}" | sort_order: ${entry.sort_order} | ${hasGoodTitle ? '✨ Has good title' : '❌ No title'}`);
    });

    // Keep the one with the best title (not just filename), or the oldest one
    const keepEntry = entries.find(e => e.title && e.title !== e.filename) || entries[0];
    const removeEntries = entries.filter(e => e.id !== keepEntry.id);

    if (removeEntries.length > 0) {
      console.log(`   ✅ Keeping: ID ${keepEntry.id} (${keepEntry.filename})`);
      console.log(`   🗑️  Removing: ${removeEntries.map(e => `ID ${e.id}`).join(', ')}`);
      
      // Delete duplicates
      const deleteStmt = db.prepare('DELETE FROM image_metadata WHERE id = ?');
      const deleteMany = db.transaction((ids) => {
        for (const id of ids) {
          deleteStmt.run(id);
        }
      });
      
      deleteMany(removeEntries.map(e => e.id));
      console.log(`   ✅ Deleted ${removeEntries.length} duplicate(s)`);
    }
  }

  console.log('\n✨ Cleanup complete!');
  console.log('\n💡 Now run: node scripts/generate-static-json.js');
  
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  db.close();
}

