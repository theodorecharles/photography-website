/**
 * Image Canvas Component
 * Displays the thumbnail instantly and fades in the optimized image once loaded
 */

import React from 'react';
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
  return (
    <div className="modal-image-container">
      {/* Modal optimized image - overlays on top when loaded */}
      {showModalImage && (
        <img
          src={`${apiUrl}${photo.src}${imageQueryString}`}
          alt={`${photo.album} photography by Ted Charles - ${photo.title}`}
          title={photo.title}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            maxWidth: 'calc(100vw - 30px)',
            maxHeight: 'calc(100vh - 100px)',
            objectFit: 'contain',
            opacity: modalImageLoaded ? 1 : 0,
            pointerEvents: modalImageLoaded ? 'auto' : 'none',
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Thumbnail - shows first */}
      <img
        onLoad={onThumbnailLoad}
        src={`${apiUrl}${photo.thumbnail}${imageQueryString}`}
        alt={`${photo.album} photography by Ted Charles - ${photo.title}`}
        title={photo.title}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: 'calc(100vw - 30px)',
          maxHeight: 'calc(100vh - 100px)',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
};

export default ImageCanvas;

