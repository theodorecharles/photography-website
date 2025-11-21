/**
 * Video optimization routes for regenerating video playlists and settings.
 */

import express from "express";
import { spawn } from "child_process";
import { csrfProtection } from "../security.js";
import path from "path";
import { fileURLToPath } from "url";
import { error, warn, info } from '../utils/logger.js';
import { requireManager } from '../auth/middleware.js';
import { sendNotificationToUser } from '../push-notifications.js';

const router = express.Router();

// Apply CSRF protection to all routes in this router
router.use(csrfProtection);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Track running optimization job
interface RunningJob {
  process: any;
  output: string[];
  clients: Set<any>;
  startTime: number;
  isComplete: boolean;
}

let runningVideoOptimizationJob: RunningJob | null = null;

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

/**
 * POST /api/video-optimization/regenerate
 * Regenerate video master playlists with current configuration
 * Streams progress via SSE
 */
router.post('/regenerate', requireManager, (req, res) => {
  // Set up SSE headers FIRST
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable nginx buffering
  });
  res.setTimeout(0); // Disable timeout for long-running operation

  // Check if a job is already running
  if (runningVideoOptimizationJob && !runningVideoOptimizationJob.isComplete) {
    info('[VideoOptimization] Client connecting to existing job');
    
    // Send existing output history to new client
    runningVideoOptimizationJob.output.forEach(line => {
      res.write(`data: ${line}\n\n`);
    });
    
    // Add this client to the set
    runningVideoOptimizationJob.clients.add(res);
    
    // Remove client when they disconnect
    req.on('close', () => {
      if (runningVideoOptimizationJob) {
        runningVideoOptimizationJob.clients.delete(res);
        info(`[VideoOptimization] Client disconnected, ${runningVideoOptimizationJob.clients.size} remaining`);
      }
    });
    
    return;
  }

  // Create new job tracking object IMMEDIATELY
  runningVideoOptimizationJob = {
    process: null,
    output: [],
    clients: new Set([res]),
    startTime: Date.now(),
    isComplete: false
  };

  info('[VideoOptimization] Starting video playlist regeneration');

  const scriptPath = path.resolve(__dirname, '../../../scripts/generate-master-playlists.js');
  
  // Spawn the script
  const child = spawn('node', [scriptPath], {
    cwd: path.resolve(__dirname, '../../../'),
    env: { ...process.env, TERM: 'dumb' } // Disable terminal colors/animations
  });
  
  runningVideoOptimizationJob.process = child;
  
  // Remove client when they disconnect
  req.on('close', () => {
    if (runningVideoOptimizationJob) {
      runningVideoOptimizationJob.clients.delete(res);
      info(`[VideoOptimization] Client disconnected, ${runningVideoOptimizationJob.clients.size} remaining`);
    }
  });

  // Capture stdout
  child.stdout.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n');
    lines.forEach((line: string) => {
      if (line.trim()) {
        const output = JSON.stringify({ type: 'stdout', message: line });
        info(`[VideoOptimization] ${line}`);
        
        // Store output and broadcast to all clients
        if (runningVideoOptimizationJob) {
          runningVideoOptimizationJob.output.push(output);
          broadcastToClients(runningVideoOptimizationJob, output);
        }
      }
    });
  });

  // Capture stderr
  child.stderr.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n');
    lines.forEach((line: string) => {
      if (line.trim()) {
        const errorOutput = JSON.stringify({ type: 'stderr', message: line });
        warn(`[VideoOptimization] ${line}`);
        
        // Store output and broadcast to all clients
        if (runningVideoOptimizationJob) {
          runningVideoOptimizationJob.output.push(errorOutput);
          broadcastToClients(runningVideoOptimizationJob, errorOutput);
        }
      }
    });
  });

  // Handle process completion
  child.on('close', (code: number) => {
    const duration = Date.now() - (runningVideoOptimizationJob?.startTime || Date.now());
    const durationMin = (duration / 1000 / 60).toFixed(1);
    
    const message = code === 0 
      ? `✓ Video playlist regeneration complete (${durationMin}m)`
      : `✗ Video playlist regeneration failed with code ${code}`;
    
    info(`[VideoOptimization] ${message}`);
    
    if (runningVideoOptimizationJob) {
      const completeOutput = JSON.stringify({
        type: 'complete',
        exitCode: code,
        message
      });
      runningVideoOptimizationJob.output.push(completeOutput);
      broadcastToClients(runningVideoOptimizationJob, completeOutput);
      runningVideoOptimizationJob.isComplete = true;
      
      // Send push notification to user
      if (req.user && 'id' in req.user) {
        sendNotificationToUser((req.user as any).id, {
          title: code === 0 ? 'Video Processing Complete' : 'Video Processing Failed',
          body: message,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'video-optimization',
          requireInteraction: false
        }).catch(err => {
          warn('[VideoOptimization] Failed to send push notification:', err);
        });
      }
      
      // Clean up after 5 minutes
      setTimeout(() => {
        info('[VideoOptimization] Cleaning up completed job');
        runningVideoOptimizationJob = null;
      }, 5 * 60 * 1000);
    }
  });

  child.on('error', (err: Error) => {
    error('[VideoOptimization] Failed to start script:', err);
    const message = `✗ Failed to start video playlist regeneration: ${err.message}`;
    
    if (runningVideoOptimizationJob) {
      const errorOutput = JSON.stringify({
        type: 'error',
        message
      });
      runningVideoOptimizationJob.output.push(errorOutput);
      broadcastToClients(runningVideoOptimizationJob, errorOutput);
      runningVideoOptimizationJob.isComplete = true;
    }
  });
});

/**
 * POST /api/video-optimization/reprocess
 * Re-encode all videos with current quality settings
 * Streams progress via SSE
 */
router.post('/reprocess', requireManager, (req, res) => {
  // Set up SSE headers FIRST
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable nginx buffering
  });
  res.setTimeout(0); // Disable timeout for long-running operation

  // Check if a job is already running
  if (runningVideoOptimizationJob && !runningVideoOptimizationJob.isComplete) {
    info('[VideoReprocessing] Client connecting to existing job');
    
    // Send existing output history to new client
    runningVideoOptimizationJob.output.forEach(line => {
      res.write(`data: ${line}\n\n`);
    });
    
    // Add this client to the set
    runningVideoOptimizationJob.clients.add(res);
    
    // Remove client when they disconnect
    req.on('close', () => {
      if (runningVideoOptimizationJob) {
        runningVideoOptimizationJob.clients.delete(res);
        info(`[VideoReprocessing] Client disconnected, ${runningVideoOptimizationJob.clients.size} remaining`);
      }
    });
    
    return;
  }

  // Create new job tracking object IMMEDIATELY
  runningVideoOptimizationJob = {
    process: null,
    output: [],
    clients: new Set([res]),
    startTime: Date.now(),
    isComplete: false
  };

  info('[VideoReprocessing] Starting video reprocessing with current settings');

  const projectRoot = path.resolve(__dirname, '../../../');
  const scriptPath = path.join(projectRoot, 'scripts/reprocess_all_videos.js');
  const tsNodeLoader = path.join(projectRoot, 'node_modules/ts-node/esm.mjs');
  
  // Spawn the script with ts-node loader to handle TypeScript imports
  const child = spawn('node', ['--no-warnings', '--loader', tsNodeLoader, scriptPath], {
    cwd: projectRoot,
    env: { ...process.env, TERM: 'dumb', TS_NODE_PROJECT: path.join(projectRoot, 'backend/tsconfig.json') }
  });
  
  runningVideoOptimizationJob.process = child;
  
  // Remove client when they disconnect
  req.on('close', () => {
    if (runningVideoOptimizationJob) {
      runningVideoOptimizationJob.clients.delete(res);
      info(`[VideoReprocessing] Client disconnected, ${runningVideoOptimizationJob.clients.size} remaining`);
    }
  });

  // Capture stdout
  child.stdout.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n');
    lines.forEach((line: string) => {
      if (line.trim()) {
        const output = JSON.stringify({ type: 'stdout', message: line });
        info(`[VideoReprocessing] ${line}`);
        
        // Store output and broadcast to all clients
        if (runningVideoOptimizationJob) {
          runningVideoOptimizationJob.output.push(output);
          broadcastToClients(runningVideoOptimizationJob, output);
        }
      }
    });
  });

  // Capture stderr
  child.stderr.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n');
    lines.forEach((line: string) => {
      if (line.trim()) {
        const errorOutput = JSON.stringify({ type: 'stderr', message: line });
        warn(`[VideoReprocessing] ${line}`);
        
        // Store output and broadcast to all clients
        if (runningVideoOptimizationJob) {
          runningVideoOptimizationJob.output.push(errorOutput);
          broadcastToClients(runningVideoOptimizationJob, errorOutput);
        }
      }
    });
  });

  // Handle process completion
  child.on('close', (code: number) => {
    const duration = Date.now() - (runningVideoOptimizationJob?.startTime || Date.now());
    const durationSec = Math.round(duration / 1000);
    const durationMin = (duration / 1000 / 60).toFixed(1);
    const timeDisplay = durationSec < 60 ? `${durationSec}s` : `${durationMin}m`;
    
    const message = code === 0 
      ? `✓ Video reprocessing complete (${timeDisplay})`
      : `✗ Video reprocessing failed with code ${code}`;
    
    info(`[VideoReprocessing] ${message}`);
    
    if (runningVideoOptimizationJob) {
      const completeOutput = JSON.stringify({
        type: 'complete',
        exitCode: code,
        message
      });
      runningVideoOptimizationJob.output.push(completeOutput);
      broadcastToClients(runningVideoOptimizationJob, completeOutput);
      runningVideoOptimizationJob.isComplete = true;
      
      // Send push notification to user
      if (req.user && 'id' in req.user) {
        sendNotificationToUser((req.user as any).id, {
          title: code === 0 ? 'Video Reprocessing Complete' : 'Video Reprocessing Failed',
          body: message,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'video-reprocessing',
          requireInteraction: false
        }).catch(err => {
          warn('[VideoReprocessing] Failed to send push notification:', err);
        });
      }
      
      // Clean up after 5 minutes
      setTimeout(() => {
        info('[VideoReprocessing] Cleaning up completed job');
        runningVideoOptimizationJob = null;
      }, 5 * 60 * 1000);
    }
  });

  child.on('error', (err: Error) => {
    error('[VideoReprocessing] Failed to start script:', err);
    const errorMessage = err?.message || err?.toString() || 'Unknown error';
    const message = `✗ Failed to start video reprocessing: ${errorMessage}`;
    
    if (runningVideoOptimizationJob) {
      const errorOutput = JSON.stringify({
        type: 'error',
        message
      });
      runningVideoOptimizationJob.output.push(errorOutput);
      broadcastToClients(runningVideoOptimizationJob, errorOutput);
      runningVideoOptimizationJob.isComplete = true;
    }
  });
});

/**
 * POST /api/video-optimization/stop
 * Stop the running video optimization job
 */
router.post('/stop', requireManager, (req, res) => {
  if (!runningVideoOptimizationJob || runningVideoOptimizationJob.isComplete) {
    res.json({ success: false, message: 'No video optimization job running' });
    return;
  }

  try {
    runningVideoOptimizationJob.process.kill('SIGTERM');
    
    const message = '⏹ Video reprocessing stopped by user';
    runningVideoOptimizationJob.output.push(message);
    broadcastToClients(runningVideoOptimizationJob, message);
    runningVideoOptimizationJob.isComplete = true;
    
    info('[VideoOptimization] Job stopped by user');
    res.json({ success: true, message: 'Video optimization stopped' });
  } catch (err) {
    error('[VideoOptimization] Failed to stop job:', err);
    res.status(500).json({ success: false, message: 'Failed to stop video optimization' });
  }
});

export default router;

