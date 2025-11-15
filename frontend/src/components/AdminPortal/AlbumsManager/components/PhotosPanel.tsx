/**
 * PhotosPanel Component
 * Modal container for managing photos in a selected album
 * Orchestrates header controls and photo grid/list view
 */

import React, { useState, useEffect } from 'react';
import PhotosPanelHeader from './PhotosPanelHeader';
import PhotosPanelGrid from './PhotosPanelGrid';
import { Photo, UploadingImage } from '../types';
import { ShuffleIcon } from '../../../icons';
import '../../PhotosModal.css';

type ViewMode = 'grid' | 'list';

interface PhotosPanelProps {
  selectedAlbum: string;
  albumPhotos: Photo[];
  uploadingImages: UploadingImage[];
  loadingPhotos: boolean;
  hasEverDragged: boolean;
  savingOrder: boolean;
  isDragging: boolean;
  isShuffling: boolean;
  localAlbums: any[];
  deletingPhotoId: string | null;
  onClose: () => void;
  setCloseHandler: (handler: () => void) => void;
  onUploadPhotos: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteAlbum: (albumName: string) => void;
  onShareAlbum: (albumName: string) => void;
  onTogglePublished: (albumName: string, currentPublished: boolean) => void;
  onPreviewAlbum: (albumName: string) => void;
  onSavePhotoOrder: () => void;
  onCancelPhotoOrder: () => void;
  onShufflePhotos: () => void;
  onShuffleStart: () => void;
  onShuffleEnd: () => void;
  onPhotoDragStart: (event: any, setActiveId?: (id: string | null) => void) => void;
  onPhotoDragEnd: (event: any, setActiveId?: (id: string | null) => void) => void;
  onOpenEditModal: (photo: Photo) => void;
  onDeletePhoto: (album: string, filename: string, photoTitle?: string) => void;
  onRetryOptimization?: (album: string, filename: string) => void;
  onRetryAI?: (album: string, filename: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  shuffleButtonRef: React.RefObject<HTMLButtonElement | null>;
  canEdit: boolean;
}

const PhotosPanel: React.FC<PhotosPanelProps> = ({
  selectedAlbum,
  albumPhotos,
  uploadingImages,
  loadingPhotos,
  deletingPhotoId,
  hasEverDragged,
  savingOrder,
  isDragging,
  isShuffling,
  localAlbums,
  onClose,
  setCloseHandler,
  onUploadPhotos,
  onDeleteAlbum,
  onShareAlbum,
  onTogglePublished,
  onPreviewAlbum,
  onSavePhotoOrder,
  onCancelPhotoOrder,
  onShufflePhotos,
  onShuffleStart,
  onShuffleEnd,
  onPhotoDragStart,
  onPhotoDragEnd,
  onOpenEditModal,
  onDeletePhoto,
  onRetryOptimization,
  onRetryAI,
  onDragOver,
  onDragLeave,
  onDrop,
  shuffleButtonRef,
  canEdit,
}) => {
  // Initialize viewMode from localStorage, default to 'grid'
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('photosViewMode');
    return (saved === 'list' || saved === 'grid') ? saved : 'grid';
  });
  const [photoActiveId, setPhotoActiveId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Save viewMode preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('photosViewMode', viewMode);
  }, [viewMode]);

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      onClose();
    }, 300); // Match the flipDown animation duration
  };

  // Lock body scrolling when PhotosPanel is open and register close handler
  useEffect(() => {
    // Save current overflow states
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyWidth = document.body.style.width;
    const scrollY = window.scrollY;
    
    // Lock scrolling on body
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    
    // Also lock scrolling on admin-container if it exists
    const adminContainer = document.querySelector('.admin-container') as HTMLElement;
    const originalContainerOverflow = adminContainer?.style.overflow;
    if (adminContainer) {
      adminContainer.style.overflow = 'hidden';
    }
    
    // Register close handler so album deletion can trigger animation
    setCloseHandler(() => handleClose);
    
    // Restore on unmount
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.width = originalBodyWidth;
      window.scrollTo(0, scrollY);
      
      if (adminContainer && originalContainerOverflow !== undefined) {
        adminContainer.style.overflow = originalContainerOverflow;
      }
    };
  }, [setCloseHandler]);

  return (
    <>
      <div className={`photos-modal-backdrop ${isClosing ? 'closing' : ''}`} onClick={handleClose} />
      <div 
        className={`photos-modal ${isDragging ? 'drag-over' : ''} ${isClosing ? 'closing' : ''} ${hasEverDragged ? 'has-reorder-bar' : ''}`}
        onDragOver={uploadingImages.length > 0 ? undefined : onDragOver}
        onDragLeave={uploadingImages.length > 0 ? undefined : onDragLeave}
        onDrop={uploadingImages.length > 0 ? undefined : onDrop}
      >
          <PhotosPanelHeader
          selectedAlbum={selectedAlbum}
          localAlbums={localAlbums}
          albumPhotos={albumPhotos}
          uploadingImages={uploadingImages}
          viewMode={viewMode}
          onClose={handleClose}
          onUploadPhotos={onUploadPhotos}
          onDeleteAlbum={onDeleteAlbum}
          onShareAlbum={onShareAlbum}
          onTogglePublished={onTogglePublished}
          onPreviewAlbum={onPreviewAlbum}
          onViewModeChange={setViewMode}
          canEdit={canEdit}
        />

        <PhotosPanelGrid
          albumPhotos={albumPhotos}
          uploadingImages={uploadingImages}
          loadingPhotos={loadingPhotos}
          activeId={photoActiveId}
          viewMode={viewMode}
          deletingPhotoId={deletingPhotoId}
          onPhotoDragStart={onPhotoDragStart}
          onPhotoDragEnd={onPhotoDragEnd}
          onOpenEditModal={onOpenEditModal}
          onDeletePhoto={onDeletePhoto}
          onRetryOptimization={onRetryOptimization}
          onRetryAI={onRetryAI}
          setActiveId={setPhotoActiveId}
          canEdit={canEdit}
        />

        {/* Reorder Controls (shown when dragging) - Now part of modal layout */}
        {hasEverDragged && canEdit && (
          <div className="photos-reorder-bar">
            <div className="photos-reorder-left">
              <button
                ref={shuffleButtonRef}
                onClick={onShufflePhotos}
                onMouseDown={onShuffleStart}
                onMouseUp={onShuffleEnd}
                onMouseLeave={onShuffleEnd}
                onTouchStart={onShuffleStart}
                onTouchEnd={onShuffleEnd}
                onTouchCancel={onShuffleEnd}
                className={`photos-btn btn-shuffle-order ${isShuffling ? 'shuffling-active' : ''}`}
                disabled={savingOrder}
                title="Click to shuffle once, hold to shuffle continuously"
              >
                <ShuffleIcon width="16" height="16" />
                <span>Shuffle</span>
              </button>
              <span className="reorder-hint reorder-hint-desktop">Drag to reorder • Changes not saved</span>
            </div>
            <div className="photos-reorder-right">
              <button 
                onClick={onCancelPhotoOrder} 
                className="photos-btn photos-btn-ghost" 
                disabled={savingOrder}
              >
                Cancel
              </button>
              <button 
                onClick={onSavePhotoOrder} 
                className="photos-btn photos-btn-success" 
                disabled={savingOrder}
              >
                {savingOrder ? 'Saving...' : 'Save Order'}
              </button>
            </div>
            <span className="reorder-hint reorder-hint-mobile">Drag to reorder • Changes not saved</span>
          </div>
        )}
      </div>
    </>
  );
};

export default PhotosPanel;

