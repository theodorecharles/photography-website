/**
 * PhotoGrid component for displaying a grid of photos.
 * This component handles fetching and displaying photos from the backend,
 * and provides functionality for viewing photos in a modal.
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import "./PhotoGrid.css";
import { API_URL, cacheBustValue } from "../config";
import { trackPhotoClick, trackError } from "../utils/analytics";
import { fetchWithRateLimitCheck } from "../utils/fetchWrapper";
import PhotoModal from "./PhotoModal";
import NotFound from "./Misc/NotFound";

interface PhotoGridProps {
  album: string;
  onAlbumNotFound?: () => void;
  initialPhotos?: Photo[];
}

interface Photo {
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
  exif?: any; // EXIF data from exifr library
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ album, onAlbumNotFound, initialPhotos }) => {
  const location = useLocation();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);

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

  // Update column count when photos change
  useEffect(() => {
    setNumColumns(getNumColumns(photos.length));
  }, [photos.length]);

  // Preload first 6 thumbnail images for faster initial render
  useEffect(() => {
    if (photos.length > 0) {
      const preloadCount = Math.min(6, photos.length);
      photos.slice(0, preloadCount).forEach((photo) => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = photo.thumbnail;
        document.head.appendChild(link);
      });
    }
  }, [photos]);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/status`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(data.authenticated === true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  // Check for edit mode parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const editParam = urlParams.get('edit');
    setShowEditMode(editParam === 'true' && isAuthenticated);
  }, [location.search, isAuthenticated]);

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
    // If initialPhotos provided, use them directly (for shared albums)
    if (initialPhotos) {
      setPhotos(initialPhotos);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchPhotos = async () => {
      try {
        setLoading(true);

        // Try to fetch from static JSON first for better performance
        const staticJsonUrl = `/albums-data/${album === "homepage" ? "homepage" : album}.json`;
        
        try {
          const staticResponse = await fetch(staticJsonUrl);
          if (staticResponse.ok) {
            const staticPhotos = await staticResponse.json();
            console.log(`✨ Loaded ${staticPhotos.length} photos from static JSON (${album})`);
            setPhotos(staticPhotos);
            setError(null);
            setLoading(false);
            return;
          }
        } catch (staticError) {
          // Static JSON not available or failed, fall back to API
          console.log(`⚠️  Static JSON unavailable for ${album}, falling back to API`);
        }

        // Fallback to API if static JSON is not available
        if (album === "homepage") {
          // Use the random photos endpoint for homepage
          const response = await fetchWithRateLimitCheck(
            `${API_URL}/api/random-photos${queryString}`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch random photos");
          }
          const randomPhotos = await response.json();
          setPhotos(randomPhotos);
        } else {
          // Fetch all photos from the album
          const response = await fetchWithRateLimitCheck(
            `${API_URL}/api/albums/${album}/photos${queryString}`
          );
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error("ALBUM_NOT_FOUND");
            }
            throw new Error("Failed to fetch photos");
          }
          const data = await response.json();
          const photosArray = Array.isArray(data) ? data : (data.photos || []);
          
          // Sort photos by creation date
          const sortedPhotos = photosArray.sort((a: Photo, b: Photo) => {
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
  }, [album, queryString, initialPhotos]);

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

  // Function to get number of columns based on window width and photo count
  const getNumColumns = (photoCount: number) => {
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

  // State for number of columns
  const [numColumns, setNumColumns] = useState(getNumColumns(photos.length));
  
  // Refs for column elements and their transforms
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [columnTransforms, setColumnTransforms] = useState<number[]>([]);
  const shiftPointRef = useRef<number | null>(null);
  const hasReachedBottomRef = useRef(false);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setNumColumns(getNumColumns(photos.length));
      // On resize, switch to full-page calculation if we have a shift point
      if (shiftPointRef.current !== null) {
        hasReachedBottomRef.current = true;
        shiftPointRef.current = 0;
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [photos.length]);

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
    // Only apply the effect if there is more than one column
    if (numColumns <= 1) {
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
      const transforms = columnHeights.map((height) => {
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

  // Memoize the column distribution to avoid recomputing on every render
  const distributedColumns = useMemo(
    () => distributePhotos(photos, numColumns),
    [photos, numColumns, imageDimensions]
  );

  if (loading) {
    return (
      <div className="photo-grid-loading">
        <div className="loading-spinner"></div>
        <p>Loading photos...</p>
      </div>
    );
  }

  if (error) {
    if (error === "ALBUM_NOT_FOUND") {
      // Notify parent component to hide album title
      if (onAlbumNotFound) {
        onAlbumNotFound();
      }
      return <NotFound />;
    }
    return <div className="error">Error: {error}</div>;
  }

  return (
    <>
      {/* Album Actions - shown when edit mode is active */}
      {showEditMode && album !== 'homepage' && (
        <div className="album-actions-banner">
          <div className="album-actions-content">
            <h3>Quick Actions for "{album}"</h3>
            <div className="album-actions-grid-inline">
              <button
                onClick={() => window.open(`/admin/albums?album=${encodeURIComponent(album)}`, '_self')}
                className="btn-action btn-manage"
                title="Manage album in admin portal"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                Full Album Management
              </button>
              <button
                onClick={() => {
                  const urlParams = new URLSearchParams(location.search);
                  urlParams.delete('edit');
                  window.history.replaceState({}, '', `${location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`);
                  setShowEditMode(false);
                }}
                className="btn-action btn-close-edit"
                title="Close edit mode"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Close
              </button>
            </div>
            <p className="album-actions-hint">
              For uploading, deleting, or reordering photos, use the Full Album Management page.
            </p>
          </div>
        </div>
      )}
      <div className="photo-grid" style={{ gridTemplateColumns: `repeat(${numColumns}, 1fr)` }}>
      {distributedColumns.map((column, columnIndex) => (
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
                  : "4 / 3",
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
    </div>

      {selectedPhoto && (
        <PhotoModal
          selectedPhoto={selectedPhoto}
          photos={photos}
          album={album}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default PhotoGrid;
