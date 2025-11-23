/**
 * External Links Management Routes
 * Allows authenticated admins to manage external links
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireManager } from '../auth/middleware.js';
import { csrfProtection } from '../security.js';
import { generateHomepageHTML } from './homepage-html.js';
import { error, warn, info, debug, verbose } from '../utils/logger.js';

const router = Router();

// Apply CSRF protection to all routes in this router
router.use(csrfProtection);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { DATA_DIR, reloadConfig } from '../config.js';

const configPath = path.join(DATA_DIR, 'config.json');

// GET external links - public endpoint for navigation menu
router.get('/', (req: Request, res: Response) => {
  try {
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    res.json({ links: configData.externalLinks || [] });
  } catch (err) {
    error('Failed to read external links:', err);
    res.status(500).json({ error: 'Failed to load external links' });
  }
});

// PUT (update) external links
router.put('/', requireManager, (req: Request, res: Response): void => {
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
    
    // Reload config cache in memory
    reloadConfig();
    info("[ExternalLinks] Config reloaded after external links update");
    
    // Regenerate homepage HTML since external links are in the navigation
    const appRoot = req.app.get('appRoot');
    generateHomepageHTML(appRoot).then(result => {
      if (result.success) {
        info("[ExternalLinks] Homepage HTML regenerated after external links update");
      } else {
        error("[ExternalLinks] Failed to regenerate homepage HTML:", result.error);
      }
    }).catch(err => {
      error("[ExternalLinks] Error regenerating homepage HTML:", err);
    });

    res.json({ success: true, links });
  } catch (err) {
    error('Failed to update external links:', err);
    res.status(500).json({ error: 'Failed to save external links' });
  }
});

export default router;

