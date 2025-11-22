#!/usr/bin/env node
/**
 * Database Backup Script
 * Creates a timestamped backup of the SQLite database
 * 
 * Usage: node backup-database.js [backup-directory]
 * 
 * If no directory is specified, backups are saved to data/backups/
 * This script should be run periodically (e.g., via cron job)
 * Example cron: 0 2 * * * /usr/bin/node /path/to/backup-database.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const dbPath = path.join(dataDir, 'gallery.db');

// Backup directory (from arg or default to data/backups)
const backupDir = process.argv[2] || path.join(dataDir, 'backups');

async function backupDatabase() {
  try {
    console.log('[Backup] Starting database backup...');
    console.log(`[Backup] Source: ${dbPath}`);
    
    // Check if database exists
    if (!fs.existsSync(dbPath)) {
      console.error('[Backup] ❌ Database not found:', dbPath);
      process.exit(1);
    }
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`[Backup] Created backup directory: ${backupDir}`);
    }
    
    // Generate timestamped backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFilename = `gallery-backup-${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFilename);
    
    // Copy database file
    fs.copyFileSync(dbPath, backupPath);
    
    // Get file size
    const stats = fs.statSync(backupPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`[Backup] ✓ Backup created: ${backupFilename} (${sizeInMB} MB)`);
    
    // Clean up old backups (keep last 30)
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('gallery-backup-') && f.endsWith('.db'))
      .sort()
      .reverse();
    
    if (backups.length > 30) {
      const toDelete = backups.slice(30);
      for (const file of toDelete) {
        fs.unlinkSync(path.join(backupDir, file));
        console.log(`[Backup] Cleaned up old backup: ${file}`);
      }
      console.log(`[Backup] Removed ${toDelete.length} old backup(s)`);
    }
    
    console.log(`[Backup] Total backups: ${Math.min(backups.length, 30)}`);
    
    // Send notification to all admins
    try {
      const { getAllUsers } = await import('../backend/src/database-users.js');
      const { sendNotificationToUser } = await import('../backend/src/push-notifications.js');
      const { translateNotificationForUser } = await import('../backend/src/i18n-backend.js');
      
      const admins = getAllUsers().filter(u => u.role === 'admin');
      
      for (const admin of admins) {
        const title = await translateNotificationForUser(admin.id, 'notifications.backend.databaseBackupCompletedTitle', {
          filename: backupFilename,
          size: `${sizeInMB} MB`
        });
        const body = await translateNotificationForUser(admin.id, 'notifications.backend.databaseBackupCompletedBody', {
          filename: backupFilename,
          size: `${sizeInMB} MB`
        });
        
        await sendNotificationToUser(admin.id, {
          title,
          body,
          tag: 'database-backup',
          requireInteraction: false
        }, 'databaseBackupCompleted');
        
        console.log(`[Backup] Sent notification to ${admin.email}`);
      }
    } catch (err) {
      console.error('[Backup] Failed to send notifications:', err);
    }
    
    console.log('[Backup] ✅ Backup complete!');
  } catch (err) {
    console.error('[Backup] ❌ Backup failed:', err);
    process.exit(1);
  }
}

backupDatabase();
