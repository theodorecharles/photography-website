/**
 * External Links Management Routes
 * Allows authenticated admins to manage external links
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isAuthenticated } from './auth.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, '../../../config/config.json');

// GET external links
router.get('/', isAuthenticated, (req: Request, res: Response) => {
  try {
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    res.json({ links: configData.externalLinks || [] });
  } catch (error) {
    console.error('Failed to read external links:', error);
    res.status(500).json({ error: 'Failed to load external links' });
  }
});

// PUT (update) external links
router.put('/', isAuthenticated, (req: Request, res: Response): void => {
  try {
    const { links } = req.body;

    if (!Array.isArray(links)) {
      res.status(400).json({ error: 'Links must be an array' });
      return;
    }

    // Validate each link
    for (const link of links) {
      if (!link.title || !link.url) {
        res.status(400).json({ error: 'Each link must have a title and url' });
        return;
      }
    }

    // Read current config
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Update external links
    configData.externalLinks = links;

    // Write back to config file
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');

    res.json({ success: true, links });
  } catch (error) {
    console.error('Failed to update external links:', error);
    res.status(500).json({ error: 'Failed to save external links' });
  }
});

export default router;

