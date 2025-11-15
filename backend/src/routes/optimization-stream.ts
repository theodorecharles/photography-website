/**
 * Optimization Stream Route
 * Provides a single SSE endpoint for tracking all photo optimizations
 */

import express from 'express';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { requireAuth } from '../auth/middleware.js';

const router = express.Router();

// Track ongoing optimization jobs
interface OptimizationJob {
  album: string;
  filename: string;
  progress: number;
  state: 'queued' | 'optimizing' | 'generating-title' | 'complete' | 'error';
  error?: string;
  title?: string;
  startTime: number;
}

// Map of jobId -> OptimizationJob
const optimizationJobs = new Map<string, OptimizationJob>();

// Set of all connected SSE clients
const clients = new Set<express.Response>();

// Job queue for sequential optimization
interface QueuedJob {
  jobId: string;
  album: string;
  filename: string;
  scriptPath: string;
  projectRoot: string;
  onProgress: (progress: number) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

const optimizationQueue: QueuedJob[] = [];
const activeJobs: Set<ChildProcess> = new Set();
const MAX_CONCURRENT_JOBS = 8;

/**
 * Broadcast update to all connected clients
 */
export function broadcastOptimizationUpdate(jobId: string, update: Partial<OptimizationJob>) {
  const job = optimizationJobs.get(jobId);
  if (job) {
    Object.assign(job, update);
  } else {
    // Create new job if it doesn't exist
    optimizationJobs.set(jobId, {
      album: update.album!,
      filename: update.filename!,
      progress: update.progress || 0,
      state: update.state || 'optimizing',
      startTime: Date.now(),
      ...update
    });
  }
  
  // Broadcast to all clients
  const message = JSON.stringify({
    type: 'optimization-update',
    jobId,
    ...optimizationJobs.get(jobId)
  });
  
  clients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (err) {
      // Client disconnected, will be cleaned up
    }
  });
}

/**
 * Process the optimization queue (up to MAX_CONCURRENT_JOBS at a time)
 */
async function processQueue() {
  // Process jobs while we have space and jobs in queue
  while (activeJobs.size < MAX_CONCURRENT_JOBS && optimizationQueue.length > 0) {
    const job = optimizationQueue.shift()!;

    console.log(`[Optimization Queue] Starting ${job.jobId} (${activeJobs.size + 1}/${MAX_CONCURRENT_JOBS} active, ${optimizationQueue.length} queued)`);

    // Update job state to optimizing
    broadcastOptimizationUpdate(job.jobId, {
      album: job.album,
      filename: job.filename,
      progress: 0,
      state: 'optimizing'
    });

    // Spawn optimization process
    const childProcess = spawn('node', [job.scriptPath, job.album, job.filename], {
      cwd: job.projectRoot
    });

    activeJobs.add(childProcess);

    // Handle stdout for progress updates
    childProcess.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach((line: string) => {
        if (line.trim() && line.startsWith('PROGRESS:')) {
          const parts = line.substring(9).split(':');
          const progress = parseInt(parts[0]);
          job.onProgress(progress);
        }
      });
    });

    // Handle stderr
    childProcess.stderr?.on('data', (data) => {
      const errorOutput = data.toString().trim();
      if (errorOutput) {
        console.error(`[${job.album}/${job.filename}] Optimization stderr:`, errorOutput);
      }
    });

    // Handle completion
    childProcess.on('close', (code) => {
      activeJobs.delete(childProcess);

      if (code === 0) {
        job.onComplete();
      } else {
        job.onError('Optimization failed');
      }

      console.log(`[Optimization Queue] Completed ${job.jobId} (${activeJobs.size}/${MAX_CONCURRENT_JOBS} active, ${optimizationQueue.length} queued)`);

      // Process next job in queue
      processQueue();
    });

    // Handle errors
    childProcess.on('error', (error) => {
      activeJobs.delete(childProcess);
      job.onError(error.message);
      processQueue();
    });
  }
}

/**
 * Add optimization job to queue
 */
export function queueOptimizationJob(
  jobId: string,
  album: string,
  filename: string,
  scriptPath: string,
  projectRoot: string,
  onProgress: (progress: number) => void,
  onComplete: () => void,
  onError: (error: string) => void
) {
  // Add to queue
  optimizationQueue.push({
    jobId,
    album,
    filename,
    scriptPath,
    projectRoot,
    onProgress,
    onComplete,
    onError
  });

  // Set initial state as queued
  broadcastOptimizationUpdate(jobId, {
    album,
    filename,
    progress: 0,
    state: 'queued'
  });

  console.log(`[Optimization Queue] Added ${jobId} to queue (position: ${optimizationQueue.length})`);

  // Start processing if not already running
  processQueue();
}

/**
 * Clean up completed jobs after 5 minutes
 */
function cleanupOldJobs() {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  
  for (const [jobId, job] of optimizationJobs.entries()) {
    if ((job.state === 'complete' || job.state === 'error') && job.startTime < fiveMinutesAgo) {
      optimizationJobs.delete(jobId);
    }
  }
}

// Cleanup old jobs every minute
setInterval(cleanupOldJobs, 60 * 1000);

/**
 * GET /api/optimization-stream
 * SSE endpoint for optimization updates
 */
router.get('/', requireAuth, (req, res) => {
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setTimeout(0);
  res.flushHeaders();

  // Add client to set
  clients.add(res);
  console.log(`[Optimization Stream] Client connected (${clients.size} total)`);

  // Send current state of all active jobs
  const activeJobs = Array.from(optimizationJobs.entries()).map(([jobId, job]) => ({
    jobId,
    ...job
  }));
  
  if (activeJobs.length > 0) {
    res.write(`data: ${JSON.stringify({ 
      type: 'initial-state',
      jobs: activeJobs
    })}\n\n`);
  }

  // Touch session to keep it alive
  if (req.session) {
    req.session.touch();
  }

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
    if (req.session) {
      req.session.touch();
    }
  }, 30000); // Every 30 seconds

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
    console.log(`[Optimization Stream] Client disconnected (${clients.size} remaining)`);
  });
});

export default router;

