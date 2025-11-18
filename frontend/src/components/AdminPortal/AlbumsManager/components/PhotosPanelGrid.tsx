/**
 * PhotosPanelGrid Component
 * Displays the photo grid with:
 * - Uploading photos with progress states
 * - Sortable photos with drag-and-drop
 * - Loading state
 */

import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { API_URL } from '../../../../config';
import { DndContext, DragOverlay, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import PhotoGridItem from './PhotoGridItem';
import { PhotoListItem } from './PhotoListItem';
import { Photo, UploadingImage } from '../types';
import { cacheBustValue } from '../../../../config';


type ViewMode = 'grid' | 'list';

interface PhotosPanelGridProps {
  albumPhotos: Photo[];
  uploadingImages: UploadingImage[];
  loadingPhotos: boolean;
  activeId: string | null;
  viewMode: ViewMode;
  deletingPhotoId: string | null;
  selectedAlbum: string;
  onPhotoDragStart: (event: any, setActiveId?: (id: string | null) => void) => void;
  onPhotoDragEnd: (event: any, setActiveId?: (id: string | null) => void) => void;
  onOpenEditModal: (photo: Photo) => void;
  onDeletePhoto: (album: string, filename: string, photoTitle?: string, thumbnail?: string) => void;
  onRetryOptimization?: (album: string, filename: string) => void;
  onRetryAI?: (album: string, filename: string) => void;
  onRetryUpload?: (filename: string, albumName: string) => void;
  setActiveId: (id: string | null) => void;
  canEdit: boolean;
}

const PhotosPanelGrid: React.FC<PhotosPanelGridProps> = ({
  albumPhotos,
  uploadingImages,
  loadingPhotos,
  canEdit,
  deletingPhotoId,
  selectedAlbum,
  activeId,
  viewMode,
  onPhotoDragStart,
  onPhotoDragEnd,
  onOpenEditModal,
  onDeletePhoto,
  onRetryOptimization,
  onRetryAI,
  onRetryUpload,
  setActiveId,
}) => {
  // Detect if device supports touch
  const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  
  // Track which photo has its overlay visible (only one at a time)
  const [activeOverlayId, setActiveOverlayId] = React.useState<string | null>(null);
  
  // Auto-scroll state
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPointerY = useRef<number>(0);
  const lastPointerX = useRef<number>(0);
  
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
  
  // Track pointer position globally during drag
  useEffect(() => {
    if (!isDraggingActive) return;

    const updatePointerPosition = (e: PointerEvent | TouchEvent) => {
      if ('clientY' in e) {
        lastPointerY.current = e.clientY;
        lastPointerX.current = e.clientX;
      } else if ('touches' in e && e.touches.length > 0) {
        lastPointerY.current = e.touches[0].clientY;
        lastPointerX.current = e.touches[0].clientX;
      }
    };

    window.addEventListener('pointermove', updatePointerPosition as any);
    window.addEventListener('touchmove', updatePointerPosition as any, { passive: true });

    return () => {
      window.removeEventListener('pointermove', updatePointerPosition as any);
      window.removeEventListener('touchmove', updatePointerPosition as any);
    };
  }, [isDraggingActive]);

  // Auto-scroll when dragging near edges
  useEffect(() => {
    if (!isDraggingActive) {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      return;
    }

    const checkAndScroll = () => {
      const modalContent = document.querySelector('.photos-modal-content') as HTMLElement;
      if (!modalContent) return;

      const pointerY = lastPointerY.current;
      const rect = modalContent.getBoundingClientRect();
      const scrollThreshold = 100; // Distance from edge to trigger scroll
      const scrollSpeed = 15; // Pixels to scroll per frame

      // Calculate distance from top and bottom
      const distanceFromTop = pointerY - rect.top;
      const distanceFromBottom = rect.bottom - pointerY;

      // Scroll up if near top
      if (distanceFromTop < scrollThreshold && distanceFromTop > 0) {
        const scrollAmount = Math.max(1, scrollSpeed * (1 - distanceFromTop / scrollThreshold));
        modalContent.scrollTop -= scrollAmount;
      }
      // Scroll down if near bottom
      else if (distanceFromBottom < scrollThreshold && distanceFromBottom > 0) {
        const scrollAmount = Math.max(1, scrollSpeed * (1 - distanceFromBottom / scrollThreshold));
        modalContent.scrollTop += scrollAmount;
      }
    };

    // Start scroll interval
    scrollIntervalRef.current = setInterval(checkAndScroll, 16); // ~60fps

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, [isDraggingActive]);
  
  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setIsDraggingActive(true);
    onPhotoDragStart(event, setActiveId);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    setIsDraggingActive(false);
    onPhotoDragEnd(event, setActiveId);
  };
  
  // Configure dnd-kit sensors for photos
  // Desktop: minimal delay for instant drag, mobile: longer delay to differentiate tap vs drag
  const photoSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isTouchDevice ? {
        delay: 250, // Mobile: require 250ms hold before drag starts
        tolerance: 50, // Mobile: allow 50px movement during delay to enable scrolling
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

  // Check if any uploads are in progress (not complete or error)
  // Error state should not prevent retry button from showing
  const hasActiveUploads = uploadingImages.some(img => 
    img.state === 'queued' || 
    img.state === 'uploading' || 
    img.state === 'optimizing' || 
    img.state === 'generating-title'
  );
  
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
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {viewMode === 'grid' ? (
          <div ref={gridRef} className="photos-grid">
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
                  onRetryUpload={onRetryUpload}
                  selectedAlbum={selectedAlbum}
                  deletingPhotoId={deletingPhotoId}
                  canEdit={img.state === 'error' ? canEdit : (canEdit && !hasActiveUploads)}
                  activeOverlayId={activeOverlayId}
                  setActiveOverlayId={setActiveOverlayId}
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
                  activeOverlayId={activeOverlayId}
                  setActiveOverlayId={setActiveOverlayId}
                />
              ))}
            </SortableContext>
          </div>
        ) : (
          <div ref={gridRef} className="photos-list">
            <SortableContext items={allItemIds} strategy={rectSortingStrategy}>
              {/* Uploading images (includes those transitioning to complete) */}
              {uploadingImages.map((img, index) => (
                <PhotoListItem
                  key={img.photo?.id || `uploading-${index}`}
                  uploadingImage={img}
                  uploadingIndex={index}
                  onEdit={onOpenEditModal}
                  onDelete={onDeletePhoto}
                  deletingPhotoId={deletingPhotoId}
                  canEdit={canEdit && !hasActiveUploads}
                />
              ))}
              
              {/* Existing album photos (already in album before upload) */}
              {albumPhotos.filter(photo => photo && photo.id).map((photo) => (
                <PhotoListItem
                  key={photo.id}
                  photo={photo}
                  onEdit={onOpenEditModal}
                  onDelete={onDeletePhoto}
                  deletingPhotoId={deletingPhotoId}
                  canEdit={canEdit && !hasActiveUploads}
                />
              ))}
            </SortableContext>
          </div>
        )}
        <DragOverlay dropAnimation={null}>
          {activeId ? (
            <div style={{ 
              width: '120px',
              height: '120px',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              cursor: 'grabbing',
              opacity: 0.9,
              transform: 'translate(0%, -50%)',
            }}>
              <img
                src={`${API_URL}${
                  [...uploadingImages.map(img => img.photo), ...albumPhotos]
                    .filter(p => p)
                    .find(p => p!.id === activeId)
                    ?.thumbnail
                }?i=${cacheBustValue}`}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default PhotosPanelGrid;

