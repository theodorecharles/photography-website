#!/usr/bin/env node

/**
 * Re-encode all videos with current quality settings
 * This will re-process videos using the configuration in config.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import Database from 'better-sqlite3';

// Import processVideo dynamically using tsx to run TypeScript
// Note: We'll use tsx to run this script, so we can import .ts files
const { processVideo } = await import('../backend/src/utils/video-processor.ts');

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const PHOTOS_DIR = path.join(DATA_DIR, 'photos');
const VIDEO_DIR = path.join(DATA_DIR, 'video');
const DB_PATH = path.join(DATA_DIR, 'gallery.db');

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

console.log('\n🎬 VIDEO REPROCESSING WITH CURRENT SETTINGS\n');
console.log('=' .repeat(60));
console.log('⚠️  This will re-encode ALL videos with current quality settings');
console.log('=' .repeat(60) + '\n');

// Get all video files from database
const videos = db.prepare(`
  SELECT album, filename 
  FROM image_metadata 
  WHERE filename LIKE '%.mp4' 
     OR filename LIKE '%.mov' 
     OR filename LIKE '%.avi'
     OR filename LIKE '%.mkv'
     OR filename LIKE '%.webm'
  ORDER BY album, filename
`).all();

if (videos.length === 0) {
  console.log('✓ No videos found to reprocess\n');
  process.exit(0);
}

console.log(`📹 Found ${videos.length} video(s) to reprocess\n`);

let processed = 0;
let errors = 0;
let skipped = 0;

// Process each video
for (const video of videos) {
  const { album, filename } = video;
  const sourcePath = path.join(PHOTOS_DIR, album, filename);
  
  console.log(`\n📁 ${album}/${filename}`);
  
  // Check if source file exists
  if (!fs.existsSync(sourcePath)) {
    console.log(`   ❌ Source file not found, skipping...`);
    skipped++;
    continue;
  }
  
  try {
    // Delete existing video data to force full reprocessing
    const videoDir = path.join(VIDEO_DIR, album, filename);
    if (fs.existsSync(videoDir)) {
      console.log(`   🗑️  Removing existing video data...`);
      fs.rmSync(videoDir, { recursive: true, force: true });
    }
    
    // Delete existing thumbnails
    const thumbnailPath = path.join(DATA_DIR, 'optimized', 'thumbnail', album, filename.replace(/\.[^.]+$/, '.jpg'));
    const modalPath = path.join(DATA_DIR, 'optimized', 'modal', album, filename.replace(/\.[^.]+$/, '.jpg'));
    
    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }
    if (fs.existsSync(modalPath)) {
      fs.unlinkSync(modalPath);
    }
    
    console.log(`   🔄 Re-encoding with current settings...`);
    
    // Track which stages we've already logged
    let lastStage = '';
    let lastReportedProgress = 0;
    
    // Process video with current settings
    await processVideo(
      sourcePath,
      album,
      filename,
      DATA_DIR,
      (progress) => {
        // Only log when starting a new stage or every 25% within a stage
        const progressRounded = Math.floor(progress.progress / 25) * 25;
        
        if (progress.stage !== lastStage) {
          // New stage started
          const stageEmoji = {
            'rotation': '🔄',
            '240p': '📺',
            '360p': '📺',
            '720p': '📺',
            '1080p': '📺',
            'thumbnail': '🖼️',
            'modal-preview': '🖼️'
          };
          const emoji = stageEmoji[progress.stage] || '⚙️';
          console.log(`   ${emoji} ${progress.stage}...`);
          lastStage = progress.stage;
          lastReportedProgress = 0;
        } else if (progressRounded > lastReportedProgress && progressRounded < 100) {
          // Report significant progress within stage (25%, 50%, 75%)
          console.log(`      ${progressRounded}%`);
          lastReportedProgress = progressRounded;
        }
      }
    );
    
    console.log(`   ✅ Complete`);
    processed++;
    
  } catch (err) {
    console.log(`\r   ❌ Error: ${err.message}`);
    errors++;
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY:');
console.log(`   ✅ Reprocessed: ${processed}`);
console.log(`   ⏭️  Skipped:     ${skipped}`);
console.log(`   ❌ Errors:      ${errors}`);
console.log('='.repeat(60) + '\n');

db.close();
process.exit(errors > 0 ? 1 : 0);

