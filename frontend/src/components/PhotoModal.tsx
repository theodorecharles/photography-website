import React, { useRef, useState, useEffect, useCallback } from 'react';
import { trackPhotoClick, trackPhotoNavigation, trackPhotoDownload, trackModalClose } from '../utils/analytics';
import { fetchWithRateLimitCheck } from '../utils/fetchWrapper';
import { SITE_URL, cacheBustValue } from '../config';
import './PhotoModal.css';

const API_URL = import.meta.env.VITE_API_URL || '';

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
  exif?: any;
}

interface ExifData {
  Make?: string;
  Model?: string;
  LensModel?: string;
  FocalLength?: number;
  FNumber?: number;
  ExposureTime?: number;
  ISO?: number;
  DateTimeOriginal?: string;
  error?: string;
}

interface PhotoModalProps {
  selectedPhoto: Photo;
  photos: Photo[];
  album: string;
  onClose: () => void;
}

const PhotoModal: React.FC<PhotoModalProps> = ({
  selectedPhoto: initialPhoto,
  photos,
  album,
  onClose,
}) => {
  // Modal-specific state
  const [selectedPhoto, setSelectedPhoto] = useState(initialPhoto);
  const [modalImageLoaded, setModalImageLoaded] = useState(false);
  const [showModalImage, setShowModalImage] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [exifData, setExifData] = useState<ExifData | null>(null);
  const [loadingExif, setLoadingExif] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNavigationHint, setShowNavigationHint] = useState(
    () => !localStorage.getItem('hideNavigationHint')
  );
  
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const modalOpenTimeRef = useRef<number | null>(Date.now());

  // For image URLs, don't include query strings to improve caching (especially on iOS)
  const imageQueryString = ``;
  
  // Get query parameters for API calls
  const queryParams = new URLSearchParams(window.location.search);
  queryParams.delete('photo');
  const queryString = queryParams.toString()
    ? `?${queryParams.toString()}&i=${cacheBustValue}`
    : `?i=${cacheBustValue}`;

  // Update selectedPhoto when prop changes
  useEffect(() => {
    setSelectedPhoto(initialPhoto);
    setModalImageLoaded(false);
    setShowModalImage(false);
    setThumbnailLoaded(false);
    setExifData(null);
    modalOpenTimeRef.current = Date.now();
  }, [initialPhoto.id]);

  // Update URL with photo parameter
  const updateURLWithPhoto = useCallback((photo: Photo) => {
    const filename = photo.id.split('/').pop();
    const baseUrl = photo.album === 'homepage' ? '/' : `/album/${photo.album}`;
    const newUrl = `${baseUrl}?photo=${encodeURIComponent(filename || '')}`;
    window.history.replaceState(null, '', newUrl);
  }, []);

  // Get permalink for photo
  const getPhotoPermalink = useCallback((photo: Photo) => {
    const filename = photo.id.split('/').pop();
    const baseUrl = photo.album === 'homepage' ? '/' : `/album/${photo.album}`;
    return `${SITE_URL}${baseUrl}?photo=${encodeURIComponent(filename || '')}`;
  }, []);

  // Handle copy link
  const handleCopyLink = useCallback(async (photo: Photo) => {
    const permalink = getPhotoPermalink(photo);
    try {
      await navigator.clipboard.writeText(permalink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }, [getPhotoPermalink]);

  // Handle close
  const handleClose = useCallback(async () => {
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
    
    // Clear URL parameter
    const baseUrl = album === 'homepage' ? '/' : `/album/${album}`;
    window.history.replaceState(null, '', baseUrl);
    
    // Restore body scroll
    const scrollY = document.body.style.top;
    document.body.style.position = '';
    document.body.style.top = '';
    window.scrollTo(0, parseInt(scrollY || '0') * -1);
    
    onClose();
  }, [selectedPhoto, album, onClose]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Error attempting to enable fullscreen:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error('Error attempting to exit fullscreen:', err);
      }
    }
  }, []);

  // Fetch EXIF data
  const fetchExifData = useCallback(async (photo: Photo) => {
    if (exifData) return;
    
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
  }, [exifData, queryString]);

  // Toggle info panel
  const handleToggleInfo = useCallback(() => {
    const newShowInfo = !showInfo;
    setShowInfo(newShowInfo);
    if (newShowInfo && selectedPhoto && !exifData && !loadingExif) {
      fetchExifData(selectedPhoto);
    }
  }, [showInfo, selectedPhoto, exifData, loadingExif, fetchExifData]);

  // Handle download
  const handleDownload = useCallback(async (photo: Photo) => {
    const filename = photo.id.split('/').pop() || 'photo.jpg';
    try {
      const response = await fetch(`${API_URL}${photo.download}${imageQueryString}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(blobUrl);
      
      trackPhotoDownload(photo.id, photo.album, photo.title);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(`${API_URL}${photo.download}${imageQueryString}`, '_blank');
    }
  }, [imageQueryString]);

  // Navigate to previous photo
  const handleNavigatePrev = useCallback(() => {
    const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
    const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
    const prevPhoto = photos[prevIndex];
    const viewDuration = modalOpenTimeRef.current ? Date.now() - modalOpenTimeRef.current : undefined;
    
    setSelectedPhoto(prevPhoto);
    updateURLWithPhoto(prevPhoto);
    setExifData(null);
    setModalImageLoaded(false);
    setShowModalImage(false);
    setThumbnailLoaded(false);
    modalOpenTimeRef.current = Date.now();
    
    setTimeout(() => {
      trackPhotoNavigation('previous', prevPhoto.id, prevPhoto.album, prevPhoto.title, viewDuration);
    }, 0);
  }, [selectedPhoto, photos, updateURLWithPhoto]);

  // Navigate to next photo
  const handleNavigateNext = useCallback(() => {
    const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
    const nextIndex = (currentIndex + 1) % photos.length;
    const nextPhoto = photos[nextIndex];
    const viewDuration = modalOpenTimeRef.current ? Date.now() - modalOpenTimeRef.current : undefined;
    
    setSelectedPhoto(nextPhoto);
    updateURLWithPhoto(nextPhoto);
    setExifData(null);
    setModalImageLoaded(false);
    setShowModalImage(false);
    setThumbnailLoaded(false);
    modalOpenTimeRef.current = Date.now();
    
    setTimeout(() => {
      trackPhotoNavigation('next', nextPhoto.id, nextPhoto.album, nextPhoto.title, viewDuration);
    }, 0);
  }, [selectedPhoto, photos, updateURLWithPhoto]);

  // Handle modal content click
  const handleModalContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (showInfo && !(e.target as HTMLElement).closest('.modal-info-panel') && !(e.target as HTMLElement).closest('.modal-controls-top button')) {
      setShowInfo(false);
    }
  }, [showInfo]);

  // Handle touch gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        handleNavigatePrev();
      } else {
        handleNavigateNext();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Utility function
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Auto-fetch EXIF data when navigating if info panel is open
  useEffect(() => {
    if (showInfo && selectedPhoto && !exifData && !loadingExif) {
      fetchExifData(selectedPhoto);
    }
  }, [selectedPhoto, showInfo, exifData, loadingExif, fetchExifData]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, []);

  // Preload modal image after delay
  useEffect(() => {
    if (selectedPhoto && !showModalImage) {
      const timer = setTimeout(() => {
        const img = new Image();
        const modalUrl = `${API_URL}${selectedPhoto.src}${imageQueryString}`;

        img.onload = () => {
          setModalImageLoaded(true);
          setShowModalImage(true);
        };

        img.onerror = () => {
          console.error('Modal image preload failed');
        };

        img.src = modalUrl;
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [selectedPhoto, showModalImage, imageQueryString]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowLeft") {
        // Hide navigation hint on first arrow key press
        if (showNavigationHint) {
          setShowNavigationHint(false);
          localStorage.setItem('hideNavigationHint', 'true');
        }
        handleNavigatePrev();
      } else if (e.key === "ArrowRight") {
        // Hide navigation hint on first arrow key press
        if (showNavigationHint) {
          setShowNavigationHint(false);
          localStorage.setItem('hideNavigationHint', 'true');
        }
        handleNavigateNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, handleNavigatePrev, handleNavigateNext, showNavigationHint]);

  return (
    <div className={`modal ${isFullscreen ? 'fullscreen' : ''}`} onClick={handleClose}>
      <div
        key={selectedPhoto.id}
        className="modal-content"
        onClick={handleModalContentClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="modal-container">
          {/* Top controls: info, copy, download, fullscreen, close */}
          <div
            className="modal-controls-top"
            style={{ opacity: thumbnailLoaded ? 1 : 0 }}
          >
            <button
              onClick={handleToggleInfo}
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
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(selectedPhoto);
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
                handleClose();
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

          {/* Image container */}
          <div className="modal-image-container">
            {/* Thumbnail - shows first */}
            <img
              onLoad={() => setThumbnailLoaded(true)}
              src={`${API_URL}${selectedPhoto.thumbnail}${imageQueryString}`}
              alt={`${selectedPhoto.album} photography by Ted Charles - ${selectedPhoto.title}`}
              title={selectedPhoto.title}
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                objectFit: 'contain',
                display: 'block',
                opacity: modalImageLoaded ? 0 : 1,
                transition: 'opacity 0.3s ease',
              }}
            />
            {/* Modal optimized image - overlays on top when loaded */}
            {showModalImage && (
              <img
                src={`${API_URL}${selectedPhoto.src}${imageQueryString}`}
                alt={`${selectedPhoto.album} photography by Ted Charles - ${selectedPhoto.title}`}
                title={selectedPhoto.title}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  maxWidth: '90vw',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  opacity: modalImageLoaded ? 1 : 0,
                  pointerEvents: modalImageLoaded ? 'auto' : 'none'
                }}
              />
            )}
          </div>

          {/* Navigation controls */}
          <div className="modal-navigation-container">
            {showNavigationHint && (
              <div className="modal-navigation-hint">
                ← press arrow keys to navigate →
              </div>
            )}
            <div className="modal-navigation">
              <button onClick={handleNavigatePrev}>
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
              <button onClick={handleNavigateNext}>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoModal;

