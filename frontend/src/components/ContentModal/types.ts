/**
 * Shared types for PhotoModal components
 */

// Photo interface moved to canonical location: types/photo.ts
export type { Photo } from '../../types/photo';

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

