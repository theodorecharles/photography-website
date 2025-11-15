/**
 * Sortable Photo Item Component
 * Drag-and-drop enabled photo thumbnail with edit/delete actions
 */

import { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Photo } from '../types';
import { cacheBustValue } from '../../../../config';
import { EditDocumentIcon, TrashIcon } from '../../../icons';

const API_URL = import.meta.env.VITE_API_URL || '';

interface SortablePhotoItemProps {
  photo: Photo;
  onEdit: (photo: Photo) => void;
  onDelete: (album: string, filename: string, title: string) => void;
  canEdit: boolean;
}

const SortablePhotoItem: React.FC<SortablePhotoItemProps> = ({
  photo,
  onEdit,
  onDelete,
  canEdit,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id, disabled: !canEdit });

  const [showOverlay, setShowOverlay] = useState(false);
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
      setShowOverlay(false); // Hide overlay if user starts scrolling/dragging
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Only act if it was a tap without movement
    if (touchStartPos.current && !hasMoved.current) {
      e.preventDefault(); // Prevent ghost clicks
      
      // Check if tap hit a button
      const target = e.target as HTMLElement;
      const clickedButton = target.closest('.btn-edit-photo, .btn-delete-photo');
      
      if (clickedButton) {
        // Tapped a button - let the button handler deal with it
        // Don't change overlay state
      } else if (showOverlay) {
        // Overlay is showing and tapped elsewhere - hide it
        setShowOverlay(false);
      } else {
        // Overlay is hidden - show it
        setShowOverlay(true);
      }
    }
    touchStartPos.current = null;
    hasMoved.current = false;
  };

  const handleTouchCancel = () => {
    touchStartPos.current = null;
    hasMoved.current = false;
    setShowOverlay(false);
  };

  // Close overlay when clicking outside buttons (desktop)
  const handleOverlayClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Close if clicked overlay itself or anything except the buttons
    if (!target.closest('.btn-edit-photo, .btn-delete-photo')) {
      setShowOverlay(false);
    }
  };


  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const imageUrl = `${API_URL}${photo.thumbnail}?i=${cacheBustValue}`;
  const filename = photo.id.split('/').pop() || photo.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`admin-photo-item ${isDragging ? 'dragging' : ''} ${showOverlay ? 'show-overlay' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      {...(canEdit ? attributes : {})}
      {...(canEdit ? listeners : {})}
    >
      <img
        src={imageUrl}
        alt=""
        className="admin-photo-thumbnail"
      />

      {/* Photo info section (shown in list view) */}
      <div className="photo-info">
        <div className="photo-filename">{filename}</div>
        {photo.title && <div className="photo-title">{photo.title}</div>}
      </div>

      {canEdit && (
        <div className="photo-overlay" onClick={handleOverlayClick}>
          <div className="photo-actions">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onEdit(photo);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onEdit(photo);
              }}
              className="btn-edit-photo"
              title="Edit title"
              type="button"
            >
              <EditDocumentIcon width="16" height="16" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const filename = photo.id.split('/').pop() || photo.id;
                onDelete(photo.album, filename, photo.title);
              }}
              className="btn-delete-photo"
              title="Delete photo"
            >
              <TrashIcon width="16" height="16" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SortablePhotoItem;
