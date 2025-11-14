/**
 * Sortable Album Card Component
 * Drag-and-drop enabled album card with drop zone for file uploads
 */

import { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Album } from '../types';
import { FolderMinusIcon, UploadIcon } from '../../../icons';

interface SortableAlbumCardProps {
  album: Album;
  isSelected: boolean;
  isAnimating: boolean;
  isDragOver: boolean;
  onClick: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onRemoveFromFolder?: (albumName: string) => void;
  canEdit: boolean;
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
  onRemoveFromFolder,
  canEdit,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: album.name, disabled: !canEdit });

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
      onDragOver={canEdit ? onDragOver : undefined}
      onDragLeave={canEdit ? onDragLeave : undefined}
      onDrop={canEdit ? onDrop : undefined}
      {...attributes}
      {...(canEdit ? listeners : {})}
    >
      {canEdit && onRemoveFromFolder && album.folder_id && (
        <button
          className="album-remove-folder-btn"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveFromFolder(album.name);
          }}
          title="Remove from folder"
        >
          <FolderMinusIcon width="16" height="16" />
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
          <UploadIcon width="32" height="32" />
          <span>Drop to upload</span>
        </div>
      )}
    </div>
  );
};

export default SortableAlbumCard;
