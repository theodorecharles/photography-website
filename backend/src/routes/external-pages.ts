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
    // Try to load config.json, fall back to config.example.json
    const configPath = path.join(__dirname, '../../../config/config.json');
    const examplePath = path.join(__dirname, '../../../config/config.example.json');
    
    const configFile = fs.existsSync(configPath) ? configPath : examplePath;
    const data = fs.readFileSync(configFile, 'utf8');
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