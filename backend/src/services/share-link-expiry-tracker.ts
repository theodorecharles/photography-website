/**
 * Share Link Expiry Tracker Service
 * Periodically checks for expired share links and notifies admins
 */

import { getDatabase } from '../database.js';
import { sendNotificationToUser } from '../push-notifications.js';
import { translateNotification } from '../i18n-backend.js';
import { getAllUsers } from '../database-users.js';
import { info, error } from '../utils/logger.js';

const db = getDatabase();

interface ShareLink {
  id: number;
  album: string;
  secret_key: string;
  created_at: string;
  expires_at: string | null;
  notified: number; // 0 = not notified, 1 = notified
}

/**
 * Check for expired share links that haven't been notified about yet
 */
export async function checkExpiredShareLinks(): Promise<void> {
  try {
    info('[ShareLinkExpiryTracker] Checking for expired share links...');

    // Find share links that:
    // 1. Have an expiration date (expires_at IS NOT NULL)
    // 2. Are expired (expires_at < now)
    // 3. Haven't been notified yet (notified = 0)
    const stmt = db.prepare(`
      SELECT id, album, secret_key, created_at, expires_at, notified
      FROM share_links
      WHERE expires_at IS NOT NULL
        AND datetime(expires_at) < datetime('now')
        AND notified = 0
    `);

    const expiredLinks = stmt.all() as ShareLink[];

    if (expiredLinks.length === 0) {
      info('[ShareLinkExpiryTracker] No newly expired share links found');
      return;
    }

    info(`[ShareLinkExpiryTracker] Found ${expiredLinks.length} newly expired share link(s)`);

    // Notify admins about each expired link
    for (const link of expiredLinks) {
      await notifyExpiredLink(link);
      
      // Mark as notified
      const updateStmt = db.prepare('UPDATE share_links SET notified = 1 WHERE id = ?');
      updateStmt.run(link.id);
    }

    info(`[ShareLinkExpiryTracker] Notified admins about ${expiredLinks.length} expired link(s)`);
  } catch (err) {
    error('[ShareLinkExpiryTracker] Error checking expired share links:', err);
  }
}

/**
 * Send notification to all admins about an expired share link
 */
async function notifyExpiredLink(link: ShareLink): Promise<void> {
  try {
    const admins = getAllUsers().filter(u => u.role === 'admin');

    for (const admin of admins) {
      const title = await translateNotification(
        'notifications.backend.shareLinkExpiredTitle',
        { albumName: link.album }
      );
      const body = await translateNotification(
        'notifications.backend.shareLinkExpiredBody',
        { albumName: link.album }
      );

      await sendNotificationToUser(admin.id, {
        title,
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'share-link-expired',
        requireInteraction: false
      }, 'shareLinkExpired');
    }

    info(`[ShareLinkExpiryTracker] Notified admins about expired link for album: ${link.album}`);
  } catch (err) {
    error('[ShareLinkExpiryTracker] Failed to notify about expired link:', err);
  }
}

/**
 * Start periodic expiry checking (every hour)
 */
export function startShareLinkExpiryTracking(): void {
  info('[ShareLinkExpiryTracker] Starting periodic share link expiry tracking (every hour)');

  // Check immediately on startup
  checkExpiredShareLinks().catch(err => {
    error('[ShareLinkExpiryTracker] Initial expiry check failed:', err);
  });

  // Then check every hour
  setInterval(() => {
    checkExpiredShareLinks().catch(err => {
      error('[ShareLinkExpiryTracker] Periodic expiry check failed:', err);
    });
  }, 60 * 60 * 1000); // 1 hour
}

