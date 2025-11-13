/**
 * Sortable Album Card Component
 * Drag-and-drop enabled album card with drop zone for file uploads
 */

import { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Album } from '../types';

interface SortableAlbumCardProps {
  album: Album;
  isSelected: boolean;
  isAnimating: boolean;
  isDragOver: boolean;
  onClick: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onRename?: (albumName: string) => void;
  onRemoveFromFolder?: (albumName: string) => void;
}

const SortableAlbumCard: React.FC<SortableAlbumCardProps> = ({
  album,
  isSelected,
  isAnimating,
  isDragOver,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
  onRename,
  onRemoveFromFolder,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: album.name });

  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    hasMoved.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
    
    // If moved more than 5px, mark as scrolling/dragging
    if (deltaX > 5 || deltaY > 5) {
      hasMoved.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Only trigger onClick if it was a tap without movement
    if (touchStartPos.current && !hasMoved.current) {
      e.preventDefault(); // Prevent click event from firing
      onClick();
    }
    touchStartPos.current = null;
    hasMoved.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    // For desktop only - don't fire if touch already handled it
    if (e.detail === 0) return; // Triggered by keyboard or already prevented
    onClick();
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`album-card ${isSelected ? 'selected' : ''} ${album.published === false ? 'unpublished' : ''} ${isAnimating ? 'animating' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over-album' : ''}`}
      data-album-name={album.name}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      {...attributes}
      {...listeners}
    >
      {onRename && (
        <button
          className="album-rename-btn"
          onClick={(e) => {
            e.stopPropagation();
            onRename(album.name);
          }}
          title="Rename album"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </button>
      )}
      {onRemoveFromFolder && album.folder_id && (
        <button
          className="album-remove-folder-btn"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveFromFolder(album.name);
          }}
          title="Remove from folder"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            <line x1="9" y1="14" x2="15" y2="14"/>
          </svg>
        </button>
      )}
      <div className="album-card-header">
        <h4>
          <span className="album-name">{album.name}</span>
        </h4>
      </div>
      {album.photoCount !== undefined && (
        <div className="album-badge">
          {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}
        </div>
      )}
      {isDragOver && (
        <div className="album-drop-overlay">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          <span>Drop to upload</span>
        </div>
      )}
    </div>
  );
};

export default SortableAlbumCard;
