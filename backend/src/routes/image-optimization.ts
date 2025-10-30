/**
 * Image optimization routes for managing optimization settings and running optimization scripts.
 */

import express from "express";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to config.json
const configPath = path.resolve(__dirname, '../../../config/config.json');

// Middleware to check if user is authenticated
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

// GET /api/image-optimization/settings - Get current optimization settings
router.get('/settings', requireAuth, (req, res) => {
  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    const settings = config.environment?.optimization?.images || {
      thumbnail: { quality: 60, maxDimension: 512 },
      modal: { quality: 90, maxDimension: 2048 },
      download: { quality: 100, maxDimension: 4096 }
    };
    
    res.json(settings);
  } catch (error) {
    console.error('Error reading optimization settings:', error);
    res.status(500).json({ error: 'Failed to read optimization settings' });
  }
});

// PUT /api/image-optimization/settings - Update optimization settings
router.put('/settings', requireAuth, (req, res) => {
  try {
    const { thumbnail, modal, download } = req.body;
    
    // Validate input
    if (!thumbnail || !modal || !download) {
      res.status(400).json({ error: 'Missing required settings' });
      return;
    }
    
    // Read current config
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // Ensure the optimization.images path exists
    if (!config.environment.optimization) {
      config.environment.optimization = { concurrency: 4 };
    }
    
    // Update settings
    config.environment.optimization.images = {
      thumbnail: {
        quality: Math.max(0, Math.min(100, parseInt(thumbnail.quality) || 60)),
        maxDimension: Math.max(128, Math.min(4096, parseInt(thumbnail.maxDimension) || 512))
      },
      modal: {
        quality: Math.max(0, Math.min(100, parseInt(modal.quality) || 90)),
        maxDimension: Math.max(512, Math.min(8192, parseInt(modal.maxDimension) || 2048))
      },
      download: {
        quality: Math.max(0, Math.min(100, parseInt(download.quality) || 100)),
        maxDimension: Math.max(1024, Math.min(16384, parseInt(download.maxDimension) || 4096))
      }
    };
    
    // Write back to config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    res.json({ success: true, settings: config.environment.optimization.images });
  } catch (error) {
    console.error('Error updating optimization settings:', error);
    res.status(500).json({ error: 'Failed to update optimization settings' });
  }
});

// POST /api/image-optimization/optimize - Run optimization script with SSE
router.post('/optimize', requireAuth, (req, res) => {
  const { force } = req.body;
  
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  // Send initial connection message
  res.write('data: {"type":"connected","message":"Connected to optimization stream"}\n\n');
  
  // Build command
  const scriptPath = path.resolve(__dirname, '../../../optimize_images.sh');
  const args = force ? ['--force'] : [];
  
  // Check if script exists
  if (!fs.existsSync(scriptPath)) {
    res.write(`data: {"type":"error","message":"Optimization script not found"}\n\n`);
    res.end();
    return;
  }
  
  // Spawn the optimization script
  const child = spawn(scriptPath, args, {
    cwd: path.resolve(__dirname, '../../../'),
    shell: true,
    env: { ...process.env, TERM: 'dumb' } // Disable terminal colors/animations
  });
  
  // Stream stdout
  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line: string) => {
      if (line.trim()) {
        res.write(`data: ${JSON.stringify({ type: 'stdout', message: line })}\n\n`);
      }
    });
  });
  
  // Stream stderr
  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line: string) => {
      if (line.trim()) {
        res.write(`data: ${JSON.stringify({ type: 'stderr', message: line })}\n\n`);
      }
    });
  });
  
  // Handle process completion
  child.on('close', (code) => {
    res.write(`data: ${JSON.stringify({ 
      type: 'complete', 
      message: `Process exited with code ${code}`,
      exitCode: code 
    })}\n\n`);
    res.end();
  });
  
  // Handle errors
  child.on('error', (error) => {
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: `Failed to start process: ${error.message}` 
    })}\n\n`);
    res.end();
  });
  
  // Clean up on client disconnect
  req.on('close', () => {
    if (!child.killed) {
      child.kill();
    }
  });
});

export default router;

