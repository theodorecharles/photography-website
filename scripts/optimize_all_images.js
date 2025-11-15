#!/usr/bin/env node

// Increase Node.js thread pool size for better parallelism
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '32';

import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import cliProgress from 'cli-progress';
import os from 'os';
import pLimit from 'p-limit';

// Configure sharp to use all available CPU cores and aggressive settings
sharp.concurrency(os.cpus().length);
sharp.cache(false); // Disable cache to use more CPU
sharp.simd(true);   // Enable SIMD

// Parse command line arguments
const args = process.argv.slice(2);
const forceMode = args.includes('--force');
const concurrencyArg = args.indexOf('--concurrency');
const concurrencyOverride = concurrencyArg !== -1 ? parseInt(args[concurrencyArg + 1]) : null;

// Read configuration
const config = JSON.parse(readFileSync('data/config.json', 'utf8'));
const photosDir = 'data/photos'; // Hardcoded data directory structure
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

// Check if we're running in a TTY (interactive terminal) or piped/SSE
const isTTY = process.stdout.isTTY;

// Progress bar (only for TTY)
let progressBar = null;
if (isTTY) {
  progressBar = new cliProgress.SingleBar({
    format: 'Progress |{bar}| {percentage}% | {value}/{total} | {album} | {filename}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });
}

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
    fs.access(`data/optimized/thumbnail/${album}/${filename}`).then(() => false).catch(() => true),
    fs.access(`data/optimized/modal/${album}/${filename}`).then(() => false).catch(() => true),
    fs.access(`data/optimized/download/${album}/${filename}`).then(() => false).catch(() => true)
  ]);
  
  return checks;
}

// Process a single image version
async function processVersion(image, version, quality, maxDim) {
  const { album, filename, sourcePath } = image;
  const outputDir = `data/optimized/${version}/${album}`;
  const outputPath = path.join(outputDir, filename);
  
  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });
  
  // Use sharp for fast image processing
  // Read file into buffer first to reduce I/O blocking
  const buffer = await fs.readFile(sourcePath);
  await sharp(buffer)
    .rotate() // Auto-rotate based on EXIF orientation (fixes iPhone photos)
    .resize(maxDim, maxDim, {
      fit: 'inside',
      withoutEnlargement: true,
      kernel: 'lanczos3' // More CPU-intensive resampling
    })
    .jpeg({ 
      quality, 
      mozjpeg: true,
      optimiseCoding: true,
      optimizeScans: true
    })
    .toFile(outputPath);
}

// Process a single image version (one of three)
async function processImageVersion(image, versionType, quality, maxDim) {
  try {
    await processVersion(image, versionType, quality, maxDim);
    stats.processed++;
  } catch (error) {
    stats.errors++;
    console.error(`\nError processing ${image.album}/${image.filename} (${versionType}):`, error.message);
  }
}

// Use p-limit for proper concurrency control
async function processConcurrently(items, concurrency, fn) {
  const limit = pLimit(concurrency);
  const promises = items.map(item => limit(() => fn(item)));
  await Promise.all(promises);
}

// Main function
async function main() {
  console.log('Image Optimization Starting...');
  console.log(`Photos directory: ${photosDir}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Force mode: ${forceMode ? 'YES' : 'NO'}`);
  console.log('');
  
  // Check if photos directory exists
  try {
    await fs.access(photosDir);
  } catch (error) {
    console.error(`ERROR: Photos directory not found: ${photosDir}`);
    process.exit(1);
  }
  
  // Create optimized directories
  await fs.mkdir('data/optimized/thumbnail', { recursive: true });
  await fs.mkdir('data/optimized/modal', { recursive: true });
  await fs.mkdir('data/optimized/download', { recursive: true });
  
  // Get all images
  console.log('Scanning for images...');
  const albums = await getImageFiles(photosDir);
  const allImages = albums.flatMap(a => a.images);
  console.log(`Found ${allImages.length} images in ${albums.length} albums\n`);
  
  if (allImages.length === 0) {
    console.log('No images to process');
    return;
  }
  
  // Count how many need processing
  console.log('Checking which images need processing...');
  const imageNeeds = await Promise.all(
    allImages.map(async img => ({ img, needs: await needsProcessing(img) }))
  );
  const toProcess = imageNeeds.filter(({ needs }) => needs.some(n => n));
  const totalVersions = toProcess.reduce((sum, { needs }) => sum + needs.filter(n => n).length, 0);
  
  console.log(`${totalVersions} versions need to be created\n`);
  
  if (totalVersions === 0) {
    console.log('All images already optimized');
    return;
  }
  
  // Start progress tracking
  if (progressBar) {
    progressBar.start(totalVersions, 0, {
      album: '',
      filename: ''
    });
  }
  
  // Build list of all versions to process
  const versionTasks = [];
  for (const { img, needs } of toProcess) {
    const [needsThumb, needsModal, needsDownload] = needs;
    if (needsThumb) {
      versionTasks.push({ img, type: 'thumbnail', quality: thumbnailQuality, maxDim: thumbnailMaxDim });
    }
    if (needsModal) {
      versionTasks.push({ img, type: 'modal', quality: modalQuality, maxDim: modalMaxDim });
    }
    if (needsDownload) {
      versionTasks.push({ img, type: 'download', quality: downloadQuality, maxDim: downloadMaxDim });
    }
  }
  
  // Track progress
  let completed = 0;
  
  // Process all versions concurrently (each version is a separate task)
  await processConcurrently(
    versionTasks,
    concurrency,
    async (task) => {
      if (progressBar) {
        progressBar.update({ album: task.img.album, filename: `${task.img.filename} [${task.type}]` });
      }
      await processImageVersion(task.img, task.type, task.quality, task.maxDim);
      completed++;
      
      if (progressBar) {
        progressBar.increment(1);
      } else {
        // For non-TTY, output every image completion
        const percent = Math.floor((completed / totalVersions) * 100);
        console.log(`[${completed}/${totalVersions}] (${percent}%) ${task.img.album}/${task.img.filename} [${task.type}]`);
      }
    }
  );
  
  if (progressBar) {
    progressBar.stop();
  }
  
  // Print summary
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  console.log('\nOptimization Complete!');
  console.log(`Processed: ${stats.processed} versions`);
  console.log(`Skipped: ${stats.skipped} versions (already exist)`);
  if (stats.errors > 0) {
    console.log(`Errors: ${stats.errors}`);
  }
  console.log(`Time: ${elapsed}s`);
}

main().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});
