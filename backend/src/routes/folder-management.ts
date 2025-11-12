/**
 * Album Folder Management Routes
 * Authenticated routes for creating, deleting, and managing album folders
 */

import { Router, Request, Response } from "express";
import { csrfProtection } from "../security.js";
import { 
  saveAlbumFolder,
  deleteFolderState,
  setFolderPublished,
  getAllFolders,
  getFolderState,
  setAlbumFolder,
  getAlbumsInFolder,
  updateFolderSortOrder
} from "../database.js";
import { generateStaticJSONFiles } from "./static-json.js";

const router = Router();

// Apply CSRF protection to all routes in this router
router.use(csrfProtection);

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
 * Sanitize folder name - allows letters, numbers, spaces, hyphens, and underscores
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
 * Get all folders (admin only)
 */
router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const folders = getAllFolders();
    res.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

/**
 * Create a new folder
 */
router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, published } = req.body;
    
    if (!name) {
      res.status(400).json({ error: 'Folder name is required' });
      return;
    }

    const sanitizedName = sanitizeName(name);
    if (!sanitizedName) {
      res.status(400).json({ error: 'Invalid folder name. Use only letters, numbers, spaces, hyphens, and underscores.' });
      return;
    }

    // Check if folder already exists
    const existing = getFolderState(sanitizedName);
    if (existing) {
      res.status(400).json({ error: 'Folder already exists' });
      return;
    }

    // Create folder in database (unpublished by default unless specified)
    saveAlbumFolder(sanitizedName, published === true);
    console.log(`✓ Created folder: ${sanitizedName} (${published ? 'published' : 'unpublished'})`);

    // Regenerate static JSON files
    const appRoot = req.app.get('appRoot');
    generateStaticJSONFiles(appRoot);

    res.json({ success: true, folder: sanitizedName });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

/**
 * Delete a folder
 * Note: This will remove the folder from all albums (sets folder_id to NULL)
 */
router.delete("/:folder", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { folder } = req.params;
    
    const sanitizedFolder = sanitizeName(folder);
    if (!sanitizedFolder) {
      res.status(400).json({ error: 'Invalid folder name' });
      return;
    }

    // Delete folder state from database
    const folderDeleted = deleteFolderState(sanitizedFolder);
    if (folderDeleted) {
      console.log(`✓ Deleted folder: ${sanitizedFolder}`);
    } else {
      console.log(`⚠ Folder not found in database: ${sanitizedFolder}`);
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    // Note: Due to ON DELETE SET NULL, albums in this folder will automatically have folder_id set to NULL

    // Regenerate static JSON files
    const appRoot = req.app.get('appRoot');
    generateStaticJSONFiles(appRoot);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

/**
 * Toggle folder published state
 */
router.patch("/:folder/publish", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { folder } = req.params;
    const { published } = req.body;
    
    const sanitizedFolder = sanitizeName(folder);
    if (!sanitizedFolder) {
      res.status(400).json({ error: 'Invalid folder name' });
      return;
    }

    if (typeof published !== 'boolean') {
      res.status(400).json({ error: 'Published state must be a boolean' });
      return;
    }

    // Check if folder exists
    const folderState = getFolderState(sanitizedFolder);
    if (!folderState) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    // Update folder state
    const success = setFolderPublished(sanitizedFolder, published);
    
    if (!success) {
      res.status(500).json({ error: 'Failed to update folder' });
      return;
    }
    
    console.log(`✓ Set folder "${sanitizedFolder}" published state to: ${published}`);

    // Regenerate static JSON files
    const appRoot = req.app.get('appRoot');
    generateStaticJSONFiles(appRoot);

    res.json({ 
      success: true, 
      folder: sanitizedFolder,
      published 
    });
  } catch (error) {
    console.error('Error updating folder published state:', error);
    res.status(500).json({ error: 'Failed to update folder published state' });
  }
});

/**
 * Move album to folder (or remove from folder if folderId is null)
 */
router.patch("/:folder/albums/:album", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { folder, album } = req.params;
    
    const sanitizedAlbum = sanitizeName(album);
    if (!sanitizedAlbum) {
      res.status(400).json({ error: 'Invalid album name' });
      return;
    }

    let folderId: number | null = null;
    
    // If folder is "none", remove from folder
    if (folder !== 'none') {
      const sanitizedFolder = sanitizeName(folder);
      if (!sanitizedFolder) {
        res.status(400).json({ error: 'Invalid folder name' });
        return;
      }

      // Get folder ID
      const folderState = getFolderState(sanitizedFolder);
      if (!folderState) {
        res.status(404).json({ error: 'Folder not found' });
        return;
      }
      
      folderId = folderState.id;
    }

    // Update album's folder
    const success = setAlbumFolder(sanitizedAlbum, folderId);
    
    if (!success) {
      res.status(500).json({ error: 'Failed to move album' });
      return;
    }
    
    console.log(`✓ Moved album "${sanitizedAlbum}" to folder ${folderId ? folder : 'none'}`);

    // Regenerate static JSON files
    const appRoot = req.app.get('appRoot');
    generateStaticJSONFiles(appRoot);

    res.json({ success: true });
  } catch (error) {
    console.error('Error moving album to folder:', error);
    res.status(500).json({ error: 'Failed to move album to folder' });
  }
});

/**
 * Update folder sort order
 */
router.put('/sort-order', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { folderOrders } = req.body;
    
    if (!Array.isArray(folderOrders)) {
      res.status(400).json({ error: 'Invalid folder orders data' });
      return;
    }
    
    // Validate each entry has name and sort_order
    for (const entry of folderOrders) {
      if (typeof entry.name !== 'string' || typeof entry.sort_order !== 'number') {
        res.status(400).json({ error: 'Each folder must have name and sort_order' });
        return;
      }
    }
    
    const success = updateFolderSortOrder(folderOrders);
    
    if (success) {
      console.log(`✓ Updated sort order for ${folderOrders.length} folders`);
      
      // Regenerate static JSON files
      const appRoot = req.app.get('appRoot');
      generateStaticJSONFiles(appRoot);
      
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to update folder order' });
    }
  } catch (error) {
    console.error('Error updating folder order:', error);
    res.status(500).json({ error: 'Failed to update folder order' });
  }
});

export default router;

