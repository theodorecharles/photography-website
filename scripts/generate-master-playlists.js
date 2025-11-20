#!/usr/bin/env node

/**
 * Generate master HLS playlists for existing videos that don't have one
 * This is a one-time migration script for videos processed before master playlist support
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const VIDEO_DIR = path.join(DATA_DIR, 'video');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const DEFAULTS_PATH = path.join(__dirname, '..', 'config', 'config.defaults.json');

// Load resolution configurations from config.json
function loadVideoResolutions() {
  let resolutionConfig = null;

  // Try config.json first
  try {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData);
    resolutionConfig = config.environment?.optimization?.video?.resolutions;
  } catch (err) {
    console.log('⚠️  Could not load video config from config.json');
  }

  // Fall back to config.defaults.json
  if (!resolutionConfig) {
    try {
      const defaultsData = fs.readFileSync(DEFAULTS_PATH, 'utf-8');
      const defaults = JSON.parse(defaultsData);
      resolutionConfig = defaults.environment?.optimization?.video?.resolutions;
      console.log('✓ Using default video config from config.defaults.json');
    } catch (err) {
      console.error('❌ Failed to load video config from config.json or config.defaults.json');
      process.exit(1);
    }
  }

  if (!resolutionConfig) {
    console.error('❌ No video resolutions configured');
    process.exit(1);
  }
  
  // Convert config format to array, only including enabled resolutions
  const resolutions = [];
  for (const [name, cfg] of Object.entries(resolutionConfig)) {
    if (cfg.enabled) {
      resolutions.push({
        name,
        height: cfg.height,
        videoBitrate: cfg.videoBitrate,
        audioBitrate: cfg.audioBitrate
      });
    }
  }
  
  // Sort by height ascending
  resolutions.sort((a, b) => a.height - b.height);
  
  if (resolutions.length === 0) {
    console.error('❌ No video resolutions enabled in configuration');
    process.exit(1);
  }

  return resolutions;
}

const RESOLUTIONS = loadVideoResolutions();
console.log(`📹 Using ${RESOLUTIONS.length} video resolutions: ${RESOLUTIONS.map(r => r.name).join(', ')}\n`);

function generateMasterPlaylist(videoPath, availableResolutions) {
  const masterPlaylistPath = path.join(videoPath, 'master.m3u8');
  
  let content = '#EXTM3U\n#EXT-X-VERSION:3\n\n';
  
  for (const resolution of availableResolutions) {
    // Calculate bandwidth (bitrate) from the resolution settings
    const videoBitrateKbps = parseInt(resolution.videoBitrate);
    const audioBitrateKbps = parseInt(resolution.audioBitrate);
    const totalBandwidth = (videoBitrateKbps + audioBitrateKbps) * 1000; // Convert to bps
    
    // Calculate width based on 16:9 aspect ratio
    const width = Math.round(resolution.height * (16 / 9));
    
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${totalBandwidth},RESOLUTION=${width}x${resolution.height}\n`;
    content += `${resolution.name}/playlist.m3u8\n\n`;
  }
  
  fs.writeFileSync(masterPlaylistPath, content, 'utf-8');
  return availableResolutions.length;
}

function scanVideoDirectory() {
  if (!fs.existsSync(VIDEO_DIR)) {
    console.log(`❌ Video directory not found: ${VIDEO_DIR}`);
    return;
  }

  console.log('🔍 Scanning for videos without master playlists...\n');

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  // Scan each album folder
  const albums = fs.readdirSync(VIDEO_DIR).filter(item => {
    const albumPath = path.join(VIDEO_DIR, item);
    return fs.statSync(albumPath).isDirectory();
  });

  for (const album of albums) {
    const albumPath = path.join(VIDEO_DIR, album);
    console.log(`\n📁 Album: ${album}`);

    // Scan each video folder in the album
    const videos = fs.readdirSync(albumPath).filter(item => {
      const videoPath = path.join(albumPath, item);
      return fs.statSync(videoPath).isDirectory();
    });

    for (const video of videos) {
      const videoPath = path.join(albumPath, video);
      const masterPlaylistPath = path.join(videoPath, 'master.m3u8');

      // Check if master playlist already exists
      if (fs.existsSync(masterPlaylistPath)) {
        console.log(`   ⏭️  ${video} - already has master.m3u8`);
        skipped++;
        continue;
      }

      try {
        // Check which resolution directories exist
        const availableResolutions = [];
        for (const resolution of RESOLUTIONS) {
          const resolutionPlaylistPath = path.join(videoPath, resolution.name, 'playlist.m3u8');
          if (fs.existsSync(resolutionPlaylistPath)) {
            availableResolutions.push(resolution);
          }
        }

        if (availableResolutions.length === 0) {
          console.log(`   ⚠️  ${video} - no resolution playlists found`);
          errors++;
          continue;
        }

        // Generate master playlist
        const count = generateMasterPlaylist(videoPath, availableResolutions);
        console.log(`   ✅ ${video} - created master.m3u8 (${count} qualities: ${availableResolutions.map(r => r.name).join(', ')})`);
        processed++;
      } catch (err) {
        console.error(`   ❌ ${video} - error:`, err.message);
        errors++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Generated: ${processed}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(60));
}

// Run the script
try {
  scanVideoDirectory();
} catch (err) {
  console.error('Fatal error:', err);
  process.exit(1);
}
