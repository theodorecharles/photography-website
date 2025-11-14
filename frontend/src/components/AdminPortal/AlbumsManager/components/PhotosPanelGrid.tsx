/**
 * PhotosPanelGrid Component
 * Displays the photo grid with:
 * - Uploading photos with progress states
 * - Sortable photos with drag-and-drop
 * - Loading state
 */

import React from 'react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import SortablePhotoItem from './SortablePhotoItem';
import { Photo, UploadingImage } from '../types';
import { cacheBustValue } from '../../../../config';
import { HourglassIcon } from '../../../icons';

const API_URL = import.meta.env.VITE_API_URL || '';

type ViewMode = 'grid' | 'list';

interface PhotosPanelGridProps {
  albumPhotos: Photo[];
  uploadingImages: UploadingImage[];
  loadingPhotos: boolean;
  activeId: string | null;
  viewMode: ViewMode;
  onPhotoDragStart: (event: any) => void;
  onPhotoDragEnd: (event: any) => void;
  onOpenEditModal: (photo: Photo) => void;
  onDeletePhoto: (filename: string) => void;
  canEdit: boolean;
}

const PhotosPanelGrid: React.FC<PhotosPanelGridProps> = ({
  albumPhotos,
  uploadingImages,
  loadingPhotos,
  canEdit,
  activeId,
  viewMode,
  onPhotoDragStart,
  onPhotoDragEnd,
  onOpenEditModal,
  onDeletePhoto,
}) => {
  // Detect if device supports touch
  const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  
  // Configure dnd-kit sensors for photos
  // Desktop: minimal delay for instant drag, mobile: longer delay to differentiate tap vs drag
  const photoSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isTouchDevice ? {
        delay: 300, // Mobile: require 300ms hold before drag starts
        tolerance: 8, // Mobile: allow 8px movement during the delay
      } : {
        distance: 5, // Desktop: require 5px movement to start drag (prevents accidental drags on click)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (loadingPhotos) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading photos...</p>
      </div>
    );
  }

  return (
    <div className="photos-modal-content">
      <DndContext
        sensors={photoSensors}
        collisionDetection={closestCenter}
        onDragStart={onPhotoDragStart}
        onDragEnd={onPhotoDragEnd}
      >
        <div className={viewMode === 'grid' ? 'photos-grid' : 'photos-list'}>
        {uploadingImages.map((img, index) => (
          <div key={`uploading-${index}`} className="admin-photo-item uploading">
            <img src={img.thumbnailUrl} alt={img.filename} className="admin-photo-thumbnail" />
            {img.state === 'queued' && (
              <div className="photo-state-overlay queued">
                <HourglassIcon width="32" height="32" style={{ opacity: 0.8 }} />
                <span className="state-text">Queued</span>
              </div>
            )}
            {img.state === 'uploading' && (
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
                        strokeDashoffset: `${2 * Math.PI * 26 * (1 - (img.progress || 0) / 100)}`,
                      }}
                    />
                  </svg>
                  <div className="progress-percentage">{img.progress || 0}%</div>
                </div>
                <span className="state-text">Uploading</span>
              </div>
            )}
            {img.state === 'optimizing' && (
              <div className="photo-state-overlay optimizing">
                <div className="spinner"></div>
                <span className="state-text">Optimizing...</span>
                {typeof img.optimizeProgress === 'number' && (
                  <span className="state-subtext">{img.optimizeProgress}%</span>
                )}
              </div>
            )}
            {img.state === 'generating-title' && (
              <div className="photo-state-overlay generating-title">
                <div className="spinner"></div>
                <span className="state-text">Generating Title...</span>
              </div>
            )}
            {img.state === 'complete' && (
              <>
                <img
                  src={img.thumbnailUrl}
                  alt={img.filename}
                  className="admin-photo-thumbnail"
                />
                <div className="photo-complete-badge">✓</div>
              </>
            )}
            {img.state === 'error' && (
              <div className="photo-state-overlay error">
                <div className="state-icon">⚠️</div>
                <span className="state-text">Error</span>
                <span className="error-message">{img.error}</span>
              </div>
            )}
            <div className="photo-filename">{img.filename}</div>
          </div>
        ))}
        
        <SortableContext items={albumPhotos.map(p => p.id)} strategy={rectSortingStrategy}>
          {albumPhotos.map((photo) => (
            <SortablePhotoItem
              key={photo.id}
              photo={photo}
              onEdit={onOpenEditModal}
              onDelete={onDeletePhoto}
              canEdit={canEdit}
            />
          ))}
        </SortableContext>
      </div>
      <DragOverlay>
        {activeId ? (
          <div className="admin-photo-item dragging" style={{ cursor: 'grabbing' }}>
            <img
              src={`${API_URL}${albumPhotos.find(p => p.id === activeId)?.thumbnail}?i=${cacheBustValue}`}
              alt="Dragging"
              className="admin-photo-thumbnail"
            />
          </div>
        ) : null}
      </DragOverlay>
      </DndContext>
    </div>
  );
};

export default PhotosPanelGrid;

