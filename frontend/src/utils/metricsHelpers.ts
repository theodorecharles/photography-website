/**
 * Utility functions for metrics and analytics
 */

/**
 * Normalize album names from old lowercase to new capitalized format
 */
export const normalizeAlbumName = (albumName: string): string => {
  const albumMap: Record<string, string> = {
    'animals': 'Animals',
    'people': 'People',
    'nature': 'Nature',
    'japan': 'Japan',
    'random': 'Random'
  };
  return albumMap[albumName.toLowerCase()] || albumName;
};

/**
 * Format date from microseconds timestamp to locale-specific string
 */
export const formatDateFromMicroseconds = (timestamp: number): string => {
  // Convert microseconds to milliseconds for proper date formatting
  return new Date(timestamp / 1000).toLocaleDateString();
};

/**
 * Format duration in milliseconds to HH:MM:SS format (for detailed metrics)
 */
export const formatDurationDetailed = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  // Pad with zeros for consistent formatting
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');
  
  return `${hh}:${mm}:${ss}`;
};

