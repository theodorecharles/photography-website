/**
 * Route handler for health check endpoints.
 * This file provides a simple endpoint to check if the server is running.
 */

import { Router } from 'express';

const router = Router();

// Health check endpoint
router.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

export default router; 