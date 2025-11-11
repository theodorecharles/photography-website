/**
 * Share Links Routes
 * Handles creating and validating share links for unpublished albums
 */

import { Router, Request, Response } from "express";
import { csrfProtection } from "../security.js";
import { 
  createShareLink, 
  getShareLinkBySecret, 
  isShareLinkExpired,
  deleteShareLinksForAlbum,
  getShareLinksForAlbum
} from "../database.js";

const router = Router();

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
 * Sanitize album name
 */
const sanitizeName = (name: string): string | null => {
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return null;
  }
  if (!/^[a-zA-Z0-9 _-]+$/.test(name)) {
    return null;
  }
  return name.trim();
};

/**
 * Create a new share link for an album
 * POST /api/share-links/create
 * Body: { album: string, expirationMinutes: number | null }
 */
router.post("/create", csrfProtection, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { album, expirationMinutes } = req.body;
    
    if (!album) {
      res.status(400).json({ error: 'Album name is required' });
      return;
    }

    const sanitizedAlbum = sanitizeName(album);
    if (!sanitizedAlbum) {
      res.status(400).json({ error: 'Invalid album name' });
      return;
    }

    // Calculate expiration date if provided
    let expiresAt: string | null = null;
    if (expirationMinutes !== null && expirationMinutes !== undefined) {
      const expirationDate = new Date();
      expirationDate.setMinutes(expirationDate.getMinutes() + expirationMinutes);
      expiresAt = expirationDate.toISOString();
    }

    // Create the share link
    const shareLink = createShareLink(sanitizedAlbum, expiresAt);
    
    console.log(`✓ Created share link for album "${sanitizedAlbum}": ${shareLink.secret_key} (expires: ${expiresAt || 'never'})`);

    res.json({
      success: true,
      shareLink: {
        id: shareLink.id,
        album: shareLink.album,
        secretKey: shareLink.secret_key,
        expiresAt: shareLink.expires_at,
        createdAt: shareLink.created_at
      }
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

/**
 * Validate a share link and return album info if valid
 * GET /api/share-links/validate/:secretKey
 */
router.get("/validate/:secretKey", async (req: Request, res: Response): Promise<void> => {
  try {
    const { secretKey } = req.params;
    
    if (!secretKey || !/^[a-f0-9]{64}$/i.test(secretKey)) {
      res.status(400).json({ 
        error: 'Invalid secret key format',
        valid: false 
      });
      return;
    }

    // Get the share link
    const shareLink = getShareLinkBySecret(secretKey);
    
    if (!shareLink) {
      res.status(404).json({ 
        error: 'Share link not found',
        valid: false 
      });
      return;
    }

    // Check if expired
    if (isShareLinkExpired(shareLink)) {
      res.status(410).json({ 
        error: 'Share link has expired',
        valid: false,
        expired: true
      });
      return;
    }

    // Valid share link
    res.json({
      valid: true,
      album: shareLink.album,
      expiresAt: shareLink.expires_at
    });
  } catch (error) {
    console.error('Error validating share link:', error);
    res.status(500).json({ 
      error: 'Failed to validate share link',
      valid: false 
    });
  }
});

/**
 * Get all share links for an album (admin only)
 * GET /api/share-links/album/:album
 */
router.get("/album/:album", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { album } = req.params;
    
    const sanitizedAlbum = sanitizeName(album);
    if (!sanitizedAlbum) {
      res.status(400).json({ error: 'Invalid album name' });
      return;
    }

    const shareLinks = getShareLinksForAlbum(sanitizedAlbum);
    
    res.json({
      success: true,
      shareLinks: shareLinks.map(link => ({
        id: link.id,
        album: link.album,
        secretKey: link.secret_key,
        expiresAt: link.expires_at,
        createdAt: link.created_at,
        expired: isShareLinkExpired(link)
      }))
    });
  } catch (error) {
    console.error('Error getting share links:', error);
    res.status(500).json({ error: 'Failed to get share links' });
  }
});

/**
 * Delete all share links for an album (admin only)
 * DELETE /api/share-links/album/:album
 */
router.delete("/album/:album", csrfProtection, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { album } = req.params;
    
    const sanitizedAlbum = sanitizeName(album);
    if (!sanitizedAlbum) {
      res.status(400).json({ error: 'Invalid album name' });
      return;
    }

    const deletedCount = deleteShareLinksForAlbum(sanitizedAlbum);
    
    console.log(`✓ Deleted ${deletedCount} share links for album: ${sanitizedAlbum}`);

    res.json({
      success: true,
      deletedCount
    });
  } catch (error) {
    console.error('Error deleting share links:', error);
    res.status(500).json({ error: 'Failed to delete share links' });
  }
});

export default router;
