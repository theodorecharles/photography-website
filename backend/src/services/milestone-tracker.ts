/**
 * Album View Milestone Tracker
 * Periodically checks album view counts and notifies when milestones are reached
 * 
 * Milestones: 100, 1000, 10000 views
 * 
 * Run this script periodically (e.g., via cron job or integrate into server startup)
 */

import config from '../config.js';
import { sendNotificationToUser } from '../push-notifications.js';
import { translateNotification } from '../i18n-backend.js';
import { getAllUsers } from '../database-users.js';
import { error, info, warn } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config.js';

// Milestones: 100, 1000, 5000, then every 5000 after that
const MILESTONES = [
  100, 1000, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 
  45000, 50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 
  95000, 100000, 150000, 200000, 250000, 300000, 400000, 500000, 1000000
];
const MILESTONE_FILE = path.join(DATA_DIR, '.album-milestones.json');

interface MilestoneData {
  [albumName: string]: number; // Highest milestone reached
}

/**
 * Load milestone data from disk
 */
function loadMilestoneData(): MilestoneData {
  try {
    if (fs.existsSync(MILESTONE_FILE)) {
      const data = fs.readFileSync(MILESTONE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    warn('[MilestoneTracker] Failed to load milestone data:', err);
  }
  return {};
}

/**
 * Save milestone data to disk
 */
function saveMilestoneData(data: MilestoneData): void {
  try {
    fs.writeFileSync(MILESTONE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    error('[MilestoneTracker] Failed to save milestone data:', err);
  }
}

/**
 * Query OpenObserve for album view counts
 */
async function getAlbumViewCounts(): Promise<Map<string, number>> {
  const analyticsConfig = config.analytics?.openobserve;

  if (!analyticsConfig || !analyticsConfig.enabled) {
    warn('[MilestoneTracker] Analytics not configured');
    return new Map();
  }

  const { endpoint, organization, stream, username, password, serviceToken } = analyticsConfig;

  if (!endpoint || !organization || !stream) {
    warn('[MilestoneTracker] Analytics endpoint configuration incomplete');
    return new Map();
  }

  if (!serviceToken && (!username || !password)) {
    warn('[MilestoneTracker] Analytics authentication not configured');
    return new Map();
  }

  try {
    const queryEndpoint = `${endpoint}${organization}/_search`;

    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (serviceToken) {
      authHeaders['Authorization'] = `Bearer ${serviceToken}`;
    } else {
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');
      authHeaders['Authorization'] = `Basic ${credentials}`;
    }

    // Query for album view counts (all-time)
    const sql = `
      SELECT
        page_path AS album_path,
        COUNT(*) AS view_count
      FROM "${stream}"
      WHERE event_type = 'pageview'
        AND page_path LIKE '/albums/%'
      GROUP BY page_path
      ORDER BY view_count DESC
    `;

    // Set wide time range for all-time query (last 10 years)
    const endTime = Date.now() * 1000; // Convert to microseconds
    const startTime = endTime - (10 * 365 * 24 * 60 * 60 * 1000 * 1000); // 10 years in microseconds

    const response = await fetch(queryEndpoint, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        query: {
          sql,
          start_time: startTime,
          end_time: endTime,
          from: 0,
          size: 1000,
          sql_mode: 'full',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      error('[MilestoneTracker] OpenObserve query failed:', response.status, errorText);
      return new Map();
    }

    const result = await response.json();
    const viewCounts = new Map<string, number>();

    for (const hit of result.hits || []) {
      const albumPath = hit.album_path;
      const viewCount = parseInt(hit.view_count) || 0;

      if (albumPath && albumPath.startsWith('/albums/')) {
        // Extract album name from path: /albums/AlbumName -> AlbumName
        const albumName = albumPath.replace('/albums/', '').split('?')[0];
        if (albumName) {
          viewCounts.set(albumName, viewCount);
        }
      }
    }

    info(`[MilestoneTracker] Retrieved view counts for ${viewCounts.size} albums`);
    return viewCounts;
  } catch (err) {
    error('[MilestoneTracker] Failed to query album views:', err);
    return new Map();
  }
}

/**
 * Check for new milestones and send notifications
 */
export async function checkMilestones(): Promise<void> {
  try {
    info('[MilestoneTracker] Checking for album view milestones...');

    const milestoneData = loadMilestoneData();
    const viewCounts = await getAlbumViewCounts();
    let milestonesReached = 0;

    for (const [albumName, currentViews] of viewCounts.entries()) {
      const lastMilestone = milestoneData[albumName] || 0;

      // Check if any new milestones were reached
      for (const milestone of MILESTONES) {
        if (currentViews >= milestone && lastMilestone < milestone) {
          // New milestone reached!
          info(`[MilestoneTracker] 🎉 ${albumName} reached ${milestone} views!`);

          // Send notification to all admins
          const admins = getAllUsers().filter(u => u.role === 'admin');

          for (const admin of admins) {
            const title = await translateNotification('notifications.backend.albumViewMilestoneTitle', {
              albumName,
              milestone: milestone.toLocaleString()
            });
            const body = await translateNotification('notifications.backend.albumViewMilestoneBody', {
              albumName,
              milestone: milestone.toLocaleString()
            });

            await sendNotificationToUser(admin.id, {
              title,
              body,
              tag: `milestone-${albumName}-${milestone}`,
              requireInteraction: true
            }, 'albumViewMilestone');
          }

          // Update milestone data
          milestoneData[albumName] = milestone;
          milestonesReached++;
        }
      }
    }

    // Save updated milestone data
    if (milestonesReached > 0) {
      saveMilestoneData(milestoneData);
      info(`[MilestoneTracker] ✅ ${milestonesReached} new milestone(s) reached`);
    } else {
      info('[MilestoneTracker] No new milestones reached');
    }
  } catch (err) {
    error('[MilestoneTracker] Error checking milestones:', err);
  }
}

/**
 * Start periodic milestone checking (every hour)
 */
export function startMilestoneTracking(): void {
  info('[MilestoneTracker] Starting periodic milestone tracking (every hour)');

  // Check immediately on startup
  checkMilestones().catch(err => {
    error('[MilestoneTracker] Initial milestone check failed:', err);
  });

  // Then check every hour
  setInterval(() => {
    checkMilestones().catch(err => {
      error('[MilestoneTracker] Periodic milestone check failed:', err);
    });
  }, 60 * 60 * 1000); // 1 hour
}
