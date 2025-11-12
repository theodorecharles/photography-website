/**
 * Shared types for PhotoModal components
 */

export interface Photo {
  id: string;
  thumbnail: string;
  modal: string;
  download: string;
  title: string;
  album: string;
  metadata?: {
    created: string;
    modified: string;
    size: number;
  };
  exif?: any;
  // Note: 'src' field removed - original photos are not served via API
  // Only optimized versions (thumbnail, modal, download) are accessible
}

export interface ExifData {
  Make?: string;
  Model?: string;
  LensModel?: string;
  FocalLength?: number;
  FNumber?: number;
  ExposureTime?: number;
  ISO?: number;
  DateTimeOriginal?: string;
  error?: string;
}

