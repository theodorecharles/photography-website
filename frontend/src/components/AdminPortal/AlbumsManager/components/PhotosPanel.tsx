/**
 * PhotosPanel Component
 * Displays and manages photos for the selected album
 * Handles upload, delete, reorder, and editing
 */

import React from 'react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import SortablePhotoItem from './SortablePhotoItem';
import { Photo, UploadingImage } from '../types';
import { cacheBustValue } from '../../../../config';
import { UploadIcon, TrashIcon, LinkIcon, ShuffleIcon, HourglassIcon } from '../../../icons';

const API_URL = import.meta.env.VITE_API_URL || '';

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
  // setActiveId, // unused for now
  shuffleButtonRef,
}) => {
  const photoSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <>
      <div 
        className="album-photos-backdrop"
        onClick={onClose}
      />
      <div 
        className={`album-photos ${isDragging ? 'drag-over' : ''}`}
        onDragOver={uploadingImages.length > 0 ? undefined : onDragOver}
        onDragLeave={uploadingImages.length > 0 ? undefined : onDragLeave}
        onDrop={uploadingImages.length > 0 ? undefined : onDrop}
      >
        <div className="photos-header">
          <div className="photos-header-top">
            <h3 className="photos-panel-title">{selectedAlbum}</h3>
            <button onClick={onClose} className="photos-panel-close-btn" title="Close">×</button>
          </div>
          <div className="album-actions-grid">
            <label className="btn-action btn-upload btn-action-item">
              <UploadIcon width="16" height="16" />
              <span className="btn-text">{uploadingImages.length > 0 ? 'Uploading...' : 'Upload Photos'}</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={onUploadPhotos}
                disabled={uploadingImages.length > 0}
                style={{ display: 'none' }}
              />
            </label>
            
            <button
              onClick={() => onDeleteAlbum(selectedAlbum)}
              className="btn-action btn-delete btn-action-item"
              title="Delete album"
            >
              <TrashIcon width="16" height="16" />
              <span className="btn-text">Delete Album</span>
            </button>
            
            {!localAlbums.find(a => a.name === selectedAlbum)?.published && (
              <button
                onClick={() => onShareAlbum(selectedAlbum)}
                className="btn-action btn-generate-link btn-action-item"
                title="Generate link for album"
              >
                <LinkIcon width="16" height="16" />
                <span className="btn-text">Share Link</span>
              </button>
            )}
          </div>

          {hasEverDragged && (
            <div className="photo-order-controls">
              <div className="photo-order-controls-group">
                <button
                  ref={shuffleButtonRef}
                  onClick={onShufflePhotos}
                  onMouseDown={onShuffleStart}
                  onMouseUp={onShuffleEnd}
                  onMouseLeave={onShuffleEnd}
                  onTouchStart={onShuffleStart}
                  onTouchEnd={onShuffleEnd}
                  className={`btn-shuffle ${isShuffling ? 'shuffling' : ''}`}
                  disabled={savingOrder}
                  title="Click to shuffle once, hold to shuffle continuously"
                >
                  <ShuffleIcon width="16" height="16" />
                  Shuffle
                </button>
                <span className="order-hint">Drag photos to reorder</span>
              </div>
              <div className="photo-order-actions">
                <button onClick={onCancelPhotoOrder} className="btn-cancel" disabled={savingOrder}>
                  Cancel
                </button>
                <button onClick={onSavePhotoOrder} className="btn-save" disabled={savingOrder}>
                  {savingOrder ? 'Saving...' : 'Save Order'}
                </button>
              </div>
            </div>
          )}
        </div>

        {loadingPhotos ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading photos...</p>
          </div>
        ) : (
          <DndContext
            sensors={photoSensors}
            collisionDetection={closestCenter}
            onDragStart={onPhotoDragStart}
            onDragEnd={onPhotoDragEnd}
          >
            <div className="photos-grid">
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
        )}
      </div>
    </>
  );
};

export default PhotosPanel;

