/**
 * Album Helper Utilities
 * Pure functions for album name manipulation and validation
 */

/**
 * Sanitizes and converts a string to title case for album names
 * - Removes special characters (keeps only letters, numbers, spaces, hyphens, underscores)
 * - Converts to title case (Each Word Capitalized)
 * - Trims whitespace
 * 
 * @example
 * sanitizeAndTitleCase("my-COOL album!!") → "My Cool Album"
 */
export const sanitizeAndTitleCase = (str: string): string => {
  if (!str) return '';
  
  // Remove special characters, keep only letters, numbers, spaces, hyphens, and underscores
  let sanitized = str.replace(/[^a-zA-Z0-9\s\-_]/g, ' ');
  
  // Replace multiple spaces with single space
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Convert to title case
  return sanitized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Validates if an album name is acceptable
 * - Must not be empty
 * - Must not be 'homepage' (reserved)
 * - Must contain at least one alphanumeric character
 */
export const isValidAlbumName = (name: string): boolean => {
  if (!name || name.trim() === '') return false;
  if (name.toLowerCase() === 'homepage') return false;
  // Must contain at least one alphanumeric character
  return /[a-zA-Z0-9]/.test(name);
};

/**
 * Validates if a folder name is acceptable
 * - Must not be empty
 * - Must contain at least one alphanumeric character
 */
export const isValidFolderName = (name: string): boolean => {
  if (!name || name.trim() === '') return false;
  // Must contain at least one alphanumeric character
  return /[a-zA-Z0-9]/.test(name);
};

/**
 * Generates a unique album name by appending a number if needed
 * @param desiredName - The desired album name
 * @param existingNames - Array of existing album names
 * @returns A unique album name
 */
export const generateUniqueAlbumName = (
  desiredName: string,
  existingNames: string[]
): string => {
  let name = desiredName;
  let counter = 1;
  
  while (existingNames.includes(name)) {
    name = `${desiredName} ${counter}`;
    counter++;
  }
  
  return name;
};

/**
 * Extracts the album name from a file path
 * Useful for drag-and-drop operations with file paths
 */
export const extractAlbumFromPath = (path: string): string | null => {
  const match = path.match(/\/album\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * Formats file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Validates if a file is an acceptable image type
 */
export const isValidImageFile = (file: File): boolean => {
  const validTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'video/mp4',
    'video/quicktime', // .mov files
    'video/x-msvideo', // .avi files
    'video/x-matroska', // .mkv files
    'video/webm'
  ];
  return validTypes.includes(file.type.toLowerCase());
};

/**
 * Validates multiple image/video files and returns validation result
 */
export const validateImageFiles = (
  files: File[]
): { valid: File[]; invalid: File[] } => {
  const valid: File[] = [];
  const invalid: File[] = [];
  
  files.forEach((file) => {
    if (isValidImageFile(file)) {
      valid.push(file);
    } else {
      invalid.push(file);
    }
  });
  
  return { valid, invalid };
};

