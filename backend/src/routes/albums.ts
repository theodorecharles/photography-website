/**
 * Route handler for album-related endpoints.
 * This file contains routes for retrieving albums and photos,
 * as well as helper functions for file system operations.
 */

import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

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
  // Only allow alphanumeric characters, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
    return null;
  }
  return input;
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
      const filePath = path.join(albumPath, file);
      const stats = fs.statSync(filePath);

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
        metadata: {
          created: stats.birthtime,
          modified: stats.mtime,
          size: stats.size,
        },
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
 * Helper function to get all photos from all albums.
 * @param photosDir - Path to the photos directory
 * @returns Array of all photo objects with their paths and album information
 */
const getAllPhotos = (photosDir: string) => {
  try {
    const allAlbums = getAlbums(photosDir).filter(
      (album) => album !== "homepage"
    );
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

// Get all albums
router.get("/api/albums", (req, res) => {
  const photosDir = req.app.get("photosDir");
  const albums = getAlbums(photosDir);
  res.json(albums);
});

// Get photos in a specific album
router.get("/api/albums/:album/photos", (req, res): void => {
  const { album } = req.params;

  // Sanitize album parameter to prevent path traversal
  const sanitizedAlbum = sanitizePath(album);
  if (!sanitizedAlbum) {
    res.status(400).json({ error: "Invalid album name" });
    return;
  }

  const photosDir = req.app.get("photosDir");
  const photos = getPhotosInAlbum(photosDir, sanitizedAlbum);
  res.json(photos);
});

// Get all photos from all albums in random order
router.get("/api/random-photos", (req, res) => {
  const photosDir = req.app.get("photosDir");
  
  // Get ALL photos from ALL albums
  const photos = getAllPhotos(photosDir);
  
  console.log(`API /api/random-photos: Returning ${photos.length} photos`);
  res.json(photos);
});

export default router;
