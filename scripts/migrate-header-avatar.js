#!/usr/bin/env node

/**
 * Migration script to generate optimized header avatar (80x80 WebP)
 * from existing 512x512 avatar.png
 *
 * This script:
 * 1. Reads the existing avatar.png
 * 2. Generates an 80x80 WebP version for the header
 * 3. Updates config.json with headerAvatarPath and avatarCacheBust
 *
 * Run: node scripts/migrate-header-avatar.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine paths
const projectRoot = path.resolve(__dirname, '..');
const dataDir = process.env.DATA_DIR || path.join(projectRoot, 'data');
const photosDir = path.join(dataDir, 'photos');
const configPath = path.join(dataDir, 'config.json');

const avatarPath = path.join(photosDir, 'avatar.png');
const headerAvatarPath = path.join(photosDir, 'avatar-header.webp');

async function migrate() {
  console.log('Header Avatar Migration');
  console.log('=======================\n');

  // Check if avatar.png exists
  if (!fs.existsSync(avatarPath)) {
    console.log('No avatar.png found at:', avatarPath);
    console.log('Skipping migration - avatar will be generated when first uploaded.');
    return;
  }

  console.log('Found avatar.png at:', avatarPath);

  // Check if header avatar already exists
  if (fs.existsSync(headerAvatarPath)) {
    const stats = fs.statSync(headerAvatarPath);
    console.log('Header avatar already exists:', headerAvatarPath);
    console.log('Size:', (stats.size / 1024).toFixed(1), 'KB');
    console.log('');

    // Still update config if needed
    await updateConfig();
    return;
  }

  // Generate header avatar
  console.log('Generating 80x80 WebP header avatar...');

  try {
    await sharp(avatarPath)
      .resize(80, 80, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(headerAvatarPath);

    const stats = fs.statSync(headerAvatarPath);
    console.log('Created:', headerAvatarPath);
    console.log('Size:', (stats.size / 1024).toFixed(1), 'KB');

    // Compare with original
    const originalStats = fs.statSync(avatarPath);
    const reduction = ((1 - stats.size / originalStats.size) * 100).toFixed(1);
    console.log('Size reduction:', reduction + '% (from', (originalStats.size / 1024).toFixed(1), 'KB)');
    console.log('');

    await updateConfig();

  } catch (err) {
    console.error('Failed to generate header avatar:', err);
    process.exit(1);
  }
}

async function updateConfig() {
  // Update config.json
  if (!fs.existsSync(configPath)) {
    console.log('No config.json found at:', configPath);
    console.log('Skipping config update.');
    return;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (!config.branding) {
      config.branding = {};
    }

    let updated = false;

    // Add headerAvatarPath if not present
    if (!config.branding.headerAvatarPath) {
      config.branding.headerAvatarPath = '/photos/avatar-header.webp';
      console.log('Added headerAvatarPath to config');
      updated = true;
    }

    // Add avatarCacheBust if not present
    if (!config.branding.avatarCacheBust) {
      config.branding.avatarCacheBust = Date.now();
      console.log('Added avatarCacheBust to config');
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log('Config updated:', configPath);
    } else {
      console.log('Config already up to date.');
    }

    console.log('\nMigration complete!');

  } catch (err) {
    console.error('Failed to update config:', err);
    process.exit(1);
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
