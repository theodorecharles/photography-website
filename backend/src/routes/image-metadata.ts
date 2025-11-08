/**
 * Image Metadata Routes
 * Provides endpoints for managing image titles and descriptions
 */

import express from 'express';
import { createRequire } from 'module';
import { csrfProtection } from '../security.js';

const require = createRequire(import.meta.url);

// Lazy import database functions to avoid loading better-sqlite3 at module init
let dbFunctions: any = null;
const getDbFunctions = async () => {
  if (!dbFunctions) {
    dbFunctions = await import('../database.js');
  }
  return dbFunctions;
};

const router = express.Router();

// Apply CSRF protection to all routes
router.use(csrfProtection);

/**
 * Middleware to check if user is authenticated (for write operations)
 */
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * GET /api/image-metadata/:album/:filename
 * Get metadata for a specific image
 */
router.get('/:album/:filename', async (req, res) => {
  try {
    const { album, filename } = req.params;
    const db = await getDbFunctions();
    const metadata = db.getImageMetadata(album, filename);
    
    if (!metadata) {
      res.status(404).json({ error: 'Metadata not found' });
      return;
    }
    
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching image metadata:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

/**
 * GET /api/image-metadata/album/:album
 * Get all metadata for an album
 */
router.get('/album/:album', async (req, res) => {
  try {
    const { album } = req.params;
    const db = await getDbFunctions();
    const metadata = db.getAlbumMetadata(album);
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching album metadata:', error);
    res.status(500).json({ error: 'Failed to fetch album metadata' });
  }
});

/**
 * GET /api/image-metadata/all
 * Get all image metadata
 */
router.get('/all', async (req, res) => {
  try {
    const db = await getDbFunctions();
    const metadata = db.getAllMetadata();
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching all metadata:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

/**
 * POST /api/image-metadata
 * Save or update image metadata
 */
router.post('/', requireAuth, express.json(), async (req, res) => {
  try {
    const { album, filename, title, description } = req.body;
    
    if (!album || !filename) {
      res.status(400).json({ error: 'Album and filename are required' });
      return;
    }
    
    const db = await getDbFunctions();
    db.saveImageMetadata(album, filename, title || null, description || null);
    
    res.json({ 
      success: true, 
      message: 'Metadata saved successfully' 
    });
  } catch (error) {
    console.error('Error saving image metadata:', error);
    res.status(500).json({ error: 'Failed to save metadata' });
  }
});

/**
 * PUT /api/image-metadata/:album/:filename
 * Update image metadata
 */
router.put('/:album/:filename', requireAuth, express.json(), async (req, res) => {
  try {
    const { album, filename } = req.params;
    const { title, description } = req.body;
    
    const db = await getDbFunctions();
    const success = db.updateImageMetadata(
      album, 
      filename, 
      title || null, 
      description || null
    );
    
    if (!success) {
      res.status(404).json({ error: 'Metadata not found' });
      return;
    }
    
    res.json({ 
      success: true, 
      message: 'Metadata updated successfully' 
    });
  } catch (error) {
    console.error('Error updating image metadata:', error);
    res.status(500).json({ error: 'Failed to update metadata' });
  }
});

/**
 * DELETE /api/image-metadata/:album/:filename
 * Delete image metadata
 */
router.delete('/:album/:filename', requireAuth, async (req, res) => {
  try {
    const { album, filename } = req.params;
    
    const db = await getDbFunctions();
    const success = db.deleteImageMetadata(album, filename);
    
    if (!success) {
      res.status(404).json({ error: 'Metadata not found' });
      return;
    }
    
    res.json({ 
      success: true, 
      message: 'Metadata deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting image metadata:', error);
    res.status(500).json({ error: 'Failed to delete metadata' });
  }
});

export default router;

