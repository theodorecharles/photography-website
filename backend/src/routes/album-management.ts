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
import { csrfProtection } from "../security.js";
import { deleteAlbumMetadata, deleteImageMetadata } from "../database.js";

const router = Router();
const execFileAsync = promisify(execFile);

// Apply CSRF protection to all routes in this router
router.use(csrfProtection);

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
 * Authentication middleware
 */
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

/**
 * Sanitize album/photo name
 */
const sanitizeName = (name: string): string | null => {
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return null;
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return null;
  }
  return name;
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
router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    
    if (!name) {
      res.status(400).json({ error: 'Album name is required' });
      return;
    }

    const sanitizedName = sanitizeName(name);
    if (!sanitizedName) {
      res.status(400).json({ error: 'Invalid album name. Use only letters, numbers, hyphens, and underscores.' });
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

    res.json({ success: true, album: sanitizedName });
  } catch (error) {
    console.error('Error creating album:', error);
    res.status(500).json({ error: 'Failed to create album' });
  }
});

/**
 * Delete an album and all its photos
 */
router.delete("/:album", requireAuth, async (req: Request, res: Response): Promise<void> => {
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
    
    if (!fs.existsSync(albumPath)) {
      res.status(404).json({ error: 'Album not found' });
      return;
    }

    // Delete from photos directory
    fs.rmSync(albumPath, { recursive: true, force: true });

    // Delete from optimized directory
    ['thumbnail', 'modal', 'download'].forEach(dir => {
      const optimizedPath = path.join(optimizedDir, dir, sanitizedAlbum);
      if (fs.existsSync(optimizedPath)) {
        fs.rmSync(optimizedPath, { recursive: true, force: true });
      }
    });

    // Delete all metadata for this album from database
    const deletedCount = deleteAlbumMetadata(sanitizedAlbum);
    console.log(`✓ Deleted ${deletedCount} metadata entries for album: ${sanitizedAlbum}`);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ error: 'Failed to delete album' });
  }
});

/**
 * Delete a photo from an album
 */
router.delete("/:album/photos/:photo", requireAuth, async (req: Request, res: Response): Promise<void> => {
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

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

/**
 * Upload a single photo to an album with SSE progress updates
 */
router.post("/:album/upload", requireAuth, upload.single('photo'), async (req: Request, res: Response): Promise<void> => {
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
      // Use read + write to handle symlinks and cross-filesystem moves
      const data = fs.readFileSync(file.path);
      fs.writeFileSync(destPath, data);
      fs.unlinkSync(file.path);
    } catch (err) {
      console.error(`Failed to move file ${file.originalname}:`, err);
      // Clean up temp file if copy failed
      try {
        fs.unlinkSync(file.path);
      } catch (cleanupErr) {
        // Ignore cleanup errors
      }
      res.status(500).json({ error: 'Failed to save file' });
      return;
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial success message
    res.write(`data: ${JSON.stringify({ type: 'uploaded', filename: file.originalname })}\n\n`);

    // Trigger optimization with SSE progress streaming
    const projectRoot = path.resolve(__dirname, '../../../');
    const scriptPath = path.join(projectRoot, 'optimize_new_image.sh');

    if (fs.existsSync(scriptPath)) {
      const child = spawn('bash', [scriptPath, sanitizedAlbum, file.originalname], { 
        cwd: projectRoot
      });

      // Stream stdout for progress updates
      child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            // Check for PROGRESS: messages
            if (line.startsWith('PROGRESS:')) {
              const parts = line.substring(9).split(':');
              const progress = parseInt(parts[0]);
              const message = parts.slice(1).join(':');
              res.write(`data: ${JSON.stringify({ 
                type: 'progress', 
                progress, 
                message,
                filename: file.originalname 
              })}\n\n`);
            }
          }
        });
      });

      // Handle completion
      child.on('close', (code) => {
        if (code === 0) {
          res.write(`data: ${JSON.stringify({ 
            type: 'complete', 
            filename: file.originalname 
          })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            error: 'Optimization failed',
            filename: file.originalname 
          })}\n\n`);
        }
        res.end();
      });

      // Handle errors
      child.on('error', (error) => {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          error: error.message,
          filename: file.originalname 
        })}\n\n`);
        res.end();
      });
    } else {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: 'Optimization script not found',
        filename: file.originalname 
      })}\n\n`);
      res.end();
    }
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

/**
 * Trigger optimization for all albums
 */
router.post("/:album/optimize", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { album } = req.params;
    
    const sanitizedAlbum = sanitizeName(album);
    if (!sanitizedAlbum) {
      res.status(400).json({ error: 'Invalid album name' });
      return;
    }

    // Get project root (two levels up from backend/src)
    const projectRoot = path.resolve(__dirname, '../../../');
    const scriptPath = path.join(projectRoot, 'optimize_all_images.sh');

    if (!fs.existsSync(scriptPath)) {
      res.status(500).json({ error: 'Optimization script not found' });
      return;
    }

    // Run optimization script in the background using execFile to prevent command injection
    // Don't wait for it to complete
    const photosDir = req.app.get("photosDir");
    const albumPath = path.join(photosDir, sanitizedAlbum);
    
    execFile('bash', [scriptPath, albumPath], (error, stdout, stderr) => {
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

export default router;

