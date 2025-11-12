/**
 * Sortable Folder Card Component
 * Displays a folder card with drag-and-drop support for:
 * - Reordering folders
 * - Receiving albums dropped onto it
 */

import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { AlbumFolder } from '../types';

interface SortableFolderCardProps {
  folder: AlbumFolder;
  albumCount: number;
  isDragOver: boolean;
  onDelete: (folderName: string) => void;
  onTogglePublished: (folderName: string, currentPublished: boolean) => void;
}

const SortableFolderCard: React.FC<SortableFolderCardProps> = ({
  folder,
  albumCount,
  isDragOver,
  onDelete,
  onTogglePublished,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `folder-${folder.id}`,
  });

  // Also make it droppable for albums
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `folder-drop-${folder.id}`,
  });

  // Combine both refs
  const setRefs = (element: HTMLDivElement | null) => {
    setSortableRef(element);
    setDroppableRef(element);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setRefs}
      style={style}
      className={`folder-card ${isDragOver ? 'drag-over' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      <div 
        className="folder-card-header"
        {...attributes}
        {...listeners}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <h4 className="folder-card-title">📁 {folder.name}</h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(folder.name);
          }}
          className="folder-delete-btn"
          title="Delete folder"
        >
          ×
        </button>
      </div>
      <div className="folder-count">
        {albumCount} album(s)
      </div>
      <label className="toggle-switch" style={{ marginTop: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={folder.published}
          onChange={() => onTogglePublished(folder.name, folder.published)}
        />
        <span className="toggle-slider"></span>
        <span className="toggle-label">Published</span>
      </label>
    </div>
  );
};

export default SortableFolderCard;

