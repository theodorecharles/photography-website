/**
 * Analytics route handler
 * Proxies analytics events to OpenObserve with authentication
 * This keeps credentials secure on the backend
 */

import { Router } from 'express';
import config from '../config.ts';

const router = Router();

// POST endpoint to receive analytics events from frontend
router.post('/track', (req, res) => {
  // Use async IIFE to handle async operations
  (async () => {
    try {
      // Get analytics configuration
      const analyticsConfig = config.analytics?.openobserve;
      
      if (!analyticsConfig || !analyticsConfig.enabled) {
        // Analytics disabled, return success without doing anything
        return res.status(200).json({ success: true, message: 'Analytics disabled' });
      }

      const { endpoint, username, password } = analyticsConfig;

      if (!endpoint || !username || !password) {
        console.error('Analytics configuration incomplete');
        return res.status(200).json({ success: true, message: 'Analytics not configured' });
      }

      // Extract client IP address
      // Check X-Forwarded-For header first (for proxies/load balancers)
      // Then fall back to X-Real-IP, and finally to socket remote address
      const forwardedFor = req.headers['x-forwarded-for'];
      const realIp = req.headers['x-real-ip'];
      let clientIp = req.socket.remoteAddress || 'unknown';
      
      if (typeof forwardedFor === 'string') {
        // X-Forwarded-For can contain multiple IPs, take the first one (original client)
        clientIp = forwardedFor.split(',')[0].trim();
      } else if (typeof realIp === 'string') {
        clientIp = realIp;
      }

      // Add IP address to each event in the array
      const events = Array.isArray(req.body) ? req.body : [req.body];
      const eventsWithIp = events.map((event: any) => ({
        ...event,
        client_ip: clientIp,
      }));

      // Forward the event(s) to OpenObserve with authentication
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`,
        },
        body: JSON.stringify(eventsWithIp),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenObserve error:', response.status, errorText);
        // Return success anyway to not break frontend
        return res.status(200).json({ success: true, message: 'Event logged with errors' });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Analytics proxy error:', error);
      // Return success anyway to not break frontend
      res.status(200).json({ success: true, message: 'Event processing failed' });
    }
  })();
});

export default router;

