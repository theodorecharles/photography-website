/**
 * Image optimization routes for managing optimization settings and running optimization scripts.
 */

import express from "express";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { csrfProtection } from "../security.js";

const router = express.Router();

// Apply CSRF protection to all routes in this router
router.use(csrfProtection);

// Track running optimization job
interface RunningJob {
  process: any;
  output: string[];
  clients: Set<any>;
  startTime: number;
  isComplete: boolean;
}

let runningOptimizationJob: RunningJob | null = null;

// Broadcast message to all connected clients
function broadcastToClients(job: RunningJob | null, message: string) {
  if (!job) return;
  
  job.clients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (err) {
      // Client disconnected, will be cleaned up
    }
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { DATA_DIR } from '../config.js';
import { requireAuth, requireAdmin, requireManager } from '../auth/middleware.js';

// Path to config.json
const configPath = path.join(DATA_DIR, 'config.json');

// GET /api/image-optimization/settings - Get current optimization settings
router.get('/settings', requireAuth, (req, res) => {
  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    const settings = {
      concurrency: config.environment?.optimization?.concurrency || 4,
      images: config.environment?.optimization?.images || {
        thumbnail: { quality: 60, maxDimension: 512 },
        modal: { quality: 90, maxDimension: 2048 },
        download: { quality: 100, maxDimension: 4096 }
      }
    };
    
    res.json(settings);
  } catch (error) {
    console.error('Error reading optimization settings:', error);
    res.status(500).json({ error: 'Failed to read optimization settings' });
  }
});

// PUT /api/image-optimization/settings - Update optimization settings
router.put('/settings', requireAdmin, (req, res) => {
  try {
    const { concurrency, images } = req.body;
    
    // Validate input - accept either nested (images.thumbnail) or flat (thumbnail) format
    const thumbnail = images?.thumbnail || req.body.thumbnail;
    const modal = images?.modal || req.body.modal;
    const download = images?.download || req.body.download;
    
    if (!thumbnail || !modal || !download) {
      res.status(400).json({ error: 'Missing required settings' });
      return;
    }
    
    // Read current config
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // Ensure the optimization path exists
    if (!config.environment.optimization) {
      config.environment.optimization = {};
    }
    
    // Update concurrency
    if (concurrency !== undefined) {
      config.environment.optimization.concurrency = Math.max(1, Math.min(16, parseInt(concurrency) || 4));
    }
    
    // Update image settings
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
    
    res.json({ success: true, settings: config.environment.optimization });
  } catch (error) {
    console.error('Error updating optimization settings:', error);
    res.status(500).json({ error: 'Failed to update optimization settings' });
  }
});

// GET /api/image-optimization/status - Check if optimization is running
router.get('/status', requireAuth, (req, res) => {
  if (runningOptimizationJob) {
    res.json({ 
      running: true, 
      output: runningOptimizationJob.output,
      isComplete: runningOptimizationJob.isComplete
    });
  } else {
    res.json({ running: false });
  }
});

// POST /api/image-optimization/stop - Stop running optimization job
router.post('/stop', requireManager, (req: any, res: any) => {
  if (!runningOptimizationJob || runningOptimizationJob.isComplete) {
    return res.json({ success: false, message: 'No running job to stop' });
  }
  
  try {
    // Kill the process
    if (runningOptimizationJob.process) {
      runningOptimizationJob.process.kill('SIGTERM');
      console.log('[Optimization] Job stopped by user');
    }
    
    // Mark as complete and broadcast to all clients
    const stopMsg = JSON.stringify({ type: 'error', message: 'Job stopped by user' });
    runningOptimizationJob.output.push(stopMsg);
    runningOptimizationJob.isComplete = true;
    broadcastToClients(runningOptimizationJob, stopMsg);
    
    // Close all client connections
    runningOptimizationJob.clients.forEach(client => {
      try {
        client.end();
      } catch (err) {
        // Ignore errors
      }
    });
    runningOptimizationJob.clients.clear();
    
    res.json({ success: true, message: 'Job stopped successfully' });
  } catch (error: any) {
    console.error('[Optimization] Error stopping job:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/image-optimization/optimize - Run optimization script with SSE
router.post('/optimize', requireManager, (req, res) => {
  const { force } = req.body;
  
  // If already running, reconnect to existing job
  if (runningOptimizationJob && !runningOptimizationJob.isComplete) {
    console.log('[Optimization] Reconnecting to existing job');
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering
    res.setTimeout(0); // Disable timeout for this response
    res.flushHeaders();
    
    // Send all previous output
    runningOptimizationJob.output.forEach(line => {
      res.write(`data: ${line}\n\n`);
    });
    
    // Add this client to the broadcast list
    runningOptimizationJob.clients.add(res);
    
    // Remove client when they disconnect
    req.on('close', () => {
      if (runningOptimizationJob) {
        runningOptimizationJob.clients.delete(res);
      }
    });
    
    return;
  }
  
  // Create job tracking IMMEDIATELY to prevent race condition
  runningOptimizationJob = {
    process: null,
    output: [],
    clients: new Set([res]),
    startTime: Date.now(),
    isComplete: false
  };
  
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering
  res.setTimeout(0); // Disable timeout for this response
  res.flushHeaders();
  
  // Send initial connection message
  const connectMsg = '{"type":"connected","message":"Connected to optimization stream"}';
  res.write(`data: ${connectMsg}\n\n`);
  runningOptimizationJob.output.push(connectMsg);
  
  // Build command
  const scriptPath = path.resolve(__dirname, '../../../scripts/optimize_all_images.js');
  const args = force ? ['--force'] : [];
  
  // Check if script exists
  if (!fs.existsSync(scriptPath)) {
    res.write(`data: {"type":"error","message":"Optimization script not found"}\n\n`);
    res.end();
    return;
  }
  
  // Spawn the optimization script
  const child = spawn('node', [scriptPath, ...args], {
    cwd: path.resolve(__dirname, '../../../'),
    env: { ...process.env, TERM: 'dumb' } // Disable terminal colors/animations
  });
  
  runningOptimizationJob.process = child;
  
  // Remove client when they disconnect
  req.on('close', () => {
    if (runningOptimizationJob) {
      runningOptimizationJob.clients.delete(res);
    }
  });
  
  // Stream stdout
  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line: string) => {
      if (line.trim()) {
        let output = '';
        
        // Parse progress from lines like: [150/3000] (5%) Album/image.jpg [type]
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
          output = JSON.stringify({ type: 'stdout', message: line });
        }
        
        // Store output and broadcast to all clients
        if (runningOptimizationJob) {
          runningOptimizationJob.output.push(output);
          broadcastToClients(runningOptimizationJob, output);
        }
      }
    });
  });
  
  // Stream stderr
  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line: string) => {
      if (line.trim()) {
        const errorOutput = JSON.stringify({ type: 'stderr', message: line });
        
        // Store output and broadcast to all clients
        if (runningOptimizationJob) {
          runningOptimizationJob.output.push(errorOutput);
          broadcastToClients(runningOptimizationJob, errorOutput);
        }
      }
    });
  });
  
  // Handle process completion
  child.on('close', (code) => {
    const completeMsg = JSON.stringify({ 
      type: 'complete', 
      message: `Process exited with code ${code}`,
      exitCode: code 
    });
    
    if (runningOptimizationJob) {
      runningOptimizationJob.output.push(completeMsg);
      runningOptimizationJob.isComplete = true;
      
      // Broadcast to all clients and close connections
      broadcastToClients(runningOptimizationJob, completeMsg);
      runningOptimizationJob.clients.forEach(client => {
        try {
          client.end();
        } catch (err) {
          // Ignore errors
        }
      });
      runningOptimizationJob.clients.clear();
      
      // Clean up after 5 minutes
      setTimeout(() => {
        runningOptimizationJob = null;
      }, 5 * 60 * 1000);
    }
  });
  
  // Handle errors
  child.on('error', (error) => {
    const errorMsg = JSON.stringify({ 
      type: 'error', 
      message: `Failed to start process: ${error.message}` 
    });
    
    if (runningOptimizationJob) {
      runningOptimizationJob.output.push(errorMsg);
      runningOptimizationJob.isComplete = true;
      
      // Broadcast to all clients and close connections
      broadcastToClients(runningOptimizationJob, errorMsg);
      runningOptimizationJob.clients.forEach(client => {
        try {
          client.end();
        } catch (err) {
          // Ignore errors
        }
      });
      runningOptimizationJob.clients.clear();
    }
  });
});

export default router;

