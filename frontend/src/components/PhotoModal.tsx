import React from 'react';

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
  isFullscreen: boolean;
  showInfo: boolean;
  exifData: ExifData | null;
  loadingExif: boolean;
  copiedLink: boolean;
  showNavigationHint: boolean;
  thumbnailLoaded: boolean;
  modalImageLoaded: boolean;
  showModalImage: boolean;
  imageQueryString: string;
  onClose: () => void;
  onToggleFullscreen: () => void;
  onToggleInfo: () => void;
  onCopyLink: (photo: Photo) => void;
  onDownload: (photo: Photo) => Promise<void>;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onThumbnailLoad: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onModalClick: (e: React.MouseEvent) => void;
}

const PhotoModal: React.FC<PhotoModalProps> = ({
  selectedPhoto,
  photos,
  isFullscreen,
  showInfo,
  exifData,
  loadingExif,
  copiedLink,
  showNavigationHint,
  thumbnailLoaded,
  modalImageLoaded,
  showModalImage,
  imageQueryString,
  onClose,
  onToggleFullscreen,
  onToggleInfo,
  onCopyLink,
  onDownload,
  onNavigatePrev,
  onNavigateNext,
  onThumbnailLoad,
  onTouchStart,
  onTouchEnd,
  onModalClick,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={`modal ${isFullscreen ? 'fullscreen' : ''}`} onClick={onClose}>
      {(() => {
        console.log('[PERF] Modal rendering, selectedPhoto.id:', selectedPhoto.id, performance.now());
        return null;
      })()}
      <div
        key={selectedPhoto.id}
        className="modal-content"
        onClick={onModalClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="modal-container">
          {/* Top controls: info, copy, download, fullscreen, close */}
          <div
            className="modal-controls-top"
            style={{ opacity: thumbnailLoaded ? 1 : 0 }}
          >
            <button
              onClick={onToggleInfo}
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
                onCopyLink(selectedPhoto);
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
                onDownload(selectedPhoto);
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
                onToggleFullscreen();
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
                onClose();
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
                onThumbnailLoad();
              }}
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
              <button onClick={onNavigatePrev}>
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
              <button onClick={onNavigateNext}>
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

