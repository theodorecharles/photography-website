/**
 * Sortable Folder Card Component
 * Displays a folder card with drag-and-drop support for:
 * - Reordering folders
 * - Receiving albums dropped onto it
 * - Sorting albums within the folder
 */

import { useSortable, SortableContext } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { rectSortingStrategy } from '@dnd-kit/sortable';
import { AlbumFolder, Album } from '../types';
import SortableAlbumCard from './SortableAlbumCard';

interface SortableFolderCardProps {
  folder: AlbumFolder;
  albums: Album[];
  selectedAlbum: string | null;
  animatingAlbum: string | null;
  dragOverAlbum: string | null;
  isDragOver: boolean;
  onDelete: (folderName: string) => void;
  onTogglePublished: (folderName: string, currentPublished: boolean) => void;
  onAlbumClick: (albumName: string) => void;
  onAlbumDragOver: (e: React.DragEvent, albumName: string) => void;
  onAlbumDragLeave: (e: React.DragEvent) => void;
  onAlbumDrop: (e: React.DragEvent, albumName: string) => void;
  onAlbumRename: (albumName: string) => void;
  onCreateAlbumInFolder: (folderId: number) => void;
}

const SortableFolderCard: React.FC<SortableFolderCardProps> = ({
  folder,
  albums,
  selectedAlbum,
  animatingAlbum,
  dragOverAlbum,
  isDragOver,
  onDelete,
  onTogglePublished,
  onAlbumClick,
  onAlbumDragOver,
  onAlbumDragLeave,
  onAlbumDrop,
  onAlbumRename,
  onCreateAlbumInFolder,
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

  // Always make the folder droppable for albums
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `folder-drop-${folder.id}`,
    disabled: false,
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

  const albumCount = albums.length;

  return (
    <div
      ref={setRefs}
      style={style}
      className={`folder-card ${isDragOver ? 'drag-over' : ''} ${isDragging ? 'dragging' : ''} ${!folder.published ? 'unpublished' : ''}`}
    >
      <div 
        className="folder-card-header"
      >
        <div 
          className="folder-drag-handle"
          {...attributes}
          {...listeners}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <h4 className="folder-card-title">
            {folder.published ? '📁' : '🔒'} {folder.name}
          </h4>
          <div className="folder-count">
            {albumCount} {albumCount === 1 ? 'album' : 'albums'}
          </div>
        </div>
        <div className="folder-controls">
          <label 
            className="toggle-switch" 
            style={{ 
              opacity: albumCount === 0 ? 0.5 : 1,
              cursor: albumCount === 0 ? 'not-allowed' : 'pointer'
            }} 
            onClick={(e) => e.stopPropagation()}
            title={albumCount === 0 ? 'Cannot publish empty folder' : ''}
          >
            <input
              type="checkbox"
              checked={albumCount > 0 && folder.published}
              onChange={() => onTogglePublished(folder.name, folder.published)}
              disabled={albumCount === 0}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Published</span>
          </label>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(folder.name);
            }}
            className="folder-delete-btn-text"
            title="Delete folder"
          >
            Delete
          </button>
        </div>
      </div>
      
      {/* Albums inside the folder */}
      <SortableContext items={albums.map(a => a.name)} strategy={rectSortingStrategy}>
        <div className="folder-albums-grid">
          {albums.map((album) => (
            <SortableAlbumCard
              key={album.name}
              album={album}
              isSelected={selectedAlbum === album.name}
              isAnimating={animatingAlbum === album.name}
              isDragOver={dragOverAlbum === album.name}
              onClick={() => onAlbumClick(album.name)}
              onDragOver={(e) => { onAlbumDragOver(e, album.name); }}
              onDragLeave={onAlbumDragLeave}
              onDrop={(e) => { onAlbumDrop(e, album.name); }}
              onRename={() => onAlbumRename(album.name)}
            />
          ))}
          {/* Ghost tile for creating new album in this folder */}
          <div 
            className="album-card ghost-album-tile"
            onClick={(e) => {
              e.stopPropagation();
              onCreateAlbumInFolder(folder.id);
            }}
          >
            <div className="ghost-tile-content">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v8M8 12h8"/>
              </svg>
            </div>
          </div>
        </div>
      </SortableContext>
    </div>
  );
};

export default SortableFolderCard;

