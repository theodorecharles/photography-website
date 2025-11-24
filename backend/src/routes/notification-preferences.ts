/**
 * Notification Preferences Routes
 * 
 * API endpoints for managing notification preferences
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { requireAdmin } from '../auth/middleware.js';
import { csrfProtection } from '../security.js';
import { 
  getNotificationPreferences, 
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_CATEGORIES,
  type NotificationPreferences 
} from '../notification-preferences.js';
import { DATA_DIR } from '../config.js';
import { reloadConfig } from '../config.js';
import { info, error as logError } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/notification-preferences
 * Get current notification preferences
 */
router.get('/', requireAdmin, (req, res) => {
  try {
    const preferences = getNotificationPreferences();
    info('[NotificationPreferences] Loading preferences:', JSON.stringify(preferences, null, 2));
    
    // Auto-cleanup: Remove any invalid keys from config.json
    try {
      const configPath = path.join(DATA_DIR, 'config.json');
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (configData.notificationPreferences) {
        const validKeys = Object.keys(DEFAULT_NOTIFICATION_PREFERENCES);
        const savedKeys = Object.keys(configData.notificationPreferences);
        const invalidKeys = savedKeys.filter(key => !validKeys.includes(key));
        
        if (invalidKeys.length > 0) {
          info('[NotificationPreferences] Removing invalid keys from config:', invalidKeys.join(', '));
          
          // Filter out invalid keys
          const cleanedPrefs: Record<string, boolean> = {};
          for (const key of validKeys) {
            if (key in configData.notificationPreferences) {
              cleanedPrefs[key] = configData.notificationPreferences[key];
            }
          }
          
          configData.notificationPreferences = {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...cleanedPrefs
          };
          
          fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
          reloadConfig();
        }
      }
    } catch (cleanupErr) {
      // Non-critical - log but don't fail the request
      logError('[NotificationPreferences] Failed to cleanup invalid keys:', cleanupErr);
    }
    
    res.json({
      success: true,
      preferences,
      categories: NOTIFICATION_CATEGORIES
    });
  } catch (err: any) {
    logError('[NotificationPreferences] Error getting preferences:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to get notification preferences'
    });
  }
});

/**
 * PUT /api/notification-preferences
 * Update notification preferences
 */
router.put('/', csrfProtection, requireAdmin, (req, res) => {
  try {
    const { preferences } = req.body;
    
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid preferences object'
      });
    }
    
    // Validate that all keys are valid notification types
    const validKeys = Object.keys(DEFAULT_NOTIFICATION_PREFERENCES);
    const invalidKeys = Object.keys(preferences).filter(key => !validKeys.includes(key));
    
    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid notification types: ${invalidKeys.join(', ')}`
      });
    }
    
    // Load current config
    const configPath = path.join(DATA_DIR, 'config.json');
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Merge preferences with defaults to ensure all keys exist
    configData.notificationPreferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...preferences
    };
    
    // Save config
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
    
    // Reload config in memory
    reloadConfig();
    
    info('[NotificationPreferences] Preferences updated successfully');
    info('[NotificationPreferences] Saved preferences:', JSON.stringify(configData.notificationPreferences, null, 2));
    
    res.json({
      success: true,
      preferences: configData.notificationPreferences
    });
  } catch (err: any) {
    logError('[NotificationPreferences] Error updating preferences:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update notification preferences'
    });
  }
});

/**
 * POST /api/notification-preferences/reset
 * Reset notification preferences to defaults
 */
router.post('/reset', csrfProtection, requireAdmin, (req, res) => {
  try {
    // Load current config
    const configPath = path.join(DATA_DIR, 'config.json');
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Reset to defaults
    configData.notificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
    
    // Save config
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
    
    // Reload config in memory
    reloadConfig();
    
    info('[NotificationPreferences] Preferences reset to defaults');
    
    res.json({
      success: true,
      preferences: configData.notificationPreferences
    });
  } catch (err: any) {
    logError('[NotificationPreferences] Error resetting preferences:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to reset notification preferences'
    });
  }
});

export default router;
