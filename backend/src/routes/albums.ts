/**
 * Route handler for album-related endpoints.
 * This file contains routes for retrieving albums and photos,
 * as well as helper functions for file system operations.
 */

import { Router, Request } from "express";
import fs from "fs";
import path from "path";
import exifr from "exifr";
import { getAlbumState, getPublishedAlbums, getAllAlbums, saveAlbum } from "../database.js";

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
 * Helper function to get all albums from the photos directory.
 * @param photosDir - Path to the photos directory
 * @returns Array of album names
 */
const getAlbums = (photosDir: string) => {
  try {
    return fs
      .readdirSync(photosDir)
      .filter((file) => fs.statSync(path.join(photosDir, file)).isDirectory());
  } catch (error) {
    console.error("Error reading photos directory:", error);
    return [];
  }
};

/**
 * Helper function to get all photos in a specific album.
 * @param photosDir - Path to the photos directory
 * @param album - Name of the album to get photos from
 * @returns Array of photo objects with their paths
 */
const getPhotosInAlbum = (photosDir: string, album: string) => {
  try {
    const albumPath = path.join(photosDir, album);
    const files = fs
      .readdirSync(albumPath)
      .filter((file) => /\.(jpg|jpeg|png|gif)$/i.test(file));

    // Use optimized images for all albums
    return files.map((file) => {
      // Generate title from filename by removing extension and replacing separators
      const title = file
        .replace(/\.[^/.]+$/, '') // Remove extension
        .replace(/[-_]/g, ' '); // Replace hyphens and underscores with spaces

      return {
        id: `${album}/${file}`, // Make ID unique and consistent with getAllPhotos
        title: title,
        album: album,
        src: `/optimized/modal/${album}/${file}`,
        thumbnail: `/optimized/thumbnail/${album}/${file}`,
        download: `/optimized/download/${album}/${file}`,
      };
    });
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
 * Helper function to get all photos from all albums (filtered by published state).
 * @param photosDir - Path to the photos directory
 * @param includeUnpublished - Whether to include unpublished albums (admin only)
 * @returns Array of all photo objects with their paths and album information
 */
const getAllPhotos = (photosDir: string, includeUnpublished: boolean = false) => {
  try {
    let allAlbums = getAlbums(photosDir).filter(
      (album) => album !== "homepage"
    );
    
    // Filter out unpublished albums unless explicitly requested
    if (!includeUnpublished) {
      const allAlbumStates = getAllAlbums();
      
      allAlbums = allAlbums.filter(album => {
        const state = allAlbumStates.find(a => a.name === album);
        // Only include albums that are explicitly published
        return state?.published === true;
      });
    }
    
    const allPhotos: {
      id: string;
      title: string;
      album: string;
      src: string;
      thumbnail: string;
      download: string;
    }[] = [];

    // Get ALL photos from each album
    allAlbums.forEach((album) => {
      const albumPath = path.join(photosDir, album);
      const files = fs
        .readdirSync(albumPath)
        .filter((file) => /\.(jpg|jpeg|png|gif)$/i.test(file));

      files.forEach((file) => {
        // Generate title from filename by removing extension and replacing separators
        const title = file
          .replace(/\.[^/.]+$/, '') // Remove extension
          .replace(/[-_]/g, ' '); // Replace hyphens and underscores with spaces

        allPhotos.push({
          id: `${album}/${file}`, // Make ID unique across albums
          title: title,
          album: album,
          src: `/optimized/modal/${album}/${file}`,
          thumbnail: `/optimized/thumbnail/${album}/${file}`,
          download: `/optimized/download/${album}/${file}`,
        });
      });
    });

    console.log(`getAllPhotos: Found ${allPhotos.length} total photos across ${allAlbums.length} albums`);
    
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
  
  if (isAuthenticated) {
    // For authenticated users, return all albums with their published state
    const albumsWithState = allAlbums.map((albumName: string) => {
      const state = updatedAlbumStates.find(a => a.name === albumName);
      return {
        name: albumName,
        published: state?.published ?? false
      };
    });
    res.json(albumsWithState);
  } else {
    // For non-authenticated users, only return published albums
    const publishedAlbums = allAlbums.filter((albumName: string) => {
      const state = updatedAlbumStates.find(a => a.name === albumName);
      return state?.published === true;
    });
    
    res.json(publishedAlbums);
  }
});

// Get photos in a specific album
router.get("/api/albums/:album/photos", (req: Request, res): void => {
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
    console.log(`Cache hit for album: ${sanitizedAlbum}`);
    res.json(cached.photos);
    return;
  }

  // Cache miss or expired - fetch from filesystem
  console.log(`Cache miss for album: ${sanitizedAlbum}`);
  const photos = getPhotosInAlbum(photosDir, sanitizedAlbum);
  
  // Store in cache
  albumCache.set(sanitizedAlbum, {
    photos,
    timestamp: now
  });
  
  res.json(photos);
});

// Get all photos from all albums in random order
router.get("/api/random-photos", (req: Request, res) => {
  const photosDir = req.app.get("photosDir");
  
  // Always only return photos from published albums (even for authenticated users)
  const albumsToFetch = getPublishedAlbums()
    .map(a => a.name)
    .filter(name => name !== 'homepage');
  
  const allPhotos: {
    id: string;
    title: string;
    album: string;
    src: string;
    thumbnail: string;
    download: string;
  }[] = [];

  // Get photos from each album
  albumsToFetch.forEach((album) => {
    const albumPath = path.join(photosDir, album);
    
    // Check if album directory exists
    if (!fs.existsSync(albumPath) || !fs.statSync(albumPath).isDirectory()) {
      return; // Skip non-existent directories
    }
    
    const files = fs
      .readdirSync(albumPath)
      .filter((file) => /\.(jpg|jpeg|png|gif)$/i.test(file));

    files.forEach((file) => {
      // Generate title from filename by removing extension and replacing separators
      const title = file
        .replace(/\.[^/.]+$/, '') // Remove extension
        .replace(/[-_]/g, ' '); // Replace hyphens and underscores with spaces

      allPhotos.push({
        id: `${album}/${file}`, // Make ID unique across albums
        title: title,
        album: album,
        src: `/optimized/modal/${album}/${file}`,
        thumbnail: `/optimized/thumbnail/${album}/${file}`,
        download: `/optimized/download/${album}/${file}`,
      });
    });
  });

  console.log(`API /api/random-photos: Returning ${allPhotos.length} photos from ${albumsToFetch.length} albums`);
  
  // Shuffle all photos for random order
  const shuffledPhotos = shuffleArray(allPhotos);
  res.json(shuffledPhotos);
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
