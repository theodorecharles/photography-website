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
 * Execute a predefined SQL query against OpenObserve
 * Requires authentication
 * 
 * DEPRECATED: This endpoint is disabled for security reasons.
 * Use GET /api/metrics/stats instead which provides pre-defined queries.
 */
router.post('/query', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
  res.status(403).json({ 
    error: 'This endpoint is deprecated for security reasons. Use GET /api/metrics/stats instead.' 
  });
});

/**
 * GET /api/metrics/visitors-over-time
 * Get unique visitors per day for the time series chart
 * Requires authentication
 */
router.get('/visitors-over-time', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
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
    // Get timezone offset from query params (default to 0 for UTC)
    const timezoneOffset = parseFloat(req.query.timezoneOffset as string) || 0;
    
    // Calculate time range (OpenObserve uses microseconds)
    const endTime = Date.now() * 1000;
    const startTime = endTime - (days * 24 * 60 * 60 * 1000 * 1000);

    // Build the query endpoint
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

    // Determine the interval string for timezone adjustment
    // Positive offset means ahead of UTC (e.g., +5 for Eastern in winter)
    // Negative offset means behind UTC (e.g., -8 for Pacific)
    const absOffset = Math.abs(timezoneOffset);
    const intervalStr = timezoneOffset >= 0 
      ? `+ INTERVAL '${absOffset}' HOUR`
      : `- INTERVAL '${absOffset}' HOUR`;

    // Query for unique visitors per day with timezone adjustment
    // Based on user's working query with dynamic timezone offset
    const sql = `
      WITH normalized AS (
        SELECT
          date_trunc('day', to_timestamp_micros(_timestamp) ${intervalStr}) AS day_local,
          replace(trim(split_part(client_ip, ',', 1)), '::ffff:', '') AS ip
        FROM "${stream}"
        WHERE client_ip IS NOT NULL
          AND client_ip <> ''
          AND client_ip <> '-'
          AND _timestamp >= ${startTime} 
          AND _timestamp <= ${endTime}
      )
      SELECT
        day_local AS date,
        COUNT(DISTINCT ip) AS count
      FROM normalized
      GROUP BY day_local
      ORDER BY day_local ASC
    `;

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
      const errorText = await response.text();
      console.error('OpenObserve query error:', response.status, errorText);
      console.error('Query that failed:', sql);
      res.status(500).json({ error: 'Failed to retrieve time series data' });
      return;
    }

    const data = await response.json();
    console.log('Visitors over time query returned:', data.hits?.length || 0, 'results');
    res.status(200).json({ hits: data.hits || [] });
  } catch (error) {
    console.error('Visitors over time error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve time series data. Please try again later.'
    });
  }
});

/**
 * GET /api/metrics/visitor-locations
 * Get visitor locations based on geolocation data
 * Requires authentication
 */
router.get('/visitor-locations', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
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
    
    // Calculate time range (OpenObserve uses microseconds)
    const endTime = Date.now() * 1000;
    const startTime = endTime - (days * 24 * 60 * 60 * 1000 * 1000);

    // Build the query endpoint
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

    // Query for visitor locations
    // Group by coordinates only and take the first non-null city name for each location
    const sql = `
      SELECT 
        geo_latitude as latitude,
        geo_longitude as longitude,
        MAX(geo_city) as city,
        MAX(geo_region) as region,
        MAX(geo_country_name) as country,
        COUNT(*) as visit_count,
        COUNT(DISTINCT client_ip) as unique_visitors
      FROM "${stream}"
      WHERE geo_latitude IS NOT NULL 
        AND geo_longitude IS NOT NULL
        AND geo_city IS NOT NULL
        AND geo_city != ''
        AND _timestamp >= ${startTime} 
        AND _timestamp <= ${endTime}
      GROUP BY geo_latitude, geo_longitude
      ORDER BY visit_count DESC
      LIMIT 1000
    `;

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
      const errorText = await response.text();
      console.error('OpenObserve query error:', response.status, errorText);
      console.error('Query that failed:', sql);
      res.status(500).json({ error: 'Failed to retrieve location data' });
      return;
    }

    const data = await response.json();
    console.log('Visitor locations query returned:', data.hits?.length || 0, 'locations');
    res.status(200).json({ locations: data.hits || [] });
  } catch (error) {
    console.error('Visitor locations error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve location data. Please try again later.'
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
    // Calculate time range based on the days parameter (OpenObserve uses microseconds)
    const endTime = Date.now() * 1000; // Convert to microseconds
    const startTime = endTime - (days * 24 * 60 * 60 * 1000 * 1000); // Convert days to microseconds

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
        const errorText = await response.text();
        // Don't include detailed error messages that might leak infrastructure details
        console.error('OpenObserve query error:', response.status, errorText);
        throw new Error(`Query failed with status ${response.status}`);
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
    // Don't leak error details to client - they could expose infrastructure info
    res.status(500).json({ 
      error: 'Failed to retrieve metrics. Please try again later.'
    });
  }
});

export default router;

