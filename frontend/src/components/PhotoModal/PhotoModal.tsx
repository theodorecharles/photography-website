/**
 * Photo Modal Component
 * Main modal orchestrator that combines all sub-components
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
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
  // Create index map for O(1) photo lookups (critical for large albums)
  const photoIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    photos.forEach((photo, index) => {
      map.set(photo.id, index);
    });
    return map;
  }, [photos]);
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
  const [imageTitle, setImageTitle] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>('Photo');
  
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

  // Update URL with photo parameter
  const updateURLWithPhoto = useCallback((photo: Photo) => {
    const filename = photo.id.split('/').pop();
    const baseUrl = photo.album === 'homepage' ? '/' : `/album/${photo.album}`;
    const newUrl = `${baseUrl}?photo=${encodeURIComponent(filename || '')}`;
    window.history.replaceState(null, '', newUrl);
  }, []);

  // Fetch branding data on mount
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await fetchWithRateLimitCheck(`${API_URL}/api/branding`);
        if (res.ok) {
          const data = await res.json();
          setSiteName(data.siteName || 'Photo');
        }
      } catch (err) {
        console.error('Failed to fetch branding:', err);
      }
    };
    fetchBranding();
  }, []);

  // Get permalink for photo
  const getPhotoPermalink = useCallback((photo: Photo) => {
    const filename = photo.id.split('/').pop();
    const baseUrl = photo.album === 'homepage' ? '/' : `/album/${photo.album}`;
    return `${SITE_URL}${baseUrl}?photo=${encodeURIComponent(filename || '')}`;
  }, []);

  // Fetch image title
  const fetchImageTitle = useCallback(async (photo: Photo) => {
    try {
      const filename = photo.id.split('/').pop();
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/image-metadata/${photo.album}/${filename}`
      );
      
      if (res.ok) {
        const data = await res.json();
        setImageTitle(data.title || null);
      } else {
        // No title found - this is okay
        setImageTitle(null);
      }
    } catch (error) {
      // Silently fail - titles are optional
      setImageTitle(null);
    }
  }, []);

  // Update selectedPhoto when prop changes
  useEffect(() => {
    setSelectedPhoto(initialPhoto);
    setModalImageLoaded(false);
    setShowModalImage(false);
    setThumbnailLoaded(false);
    setExifData(null);
    setImageTitle(null);
    modalOpenTimeRef.current = Date.now();
    
    // Update URL with photo parameter
    updateURLWithPhoto(initialPhoto);
    
    // Fetch image title
    fetchImageTitle(initialPhoto);
  }, [initialPhoto.id, updateURLWithPhoto, fetchImageTitle]);

  // Fetch title when selected photo changes (during navigation)
  useEffect(() => {
    // Clear the old title immediately when navigating
    setImageTitle(null);
    
    // Fetch new title
    fetchImageTitle(selectedPhoto);
    updateURLWithPhoto(selectedPhoto);
  }, [selectedPhoto.id, fetchImageTitle, updateURLWithPhoto]);

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

  // Helper function to update meta tags
  const updateMetaTag = useCallback((attribute: string, key: string, content: string) => {
    let element = document.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement;
    
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, key);
      document.head.appendChild(element);
    }
    
    element.setAttribute('content', content);
  }, []);

  // Update page title and meta tags when image title changes
  useEffect(() => {
    if (imageTitle && selectedPhoto) {
      const pageTitle = `${imageTitle} - ${siteName}`;
      const photoUrl = getPhotoPermalink(selectedPhoto);
      const imageUrl = `${API_URL}${selectedPhoto.modal}`;
      
      // Update document title
      document.title = pageTitle;
      
      // Update meta tags for social media sharing
      updateMetaTag('property', 'og:title', pageTitle);
      updateMetaTag('property', 'og:image', imageUrl);
      updateMetaTag('property', 'og:url', photoUrl);
      updateMetaTag('property', 'og:type', 'article');
      updateMetaTag('name', 'twitter:title', pageTitle);
      updateMetaTag('name', 'twitter:image', imageUrl);
      updateMetaTag('name', 'twitter:card', 'summary_large_image');
      updateMetaTag('name', 'description', imageTitle);
      updateMetaTag('property', 'og:description', imageTitle);
      updateMetaTag('name', 'twitter:description', imageTitle);
    }
    
    // Cleanup: restore default title when unmounting
    return () => {
      document.title = siteName;
    };
  }, [imageTitle, selectedPhoto, siteName, getPhotoPermalink, updateMetaTag]);

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
    const originalFilename = photo.id.split('/').pop() || 'photo.jpg';
    const fileExtension = originalFilename.substring(originalFilename.lastIndexOf('.'));
    
    // Create filename as "Site Name - AI Title.jpg" or fallback to original
    let downloadFilename = originalFilename;
    if (imageTitle) {
      // Sanitize title for filename (remove special characters)
      const sanitizedTitle = imageTitle.replace(/[/\\?%*:|"<>]/g, '-');
      downloadFilename = `${siteName} - ${sanitizedTitle}${fileExtension}`;
    }
    
    try {
      const response = await fetch(`${API_URL}${photo.download}${imageQueryString}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(blobUrl);
      
      trackPhotoDownload(photo.id, photo.album, photo.title);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(`${API_URL}${photo.download}${imageQueryString}`, '_blank');
    }
  }, [imageQueryString, imageTitle, siteName]);

  // Navigate to previous photo
  const handleNavigatePrev = useCallback(() => {
    const currentIndex = photoIndexMap.get(selectedPhoto.id) ?? 0;
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
  }, [photoIndexMap, selectedPhoto, photos, updateURLWithPhoto]);

  // Navigate to next photo
  const handleNavigateNext = useCallback(() => {
    const currentIndex = photoIndexMap.get(selectedPhoto.id) ?? 0;
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
  }, [photoIndexMap, selectedPhoto, photos, updateURLWithPhoto]);

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

  // Precache all thumbnails for smooth navigation
  useEffect(() => {
    // Preload all thumbnails in the background
    photos.forEach((photo) => {
      const img = new Image();
      img.src = `${API_URL}${photo.thumbnail}${imageQueryString}`;
      // No need to do anything on load - browser will cache it automatically
    });
  }, [photos, imageQueryString]);

  // Preload modal image after delay
  useEffect(() => {
    if (selectedPhoto && !showModalImage) {
      const timer = setTimeout(() => {
        const img = new Image();
        const modalUrl = `${API_URL}${selectedPhoto.src}${imageQueryString}`;

        img.onload = () => {
          // Add image to DOM first with opacity: 0
          setShowModalImage(true);
          // Then after a brief delay, fade it in
          requestAnimationFrame(() => {
            setTimeout(() => {
              setModalImageLoaded(true);
            }, 10);
          });
        };

        img.onerror = () => {
          console.error('Modal image preload failed');
        };

        img.src = modalUrl;
      }, 10);

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
            imageTitle={imageTitle}
            style={imageBounds ? { left: `${imageBounds.left}px` } : {}}
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
            style={imageBounds ? { right: `${imageBounds.left}px` } : {}}
          />

          {/* Image Title */}
          {imageTitle && thumbnailLoaded && (
            <div className="modal-image-title">
              {imageTitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoModal;
