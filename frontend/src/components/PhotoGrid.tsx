/**
 * PhotoGrid component for displaying a grid of photos.
 * This component handles fetching and displaying photos from the backend,
 * and provides functionality for viewing photos in a modal.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "./PhotoGrid.css";
import { API_URL, SITE_URL, cacheBustValue } from "../config";
import { trackPhotoClick, trackPhotoNavigation, trackPhotoDownload, trackModalClose, trackError } from "../utils/analytics";
import { fetchWithRateLimitCheck } from "../utils/fetchWrapper";

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
  
  const [modalImageLoaded, setModalImageLoadedRaw] = useState(false);
  const setModalImageLoaded = (value: boolean) => {
    console.log('[PERF] setModalImageLoaded called with:', value, 'at', performance.now());
    setModalImageLoadedRaw(value);
  };
  
  const [showInfo, setShowInfo] = useState(false);
  const [exifData, setExifData] = useState<any>(null);
  const [loadingExif, setLoadingExif] = useState(false);
  const [showNavigationHint, setShowNavigationHint] = useState(
    () => !localStorage.getItem('hideNavigationHint')
  );
  const [imageDimensions, setImageDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalOpenTimeRef = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

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

  // Function to update URL with photo parameter without page reload
  const updateURLWithPhoto = useCallback((photo: Photo) => {
    const filename = photo.id.split('/').pop();
    const newUrl = `/album/${photo.album}?photo=${encodeURIComponent(filename || '')}`;
    // Use history.replaceState instead of navigate to avoid page reload/flickering
    window.history.replaceState(null, '', newUrl);
  }, []);

  // Function to get permalink for current photo
  const getPhotoPermalink = useCallback((photo: Photo) => {
    const filename = photo.id.split('/').pop();
    return `${SITE_URL}/album/${photo.album}?photo=${encodeURIComponent(filename || '')}`;
  }, []);

  // Function to copy permalink to clipboard
  const handleCopyLink = useCallback(async (photo: Photo) => {
    const permalink = getPhotoPermalink(photo);
    try {
      await navigator.clipboard.writeText(permalink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }, [getPhotoPermalink]);

  const handlePhotoClick = (photo: Photo) => {
    const t0 = performance.now();
    console.log('[PERF] Click handler started', t0);
    
    setModalImageLoaded(false);
    const t1 = performance.now();
    console.log('[PERF] setModalImageLoaded called', t1 - t0);
    
    setSelectedPhoto(photo);
    const t2 = performance.now();
    console.log('[PERF] setSelectedPhoto called', t2 - t1);
    
    updateURLWithPhoto(photo);
    const t3 = performance.now();
    console.log('[PERF] updateURLWithPhoto called', t3 - t2);
    
    modalOpenTimeRef.current = Date.now();
    
    // Defer analytics to after render to avoid blocking on cellular
    setTimeout(() => {
      trackPhotoClick(photo.id, photo.album, photo.title);
    }, 0);
    
    const t4 = performance.now();
    console.log('[PERF] Click handler finished', t4 - t0);
  };

  const handleCloseModal = useCallback(async () => {
    if (selectedPhoto && modalOpenTimeRef.current) {
      const viewDuration = Date.now() - modalOpenTimeRef.current;
      trackModalClose(selectedPhoto.id, selectedPhoto.album, selectedPhoto.title, viewDuration);
    }
    // Exit fullscreen if active
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('Error exiting fullscreen:', err);
      }
    }
    setSelectedPhoto(null);
    setShowInfo(false);
    setExifData(null);
    setIsFullscreen(false);
    modalOpenTimeRef.current = null;
    setCopiedLink(false);
    // Clear the photo parameter from URL without page reload
    window.history.replaceState(null, '', `/album/${album}`);
  }, [selectedPhoto, album]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Error attempting to enable fullscreen:', err);
      }
    } else {
      // Exit fullscreen
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error('Error attempting to exit fullscreen:', err);
      }
    }
  }, []);

  const fetchExifData = async (photo: Photo) => {
    if (exifData) return; // Already loaded
    
    setLoadingExif(true);
    try {
      const filename = photo.id.split('/').pop();
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/photos/${photo.album}/${filename}/exif${queryString ? '?' + queryString : ''}`
      );
      
      if (res.ok) {
        const data = await res.json();
        setExifData(data);
      } else {
        console.error('Failed to load EXIF data');
        setExifData({ error: 'Failed to load' });
      }
    } catch (error) {
      console.error('Error fetching EXIF:', error);
      setExifData({ error: 'Failed to load' });
    } finally {
      setLoadingExif(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  // Handle touch swipe for mobile navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current || !selectedPhoto) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Ensure horizontal swipe is more dominant than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe right - go to previous photo
        const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
        const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
        const prevPhoto = photos[prevIndex];
        const viewDuration = modalOpenTimeRef.current ? Date.now() - modalOpenTimeRef.current : undefined;
        setModalImageLoaded(false);
        setSelectedPhoto(prevPhoto);
        updateURLWithPhoto(prevPhoto);
        setExifData(null);
        modalOpenTimeRef.current = Date.now();
        setTimeout(() => {
          trackPhotoNavigation('previous', prevPhoto.id, prevPhoto.album, prevPhoto.title, viewDuration);
        }, 0);
      } else {
        // Swipe left - go to next photo
        const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
        const nextIndex = (currentIndex + 1) % photos.length;
        const nextPhoto = photos[nextIndex];
        const viewDuration = modalOpenTimeRef.current ? Date.now() - modalOpenTimeRef.current : undefined;
        setModalImageLoaded(false);
        setSelectedPhoto(nextPhoto);
        updateURLWithPhoto(nextPhoto);
        setExifData(null);
        modalOpenTimeRef.current = Date.now();
        setTimeout(() => {
          trackPhotoNavigation('next', nextPhoto.id, nextPhoto.album, nextPhoto.title, viewDuration);
        }, 0);
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Auto-fetch EXIF data when navigating between photos if info panel is open
  useEffect(() => {
    if (showInfo && selectedPhoto && !exifData && !loadingExif) {
      fetchExifData(selectedPhoto);
    }
  }, [selectedPhoto, showInfo]);

  // Handle body scrolling when modal opens/closes
  useEffect(() => {
    if (selectedPhoto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedPhoto]);

  // Handle fullscreen changes (like when user presses Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Close modal and reset state when album changes
  useEffect(() => {
    setSelectedPhoto(null);
    setModalImageLoaded(false);
    modalOpenTimeRef.current = null;
    setColumnTransforms([]);
  }, [album]);

  // Reset modal image loaded state when photo changes
  useEffect(() => {
    setModalImageLoaded(false);
  }, [selectedPhoto?.id]);

  // Auto-open photo from URL query parameter
  useEffect(() => {
    console.log('[PERF] Auto-open effect running', performance.now(), 'photos.length:', photos.length, 'selectedPhoto:', !!selectedPhoto);
    if (photos.length > 0 && !selectedPhoto) {
      const urlParams = new URLSearchParams(location.search);
      const photoParam = urlParams.get('photo');
      console.log('[PERF] Photo param from URL:', photoParam);
      if (photoParam) {
        // Find photo by filename
        const photo = photos.find(p => p.id.endsWith(photoParam));
        if (photo) {
          console.log('[PERF] Auto-opening photo from URL', performance.now());
          setModalImageLoaded(false);
          setSelectedPhoto(photo);
          modalOpenTimeRef.current = Date.now();
          trackPhotoClick(photo.id, photo.album, photo.title);
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

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPhoto) return;

      if (e.key === "Escape") {
        handleCloseModal();
      } else if (e.key === "ArrowLeft") {
        // Hide navigation hint on first arrow key press
        if (showNavigationHint) {
          setShowNavigationHint(false);
          localStorage.setItem('hideNavigationHint', 'true');
        }
        const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
        const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
        const prevPhoto = photos[prevIndex];
        // Calculate view duration of current photo before navigating
        const viewDuration = modalOpenTimeRef.current ? Date.now() - modalOpenTimeRef.current : undefined;
        setModalImageLoaded(false);
        setSelectedPhoto(prevPhoto);
        updateURLWithPhoto(prevPhoto);
        setExifData(null); // Reset EXIF data for new photo
        modalOpenTimeRef.current = Date.now(); // Reset timer for new photo
        setTimeout(() => {
          trackPhotoNavigation('previous', prevPhoto.id, prevPhoto.album, prevPhoto.title, viewDuration);
        }, 0);
      } else if (e.key === "ArrowRight") {
        // Hide navigation hint on first arrow key press
        if (showNavigationHint) {
          setShowNavigationHint(false);
          localStorage.setItem('hideNavigationHint', 'true');
        }
        const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
        const nextIndex = (currentIndex + 1) % photos.length;
        const nextPhoto = photos[nextIndex];
        // Calculate view duration of current photo before navigating
        const viewDuration = modalOpenTimeRef.current ? Date.now() - modalOpenTimeRef.current : undefined;
        setModalImageLoaded(false);
        setSelectedPhoto(nextPhoto);
        updateURLWithPhoto(nextPhoto);
        setExifData(null); // Reset EXIF data for new photo
        modalOpenTimeRef.current = Date.now(); // Reset timer for new photo
        setTimeout(() => {
          trackPhotoNavigation('next', nextPhoto.id, nextPhoto.album, nextPhoto.title, viewDuration);
        }, 0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto, photos, handleCloseModal, showNavigationHint, updateURLWithPhoto]);

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
        <div className={`modal ${isFullscreen ? 'fullscreen' : ''}`} onClick={handleCloseModal}>
          {(() => {
            console.log('[PERF] Modal rendering, selectedPhoto.id:', selectedPhoto.id, performance.now());
            return null;
          })()}
          <div 
            key={selectedPhoto.id}
            className="modal-content" 
            onClick={(e) => {
              e.stopPropagation();
              // Close info panel when clicking outside of it
              if (showInfo && !(e.target as HTMLElement).closest('.modal-info-panel') && !(e.target as HTMLElement).closest('.modal-controls-left button')) {
                setShowInfo(false);
              }
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="modal-image-wrapper">
              <div 
                className="modal-controls-left"
                style={{ opacity: modalImageLoaded ? 1 : 1 }}
              >
                <button
                  onClick={() => {
                    const newShowInfo = !showInfo;
                    setShowInfo(newShowInfo);
                    if (newShowInfo && selectedPhoto && !exifData && !loadingExif) {
                      fetchExifData(selectedPhoto);
                    }
                  }}
                  className={showInfo ? 'active' : ''}
                  title="Photo information"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyLink(selectedPhoto);
                  }}
                  title={copiedLink ? "Copied!" : "Copy link"}
                  className={copiedLink ? "copied" : ""}
                >
                  {copiedLink ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const filename = selectedPhoto.id.split('/').pop() || 'photo.jpg';
                    try {
                      const response = await fetch(`${API_URL}${selectedPhoto.download}${imageQueryString}`);
                      const blob = await response.blob();
                      const blobUrl = URL.createObjectURL(blob);
                      
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = filename;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      URL.revokeObjectURL(blobUrl);
                      
                      trackPhotoDownload(selectedPhoto.id, selectedPhoto.album, selectedPhoto.title);
                    } catch (error) {
                      console.error('Download failed:', error);
                      window.open(`${API_URL}${selectedPhoto.download}${imageQueryString}`, '_blank');
                    }
                  }}
                  title="Download photo"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
                {showInfo && (
                  <div className="modal-info-panel">
                    <h3>Photo Information</h3>
                    <div className="info-item">
                      <span className="info-label">File:</span>
                      <span className="info-value">{selectedPhoto.id.split('/').pop()}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Title:</span>
                      <span className="info-value">{selectedPhoto.title}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Album:</span>
                      <span className="info-value">{selectedPhoto.album}</span>
                    </div>
                    {selectedPhoto.metadata && (
                      <div className="info-item">
                        <span className="info-label">Size:</span>
                        <span className="info-value">{formatFileSize(selectedPhoto.metadata.size)}</span>
                      </div>
                    )}
                    {loadingExif && (
                      <div className="info-item">
                        <span className="info-value">Loading EXIF data...</span>
                      </div>
                    )}
                    {exifData && !exifData.error && (
                      <>
                        {exifData.Make && (
                          <div className="info-item">
                            <span className="info-label">Camera:</span>
                            <span className="info-value">{exifData.Make} {exifData.Model}</span>
                          </div>
                        )}
                        {exifData.LensModel && (
                          <div className="info-item">
                            <span className="info-label">Lens:</span>
                            <span className="info-value">{exifData.LensModel}</span>
                          </div>
                        )}
                        {exifData.FocalLength && (
                          <div className="info-item">
                            <span className="info-label">Focal Length:</span>
                            <span className="info-value">{exifData.FocalLength}mm</span>
                          </div>
                        )}
                        {exifData.FNumber && (
                          <div className="info-item">
                            <span className="info-label">Aperture:</span>
                            <span className="info-value">f/{exifData.FNumber}</span>
                          </div>
                        )}
                        {exifData.ExposureTime && (
                          <div className="info-item">
                            <span className="info-label">Shutter:</span>
                            <span className="info-value">{exifData.ExposureTime < 1 ? `1/${Math.round(1/exifData.ExposureTime)}` : exifData.ExposureTime}s</span>
                          </div>
                        )}
                        {exifData.ISO && (
                          <div className="info-item">
                            <span className="info-label">ISO:</span>
                            <span className="info-value">{exifData.ISO}</span>
                          </div>
                        )}
                        {exifData.DateTimeOriginal && (
                          <div className="info-item">
                            <span className="info-label">Date Taken:</span>
                            <span className="info-value">
                              {new Date(exifData.DateTimeOriginal).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div 
                className="modal-controls"
                style={{ opacity: modalImageLoaded ? 1 : 1 }}
              >
                <button
                  className="fullscreen-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullscreen();
                  }}
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                    </svg>
                  ) : (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseModal();
                  }}
                  title="Close"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {showNavigationHint && (
                <div 
                  className="modal-navigation-hint"
                  style={{ opacity: modalImageLoaded ? 1 : 1 }}
                >
                  ← press arrow keys to navigate →
                </div>
              )}
              <div 
                className="modal-navigation"
                style={{ opacity: modalImageLoaded ? 1 : 1 }}
              >
                <button
                  onClick={() => {
                    const currentIndex = photos.findIndex(
                      (p) => p.id === selectedPhoto.id
                    );
                    const prevIndex =
                      (currentIndex - 1 + photos.length) % photos.length;
                    const prevPhoto = photos[prevIndex];
                    // Calculate view duration of current photo before navigating
                    const viewDuration = modalOpenTimeRef.current ? Date.now() - modalOpenTimeRef.current : undefined;
                    setSelectedPhoto(prevPhoto);
                    updateURLWithPhoto(prevPhoto);
                    setExifData(null); // Reset EXIF data for new photo
                    modalOpenTimeRef.current = Date.now(); // Reset timer for new photo
                    setTimeout(() => {
                      trackPhotoNavigation('previous', prevPhoto.id, prevPhoto.album, prevPhoto.title, viewDuration);
                    }, 0);
                  }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6L6 12L18 18" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const currentIndex = photos.findIndex(
                      (p) => p.id === selectedPhoto.id
                    );
                    const nextIndex = (currentIndex + 1) % photos.length;
                    const nextPhoto = photos[nextIndex];
                    // Calculate view duration of current photo before navigating
                    const viewDuration = modalOpenTimeRef.current ? Date.now() - modalOpenTimeRef.current : undefined;
                    setSelectedPhoto(nextPhoto);
                    updateURLWithPhoto(nextPhoto);
                    setExifData(null); // Reset EXIF data for new photo
                    modalOpenTimeRef.current = Date.now(); // Reset timer for new photo
                    setTimeout(() => {
                      trackPhotoNavigation('next', nextPhoto.id, nextPhoto.album, nextPhoto.title, viewDuration);
                    }, 0);
                  }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 6L18 12L6 18" />
                  </svg>
                </button>
              </div>
              <img
                ref={(img) => {
                  if (img) {
                    console.log('[PERF] Thumbnail img ref mounted', performance.now());
                    console.log('[PERF] Thumbnail img.complete:', img.complete);
                    console.log('[PERF] Thumbnail img.naturalHeight:', img.naturalHeight);
                  }
                }}
                onLoadStart={() => {
                  console.log('[PERF] Thumbnail loadstart event', performance.now());
                }}
                onLoad={() => {
                  console.log('[PERF] Thumbnail load event', performance.now());
                }}
                src={`${API_URL}${selectedPhoto.thumbnail}${imageQueryString}`}
                alt={`${selectedPhoto.album} photography by Ted Charles - ${selectedPhoto.title}`}
                title={selectedPhoto.title}
                className="modal-placeholder"
                style={{ opacity: modalImageLoaded ? 1 : 1 }}
              />
              <img
                ref={(img) => {
                  if (img) {
                    // When mounted, check if image is already cached/loaded
                    if (img.complete && img.naturalHeight !== 0) {
                      setModalImageLoaded(true);
                    }
                  }
                }}
                src={`${API_URL}${selectedPhoto.src}${imageQueryString}`}
                alt={`${selectedPhoto.album} photography by Ted Charles - ${selectedPhoto.title}`}
                title={selectedPhoto.title}
                loading="lazy"
                decoding="async"
                onLoad={() => setModalImageLoaded(true)}
                onError={() => {
                  console.error('Failed to load modal image:', selectedPhoto.src);
                  trackError(`Failed to load image: ${selectedPhoto.id}`, 'modal_image_load');
                  // Show placeholder if full image fails to load
                  setModalImageLoaded(true);
                }}
                style={{ opacity: modalImageLoaded ? 0 : 0 }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGrid;
