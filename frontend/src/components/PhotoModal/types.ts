/**
 * Shared types for PhotoModal components
 */

export interface Photo {
  id: string;
  src: string;
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

