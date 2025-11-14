/**
 * FoldersSection Component
 * Displays folder cards with their contained albums
 */

import React from 'react';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import SortableFolderCard from './SortableFolderCard';
import { Folder, Album } from '../types';

interface FoldersSectionProps {
  localFolders: Folder[];
  localAlbums: Album[];
  selectedAlbum: string | null;
  animatingAlbum: string | null;
  dragOverAlbum: string | null;
  dragOverFolderId: number | null;
  placeholderInfo: { folderId: number | null; insertAtIndex: number } | null;
  onDeleteFolder: (folderName: string) => void;
  onToggleFolderPublished: (folderName: string, currentPublished: boolean) => void;
  onAlbumClick: (albumName: string) => void;
  onAlbumDragOver: (e: React.DragEvent, albumName: string) => void;
  onAlbumDragLeave: (e: React.DragEvent) => void;
  onAlbumDrop: (e: React.DragEvent, albumName: string) => void;
  onCreateAlbumInFolder: (folderId: number) => void;
  canEdit: boolean;
}

const FoldersSection: React.FC<FoldersSectionProps> = ({
  localFolders,
  localAlbums,
  selectedAlbum,
  animatingAlbum,
  dragOverAlbum,
  dragOverFolderId,
  placeholderInfo,
  onDeleteFolder,
  onToggleFolderPublished,
  onAlbumClick,
  onAlbumDragOver,
  onAlbumDragLeave,
  onAlbumDrop,
  onCreateAlbumInFolder,
  canEdit,
}) => {
  if (localFolders.length === 0) return null;

  return (
    <div className="folders-section" style={{ marginBottom: '1rem' }}>
      <SortableContext items={localFolders.map(f => `folder-${f.id}`)} strategy={rectSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {localFolders.map((folder) => (
            <SortableFolderCard
              key={folder.id}
              folder={folder}
              albums={localAlbums.filter(a => a.folder_id === folder.id)}
              selectedAlbum={selectedAlbum}
              animatingAlbum={animatingAlbum}
              dragOverAlbum={dragOverAlbum}
              isDragOver={dragOverFolderId === folder.id}
              showPlaceholderAtIndex={placeholderInfo?.folderId === folder.id ? placeholderInfo?.insertAtIndex : undefined}
              onDelete={onDeleteFolder}
              onTogglePublished={onToggleFolderPublished}
              onAlbumClick={onAlbumClick}
              onAlbumDragOver={onAlbumDragOver}
              onAlbumDragLeave={onAlbumDragLeave}
              onAlbumDrop={onAlbumDrop}
              onCreateAlbumInFolder={onCreateAlbumInFolder}
              canEdit={canEdit}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

export default FoldersSection;

