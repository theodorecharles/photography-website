#!/usr/bin/env node

import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: ./optimize_new_image.js <album_name> <image_filename>');
  process.exit(1);
}

const albumName = args[0];
const imageFilename = args[1];

// Read configuration
const config = JSON.parse(readFileSync('config/config.json', 'utf8'));
const photosDir = config.environment.backend.photosDir || 'photos';
const imageSettings = config.environment.optimization?.images || {};

const thumbnailQuality = imageSettings.thumbnail?.quality || 60;
const thumbnailMaxDim = imageSettings.thumbnail?.maxDimension || 512;
const modalQuality = imageSettings.modal?.quality || 90;
const modalMaxDim = imageSettings.modal?.maxDimension || 2048;
const downloadQuality = imageSettings.download?.quality || 100;
const downloadMaxDim = imageSettings.download?.maxDimension || 4096;

// Process a single version
async function processVersion(sourcePath, version, quality, maxDim) {
  const outputDir = `optimized/${version}/${albumName}`;
  const outputPath = path.join(outputDir, imageFilename);
  
  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });
  
  // Use sharp for fast image processing
  console.log(`Generating ${version} for: ${albumName}/${imageFilename}`);
  await sharp(sourcePath)
    .resize(maxDim, maxDim, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality, mozjpeg: true })
    .toFile(outputPath);
}

// Main function
async function main() {
  const sourcePath = path.join(photosDir, albumName, imageFilename);
  
  // Check if source image exists
  try {
    await fs.access(sourcePath);
  } catch (error) {
    console.error(`ERROR: Source image not found: ${sourcePath}`);
    process.exit(1);
  }
  
  console.log('PROGRESS:0:Starting optimization');
  
  try {
    // Create all three versions
    await processVersion(sourcePath, 'thumbnail', thumbnailQuality, thumbnailMaxDim);
    console.log('PROGRESS:33:Thumbnail complete');
    
    await processVersion(sourcePath, 'modal', modalQuality, modalMaxDim);
    console.log('PROGRESS:66:Modal complete');
    
    await processVersion(sourcePath, 'download', downloadQuality, downloadMaxDim);
    console.log('PROGRESS:100:Download complete');
    
    console.log(`Successfully optimized: ${albumName}/${imageFilename}`);
  } catch (error) {
    console.error(`ERROR: Failed to optimize ${imageFilename}:`, error.message);
    process.exit(1);
  }
}

main();
