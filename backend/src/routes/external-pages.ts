/**
 * Route handler for external pages configuration.
 * This file provides endpoints for retrieving external page links
 * and their configurations from a JSON file.
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
 * Helper function to read and parse the external pages configuration file.
 * @returns Object containing external links configuration
 */
const getExternalPages = () => {
  try {
    const configPath = path.join(__dirname, '../../../config/external-pages.json');
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading external pages config:', error);
    return { externalLinks: [] };
  }
};

// Get external pages configuration
router.get('/api/external-pages', (req, res) => {
  const externalPages = getExternalPages();
  console.log('Sending external pages response:', externalPages);
  res.json(externalPages);
});

export default router; 