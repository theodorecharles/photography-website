#!/usr/bin/env node

/**
 * Migrate existing files to /data directory
 * This script moves gallery.db, config.json, photos/, optimized/, and avatar.png to /data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname;

const DATA_DIR = process.env.DATA_DIR || path.join(projectRoot, 'data');

console.log('🚀 Starting migration to /data directory...');
console.log(`📁 Data directory: ${DATA_DIR}\n`);

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  console.log('✓ Creating /data directory...');
  fs.mkdirSync(DATA_DIR, { recursive: true });
} else {
  console.log('✓ /data directory already exists');
}

/**
 * Move a file or directory from old path to new path
 */
function moveIfExists(oldPath, newPath, name) {
  if (fs.existsSync(oldPath)) {
    if (fs.existsSync(newPath)) {
      console.log(`⚠️  ${name} already exists in /data - skipping move`);
      return false;
    }
    
    try {
      // Create parent directory if needed
      const newDir = path.dirname(newPath);
      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
      }
      
      // Move the file/directory
      fs.renameSync(oldPath, newPath);
      console.log(`✓ Moved ${name} to /data`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to move ${name}:`, error.message);
      return false;
    }
  } else {
    console.log(`⚠️  ${name} not found at old location - may already be migrated or not yet created`);
    return false;
  }
}

// Files and directories to migrate
const migrations = [
  {
    old: path.join(projectRoot, 'gallery.db'),
    new: path.join(DATA_DIR, 'gallery.db'),
    name: 'gallery.db'
  },
  {
    old: path.join(projectRoot, 'gallery.db-shm'),
    new: path.join(DATA_DIR, 'gallery.db-shm'),
    name: 'gallery.db-shm (SQLite shared memory)'
  },
  {
    old: path.join(projectRoot, 'gallery.db-wal'),
    new: path.join(DATA_DIR, 'gallery.db-wal'),
    name: 'gallery.db-wal (SQLite write-ahead log)'
  },
  {
    old: path.join(projectRoot, 'config/config.json'),
    new: path.join(DATA_DIR, 'config.json'),
    name: 'config.json'
  },
  {
    old: path.join(projectRoot, 'photos'),
    new: path.join(DATA_DIR, 'photos'),
    name: 'photos/ directory'
  },
  {
    old: path.join(projectRoot, 'optimized'),
    new: path.join(DATA_DIR, 'optimized'),
    name: 'optimized/ directory'
  }
];

console.log('\n📦 Migrating files and directories:\n');

let movedCount = 0;
migrations.forEach(migration => {
  if (moveIfExists(migration.old, migration.new, migration.name)) {
    movedCount++;
  }
});

// Clean up empty config directory if it exists
const oldConfigDir = path.join(projectRoot, 'config');
if (fs.existsSync(oldConfigDir)) {
  const entries = fs.readdirSync(oldConfigDir);
  if (entries.length === 0 || (entries.length === 1 && entries[0] === 'config.example.json')) {
    console.log('\n✓ Old config/ directory is now empty (except for example)');
  }
}

console.log(`\n✅ Migration complete! Moved ${movedCount} items to /data directory`);
console.log('\n📝 Note: You can now mount /data as a Docker volume for persistence');

// Verify critical files exist in new location
console.log('\n🔍 Verifying migration...');
const criticalFiles = [
  { path: path.join(DATA_DIR, 'config.json'), name: 'config.json' },
  { path: path.join(DATA_DIR, 'gallery.db'), name: 'gallery.db' },
  { path: path.join(DATA_DIR, 'photos'), name: 'photos/' },
  { path: path.join(DATA_DIR, 'optimized'), name: 'optimized/' }
];

let allGood = true;
criticalFiles.forEach(file => {
  if (fs.existsSync(file.path)) {
    console.log(`✓ ${file.name} exists in /data`);
  } else {
    console.log(`⚠️  ${file.name} not found in /data (may not have been created yet)`);
    allGood = false;
  }
});

if (allGood) {
  console.log('\n🎉 All expected files are in /data directory!');
} else {
  console.log('\n⚠️  Some files are missing - this is OK if this is a fresh setup');
}

process.exit(0);

