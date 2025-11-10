/**
 * AI Titles Generation Route
 * Provides endpoint for generating AI titles for all images
 */

import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { csrfProtection } from '../security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Apply CSRF protection to all routes
router.use(csrfProtection);

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
 * POST /api/ai-titles/generate
 * Generate AI titles for all images
 * Streams output using Server-Sent Events
 */
router.post('/generate', requireAuth, (req, res) => {
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Get the project root directory (3 levels up from this file)
  const projectRoot = path.resolve(__dirname, '../../..');
  const scriptPath = path.join(projectRoot, 'generate-ai-titles.js');

  console.log('[AI Titles] Starting generation...');
  console.log('[AI Titles] Script path:', scriptPath);
  console.log('[AI Titles] Working directory:', projectRoot);

  // Spawn the Node.js process to run the script
  const child = spawn('node', [scriptPath], {
    cwd: projectRoot,
    env: { ...process.env },
  });

  // Send stdout data as SSE events
  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter((line: string) => line.trim());
    lines.forEach((line: string) => {
      console.log('[AI Titles]', line);
      
      // Parse waiting status like: WAITING:5
      const waitingMatch = line.match(/^WAITING:(\d+)$/);
      if (waitingMatch) {
        const seconds = parseInt(waitingMatch[1]);
        res.write(`data: ${JSON.stringify({ 
          type: 'waiting',
          seconds: seconds
        })}\n\n`);
        return;
      }
      
      // Parse progress from lines like: [150/3000] (5%) Album/image.jpg
      const progressMatch = line.match(/^\[(\d+)\/(\d+)\]\s*\((\d+)%\)/);
      if (progressMatch) {
        const [, current, total, percent] = progressMatch;
        res.write(`data: ${JSON.stringify({ 
          type: 'progress', 
          current: parseInt(current),
          total: parseInt(total),
          percent: parseInt(percent),
          message: line 
        })}\n\n`);
      } else {
        res.write(`data: ${line}\n\n`);
      }
    });
  });

  // Send stderr data as SSE events (errors)
  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter((line: string) => line.trim());
    lines.forEach((line: string) => {
      console.error('[AI Titles Error]', line);
      res.write(`data: ERROR: ${line}\n\n`);
    });
  });

  // Handle process completion
  child.on('close', (code) => {
    console.log(`[AI Titles] Process exited with code ${code}`);
    
    if (code === 0) {
      res.write(`data: __COMPLETE__\n\n`);
    } else {
      res.write(`data: __ERROR__ Process exited with code ${code}\n\n`);
    }
    
    res.end();
  });

  // Handle errors
  child.on('error', (error) => {
    console.error('[AI Titles] Failed to start process:', error);
    res.write(`data: __ERROR__ ${error.message}\n\n`);
    res.end();
  });

  // Handle client disconnect
  req.on('close', () => {
    console.log('[AI Titles] Client disconnected, killing process');
    child.kill();
  });
});

export default router;

