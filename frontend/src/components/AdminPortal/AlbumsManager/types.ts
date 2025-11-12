/**
 * Shared types for AlbumsManager
 */

import { Album, Photo } from '../types';

export type UploadState = 'queued' | 'uploading' | 'optimizing' | 'complete' | 'error';

export interface UploadingImage {
  file: File;
  filename: string;
  state: UploadState;
  thumbnailUrl?: string;
  error?: string;
  progress?: number;
  optimizeProgress?: number; // 0-100 for optimization progress
}

export interface AlbumsManagerProps {
  albums: Album[];
  loadAlbums: () => Promise<void>;
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

// Re-export types from parent
export type { Album, Photo };
