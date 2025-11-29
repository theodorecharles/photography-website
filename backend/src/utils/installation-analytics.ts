/**
 * Installation Analytics Utility
 * Sends installation events to the central analytics server
 */

import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config.js';
import { info, warn, error } from './logger.js';

const INSTALL_ANALYTICS_URL = 'https://galleria.website/api/analytics/install';

// In-memory tracking to prevent race conditions when multiple requests come in simultaneously
const inFlightEvents = new Set<string>();

/**
 * Get the path to the installation analytics tracking file
 */
function getTrackingFilePath(): string {
  return path.join(DATA_DIR, '.installation-analytics.json');
}

/**
 * Check if an installation analytics event has been sent
 */
function hasInstallationEventBeenSent(eventType: string): boolean {
  try {
    const trackingFile = getTrackingFilePath();
    if (!fs.existsSync(trackingFile)) {
      return false;
    }

    const content = fs.readFileSync(trackingFile, 'utf8');
    const tracking = JSON.parse(content);
    return tracking[eventType] === true;
  } catch (err) {
    // If file doesn't exist or is invalid, event hasn't been sent
    return false;
  }
}

/**
 * Mark an installation analytics event as sent
 */
function markInstallationEventSent(eventType: string): void {
  try {
    const trackingFile = getTrackingFilePath();
    const trackingDir = path.dirname(trackingFile);
    
    // Ensure directory exists
    if (!fs.existsSync(trackingDir)) {
      fs.mkdirSync(trackingDir, { recursive: true });
    }

    // Read existing tracking or create new
    let tracking: Record<string, boolean> = {};
    if (fs.existsSync(trackingFile)) {
      try {
        const content = fs.readFileSync(trackingFile, 'utf8');
        tracking = JSON.parse(content);
      } catch (err) {
        // If file is invalid, start fresh
        tracking = {};
      }
    }

    // Mark event as sent
    tracking[eventType] = true;

    // Write back to file
    fs.writeFileSync(trackingFile, JSON.stringify(tracking, null, 2), 'utf8');
  } catch (err) {
    error(`[Installation Analytics] Failed to mark ${eventType} as sent:`, err);
  }
}

/**
 * Send an installation analytics event to the central server
 * Only sends if the event hasn't been sent before
 */
export async function sendInstallationEvent(
  eventType: 'installation_started' | 'setup_complete',
  eventData?: Record<string, any>
): Promise<boolean> {
  try {
    // Check if event has already been sent (file-based tracking)
    if (hasInstallationEventBeenSent(eventType)) {
      info(`[Installation Analytics] Event ${eventType} already sent, skipping`);
      return false;
    }

    // Check if event is currently in-flight to prevent race conditions
    if (inFlightEvents.has(eventType)) {
      info(`[Installation Analytics] Event ${eventType} already in-flight, skipping`);
      return false;
    }

    // Mark event as in-flight
    inFlightEvents.add(eventType);

    try {
      // Prepare the event payload
      const payload = {
        event_type: eventType,
        timestamp: new Date().toISOString(),
        ...eventData,
      };

      // Send to central analytics server
      const response = await fetch(INSTALL_ANALYTICS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        warn(`[Installation Analytics] Failed to send ${eventType}:`, response.status, errorText);
        return false;
      }

      // Mark event as sent in file
      markInstallationEventSent(eventType);
      info(`[Installation Analytics] Successfully sent ${eventType} event`);
      return true;
    } finally {
      // Always remove from in-flight set, even if sending failed
      inFlightEvents.delete(eventType);
    }
  } catch (err) {
    error(`[Installation Analytics] Error sending ${eventType}:`, err);
    return false;
  }
}
