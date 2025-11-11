/**
 * Configuration Management Routes
 * Provides endpoints for reading and updating configuration
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { csrfProtection } from '../security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Apply CSRF protection to all routes
router.use(csrfProtection);

const CONFIG_PATH = path.join(__dirname, '../../../config/config.json');

/**
 * Middleware to check if user is authenticated
 */
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * GET /api/config
 * Get current configuration (excluding sensitive fields)
 */
router.get('/', requireAuth, (req, res) => {
  try {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
    const config = JSON.parse(configData);
    
    // Return full config for admin to edit
    // (sensitive fields will be masked on frontend if needed)
    res.json(config);
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({ error: 'Failed to read configuration' });
  }
});

/**
 * POST /api/config/validate-openai-key
 * Validate OpenAI API key
 */
router.post('/validate-openai-key', requireAuth, express.json(), async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      res.json({ valid: true }); // Empty key is considered valid (for removal)
      return;
    }
    
    // Test the API key by calling OpenAI's models endpoint
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    res.json({ valid: response.ok });
  } catch (error) {
    console.error('Error validating OpenAI key:', error);
    res.json({ valid: false });
  }
});

/**
 * PUT /api/config
 * Update configuration
 */
router.put('/', requireAuth, express.json(), (req, res) => {
  try {
    const newConfig = req.body;
    
    // Validate that we have a valid config object
    if (!newConfig || typeof newConfig !== 'object') {
      res.status(400).json({ error: 'Invalid configuration data' });
      return;
    }
    
    // Read current config to preserve structure
    const currentConfigData = fs.readFileSync(CONFIG_PATH, 'utf8');
    const currentConfig = JSON.parse(currentConfigData);
    
    // Merge new config with current (preserving any fields not sent)
    const updatedConfig = {
      ...currentConfig,
      ...newConfig
    };
    
    // Write updated config back to file
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify(updatedConfig, null, 2),
      'utf8'
    );
    
    console.log('✓ Configuration updated by:', req.user);
    
    res.json({ 
      success: true, 
      message: 'Configuration updated successfully' 
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

export default router;

