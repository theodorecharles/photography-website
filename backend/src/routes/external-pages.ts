/**
 * Route handler for external pages configuration.
 * This file provides endpoints for retrieving external page links
 * from the main configuration file.
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

// Get the current directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper function to read and parse the external links from config.
 * @returns Object containing external links configuration
 */
const getExternalPages = () => {
  try {
    const configPath = path.join(__dirname, '../../../config/config.json');
    const data = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(data);
    return { externalLinks: config.externalLinks || [] };
  } catch (error) {
    console.error('Error reading external links from config:', error);
    return { externalLinks: [] };
  }
};

// Get external pages configuration
router.get('/api/external-pages', (req, res) => {
  const externalPages = getExternalPages();
  res.json(externalPages);
});

export default router; 