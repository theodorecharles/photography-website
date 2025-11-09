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
      {/* Thumbnail - shows first */}
      <img
        onLoad={onThumbnailLoad}
        src={`${apiUrl}${photo.thumbnail}${imageQueryString}`}
        alt={`${photo.album} photography by Ted Charles - ${photo.title}`}
        title={photo.title}
        style={{
          width: '100%',
          maxHeight: 'calc(100vh - 100px)',
          objectFit: 'contain',
        }}
      />

      {/* Modal optimized image - overlays on top when loaded */}
      {showModalImage && (
        <img
          src={`${apiUrl}${photo.src}${imageQueryString}`}
          alt={`${photo.album} photography by Ted Charles - ${photo.title}`}
          title={photo.title}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            maxHeight: 'calc(100vh - 100px)',
            objectFit: 'contain',
            opacity: modalImageLoaded ? 1 : 0,
            pointerEvents: modalImageLoaded ? 'auto' : 'none',
            transition: 'opacity 0.3s ease',
          }}
        />
      )}
    </div>
  );
};

export default ImageCanvas;

