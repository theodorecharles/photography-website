/**
 * Analytics route handler
 * Proxies analytics events to OpenObserve with authentication
 * This keeps credentials secure on the backend
 * 
 * Validates origin to prevent unauthorized tracking
 */

import { Router } from 'express';
import config from '../config.ts';

const router = Router();

// Handle OPTIONS preflight for CORS
router.options('/track', (req, res) => {
  res.status(200).end();
});

// POST endpoint to receive analytics events from frontend
router.post('/track', async (req, res): Promise<void> => {
  try {
    // Get analytics configuration
    const analyticsConfig = config.analytics?.openobserve;
    
    if (!analyticsConfig || !analyticsConfig.enabled) {
      // Analytics disabled, return success without doing anything
      res.status(200).json({ success: true, message: 'Analytics disabled' });
      return;
    }

    const { endpoint, organization, stream, username, password } = analyticsConfig;

    if (!endpoint || !organization || !stream || !username || !password) {
      console.error('Analytics configuration incomplete');
      res.status(200).json({ success: true, message: 'Analytics not configured' });
      return;
    }

    // Construct the full URL: {endpoint}{organization}/{stream}/_json
    const analyticsUrl = `${endpoint}${organization}/${stream}/_json`;

    // Validate origin - only allow requests from allowed origins
    const origin = req.get('Origin') || req.get('Referer');
    const allowedOrigins = config.backend.allowedOrigins;
    
    if (origin) {
      const isAllowedOrigin = allowedOrigins.some((allowed: string) => origin.startsWith(allowed));
      if (!isAllowedOrigin) {
        console.warn('Analytics request from unauthorized origin:', origin);
        res.status(403).json({ error: 'Unauthorized origin' });
        return;
      }
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
    
    const response = await fetch(analyticsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify(eventsWithIp),
    });

      if (!response.ok) {
        const errorText = await response.text();
        // Log detailed error on server, but don't send to client
        console.error('OpenObserve error:', response.status, errorText);
        // Return success anyway to not break frontend or leak infrastructure details
        res.status(200).json({ success: true });
        return;
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Analytics proxy error:', error);
      // Return success anyway to not break frontend or leak error details
      res.status(200).json({ success: true });
    }
  });

export default router;

