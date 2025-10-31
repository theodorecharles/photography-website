/**
 * PhotoGrid component for displaying a grid of photos.
 * This component handles fetching and displaying photos from the backend,
 * and provides functionality for viewing photos in a modal.
 */

import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./PhotoGrid.css";
import { API_URL, cacheBustValue } from "../config";
import { trackPhotoClick, trackError } from "../utils/analytics";
import { fetchWithRateLimitCheck } from "../utils/fetchWrapper";
import PhotoModal from "./PhotoModal";

interface PhotoGridProps {
  album: string;
}

interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  download: string;
  title: string;
  album: string;
  metadata?: {
    created: string;
    modified: string;
    size: number;
  };
  exif?: any; // EXIF data from exifr library
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ album }) => {
  const location = useLocation();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});

  // Get query parameters from current URL for API calls (not for images)
  const queryParams = new URLSearchParams(location.search);
  // Remove 'photo' param from API queryString to prevent refetching when opening modals
  queryParams.delete('photo');
  const queryString = queryParams.toString()
    ? `?${queryParams.toString()}&i=${cacheBustValue}`
    : `?i=${cacheBustValue}`;
  
  // For image URLs, don't include query strings to improve caching (especially on iOS)
  // ETags and Last-Modified headers handle cache validation
  const imageQueryString = ``;

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
    trackPhotoClick(photo.id, photo.album, photo.title);
  };

  const handleCloseModal = () => {
    setSelectedPhoto(null);
  };

  // Close modal when album changes
  useEffect(() => {
    setSelectedPhoto(null);
    setColumnTransforms([]);
  }, [album]);

  // Auto-open photo from URL query parameter
  useEffect(() => {
    if (photos.length > 0 && !selectedPhoto) {
      const urlParams = new URLSearchParams(location.search);
      const photoParam = urlParams.get('photo');
      if (photoParam) {
        // Find photo by filename
        const photo = photos.find(p => p.id.endsWith(photoParam));
        if (photo) {
          handlePhotoClick(photo);
        }
      }
    }
  }, [photos]);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setLoading(true);

        if (album === "homepage") {
          // Use the random photos endpoint for homepage to show all photos
          // Not passing count parameter to get all photos from all albums
          const response = await fetchWithRateLimitCheck(
            `${API_URL}/api/random-photos${queryString}`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch random photos");
          }
          const randomPhotos = await response.json();
          setPhotos(randomPhotos);
        } else {
          // For specific album pages, fetch photos normally
          const response = await fetchWithRateLimitCheck(
            `${API_URL}/api/albums/${album}/photos${queryString}`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch photos");
          }
          const data = await response.json();
          // Sort photos by creation date, newest first
          const sortedPhotos = data.sort((a: Photo, b: Photo) => {
            if (!a.metadata || !b.metadata) return 0;
            return (
              new Date(b.metadata.created).getTime() -
              new Date(a.metadata.created).getTime()
            );
          });
          setPhotos(sortedPhotos);
        }

        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An error occurred";
        // Don't log rate limit errors (already handled globally)
        if (errorMessage === 'Rate limited') {
          return;
        }
        setError(errorMessage);
        setPhotos([]);
        trackError(errorMessage, `photo_fetch_${album}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [album, queryString]);

  const handleImageLoad = (
    e: React.SyntheticEvent<HTMLImageElement>,
    photoId: string
  ) => {
    const img = e.currentTarget;
    img.classList.add("loaded");
    setImageDimensions((prev) => ({
      ...prev,
      [photoId]: {
        width: img.naturalWidth,
        height: img.naturalHeight,
      },
    }));
  };

  // Function to get number of columns based on window width
  const getNumColumns = () => {
    if (window.innerWidth >= 1600) return 5;
    if (window.innerWidth >= 1200) return 4;
    if (window.innerWidth >= 900) return 3;
    if (window.innerWidth >= 600) return 2;
    return 1;
  };

  // State for number of columns
  const [numColumns, setNumColumns] = useState(getNumColumns());
  
  // Refs for column elements and their transforms
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [columnTransforms, setColumnTransforms] = useState<number[]>([]);
  const shiftPointRef = useRef<number | null>(null);
  const hasReachedBottomRef = useRef(false);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setNumColumns(getNumColumns());
      // On resize, switch to full-page calculation if we have a shift point
      if (shiftPointRef.current !== null) {
        hasReachedBottomRef.current = true;
        shiftPointRef.current = 0;
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Function to distribute photos into columns
  const distributePhotos = (photos: Photo[], numColumns: number) => {
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

  // Effect to handle scroll-based column alignment
  useEffect(() => {
    // Get distributed columns to check photo counts
    const distributedCols = distributePhotos(photos, numColumns);
    
    // Only apply the effect if:
    // 1. More than one column
    // 2. At least one column has 5 or more photos
    const hasMultipleColumns = numColumns > 1;
    const hasSubstantialColumn = distributedCols.some(col => col.length >= 5);
    
    if (!hasMultipleColumns || !hasSubstantialColumn) {
      setColumnTransforms([]);
      shiftPointRef.current = null;
      return;
    }

    const handleScroll = () => {
      if (photos.length === 0 || !columnRefs.current.length) return;

      // Check if all images have loaded
      const allImagesLoaded = photos.every(photo => imageDimensions[photo.id]);
      
      // If all images just loaded and we haven't set the shift point yet, capture it
      if (allImagesLoaded && shiftPointRef.current === null && !hasReachedBottomRef.current) {
        shiftPointRef.current = window.scrollY;
      }
      
      // Don't apply transforms until we have a shift point
      if (!allImagesLoaded || shiftPointRef.current === null) {
        return;
      }

      const columnHeights = columnRefs.current.map((col) => col?.offsetHeight || 0);
      const maxHeight = Math.max(...columnHeights);
      
      if (maxHeight === 0) return;

      // Get scroll metrics
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const maxScroll = documentHeight - windowHeight;
      
      // Check if user has reached the bottom (with small threshold for rounding)
      if (scrollY >= maxScroll - 5 && !hasReachedBottomRef.current) {
        hasReachedBottomRef.current = true;
        shiftPointRef.current = 0;
      }
      
      // Calculate scroll progress
      let scrollProgress = 0;
      
      if (hasReachedBottomRef.current) {
        // Full-page calculation: Progress = 0 at top, Progress = 1 at bottom
        scrollProgress = maxScroll > 0 ? scrollY / maxScroll : 0;
      } else {
        // Shift-point-based calculation
        const shiftPoint = shiftPointRef.current;
        
        if (scrollY <= shiftPoint) {
          // Above shift point - no transforms
          scrollProgress = 0;
        } else if (scrollY >= maxScroll) {
          // At bottom - full transforms
          scrollProgress = 1;
        } else {
          // Between shift point and bottom - calculate progress
          const scrollRange = maxScroll - shiftPoint;
          if (scrollRange > 0) {
            scrollProgress = (scrollY - shiftPoint) / scrollRange;
          }
        }
      }

      // Calculate transforms for each column
      const transforms = columnHeights.map((height, index) => {
        // Don't shift columns with 4 or fewer photos
        if (distributedCols[index] && distributedCols[index].length <= 4) {
          return 0;
        }
        
        // Tallest column doesn't move
        if (height === maxHeight) return 0;
        
        const heightDiff = maxHeight - height;
        // Apply transform based on scroll progress
        return heightDiff * scrollProgress;
      });

      setColumnTransforms(transforms);
    };

    // Initial calculation
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [photos, numColumns, imageDimensions]);
  
  // Reset shift point when photos change
  useEffect(() => {
    shiftPointRef.current = null;
    hasReachedBottomRef.current = false;
  }, [photos]);

  if (loading) {
    return <div className="loading">Loading photos...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="photo-grid">
      {distributePhotos(photos, numColumns).map((column, columnIndex) => (
        <div 
          key={columnIndex} 
          className="photo-column"
          ref={(el) => { columnRefs.current[columnIndex] = el; }}
          style={{
            transform: columnTransforms[columnIndex] 
              ? `translateY(${columnTransforms[columnIndex]}px)` 
              : 'none'
          }}
        >
          {column.map((photo) => (
            <div
              key={photo.id}
              className="photo-item"
              style={{
                aspectRatio: imageDimensions[photo.id]
                  ? `${imageDimensions[photo.id].width} / ${
                      imageDimensions[photo.id].height
                    }`
                  : "1 / 1",
              }}
              onClick={() => {
                handlePhotoClick(photo);
              }}
            >
              <img
                src={`${API_URL}${photo.thumbnail}${imageQueryString}`}
                alt={`${photo.album} photography by Ted Charles - ${photo.title}`}
                title={photo.title}
                loading="lazy"
                onLoad={(e) => handleImageLoad(e, photo.id)}
              />
            </div>
          ))}
        </div>
      ))}

      {selectedPhoto && (
        <PhotoModal
          selectedPhoto={selectedPhoto}
          photos={photos}
          album={album}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default PhotoGrid;
