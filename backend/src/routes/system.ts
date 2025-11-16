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

// Restart endpoint - triggers restart.sh
router.post('/restart', requireAuth, (req, res) => {
  try {
    // Send response immediately before restarting
    res.json({ success: true, message: 'Server restart initiated' });

    // Small delay to ensure response is sent, then exit process
    setTimeout(() => {
      const projectRoot = path.resolve(__dirname, '../../..');
      const restartScript = path.join(projectRoot, 'restart.sh');

      console.log('🔄 Server restart initiated by:', (req.user as any)?.email || 'unknown user');
      console.log('📁 Project root:', projectRoot);

      // Create log file for restart output
      const logDir = path.join(projectRoot, 'data/logs');
      const logFile = path.join(logDir, 'restart.log');
      
      // Ensure logs directory exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const logStream = fs.createWriteStream(logFile, { flags: 'a' });
      
      logStream.write(`\n\n=== PM2 Restart initiated at ${new Date().toISOString()} ===\n`);
      logStream.write(`User: ${(req.user as any)?.email || 'unknown'}\n`);
      logStream.write(`Reason: Config reload (OpenObserve settings changed)\n\n`);

      // Just restart PM2 processes (fast config reload, no rebuild)
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
