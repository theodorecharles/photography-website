/**
 * Route handler for system operations.
 * This file provides endpoints for system management like restart.
 */

import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth } from '../auth/middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Restart endpoint - triggers container restart or PM2 restart
router.post('/restart', requireAuth, (req, res) => {
  try {
    // Get user info for logging
    const userId = (req.session as any)?.userId;
    const sessionUser = (req.session as any)?.user;
    const userEmail = sessionUser?.email || (req.user as any)?.email || 'unknown user';
    
    console.log('🔄 Server restart initiated by:', userEmail);
    console.log('[Restart] Session info:', {
      userId,
      hasSessionUser: !!sessionUser,
      sessionId: req.sessionID,
    });

    // Send response immediately before restarting
    res.json({ success: true, message: 'Server restart initiated' });

    // Small delay to ensure response is sent, then restart
    setTimeout(() => {
      const projectRoot = path.resolve(__dirname, '../../..');
      const logDir = path.join(projectRoot, 'data/logs');
      const logFile = path.join(logDir, 'restart.log');
      
      // Ensure logs directory exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const logStream = fs.createWriteStream(logFile, { flags: 'a' });
      const timestamp = new Date().toISOString();
      
      // Check if PM2 is available (works in both Docker and non-Docker)
      const pm2Available = require('child_process').spawnSync('which', ['pm2']).status === 0;
      
      if (pm2Available) {
        // PM2 mode: Restart PM2 processes (works in Docker and non-Docker)
        logStream.write(`\n\n=== PM2 Restart initiated at ${timestamp} ===\n`);
        logStream.write(`User: ${userEmail}\n`);
        logStream.write(`Reason: Config reload\n\n`);

        const restart = spawn('pm2', ['restart', 'all'], {
          cwd: projectRoot,
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        // Pipe output to log file
        if (restart.stdout) {
          restart.stdout.pipe(logStream, { end: false });
        }
        if (restart.stderr) {
          restart.stderr.pipe(logStream, { end: false });
        }

        // Handle process events for logging
        restart.on('error', (err) => {
          logStream.write(`\n❌ ERROR: Failed to restart PM2: ${err.message}\n`);
          logStream.end();
          console.error('Failed to restart PM2:', err);
        });

        restart.on('exit', (code, signal) => {
          logStream.write(`\n✓ PM2 restart completed with code ${code} and signal ${signal}\n`);
          logStream.end();
        });

        // Unref the child process so it continues running independently
        restart.unref();

        console.log('✅ PM2 restart initiated');
        console.log('⏳ Services will reload configuration and restart');
        console.log(`📝 Restart output logged to: ${logFile}`);
      } else {
        // Fallback: Exit process (Docker will restart container, PM2 will restart process)
        logStream.write(`\n\n=== Process Restart initiated at ${timestamp} ===\n`);
        logStream.write(`User: ${userEmail}\n`);
        logStream.write(`Reason: Config reload\n\n`);
        logStream.end();
        
        console.log('✅ Process restart - exiting');
        console.log('⏳ Process manager will restart the process');
        console.log(`📝 Restart logged to: ${logFile}`);
        
        // Exit gracefully - PM2/Docker will restart
        process.exit(0);
      }
    }, 500);
  } catch (error) {
    console.error('❌ Failed to initiate restart:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to initiate restart' 
    });
  }
});

export default router;
