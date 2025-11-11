/**
 * Preview Grid Generator
 * Creates 2x2 grid images from album photos for social media previews
 */

import { Router, Request, Response } from "express";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { getShareLinkBySecret, isShareLinkExpired } from "../database.js";

const router = Router();

interface PhotoGridOptions {
  photosDir: string;
  albumName: string;
  photos: Array<{ filename: string }>;
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
    selectedPhotos.map(async (photo) => {
      const thumbnailPath = path.join(photosDir, "../optimized/thumbnail", albumName, photo.filename);
      const modalPath = path.join(photosDir, "../optimized/modal", albumName, photo.filename);
      const originalPath = path.join(photosDir, albumName, photo.filename);
      
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
    })
  );
  
  // If less than 4 photos, fill remaining cells with black
  while (photoBuffers.length < 4) {
    photoBuffers.push(
      await (sharp as any)({
        create: {
          width: cellWidth,
          height: cellHeight,
          channels: 3,
          background: { r: 20, g: 20, b: 20 }
        }
      }).jpeg().toBuffer()
    );
  }
  
  // Create 2x2 grid using sharp composite
  const grid = await (sharp as any)({
    create: {
      width: gridWidth,
      height: gridHeight,
      channels: 3,
      background: { r: 0, g: 0, b: 0 }
    }
  })
    .composite([
      { input: photoBuffers[0], left: 0, top: 0 },
      { input: photoBuffers[1], left: cellWidth, top: 0 },
      { input: photoBuffers[2], left: 0, top: cellHeight },
      { input: photoBuffers[3], left: cellWidth, top: cellHeight },
    ])
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
