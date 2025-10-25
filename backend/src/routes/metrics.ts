/**
 * Metrics route handler
 * Provides authenticated access to query analytics data from OpenObserve
 * This proxies queries to OpenObserve to keep credentials secure on the backend
 */

import { Router, Request, Response } from 'express';
import config from '../config.ts';
import { isAuthenticated } from './auth.ts';

const router = Router();

/**
 * POST /api/metrics/query
 * Execute a SQL query against OpenObserve
 * Requires authentication
 */
router.post('/query', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const analyticsConfig = config.analytics?.openobserve;
    
    if (!analyticsConfig || !analyticsConfig.enabled) {
      res.status(503).json({ error: 'Analytics not configured' });
      return;
    }

    const { endpoint, organization, stream, username, password, serviceToken } = analyticsConfig;

    if (!endpoint || !organization || !stream) {
      console.error('Analytics endpoint configuration incomplete');
      res.status(503).json({ error: 'Analytics not properly configured' });
      return;
    }

    // Check if we have either service token or username/password
    if (!serviceToken && (!username || !password)) {
      console.error('Analytics authentication not configured (need either serviceToken or username/password)');
      res.status(503).json({ error: 'Analytics authentication not configured' });
      return;
    }

    // Extract the SQL query from request body
    const { sql, startTime, endTime } = req.body;

    if (!sql) {
      res.status(400).json({ error: 'SQL query is required' });
      return;
    }

    // Build the query endpoint: {endpoint}{organization}/_search
    const queryEndpoint = `${endpoint}${organization}/_search`;

    // Build the query payload
    const queryPayload = {
      query: {
        sql: sql,
        start_time: startTime || Date.now() - 30 * 24 * 60 * 60 * 1000, // Default: 30 days ago
        end_time: endTime || Date.now(),
        from: 0,
        size: 10000, // Max results
        sql_mode: "full"
      },
      aggs: {
        histogram: "1 hour"
      }
    };

    // Make the query request to OpenObserve
    // Use service token if available, otherwise use basic auth
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (serviceToken) {
      headers['Authorization'] = `Bearer ${serviceToken}`;
    } else {
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }
    
    const response = await fetch(queryEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(queryPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenObserve query error:', response.status, errorText);
      res.status(response.status).json({ 
        error: 'Query failed', 
        details: errorText 
      });
      return;
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Metrics query error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/metrics/stats
 * Get pre-computed statistics for the dashboard
 * Requires authentication
 */
router.get('/stats', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const analyticsConfig = config.analytics?.openobserve;
    
    if (!analyticsConfig || !analyticsConfig.enabled) {
      res.status(503).json({ error: 'Analytics not configured' });
      return;
    }

    const { endpoint, organization, stream, username, password, serviceToken } = analyticsConfig;

    if (!endpoint || !organization || !stream) {
      res.status(503).json({ error: 'Analytics endpoint configuration incomplete' });
      return;
    }

    // Check if we have either service token or username/password
    if (!serviceToken && (!username || !password)) {
      res.status(503).json({ error: 'Analytics authentication not configured' });
      return;
    }

    // Get time range from query params (default to last 30 days)
    const days = parseInt(req.query.days as string) || 30;
    // Use a very wide range to catch all events (supports both past and future timestamps)
    const endTime = 1800000000000000; // Far future (year 2027 in microseconds)
    const startTime = 1700000000000000; // Recent past (year 2023 in microseconds)

    // Build the query endpoint: {endpoint}{organization}/_search
    const queryEndpoint = `${endpoint}${organization}/_search`;
    
    // Prepare authorization header
    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (serviceToken) {
      authHeaders['Authorization'] = `Bearer ${serviceToken}`;
    } else {
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');
      authHeaders['Authorization'] = `Basic ${credentials}`;
    }

    // Helper function to execute a query
    const executeQuery = async (sql: string) => {
      const queryPayload = {
        query: {
          sql,
          start_time: startTime,
          end_time: endTime,
          from: 0,
          size: 10000,
          sql_mode: "full"
        }
      };

      const response = await fetch(queryEndpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(queryPayload),
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`);
      }

      return await response.json();
    };

    // Execute multiple queries in parallel
    const [
      uniqueVisitorsResult,
      pageViewsResult,
      topPagesResult,
      topReferrersResult,
      eventTypesResult,
      totalViewDurationResult,
      topPicturesByDurationResult
    ] = await Promise.all([
      // Unique visitors (by IP)
      executeQuery(`SELECT COUNT(DISTINCT client_ip) as unique_visitors FROM "${stream}" WHERE _timestamp >= ${startTime} AND _timestamp <= ${endTime}`),
      
      // Total page views
      executeQuery(`SELECT COUNT(*) as page_views FROM "${stream}" WHERE event_type = 'pageview' AND _timestamp >= ${startTime} AND _timestamp <= ${endTime}`),
      
      // Top pages
      executeQuery(`SELECT page_path, COUNT(*) as views FROM "${stream}" WHERE event_type = 'pageview' AND _timestamp >= ${startTime} AND _timestamp <= ${endTime} GROUP BY page_path ORDER BY views DESC LIMIT 10`),
      
      // Top referrers
      executeQuery(`SELECT referrer, COUNT(*) as count FROM "${stream}" WHERE event_type = 'pageview' AND _timestamp >= ${startTime} AND _timestamp <= ${endTime} GROUP BY referrer ORDER BY count DESC LIMIT 10`),
      
      // Event types distribution
      executeQuery(`SELECT event_type, COUNT(*) as count FROM "${stream}" WHERE _timestamp >= ${startTime} AND _timestamp <= ${endTime} GROUP BY event_type ORDER BY count DESC`),
      
      // Total view duration (in milliseconds) - sum all events with view_duration_ms
      executeQuery(`SELECT SUM(view_duration_ms) as total_duration FROM "${stream}" WHERE view_duration_ms IS NOT NULL AND _timestamp >= ${startTime} AND _timestamp <= ${endTime}`),
      
      // Top pictures by total view duration - aggregate by photo_id
      executeQuery(`SELECT photo_id, SUM(view_duration_ms) as total_duration, AVG(view_duration_ms) as avg_duration, COUNT(*) as views FROM "${stream}" WHERE view_duration_ms IS NOT NULL AND photo_id IS NOT NULL AND _timestamp >= ${startTime} AND _timestamp <= ${endTime} GROUP BY photo_id ORDER BY total_duration DESC LIMIT 10`)
    ]);

    // Extract results
    const stats = {
      uniqueVisitors: uniqueVisitorsResult.hits?.[0]?.unique_visitors || 0,
      pageViews: pageViewsResult.hits?.[0]?.page_views || 0,
      topPages: topPagesResult.hits || [],
      topReferrers: topReferrersResult.hits || [],
      eventTypes: eventTypesResult.hits || [],
      totalViewDuration: totalViewDurationResult.hits?.[0]?.total_duration || 0,
      topPicturesByDuration: topPicturesByDurationResult.hits || [],
      stream: stream, // Include stream name for frontend queries
      timeRange: {
        start: startTime,
        end: endTime,
        days: days
      }
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Metrics stats error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

