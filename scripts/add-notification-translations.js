#!/usr/bin/env node
/**
 * Add all notification translation keys to en.json
 * Run this once, then use auto-translate.js to translate to all languages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enPath = path.join(__dirname, '../frontend/src/i18n/locales/en.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Add all notification translations
const notifications = {
  // Push notification banner (already exists)
  // Backend notifications (already has some, adding the rest)
  backend: {
    ...enData.notifications.backend,
    // User Deleted
    userDeletedTitle: "User Deleted",
    userDeletedBody: "A user account has been deleted",
    // User Role Changed
    userRoleChangedTitle: "User Role Changed",
    userRoleChangedBody: "A user's role has been changed",
    // Passkey Deleted
    passkeyDeletedTitle: "Passkey Deleted",
    passkeyDeletedBody: "A user has removed a passkey",
    // MFA Disabled
    mfaDisabledTitle: "MFA Disabled",
    mfaDisabledBody: "A user has disabled multi-factor authentication",
    // Password Changed
    passwordChangedTitle: "Password Changed",
    passwordChangedBody: "A user has changed their password",
    // Admin Password Reset
    adminPasswordResetTitle: "Password Reset Sent",
    adminPasswordResetBody: "An admin sent a password reset email",
    // Failed Login Attempts
    failedLoginAttemptsTitle: "Failed Login Attempts",
    failedLoginAttemptsBody: "Multiple failed login attempts detected",
    // Suspicious Activity
    suspiciousActivityTitle: "Suspicious Activity",
    suspiciousActivityBody: "Login from new device or location detected",
    // Album Created
    albumCreatedTitle: "Album Created",
    albumCreatedBody: "A new album has been created",
    // Album Published
    albumPublishedTitle: "Album Published",
    albumPublishedBody: "An album has been made public",
    // Album Deleted
    albumDeletedTitle: "Album Deleted",
    albumDeletedBody: "An album has been deleted",
    // Large Photo Upload
    largePhotoUploadTitle: "Large Upload",
    largePhotoUploadBody: "50+ photos uploaded in one batch",
    // Share Link Created
    shareLinkCreatedTitle: "Share Link Created",
    shareLinkCreatedBody: "A new share link has been created",
    // Share Link Accessed
    shareLinkAccessedTitle: "Share Link Viewed",
    shareLinkAccessedBody: "Someone viewed a shared album",
    // Share Link Expired
    shareLinkExpiredTitle: "Share Link Expired",
    shareLinkExpiredBody: "A share link has expired",
    // Config Updated
    configUpdatedTitle: "Settings Changed",
    configUpdatedBody: "System configuration has been updated",
    // SMTP Settings Changed
    smtpSettingsChangedTitle: "Email Settings Changed",
    smtpSettingsChangedBody: "SMTP configuration has been updated",
    // OpenAI API Key Updated
    openaiApiKeyUpdatedTitle: "AI Settings Changed",
    openaiApiKeyUpdatedBody: "OpenAI API key has been updated",
    // Branding Updated
    brandingUpdatedTitle: "Branding Updated",
    brandingUpdatedBody: "Site branding has been changed",
    // Low Disk Space
    lowDiskSpaceTitle: "Low Disk Space",
    lowDiskSpaceBody: "Storage is running low (< 10% remaining)",
    // Database Backup Completed
    databaseBackupCompletedTitle: "Backup Complete",
    databaseBackupCompletedBody: "Database backup completed successfully"
  }
};

// Add settings translations
const settings = {
  ...enData.settings,
  notifications: {
    title: "Notification Preferences",
    description: "Configure which push notifications you want to receive",
    saved: "Notification preferences saved",
    confirmReset: "Reset all notification preferences to defaults?",
    resetSuccess: "Notification preferences reset to defaults",
    resetToDefaults: "Reset to Defaults",
    enableAll: "Enable All",
    disableAll: "Disable All",
    categories: {
      security: {
        title: "Security & Authentication",
        description: "Notifications about user accounts, logins, and security events"
      },
      content: {
        title: "Content Management",
        description: "Notifications about albums, photos, and shares"
      },
      system: {
        title: "System & Configuration",
        description: "Notifications about settings changes and system events"
      }
    },
    types: {
      userInvited: {
        title: "User Invited",
        description: "When an admin invites a new user"
      },
      userAcceptedInvite: {
        title: "User Joined",
        description: "When a user accepts an invitation"
      },
      userDeleted: {
        title: "User Deleted",
        description: "When an admin deletes a user account"
      },
      userRoleChanged: {
        title: "User Role Changed",
        description: "When a user's role is changed"
      },
      passkeyCreated: {
        title: "Passkey Created",
        description: "When a user registers a new passkey"
      },
      passkeyDeleted: {
        title: "Passkey Deleted",
        description: "When a user removes a passkey"
      },
      mfaEnabled: {
        title: "MFA Enabled",
        description: "When a user enables multi-factor authentication"
      },
      mfaDisabled: {
        title: "MFA Disabled",
        description: "When a user disables multi-factor authentication"
      },
      passwordChanged: {
        title: "Password Changed",
        description: "When a user changes their password"
      },
      adminPasswordReset: {
        title: "Admin Password Reset",
        description: "When an admin initiates a password reset"
      },
      failedLoginAttempts: {
        title: "Failed Login Attempts",
        description: "When multiple failed login attempts are detected"
      },
      suspiciousActivity: {
        title: "Suspicious Activity",
        description: "When login from new device/location is detected"
      },
      albumCreated: {
        title: "Album Created",
        description: "When a new album is created"
      },
      albumPublished: {
        title: "Album Published",
        description: "When an album is made public"
      },
      albumDeleted: {
        title: "Album Deleted",
        description: "When an album is deleted"
      },
      largePhotoUpload: {
        title: "Large Upload",
        description: "When 50+ photos are uploaded at once"
      },
      shareLinkCreated: {
        title: "Share Link Created",
        description: "When a new share link is created"
      },
      shareLinkAccessed: {
        title: "Share Link Accessed",
        description: "When someone views a shared album"
      },
      shareLinkExpired: {
        title: "Share Link Expired",
        description: "When a share link expires"
      },
      configUpdated: {
        title: "Settings Changed",
        description: "When system configuration is updated"
      },
      smtpSettingsChanged: {
        title: "SMTP Settings Changed",
        description: "When email configuration is updated"
      },
      openaiApiKeyUpdated: {
        title: "AI Settings Changed",
        description: "When OpenAI API key is updated"
      },
      brandingUpdated: {
        title: "Branding Updated",
        description: "When site branding is changed"
      },
      lowDiskSpace: {
        title: "Low Disk Space",
        description: "When storage is below 10%"
      },
      databaseBackupCompleted: {
        title: "Backup Complete",
        description: "When database backup finishes"
      }
    }
  }
};

// Update the data
enData.notifications = notifications;
enData.settings = settings;

// Save
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2) + '\n');
console.log('✅ Added all notification translations to en.json');
console.log('📝 Run: node scripts/auto-translate.js to translate to all languages');
