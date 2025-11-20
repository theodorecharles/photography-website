/**
 * Photo utility functions for PhotoGrid component
 */

import { Photo, ImageDimensions } from '../types/photo';

/**
 * Reconstruct full photo/video object from optimized array format
 * Album format: [filename, title, media_type]
 * Homepage format: [filename, title, album, media_type]
 * media_type: 0 = photo, 1 = video
 */
export const reconstructPhoto = (data: any[], albumName: string): Photo => {
  const filename = data[0];
  const title = data[1];
  const albumFromData = typeof data[2] === 'string' ? data[2] : null;
  const mediaTypeIndex = albumFromData ? 3 : 2; // If we have album name, media_type is at index 3, otherwise index 2
  const mediaType = data[mediaTypeIndex] === 1 ? 'video' : 'photo';
  
  const photoAlbum = albumFromData || albumName;
  
  // For videos, thumbnail and modal preview are stored in optimized folder as JPG
  // The actual video is served via /api/video endpoints
  const baseFilename = filename.replace(/\.[^.]+$/, '.jpg'); // Replace extension with .jpg for video thumbnails
  const actualFilename = mediaType === 'video' ? baseFilename : filename;
  
  return {
    id: `${photoAlbum}/${filename}`,
    thumbnail: `/optimized/thumbnail/${photoAlbum}/${actualFilename}`,
    modal: `/optimized/modal/${photoAlbum}/${actualFilename}`,
    download: mediaType === 'video' ? '' : `/optimized/download/${photoAlbum}/${filename}`,
    title: title,
    album: photoAlbum,
    media_type: mediaType
  };
};

/**
 * Get number of columns based on window width and photo count
 */
export const getNumColumns = (photoCount: number): number => {
  // Always use 1 column on mobile (< 512px)
  if (window.innerWidth < 512) return 1;
  
  // For albums with fewer than 12 images, use 2 columns
  if (photoCount < 12) return 2;
  
  // For albums with 12-23 images, use 3 columns
  if (photoCount >= 12 && photoCount <= 23) return 3;
  
  // For albums with > 24 images, use responsive columns based on width
  if (window.innerWidth >= 1600) return 5;
  if (window.innerWidth >= 1200) return 4;
  if (window.innerWidth >= 900) return 3;
  if (window.innerWidth >= 600) return 2;
  return 1;
};

/**
 * Distribute photos into columns for masonry layout
 */
export const distributePhotos = (
  photos: Photo[], 
  numColumns: number, 
  imageDimensions: ImageDimensions
): Photo[][] => {
  // Initialize columns with empty arrays
  const columns: Photo[][] = Array.from({ length: numColumns }, () => []);

  // Calculate total height for each photo based on its aspect ratio
  const photoHeights = photos.map((photo) => {
    const dimensions = imageDimensions[photo.id];
    if (!dimensions) return 1; // Default to 1 if dimensions not loaded yet
    return dimensions.height / dimensions.width;
  });

  // Initialize column heights
  const columnHeights = Array(numColumns).fill(0);

  // Distribute photos to columns
  photos.forEach((photo, index) => {
    // Find the column with the smallest current height
    let shortestColumnIndex = 0;
    let shortestHeight = columnHeights[0];

    for (let i = 1; i < numColumns; i++) {
      if (columnHeights[i] < shortestHeight) {
        shortestHeight = columnHeights[i];
        shortestColumnIndex = i;
      }
    }

    // If this is the last photo and all columns have the same number of photos,
    // put it in the first column
    if (index === photos.length - 1) {
      const photosPerColumn = Math.floor(photos.length / numColumns);
      const hasExtraPhoto = photos.length % numColumns === 1;

      if (hasExtraPhoto) {
        // Check if all columns have the same number of photos
        const allColumnsEqual = columns.every(
          (col) => col.length === photosPerColumn
        );
        if (allColumnsEqual) {
          shortestColumnIndex = 0;
        }
      }
    }

    // Add photo to the shortest column
    columns[shortestColumnIndex].push(photo);
    columnHeights[shortestColumnIndex] += photoHeights[index];
  });

  return columns;
};

