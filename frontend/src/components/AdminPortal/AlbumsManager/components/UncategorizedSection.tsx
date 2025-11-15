/**
 * UncategorizedSection Component
 * Displays uncategorized albums and ghost tile for creating new albums
 */

import React from 'react';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import SortableAlbumCard from './SortableAlbumCard';
import { Album, UploadingImage } from '../types';
import { PlusCircleIcon } from '../../../icons';

interface UncategorizedSectionProps {
  localAlbums: Album[];
  selectedAlbum: string | null;
  animatingAlbum: string | null;
  dragOverAlbum: string | null;
  dragOverUncategorized: boolean;
  placeholderInfo: { folderId: number | null; insertAtIndex: number } | null;
  uploadingImages: UploadingImage[];
  isGhostAlbumDragOver: boolean;
  uncategorizedSectionRef: React.RefObject<HTMLDivElement | null>;
  ghostTileFileInputRef: React.RefObject<HTMLInputElement | null>;
  onAlbumClick: (albumName: string) => void;
  onAlbumDragOver: (e: React.DragEvent, albumName: string) => void;
  onAlbumDragLeave: (e: React.DragEvent) => void;
  onAlbumDrop: (e: React.DragEvent, albumName: string) => void;
  onGhostTileClick: () => void;
  onGhostTileDragOver: (e: React.DragEvent) => void;
  onGhostTileDragLeave: (e: React.DragEvent) => void;
  onGhostTileDrop: (e: React.DragEvent) => void;
  onGhostTileFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  canEdit: boolean;
}

const UncategorizedSection: React.FC<UncategorizedSectionProps> = ({
  localAlbums,
  selectedAlbum,
  animatingAlbum,
  dragOverAlbum,
  dragOverUncategorized,
  placeholderInfo,
  uploadingImages,
  isGhostAlbumDragOver,
  uncategorizedSectionRef,
  ghostTileFileInputRef,
  onAlbumClick,
  onAlbumDragOver,
  onAlbumDragLeave,
  onAlbumDrop,
  onGhostTileClick,
  onGhostTileDragOver,
  onGhostTileDragLeave,
  onGhostTileDrop,
  onGhostTileFileSelect,
  canEdit,
}) => {
  const uncategorizedAlbums = localAlbums.filter(album => !album.folder_id);

  return (
    <div className="albums-management">
      <div className="albums-list">
        <div 
          ref={uncategorizedSectionRef}
          className={`uncategorized-section ${dragOverUncategorized ? 'drag-over-uncategorized' : ''}`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>
              Uncategorized
            </h3>
            <span style={{ fontSize: '0.9rem', color: '#888' }}>
              {uncategorizedAlbums.length} {uncategorizedAlbums.length === 1 ? 'album' : 'albums'}
            </span>
          </div>
          <SortableContext 
            items={uncategorizedAlbums.map(a => a.name)} 
            strategy={rectSortingStrategy}
          >
            <div className="album-grid">
              {uncategorizedAlbums.map((album, index) => (
                <React.Fragment key={album.name}>
                  {/* Show placeholder before this album if needed */}
                  {placeholderInfo?.folderId === null && placeholderInfo.insertAtIndex === index && (
                    <div
                      className="album-card album-placeholder"
                      style={{
                        border: '2px dashed #3b82f6',
                        background: 'rgba(59, 130, 246, 0.1)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  <SortableAlbumCard
                    album={album}
                    isSelected={selectedAlbum === album.name}
                    isAnimating={animatingAlbum === album.name}
                    isDragOver={dragOverAlbum === album.name}
                    onClick={() => onAlbumClick(album.name)}
                    onDragOver={(e) => onAlbumDragOver(e, album.name)}
                    onDragLeave={onAlbumDragLeave}
                    onDrop={(e) => onAlbumDrop(e, album.name)}
                    canEdit={canEdit}
                  />
                </React.Fragment>
              ))}
              {/* Show placeholder at end if needed */}
              {placeholderInfo?.folderId === null && placeholderInfo.insertAtIndex === uncategorizedAlbums.length && (
                <div
                  className="album-card album-placeholder"
                  style={{
                    border: '2px dashed #3b82f6',
                    background: 'rgba(59, 130, 246, 0.1)',
                    pointerEvents: 'none',
                  }}
                />
              )}
              
              {/* Ghost tile for creating new albums - only show for editors */}
              {canEdit && (
                <div 
                  className={`album-card ghost-album-tile ${isGhostAlbumDragOver ? 'drag-over-ghost' : ''} ${uploadingImages.length > 0 ? 'ghost-tile-disabled' : ''}`}
                  onClick={uploadingImages.length > 0 ? undefined : onGhostTileClick}
                  onDragOver={uploadingImages.length > 0 ? undefined : onGhostTileDragOver}
                  onDragLeave={uploadingImages.length > 0 ? undefined : onGhostTileDragLeave}
                  onDrop={uploadingImages.length > 0 ? undefined : onGhostTileDrop}
                >
                  <div className="ghost-tile-content">
                    <PlusCircleIcon width="48" height="48" />
                    {uploadingImages.length > 0 ? (
                      <span className="ghost-tile-hint">Uploading...</span>
                    ) : isGhostAlbumDragOver ? (
                      <span className="ghost-tile-hint">Drop to create</span>
                    ) : null}
                  </div>
                  <input
                    ref={ghostTileFileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={onGhostTileFileSelect}
                    disabled={uploadingImages.length > 0}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  );
};

export default UncategorizedSection;

