/**
 * Branding management routes
 * Handles site branding configuration including site name, colors, logo, etc.
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import multer from 'multer';
import os from 'os';
import { isAuthenticated } from './auth.js';
import { csrfProtection } from '../security.js';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configure multer for avatar upload
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, os.tmpdir());
    },
    filename: (req, file, cb) => {
      cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/^image\/(jpeg|jpg|png|gif)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Apply CSRF protection to all routes in this router
router.use(csrfProtection);

// Path to config file - go up from backend/src/routes to project root, then into config
const configPath = path.resolve(__dirname, '../../../config/config.json');

interface BrandingConfig {
  siteName: string;
  avatarPath: string;
  primaryColor: string;
  secondaryColor: string;
  metaDescription: string;
  metaKeywords: string;
  faviconPath: string;
  analyticsHmacSecret?: string;
}

// Get current branding configuration
router.get('/', (req: Request, res: Response) => {
  try {
    console.log('[Get Branding] Reading config from:', configPath);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const branding = config.branding || {};
    
    // Set defaults if not present
    const brandingConfig: BrandingConfig = {
      siteName: branding.siteName || 'Ted Charles',
      avatarPath: branding.avatarPath || '/photos/derpatar.png',
      primaryColor: branding.primaryColor || '#4ade80',
      secondaryColor: branding.secondaryColor || '#22c55e',
      metaDescription: branding.metaDescription || 'Photography portfolio by Ted Charles',
      metaKeywords: branding.metaKeywords || 'photography, portfolio, ted charles',
      faviconPath: branding.faviconPath || '/favicon.ico',
      analyticsHmacSecret: config.analytics?.hmacSecret
    };
    
    console.log('[Get Branding] Returning avatarPath:', brandingConfig.avatarPath);
    res.json(brandingConfig);
  } catch (error) {
    console.error('Error reading branding config:', error);
    res.status(500).json({ error: 'Failed to read branding configuration' });
  }
});

// Update branding configuration
router.put('/', isAuthenticated, (req: Request, res: Response) => {
  try {
    const updates: Partial<BrandingConfig> = req.body;
    
    // Validate input
    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }
    
    // Validate each field if provided
    const validFields = ['siteName', 'avatarPath', 'primaryColor', 'secondaryColor', 'metaDescription', 'metaKeywords', 'faviconPath'];
    for (const [key, value] of Object.entries(updates)) {
      if (!validFields.includes(key)) {
        res.status(400).json({ error: `Invalid field: ${key}` });
        return;
      }
      
      if (typeof value !== 'string') {
        res.status(400).json({ error: `Field ${key} must be a string` });
        return;
      }
      
      // Length limits
      if (value.length > 500) {
        res.status(400).json({ error: `Field ${key} is too long (max 500 characters)` });
        return;
      }
    }
    
    // Validate color format if provided
    if (updates.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(updates.primaryColor)) {
      res.status(400).json({ error: 'Primary color must be a valid hex color (e.g., #FF0000)' });
      return;
    }
    
    if (updates.secondaryColor && !/^#[0-9A-Fa-f]{6}$/.test(updates.secondaryColor)) {
      res.status(400).json({ error: 'Secondary color must be a valid hex color (e.g., #FF0000)' });
      return;
    }
    
    // Read current config
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Initialize branding section if it doesn't exist
    if (!config.branding) {
      config.branding = {};
    }
    
    // Update branding configuration
    Object.assign(config.branding, updates);
    
    // Write back to file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Branding configuration updated successfully',
      branding: config.branding
    });
  } catch (error) {
    console.error('Error updating branding config:', error);
    res.status(500).json({ error: 'Failed to update branding configuration' });
  }
});

// Upload avatar
router.post('/upload-avatar', isAuthenticated, upload.single('avatar'), async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Determine paths
    const projectRoot = path.resolve(__dirname, '../../..');
    const photosDir = path.join(projectRoot, 'photos');
    const frontendPublicDir = path.join(projectRoot, 'frontend', 'public');
    
    // Use .png extension for consistency
    const avatarFilename = 'avatar.png';
    const avatarPath = path.join(photosDir, avatarFilename);
    const faviconPngPath = path.join(frontendPublicDir, 'favicon.png');
    const faviconIcoPath = path.join(frontendPublicDir, 'favicon.ico');
    
    // Read the uploaded file
    const fileData = fs.readFileSync(file.path);
    
    // Write to photos directory
    fs.writeFileSync(avatarPath, fileData);
    
    // Also copy to frontend public as favicon.png
    fs.writeFileSync(faviconPngPath, fileData);
    
    // Generate favicon.ico from the avatar using ImageMagick
    try {
      await execAsync(`magick "${faviconPngPath}" -resize 32x32 "${faviconIcoPath}"`);
      console.log('Generated favicon.ico from avatar');
    } catch (err) {
      console.error('Failed to generate favicon.ico:', err);
      // Continue anyway - favicon.png will still work
    }
    
    // Clean up temp file
    fs.unlinkSync(file.path);
    
    // Update config
    console.log('[Avatar Upload] Reading config from:', configPath);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!config.branding) {
      config.branding = {};
    }
    config.branding.avatarPath = `/photos/${avatarFilename}`;
    config.branding.faviconPath = '/favicon.ico';
    console.log('[Avatar Upload] Writing new avatarPath to config:', config.branding.avatarPath);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('[Avatar Upload] Config file updated successfully');
    
    res.json({ 
      success: true,
      avatarPath: `/photos/${avatarFilename}`,
      faviconPath: '/favicon.ico'
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

export default router;