/**
 * Analytics route handler
 * Proxies analytics events to OpenObserve with authentication
 * This keeps credentials secure on the backend
 * 
 * Verifies HMAC signatures to prevent tampering
 */

import { Router } from 'express';
import crypto from 'crypto';
import config from '../config.ts';

const router = Router();

// Add debug middleware to trace all requests to this router
router.use((req, res, next) => {
  console.log('========================================');
  console.log('[Analytics Router] Request received');
  console.log('[Analytics Router] Method:', req.method);
  console.log('[Analytics Router] Path:', req.path);
  console.log('[Analytics Router] Full URL:', req.originalUrl);
  console.log('[Analytics Router] Headers:', JSON.stringify(req.headers, null, 2));
  console.log('========================================');
  next();
});

// Handle OPTIONS preflight for CORS
router.options('/track', (req, res) => {
  console.log('[Analytics] OPTIONS request handled');
  res.status(200).end();
});

/**
 * Verify HMAC signature
 */
function verifyHmac(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

// POST endpoint to receive analytics events from frontend
router.post('/track', async (req, res): Promise<void> => {
  console.log('[Analytics] Track request received');
  console.log('[Analytics] Headers:', req.headers);
  console.log('[Analytics] Body length:', JSON.stringify(req.body).length);
  
  try {
    // Get analytics configuration
    const analyticsConfig = config.analytics?.openobserve;
    const hmacSecret = config.analytics?.hmacSecret;
    
    if (!analyticsConfig || !analyticsConfig.enabled) {
      // Analytics disabled, return success without doing anything
      res.status(200).json({ success: true, message: 'Analytics disabled' });
      return;
    }

    const { endpoint, username, password } = analyticsConfig;

    if (!endpoint || !username || !password) {
      console.error('Analytics configuration incomplete');
      res.status(200).json({ success: true, message: 'Analytics not configured' });
      return;
    }

    // Verify HMAC signature if secret is configured
    if (hmacSecret) {
      const signature = req.headers['x-analytics-signature'];
      
      if (!signature || typeof signature !== 'string') {
        res.status(400).json({ error: 'Missing HMAC signature' });
        return;
      }

      const payload = JSON.stringify(req.body);
      const isValid = verifyHmac(payload, signature, hmacSecret);

      if (!isValid) {
        console.warn('Invalid HMAC signature for analytics event');
        res.status(403).json({ error: 'Invalid signature' });
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
        res.status(200).json({ success: true, message: 'Event logged with errors' });
        return;
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Analytics proxy error:', error);
      // Return success anyway to not break frontend
      res.status(200).json({ success: true, message: 'Event processing failed' });
    }
  });

export default router;

