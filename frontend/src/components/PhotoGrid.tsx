/**
 * PhotoGrid component for displaying a grid of photos.
 * This component handles fetching and displaying photos from the backend,
 * and provides functionality for viewing photos in a modal.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "./PhotoGrid.css";
import { API_URL, cacheBustValue } from "../config";
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
  const [modalImageLoaded, setModalImageLoaded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [exifData, setExifData] = useState<any>(null);
  const [loadingExif, setLoadingExif] = useState(false);
  const [showNavigationHint, setShowNavigationHint] = useState(
    () => !localStorage.getItem('hideNavigationHint')
  );
  const [imageDimensions, setImageDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const modalOpenTimeRef = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Get query parameters from current URL
  const queryParams = new URLSearchParams(location.search);
  const queryString = queryParams.toString()
    ? `?${queryParams.toString()}&i=${cacheBustValue}`
    : `?i=${cacheBustValue}`;

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
    modalOpenTimeRef.current = Date.now();
    trackPhotoClick(photo.id, photo.album, photo.title);
  };

  const handleCloseModal = useCallback(() => {
    if (selectedPhoto && modalOpenTimeRef.current) {
      const viewDuration = Date.now() - modalOpenTimeRef.current;
      trackModalClose(selectedPhoto.id, selectedPhoto.album, selectedPhoto.title, viewDuration);
    }
    setSelectedPhoto(null);
    setShowInfo(false);
    setExifData(null);
    modalOpenTimeRef.current = null;
  }, [selectedPhoto]);

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
        setExifData(null);
        modalOpenTimeRef.current = Date.now();
        trackPhotoNavigation('previous', prevPhoto.id, prevPhoto.album, prevPhoto.title, viewDuration);
      } else {
        // Swipe left - go to next photo
        const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
        const nextIndex = (currentIndex + 1) % photos.length;
        const nextPhoto = photos[nextIndex];
        const viewDuration = modalOpenTimeRef.current ? Date.now() - modalOpenTimeRef.current : undefined;
        setModalImageLoaded(false);
        setSelectedPhoto(nextPhoto);
        setExifData(null);
        modalOpenTimeRef.current = Date.now();
        trackPhotoNavigation('next', nextPhoto.id, nextPhoto.album, nextPhoto.title, viewDuration);
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

  // Close modal and reset state when album changes
  useEffect(() => {
    setSelectedPhoto(null);
    setModalImageLoaded(false);
    modalOpenTimeRef.current = null;
  }, [album]);

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
        setExifData(null); // Reset EXIF data for new photo
        modalOpenTimeRef.current = Date.now(); // Reset timer for new photo
        trackPhotoNavigation('previous', prevPhoto.id, prevPhoto.album, prevPhoto.title, viewDuration);
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
        setExifData(null); // Reset EXIF data for new photo
        modalOpenTimeRef.current = Date.now(); // Reset timer for new photo
        trackPhotoNavigation('next', nextPhoto.id, nextPhoto.album, nextPhoto.title, viewDuration);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto, photos, handleCloseModal, showNavigationHint]);

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

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setNumColumns(getNumColumns());
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

  if (loading) {
    return <div className="loading">Loading photos...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="photo-grid">
      {distributePhotos(photos, numColumns).map((column, columnIndex) => (
        <div key={columnIndex} className="photo-column">
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
                src={`${API_URL}${photo.thumbnail}${queryString}`}
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
        <div className="modal" onClick={handleCloseModal}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="modal-image-wrapper">
              <div className="modal-controls-left">
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
                  ℹ
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
              <div className="modal-controls">
                <button
                  onClick={() => {
                    window.open(
                      `${API_URL}${selectedPhoto.download}${queryString}`,
                      "_blank"
                    );
                    trackPhotoDownload(selectedPhoto.id, selectedPhoto.album, selectedPhoto.title);
                  }}
                >
                  <svg
                    width="24"
                    height="24"
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
                <button onClick={handleCloseModal}>
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
                <div className="modal-navigation-hint">
                  ← press arrow keys to navigate →
                </div>
              )}
              <div className="modal-navigation">
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
                    setModalImageLoaded(false);
                    setSelectedPhoto(prevPhoto);
                    setExifData(null); // Reset EXIF data for new photo
                    modalOpenTimeRef.current = Date.now(); // Reset timer for new photo
                    trackPhotoNavigation('previous', prevPhoto.id, prevPhoto.album, prevPhoto.title, viewDuration);
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
                    setModalImageLoaded(false);
                    setSelectedPhoto(nextPhoto);
                    setExifData(null); // Reset EXIF data for new photo
                    modalOpenTimeRef.current = Date.now(); // Reset timer for new photo
                    trackPhotoNavigation('next', nextPhoto.id, nextPhoto.album, nextPhoto.title, viewDuration);
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
                src={`${API_URL}${selectedPhoto.thumbnail}${queryString}`}
                alt={`${selectedPhoto.album} photography by Ted Charles - ${selectedPhoto.title}`}
                title={selectedPhoto.title}
                className="modal-placeholder"
                style={{ display: modalImageLoaded ? "none" : "block" }}
              />
              <img
                src={`${API_URL}${selectedPhoto.src}${queryString}`}
                alt={`${selectedPhoto.album} photography by Ted Charles - ${selectedPhoto.title}`}
                title={selectedPhoto.title}
                onLoad={() => setModalImageLoaded(true)}
                onError={() => {
                  console.error('Failed to load modal image:', selectedPhoto.src);
                  trackError(`Failed to load image: ${selectedPhoto.id}`, 'modal_image_load');
                  // Show placeholder if full image fails to load
                  setModalImageLoaded(true);
                }}
                style={{ display: modalImageLoaded ? "block" : "none" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGrid;
