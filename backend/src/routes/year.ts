/**
 * Route handler for current year endpoint.
 * Returns the current year based on the server's clock.
 * This prevents users from manipulating their local system time
 * to display incorrect copyright years.
 */

import { Router } from 'express';

const router = Router();

// Get current year from server
router.get('/api/current-year', (req, res) => {
  const currentYear = new Date().getFullYear();
  res.json({ year: currentYear });
});

export default router;

