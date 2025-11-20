/**
 * Image Canvas Component
 * Displays the thumbnail instantly and fades in the optimized image once loaded
 */

import React, { useEffect, useRef, useState } from 'react';
import { Photo } from './types';

interface ImageCanvasProps {
  photo: Photo;
  apiUrl: string;
  imageQueryString: string;
  modalImageLoaded: boolean;
  showModalImage: boolean;
  onThumbnailLoad: () => void;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({
  photo,
  apiUrl,
  imageQueryString,
  modalImageLoaded,
  showModalImage,
  onThumbnailLoad,
}) => {
  const thumbnailRef = useRef<HTMLImageElement>(null);
  const [photoWidth, setPhotoWidth] = useState<number | null>(null);
  const [photoHeight, setPhotoHeight] = useState<number | null>(null);

  // Check if thumbnail is already loaded (cached) and call handler immediately
  useEffect(() => {
    const img = thumbnailRef.current;
    if (img && img.complete && img.naturalHeight !== 0) {
      onThumbnailLoad();
    }
  }, [photo.id, onThumbnailLoad]);

  // Calculate photo dimensions based on aspect ratio
  useEffect(() => {
    const img = thumbnailRef.current;
    if (!img) return;

    const updatePhotoDimensions = () => {
      if (img.naturalWidth && img.naturalHeight) {
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        const container = img.parentElement;
        if (container) {
          const containerWidth = container.clientWidth;
          const containerHeight = container.clientHeight;
          
          // Calculate dimensions based on aspect ratio
          const widthBasedHeight = containerWidth / aspectRatio;
          const heightBasedWidth = containerHeight * aspectRatio;
          
          // Determine which constraint is hit first
          if (heightBasedWidth <= containerWidth) {
            // Height is the limiting factor
            setPhotoHeight(containerHeight);
            setPhotoWidth(heightBasedWidth);
          } else {
            // Width is the limiting factor
            setPhotoWidth(containerWidth);
            setPhotoHeight(widthBasedHeight);
          }
        }
      }
    };

    img.addEventListener('load', updatePhotoDimensions);
    window.addEventListener('resize', updatePhotoDimensions);

    // Initial calculation if already loaded
    if (img.complete && img.naturalHeight !== 0) {
      updatePhotoDimensions();
    }

    return () => {
      img.removeEventListener('load', updatePhotoDimensions);
      window.removeEventListener('resize', updatePhotoDimensions);
    };
  }, [photo.id]);

  return (
    <>
      {/* Thumbnail - shows first */}
      <img
        ref={thumbnailRef}
        onLoad={onThumbnailLoad}
        src={`${apiUrl}${photo.thumbnail}${imageQueryString}`}
        alt={`${photo.album} - ${photo.title}`}
        title={photo.title}
        style={{
          width: photoWidth ? `${photoWidth}px` : '100%',
          height: photoHeight ? `${photoHeight}px` : '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
      />

      {/* Modal optimized image - overlays on top when loaded */}
      {showModalImage && (
        <img
          src={`${apiUrl}${photo.modal}${imageQueryString}`}
          alt={`${photo.album} - ${photo.title}`}
          title={photo.title}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: photoWidth ? `${photoWidth}px` : '100%',
            height: photoHeight ? `${photoHeight}px` : '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            opacity: modalImageLoaded ? 1 : 0,
            pointerEvents: modalImageLoaded ? 'auto' : 'none',
            transition: 'opacity 0.3s ease',
          }}
        />
      )}
    </>
  );
};

export default ImageCanvas;

