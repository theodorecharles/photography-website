#!/usr/bin/env node

/**
 * Generate static JSON files for all albums
 * This script fetches album data from the backend and saves it as static JSON files
 * for faster client-side loading.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load config.json for backend port, fall back to environment or defaults
let API_URL = process.env.API_URL;

if (!API_URL) {
  try {
    const configPath = path.join(__dirname, '../config/config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    // Use the configured API URL from frontend config (handles https/http correctly)
    API_URL = config.environment.frontend.apiUrl;
  } catch (error) {
    // config.json doesn't exist, use default
    API_URL = 'http://localhost:3001';
  }
}

const OUTPUT_DIR = path.join(__dirname, '../frontend/public/albums-data');

console.log('🚀 Starting static JSON generation...');
console.log(`   API URL: ${API_URL}`);
console.log(`   Output directory: ${OUTPUT_DIR}`);

/**
 * Wait for backend to be ready
 */
async function waitForBackend(maxRetries = 10, delayMs = 1000) {
  console.log('   Waiting for backend to be ready...');
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      if (response.ok) {
        console.log('   ✅ Backend is ready!');
        return true;
      }
    } catch (error) {
      // Backend not ready yet
    }
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  console.error('   ❌ Backend did not become ready in time');
  return false;
}

/**
 * Fetch data from API with error handling
 */
async function fetchAPI(endpoint) {
  const url = `${API_URL}${endpoint}`;
  console.log(`   Fetching: ${url}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`   ❌ Error fetching ${endpoint}:`, error.message);
    throw error;
  }
}

/**
 * Ensure output directory exists
 */
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`   Created output directory: ${OUTPUT_DIR}`);
  }
}

/**
 * Write JSON file with pretty formatting
 */
function writeJSON(filename, data) {
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`   ✅ Generated: ${filename} (${data.length || 0} photos)`);
}

/**
 * Generate static JSON for all albums
 */
async function generateStaticJSON() {
  try {
    // Wait for backend to be ready (important after PM2 restart)
    const isReady = await waitForBackend();
    if (!isReady) {
      console.error('❌ Backend not ready, skipping static JSON generation');
      process.exit(1);
    }
    
    ensureOutputDir();

    // Fetch all albums
    console.log('\n📁 Fetching albums...');
    const albums = await fetchAPI('/api/albums');
    console.log(`   Found ${albums.length} albums`);

    // Generate JSON for each album
    console.log('\n📸 Generating album JSON files...');
    for (const album of albums) {
      try {
        const photos = await fetchAPI(`/api/albums/${encodeURIComponent(album)}/photos`);
        writeJSON(`${album}.json`, photos);
      } catch (error) {
        console.error(`   ⚠️  Skipping album "${album}": ${error.message}`);
      }
    }

    // Generate homepage JSON (random photos)
    console.log('\n🏠 Generating homepage JSON...');
    try {
      const randomPhotos = await fetchAPI('/api/random-photos');
      writeJSON('homepage.json', randomPhotos);
    } catch (error) {
      console.error(`   ⚠️  Could not generate homepage.json: ${error.message}`);
    }

    // Generate albums list
    console.log('\n📋 Generating albums list...');
    writeJSON('albums-list.json', albums);

    // Generate metadata file with generation timestamp
    const metadata = {
      generatedAt: new Date().toISOString(),
      albumCount: albums.length,
      albums: albums
    };
    writeJSON('_metadata.json', metadata);

    console.log('\n✨ Static JSON generation complete!');
    console.log(`   Total albums: ${albums.length}`);
    console.log(`   Output directory: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the generator
generateStaticJSON();

