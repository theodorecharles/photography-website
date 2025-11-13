/**
 * Admin portal utility functions
 */

export type Tab = 'albums' | 'config' | 'metrics';

/**
 * Determine active tab from URL pathname
 */
export const getActiveTab = (pathname: string): Tab => {
  if (pathname.includes('/settings')) return 'config';
  if (pathname.includes('/metrics')) return 'metrics';
  return 'albums';
};

