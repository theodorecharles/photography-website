#!/usr/bin/env node

/**
 * Generate AI Titles Script
 * Scans all images in the optimized/thumbnail directory and generates titles for them
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const CONFIG_PATH = path.join(__dirname, 'config/config.json');

// Database setup
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const DB_PATH = path.join(__dirname, 'image-metadata.db');

let processedCount = 0;
let skippedCount = 0;
let errorCount = 0;

function initDatabase() {
  const db = new Database(DB_PATH);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS image_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      album TEXT NOT NULL,
      filename TEXT NOT NULL,
      title TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(album, filename)
    )
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_album_filename 
    ON image_metadata(album, filename)
  `);
  
  return db;
}

async function generateImageTitle(openai, thumbnailPath, album, filename, db, existingTitles) {
  try {
    // Check if title already exists (in-memory lookup)
    const key = `${album}:${filename}`;
    if (existingTitles.has(key)) {
      console.log(`Skipping ${album}/${filename} - already has title`);
      skippedCount++;
      return null;
    }
    
    // Read the thumbnail image and convert to base64
    const imageBuffer = fs.readFileSync(thumbnailPath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = thumbnailPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    console.log(`Generating title for: ${album}/${filename}`);
    
    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Generate a short, descriptive title for this photograph (maximum 8 words). Be specific and descriptive, capturing the key subject and mood. Return only the title, no quotes or extra text."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "low"
              }
            }
          ]
        }
      ],
      max_tokens: 50
    });
    
    let title = response.choices[0]?.message?.content?.trim();
    
    if (!title) {
      console.error(`Failed to generate title for ${album}/${filename}`);
      errorCount++;
      return null;
    }
    
    // Remove surrounding quotes if present
    title = title.replace(/^["']|["']$/g, '');
    title = title.trim(); // Trim again after removing quotes
    
    // Save to database
    const stmt = db.prepare(`
      INSERT INTO image_metadata (album, filename, title, description)
      VALUES (?, ?, ?, NULL)
      ON CONFLICT(album, filename) 
      DO UPDATE SET 
        title = excluded.title,
        updated_at = CURRENT_TIMESTAMP
    `);
    
    stmt.run(album, filename, title);
    
    console.log(`✓ Generated: "${title}"`);
    processedCount++;
    
    return title;
  } catch (error) {
    console.error(`Error processing ${album}/${filename}:`, error.message);
    errorCount++;
    return null;
  }
}

async function scanAndGenerateTitles() {
  // Read config to get OpenAI API key
  const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
  const config = JSON.parse(configData);
  
  const apiKey = config.openai?.apiKey;
  
  if (!apiKey || apiKey.trim() === '') {
    console.error('ERROR: OpenAI API key not configured in config.json');
    process.exit(1);
  }
  
  // Initialize OpenAI client
  const openai = new OpenAI({ apiKey });
  
  // Initialize database
  const db = initDatabase();
  console.log('✓ Database initialized');
  
  // Load all existing titles into memory (one query instead of thousands)
  console.log('Loading existing titles from database...');
  const existingRows = db.prepare('SELECT album, filename FROM image_metadata WHERE title IS NOT NULL').all();
  const existingTitles = new Set(existingRows.map(row => `${row.album}:${row.filename}`));
  console.log(`✓ Found ${existingTitles.size} existing titles`);
  
  // Scan optimized/thumbnail directory
  const thumbnailDir = path.join(__dirname, 'optimized/thumbnail');
  
  if (!fs.existsSync(thumbnailDir)) {
    console.error('ERROR: Thumbnail directory not found:', thumbnailDir);
    process.exit(1);
  }
  
  // Get all album directories
  const albums = fs.readdirSync(thumbnailDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log(`Found ${albums.length} albums`);
  console.log('Starting AI title generation...\n');
  
  // Process each album
  for (const album of albums) {
    const albumPath = path.join(thumbnailDir, album);
    const images = fs.readdirSync(albumPath)
      .filter(file => /\.(jpg|jpeg|png)$/i.test(file));
    
    console.log(`\nProcessing album: ${album} (${images.length} images)`);
    
    for (const filename of images) {
      const thumbnailPath = path.join(albumPath, filename);
      await generateImageTitle(openai, thumbnailPath, album, filename, db, existingTitles);
    }
  }
  
  db.close();
  
  console.log('\n' + '='.repeat(50));
  console.log('AI Title Generation Complete!');
  console.log('='.repeat(50));
  console.log(`Processed: ${processedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('='.repeat(50));
}

// Main execution
scanAndGenerateTitles()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

