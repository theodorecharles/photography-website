/**
 * Homepage HTML generation utility
 * Regenerates the pre-rendered homepage HTML with all initial data baked in
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { info, error as logError } from '../utils/logger.js';

const execFileAsync = promisify(execFile);

export interface HomepageHTMLResult {
  success: boolean;
  error?: string;
}

/**
 * Generate pre-rendered homepage HTML with all initial data
 * This eliminates network requests and dramatically improves page load time
 * 
 * @param appRoot - Root directory of the application
 * @returns Result object with success status
 */
export async function generateHomepageHTML(appRoot: string): Promise<HomepageHTMLResult> {
  try {
    const scriptPath = path.join(appRoot, 'scripts', 'generate-homepage-html.js');
    
    info('[HomepageHTML] Regenerating pre-rendered homepage HTML...');
    
    // Run the generation script
    const { stdout, stderr } = await execFileAsync('node', [scriptPath], {
      cwd: appRoot,
      timeout: 30000, // 30 second timeout
    });
    
    if (stderr) {
      logError('[HomepageHTML] Script stderr:', stderr);
    }
    
    if (stdout) {
      info('[HomepageHTML] Script output:', stdout.trim());
    }
    
    info('[HomepageHTML] Homepage HTML regenerated successfully');
    
    return { success: true };
  } catch (err: any) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logError('[HomepageHTML] Failed to regenerate homepage HTML:', errorMessage);
    
    if (err.stdout) {
      info('[HomepageHTML] Script stdout:', err.stdout);
    }
    if (err.stderr) {
      logError('[HomepageHTML] Script stderr:', err.stderr);
    }
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

