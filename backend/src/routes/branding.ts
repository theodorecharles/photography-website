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
import crypto from 'crypto';
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
console.log('[Branding Routes] Config path resolved to:', configPath);
console.log('[Branding Routes] __dirname is:', __dirname);

interface BrandingConfig {
  siteName: string;
  avatarPath: string;
  primaryColor: string;
  secondaryColor: string;
  metaDescription: string;
  metaKeywords: string;
  faviconPath: string;
}

// Get current branding configuration
router.get('/', (req: Request, res: Response) => {
  try {
    console.log('[Get Branding] PID:', process.pid, '- Reading config from:', configPath);
    
    // Read file with no encoding first to check it exists and get stats
    const stats = fs.statSync(configPath);
    console.log('[Get Branding] PID:', process.pid, '- Config file last modified:', stats.mtime.toISOString());
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    const contentHash = crypto.createHash('md5').update(configContent).digest('hex').substring(0, 8);
    console.log('[Get Branding] PID:', process.pid, '- File content hash:', contentHash);
    
    const config = JSON.parse(configContent);
    const branding = config.branding || {};
    
    // Debug: log raw branding object
    console.log('[Get Branding] PID:', process.pid, '- Raw branding.avatarPath from file:', branding.avatarPath);
    console.log('[Get Branding] PID:', process.pid, '- Raw config.branding keys:', Object.keys(branding));
    
    // Set defaults if not present
    const brandingConfig: BrandingConfig = {
      siteName: branding.siteName || 'Ted Charles',
      avatarPath: branding.avatarPath || '/photos/avatar.png',
      primaryColor: branding.primaryColor || '#4ade80',
      secondaryColor: branding.secondaryColor || '#22c55e',
      metaDescription: branding.metaDescription || 'Photography portfolio by Ted Charles',
      metaKeywords: branding.metaKeywords || 'photography, portfolio, ted charles',
      faviconPath: branding.faviconPath || '/favicon.ico',
    };
    
    console.log('[Get Branding] PID:', process.pid, '- After defaults, returning avatarPath:', brandingConfig.avatarPath);
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
    
    // Also define dist path for immediate serving
    const frontendDistDir = path.join(projectRoot, 'frontend', 'dist');
    const faviconIcoPathDist = path.join(frontendDistDir, 'favicon.ico');
    
    // Read the uploaded file
    const fileData = fs.readFileSync(file.path);
    
    // Write to photos directory
    fs.writeFileSync(avatarPath, fileData);
    
    // Also copy to frontend public as favicon.png
    fs.writeFileSync(faviconPngPath, fileData);
    
    // Generate favicon.ico from the avatar using ImageMagick convert command
    try {
      await execAsync(`convert "${faviconPngPath}" -resize 32x32 "${faviconIcoPath}"`);
      console.log('[Avatar Upload] Generated favicon.ico from avatar using convert');
      
      // Also copy to dist directory so it's immediately served by nginx
      if (fs.existsSync(frontendDistDir)) {
        fs.copyFileSync(faviconIcoPath, faviconIcoPathDist);
        console.log('[Avatar Upload] Copied favicon.ico to dist directory for immediate serving');
      } else {
        console.warn('[Avatar Upload] Frontend dist directory not found, skipping dist copy');
      }
    } catch (err: any) {
      console.error('[Avatar Upload] Failed to generate favicon.ico:', err);
      // Continue anyway - favicon.png will still work
    }
    
    // Clean up temp file
    fs.unlinkSync(file.path);
    
    // Update config
    console.log('[Avatar Upload] Reading config from:', configPath);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('[Avatar Upload] Current avatarPath in config:', config.branding?.avatarPath);
    if (!config.branding) {
      config.branding = {};
    }
    config.branding.avatarPath = `/photos/${avatarFilename}`;
    config.branding.faviconPath = '/favicon.ico';
    console.log('[Avatar Upload] Writing new avatarPath to config:', config.branding.avatarPath);
    
    // Write synchronously and force flush to disk
    const fd = fs.openSync(configPath, 'w');
    fs.writeSync(fd, JSON.stringify(config, null, 2));
    fs.fsyncSync(fd);  // Force flush to disk
    fs.closeSync(fd);
    console.log('[Avatar Upload] Config file write completed and flushed to disk');
    
    // Verify the write by reading back
    const verifyContent = fs.readFileSync(configPath, 'utf8');
    const verifyHash = crypto.createHash('md5').update(verifyContent).digest('hex').substring(0, 8);
    console.log('[Avatar Upload] Verification file content hash:', verifyHash);
    
    const verifyConfig = JSON.parse(verifyContent);
    console.log('[Avatar Upload] Verification read - avatarPath now:', verifyConfig.branding?.avatarPath);
    
    if (verifyConfig.branding?.avatarPath !== `/photos/${avatarFilename}`) {
      console.error('[Avatar Upload] ERROR: Verification failed! Expected:', `/photos/${avatarFilename}`, 'Got:', verifyConfig.branding?.avatarPath);
    } else {
      console.log('[Avatar Upload] Verification successful - config was updated correctly');
    }
    
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