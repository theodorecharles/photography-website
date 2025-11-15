/**
 * Unified Photo Grid Item Component
 * Handles all photo states: queued, uploading, optimizing, generating-title, complete, error
 * Supports both uploading images and completed photos with drag-and-drop
 */

import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Photo, UploadingImage } from '../types';
import { cacheBustValue } from '../../../../config';
import { EditDocumentIcon, TrashIcon, HourglassIcon } from '../../../icons';

const API_URL = import.meta.env.VITE_API_URL || '';

interface PhotoGridItemProps {
  // For uploading images
  uploadingImage?: UploadingImage;
  uploadingIndex?: number;
  
  // For completed photos
  photo?: Photo;
  
  // Actions
  onEdit?: (photo: Photo) => void;
  onDelete?: (album: string, filename: string, title: string) => void;
  onRetryOptimization?: (album: string, filename: string) => void;
  onRetryAI?: (album: string, filename: string) => void;
  
  // State
  deletingPhotoId?: string | null;
  
  // Permissions
  canEdit: boolean;
}

const PhotoGridItem: React.FC<PhotoGridItemProps> = ({
  uploadingImage,
  uploadingIndex,
  photo,
  onEdit,
  onDelete,
  onRetryOptimization,
  onRetryAI,
  deletingPhotoId,
  canEdit,
}) => {
  const isUploading = !!uploadingImage && uploadingImage.state !== 'complete';
  const isComplete = !!photo || (uploadingImage?.state === 'complete' && uploadingImage.photo);
  
  // Get the actual photo data (either from photo prop or completed uploadingImage)
  const photoData = photo || uploadingImage?.photo;
  
  // Use either the photo ID or a unique uploading ID for sortable
  const itemId = photoData ? photoData.id : `uploading-${uploadingIndex}`;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: itemId, 
    disabled: !canEdit || isUploading 
  });

  const [showOverlay, setShowOverlay] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  // Show thumbnail by default if already complete (on mount), hide during flip animation
  const [showThumbnail, setShowThumbnail] = useState(isComplete);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);
  const prevStateRef = useRef<string | undefined>(undefined);
  const isInitialMount = useRef(true);
  
  // Trigger flip animation when state transitions to 'complete'
  useEffect(() => {
    const currentState = uploadingImage?.state;
    const prevState = prevStateRef.current;
    
    // Skip animation on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevStateRef.current = currentState;
      return;
    }
    
    // Update ref for next render
    prevStateRef.current = currentState;
    
    // Check if state just changed to 'complete' (and we're not on initial mount)
    if (currentState === 'complete' && prevState !== 'complete' && prevState !== undefined) {
      setIsFlipping(true);
      setShowThumbnail(false); // Hide thumbnail during first half of flip
      
      // Show thumbnail at 50% of animation (300ms) - the "reveal"
      const revealTimer = setTimeout(() => setShowThumbnail(true), 300);
      
      // End flip animation
      const endTimer = setTimeout(() => setIsFlipping(false), 600);
      
      return () => {
        clearTimeout(revealTimer);
        clearTimeout(endTimer);
      };
    }
  }, [uploadingImage?.state]);
  
  // Check if this photo is being deleted (for CRT animation)
  const isDeleting = photoData && deletingPhotoId === photoData.id;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isUploading) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    hasMoved.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isUploading || !touchStartPos.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
    
    if (deltaX > 5 || deltaY > 5) {
      hasMoved.current = true;
      setShowOverlay(false);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isUploading) return;
    
    if (touchStartPos.current && !hasMoved.current) {
      e.preventDefault();
      
      const target = e.target as HTMLElement;
      const clickedButton = target.closest('.btn-edit-photo, .btn-delete-photo, .btn-retry-photo');
      
      if (clickedButton) {
        // Tapped a button - let the button handler deal with it
      } else if (showOverlay) {
        setShowOverlay(false);
      } else {
        setShowOverlay(true);
      }
    }
    touchStartPos.current = null;
    hasMoved.current = false;
  };

  const handleTouchCancel = () => {
    touchStartPos.current = null;
    hasMoved.current = false;
    setShowOverlay(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (isUploading) return;
    const target = e.target as HTMLElement;
    if (!target.closest('.btn-edit-photo, .btn-delete-photo, .btn-retry-photo')) {
      setShowOverlay(false);
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  // Get filename for display
  const filename = photoData
    ? photoData.id.split('/').pop() || photoData.id
    : uploadingImage?.filename || '';

  // Get thumbnail URL
  const thumbnailUrl = photoData
    ? `${API_URL}${photoData.thumbnail}?i=${cacheBustValue}`
    : uploadingImage?.thumbnailUrl;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`admin-photo-item ${isDragging ? 'dragging' : ''} ${showOverlay ? 'show-overlay' : ''} ${isUploading ? 'uploading' : ''} ${isFlipping ? 'flip-complete' : ''} ${isDeleting ? 'crt-delete' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      {...(canEdit && !isUploading ? attributes : {})}
      {...(canEdit && !isUploading ? listeners : {})}
    >
      {/* Thumbnail or placeholder */}
      {isUploading || (isFlipping && !showThumbnail) ? (
        <div className="admin-photo-thumbnail uploading-placeholder"></div>
      ) : (
        <img
          src={thumbnailUrl}
          alt=""
          className="admin-photo-thumbnail"
        />
      )}

      {/* Uploading States */}
      {isUploading && uploadingImage && (
        <>
          {uploadingImage.state === 'queued' && (
            <div className="photo-state-overlay queued">
              <HourglassIcon width="32" height="32" style={{ opacity: 0.8 }} />
              <span className="state-text">Queued</span>
            </div>
          )}
          {uploadingImage.state === 'uploading' && (
            <div className="photo-state-overlay uploading">
              <div className="progress-circle">
                <svg className="progress-ring" width="60" height="60">
                  <circle
                    className="progress-ring-circle"
                    stroke="var(--primary-color)"
                    strokeWidth="4"
                    fill="transparent"
                    r="26"
                    cx="30"
                    cy="30"
                    style={{
                      strokeDasharray: `${2 * Math.PI * 26}`,
                      strokeDashoffset: `${2 * Math.PI * 26 * (1 - (uploadingImage.progress || 0) / 100)}`,
                    }}
                  />
                </svg>
                <div className="progress-percentage">{uploadingImage.progress || 0}%</div>
              </div>
              <span className="state-text">Uploading</span>
            </div>
          )}
          {uploadingImage.state === 'optimizing' && (
            <div className="photo-state-overlay optimizing">
              {(uploadingImage.optimizeProgress || 0) === 0 ? (
                // Show spinner when progress is 0 (waiting/processing)
                <div className="spinner"></div>
              ) : (
                // Show progress circle when we have actual progress
                <div className="progress-circle">
                  <svg className="progress-ring" width="60" height="60">
                    <circle
                      className="progress-ring-circle"
                      stroke="var(--primary-color)"
                      strokeWidth="4"
                      fill="transparent"
                      r="26"
                      cx="30"
                      cy="30"
                      style={{
                        strokeDasharray: `${2 * Math.PI * 26}`,
                        strokeDashoffset: `${2 * Math.PI * 26 * (1 - (uploadingImage.optimizeProgress || 0) / 100)}`,
                      }}
                    />
                  </svg>
                  <div className="progress-percentage">{uploadingImage.optimizeProgress}%</div>
                </div>
              )}
              <span className="state-text">Optimizing</span>
            </div>
          )}
          {uploadingImage.state === 'generating-title' && (
            <div className="photo-state-overlay generating-title">
              <div className="spinner"></div>
              <span className="state-text">Generating Title...</span>
            </div>
          )}
          {uploadingImage.state === 'error' && (
            <div className="photo-state-overlay error">
              <div className="state-icon">⚠️</div>
              <span className="state-text">Error</span>
              <span className="error-message">{uploadingImage.error}</span>
            </div>
          )}
        </>
      )}

      {/* Photo info section (shown in list view) */}
      <div className="photo-info">
        <div className="photo-filename">{filename}</div>
        {isComplete && photoData?.title && <div className="photo-title">{photoData.title}</div>}
      </div>

      {/* Error badges for completed photos */}
      {isComplete && photoData?.optimizationError && (
        <div className="photo-error-badge optimization-error" title={photoData.optimizationError}>
          ⚠️ Optimization Failed
        </div>
      )}
      {isComplete && photoData?.aiError && (
        <div className="photo-error-badge ai-error" title={photoData.aiError}>
          ⚠️ AI Failed
        </div>
      )}

      {/* Action overlay for completed photos */}
      {isComplete && canEdit && photoData && (
        <div className="photo-overlay" onClick={handleOverlayClick}>
          <div className="photo-actions">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (onEdit) onEdit(photoData);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (onEdit) onEdit(photoData);
              }}
              className="btn-edit-photo"
              title="Edit title"
              type="button"
            >
              <EditDocumentIcon width="16" height="16" />
            </button>
            {photoData.optimizationError && onRetryOptimization && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const filename = photoData.id.split('/').pop() || photoData.id;
                  onRetryOptimization(photoData.album, filename);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const filename = photoData.id.split('/').pop() || photoData.id;
                  onRetryOptimization(photoData.album, filename);
                }}
                className="btn-retry-photo"
                title="Retry optimization"
                type="button"
              >
                🔄
              </button>
            )}
            {photoData.aiError && onRetryAI && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const filename = photoData.id.split('/').pop() || photoData.id;
                  onRetryAI(photoData.album, filename);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const filename = photoData.id.split('/').pop() || photoData.id;
                  onRetryAI(photoData.album, filename);
                }}
                className="btn-retry-photo"
                title="Retry AI title generation"
                type="button"
              >
                🤖
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Extract filename from ID (format: "album/filename.jpg")
                const parts = photoData.id.split('/');
                const filename = parts.length > 1 ? parts[parts.length - 1] : parts[0];
                console.log('Delete photo:', { album: photoData.album, filename, id: photoData.id });
                if (onDelete) onDelete(photoData.album, decodeURIComponent(filename), photoData.title);
              }}
              className="btn-delete-photo"
              title="Delete photo"
            >
              <TrashIcon width="16" height="16" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGridItem;

