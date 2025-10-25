/**
 * External Links Management Routes
 * Allows authenticated admins to manage external links
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isAuthenticated } from './auth.js';
import { csrfProtection } from '../security.js';

const router = Router();

// Apply CSRF protection to all routes in this router
router.use(csrfProtection);

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

    // Limit number of links
    if (links.length > 50) {
      res.status(400).json({ error: 'Too many links (maximum 50)' });
      return;
    }

    // Validate each link
    for (const link of links) {
      // Check required fields
      if (!link.title || !link.url) {
        res.status(400).json({ error: 'Each link must have a title and url' });
        return;
      }

      // Validate title
      if (typeof link.title !== 'string' || link.title.length > 100 || link.title.length < 1) {
        res.status(400).json({ error: 'Invalid title (must be 1-100 characters)' });
        return;
      }

      // Validate URL format and protocol
      try {
        const urlObj = new URL(link.url);
        // Only allow HTTP(S) and relative URLs (starting with /)
        if (!['http:', 'https:'].includes(urlObj.protocol) && !link.url.startsWith('/')) {
          res.status(400).json({ error: 'Only HTTP(S) URLs or relative paths allowed' });
          return;
        }
      } catch {
        // If URL() fails, check if it's a valid relative path
        if (!link.url.startsWith('/')) {
          res.status(400).json({ error: 'Invalid URL format' });
          return;
        }
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

