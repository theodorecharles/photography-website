/**
 * Branding management routes
 * Handles site branding configuration including site name, colors, logo, etc.
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

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
}

// Get current branding configuration
router.get('/', (req: Request, res: Response) => {
  try {
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
      faviconPath: branding.faviconPath || '/favicon.ico'
    };
    
    res.json(brandingConfig);
  } catch (error) {
    console.error('Error reading branding config:', error);
    res.status(500).json({ error: 'Failed to read branding configuration' });
  }
});

// Update branding configuration
router.put('/', (req: Request, res: Response) => {
  try {
    const updates: Partial<BrandingConfig> = req.body;
    
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

// Upload logo/avatar
router.post('/upload-logo', (req: Request, res: Response) => {
  // This would handle file upload - for now, just return success
  // In a real implementation, you'd use multer or similar
  res.json({ 
    success: true, 
    message: 'Logo upload endpoint - implement with multer',
    path: '/photos/logo.png'
  });
});

export default router;