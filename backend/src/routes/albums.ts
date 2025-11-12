/**
 * Route handler for album-related endpoints.
 * This file contains routes for retrieving albums and photos,
 * as well as helper functions for file system operations.
 */

import { Router, Request } from "express";
import fs from "fs";
import path from "path";
import exifr from "exifr";
import { 
  getAlbumState, 
  getPublishedAlbums, 
  getAllAlbums, 
  saveAlbum, 
  getAlbumMetadata,
  getAlbumsFromMetadata,
  getImagesInAlbum,
  getImagesFromPublishedAlbums,
  getShareLinkBySecret,
  isShareLinkExpired,
  getAllFolders,
  getPublishedFolders,
  getAlbumsInFolder
} from "../database.js";

const router = Router();

// In-memory cache for album photos
interface CacheEntry {
  photos: any[];
  timestamp: number;
}

const albumCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Function to invalidate cache for an album
export const invalidateAlbumCache = (albumName?: string) => {
  if (albumName) {
    albumCache.delete(albumName);
    console.log(`Cache invalidated for album: ${albumName}`);
  } else {
    albumCache.clear();
    console.log('All album caches cleared');
  }
};

/**
 * Sanitize path input to prevent directory traversal attacks.
 * @param input - User-provided path component
 * @returns Sanitized path component or null if invalid
 */
const sanitizePath = (input: string): string | null => {
  // Remove any path traversal attempts
  if (
    !input ||
    input.includes("..") ||
    input.includes("/") ||
    input.includes("\\")
  ) {
    return null;
  }
  // Allow alphanumeric characters, spaces, hyphens, and underscores
  if (!/^[a-zA-Z0-9 _-]+$/.test(input)) {
    return null;
  }
  return input.trim();
};

/**
 * Helper function to get all albums from the database.
 * Falls back to filesystem scan if database is empty.
 * @param photosDir - Path to the photos directory (for fallback only)
 * @returns Array of album names
 */
const getAlbums = (photosDir: string) => {
  try {
    // Get albums from database
    const dbAlbums = getAllAlbums().map(a => a.name);
    
    // If database has albums, use those
    if (dbAlbums.length > 0) {
      return dbAlbums;
    }
    
    // Fallback to filesystem scan if database is empty (backward compatibility)
    console.warn('Database has no albums, falling back to filesystem scan');
    return fs
      .readdirSync(photosDir)
      .filter((file) => fs.statSync(path.join(photosDir, file)).isDirectory());
  } catch (error) {
    console.error("Error reading albums:", error);
    return [];
  }
};

/**
 * Helper function to get all photos in a specific album from database.
 * @param photosDir - Path to the photos directory (unused, kept for compatibility)
 * @param album - Name of the album to get photos from
 * @returns Array of photo objects with their paths
 */
const getPhotosInAlbum = (photosDir: string, album: string) => {
  try {
    // Get images from database
    const images = getImagesInAlbum(album);
    
    // Transform to photo objects
    const photos = images.map((img) => {
      // Generate default title from filename
      const defaultTitle = img.filename
        .replace(/\.[^/.]+$/, '') // Remove extension
        .replace(/[-_]/g, ' '); // Replace hyphens and underscores with spaces

      return {
        id: `${album}/${img.filename}`,
        title: img.title || defaultTitle,
        album: album,
        thumbnail: `/optimized/thumbnail/${album}/${img.filename}`,
        modal: `/optimized/modal/${album}/${img.filename}`,
        download: `/optimized/download/${album}/${img.filename}`,
        sort_order: img.sort_order ?? null,
      };
    });
    
    // Photos are already sorted by the database query
    return photos;
  } catch (error) {
    console.error(`Error reading album ${album}:`, error);
    return [];
  }
};

/**
 * Helper function to shuffle an array using Fisher-Yates algorithm.
 * @param array - Array to shuffle
 * @returns Shuffled array
 */
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Helper function to get all photos from all albums (filtered by published state) from database.
 * @param photosDir - Path to the photos directory (unused, kept for compatibility)
 * @param includeUnpublished - Whether to include unpublished albums (admin only)
 * @returns Array of all photo objects with their paths and album information
 */
const getAllPhotos = (photosDir: string, includeUnpublished: boolean = false) => {
  try {
    let images;
    
    if (includeUnpublished) {
      // Get all images from all albums
      const allAlbums = getAllAlbums()
        .map(a => a.name)
        .filter(name => name !== 'homepage');
      
      images = allAlbums.flatMap(album => getImagesInAlbum(album));
    } else {
      // Get only images from published albums
      images = getImagesFromPublishedAlbums().filter(img => img.album !== 'homepage');
    }
    
    const allPhotos = images.map((img) => {
      // Generate title from filename by removing extension and replacing separators
      const defaultTitle = img.filename
        .replace(/\.[^/.]+$/, '') // Remove extension
        .replace(/[-_]/g, ' '); // Replace hyphens and underscores with spaces

      return {
        id: `${img.album}/${img.filename}`,
        title: img.title || defaultTitle,
        album: img.album,
        thumbnail: `/optimized/thumbnail/${img.album}/${img.filename}`,
        modal: `/optimized/modal/${img.album}/${img.filename}`,
        download: `/optimized/download/${img.album}/${img.filename}`,
      };
    });

    const albumCount = new Set(images.map(i => i.album)).size;
    console.log(`getAllPhotos: Found ${allPhotos.length} total photos across ${albumCount} albums`);
    
    // Shuffle all photos for random order
    return shuffleArray(allPhotos);
  } catch (error) {
    console.error("Error getting all photos:", error);
    return [];
  }
};

// Get all albums (filtered by published state for non-authenticated users)
router.get("/api/albums", (req: Request, res) => {
  const photosDir = req.app.get("photosDir");
  const allAlbums = getAlbums(photosDir);
  
  // Sync filesystem albums to database (auto-add any missing albums as unpublished)
  const allAlbumStates = getAllAlbums();
  const albumsInDB = new Set(allAlbumStates.map(a => a.name));
  
  for (const albumName of allAlbums) {
    if (!albumsInDB.has(albumName) && albumName !== 'homepage') {
      // Auto-add missing albums as unpublished (for manually created folders)
      saveAlbum(albumName, false);
      console.log(`Auto-synced album to database: ${albumName} (unpublished - manually created folder)`);
    }
  }
  
  // Re-fetch album states after sync
  const updatedAlbumStates = getAllAlbums();
  
  // Check if user is authenticated
  const isAuthenticated = req.isAuthenticated && req.isAuthenticated();
  
  // Get folders
  const allFolders = isAuthenticated ? getAllFolders() : getPublishedFolders();
  
  if (isAuthenticated) {
    // For authenticated users, return all albums with their published state and folder info
    const albumsWithState = allAlbums.map((albumName: string) => {
      const state = updatedAlbumStates.find(a => a.name === albumName);
      return {
        name: albumName,
        published: state?.published ?? false,
        folder_id: state?.folder_id ?? null
      };
    });
    res.json({
      albums: albumsWithState,
      folders: allFolders
    });
  } else {
    // For non-authenticated users, only return published albums and folders
    const publishedAlbums = allAlbums.filter((albumName: string) => {
      const state = updatedAlbumStates.find(a => a.name === albumName);
      return state?.published === true;
    });
    
    // Group albums by folder for better structure
    const albumsWithFolder = publishedAlbums.map((albumName: string) => {
      const state = updatedAlbumStates.find(a => a.name === albumName);
      return {
        name: albumName,
        folder_id: state?.folder_id ?? null
      };
    });
    
    res.json({
      albums: albumsWithFolder,
      folders: allFolders
    });
  }
});

// Get photos in a specific album
router.get("/api/albums/:album/photos", (req: Request, res): void => {
  const startTime = Date.now();
  const { album } = req.params;

  // Sanitize album parameter to prevent path traversal
  const sanitizedAlbum = sanitizePath(album);
  if (!sanitizedAlbum) {
    res.status(400).json({ error: "Invalid album name" });
    return;
  }

  const photosDir = req.app.get("photosDir");
  const albumPath = path.join(photosDir, sanitizedAlbum);
  
  // Check if album directory exists
  if (!fs.existsSync(albumPath) || !fs.statSync(albumPath).isDirectory()) {
    res.status(404).json({ error: "Album not found" });
    return;
  }

  // Check if user is authenticated
  const isAuthenticated = req.isAuthenticated && req.isAuthenticated();
  
  // Check album published state
  const albumState = getAlbumState(sanitizedAlbum);
  
  // If album is unpublished and user is not authenticated, deny access
  if (albumState && !albumState.published && !isAuthenticated) {
    res.status(404).json({ error: "Album not found" });
    return;
  }

  // Check cache first
  const cached = albumCache.get(sanitizedAlbum);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    const duration = Date.now() - startTime;
    console.log(`Cache hit for album: ${sanitizedAlbum} (${cached.photos.length} photos, ${duration}ms)`);
    res.json(cached.photos);
    return;
  }

  // Cache miss or expired - fetch from filesystem
  console.log(`Cache miss for album: ${sanitizedAlbum}`);
  const fetchStart = Date.now();
  const photos = getPhotosInAlbum(photosDir, sanitizedAlbum);
  const fetchDuration = Date.now() - fetchStart;
  
  // Store in cache
  albumCache.set(sanitizedAlbum, {
    photos,
    timestamp: now
  });
  
  const totalDuration = Date.now() - startTime;
  console.log(`Fetched ${photos.length} photos in ${fetchDuration}ms, total request: ${totalDuration}ms`);
  res.json(photos);
});

// Get all photos from all albums in random order
router.get("/api/random-photos", (req: Request, res) => {
  // Always only return photos from published albums (even for authenticated users)
  const images = getImagesFromPublishedAlbums().filter(img => img.album !== 'homepage');
  
  const allPhotos = images.map((img) => {
    // Generate title from filename by removing extension and replacing separators
    const defaultTitle = img.filename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[-_]/g, ' '); // Replace hyphens and underscores with spaces

    return {
      id: `${img.album}/${img.filename}`,
      title: img.title || defaultTitle,
      album: img.album,
      thumbnail: `/optimized/thumbnail/${img.album}/${img.filename}`,
      modal: `/optimized/modal/${img.album}/${img.filename}`,
      download: `/optimized/download/${img.album}/${img.filename}`,
    };
  });

  const albumCount = new Set(images.map(i => i.album)).size;
  console.log(`API /api/random-photos: Returning ${allPhotos.length} photos from ${albumCount} albums`);
  
  // Shuffle all photos for random order
  const shuffledPhotos = shuffleArray(allPhotos);
  res.json(shuffledPhotos);
});

// Get shared album by secret key
router.get("/api/shared/:secretKey", async (req: Request, res): Promise<void> => {
  const { secretKey } = req.params;

  // Validate secret key format (64 hex characters)
  if (!secretKey || !/^[a-f0-9]{64}$/i.test(secretKey)) {
    res.status(404).json({ error: "Invalid share link" });
    return;
  }

  // Look up the share link
  const shareLink = getShareLinkBySecret(secretKey);
  
  if (!shareLink) {
    res.status(404).json({ error: "Share link not found" });
    return;
  }

  // Check if expired
  if (isShareLinkExpired(shareLink)) {
    res.status(410).json({ error: "Share link has expired", expired: true });
    return;
  }

  // Get the album name
  const album = shareLink.album;
  const photosDir = req.app.get("photosDir");
  const albumPath = path.join(photosDir, album);
  
  // Check if album directory exists
  if (!fs.existsSync(albumPath) || !fs.statSync(albumPath).isDirectory()) {
    res.status(404).json({ error: "Album not found" });
    return;
  }

  // Return album info and photos (bypass published check)
  const photos = getPhotosInAlbum(photosDir, album);
  
  res.json({
    album,
    photos,
    expiresAt: shareLink.expires_at
  });
});

// Get EXIF data for a specific photo
router.get("/api/photos/:album/:filename/exif", async (req, res): Promise<void> => {
  const { album, filename } = req.params;

  // Sanitize inputs to prevent path traversal
  const sanitizedAlbum = sanitizePath(album);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_. -]/g, '');
  
  if (!sanitizedAlbum || !sanitizedFilename) {
    res.status(400).json({ error: "Invalid album or filename" });
    return;
  }

  // Ensure the filename has an image extension
  if (!/\.(jpg|jpeg|png|gif)$/i.test(sanitizedFilename)) {
    res.status(400).json({ error: "Invalid image file" });
    return;
  }

  try {
    const photosDir = req.app.get("photosDir");
    const filePath = path.join(photosDir, sanitizedAlbum, sanitizedFilename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    // Extract EXIF data
    const exif = await exifr.parse(filePath);
    
    if (!exif) {
      res.json({ message: "No EXIF data found" });
      return;
    }

    res.json(exif);
  } catch (error) {
    console.error(`Error reading EXIF for ${album}/${filename}:`, error);
    res.status(500).json({ error: "Failed to read EXIF data" });
  }
});

export default router;
