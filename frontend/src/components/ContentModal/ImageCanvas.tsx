/**
 * Image Canvas Component
 * Displays the thumbnail instantly and fades in the optimized image once loaded
 */

import React, { useEffect, useRef } from 'react';
import { Photo } from './types';

interface ImageCanvasProps {
  photo: Photo;
  apiUrl: string;
  imageQueryString: string;
  modalImageLoaded: boolean;
  showModalImage: boolean;
  onThumbnailLoad: (img?: HTMLImageElement) => void;
  onModalLoad?: (img?: HTMLImageElement) => void;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({
  photo,
  apiUrl,
  imageQueryString,
  modalImageLoaded,
  showModalImage,
  onThumbnailLoad,
  onModalLoad,
}) => {
  const thumbnailRef = useRef<HTMLImageElement>(null);
  const modalRef = useRef<HTMLImageElement>(null);

  // Check if thumbnail is already loaded (cached) and call handler immediately
  useEffect(() => {
    const img = thumbnailRef.current;
    if (img && img.complete && img.naturalHeight !== 0) {
      onThumbnailLoad(img);
    }
  }, [photo.id, onThumbnailLoad]);

  // Check if modal image is already loaded (cached) and call handler immediately
  useEffect(() => {
    if (onModalLoad) {
      const img = modalRef.current;
      if (img && img.complete && img.naturalHeight !== 0) {
        onModalLoad(img);
      }
    }
  }, [photo.id, onModalLoad]);

  const handleThumbnailLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    onThumbnailLoad(e.currentTarget);
  };

  const handleModalLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (onModalLoad) {
      onModalLoad(e.currentTarget);
    }
  };

  return (
    <>
      {/* Thumbnail - shows first */}
      <img
        ref={thumbnailRef}
        onLoad={handleThumbnailLoad}
        src={`${apiUrl}${photo.thumbnail}${imageQueryString}`}
        alt={`${photo.album} - ${photo.title}`}
        title={photo.title}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
      />

      {/* Modal optimized image - overlays on top when loaded */}
      {showModalImage && (
        <img
          ref={modalRef}
          onLoad={handleModalLoad}
          src={`${apiUrl}${photo.modal}${imageQueryString}`}
          alt={`${photo.album} - ${photo.title}`}
          title={photo.title}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
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

