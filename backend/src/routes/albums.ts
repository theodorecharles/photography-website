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

      return {
        id: file,
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
 * Helper function to get random photos from all albums.
 * @param photosDir - Path to the photos directory
 * @param count - Number of random photos to get from each album
 * @returns Array of photo objects with their paths and album information
 */
const getRandomPhotos = (photosDir: string, count: number) => {
  try {
    const allAlbums = getAlbums(photosDir).filter(
      (album) => album !== "homepage"
    );
    const selectedPhotos: {
      id: string;
      src: string;
      thumbnail: string;
      download: string;
      album: string;
    }[] = [];

    // Get random photos from each album
    allAlbums.forEach((album) => {
      const albumPath = path.join(photosDir, album);
      const files = fs
        .readdirSync(albumPath)
        .filter((file) => /\.(jpg|jpeg|png|gif)$/i.test(file));

      // Shuffle the files array and take up to count photos
      const shuffledFiles = files.sort(() => 0.5 - Math.random());
      const selectedFiles = shuffledFiles.slice(0, count);

      selectedFiles.forEach((file) => {
        selectedPhotos.push({
          id: file,
          src: `/optimized/modal/${album}/${file}`,
          thumbnail: `/optimized/thumbnail/${album}/${file}`,
          download: `/optimized/download/${album}/${file}`,
          album: album,
        });
      });
    });

    // Sort all photos alphabetically by filename
    return selectedPhotos.sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.error("Error getting random photos:", error);
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

// Get random photos from all albums
router.get("/api/random-photos", (req, res) => {
  const photosDir = req.app.get("photosDir");

  // Validate and sanitize count parameter
  let count = parseInt(req.query.count as string) || 2;
  // Limit count to reasonable range to prevent abuse
  if (isNaN(count) || count < 1 || count > 50) {
    count = 2;
  }

  const photos = getRandomPhotos(photosDir, count);
  res.json(photos);
});

export default router;
