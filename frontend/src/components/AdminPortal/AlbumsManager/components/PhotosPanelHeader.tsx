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
import { UploadIcon, TrashIcon, LinkIcon, CloseIcon, EyeIcon, GridViewIcon, ListViewIcon } from '../../../icons';

type ViewMode = 'grid' | 'list';

interface PhotosPanelHeaderProps {
  selectedAlbum: string;
  localAlbums: any[];
  localFolders: any[];
  albumPhotos: any[];
  uploadingImages: any[];
  viewMode: ViewMode;
  onClose: () => void;
  onUploadPhotos: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteAlbum: (albumName: string) => void;
  onShareAlbum: (albumName: string) => void;
  onTogglePublished: (albumName: string, currentPublished: boolean) => void;
  onPreviewAlbum: (albumName: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  canEdit: boolean;
}

const PhotosPanelHeader: React.FC<PhotosPanelHeaderProps> = ({
  selectedAlbum,
  localAlbums,
  localFolders: _localFolders,
  albumPhotos,
  uploadingImages,
  viewMode,
  onClose,
  onUploadPhotos,
  onDeleteAlbum,
  onShareAlbum,
  onTogglePublished,
  onPreviewAlbum,
  onViewModeChange,
  canEdit,
}) => {
  const currentAlbum = localAlbums.find(a => a.name === selectedAlbum);
  const isPublished = currentAlbum?.published !== false;
  
  // Count completed uploads (optimization + AI done)
  const completedUploads = uploadingImages.filter((img: any) => img.state === 'complete').length;
  const totalUploading = uploadingImages.length;
  const photoCount = albumPhotos.length + completedUploads;
  
  // Check if album is in a folder (if so, disable publish toggle since folder controls it)
  const isInFolder = currentAlbum?.folder_id != null;
  
  // Check if any uploads are actively in progress (not complete)
  const hasActiveUploads = uploadingImages.some((img: any) => img.state !== 'complete');
  
  // Calculate upload progress percentage
  const uploadProgress = totalUploading > 0 ? Math.round((completedUploads / totalUploading) * 100) : 0;

  return (
    <div className="photos-modal-header">
      {/* Title Bar */}
      <div className="photos-title-bar">
        {/* Left: Album title + photo count */}
        <div className="photos-title-left">
          <h2 className="photos-modal-title">{selectedAlbum}</h2>
          <span className="photos-count">
            {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
            {hasActiveUploads && totalUploading > 0 && (
              <span style={{ marginLeft: '0.5rem', color: '#4ade80' }}>
                ({uploadProgress}% complete)
              </span>
            )}
          </span>
        </div>
        
        {/* Right: Publish toggle + close button */}
        <div className="photos-title-right">
          {/* Publish/Unpublish Toggle (Mobile Only - shown on narrow screens) */}
          {canEdit && !isInFolder ? (
            <label className="toggle-switch compact publish-toggle-titlebar" onClick={(e) => e.stopPropagation()}>
              <span className="toggle-label">
                {isPublished ? 'Published' : 'Unpublished'}
              </span>
              <input
                type="checkbox"
                checked={isPublished}
                onChange={() => onTogglePublished(selectedAlbum, isPublished)}
              />
              <span className="toggle-slider"></span>
            </label>
          ) : (
            <span className="photos-status-badge publish-toggle-titlebar" style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: isPublished ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
              color: isPublished ? '#4ade80' : '#fbbf24',
              border: isPublished ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)',
            }}>
              {isPublished ? 'Published' : 'Unpublished'}
            </span>
          )}
          
          <button onClick={onClose} className="photos-close-btn" title="Close">
            <CloseIcon width="20" height="20" />
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="photos-controls-bar">
        <div className="photos-controls-left">
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => onViewModeChange('grid')}
              title="Grid view"
            >
              <GridViewIcon width="16" height="16" />
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => onViewModeChange('list')}
              title="List view"
            >
              <ListViewIcon width="16" height="16" />
            </button>
          </div>

          {canEdit && (
            <>
              <label 
                className={`photos-btn photos-btn-primary ${hasActiveUploads ? 'disabled' : ''}`}
                style={{ 
                  cursor: hasActiveUploads ? 'not-allowed' : 'pointer',
                  opacity: hasActiveUploads ? 0.6 : 1
                }}
              >
                <UploadIcon width="16" height="16" />
                <span>{hasActiveUploads ? 'Uploading...' : 'Upload'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={onUploadPhotos}
                  disabled={hasActiveUploads}
                  style={{ display: 'none' }}
                />
              </label>

              <button
                onClick={() => onDeleteAlbum(selectedAlbum)}
                className="photos-btn photos-btn-danger"
                title="Delete album"
                disabled={hasActiveUploads}
              >
                <TrashIcon width="16" height="16" />
                <span>Delete</span>
              </button>
              
              {!isPublished && (
                <>
                  <button
                    onClick={() => onPreviewAlbum(selectedAlbum)}
                    className="photos-btn photos-btn-secondary"
                    title="Preview album"
                  >
                    <EyeIcon width="16" height="16" />
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
                </>
              )}
            </>
          )}
        </div>

        <div className="photos-controls-right">
          {/* Publish/Unpublish Toggle (Desktop Only - shown on wide screens) */}
          {canEdit && !isInFolder ? (
            <label className="toggle-switch compact publish-toggle-controlbar" onClick={(e) => e.stopPropagation()}>
              <span className="toggle-label">
                {isPublished ? 'Published' : 'Unpublished'}
              </span>
              <input
                type="checkbox"
                checked={isPublished}
                onChange={() => onTogglePublished(selectedAlbum, isPublished)}
              />
              <span className="toggle-slider"></span>
            </label>
          ) : (
            <span className="photos-status-badge publish-toggle-controlbar" style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: isPublished ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
              color: isPublished ? '#4ade80' : '#fbbf24',
              border: isPublished ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)',
            }}>
              {isPublished ? 'Published' : 'Unpublished'}
            </span>
          )}
        </div>
      </div>

    </div>
  );
};

export default PhotosPanelHeader;

