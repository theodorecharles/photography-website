/**
 * PhotosPanelGrid Component
 * Displays the photo grid with:
 * - Uploading photos with progress states
 * - Sortable photos with drag-and-drop
 * - Loading state
 */

import React, { useRef, useLayoutEffect } from 'react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import PhotoGridItem from './PhotoGridItem';
import { Photo, UploadingImage } from '../types';
import { cacheBustValue } from '../../../../config';

const API_URL = import.meta.env.VITE_API_URL || '';

type ViewMode = 'grid' | 'list';

interface PhotosPanelGridProps {
  albumPhotos: Photo[];
  uploadingImages: UploadingImage[];
  loadingPhotos: boolean;
  activeId: string | null;
  viewMode: ViewMode;
  deletingPhotoId: string | null;
  onPhotoDragStart: (event: any, setActiveId?: (id: string | null) => void) => void;
  onPhotoDragEnd: (event: any, setActiveId?: (id: string | null) => void) => void;
  onOpenEditModal: (photo: Photo) => void;
  onDeletePhoto: (album: string, filename: string, photoTitle?: string) => void;
  onRetryOptimization?: (album: string, filename: string) => void;
  onRetryAI?: (album: string, filename: string) => void;
  setActiveId: (id: string | null) => void;
  canEdit: boolean;
}

const PhotosPanelGrid: React.FC<PhotosPanelGridProps> = ({
  albumPhotos,
  uploadingImages,
  loadingPhotos,
  canEdit,
  deletingPhotoId,
  activeId,
  viewMode,
  onPhotoDragStart,
  onPhotoDragEnd,
  onOpenEditModal,
  onDeletePhoto,
  onRetryOptimization,
  onRetryAI,
  setActiveId,
}) => {
  // Detect if device supports touch
  const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  
  // FLIP animation for smooth reflow on delete
  const gridRef = useRef<HTMLDivElement>(null);
  const firstPositionsRef = useRef<Map<string, DOMRect>>(new Map());
  const prevAlbumPhotosLengthRef = useRef(albumPhotos.length);
  
  // Single useLayoutEffect - captures First positions, then applies FLIP
  useLayoutEffect(() => {
    if (!gridRef.current) return;
    
    const currentLength = albumPhotos.length;
    const prevLength = prevAlbumPhotosLengthRef.current;
    
    // Photo was deleted (array got shorter)
    if (currentLength < prevLength && firstPositionsRef.current.size > 0) {
      // Array just changed - photos are now in new positions
      // Apply FLIP animation immediately (before browser paints)
      
      const items = gridRef.current.querySelectorAll('.admin-photo-item:not(.crt-delete)');
      
      items.forEach((item) => {
        const id = (item as HTMLElement).dataset.photoId;
        if (!id) return;
        
        const first = firstPositionsRef.current.get(id);
        if (!first) return;
        
        const last = item.getBoundingClientRect();
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;
        
        // Only animate if position changed significantly
        if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
          const element = item as HTMLElement;
          
          // Invert: instantly move back to old position
          element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
          element.style.transition = 'none';
          
          // Force reflow
          element.offsetHeight;
          
          // Play: animate to new position
          requestAnimationFrame(() => {
            element.style.transform = '';
            element.style.transition = 'transform 200ms ease';
            
            // Cleanup
            setTimeout(() => {
              element.style.transform = '';
              element.style.transition = '';
            }, 210);
          });
        }
      });
      
      // Clear stored positions
      firstPositionsRef.current.clear();
    }
    // Capture "First" positions when deletion starts (deletingPhotoId set)
    else if (deletingPhotoId && firstPositionsRef.current.size === 0) {
      const items = gridRef.current.querySelectorAll('.admin-photo-item:not(.crt-delete)');
      items.forEach((item) => {
        const id = (item as HTMLElement).dataset.photoId;
        if (id && id !== deletingPhotoId) {
          firstPositionsRef.current.set(id, item.getBoundingClientRect());
        }
      });
    }
    
    prevAlbumPhotosLengthRef.current = currentLength;
  }, [albumPhotos, deletingPhotoId]);
  
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

  // Check if any uploads are in progress (not complete)
  const hasActiveUploads = uploadingImages.some(img => img.state !== 'complete');
  
  // Combine item IDs for sortable context
  const allItemIds = [
    ...uploadingImages.map((img) => img.photo?.id || `uploading-${uploadingImages.indexOf(img)}`),
    ...albumPhotos.filter(p => p && p.id).map(p => p.id)
  ];

  return (
    <div className="photos-modal-content">
      <DndContext
        sensors={photoSensors}
        collisionDetection={closestCenter}
        onDragStart={(event) => onPhotoDragStart(event, setActiveId)}
        onDragEnd={(event) => onPhotoDragEnd(event, setActiveId)}
      >
        <div ref={gridRef} className={viewMode === 'grid' ? 'photos-grid' : 'photos-list'}>
          <SortableContext items={allItemIds} strategy={rectSortingStrategy}>
            {/* Uploading images (includes those transitioning to complete) */}
            {uploadingImages.map((img, index) => (
              <PhotoGridItem
                key={img.photo?.id || `uploading-${index}`}
                uploadingImage={img}
                uploadingIndex={index}
                onEdit={onOpenEditModal}
                onDelete={onDeletePhoto}
                onRetryOptimization={onRetryOptimization}
                onRetryAI={onRetryAI}
                deletingPhotoId={deletingPhotoId}
                canEdit={canEdit && !hasActiveUploads}
              />
            ))}
            
            {/* Existing album photos (already in album before upload) */}
            {albumPhotos.filter(photo => photo && photo.id).map((photo) => (
              <PhotoGridItem
                key={photo.id}
                photo={photo}
                onEdit={onOpenEditModal}
                onDelete={onDeletePhoto}
                onRetryOptimization={onRetryOptimization}
                onRetryAI={onRetryAI}
                deletingPhotoId={deletingPhotoId}
                canEdit={canEdit && !hasActiveUploads}
              />
            ))}
          </SortableContext>
        </div>
        <DragOverlay>
          {activeId ? (
            <div className="admin-photo-item dragging" style={{ cursor: 'grabbing' }}>
              <img
                src={`${API_URL}${
                  [...uploadingImages.map(img => img.photo), ...albumPhotos]
                    .filter(p => p)
                    .find(p => p!.id === activeId)
                    ?.thumbnail
                }?i=${cacheBustValue}`}
                alt=""
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

