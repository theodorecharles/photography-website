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

// Track running jobs
interface RunningJob {
  process: any;
  output: string[];
  startTime: number;
  isComplete: boolean;
}

const runningJobs = {
  aiTitles: null as RunningJob | null,
  optimization: null as RunningJob | null
};

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
 * GET /api/ai-titles/status
 * Check if AI title generation is currently running
 */
router.get('/status', requireAuth, (req, res) => {
  if (runningJobs.aiTitles) {
    res.json({ 
      running: true, 
      output: runningJobs.aiTitles.output,
      isComplete: runningJobs.aiTitles.isComplete
    });
  } else {
    res.json({ running: false });
  }
});

/**
 * POST /api/ai-titles/generate
 * Generate AI titles for all images
 * Streams output using Server-Sent Events
 */
router.post('/generate', requireAuth, (req, res) => {
  // If already running, reconnect to existing job
  if (runningJobs.aiTitles && !runningJobs.aiTitles.isComplete) {
    console.log('[AI Titles] Reconnecting to existing job');
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send all previous output
    runningJobs.aiTitles.output.forEach(line => {
      res.write(`data: ${line}\n\n`);
    });
    
    return;
  }

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

  // Create job tracking
  runningJobs.aiTitles = {
    process: null,
    output: [],
    startTime: Date.now(),
    isComplete: false
  };

  // Spawn the Node.js process to run the script
  const child = spawn('node', [scriptPath], {
    cwd: projectRoot,
    env: { ...process.env },
  });
  
  runningJobs.aiTitles.process = child;

  // Send stdout data as SSE events
  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter((line: string) => line.trim());
    lines.forEach((line: string) => {
      console.log('[AI Titles]', line);
      
      let output = '';
      
      // Parse waiting status like: WAITING:5
      const waitingMatch = line.match(/^WAITING:(\d+)$/);
      if (waitingMatch) {
        const seconds = parseInt(waitingMatch[1]);
        output = JSON.stringify({ 
          type: 'waiting',
          seconds: seconds
        });
      } 
      // Parse progress from lines like: [150/3000] (5%) Album/image.jpg
      else {
        const progressMatch = line.match(/^\[(\d+)\/(\d+)\]\s*\((\d+)%\)/);
        if (progressMatch) {
          const [, current, total, percent] = progressMatch;
          output = JSON.stringify({ 
            type: 'progress', 
            current: parseInt(current),
            total: parseInt(total),
            percent: parseInt(percent),
            message: line 
          });
        } else {
          output = line;
        }
      }
      
      // Store output and send to client
      if (runningJobs.aiTitles) {
        runningJobs.aiTitles.output.push(output);
      }
      res.write(`data: ${output}\n\n`);
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
    
    const completeMsg = code === 0 ? '__COMPLETE__' : `__ERROR__ Process exited with code ${code}`;
    
    if (runningJobs.aiTitles) {
      runningJobs.aiTitles.output.push(completeMsg);
      runningJobs.aiTitles.isComplete = true;
      
      // Clean up after 5 minutes
      setTimeout(() => {
        runningJobs.aiTitles = null;
      }, 5 * 60 * 1000);
    }
    
    res.write(`data: ${completeMsg}\n\n`);
    res.end();
  });

  // Handle errors
  child.on('error', (error) => {
    console.error('[AI Titles] Failed to start process:', error);
    const errorMsg = `__ERROR__ ${error.message}`;
    
    if (runningJobs.aiTitles) {
      runningJobs.aiTitles.output.push(errorMsg);
      runningJobs.aiTitles.isComplete = true;
    }
    
    res.write(`data: ${errorMsg}\n\n`);
    res.end();
  });

  // Handle client disconnect - DON'T kill the process
  req.on('close', () => {
    console.log('[AI Titles] Client disconnected, process continues running');
  });
});

export default router;

