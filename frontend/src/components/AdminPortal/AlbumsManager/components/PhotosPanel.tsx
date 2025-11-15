/**
 * PhotosPanel Component
 * Modal container for managing photos in a selected album
 * Orchestrates header controls and photo grid/list view
 */

import React, { useState, useEffect } from 'react';
import PhotosPanelHeader from './PhotosPanelHeader';
import PhotosPanelGrid from './PhotosPanelGrid';
import { Photo, UploadingImage } from '../types';
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
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [photoActiveId, setPhotoActiveId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

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
    // Save current overflow state
    const originalOverflow = document.body.style.overflow;
    
    // Lock scrolling
    document.body.style.overflow = 'hidden';
    
    // Register close handler so album deletion can trigger animation
    setCloseHandler(() => handleClose);
    
    // Restore on unmount
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [setCloseHandler]);

  return (
    <>
      <div className="photos-modal-backdrop" onClick={handleClose} />
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
          hasEverDragged={hasEverDragged}
          savingOrder={savingOrder}
          isShuffling={isShuffling}
          viewMode={viewMode}
          shuffleButtonRef={shuffleButtonRef}
          onClose={handleClose}
          onUploadPhotos={onUploadPhotos}
          onDeleteAlbum={onDeleteAlbum}
          onShareAlbum={onShareAlbum}
          onTogglePublished={onTogglePublished}
          onPreviewAlbum={onPreviewAlbum}
          onSavePhotoOrder={onSavePhotoOrder}
          onCancelPhotoOrder={onCancelPhotoOrder}
          onShufflePhotos={onShufflePhotos}
          onShuffleStart={onShuffleStart}
          onShuffleEnd={onShuffleEnd}
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
      </div>
    </>
  );
};

export default PhotosPanel;

