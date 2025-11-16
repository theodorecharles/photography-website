/**
 * Album Management Routes
 * Authenticated routes for creating, deleting albums and managing photos
 */

import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import multer from "multer";
import os from "os";
import sharp from "sharp";
import { csrfProtection } from "../security.js";
import { requireAuth, requireAdmin, requireManager } from '../auth/middleware.js';
import { 
  deleteAlbumMetadata, 
  deleteImageMetadata, 
  saveAlbum, 
  deleteAlbumState,
  setAlbumPublished,
  updateImageSortOrder,
  saveImageMetadata,
  updateAlbumSortOrder,
  getAlbumState,
  getDatabase,
  setAlbumFolder
} from "../database.js";
import { invalidateAlbumCache } from "./albums.js";
import { generateStaticJSONFiles } from "./static-json.js";
import { broadcastOptimizationUpdate, queueOptimizationJob } from "./optimization-stream.js";
import OpenAI from "openai";

const router = Router();
const execFileAsync = promisify(execFile);

// Apply CSRF protection to all routes in this router
router.use(csrfProtection);

/**
 * Generate AI title for a single image (async, broadcasts to optimization stream)
 */
async function generateAITitleForImageAsync(
  apiKey: string,
  album: string,
  filename: string,
  projectRoot: string,
  jobId: string
): Promise<void> {
  try {
    const openai = new OpenAI({ apiKey });
    const dataDir = process.env.DATA_DIR || path.join(projectRoot, 'data');
    const photosDir = path.join(dataDir, 'photos');
    const imagePath = path.join(photosDir, album, filename);

    if (!fs.existsSync(imagePath)) {
      throw new Error('Image not found');
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const extension = path.extname(filename).toLowerCase().substring(1);
    const mimeType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : `image/${extension}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Generate a concise, descriptive title for this image. The title should be 3-8 words and capture the essence of the image. Output ONLY the title, nothing else."
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

    const title = response.choices[0]?.message?.content?.trim() || '';

    // Update database
    saveImageMetadata(album, filename, title, null);

    // Broadcast success
    broadcastOptimizationUpdate(jobId, {
      album,
      filename,
      progress: 100,
      state: 'complete',
      title
    });

    // console.log(`✓ AI title generated for ${album}/${filename}: "${title}"`);
  } catch (error: any) {
    console.error(`AI title generation failed for ${album}/${filename}:`, error);
    broadcastOptimizationUpdate(jobId, {
      album,
      filename,
      progress: 100,
      state: 'complete',
      error: `AI error: ${error.message}`
    });
  }
}

/**
 * Generate AI title for a single image (legacy SSE version)
 */
async function generateAITitleForImage(
  apiKey: string,
  album: string,
  filename: string,
  projectRoot: string,
  res: Response
): Promise<void> {
  try {
    const openai = new OpenAI({ apiKey });
    
    // Path to the thumbnail image
    const thumbnailPath = path.join(projectRoot, 'optimized', 'thumbnail', album, filename);
    
    if (!fs.existsSync(thumbnailPath)) {
      res.write(`data: ${JSON.stringify({ 
        type: 'ai-error', 
        filename,
        error: 'Thumbnail not found' 
      })}\n\n`);
      return;
    }
    
    // Read the thumbnail image and convert to base64
    const imageBuffer = fs.readFileSync(thumbnailPath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = thumbnailPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    res.write(`data: ${JSON.stringify({ 
      type: 'ai-processing', 
      filename 
    })}\n\n`);
    
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
      res.write(`data: ${JSON.stringify({ 
        type: 'ai-error', 
        filename,
        error: 'Empty response from OpenAI' 
      })}\n\n`);
      return;
    }
    
    // Remove surrounding quotes if present
    title = title.replace(/^["']|["']$/g, '');
    title = title.trim();
    
    // Save to database
    saveImageMetadata(album, filename, title, null);
    
    res.write(`data: ${JSON.stringify({ 
      type: 'ai-complete', 
      filename,
      title 
    })}\n\n`);
    
  } catch (error: any) {
    console.error(`Error generating AI title for ${album}/${filename}:`, error);
    res.write(`data: ${JSON.stringify({ 
      type: 'ai-error', 
      filename,
      error: error.message || 'Failed to generate AI title' 
    })}\n\n`);
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Use temp directory for initial upload
      cb(null, os.tmpdir());
    },
    filename: (req, file, cb) => {
      // Keep original filename
      cb(null, file.originalname);
    }
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file
    fieldSize: 10 * 1024, // 10KB for field values (form data)
    fields: 10 // Maximum 10 non-file fields
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.match(/^image\/(jpeg|jpg|png|gif)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get the current directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sanitize album/photo name - allows letters, numbers, spaces, hyphens, and underscores
 */
const sanitizeName = (name: string): string | null => {
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return null;
  }
  // Allow alphanumeric characters, spaces, hyphens, and underscores
  if (!/^[a-zA-Z0-9 _-]+$/.test(name)) {
    return null;
  }
  return name.trim();
};

/**
 * Sanitize photo filename (allows dots for extensions)
 */
const sanitizePhotoName = (name: string): string | null => {
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return null;
  }
  if (!/^[a-zA-Z0-9_\-. ]+\.(jpg|jpeg|png|gif)$/i.test(name)) {
    return null;
  }
  return name;
};

/**
 * Create a new album
 */
router.post("/", requireManager, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, folder_id } = req.body;
    
    if (!name) {
      res.status(400).json({ error: 'Album name is required' });
      return;
    }

    const sanitizedName = sanitizeName(name);
    if (!sanitizedName) {
      res.status(400).json({ error: 'Invalid album name. Use only letters, numbers, spaces, hyphens, and underscores.' });
      return;
    }

    const photosDir = req.app.get("photosDir");
    const albumPath = path.join(photosDir, sanitizedName);

    if (fs.existsSync(albumPath)) {
      res.status(400).json({ error: 'Album already exists' });
      return;
    }

    // Create album directory
    fs.mkdirSync(albumPath, { recursive: true });

    // Create album in database as unpublished by default
    saveAlbum(sanitizedName, false);
    console.log(`✓ Created unpublished album: ${sanitizedName}`);
    
    // Set folder if provided
    if (folder_id !== undefined && folder_id !== null) {
      setAlbumFolder(sanitizedName, folder_id);
      console.log(`✓ Assigned album "${sanitizedName}" to folder ID: ${folder_id}`);
    }

    // Regenerate static JSON files
    const appRoot = req.app.get('appRoot');
    generateStaticJSONFiles(appRoot);

    res.json({ success: true, album: sanitizedName });
  } catch (error) {
    console.error('Error creating album:', error);
    res.status(500).json({ error: 'Failed to create album' });
  }
});

/**
 * Delete an album and all its photos
 */
router.delete("/:album", requireManager, async (req: Request, res: Response): Promise<void> => {
  try {
    const { album } = req.params;
    
    const sanitizedAlbum = sanitizeName(album);
    if (!sanitizedAlbum) {
      res.status(400).json({ error: 'Invalid album name' });
      return;
    }

    const photosDir = req.app.get("photosDir");
    const optimizedDir = req.app.get("optimizedDir");
    
    const albumPath = path.join(photosDir, sanitizedAlbum);
    
    // Delete from photos directory (if it exists)
    if (fs.existsSync(albumPath)) {
      fs.rmSync(albumPath, { recursive: true, force: true });
      console.log(`✓ Deleted directory: ${sanitizedAlbum}`);
    } else {
      console.log(`⚠ Directory not found (already deleted?): ${sanitizedAlbum}`);
    }

    // Delete from optimized directory (if exists)
    ['thumbnail', 'modal', 'download'].forEach(dir => {
      const optimizedPath = path.join(optimizedDir, dir, sanitizedAlbum);
      if (fs.existsSync(optimizedPath)) {
        fs.rmSync(optimizedPath, { recursive: true, force: true });
      }
    });

    // Delete all metadata for this album from database
    const deletedCount = deleteAlbumMetadata(sanitizedAlbum);
    console.log(`✓ Deleted ${deletedCount} metadata entries for album: ${sanitizedAlbum}`);

    // Delete album state from database
    const albumDeleted = deleteAlbumState(sanitizedAlbum);
    if (albumDeleted) {
      console.log(`✓ Deleted album state for: ${sanitizedAlbum}`);
    } else {
      console.log(`⚠ Album state not found in database: ${sanitizedAlbum}`);
    }

    // Invalidate cache for this album
    invalidateAlbumCache(sanitizedAlbum);

    // Regenerate static JSON files
    const appRoot = req.app.get('appRoot');
    generateStaticJSONFiles(appRoot);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ error: 'Failed to delete album' });
  }
});

/**
 * Delete a photo from an album
 */
router.delete("/:album/photos/:photo", requireManager, async (req: Request, res: Response): Promise<void> => {
  try {
    const { album, photo } = req.params;
    
    const sanitizedAlbum = sanitizeName(album);
    const sanitizedPhoto = sanitizePhotoName(photo);
    
    if (!sanitizedAlbum || !sanitizedPhoto) {
      res.status(400).json({ error: 'Invalid album or photo name' });
      return;
    }

    const photosDir = req.app.get("photosDir");
    const optimizedDir = req.app.get("optimizedDir");
    
    const photoPath = path.join(photosDir, sanitizedAlbum, sanitizedPhoto);
    
    if (!fs.existsSync(photoPath)) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }

    // Delete from photos directory
    fs.unlinkSync(photoPath);

    // Delete from optimized directories
    ['thumbnail', 'modal', 'download'].forEach(dir => {
      const optimizedPath = path.join(optimizedDir, dir, sanitizedAlbum, sanitizedPhoto);
      if (fs.existsSync(optimizedPath)) {
        fs.unlinkSync(optimizedPath);
      }
    });

    // Delete metadata from database
    const deleted = deleteImageMetadata(sanitizedAlbum, sanitizedPhoto);
    if (deleted) {
      console.log(`✓ Deleted metadata for photo: ${sanitizedAlbum}/${sanitizedPhoto}`);
    }

    // Invalidate cache for this album
    invalidateAlbumCache(sanitizedAlbum);

    // Regenerate static JSON files
    const appRoot = req.app.get('appRoot');
    generateStaticJSONFiles(appRoot);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

/**
 * Upload a single photo to an album with SSE progress updates
 */
router.post("/:album/upload", requireManager, upload.single('photo'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { album } = req.params;
    
    const sanitizedAlbum = sanitizeName(album);
    if (!sanitizedAlbum) {
      res.status(400).json({ error: 'Invalid album name' });
      return;
    }

    const file = req.file as Express.Multer.File;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const photosDir = req.app.get("photosDir");
    const albumPath = path.join(photosDir, sanitizedAlbum);
    
    if (!fs.existsSync(albumPath)) {
      res.status(404).json({ error: 'Album not found' });
      return;
    }

    const destPath = path.join(albumPath, file.originalname);
    
        try {
          // Use sharp to auto-rotate based on EXIF orientation (fixes iPhone photos)
          // This physically rotates the pixels and removes the EXIF orientation tag
          // Set a timeout to prevent hanging on corrupt images
          const sharpTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Sharp processing timeout')), 120000) // 2 minute timeout
          );
          
          await Promise.race([
            sharp(file.path)
              .rotate() // Auto-rotate based on EXIF
              .toFile(destPath),
            sharpTimeout
          ]);
      
      // Clean up temp file
      fs.unlinkSync(file.path);
    } catch (err: any) {
      console.error(`[Upload] ✗ Failed to process ${file.originalname}:`, err.message);
      // Clean up temp file if processing failed
      try {
        fs.unlinkSync(file.path);
      } catch (cleanupErr) {
        // Ignore cleanup errors
      }
      res.status(500).json({ error: `Failed to save file: ${err.message}` });
      return;
    }

    // Send success response immediately (don't keep connection open)
    res.json({ success: true, filename: file.originalname });

    // Queue optimization job (will process sequentially)
    const projectRoot = path.resolve(__dirname, '../../../');
    const scriptPath = path.join(projectRoot, 'scripts', 'optimize_new_image.js');
    const jobId = `${sanitizedAlbum}/${file.originalname}`;

    if (fs.existsSync(scriptPath)) {
      queueOptimizationJob(
        jobId,
        sanitizedAlbum,
        file.originalname,
        scriptPath,
        projectRoot,
        // onProgress callback
        (progress: number) => {
          broadcastOptimizationUpdate(jobId, {
            album: sanitizedAlbum,
            filename: file.originalname,
            progress,
            state: 'optimizing'
          });
        },
        // onComplete callback
        async () => {
          // Add image to database (with null title initially)
          saveImageMetadata(sanitizedAlbum, file.originalname, null, null);
          
          // Note: We don't invalidate cache here to avoid spam during batch uploads
          // Cache will be invalidated once at the end via static JSON regeneration
          
          broadcastOptimizationUpdate(jobId, {
            album: sanitizedAlbum,
            filename: file.originalname,
            progress: 100,
            state: 'complete'
          });
          
          // Check if auto-generate AI titles is enabled
          try {
            const dataDir = process.env.DATA_DIR || path.join(projectRoot, 'data');
            const configPath = path.join(dataDir, 'config.json');
            const configData = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData);
            
            if (config.ai?.autoGenerateTitlesOnUpload && config.openai?.apiKey) {
              broadcastOptimizationUpdate(jobId, {
                album: sanitizedAlbum,
                filename: file.originalname,
                progress: 100,
                state: 'generating-title'
              });
              
              // Generate AI title (without SSE streaming to this response)
              await generateAITitleForImageAsync(
                config.openai.apiKey,
                sanitizedAlbum,
                file.originalname,
                projectRoot,
                jobId
              );
            }
          } catch (err) {
            console.error('Error with AI title generation:', err);
          }
          
          // Don't regenerate static JSON after every single image - too expensive!
          // It will be regenerated once when the upload batch finishes
          // const appRoot = req.app.get('appRoot');
          // generateStaticJSONFiles(appRoot);
        },
        // onError callback
        (error: string) => {
          broadcastOptimizationUpdate(jobId, {
            album: sanitizedAlbum,
            filename: file.originalname,
            progress: 0,
            state: 'error',
            error
          });
        }
      );
    } else {
      broadcastOptimizationUpdate(jobId, {
        album: sanitizedAlbum,
        filename: file.originalname,
        progress: 0,
        state: 'error',
        error: 'Optimization script not found'
      });
    }
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

/**
 * Rename an album (updates database and moves directories)
 */
router.patch("/:album/rename", requireManager, async (req: Request, res: Response): Promise<void> => {
  try {
    const { album } = req.params;
    const { newName } = req.body;
    
    const sanitizedOldName = sanitizeName(album);
    if (!sanitizedOldName) {
      res.status(400).json({ error: 'Invalid album name' });
      return;
    }

    if (!newName || typeof newName !== 'string') {
      res.status(400).json({ error: 'New album name is required' });
      return;
    }

    const sanitizedNewName = sanitizeName(newName);
    if (!sanitizedNewName) {
      res.status(400).json({ error: 'Invalid new album name. Use only letters, numbers, spaces, hyphens, and underscores.' });
      return;
    }

    // Check if old album name equals new album name
    if (sanitizedOldName === sanitizedNewName) {
      res.status(400).json({ error: 'New name must be different from current name' });
      return;
    }

    const photosDir = req.app.get("photosDir");
    const optimizedDir = req.app.get("optimizedDir");
    
    const oldAlbumPath = path.join(photosDir, sanitizedOldName);
    const newAlbumPath = path.join(photosDir, sanitizedNewName);
    
    // Check if old album exists
    if (!fs.existsSync(oldAlbumPath)) {
      res.status(404).json({ error: 'Album not found' });
      return;
    }

    // Check if new album name already exists
    if (fs.existsSync(newAlbumPath)) {
      res.status(400).json({ error: 'An album with that name already exists' });
      return;
    }

    // Get album state before renaming
    const albumState = getAlbumState(sanitizedOldName);
    if (!albumState) {
      res.status(404).json({ error: 'Album not found in database' });
      return;
    }

    // Update database FIRST before touching filesystem
    // This way if DB update fails, filesystem is unchanged
    const db = getDatabase();
    
    // Start transaction with foreign keys temporarily disabled
    // This is needed because share_links has FK to albums(name) without ON UPDATE CASCADE
    const transaction = db.transaction(() => {
      // Temporarily disable foreign keys for this transaction
      db.pragma('foreign_keys = OFF');
      
      // Update albums table
      const result = db.prepare(`
        UPDATE albums 
        SET name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE name = ?
      `).run(sanitizedNewName, sanitizedOldName);
      
      if (result.changes === 0) {
        throw new Error('Album not found in database');
      }
      
      // Update image_metadata table
      db.prepare(`
        UPDATE image_metadata 
        SET album = ?, updated_at = CURRENT_TIMESTAMP
        WHERE album = ?
      `).run(sanitizedNewName, sanitizedOldName);
      
      // Update share_links table
      db.prepare(`
        UPDATE share_links 
        SET album = ?
        WHERE album = ?
      `).run(sanitizedNewName, sanitizedOldName);
      
      // Re-enable foreign keys
      db.pragma('foreign_keys = ON');
    });
    
    transaction();
    console.log(`✓ Updated database: ${sanitizedOldName} -> ${sanitizedNewName}`);

    // Now rename filesystem directories
    // Rename photos directory
    fs.renameSync(oldAlbumPath, newAlbumPath);
    console.log(`✓ Renamed photos directory: ${sanitizedOldName} -> ${sanitizedNewName}`);

    // Rename optimized directories
    ['thumbnail', 'modal', 'download'].forEach(dir => {
      const oldOptimizedPath = path.join(optimizedDir, dir, sanitizedOldName);
      const newOptimizedPath = path.join(optimizedDir, dir, sanitizedNewName);
      if (fs.existsSync(oldOptimizedPath)) {
        fs.renameSync(oldOptimizedPath, newOptimizedPath);
        console.log(`✓ Renamed optimized/${dir}: ${sanitizedOldName} -> ${sanitizedNewName}`);
      }
    });

    // Invalidate cache for both old and new album names
    invalidateAlbumCache(sanitizedOldName);
    invalidateAlbumCache(sanitizedNewName);

    // Regenerate static JSON files
    const appRoot = req.app.get('appRoot');
    generateStaticJSONFiles(appRoot);

    res.json({ 
      success: true, 
      oldName: sanitizedOldName,
      newName: sanitizedNewName
    });
  } catch (error) {
    console.error('Error renaming album:', error);
    res.status(500).json({ error: 'Failed to rename album' });
  }
});

/**
 * Toggle album published state
 */
router.patch("/:album/publish", requireManager, async (req: Request, res: Response): Promise<void> => {
  try {
    const { album } = req.params;
    const { published } = req.body;
    
    const sanitizedAlbum = sanitizeName(album);
    if (!sanitizedAlbum) {
      res.status(400).json({ error: 'Invalid album name' });
      return;
    }

    if (typeof published !== 'boolean') {
      res.status(400).json({ error: 'Published state must be a boolean' });
      return;
    }

    const photosDir = req.app.get("photosDir");
    const albumPath = path.join(photosDir, sanitizedAlbum);
    
    if (!fs.existsSync(albumPath)) {
      res.status(404).json({ error: 'Album not found' });
      return;
    }

    // Update or create album state
    saveAlbum(sanitizedAlbum, published);
    console.log(`✓ Set album "${sanitizedAlbum}" published state to: ${published}`);
    
    // Verify the state was saved correctly
    const albumState = getAlbumState(sanitizedAlbum);
    if (!albumState) {
      console.error(`✗ Failed to save album state for "${sanitizedAlbum}"`);
      res.status(500).json({ error: 'Failed to save album state' });
      return;
    }
    console.log(`✓ Verified album state in DB: published=${albumState.published}`);

    // Regenerate static JSON files
    console.log(`[Publish] Regenerating static JSON files...`);
    const appRoot = req.app.get('appRoot');
    const result = generateStaticJSONFiles(appRoot);
    if (result.success) {
      console.log(`[Publish] ✓ Static JSON regenerated (${result.albumCount} albums)`);
    } else {
      console.error(`[Publish] ✗ Failed to regenerate static JSON:`, result.error);
    }

    res.json({ 
      success: true, 
      album: sanitizedAlbum,
      published 
    });
  } catch (error) {
    console.error('Error updating album published state:', error);
    res.status(500).json({ error: 'Failed to update album published state' });
  }
});

/**
 * Trigger optimization for all albums
 */
router.post("/:album/optimize", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { album } = req.params;
    
    const sanitizedAlbum = sanitizeName(album);
    if (!sanitizedAlbum) {
      res.status(400).json({ error: 'Invalid album name' });
      return;
    }

    // Get project root (two levels up from backend/src)
    const projectRoot = path.resolve(__dirname, '../../../');
    const scriptPath = path.join(projectRoot, 'scripts', 'optimize_all_images.js');

    if (!fs.existsSync(scriptPath)) {
      res.status(500).json({ error: 'Optimization script not found' });
      return;
    }

    // Run optimization script in the background using execFile to prevent command injection
    // Don't wait for it to complete
    const photosDir = req.app.get("photosDir");
    const albumPath = path.join(photosDir, sanitizedAlbum);
    
    execFile('node', [scriptPath, albumPath], (error, stdout, stderr) => {
      if (error) {
        console.error('Optimization error:', error);
      } else {
        console.log('Optimization complete for album:', sanitizedAlbum);
      }
    });

    res.json({ 
      success: true, 
      message: 'Optimization started in background' 
    });
  } catch (error) {
    console.error('Error triggering optimization:', error);
    res.status(500).json({ error: 'Failed to trigger optimization' });
  }
});

/**
 * Update photo order in an album
 */
router.post("/:album/photo-order", requireManager, async (req: Request, res: Response): Promise<void> => {
  try {
    const { album } = req.params;
    const { photoOrder } = req.body;
    
    const sanitizedAlbum = sanitizeName(album);
    if (!sanitizedAlbum) {
      res.status(400).json({ error: 'Invalid album name' });
      return;
    }

    // Validate photoOrder array
    if (!Array.isArray(photoOrder)) {
      res.status(400).json({ error: 'photoOrder must be an array' });
      return;
    }

    // Sanitize and validate each photo filename
    const imageOrders = photoOrder.map((item, index) => {
      const sanitizedFilename = sanitizePhotoName(item.filename);
      if (!sanitizedFilename) {
        throw new Error(`Invalid photo filename: ${item.filename}`);
      }
      return {
        filename: sanitizedFilename,
        sort_order: index
      };
    });

    // Update the sort order in the database
    const success = updateImageSortOrder(sanitizedAlbum, imageOrders);
    
    if (!success) {
      res.status(500).json({ error: 'Failed to update photo order' });
      return;
    }

    // Invalidate cache for this album
    invalidateAlbumCache(sanitizedAlbum);
    
    // Regenerate static JSON files
    const appRoot = req.app.get('appRoot');
    generateStaticJSONFiles(appRoot);
    
    console.log(`✓ Updated photo order for album: ${sanitizedAlbum} (${imageOrders.length} photos)`);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating photo order:', error);
    res.status(500).json({ error: 'Failed to update photo order' });
  }
});

/**
 * Update album sort order
 */
router.put('/sort-order', requireManager, async (req: Request, res: Response): Promise<void> => {
  try {
    const { albumOrders } = req.body;
    
    if (!Array.isArray(albumOrders)) {
      res.status(400).json({ error: 'Invalid album orders data' });
      return;
    }
    
    // Validate each entry has name and sort_order
    for (const entry of albumOrders) {
      if (typeof entry.name !== 'string' || typeof entry.sort_order !== 'number') {
        res.status(400).json({ error: 'Each album must have name and sort_order' });
        return;
      }
    }
    
    const success = updateAlbumSortOrder(albumOrders);
    
    if (success) {
      console.log(`✓ Updated sort order for ${albumOrders.length} albums`);
      
      // Regenerate static JSON files
      const appRoot = req.app.get('appRoot');
      generateStaticJSONFiles(appRoot);
      
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to update album order' });
    }
  } catch (error) {
    console.error('Error updating album order:', error);
    res.status(500).json({ error: 'Failed to update album order' });
  }
});

/**
 * Move album to folder (or remove from folder)
 */
router.put('/:albumName/move', requireManager, async (req: Request, res: Response): Promise<void> => {
  try {
    const { albumName } = req.params;
    const { folderName, published } = req.body;
    
    if (!albumName) {
      res.status(400).json({ error: 'Album name is required' });
      return;
    }
    
    // Get folder ID if folderName is provided
    let folderId: number | null = null;
    if (folderName) {
      const db = getDatabase();
      const folder = db.prepare('SELECT id FROM album_folders WHERE name = ?').get(folderName) as { id: number } | undefined;
      if (!folder) {
        res.status(404).json({ error: 'Folder not found' });
        return;
      }
      folderId = folder.id;
    }
    
    // Move album to folder (or remove from folder if folderId is null)
    const success = setAlbumFolder(albumName, folderId);
    
    if (!success) {
      res.status(500).json({ error: 'Failed to move album' });
      return;
    }
    
    // Update published status if provided
    if (typeof published === 'boolean') {
      setAlbumPublished(albumName, published);
    }
    
    console.log(`✓ Moved album "${albumName}" to folder ${folderName || 'none'}`);
    
    // Regenerate static JSON files
    const appRoot = req.app.get('appRoot');
    generateStaticJSONFiles(appRoot);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error moving album:', error);
    res.status(500).json({ error: 'Failed to move album' });
  }
});

export default router;

