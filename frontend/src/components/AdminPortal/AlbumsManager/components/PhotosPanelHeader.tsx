/**
 * PhotosPanelHeader Component
 * Header controls for the photos panel including:
 * - Album title and close button
 * - Publish/unpublish toggle
 * - Preview and share buttons
 * - Upload and delete album buttons
 * - Photo reorder controls (shuffle, save, cancel)
 * - View mode toggle (grid/list)
 */

import React from 'react';
import { UploadIcon, TrashIcon, LinkIcon, ShuffleIcon } from '../../../icons';

type ViewMode = 'grid' | 'list';

interface PhotosPanelHeaderProps {
  selectedAlbum: string;
  localAlbums: any[];
  uploadingImages: any[];
  hasEverDragged: boolean;
  savingOrder: boolean;
  isShuffling: boolean;
  viewMode: ViewMode;
  shuffleButtonRef: React.RefObject<HTMLButtonElement | null>;
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
  onViewModeChange: (mode: ViewMode) => void;
  canEdit: boolean;
}

const PhotosPanelHeader: React.FC<PhotosPanelHeaderProps> = ({
  selectedAlbum,
  localAlbums,
  uploadingImages,
  hasEverDragged,
  savingOrder,
  isShuffling,
  viewMode,
  shuffleButtonRef,
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
  onViewModeChange,
  canEdit,
}) => {
  const currentAlbum = localAlbums.find(a => a.name === selectedAlbum);
  const isPublished = currentAlbum?.published !== false;
  const photoCount = currentAlbum?.photoCount || 0;

  return (
    <div className="photos-modal-header">
      {/* Title Bar */}
      <div className="photos-title-bar">
        <div className="photos-title-section">
          <h2 className="photos-modal-title">{selectedAlbum}</h2>
          <span className="photos-count">{photoCount} {photoCount === 1 ? 'photo' : 'photos'}</span>
        </div>
        <button onClick={onClose} className="photos-close-btn" title="Close">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 5L15 15M15 5L5 15" />
          </svg>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="photos-controls-bar">
        <div className="photos-controls-left">
          <label className="toggle-switch compact" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isPublished}
              onChange={() => onTogglePublished(selectedAlbum, isPublished)}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">
              {isPublished ? 'Published' : 'Unpublished'}
            </span>
          </label>

          {!isPublished && (
            <div className="photos-action-buttons">
              <button
                onClick={() => onPreviewAlbum(selectedAlbum)}
                className="photos-btn photos-btn-secondary"
                title="Preview album"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>Preview</span>
              </button>
              <button
                onClick={() => onShareAlbum(selectedAlbum)}
                className="photos-btn photos-btn-secondary"
                title="Generate shareable link"
              >
                <LinkIcon width="16" height="16" />
                <span>Share</span>
              </button>
            </div>
          )}
        </div>

        <div className="photos-controls-right">
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => onViewModeChange('grid')}
              title="Grid view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => onViewModeChange('list')}
              title="List view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>

          <label className="photos-btn photos-btn-primary">
            <UploadIcon width="16" height="16" />
            <span>{uploadingImages.length > 0 ? 'Uploading...' : 'Upload'}</span>
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
            className="photos-btn photos-btn-danger"
            title="Delete album"
          >
            <TrashIcon width="16" height="16" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Reorder Controls (shown when dragging) */}
      {hasEverDragged && (
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
              className={`photos-btn photos-btn-secondary ${isShuffling ? 'shuffling' : ''}`}
              disabled={savingOrder}
              title="Click to shuffle once, hold to shuffle continuously"
            >
              <ShuffleIcon width="16" height="16" />
              <span>Shuffle</span>
            </button>
            <span className="reorder-hint">Drag to reorder • Changes not saved</span>
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
        </div>
      )}
    </div>
  );
};

export default PhotosPanelHeader;

