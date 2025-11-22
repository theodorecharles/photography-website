#!/usr/bin/env node
/**
 * Album View Milestone Checker
 * Standalone script to check for album view milestones
 * 
 * Can be run manually or via cron job:
 * Example: 0 * * * * /usr/bin/node /path/to/check-album-milestones.js
 */

import('../backend/src/services/milestone-tracker.js')
  .then(module => {
    const { checkMilestones } = module;
    return checkMilestones();
  })
  .then(() => {
    console.log('[MilestoneChecker] ✅ Check complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('[MilestoneChecker] ❌ Check failed:', err);
    process.exit(1);
  });
