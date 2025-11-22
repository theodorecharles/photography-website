/**
 * Download Tracker Service
 * Tracks photo/video downloads and sends notifications
 */

import { Request, Response, NextFunction } from 'express';
import { sendNotificationToUser } from '../push-notifications.js';
import { translateNotification } from '../i18n-backend.js';
import { getAllUsers } from '../database-users.js';
import { error, info } from '../utils/logger.js';
import path from 'path';

/**
 * Middleware to track downloads and send notifications
 * Place before express.static to intercept download requests
 */
export function downloadTrackingMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only track /optimized/download/ requests
  if (!req.path.startsWith('/download/')) {
    return next();
  }

  // Extract album and filename from path: /download/AlbumName/photo.jpg
  const pathParts = req.path.split('/').filter(p => p);
  if (pathParts.length < 3) {
    return next();
  }

  const [, album, filename] = pathParts;

  // Send notification asynchronously (don't block download)
  notifyDownload(album, decodeURIComponent(filename)).catch(err => {
    error('[DownloadTracker] Failed to send notification:', err);
  });

  next();
}

/**
 * Send download notification to all admins
 */
async function notifyDownload(album: string, filename: string): Promise<void> {
  try {
    const admins = getAllUsers().filter(u => u.role === 'admin');

    for (const admin of admins) {
      const title = await translateNotification('notifications.backend.photoDownloadedTitle', {
        albumName: album,
        filename
      });
      const body = await translateNotification('notifications.backend.photoDownloadedBody', {
        albumName: album,
        filename
      });

      await sendNotificationToUser(admin.id, {
        title,
        body,
        tag: 'photo-downloaded',
        requireInteraction: false
      }, 'photoDownloaded');
    }

    info(`[DownloadTracker] Download tracked: ${album}/${filename}`);
  } catch (err) {
    error('[DownloadTracker] Failed to send download notification:', err);
  }
}
