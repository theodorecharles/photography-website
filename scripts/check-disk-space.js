#!/usr/bin/env node
/**
 * Disk Space Monitor
 * Checks available disk space and sends notification if below threshold
 * 
 * This script should be run periodically (e.g., via cron job)
 * Example cron: 0 */6 * * * /usr/bin/node /path/to/check-disk-space.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Threshold: Send notification if disk space is below this percentage
const LOW_DISK_THRESHOLD = 10; // 10%

async function checkDiskSpace() {
  try {
    console.log('[DiskCheck] Checking disk space...');
    
    // Get disk usage for the root filesystem
    const { stdout } = await execAsync('df -h / | tail -1');
    
    // Parse output: Filesystem Size Used Avail Use% Mounted
    const parts = stdout.trim().split(/\s+/);
    const usagePercent = parseInt(parts[4]); // e.g., "85%"
    const availablePercent = 100 - usagePercent;
    const available = parts[3]; // e.g., "50G"
    
    console.log(`[DiskCheck] Disk usage: ${usagePercent}% (${available} available)`);
    
    if (availablePercent <= LOW_DISK_THRESHOLD) {
      console.log(`[DiskCheck] ⚠️  Low disk space detected: ${availablePercent}% remaining`);
      
      // Send notification to all admins
      try {
        const { getAllUsers } = await import('../backend/src/database-users.js');
        const { sendNotificationToUser } = await import('../backend/src/push-notifications.js');
        const { translateNotificationForUser } = await import('../backend/src/i18n-backend.js');
        
        const admins = getAllUsers().filter(u => u.role === 'admin');
        
        for (const admin of admins) {
          const title = await translateNotificationForUser(admin.id, 'notifications.backend.lowDiskSpaceTitle', {
            availablePercent,
            available
          });
          const body = await translateNotificationForUser(admin.id, 'notifications.backend.lowDiskSpaceBody', {
            availablePercent,
            available
          });
          
          await sendNotificationToUser(admin.id, {
            title,
            body,
            tag: 'low-disk-space',
            requireInteraction: true
          }, 'lowDiskSpace');
          
          console.log(`[DiskCheck] Sent low disk space notification to ${admin.email}`);
        }
      } catch (err) {
        console.error('[DiskCheck] Failed to send notifications:', err);
      }
    } else {
      console.log(`[DiskCheck] ✓ Disk space OK (${availablePercent}% remaining)`);
    }
  } catch (err) {
    console.error('[DiskCheck] Error checking disk space:', err);
    process.exit(1);
  }
}

checkDiskSpace();
