#!/usr/bin/env node

import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import cliProgress from 'cli-progress';

// Parse command line arguments
const args = process.argv.slice(2);
const forceMode = args.includes('--force');
const concurrencyArg = args.indexOf('--concurrency');
const concurrencyOverride = concurrencyArg !== -1 ? parseInt(args[concurrencyArg + 1]) : null;

// Read configuration
const config = JSON.parse(readFileSync('config/config.json', 'utf8'));
const photosDir = config.environment.backend.photosDir || 'photos';
const concurrency = concurrencyOverride || config.environment.optimization?.concurrency || 4;
const imageSettings = config.environment.optimization?.images || {};

const thumbnailQuality = imageSettings.thumbnail?.quality || 60;
const thumbnailMaxDim = imageSettings.thumbnail?.maxDimension || 512;
const modalQuality = imageSettings.modal?.quality || 90;
const modalMaxDim = imageSettings.modal?.maxDimension || 2048;
const downloadQuality = imageSettings.download?.quality || 100;
const downloadMaxDim = imageSettings.download?.maxDimension || 4096;

// Statistics
let stats = {
  processed: 0,
  skipped: 0,
  errors: 0,
  startTime: Date.now()
};

// Progress bar
const progressBar = new cliProgress.SingleBar({
  format: 'Progress |{bar}| {percentage}% | {value}/{total} | {album} | {filename}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true
});

// Get all image files from a directory
async function getImageFiles(dir) {
  const albums = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const albumPath = path.join(dir, entry.name);
      const files = await fs.readdir(albumPath);
      const imageFiles = files
        .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
        .map(f => ({
          album: entry.name,
          filename: f,
          sourcePath: path.join(albumPath, f)
        }));
      
      if (imageFiles.length > 0) {
        albums.push({
          name: entry.name,
          images: imageFiles
        });
      }
    }
  }
  
  return albums;
}

// Check if an image needs processing
async function needsProcessing(image) {
  if (forceMode) return [true, true, true];
  
  const { album, filename } = image;
  const checks = await Promise.all([
    fs.access(`optimized/thumbnail/${album}/${filename}`).then(() => false).catch(() => true),
    fs.access(`optimized/modal/${album}/${filename}`).then(() => false).catch(() => true),
    fs.access(`optimized/download/${album}/${filename}`).then(() => false).catch(() => true)
  ]);
  
  return checks;
}

// Process a single image version
async function processVersion(image, version, quality, maxDim) {
  const { album, filename, sourcePath } = image;
  const outputDir = `optimized/${version}/${album}`;
  const outputPath = path.join(outputDir, filename);
  
  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });
  
  // Use sharp for fast image processing
  await sharp(sourcePath)
    .resize(maxDim, maxDim, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality, mozjpeg: true })
    .toFile(outputPath);
}

// Process a single image (all three versions)
async function processImage(image, needs) {
  const [needsThumb, needsModal, needsDownload] = needs;
  
  try {
    const tasks = [];
    
    if (needsThumb) {
      tasks.push(processVersion(image, 'thumbnail', thumbnailQuality, thumbnailMaxDim));
    }
    if (needsModal) {
      tasks.push(processVersion(image, 'modal', modalQuality, modalMaxDim));
    }
    if (needsDownload) {
      tasks.push(processVersion(image, 'download', downloadQuality, downloadMaxDim));
    }
    
    if (tasks.length > 0) {
      await Promise.all(tasks);
      stats.processed += tasks.length;
    } else {
      stats.skipped++;
    }
  } catch (error) {
    stats.errors++;
    console.error(`\nError processing ${image.album}/${image.filename}:`, error.message);
  }
}

// Simple concurrency limiter
async function processConcurrently(items, concurrency, fn) {
  const results = [];
  const executing = [];
  
  for (const item of items) {
    const promise = fn(item).then(() => {
      executing.splice(executing.indexOf(promise), 1);
    });
    
    results.push(promise);
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  await Promise.all(results);
}

// Main function
async function main() {
  console.log('🖼️  Image Optimization Starting...');
  console.log(`📁 Photos directory: ${photosDir}`);
  console.log(`⚙️  Concurrency: ${concurrency}`);
  console.log(`🔄 Force mode: ${forceMode ? 'YES' : 'NO'}`);
  console.log('');
  
  // Check if photos directory exists
  try {
    await fs.access(photosDir);
  } catch (error) {
    console.error(`❌ Photos directory not found: ${photosDir}`);
    process.exit(1);
  }
  
  // Create optimized directories
  await fs.mkdir('optimized/thumbnail', { recursive: true });
  await fs.mkdir('optimized/modal', { recursive: true });
  await fs.mkdir('optimized/download', { recursive: true });
  
  // Get all images
  console.log('📋 Scanning for images...');
  const albums = await getImageFiles(photosDir);
  const allImages = albums.flatMap(a => a.images);
  console.log(`   Found ${allImages.length} images in ${albums.length} albums\n`);
  
  if (allImages.length === 0) {
    console.log('✅ No images to process');
    return;
  }
  
  // Count how many need processing
  console.log('🔍 Checking which images need processing...');
  const imageNeeds = await Promise.all(
    allImages.map(async img => ({ img, needs: await needsProcessing(img) }))
  );
  const toProcess = imageNeeds.filter(({ needs }) => needs.some(n => n));
  const totalVersions = toProcess.reduce((sum, { needs }) => sum + needs.filter(n => n).length, 0);
  
  console.log(`   ${totalVersions} versions need to be created\n`);
  
  if (totalVersions === 0) {
    console.log('✅ All images already optimized');
    return;
  }
  
  // Start progress bar
  progressBar.start(totalVersions, 0, {
    album: '',
    filename: ''
  });
  
  // Process each album
  for (const album of albums) {
    const albumImages = imageNeeds.filter(({ img }) => img.album === album.name);
    const albumToProcess = albumImages.filter(({ needs }) => needs.some(n => n));
    
    if (albumToProcess.length === 0) continue;
    
    progressBar.update({ album: album.name });
    
    await processConcurrently(
      albumToProcess,
      concurrency,
      async ({ img, needs }) => {
        progressBar.update({ filename: img.filename });
        await processImage(img, needs);
        progressBar.increment(needs.filter(n => n).length);
      }
    );
  }
  
  progressBar.stop();
  
  // Print summary
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  console.log('\n✅ Optimization Complete!');
  console.log(`   Processed: ${stats.processed} versions`);
  console.log(`   Skipped: ${stats.skipped} versions (already exist)`);
  if (stats.errors > 0) {
    console.log(`   Errors: ${stats.errors}`);
  }
  console.log(`   Time: ${elapsed}s`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
