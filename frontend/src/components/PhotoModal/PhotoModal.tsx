/**
 * Photo Modal Component
 * Main modal orchestrator that combines all sub-components
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { trackPhotoNavigation, trackPhotoDownload, trackModalClose } from '../../utils/analytics';
import { fetchWithRateLimitCheck } from '../../utils/fetchWrapper';
import { SITE_URL, cacheBustValue } from '../../config';
import { Photo, ExifData } from './types';
import ModalControls from './ModalControls';
import InfoPanel from './InfoPanel';
import ImageCanvas from './ImageCanvas';
import ModalNavigation from './ModalNavigation';
import './PhotoModal.css';

const API_URL = import.meta.env.VITE_API_URL || '';

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
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [imageBounds, setImageBounds] = useState<{width: number; left: number} | null>(null);

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

  // Calculate actual image bounds for aligning controls
  const updateImageBounds = useCallback(() => {
    if (!imageContainerRef.current) return;
    
    const img = imageContainerRef.current.querySelector('img');
    if (!img || !img.complete || !img.naturalWidth) return;
    
    // Get the image container element
    const imageContainer = imageContainerRef.current.querySelector('.modal-image-container');
    if (!imageContainer) return;
    
    // Get actual rendered dimensions of the image (accounting for objectFit: contain)
    const containerRect = imageContainer.getBoundingClientRect();
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = containerRect.width / containerRect.height;
    
    let renderedWidth, renderedLeft;
    
    if (imgAspect > containerAspect) {
      // Image is wider - constrained by width
      renderedWidth = containerRect.width;
      renderedLeft = 0;
    } else {
      // Image is taller - constrained by height
      renderedWidth = containerRect.height * imgAspect;
      renderedLeft = (containerRect.width - renderedWidth) / 2;
    }
    
    setImageBounds({
      width: renderedWidth,
      left: renderedLeft
    });
  }, []);

  // Update bounds when thumbnail loads
  const handleThumbnailLoad = useCallback(() => {
    setThumbnailLoaded(true);
    updateImageBounds();
  }, [updateImageBounds]);

  // Update bounds on window resize
  useEffect(() => {
    updateImageBounds();
    window.addEventListener('resize', updateImageBounds);
    return () => window.removeEventListener('resize', updateImageBounds);
  }, [updateImageBounds]);

  // Update bounds when photo changes
  useEffect(() => {
    updateImageBounds();
  }, [selectedPhoto.id, updateImageBounds]);

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
    document.body.style.width = '';
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
        if (showNavigationHint) {
          setShowNavigationHint(false);
          localStorage.setItem('hideNavigationHint', 'true');
        }
        handleNavigatePrev();
      } else if (e.key === "ArrowRight") {
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
        <div className="modal-container" ref={imageContainerRef}>
          <ModalControls
            show={thumbnailLoaded}
            showInfo={showInfo}
            copiedLink={copiedLink}
            isFullscreen={isFullscreen}
            onToggleInfo={handleToggleInfo}
            onCopyLink={handleCopyLink}
            onDownload={handleDownload}
            onToggleFullscreen={toggleFullscreen}
            onClose={handleClose}
            selectedPhoto={selectedPhoto}
            style={imageBounds ? { width: `${imageBounds.width}px`, left: `${imageBounds.left}px` } : {}}
          />

          <InfoPanel
            show={showInfo}
            photo={selectedPhoto}
            exifData={exifData}
            loadingExif={loadingExif}
          />

          <ImageCanvas
            photo={selectedPhoto}
            apiUrl={API_URL}
            imageQueryString={imageQueryString}
            modalImageLoaded={modalImageLoaded}
            showModalImage={showModalImage}
            onThumbnailLoad={handleThumbnailLoad}
          />

          <ModalNavigation
            showHint={showNavigationHint}
            onPrevious={handleNavigatePrev}
            onNext={handleNavigateNext}
            style={imageBounds ? { width: `${imageBounds.width}px`, left: `${imageBounds.left}px` } : {}}
          />
        </div>
      </div>
    </div>
  );
};

export default PhotoModal;
