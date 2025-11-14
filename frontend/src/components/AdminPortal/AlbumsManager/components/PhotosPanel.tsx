/**
 * PhotosPanel Component
 * Modal container for managing photos in a selected album
 * Orchestrates header controls and photo grid/list view
 */

import React, { useState } from 'react';
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
  activeId: string | null;
  isShuffling: boolean;
  localAlbums: any[];
  onClose: () => void;
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
  onPhotoDragStart: (event: any) => void;
  onPhotoDragEnd: (event: any) => void;
  onOpenEditModal: (photo: Photo) => void;
  onDeletePhoto: (filename: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  setActiveId: (id: string | null) => void;
  shuffleButtonRef: React.RefObject<HTMLButtonElement | null>;
}

const PhotosPanel: React.FC<PhotosPanelProps> = ({
  selectedAlbum,
  albumPhotos,
  uploadingImages,
  loadingPhotos,
  hasEverDragged,
  savingOrder,
  isDragging,
  activeId,
  isShuffling,
  localAlbums,
  onClose,
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
  onDragOver,
  onDragLeave,
  onDrop,
  shuffleButtonRef,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  return (
    <>
      <div 
        className="photos-modal-backdrop"
        onClick={onClose}
      />
      <div 
        className={`photos-modal ${isDragging ? 'drag-over' : ''}`}
        onDragOver={uploadingImages.length > 0 ? undefined : onDragOver}
        onDragLeave={uploadingImages.length > 0 ? undefined : onDragLeave}
        onDrop={uploadingImages.length > 0 ? undefined : onDrop}
      >
        <PhotosPanelHeader
          selectedAlbum={selectedAlbum}
          localAlbums={localAlbums}
          uploadingImages={uploadingImages}
          hasEverDragged={hasEverDragged}
          savingOrder={savingOrder}
          isShuffling={isShuffling}
          viewMode={viewMode}
          shuffleButtonRef={shuffleButtonRef}
          onClose={onClose}
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
        />

        <PhotosPanelGrid
          albumPhotos={albumPhotos}
          uploadingImages={uploadingImages}
          loadingPhotos={loadingPhotos}
          activeId={activeId}
          viewMode={viewMode}
          onPhotoDragStart={onPhotoDragStart}
          onPhotoDragEnd={onPhotoDragEnd}
          onOpenEditModal={onOpenEditModal}
          onDeletePhoto={onDeletePhoto}
        />
      </div>
    </>
  );
};

export default PhotosPanel;

