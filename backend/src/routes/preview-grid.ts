/**
 * Preview Grid Generator
 * Creates 2x2 grid images from album photos for social media previews
 */

import { Router, Request, Response } from "express";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { getShareLinkBySecret, isShareLinkExpired, getImagesForHomepage } from "../database.js";
import { DATA_DIR } from "../config.js";

const router = Router();

/**
 * Create a circular avatar with white border
 */
async function createCircularAvatar(avatarPath: string, size: number): Promise<Buffer> {
  const borderWidth = 6;
  const innerSize = size - (borderWidth * 2);
  
  // Create circular mask
  const circleMask = Buffer.from(
    `<svg width="${innerSize}" height="${innerSize}">
      <circle cx="${innerSize / 2}" cy="${innerSize / 2}" r="${innerSize / 2}" fill="white"/>
    </svg>`
  );
  
  // Process avatar: resize and apply circular mask
  const circularAvatar = await sharp(avatarPath)
    .resize(innerSize, innerSize, { fit: 'cover', position: 'center' })
    .composite([{
      input: circleMask,
      blend: 'dest-in'
    }])
    .toBuffer();
  
  // Create white circle border background
  const whiteBorder = Buffer.from(
    `<svg width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
    </svg>`
  );
  
  // Composite avatar on white border
  const avatarWithBorder = await sharp(whiteBorder)
    .composite([{
      input: circularAvatar,
      left: borderWidth,
      top: borderWidth
    }])
    .png()
    .toBuffer();
  
  return avatarWithBorder;
}

/**
 * Get avatar path from config
 */
function getAvatarPath(photosDir: string): string | null {
  try {
    const configPath = path.join(DATA_DIR, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const avatarPath = config.branding?.avatarPath || '/photos/avatar.png';
    
    // Convert /photos/avatar.png to actual filesystem path
    const fsAvatarPath = path.join(photosDir, avatarPath.replace('/photos/', ''));
    
    if (fs.existsSync(fsAvatarPath)) {
      return fsAvatarPath;
    }
  } catch (error) {
    console.error('Error getting avatar path:', error);
  }
  
  return null;
}

interface PhotoGridOptions {
  photosDir: string;
  albumName: string;
  photos: Array<{ filename: string }>;
}

/**
 * Load and resize a single photo for grid cell
 */
async function loadPhotoForGrid(
  photosDir: string,
  albumName: string,
  filename: string,
  cellWidth: number,
  cellHeight: number
): Promise<Buffer> {
  const thumbnailPath = path.join(photosDir, "../optimized/thumbnail", albumName, filename);
  const modalPath = path.join(photosDir, "../optimized/modal", albumName, filename);
  const originalPath = path.join(photosDir, albumName, filename);
  
  // Try thumbnail first, fall back to modal, then original
  let imagePath = thumbnailPath;
  if (!fs.existsSync(thumbnailPath)) {
    imagePath = fs.existsSync(modalPath) ? modalPath : originalPath;
  }
  
  if (!fs.existsSync(imagePath)) {
    // Return a blank image if file doesn't exist
    return (sharp as any)({
      create: {
        width: cellWidth,
        height: cellHeight,
        channels: 3,
        background: { r: 40, g: 40, b: 40 }
      }
    }).jpeg().toBuffer();
  }
  
  // Resize and crop to fit cell
  return sharp(imagePath)
    .resize(cellWidth, cellHeight, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

/**
 * Create a blank cell for grid
 */
async function createBlankCell(cellWidth: number, cellHeight: number): Promise<Buffer> {
  return (sharp as any)({
    create: {
      width: cellWidth,
      height: cellHeight,
      channels: 3,
      background: { r: 20, g: 20, b: 20 }
    }
  }).jpeg().toBuffer();
}

/**
 * Add avatar overlay to composite inputs
 */
async function addAvatarOverlay(
  compositeInputs: Array<{ input: Buffer; left: number; top: number }>,
  photosDir: string,
  gridWidth: number,
  gridHeight: number
): Promise<void> {
  const avatarPath = getAvatarPath(photosDir);
  if (!avatarPath) {
    return;
  }
  
  try {
    const avatarSize = 120;
    const avatarBuffer = await createCircularAvatar(avatarPath, avatarSize);
    
    // Position in bottom-left corner with 20px padding
    compositeInputs.push({
      input: avatarBuffer,
      left: 20,
      top: gridHeight - avatarSize - 20
    });
  } catch (error) {
    console.error('Error adding avatar overlay:', error);
    // Continue without avatar
  }
}

/**
 * Generate a 2x2 grid image from up to 4 photos
 */
async function generatePhotoGrid(options: PhotoGridOptions): Promise<Buffer> {
  const { photosDir, albumName, photos } = options;
  
  // Take first 4 photos
  const photoCount = Math.min(photos.length, 4);
  const selectedPhotos = photos.slice(0, photoCount);
  
  // Grid dimensions: 1200x630 for OG image (standard social media size)
  const gridWidth = 1200;
  const gridHeight = 630;
  const cellWidth = gridWidth / 2;
  const cellHeight = gridHeight / 2;
  
  // Load and resize photos
  const photoBuffers = await Promise.all(
    selectedPhotos.map(photo => 
      loadPhotoForGrid(photosDir, albumName, photo.filename, cellWidth, cellHeight)
    )
  );
  
  // If less than 4 photos, fill remaining cells with black
  while (photoBuffers.length < 4) {
    photoBuffers.push(await createBlankCell(cellWidth, cellHeight));
  }
  
  // Create composite layers
  const compositeInputs = [
    { input: photoBuffers[0], left: 0, top: 0 },
    { input: photoBuffers[1], left: cellWidth, top: 0 },
    { input: photoBuffers[2], left: 0, top: cellHeight },
    { input: photoBuffers[3], left: cellWidth, top: cellHeight },
  ];
  
  // Add avatar overlay
  await addAvatarOverlay(compositeInputs, photosDir, gridWidth, gridHeight);
  
  // Create 2x2 grid using sharp composite
  const grid = await (sharp as any)({
    create: {
      width: gridWidth,
      height: gridHeight,
      channels: 3,
      background: { r: 0, g: 0, b: 0 }
    }
  })
    .composite(compositeInputs)
    .jpeg({ quality: 90 })
    .toBuffer();
  
  return grid;
}

/**
 * GET /api/preview-grid/album/:albumName
 * Generate a 2x2 grid preview for a regular album
 */
router.get("/album/:albumName", async (req: Request, res: Response): Promise<void> => {
  try {
    const { albumName } = req.params;
    const photosDir = req.app.get("photosDir");
    
    const albumPath = path.join(photosDir, albumName);
    
    if (!fs.existsSync(albumPath) || !fs.statSync(albumPath).isDirectory()) {
      res.status(404).json({ error: "Album not found" });
      return;
    }
    
    // Get photos from album
    const files = fs.readdirSync(albumPath)
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
      .map(filename => ({ filename }));
    
    if (files.length === 0) {
      res.status(404).json({ error: "No photos in album" });
      return;
    }
    
    // Generate grid
    const gridBuffer = await generatePhotoGrid({
      photosDir,
      albumName,
      photos: files
    });
    
    // Set cache headers (cache for 1 hour)
    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600',
      'ETag': `"grid-${albumName}-${files.length}"`,
    });
    
    res.send(gridBuffer);
  } catch (error) {
    console.error("Error generating album preview grid:", error);
    res.status(500).json({ error: "Failed to generate preview grid" });
  }
});

/**
 * GET /api/preview-grid/homepage
 * Generate a 2x2 grid preview for the homepage
 */
router.get("/homepage", async (req: Request, res: Response): Promise<void> => {
  try {
    const photosDir = req.app.get("photosDir");
    
    // Get images from homepage (from published albums that show on homepage)
    const images = getImagesForHomepage();
    
    if (images.length === 0) {
      res.status(404).json({ error: "No photos available for homepage" });
      return;
    }
    
    // Take first 4 photos
    const selectedPhotos = images.slice(0, 4);
    
    // Grid dimensions: 1200x630 for OG image (standard social media size)
    const gridWidth = 1200;
    const gridHeight = 630;
    const cellWidth = gridWidth / 2;
    const cellHeight = gridHeight / 2;
    
    // Load photos from different albums
    const photoBuffers = await Promise.all(
      selectedPhotos.map(img => 
        loadPhotoForGrid(photosDir, img.album, img.filename, cellWidth, cellHeight)
      )
    );
    
    // If less than 4 photos, fill remaining cells with black
    while (photoBuffers.length < 4) {
      photoBuffers.push(await createBlankCell(cellWidth, cellHeight));
    }
    
    // Create composite layers
    const compositeInputs = [
      { input: photoBuffers[0], left: 0, top: 0 },
      { input: photoBuffers[1], left: cellWidth, top: 0 },
      { input: photoBuffers[2], left: 0, top: cellHeight },
      { input: photoBuffers[3], left: cellWidth, top: cellHeight },
    ];
    
    // Add avatar overlay
    await addAvatarOverlay(compositeInputs, photosDir, gridWidth, gridHeight);
    
    // Create 2x2 grid
    const grid = await (sharp as any)({
      create: {
        width: gridWidth,
        height: gridHeight,
        channels: 3,
        background: { r: 0, g: 0, b: 0 }
      }
    })
      .composite(compositeInputs)
      .jpeg({ quality: 90 })
      .toBuffer();
    
    // Set cache headers (cache for 1 hour)
    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600',
      'ETag': `"grid-homepage-${images.length}"`,
    });
    
    res.send(grid);
  } catch (error) {
    console.error("Error generating homepage preview grid:", error);
    res.status(500).json({ error: "Failed to generate preview grid" });
  }
});

/**
 * GET /api/preview-grid/shared/:secretKey
 * Generate a 2x2 grid preview for a shared album
 */
router.get("/shared/:secretKey", async (req: Request, res: Response): Promise<void> => {
  try {
    const { secretKey } = req.params;
    
    // Validate secret key format
    if (!secretKey || !/^[a-f0-9]{64}$/i.test(secretKey)) {
      res.status(404).json({ error: "Invalid share link" });
      return;
    }
    
    // Look up share link
    const shareLink = getShareLinkBySecret(secretKey);
    
    if (!shareLink) {
      res.status(404).json({ error: "Share link not found" });
      return;
    }
    
    // Check if expired
    if (isShareLinkExpired(shareLink)) {
      res.status(410).json({ error: "Share link has expired" });
      return;
    }
    
    const albumName = shareLink.album;
    const photosDir = req.app.get("photosDir");
    const albumPath = path.join(photosDir, albumName);
    
    if (!fs.existsSync(albumPath) || !fs.statSync(albumPath).isDirectory()) {
      res.status(404).json({ error: "Album not found" });
      return;
    }
    
    // Get photos from album
    const files = fs.readdirSync(albumPath)
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
      .map(filename => ({ filename }));
    
    if (files.length === 0) {
      res.status(404).json({ error: "No photos in album" });
      return;
    }
    
    // Generate grid
    const gridBuffer = await generatePhotoGrid({
      photosDir,
      albumName,
      photos: files
    });
    
    // Set cache headers (cache for 1 hour)
    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600',
      'ETag': `"grid-shared-${secretKey}"`,
    });
    
    res.send(gridBuffer);
  } catch (error) {
    console.error("Error generating shared album preview grid:", error);
    res.status(500).json({ error: "Failed to generate preview grid" });
  }
});

export default router;
