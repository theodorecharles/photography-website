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
  saveAlbumOrder: (albumsToSave?: Album[], silent?: boolean) => Promise<boolean>;
  loadAlbums: () => Promise<void>;
  setAnimatingAlbum: (value: string | null) => void;
  setActiveAlbumId: (value: string | null) => void;
  setActiveFolderId: (value: number | null) => void;
  setDragOverFolderId: (value: number | null) => void;
  setDragOverUncategorized: (value: boolean) => void;
  setIsDragging: (value: boolean) => void;
  uncategorizedSectionRef: React.RefObject<HTMLDivElement | null>;
}

export const createDragDropHandlers = (props: DragDropHandlersProps) => {
  const {
    localAlbums,
    setLocalAlbums,
    localFolders,
    setLocalFolders,
    saveAlbumOrder,
    loadAlbums,
    setAnimatingAlbum,
    setActiveAlbumId,
    setActiveFolderId,
    setDragOverFolderId,
    setDragOverUncategorized,
    setIsDragging,
    // uncategorizedSectionRef, // unused for now
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
    
    // Enable scroll prevention on mobile
    setIsDragging(true);
    
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
      const activeAlbum = localAlbums.find(a => a.name === activeId);
      if (!activeAlbum) return;
      
      console.log('🔍 Album drag over:', {
        activeId,
        activeFolderId: activeAlbum.folder_id,
        overId,
        isGhostTile: overId.startsWith('ghost-'),
      });
      
      // ONLY highlight ghost tiles when dragging from a DIFFERENT section
      if (overId === 'ghost-uncategorized') {
        // Only highlight if dragging FROM a folder (not from uncategorized itself)
        if (activeAlbum.folder_id !== null) {
          console.log('  ✅ Highlighting uncategorized ghost (dragging from folder', activeAlbum.folder_id, ')');
          setDragOverUncategorized(true);
          setDragOverFolderId(null);
        } else {
          console.log('  ❌ Same section (uncategorized), not highlighting');
          setDragOverUncategorized(false);
          setDragOverFolderId(null);
        }
      } else if (overId.startsWith('ghost-folder-')) {
        const folderId = parseInt(overId.replace('ghost-folder-', ''));
        console.log('  📍 Over ghost-folder-', folderId, ', active is in folder', activeAlbum.folder_id);
        
        // Only highlight if dragging FROM a different folder or from uncategorized
        if (activeAlbum.folder_id !== folderId) {
          console.log('  ✅ Highlighting folder', folderId, 'ghost (different section)');
          setDragOverFolderId(folderId);
          setDragOverUncategorized(false);
        } else {
          console.log('  ❌ Same folder, not highlighting');
          setDragOverFolderId(null);
          setDragOverUncategorized(false);
        }
      } else {
        // Not over a ghost tile - clear highlights
        console.log('  ⚪ Not over ghost tile, clearing highlights');
        setDragOverFolderId(null);
        setDragOverUncategorized(false);
      }
    }
  };

  const handleAlbumDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Disable scroll prevention
    setIsDragging(false);
    
    setActiveAlbumId(null);
    setActiveFolderId(null);
    setDragOverFolderId(null);
    setDragOverUncategorized(false);
    
    if (!over) return;
    
    const activeId = String(active.id);
    const overId = String(over.id);
    
    console.log('🎯 Album drag end:', { activeId, overId });
    
    const activeAlbum = localAlbums.find(a => a.name === activeId);
    if (!activeAlbum) return;
    
    // Handle dropping on ghost tiles (for empty folders/uncategorized)
    if (overId === 'ghost-uncategorized') {
      console.log('📍 Dropped on uncategorized ghost tile');
      const updatedAlbums = localAlbums.map(a =>
        a.name === activeId ? { ...a, folder_id: null } : a
      );
      setLocalAlbums(updatedAlbums);
      setAnimatingAlbum(activeId);
      setTimeout(() => setAnimatingAlbum(null), 300);
      
      // Save immediately
      await saveAlbumOrder(updatedAlbums, true);
      await loadAlbums(); // Reload to get any backend updates
      return;
    }
    
    if (overId.startsWith('ghost-folder-')) {
      const folderId = parseInt(overId.replace('ghost-folder-', ''));
      const targetFolder = localFolders.find(f => f.id === folderId);
      console.log('📍 Dropped on folder ghost tile:', folderId);
      
      if (targetFolder) {
        const updatedAlbums = localAlbums.map(a =>
          a.name === activeId
            ? { ...a, folder_id: folderId, published: targetFolder.published }
            : a
        );
        setLocalAlbums(updatedAlbums);
        setAnimatingAlbum(activeId);
        setTimeout(() => setAnimatingAlbum(null), 300);
        
        // Save immediately
        await saveAlbumOrder(updatedAlbums, true);
        await loadAlbums(); // Reload to get any backend updates
      }
      return;
    }
    
    // Handle dropping on an album (for reordering within same section ONLY)
    if (isDraggingAlbum(activeId)) {
      const overAlbum = localAlbums.find(a => a.name === overId);
      
      if (overAlbum) {
        const isSameContext = activeAlbum.folder_id === overAlbum.folder_id;
        
        if (isSameContext) {
          // Same section: reorder albums
          console.log('📍 Reordering within same section');
          const contextFolderId = overAlbum.folder_id;
          
          // Get albums in the same context
          const albumsInContext = localAlbums.filter(
            a => a.folder_id === contextFolderId
          );
          const activeIndex = albumsInContext.findIndex(a => a.name === activeId);
          const overIndex = albumsInContext.findIndex(a => a.name === overId);
          
          if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
            const reordered = arrayMove(albumsInContext, activeIndex, overIndex);
            const otherAlbums = localAlbums.filter(
              a => a.folder_id !== contextFolderId
            );
            const updatedAlbums = [...otherAlbums, ...reordered];
            setLocalAlbums(updatedAlbums);
            
            // Save immediately
            await saveAlbumOrder(updatedAlbums, true);
          }
        } else {
          // Different section: do nothing (only ghost tiles can move between sections)
          console.log('📍 Cross-section drop ignored (use ghost tiles to move)');
        }
      }
    }
  };

  // Album tile drag handlers (for file drops)
  const handleAlbumTileDragOver = (e: React.DragEvent, _albumName: string) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAlbumTileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAlbumTileDrop = async (e: React.DragEvent, _albumName: string) => {
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

