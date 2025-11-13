/**
 * Drag and Drop Event Handlers
 * Handles all drag-and-drop interactions for albums, folders, and photos
 */

import { DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Album, AlbumFolder } from '../types';
import { isDraggingFolder, isDraggingAlbum, extractFolderId } from '../utils/dragDropHelpers';

interface DragDropHandlersProps {
  localAlbums: Album[];
  setLocalAlbums: (albums: Album[]) => void;
  localFolders: AlbumFolder[];
  setLocalFolders: (folders: AlbumFolder[]) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  setAnimatingAlbum: (value: string | null) => void;
  setActiveAlbumId: (value: string | null) => void;
  setActiveFolderId: (value: number | null) => void;
  setDragOverFolderId: (value: number | null) => void;
  setDragOverUncategorized: (value: boolean) => void;
  setPlaceholderInfo: (value: { folderId: number | null; insertAtIndex: number } | null) => void;
  uncategorizedSectionRef: React.RefObject<HTMLDivElement | null>;
}

export const createDragDropHandlers = (props: DragDropHandlersProps) => {
  const {
    localAlbums,
    setLocalAlbums,
    localFolders,
    setLocalFolders,
    setHasUnsavedChanges,
    setAnimatingAlbum,
    setActiveAlbumId,
    setActiveFolderId,
    setDragOverFolderId,
    setDragOverUncategorized,
    setPlaceholderInfo,
    uncategorizedSectionRef,
  } = props;

  // Photo drag handlers
  const handlePhotoDragStart = (event: DragEndEvent) => {
    console.log('📸 Photo drag started:', event.active.id);
  };

  const handlePhotoDragEnd = (event: DragEndEvent) => {
    console.log('📸 Photo drag ended:', event.active.id);
  };

  // Album drag handlers
  const handleAlbumDragStart = (event: DragEndEvent) => {
    const draggedId = String(event.active.id);
    
    if (isDraggingFolder(draggedId)) {
      const folderId = extractFolderId(draggedId);
      setActiveFolderId(folderId);
      setActiveAlbumId(null);
    } else if (isDraggingAlbum(draggedId)) {
      setActiveAlbumId(draggedId);
      setActiveFolderId(null);
    }
  };

  const handleAlbumDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setDragOverFolderId(null);
      setDragOverUncategorized(false);
      setPlaceholderInfo(null);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // Handle folder drag over
    if (isDraggingFolder(activeId)) {
      const activeFolderId = extractFolderId(activeId);
      const activeIndex = localFolders.findIndex(f => f.id === activeFolderId);
      
      if (isDraggingFolder(overId)) {
        const overFolderId = extractFolderId(overId);
        const overIndex = localFolders.findIndex(f => f.id === overFolderId);
        
        if (activeIndex !== overIndex && activeIndex !== -1 && overIndex !== -1) {
          const reordered = arrayMove(localFolders, activeIndex, overIndex);
          setLocalFolders(reordered);
          setHasUnsavedChanges(true);
        }
      }
      return;
    }

    // Handle album drag over
    if (isDraggingAlbum(activeId)) {
      // Dragging over a folder
      if (isDraggingFolder(overId)) {
        const folderId = extractFolderId(overId);
        setDragOverFolderId(folderId);
        setDragOverUncategorized(false);
        setPlaceholderInfo(null);
      }
      // Dragging over uncategorized section
      else if (overId === 'uncategorized-droppable') {
        setDragOverUncategorized(true);
        setDragOverFolderId(null);
        setPlaceholderInfo(null);
      }
      // Dragging over another album
      else {
        const activeAlbum = localAlbums.find(a => a.name === activeId);
        const overAlbum = localAlbums.find(a => a.name === overId);
        
        if (activeAlbum && overAlbum) {
          const isSameFolder = activeAlbum.folder_id === overAlbum.folder_id;
          
          if (isSameFolder) {
            const albumsInSameContext = localAlbums.filter(
              a => a.folder_id === activeAlbum.folder_id
            );
            const activeIndex = albumsInSameContext.findIndex(a => a.name === activeId);
            const overIndex = albumsInSameContext.findIndex(a => a.name === overId);
            
            if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
              const reordered = arrayMove(albumsInSameContext, activeIndex, overIndex);
              const otherAlbums = localAlbums.filter(
                a => a.folder_id !== activeAlbum.folder_id
              );
              setLocalAlbums([...otherAlbums, ...reordered]);
              setHasUnsavedChanges(true);
            }
          }
        }
      }
    }
  };

  const handleAlbumDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveAlbumId(null);
    setActiveFolderId(null);
    setDragOverFolderId(null);
    setDragOverUncategorized(false);
    setPlaceholderInfo(null);
    
    if (!over) return;
    
    const activeId = String(active.id);
    const overId = String(over.id);
    
    // Handle moving album to folder or uncategorized
    if (isDraggingAlbum(activeId) && isDraggingFolder(overId)) {
      const folderId = extractFolderId(overId);
      const targetFolder = localFolders.find(f => f.id === folderId);
      
      if (targetFolder) {
        const updatedAlbums = localAlbums.map(a =>
          a.name === activeId
            ? { ...a, folder_id: folderId, published: targetFolder.published }
            : a
        );
        setLocalAlbums(updatedAlbums);
        setHasUnsavedChanges(true);
        
        // Animate the album
        setAnimatingAlbum(activeId);
        setTimeout(() => setAnimatingAlbum(null), 300);
      }
    } else if (isDraggingAlbum(activeId) && overId === 'uncategorized-droppable') {
      const currentAlbum = localAlbums.find(a => a.name === activeId);
      const updatedAlbums = localAlbums.map(a =>
        a.name === activeId
          ? { ...a, folder_id: null } // Keep existing published state
          : a
      );
      setLocalAlbums(updatedAlbums);
      setHasUnsavedChanges(true);
      
      // Animate the album
      setAnimatingAlbum(activeId);
      setTimeout(() => setAnimatingAlbum(null), 300);
    }
  };

  // Album tile drag handlers (for file drops)
  const handleAlbumTileDragOver = (e: React.DragEvent, albumName: string) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAlbumTileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAlbumTileDrop = async (e: React.DragEvent, albumName: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Handle file drop on album tile
  };

  return {
    handlePhotoDragStart,
    handlePhotoDragEnd,
    handleAlbumDragStart,
    handleAlbumDragOver,
    handleAlbumDragEnd,
    handleAlbumTileDragOver,
    handleAlbumTileDragLeave,
    handleAlbumTileDrop,
  };
};

