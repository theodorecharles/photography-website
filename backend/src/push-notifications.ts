/**
 * Push Notifications Service
 * 
 * Handles Web Push API subscriptions and sending push notifications
 * to authenticated users for long-running job completions.
 */

import webPush from 'web-push';
import { getDatabase } from './database.js';
import { info, error as logError, warn } from './utils/logger.js';
import { getCurrentConfig } from './config.js';
import { isNotificationEnabled, type NotificationPreferences } from './notification-preferences.js';

const db = getDatabase();

// Type definitions
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
}

// Initialize VAPID keys from config
let vapidConfigured = false;

export function initializePushNotifications() {
  const config = getCurrentConfig();
  // @ts-ignore - config structure is dynamic
  const pushConfig = config.pushNotifications || {};
  
  if (!pushConfig.enabled) {
    info('[PushNotifications] Push notifications disabled in config');
    return false;
  }

  const vapidPublicKey = pushConfig.vapidPublicKey;
  const vapidPrivateKey = pushConfig.vapidPrivateKey;
  const vapidSubject = pushConfig.vapidSubject || 'mailto:admin@example.com';

  if (!vapidPublicKey || !vapidPrivateKey) {
    warn('[PushNotifications] VAPID keys not configured, generating new keys...');
    warn('[PushNotifications] Add these to your config.json:');
    const keys = webPush.generateVAPIDKeys();
    warn(JSON.stringify({
      pushNotifications: {
        enabled: true,
        vapidPublicKey: keys.publicKey,
        vapidPrivateKey: keys.privateKey,
        vapidSubject: 'mailto:admin@example.com'
      }
    }, null, 2));
    return false;
  }

  try {
    webPush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );
    vapidConfigured = true;
    info('[PushNotifications] VAPID configuration loaded successfully');
    return true;
  } catch (err) {
    logError('[PushNotifications] Failed to configure VAPID:', err);
    return false;
  }
}

/**
 * Get VAPID public key for client subscription
 */
export function getVapidPublicKey(): string | null {
  const config = getCurrentConfig();
  // @ts-ignore - config structure is dynamic
  const pushConfig = config.pushNotifications || {};
  return pushConfig.vapidPublicKey || null;
}

/**
 * Check if push notifications are enabled and configured
 */
export function isPushNotificationsEnabled(): boolean {
  const config = getCurrentConfig();
  info(`[PushNotifications] Full config keys: ${Object.keys(config).join(', ')}`);
  
  // @ts-ignore - config structure is dynamic
  const pushConfig = config.pushNotifications || {};
  info(`[PushNotifications] pushConfig: ${JSON.stringify(pushConfig)}`);
  
  // Check if enabled and has valid keys
  const hasKeys = !!pushConfig.vapidPublicKey && !!pushConfig.vapidPrivateKey;
  const enabled = pushConfig.enabled === true && hasKeys;
  
  info(`[PushNotifications] isPushNotificationsEnabled check: enabled=${pushConfig.enabled}, hasKeys=${hasKeys}, vapidConfigured=${vapidConfigured}`);
  
  // If enabled but VAPID not configured yet, try to configure it now
  if (enabled && !vapidConfigured) {
    info('[PushNotifications] Config is enabled but VAPID not configured, initializing now...');
    const result = initializePushNotifications();
    info(`[PushNotifications] Initialization result: ${result}`);
  }
  
  return enabled && vapidConfigured;
}

/**
 * Store a push subscription for a user
 */
export function saveSubscription(userId: number, subscription: PushSubscription, userAgent: string): boolean {
  if (!isPushNotificationsEnabled()) {
    warn('[PushNotifications] Attempted to save subscription but push notifications are disabled');
    return false;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(endpoint) DO UPDATE SET
        last_used_at = datetime('now'),
        user_agent = excluded.user_agent
    `);

    stmt.run(
      userId,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      userAgent
    );

    info(`[PushNotifications] Subscription saved for user ${userId}`);
    return true;
  } catch (err) {
    logError('[PushNotifications] Failed to save subscription:', err);
    return false;
  }
}

/**
 * Remove a push subscription
 */
export function removeSubscription(endpoint: string): boolean {
  try {
    const stmt = db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`);
    const result = stmt.run(endpoint);
    
    if (result.changes > 0) {
      info(`[PushNotifications] Subscription removed: ${endpoint.substring(0, 50)}...`);
      return true;
    }
    return false;
  } catch (err) {
    logError('[PushNotifications] Failed to remove subscription:', err);
    return false;
  }
}

/**
 * Get all push subscriptions for a user
 */
export function getUserSubscriptions(userId: number): PushSubscription[] {
  try {
    const stmt = db.prepare(`
      SELECT endpoint, p256dh, auth 
      FROM push_subscriptions 
      WHERE user_id = ?
    `);
    
    const rows = stmt.all(userId) as { endpoint: string; p256dh: string; auth: string }[];
    
    return rows.map(row => ({
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth
      }
    }));
  } catch (err) {
    logError('[PushNotifications] Failed to get user subscriptions:', err);
    return [];
  }
}

/**
 * Send a push notification to a specific user
 * @param userId - User ID to send notification to
 * @param payload - Notification payload
 * @param notificationType - Optional notification type to check preferences
 */
export async function sendNotificationToUser(
  userId: number, 
  payload: NotificationPayload,
  notificationType?: keyof NotificationPreferences
): Promise<void> {
  if (!isPushNotificationsEnabled()) {
    warn('[PushNotifications] Cannot send notification - push notifications are disabled');
    return;
  }

  // Check notification preferences if type is specified
  if (notificationType && !isNotificationEnabled(notificationType)) {
    info(`[PushNotifications] Notification type '${notificationType}' is disabled in preferences, skipping`);
    return;
  }

  const subscriptions = getUserSubscriptions(userId);
  
  if (subscriptions.length === 0) {
    info(`[PushNotifications] No subscriptions found for user ${userId}`);
    return;
  }

  info(`[PushNotifications] Sending notification to ${subscriptions.length} device(s) for user ${userId}`);

  const notificationPayload = JSON.stringify(payload);
  const sendPromises = subscriptions.map(async (subscription) => {
    try {
      await webPush.sendNotification(subscription, notificationPayload);
      info(`[PushNotifications] Notification sent successfully to ${subscription.endpoint.substring(0, 50)}...`);
    } catch (err: any) {
      logError(`[PushNotifications] Failed to send notification:`, err);
      
      // If subscription is invalid (410 Gone or 404 Not Found), remove it
      if (err.statusCode === 410 || err.statusCode === 404) {
        info(`[PushNotifications] Removing invalid subscription: ${subscription.endpoint.substring(0, 50)}...`);
        removeSubscription(subscription.endpoint);
      }
    }
  });

  await Promise.all(sendPromises);
}

/**
 * Send a push notification to all users (admin broadcast)
 */
export async function sendNotificationToAll(payload: NotificationPayload): Promise<void> {
  if (!isPushNotificationsEnabled()) {
    warn('[PushNotifications] Cannot send notification - push notifications are disabled');
    return;
  }

  try {
    const stmt = db.prepare(`
      SELECT DISTINCT user_id FROM push_subscriptions
    `);
    
    const users = stmt.all() as { user_id: number }[];
    
    info(`[PushNotifications] Broadcasting notification to ${users.length} user(s)`);
    
    const sendPromises = users.map(user => sendNotificationToUser(user.user_id, payload));
    await Promise.all(sendPromises);
  } catch (err) {
    logError('[PushNotifications] Failed to broadcast notification:', err);
  }
}

/**
 * Clean up old/stale subscriptions (older than 90 days)
 */
export function cleanupOldSubscriptions(): number {
  try {
    const stmt = db.prepare(`
      DELETE FROM push_subscriptions 
      WHERE datetime(last_used_at) < datetime('now', '-90 days')
    `);
    
    const result = stmt.run();
    
    if (result.changes > 0) {
      info(`[PushNotifications] Cleaned up ${result.changes} old subscription(s)`);
    }
    
    return result.changes;
  } catch (err) {
    logError('[PushNotifications] Failed to cleanup old subscriptions:', err);
    return 0;
  }
}

// Cleanup old subscriptions on startup and every 24 hours
if (isPushNotificationsEnabled()) {
  cleanupOldSubscriptions();
  setInterval(cleanupOldSubscriptions, 24 * 60 * 60 * 1000);
}

