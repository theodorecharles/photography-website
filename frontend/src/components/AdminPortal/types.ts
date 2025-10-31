/**
 * Shared types for AdminPortal components
 */

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthStatus {
  authenticated: boolean;
  user?: User;
}

export interface ExternalLink {
  title: string;
  url: string;
}

export interface BrandingConfig {
  siteName: string;
  avatarPath: string;
  primaryColor: string;
  secondaryColor: string;
  metaDescription: string;
  metaKeywords: string;
  faviconPath: string;
}

export interface ImageOptimizationSettings {
  concurrency: number;
  images: {
    thumbnail: {
      quality: number;
      maxDimension: number;
    };
    modal: {
      quality: number;
      maxDimension: number;
    };
    download: {
      quality: number;
      maxDimension: number;
    };
  };
}

export interface Album {
  name: string;
  photoCount?: number;
}

export interface Photo {
  id: string;
  title: string;
  album: string;
  src: string;
  thumbnail: string;
  download: string;
}

export type Tab = 'branding' | 'links' | 'albums' | 'metrics';

