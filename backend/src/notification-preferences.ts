/**
 * Notification Preferences Service
 * 
 * Manages granular notification preferences for different event types.
 * Admins can toggle which notifications they want to receive.
 */

import { getCurrentConfig } from './config.js';
import { info, warn } from './utils/logger.js';

export interface NotificationPreferences {
  // Security & Authentication
  userInvited: boolean;
  userAcceptedInvite: boolean;
  userDeleted: boolean;
  userRoleChanged: boolean;
  passkeyCreated: boolean;
  passkeyDeleted: boolean;
  mfaEnabled: boolean;
  mfaDisabled: boolean;
  passwordChanged: boolean;
  adminPasswordReset: boolean;
  failedLoginAttempts: boolean;
  suspiciousActivity: boolean;
  
  // Content Management
  albumCreated: boolean;
  albumPublished: boolean;
  albumDeleted: boolean;
  largePhotoUpload: boolean;
  shareLinkCreated: boolean;
  shareLinkAccessed: boolean;
  shareLinkExpired: boolean;
  
  // System & Configuration
  configUpdated: boolean;
  smtpSettingsChanged: boolean;
  openaiApiKeyUpdated: boolean;
  brandingUpdated: boolean;
  lowDiskSpace: boolean;
  databaseBackupCompleted: boolean;
}

// Default preferences - all enabled by default
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  // Security & Authentication - all enabled (important)
  userInvited: true,
  userAcceptedInvite: true,
  userDeleted: true,
  userRoleChanged: true,
  passkeyCreated: true,
  passkeyDeleted: true,
  mfaEnabled: true,
  mfaDisabled: true,
  passwordChanged: true,
  adminPasswordReset: true,
  failedLoginAttempts: true,
  suspiciousActivity: true,
  
  // Content Management - selective defaults
  albumCreated: true,
  albumPublished: true,
  albumDeleted: true,
  largePhotoUpload: true,
  shareLinkCreated: false, // Can be noisy
  shareLinkAccessed: false, // Can be noisy
  shareLinkExpired: false,
  
  // System & Configuration
  configUpdated: true,
  smtpSettingsChanged: true,
  openaiApiKeyUpdated: true,
  brandingUpdated: false,
  lowDiskSpace: true,
  databaseBackupCompleted: false,
};

/**
 * Get notification preferences from config
 * Falls back to defaults if not configured
 */
export function getNotificationPreferences(): NotificationPreferences {
  try {
    const config = getCurrentConfig();
    const prefs = (config as any).notificationPreferences;
    
    if (!prefs) {
      info('[NotificationPreferences] No preferences found in config, using defaults');
      return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    }
    
    // Merge with defaults to ensure all keys exist
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...prefs
    };
  } catch (err) {
    warn('[NotificationPreferences] Error loading preferences, using defaults:', err);
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

/**
 * Check if a specific notification type is enabled
 */
export function isNotificationEnabled(type: keyof NotificationPreferences): boolean {
  const prefs = getNotificationPreferences();
  return prefs[type] === true;
}

/**
 * Notification categories for UI organization
 */
export interface NotificationCategory {
  key: string;
  titleKey: string;
  descriptionKey: string;
  notifications: Array<{
    key: keyof NotificationPreferences;
    titleKey: string;
    descriptionKey: string;
    icon: string;
  }>;
}

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    key: 'security',
    titleKey: 'settings.notifications.categories.security.title',
    descriptionKey: 'settings.notifications.categories.security.description',
    notifications: [
      {
        key: 'userInvited',
        titleKey: 'settings.notifications.types.userInvited.title',
        descriptionKey: 'settings.notifications.types.userInvited.description',
        icon: '✉️'
      },
      {
        key: 'userAcceptedInvite',
        titleKey: 'settings.notifications.types.userAcceptedInvite.title',
        descriptionKey: 'settings.notifications.types.userAcceptedInvite.description',
        icon: '✅'
      },
      {
        key: 'userDeleted',
        titleKey: 'settings.notifications.types.userDeleted.title',
        descriptionKey: 'settings.notifications.types.userDeleted.description',
        icon: '🗑️'
      },
      {
        key: 'userRoleChanged',
        titleKey: 'settings.notifications.types.userRoleChanged.title',
        descriptionKey: 'settings.notifications.types.userRoleChanged.description',
        icon: '👤'
      },
      {
        key: 'passkeyCreated',
        titleKey: 'settings.notifications.types.passkeyCreated.title',
        descriptionKey: 'settings.notifications.types.passkeyCreated.description',
        icon: '🔑'
      },
      {
        key: 'passkeyDeleted',
        titleKey: 'settings.notifications.types.passkeyDeleted.title',
        descriptionKey: 'settings.notifications.types.passkeyDeleted.description',
        icon: '🔓'
      },
      {
        key: 'mfaEnabled',
        titleKey: 'settings.notifications.types.mfaEnabled.title',
        descriptionKey: 'settings.notifications.types.mfaEnabled.description',
        icon: '🔐'
      },
      {
        key: 'mfaDisabled',
        titleKey: 'settings.notifications.types.mfaDisabled.title',
        descriptionKey: 'settings.notifications.types.mfaDisabled.description',
        icon: '🔓'
      },
      {
        key: 'passwordChanged',
        titleKey: 'settings.notifications.types.passwordChanged.title',
        descriptionKey: 'settings.notifications.types.passwordChanged.description',
        icon: '🔒'
      },
      {
        key: 'adminPasswordReset',
        titleKey: 'settings.notifications.types.adminPasswordReset.title',
        descriptionKey: 'settings.notifications.types.adminPasswordReset.description',
        icon: '🔄'
      },
      {
        key: 'failedLoginAttempts',
        titleKey: 'settings.notifications.types.failedLoginAttempts.title',
        descriptionKey: 'settings.notifications.types.failedLoginAttempts.description',
        icon: '⚠️'
      },
      {
        key: 'suspiciousActivity',
        titleKey: 'settings.notifications.types.suspiciousActivity.title',
        descriptionKey: 'settings.notifications.types.suspiciousActivity.description',
        icon: '🚨'
      }
    ]
  },
  {
    key: 'content',
    titleKey: 'settings.notifications.categories.content.title',
    descriptionKey: 'settings.notifications.categories.content.description',
    notifications: [
      {
        key: 'albumCreated',
        titleKey: 'settings.notifications.types.albumCreated.title',
        descriptionKey: 'settings.notifications.types.albumCreated.description',
        icon: '📁'
      },
      {
        key: 'albumPublished',
        titleKey: 'settings.notifications.types.albumPublished.title',
        descriptionKey: 'settings.notifications.types.albumPublished.description',
        icon: '🌐'
      },
      {
        key: 'albumDeleted',
        titleKey: 'settings.notifications.types.albumDeleted.title',
        descriptionKey: 'settings.notifications.types.albumDeleted.description',
        icon: '🗑️'
      },
      {
        key: 'largePhotoUpload',
        titleKey: 'settings.notifications.types.largePhotoUpload.title',
        descriptionKey: 'settings.notifications.types.largePhotoUpload.description',
        icon: '📸'
      },
      {
        key: 'shareLinkCreated',
        titleKey: 'settings.notifications.types.shareLinkCreated.title',
        descriptionKey: 'settings.notifications.types.shareLinkCreated.description',
        icon: '🔗'
      },
      {
        key: 'shareLinkAccessed',
        titleKey: 'settings.notifications.types.shareLinkAccessed.title',
        descriptionKey: 'settings.notifications.types.shareLinkAccessed.description',
        icon: '👁️'
      },
      {
        key: 'shareLinkExpired',
        titleKey: 'settings.notifications.types.shareLinkExpired.title',
        descriptionKey: 'settings.notifications.types.shareLinkExpired.description',
        icon: '⏰'
      }
    ]
  },
  {
    key: 'system',
    titleKey: 'settings.notifications.categories.system.title',
    descriptionKey: 'settings.notifications.categories.system.description',
    notifications: [
      {
        key: 'configUpdated',
        titleKey: 'settings.notifications.types.configUpdated.title',
        descriptionKey: 'settings.notifications.types.configUpdated.description',
        icon: '⚙️'
      },
      {
        key: 'smtpSettingsChanged',
        titleKey: 'settings.notifications.types.smtpSettingsChanged.title',
        descriptionKey: 'settings.notifications.types.smtpSettingsChanged.description',
        icon: '📧'
      },
      {
        key: 'openaiApiKeyUpdated',
        titleKey: 'settings.notifications.types.openaiApiKeyUpdated.title',
        descriptionKey: 'settings.notifications.types.openaiApiKeyUpdated.description',
        icon: '🤖'
      },
      {
        key: 'brandingUpdated',
        titleKey: 'settings.notifications.types.brandingUpdated.title',
        descriptionKey: 'settings.notifications.types.brandingUpdated.description',
        icon: '🎨'
      },
      {
        key: 'lowDiskSpace',
        titleKey: 'settings.notifications.types.lowDiskSpace.title',
        descriptionKey: 'settings.notifications.types.lowDiskSpace.description',
        icon: '💾'
      },
      {
        key: 'databaseBackupCompleted',
        titleKey: 'settings.notifications.types.databaseBackupCompleted.title',
        descriptionKey: 'settings.notifications.types.databaseBackupCompleted.description',
        icon: '💼'
      }
    ]
  }
];
