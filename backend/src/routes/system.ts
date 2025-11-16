/**
 * System management routes for server restarts and control
 */

import express from "express";
import { csrfProtection } from "../security.js";
import { requireAdmin } from '../auth/middleware.js';

const router = express.Router();

// Apply CSRF protection to all routes in this router
router.use(csrfProtection);

// POST /api/system/restart/backend - Restart the backend server
router.post('/restart/backend', requireAdmin, (req, res) => {
  console.log('🔄 Backend restart requested by:', req.user);
  
  // Send response before exiting
  res.json({ 
    success: true, 
    message: 'Backend server restarting...' 
  });
  
  // Give the response time to be sent
  setTimeout(() => {
    console.log('🔄 Restarting backend server...');
    process.exit(0); // Exit cleanly, let process manager (pm2/nodemon/systemd) restart
  }, 500);
});

// POST /api/system/restart/frontend - Trigger frontend rebuild
router.post('/restart/frontend', requireAdmin, (req, res) => {
  console.log('🔄 Frontend restart requested by:', req.user);
  
  // Frontend restart is handled differently - it's typically a dev server
  // In production, this would require restarting a separate process
  res.json({ 
    success: true, 
    message: 'Frontend restart is handled by your process manager. If running in development, restart your dev server manually.' 
  });
});

export default router;

