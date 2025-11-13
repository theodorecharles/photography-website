/**
 * Albums Manager - Main Orchestrator
 * Manages albums, photos, uploads, and image optimization
 * 
 * Refactored to use extracted components:
 * - SortableAlbumCard: Drag-and-drop album cards
 * - SortablePhotoItem: Drag-and-drop photo thumbnails
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Album, AlbumFolder, Photo, UploadingImage, AlbumsManagerProps, UploadState } from './types';
import { 
  trackAlbumCreated,
  trackAlbumDeleted,
  trackPhotoUploaded,
  trackPhotoDeleted
} from '../../../utils/analytics';
import { cacheBustValue } from '../../../config';
import { fetchWithRateLimitCheck } from '../../../utils/fetchWrapper';
import ShareModal from '../ShareModal';
import SortableAlbumCard from './components/SortableAlbumCard';
import SortablePhotoItem from './components/SortablePhotoItem';
import SortableFolderCard from './components/SortableFolderCard';
import PhotosPanel from './components/PhotosPanel';
import AlbumToolbar from './components/AlbumToolbar';
import FoldersSection from './components/FoldersSection';
import UncategorizedSection from './components/UncategorizedSection';
import ModalsCollection from './components/ModalsCollection';
import { useAlbumManagement } from './hooks/useAlbumManagement';
import { usePhotoManagement } from './hooks/usePhotoManagement';
import { useFolderManagement } from './hooks/useFolderManagement';
import { sanitizeAndTitleCase, isValidAlbumName, formatFileSize, validateImageFiles } from './utils/albumHelpers';
import { disableTouchScroll, enableTouchScroll, isDraggingFolder, isDraggingAlbum, extractFolderId } from './utils/dragDropHelpers';
import '../AlbumsManager.css';
import '../PhotoOrderControls.css';
import {
  DndContext,
  closestCenter,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragOverEvent,
  rectIntersection,
  CollisionDetection,
  useDroppable,
  pointerWithin,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Custom collision detection that prioritizes album-to-album collisions within grids
 * Uses closestCorners for better gap detection in grid layouts
 */
const customCollisionDetection: CollisionDetection = (args) => {
  const activeId = String(args.active?.id || '');
  
  // When dragging an album (not a folder)
  if (activeId && !activeId.startsWith('folder-')) {
    // First, check for grid collisions to see if we're over a specific folder/uncategorized area
    const gridContainers = Array.from(args.droppableContainers.values())
      .filter(container => {
        const id = String(container.id);
        return id.startsWith('folder-grid-') || id === 'uncategorized-grid';
      });
    
    const gridCollisions = rectIntersection({
      ...args,
      droppableContainers: gridContainers,
    });
    
    // If we're over a grid, check for album collisions WITHIN that grid only
    if (gridCollisions.length > 0) {
      const gridId = String(gridCollisions[0].id);
      
      // Only get album collisions from droppable containers (albums only)
      const albumContainers = Array.from(args.droppableContainers.values())
        .filter(container => {
          const id = String(container.id);
          return !id.startsWith('folder-') && !id.endsWith('-grid');
        });
      
      // If there are no albums at all in droppable containers, use the grid
      if (albumContainers.length === 0) {
        return gridCollisions;
      }
      
      // First, check if the pointer is actually INSIDE any album container using pointerWithin
      const albumsWithPointerInside = pointerWithin({
        ...args,
        droppableContainers: albumContainers,
      });
      
      // If pointer is inside an album, use closestCorners for precise positioning
      if (albumsWithPointerInside.length > 0) {
        const albumCollisions = closestCorners({
          ...args,
          droppableContainers: albumContainers,
        });
        return albumCollisions;
      }
      
      // Pointer is NOT inside any album - use the grid collision (empty folder or empty space)
      return gridCollisions;
    }
    
    // Not over any grid - fall back to all collisions
    return closestCorners(args);
  }
  
  // For folder reordering, use closestCorners for consistency
  return closestCorners(args);
};

// Helper function moved to utils/albumHelpers.ts

const AlbumsManager: React.FC<AlbumsManagerProps> = ({
  albums,
  folders,
  loadAlbums,
  setMessage,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Use custom hooks for album, photo, and folder management
  const albumManagement = useAlbumManagement({ albums, folders, setMessage, loadAlbums });
  const photoManagement = usePhotoManagement({ setMessage });
  const folderManagement = useFolderManagement({ setMessage, loadAlbums });
  
  // Extract commonly used values from hooks
  const {
    localAlbums,
    setLocalAlbums,
    localFolders,
    setLocalFolders,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    animatingAlbum,
    setAnimatingAlbum,
  } = albumManagement;
  
  const {
    selectedAlbum,
    albumPhotos,
    setAlbumPhotos,
    loadingPhotos,
    hasEverDragged,
    setHasEverDragged,
    savingOrder,
    selectAlbum,
    deselectAlbum,
    editingPhoto,
    editTitleValue,
    setEditTitleValue,
    showEditModal,
    openEditModal,
    closeEditModal,
    handleEditSave,
  } = photoManagement;
  
  // Handle album preselection from URL parameter
  useEffect(() => {
    const albumParam = searchParams.get('album');
    if (albumParam && albums.some(a => a.name === albumParam)) {
      selectAlbum(albumParam);
      // Clear the parameter after setting the selection
      searchParams.delete('album');
      setSearchParams(searchParams, { replace: true });
    }
  }, [albums, searchParams, setSearchParams, selectAlbum]);
  
  // Upload state (keeping this in component for now due to complexity)
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const uploadingImagesRef = useRef<UploadingImage[]>([]);
  
  // Drag-and-drop state (keeping this in component for now)
  const [isDragging, setIsDragging] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  
  // Extract folder management values
  const {
    newFolderName,
    setNewFolderName,
    isCreatingFolder,
  } = folderManagement;
  
  // State for drag-and-drop on album tiles
  const [dragOverAlbum, setDragOverAlbum] = useState<string | null>(null);
  const [isGhostAlbumDragOver, setIsGhostAlbumDragOver] = useState(false);
  const [showNewAlbumModal, setShowNewAlbumModal] = useState(false);
  const [newAlbumFiles, setNewAlbumFiles] = useState<File[]>([]);
  const [newAlbumModalName, setNewAlbumModalName] = useState('');
  const [newAlbumPublished, setNewAlbumPublished] = useState(true);
  const [newAlbumModalError, setNewAlbumModalError] = useState('');
  
  // Folder modal state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderModalError, setFolderModalError] = useState('');
  const [targetFolderId, setTargetFolderId] = useState<number | null>(null);
  
  // Rename album state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingAlbum, setRenamingAlbum] = useState<string | null>(null);
  const [newAlbumName, setNewAlbumName] = useState('');
  
  // Folder drag-over state (when an album is dragged over a folder)
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null>(null);
  const [dragOverUncategorized, setDragOverUncategorized] = useState(false);
  
  // Track where to show the placeholder when dragging between folders
  const [placeholderInfo, setPlaceholderInfo] = useState<{
    folderId: number | null;
    insertAtIndex: number;
  } | null>(null);
  
  // Ref to track if we're currently dragging (for touch scroll prevention)
  const isDraggingRef = useRef(false);
  
  // Ref for ghost tile file input
  const ghostTileFileInputRef = useRef<HTMLInputElement>(null);

  // Ref for uncategorized section (for manual bounding box checks)
  const uncategorizedSectionRef = useRef<HTMLDivElement>(null);

  // Detect if device supports touch
  const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  
  // Configure dnd-kit sensors for photos
  // Desktop: minimal delay for instant drag, mobile: longer delay to differentiate tap vs drag
  const photoSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isTouchDevice ? {
        delay: 300, // Mobile: require 300ms hold before drag starts
        tolerance: 8, // Mobile: allow 8px movement during the delay
      } : {
        distance: 5, // Desktop: require 5px movement to start drag (prevents accidental drags on click)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Configure dnd-kit sensors for albums
  const albumSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isTouchDevice ? {
        delay: 300, // Mobile: require 300ms hold before drag starts
        tolerance: 8, // Mobile: allow 8px movement during the delay
      } : {
        distance: 5, // Desktop: require 5px movement to start drag (prevents accidental drags on click)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // State for album drag-and-drop
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareAlbumName, setShareAlbumName] = useState<string | null>(null);
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  
  // Folder deletion modal state
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [deletingFolderName, setDeletingFolderName] = useState<string | null>(null);

  // Helper function to show confirmation modal
  const showConfirmation = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmConfig({
        message,
        onConfirm: () => {
          setShowConfirmModal(false);
          setConfirmConfig(null);
          resolve(true);
        },
      });
      setShowConfirmModal(true);
      // Store reject function for cancel
      const originalResolve = resolve;
      (window as any).__modalResolve = originalResolve;
    });
  };

  const handleModalCancel = () => {
    setShowConfirmModal(false);
    setConfirmConfig(null);
    if ((window as any).__modalResolve) {
      (window as any).__modalResolve(false);
      delete (window as any).__modalResolve;
    }
  };

  // Keep ref in sync with state
  useEffect(() => {
    uploadingImagesRef.current = uploadingImages;
  }, [uploadingImages]);

  // Helper function to prevent touch scrolling during drag
  const preventTouchScroll = useCallback((e: TouchEvent) => {
    if (isDraggingRef.current) {
      e.preventDefault();
    }
  }, []);

  // Cleanup: Remove touch scroll prevention listener on unmount
  useEffect(() => {
    return () => {
      // Remove event listener if component unmounts while dragging
      document.removeEventListener('touchmove', preventTouchScroll);
      // Reset dragging state
      isDraggingRef.current = false;
      // Restore body styles
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.touchAction = '';
    };
  }, [preventTouchScroll]);

  // Check if all uploads are complete and reload if needed
  const checkAndReloadIfComplete = async (albumName: string) => {
    const current = uploadingImagesRef.current;
    if (current.length === 0) return;
    
    const allDone = current.every(img => 
      img.state === 'complete' || img.state === 'error'
    );
    
    if (allDone) {
      console.log(`✅ All ${current.length} images processed, reloading album...`);
      
      // Small delay to ensure backend has finished writing
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Reload albums and photos
      await loadAlbums();
      await loadPhotos(albumName);
      
      // Dispatch global event
      window.dispatchEvent(new Event('albums-updated'));
      
      // Clear uploading state
      setUploadingImages([]);
      
      console.log(`✅ Reload complete`);
    }
  };

  // Load photos when album is selected
  useEffect(() => {
    if (selectedAlbum) {
      loadPhotos(selectedAlbum);
    }
  }, [selectedAlbum]);





  // Helper function to disable touch scrolling on all scrollable elements
  const disableTouchScroll = () => {
    // Mark that we're dragging
    isDraggingRef.current = true;
    
    // Disable body scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.touchAction = 'none';
    
    // Prevent touchmove events that cause scrolling
    document.addEventListener('touchmove', preventTouchScroll, { passive: false });
    
    // Find and disable all scrollable containers (more efficient: only check common scrollable containers)
    const scrollableSelectors = [
      '.admin-section',
      '.albums-list',
      '.folders-section',
      '.uncategorized-section',
      '.album-photos',
      '[style*="overflow"]',
      '[class*="scroll"]'
    ];
    
    scrollableSelectors.forEach((selector) => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          const htmlElement = element as HTMLElement;
          const style = window.getComputedStyle(htmlElement);
          
          // Check if element is scrollable
          if (
            style.overflow === 'auto' ||
            style.overflow === 'scroll' ||
            style.overflowY === 'auto' ||
            style.overflowY === 'scroll' ||
            style.overflowX === 'auto' ||
            style.overflowX === 'scroll'
          ) {
            // Store original touch-action if not already stored
            if (!htmlElement.dataset.originalTouchAction) {
              htmlElement.dataset.originalTouchAction = style.touchAction || '';
            }
            htmlElement.style.touchAction = 'none';
          }
        });
      } catch (e) {
        // Ignore invalid selectors
      }
    });
  };

  // Helper function to re-enable touch scrolling
  const enableTouchScroll = () => {
    // Mark that we're no longer dragging
    isDraggingRef.current = false;
    
    // Remove touchmove prevention
    document.removeEventListener('touchmove', preventTouchScroll);
    
    // Re-enable body scrolling
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.documentElement.style.touchAction = '';
    
    // Restore touch-action on all elements that had it modified
    const elementsWithData = document.querySelectorAll('[data-original-touch-action]');
    elementsWithData.forEach((element) => {
      const htmlElement = element as HTMLElement;
      if (htmlElement.dataset.originalTouchAction !== undefined) {
        htmlElement.style.touchAction = htmlElement.dataset.originalTouchAction;
        delete htmlElement.dataset.originalTouchAction;
      }
    });
  };

  // Handle drag start for photos
  const handlePhotoDragStart = (event: DragEndEvent) => {
    setHasEverDragged(true); // Mark that user has started dragging
    setActiveId(event.active.id as string);
    // Prevent scrolling during drag on mobile
    disableTouchScroll();
  };

  // Handle drag end for photos
  const handlePhotoDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setAlbumPhotos((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
    
    setActiveId(null);
    // Re-enable scrolling after drag
    enableTouchScroll();
  };

  // Handle unified drag start for both albums and folders
  const handleAlbumDragStart = (event: DragEndEvent) => {
    const { active } = event;
    const id = String(active.id);
    
    // Add dragging class to body to allow pointer-events: none on ghost tiles
    document.body.classList.add('dragging');
    
    if (id.startsWith('folder-')) {
      const folderId = parseInt(id.replace('folder-', ''));
      setActiveFolderId(folderId);
    } else {
      setActiveAlbumId(id);
    }
    
    // Prevent scrolling during drag on mobile
    disableTouchScroll();
  };

  // Handle drag over (to show grid highlight when album is dragged over)
  const handleAlbumDragOver = (event: DragOverEvent) => {
    const { active, over, delta } = event;
    
    // Only highlight grids when dragging an album
    if (over && !String(active.id).startsWith('folder-')) {
      const overId = String(over.id);
      const activeAlbum = localAlbums.find(a => a.name === String(active.id));
      
      if (!activeAlbum) {
        setDragOverFolderId(null);
        setDragOverUncategorized(false);
        setPlaceholderInfo(null);
        return;
      }
      
      // Manual detection: check if dragging over uncategorized section (when overId is the album itself)
      let manuallyOverUncategorized = false;
      if (overId === String(active.id) && uncategorizedSectionRef.current) {
        const activeElement = document.querySelector(`[data-album-name="${String(active.id)}"]`);
        if (activeElement) {
          const activeRect = activeElement.getBoundingClientRect();
          const currentX = activeRect.left + delta.x + (activeRect.width / 2);
          const currentY = activeRect.top + delta.y + (activeRect.height / 2);
          
          const uncategorizedRect = uncategorizedSectionRef.current.getBoundingClientRect();
          manuallyOverUncategorized = 
            currentX >= uncategorizedRect.left &&
            currentX <= uncategorizedRect.right &&
            currentY >= uncategorizedRect.top &&
            currentY <= uncategorizedRect.bottom;
        }
      }
      
      // Check if we're over a folder grid
      if (overId.startsWith('folder-grid-')) {
        const folderId = parseInt(overId.replace('folder-grid-', ''));
        setDragOverFolderId(folderId);
        setDragOverUncategorized(false);
        
        // Show placeholder at end of folder if dragging from different context
        if (activeAlbum.folder_id !== folderId) {
          const folderAlbums = localAlbums.filter(a => a.folder_id === folderId);
          setPlaceholderInfo({
            folderId,
            insertAtIndex: folderAlbums.length,
          });
        } else {
          setPlaceholderInfo(null);
        }
      } 
      // Check if we're over an album - determine which grid it belongs to
      else if (!overId.startsWith('folder-') && !overId.endsWith('-grid') && !manuallyOverUncategorized) {
        const overAlbum = localAlbums.find(a => a.name === overId);
        if (overAlbum) {
          if (overAlbum.folder_id) {
            setDragOverFolderId(overAlbum.folder_id);
            setDragOverUncategorized(false);
          } else {
            setDragOverUncategorized(true);
            setDragOverFolderId(null);
          }
          
          // Show placeholder if dragging from different context
          if (activeAlbum.folder_id !== overAlbum.folder_id) {
            const contextAlbums = localAlbums.filter(a => a.folder_id === overAlbum.folder_id);
            const overIndex = contextAlbums.findIndex(a => a.name === overId);
            setPlaceholderInfo({
              folderId: overAlbum.folder_id ?? null,
              insertAtIndex: overIndex,
            });
          } else {
            setPlaceholderInfo(null);
          }
        }
      }
      // Check if we're over the uncategorized grid (or manually detected)
      else if (overId === 'uncategorized-grid' || manuallyOverUncategorized) {
        setDragOverUncategorized(true);
        setDragOverFolderId(null);
        
        // Show placeholder at end if dragging from a folder
        if (activeAlbum.folder_id !== null) {
          const uncategorizedAlbums = localAlbums.filter(a => !a.folder_id);
          setPlaceholderInfo({
            folderId: null,
            insertAtIndex: uncategorizedAlbums.length,
          });
        } else {
          setPlaceholderInfo(null);
        }
      } 
      else {
        setDragOverFolderId(null);
        setDragOverUncategorized(false);
        setPlaceholderInfo(null);
      }
    } else {
      setDragOverFolderId(null);
      setDragOverUncategorized(false);
      setPlaceholderInfo(null);
    }
  };

  // Handle unified drag end for both albums and folders
  const handleAlbumDragEnd = async (event: DragEndEvent) => {
    const { active, over, delta } = event;
    const activeId = String(active.id);
    
    // Remove dragging class from body
    document.body.classList.remove('dragging');
    
    setActiveAlbumId(null);
    setActiveFolderId(null);
    setDragOverFolderId(null);
    setDragOverUncategorized(false);
    setPlaceholderInfo(null);
    
    // Re-enable scrolling after drag
    enableTouchScroll();

    if (!over) return;

    let overId = String(over.id);
    
    // Manual fallback: if dropped on itself, check if final position is over uncategorized section
    if (overId === activeId && uncategorizedSectionRef.current) {
      // Get the active element's rect and calculate final position after drag
      const activeElement = document.querySelector(`[data-album-name="${activeId}"]`);
      if (activeElement) {
        const activeRect = activeElement.getBoundingClientRect();
        const finalX = activeRect.left + delta.x + (activeRect.width / 2);
        const finalY = activeRect.top + delta.y + (activeRect.height / 2);
        
        const uncategorizedRect = uncategorizedSectionRef.current.getBoundingClientRect();
        const isOverUncategorized = 
          finalX >= uncategorizedRect.left &&
          finalX <= uncategorizedRect.right &&
          finalY >= uncategorizedRect.top &&
          finalY <= uncategorizedRect.bottom;
        
        if (isOverUncategorized) {
          overId = 'uncategorized-grid';
        }
      }
    }

    // Handle folder reordering (not album dragging)
    if (activeId.startsWith('folder-') && overId.startsWith('folder-')) {
      const oldIndex = localFolders.findIndex(f => `folder-${f.id}` === activeId);
      const newIndex = localFolders.findIndex(f => `folder-${f.id}` === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reorderedFolders = arrayMove(localFolders, oldIndex, newIndex);
        setLocalFolders(reorderedFolders);
        setHasUnsavedChanges(true);
      }
      return;
    }

    // From here on, we're dealing with album dragging
    if (activeId.startsWith('folder-')) return;

    // Case 1: Dropped on empty uncategorized grid (or dragOverUncategorized flag is set)
    if (overId === 'uncategorized-grid' || (dragOverUncategorized && overId === activeId)) {
      console.log('📦 Moving to uncategorized grid');
      const album = localAlbums.find(a => a.name === activeId);
      if (album && album.folder_id !== null) {
        // Update locally without saving - preserve published state
        setLocalAlbums(prevAlbums => 
          prevAlbums.map(a => 
            a.name === activeId 
              ? { ...a, folder_id: null }  // Keep existing published state
              : a
          )
        );
        setHasUnsavedChanges(true);
      }
      return;
    }

    // Case 2: Dropped on empty folder grid
    if (overId.startsWith('folder-grid-')) {
      const folderId = parseInt(overId.replace('folder-grid-', ''));
      console.log('📁 Moving to folder grid:', folderId);
      const targetFolder = localFolders.find(f => f.id === folderId);
      const targetPublishedStatus = targetFolder ? targetFolder.published : true;
      
      // Update locally without saving
      setLocalAlbums(prevAlbums => 
        prevAlbums.map(a => 
          a.name === activeId 
            ? { ...a, folder_id: folderId, published: targetPublishedStatus }
            : a
        )
      );
      setHasUnsavedChanges(true);
      return;
    }

    // Case 3: Dropped on another album (positioning within a grid)
    if (!activeId.startsWith('folder-') && !overId.startsWith('folder-') && active.id !== over.id) {
      const activeAlbum = localAlbums.find((album) => album.name === active.id);
      const overAlbum = localAlbums.find((album) => album.name === over.id);

      if (!activeAlbum || !overAlbum) return;

      // Case 3a: Moving album to a different folder/context with positioning
      if (activeAlbum.folder_id !== overAlbum.folder_id) {
        const targetFolderId = overAlbum.folder_id ?? null;
        const targetFolder = targetFolderId ? localFolders.find(f => f.id === targetFolderId) : null;
        // If moving to folder, inherit folder's published status; if uncategorized, keep album's current status
        const targetPublishedStatus = targetFolder ? targetFolder.published : activeAlbum.published;
        
        // Get albums in the target context BEFORE moving
        const targetContextAlbums = localAlbums.filter(
          (album) => album.folder_id === targetFolderId
        );
        
        // Create moved album with new folder_id
        const movedAlbum = { ...activeAlbum, folder_id: targetFolderId, published: targetPublishedStatus };
        
        // Add moved album to target context at the position of overAlbum
        const targetIndex = targetContextAlbums.findIndex((a) => a.name === overId);
        const newTargetContext = [...targetContextAlbums];
        newTargetContext.splice(targetIndex, 0, movedAlbum);
        
        // Update all albums: remove from old context, add to new context with positioning
        const updatedAlbums = localAlbums
          .filter(album => album.name !== activeId) // Remove from old position
          .map(album => {
            // If in target context, update with new positioned order
            if (album.folder_id === targetFolderId) {
              const newContextIndex = newTargetContext.findIndex((a) => a.name === album.name);
              if (newContextIndex !== -1) {
                return newTargetContext[newContextIndex];
              }
            }
            return album;
          });
        
        // Add moved album if not already in the list
        if (!updatedAlbums.some(a => a.name === activeId)) {
          const insertIndex = updatedAlbums.findIndex(a => a.folder_id === targetFolderId);
          if (insertIndex !== -1) {
            updatedAlbums.splice(insertIndex + targetIndex, 0, movedAlbum);
          } else {
            updatedAlbums.push(movedAlbum);
          }
        }
        
        // Update local state only, don't save yet
        setLocalAlbums(updatedAlbums);
        setHasUnsavedChanges(true);
        return;
      }

      // Case 3b: Reordering within the same context

      // Filter albums to only those in the same context (same folder_id or both null)
      const contextFolderId = activeAlbum.folder_id;
      const contextAlbums = localAlbums.filter(
        (album) => album.folder_id === contextFolderId
      );

      // Find indices within the context-specific list
      const oldIndex = contextAlbums.findIndex((album) => album.name === active.id);
      const newIndex = contextAlbums.findIndex((album) => album.name === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Reorder only within the context-specific list
        const reorderedContextAlbums = arrayMove(contextAlbums, oldIndex, newIndex);

        // Rebuild the full albums array with the reordered context albums
        const otherAlbums = localAlbums.filter(album => album.folder_id !== contextFolderId);
        const updatedAlbums = [...otherAlbums, ...reorderedContextAlbums].sort((a, b) => {
          // Sort to maintain the original interleaving of different contexts
          const aIndex = localAlbums.findIndex(album => album.name === a.name);
          const bIndex = localAlbums.findIndex(album => album.name === b.name);
          return aIndex - bIndex;
        });
        
        // Actually, let's do this properly by replacing in-place
        const result: Album[] = [];
        let contextIndex = 0;
        
        for (const album of localAlbums) {
          if (album.folder_id === contextFolderId) {
            // Replace with album from reordered list
            if (contextIndex < reorderedContextAlbums.length) {
              result.push(reorderedContextAlbums[contextIndex]);
              contextIndex++;
            }
          } else {
            // Keep albums from other contexts in their original positions
            result.push(album);
          }
        }
        
        // Update local state only, don't save yet
        console.log('📝 Case 3b: Setting local albums (reordering within context)');
        console.log('📝 Updated albums:', result.filter(a => a.folder_id === contextFolderId).map(a => a.name));
        setLocalAlbums(result);
        console.log('📝 Setting hasUnsavedChanges to true');
        setHasUnsavedChanges(true);
      }
      return;
    }

    // Case 3: Reordering folders
    if (activeId.startsWith('folder-') && overId.startsWith('folder-') && active.id !== over.id) {
      const activeFolderId = parseInt(activeId.replace('folder-', ''));
      const overFolderId = parseInt(overId.replace('folder-', ''));
      
      const oldIndex = localFolders.findIndex((folder) => folder.id === activeFolderId);
      const newIndex = localFolders.findIndex((folder) => folder.id === overFolderId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedFolders = arrayMove(localFolders, oldIndex, newIndex);
        
        // Optimistically update local state
        setLocalFolders(reorderedFolders);

        try {
          await fetchWithRateLimitCheck(`${API_URL}/api/folders/sort-order`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              folderOrders: reorderedFolders.map((folder, index) => ({
                name: folder.name,
                sort_order: index,
              })),
            }),
          });
          
          // Dispatch global event to update navigation dropdown
          window.dispatchEvent(new Event('albums-updated'));
        } catch (err) {
          console.error('Failed to save folder order:', err);
          setMessage({ type: 'error', text: 'Failed to save folder order' });
          // Revert on error
          await loadAlbums();
        }
      }
    }
  };

  // Handle drag-and-drop on album tiles to upload photos
  const handleAlbumTileDragOver = (e: React.DragEvent, albumName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverAlbum(albumName);
  };

  const handleAlbumTileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverAlbum(null);
  };

  const handleAlbumTileDrop = async (e: React.DragEvent, albumName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverAlbum(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Filter for image files only
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setMessage({ type: 'error', text: 'No valid image files found' });
      return;
    }

    // Upload to the album
    await handleUploadToAlbum(albumName, imageFiles);
  };

  // Handle drag-and-drop on ghost tile to create new album
  const handleGhostTileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGhostAlbumDragOver(true);
  };

  const handleGhostTileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGhostAlbumDragOver(false);
  };

  const handleGhostTileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGhostAlbumDragOver(false);

    // Show loading message
    setMessage({ type: 'success', text: 'Reading folder contents...' });

    try {
      let imageFiles: File[] = [];
      let rawFolderName = '';

      // Function to recursively read directory entries with batched reading
      const readEntryRecursively = async (entry: any): Promise<File[]> => {
        const files: File[] = [];
        
        if (entry.isFile) {
          return new Promise((resolve) => {
            entry.file((file: File) => {
              if (file.type.startsWith('image/')) {
                files.push(file);
              }
              resolve(files);
            });
          });
        } else if (entry.isDirectory) {
          const dirReader = entry.createReader();
          
          return new Promise((resolve) => {
            const readBatch = async () => {
              dirReader.readEntries(async (entries: any[]) => {
                if (entries.length === 0) {
                  resolve(files);
                  return;
                }
                
                for (const entry of entries) {
                  const entryFiles = await readEntryRecursively(entry);
                  files.push(...entryFiles);
                }
                
                // Read next batch (directories may have more than 100 entries)
                await readBatch();
              });
            };
            
            readBatch();
          });
        }
        
        return files;
      };

      // Check if we have dataTransfer items (better for folder handling)
      if (e.dataTransfer.items) {
        const items = Array.from(e.dataTransfer.items);
        
        // Process all dropped items
        for (const item of items) {
          if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry?.();
            if (entry) {
              if (entry.isDirectory && !rawFolderName) {
                rawFolderName = entry.name;
              }
              const files = await readEntryRecursively(entry);
              imageFiles.push(...files);
            }
          }
        }
      }

      // Fallback for browsers without dataTransfer.items support
      if (imageFiles.length === 0) {
        const files = Array.from(e.dataTransfer.files);
        imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        // Try to extract folder name from webkitRelativePath
        const firstFile = imageFiles[0] as File & { webkitRelativePath?: string };
        if (firstFile?.webkitRelativePath) {
          const parts = firstFile.webkitRelativePath.split('/');
          if (parts.length > 1) {
            rawFolderName = parts[0];
          }
        }
      }

      // Check if we found any image files
      if (imageFiles.length === 0) {
        setMessage({ type: 'error', text: 'No valid image files found in the dropped folder' });
        return;
      }

      // Sanitize and title case the folder name
      const suggestedAlbumName = sanitizeAndTitleCase(rawFolderName);

      // Show modal to name the new album with suggested name
      setNewAlbumFiles(imageFiles);
      setShowNewAlbumModal(true);
      setNewAlbumModalName(suggestedAlbumName);
    } catch (error) {
      console.error('Error reading dropped items:', error);
      setMessage({ type: 'error', text: 'Error reading files' });
    }
  };

  // Handle click on ghost tile (for mobile/manual file selection)
  const handleGhostTileClick = () => {
    ghostTileFileInputRef.current?.click();
  };

  // Handle clicking ghost tile in a folder
  const handleCreateAlbumInFolder = (folderId: number) => {
    setTargetFolderId(folderId);
    ghostTileFileInputRef.current?.click();
  };

  // Handle saving all changes
  const handleSaveChanges = async () => {
    try {
      // Save folder order
      const folderOrders = localFolders.map((folder, index) => ({
        name: folder.name,
        sort_order: index,
      }));

      const folderResponse = await fetchWithRateLimitCheck(
        `${API_URL}/api/folders/sort-order`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ folderOrders }),
        }
      );

      if (!folderResponse.ok) throw new Error('Failed to save folder order');

      // Save album positions and folder assignments
      const albumOrders = localAlbums.map((album, index) => ({
        name: album.name,
        sort_order: index,
        folder_id: album.folder_id,
        published: album.published,
      }));

      const albumResponse = await fetchWithRateLimitCheck(
        `${API_URL}/api/albums/batch-update`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ albums: albumOrders }),
        }
      );

      if (!albumResponse.ok) {
        // Fall back to individual updates if batch endpoint doesn't exist
        for (const album of localAlbums) {
          const originalAlbum = albums.find(a => a.name === album.name);
          if (!originalAlbum) continue;

          // Check if folder_id or published changed
          if (originalAlbum.folder_id !== album.folder_id || originalAlbum.published !== album.published) {
            const folder = localFolders.find(f => f.id === album.folder_id);
            await fetchWithRateLimitCheck(
              `${API_URL}/api/albums/${encodeURIComponent(album.name)}/move`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  folderName: folder?.name || null,
                  published: album.published,
                }),
              }
            );
          }
        }

        // Update sort orders by context
        const contexts = new Map<number | null, Album[]>();
        localAlbums.forEach(album => {
          const contextKey = album.folder_id;
          if (!contexts.has(contextKey)) {
            contexts.set(contextKey, []);
          }
          contexts.get(contextKey)!.push(album);
        });

        for (const [_, contextAlbums] of contexts) {
          const albumOrders = contextAlbums.map((album, index) => ({
            name: album.name,
            sort_order: index,
          }));

          await fetchWithRateLimitCheck(
            `${API_URL}/api/albums/sort-order`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ albumOrders }),
            }
          );
        }
      }

      setMessage({ type: 'success', text: 'Changes saved successfully!' });
      setHasUnsavedChanges(false);
      
      // Reload to ensure we're in sync with server
      await loadAlbums();
      window.dispatchEvent(new Event('albums-updated'));
    } catch (error) {
      console.error('Error saving changes:', error);
      setMessage({ type: 'error', text: 'Failed to save changes' });
    }
  };

  // Handle canceling changes
  const handleCancelChanges = () => {
    setLocalAlbums(albums);
    setLocalFolders(folders);
    setHasUnsavedChanges(false);
    setMessage({ type: 'success', text: 'Changes discarded' });
  };

  // Handle file selection from ghost tile input
  const handleGhostTileFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setMessage({ type: 'error', text: 'No valid image files found' });
      return;
    }

    // Try to extract folder name from the selected files
    let rawFolderName = '';
    const firstFile = imageFiles[0] as File & { webkitRelativePath?: string };
    
    if (firstFile.webkitRelativePath) {
      // Extract folder name from path like "FolderName/image.jpg"
      const parts = firstFile.webkitRelativePath.split('/');
      if (parts.length > 1) {
        rawFolderName = parts[0];
      }
    }

    // Sanitize and title case the folder name
    const suggestedAlbumName = sanitizeAndTitleCase(rawFolderName);

    // Show modal to name the new album with suggested name
    setNewAlbumFiles(imageFiles);
    setShowNewAlbumModal(true);
    setNewAlbumModalName(suggestedAlbumName);
    
    // Reset the input
    e.target.value = '';
  };

  // Helper function to upload files to a specific album
  const handleUploadToAlbum = async (albumName: string, files: File[]) => {
    if (files.length === 0) return;

    console.log(`📤 Starting upload of ${files.length} files to album: ${albumName}`);

    // Prepare uploading images
    const newUploadingImages: UploadingImage[] = files.map(file => ({
      file,
      filename: file.name,
      state: 'queued' as UploadState,
      thumbnailUrl: URL.createObjectURL(file)
    }));

    setUploadingImages(newUploadingImages);
    selectAlbum(albumName);

    // Upload each file - SSE events will handle state updates
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📤 Uploading file ${i + 1}/${files.length}: ${file.name}`);
      try {
        await uploadSingleImage(file, file.name, albumName);
        console.log(`✅ Upload initiated for: ${file.name}`);
      } catch (error) {
        console.error(`❌ Failed to upload ${file.name}:`, error);
        // Continue with next file even if one fails
      }
    }

    // All uploads initiated - SSE events will update state and trigger reload
    console.log(`✅ All uploads initiated. Processing will complete via SSE events...`);
  };

  // Handle creating new album from modal
  const handleCreateAlbumFromModal = async () => {
    if (!newAlbumModalName.trim()) {
      setMessage({ type: 'error', text: 'Album name cannot be empty' });
      return;
    }

    const sanitized = newAlbumModalName.trim().replace(/[^a-zA-Z0-9\s-]/g, '');
    if (!sanitized) {
      setMessage({ type: 'error', text: 'Album name contains no valid characters' });
      return;
    }

    try {
      // Create the album first
      const res = await fetch(`${API_URL}/api/albums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: sanitized }),
      });

      if (res.ok) {
        await loadAlbums();
        trackAlbumCreated(sanitized);
        
        // If creating in a folder, move the album to that folder
        if (targetFolderId !== null) {
          await handleMoveAlbumToFolder(sanitized, targetFolderId);
        }
        
        // Close modal and upload files
        setShowNewAlbumModal(false);
        setMessage({ type: 'success', text: `Album "${sanitized}" created!` });
        
        // Upload the files
        await handleUploadToAlbum(sanitized, newAlbumFiles);
        
        // Clear state
        setNewAlbumFiles([]);
        setNewAlbumModalName('');
        setTargetFolderId(null);
      } else {
        const errorData = await res.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to create album' });
      }
    } catch (err) {
      console.error('Failed to create album:', err);
      setMessage({ type: 'error', text: 'Error creating album' });
    }
  };


  // Save photo order




  const shuffleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const slowdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speedupTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const shuffleButtonRef = useRef<HTMLButtonElement | null>(null);

  // Single click shuffle - instantly shuffle all photos
  const handleShuffleClick = () => {
    if (savingOrder) return;
    
    setHasEverDragged(true); // Mark that user has reordered
    
    // Fisher-Yates shuffle algorithm for complete randomization
    setAlbumPhotos((currentPhotos) => {
      const newOrder = [...currentPhotos];
      for (let i = newOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
      }
      return newOrder;
    });
  };

  // Speed up animation when button is pressed and held - start continuous shuffling
  const handleShuffleStart = () => {
    if (savingOrder) return;
    
    setHasEverDragged(true); // Mark that user has reordered
    setIsShuffling(true); // Mark shuffling state for mobile grid scaling
    
    const button = shuffleButtonRef.current;
    if (!button) return;
    
    button.classList.add('shuffling-active');
    
    // Add zoom class to all photos during shuffle
    const photoElements = document.querySelectorAll('.admin-photo-item');
    photoElements.forEach((el) => {
      el.classList.add('shuffling-active');
    });
    
    // Calculate speed multiplier based on album size
    // Speed increases linearly with album size: speed = base_speed * (num_photos / 20)
    // Since interval is inverse of speed: interval = base_interval / (num_photos / 20)
    const albumSize = albumPhotos.length;
    const speedMultiplier = 20 / Math.max(albumSize, 1); // Prevent division by zero
    
    // Start continuous shuffling with progressive speed increase
    let currentInterval = 100 * speedMultiplier; // Adjust base speed by album size
    let currentAnimationSpeed = 0.4; // Starting animation speed in seconds
    
    // Update button border animation speed
    const updateButtonSpeed = (speed: number) => {
      if (shuffleButtonRef.current) {
        shuffleButtonRef.current.style.setProperty('--animation-speed', `${speed}s`);
      }
    };
    
    const startShuffling = (interval: number) => {
      if (shuffleIntervalRef.current) {
        clearInterval(shuffleIntervalRef.current);
      }
      
      shuffleIntervalRef.current = setInterval(() => {
        setAlbumPhotos((currentPhotos) => {
          const newOrder = [...currentPhotos];
          // Pick two random indices
          const i = Math.floor(Math.random() * newOrder.length);
          const j = Math.floor(Math.random() * newOrder.length);
          
          // Swap them
          if (i !== j) {
            [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
          }
          
          return newOrder;
        });
      }, interval);
    };
    
    startShuffling(currentInterval);
    updateButtonSpeed(currentAnimationSpeed);
    
    // Speed up by 20% every 500ms for 3 seconds (6 iterations)
    for (let i = 1; i <= 6; i++) {
      const timeout = setTimeout(() => {
        currentInterval = currentInterval * 0.8; // Reduce interval by 20% = 20% faster
        currentAnimationSpeed = currentAnimationSpeed * 0.8; // Speed up animation by 20%
        startShuffling(currentInterval);
        updateButtonSpeed(currentAnimationSpeed);
      }, i * 500);
      speedupTimeoutsRef.current.push(timeout);
    }
  };

  const shuffleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const handleShuffleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    shuffleButtonRef.current = e.currentTarget;
    isLongPressRef.current = false;
    
    // Start long press after 200ms
    shuffleClickTimeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      handleShuffleStart();
    }, 200);
  };

  // Stop shuffling and slow down animation when button is released
  const handleShuffleEnd = () => {
    const button = shuffleButtonRef.current;
    if (!button) return;
    
    // Clear all speedup timeouts
    speedupTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    speedupTimeoutsRef.current = [];
    
    // Stop shuffling
    if (shuffleIntervalRef.current) {
      clearInterval(shuffleIntervalRef.current);
      shuffleIntervalRef.current = null;
    }
    
    // Remove zoom class from photos
    const photoElements = document.querySelectorAll('.admin-photo-item');
    setTimeout(() => {
      photoElements.forEach((el) => {
        el.classList.remove('shuffling-active');
      });
    }, 200);
    
    // Transition to medium speed
    button.classList.remove('shuffling-active');
    button.classList.add('shuffling-slowing');
    
    // Reset animation speed to medium (1.2s)
    button.style.setProperty('--animation-speed', '1.2s');
    
    // Return to normal speed
    slowdownTimeoutRef.current = setTimeout(() => {
      button.classList.remove('shuffling-slowing');
      button.style.removeProperty('--animation-speed');
      shuffleButtonRef.current = null;
      setIsShuffling(false); // End shuffling state
    }, 1000);
  };

  const handleShuffleMouseUp = () => {
    // Clear the long press timeout
    if (shuffleClickTimeoutRef.current) {
      clearTimeout(shuffleClickTimeoutRef.current);
      shuffleClickTimeoutRef.current = null;
    }
    
    // If it was a long press, end the animation
    if (isLongPressRef.current) {
      handleShuffleEnd();
    } else {
      // It was a quick click - do instant shuffle
      handleShuffleClick();
    }
    
    isLongPressRef.current = false;
  };

  const handleShuffleMouseLeave = () => {
    // Clear the long press timeout
    if (shuffleClickTimeoutRef.current) {
      clearTimeout(shuffleClickTimeoutRef.current);
      shuffleClickTimeoutRef.current = null;
    }
    
    // If animation is running, just stop it (don't do instant shuffle)
    if (isLongPressRef.current) {
      handleShuffleEnd();
    }
    
    isLongPressRef.current = false;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (shuffleIntervalRef.current) {
        clearInterval(shuffleIntervalRef.current);
      }
      if (slowdownTimeoutRef.current) {
        clearTimeout(slowdownTimeoutRef.current);
      }
      if (shuffleClickTimeoutRef.current) {
        clearTimeout(shuffleClickTimeoutRef.current);
      }
      speedupTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);







  const handleDeleteAlbum = async (albumName: string) => {
    // Save any unsaved changes first (pass current localAlbums state)
    if (hasUnsavedChanges) {
      const saved = await albumManagement.saveAlbumOrder(localAlbums);
      if (!saved) {
        // If save failed, don't proceed with deletion
        return;
      }
    }
    
    const confirmed = await showConfirmation(`Delete album "${albumName}" and all its photos?\n\nThis action cannot be undone.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/albums/${encodeURIComponent(albumName)}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `Album "${albumName}" deleted` });
        trackAlbumDeleted(albumName);
        if (selectedAlbum === albumName) deselectAlbum();
        await loadAlbums();
        window.dispatchEvent(new Event('albums-updated'));
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to delete album' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };

  const handleTogglePublished = async (albumName: string, currentPublished: boolean, event?: React.MouseEvent) => {
    // Prevent default behavior and stop propagation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Save scroll position
    const scrollPosition = window.scrollY;
    
    // Trigger animation
    setAnimatingAlbum(albumName);
    const newPublished = !currentPublished;
    
    try {
      const res = await fetch(`${API_URL}/api/albums/${encodeURIComponent(albumName)}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ published: newPublished }),
      });

      if (res.ok) {
        // Wait for animation to complete (300ms for flip to middle)
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Update albums state
        await loadAlbums();
        
        // Wait for rest of animation
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setMessage({ 
          type: 'success', 
          text: `Album "${albumName}" ${newPublished ? 'published' : 'unpublished'}` 
        });
        
        // Update navigation dropdown silently
        window.dispatchEvent(new Event('albums-updated'));
        
        // Clear animation and restore scroll
        setAnimatingAlbum(null);
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPosition);
        });
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update album' });
        setAnimatingAlbum(null);
        // Revert optimistic update
        await loadAlbums();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
      setAnimatingAlbum(null);
      // Revert optimistic update
      await loadAlbums();
    }
  };

  const uploadSingleImage = async (file: File, filename: string, targetAlbum?: string, retryCount = 0): Promise<void> => {
    const albumToUse = targetAlbum || selectedAlbum;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // Start with 1 second
    const SSE_TIMEOUT = 300000; // 5 minutes timeout for SSE connection
    
    // Check file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      setUploadingImages(prev => prev.map(img => 
        img.filename === filename 
          ? { ...img, state: 'error' as UploadState, error: 'File too large (max 100MB)' }
          : img
      ));
      setMessage({ type: 'error', text: `Error: ${filename} is too large (max 100MB)` });
      return;
    }
    
    // Update state to uploading (show retry attempt if retrying)
    setUploadingImages(prev => prev.map(img => 
      img.filename === filename 
        ? { 
            ...img, 
            state: 'uploading' as UploadState,
            error: retryCount > 0 ? `Retry attempt ${retryCount}/${MAX_RETRIES}` : undefined
          } 
        : img
    ));

      try {
        const formData = new FormData();
        formData.append('photo', file);

        // Use XMLHttpRequest for upload progress and SSE response
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          let uploadComplete = false;
          let lastActivityTime = Date.now();
          
          // Set up SSE timeout detection
          const timeoutChecker = setInterval(() => {
            const timeSinceActivity = Date.now() - lastActivityTime;
            if (timeSinceActivity > SSE_TIMEOUT && !uploadComplete) {
              clearInterval(timeoutChecker);
              xhr.abort();
              reject(new Error(`Connection timeout (no activity for ${Math.round(SSE_TIMEOUT / 1000)}s)`));
            }
          }, 5000); // Check every 5 seconds
          
          // Track upload progress
          xhr.upload.addEventListener('progress', (e) => {
            lastActivityTime = Date.now();
            if (e.lengthComputable) {
              const percentComplete = Math.round((e.loaded / e.total) * 100);
              setUploadingImages(prev => prev.map(img => 
                img.filename === filename ? { ...img, progress: percentComplete } : img
              ));
            }
          });

          // Handle SSE response stream
          xhr.addEventListener('readystatechange', () => {
            lastActivityTime = Date.now();
            if (xhr.readyState === XMLHttpRequest.LOADING || xhr.readyState === XMLHttpRequest.DONE) {
              const responseText = xhr.responseText;
              const lines = responseText.split('\n');
              
              lines.forEach((line) => {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.substring(6));
                    
                    if (data.type === 'uploaded') {
                      // Upload complete, start optimizing
                      setUploadingImages(prev => prev.map(img => 
                        img.filename === filename 
                          ? { ...img, state: 'optimizing' as UploadState, progress: 100, optimizeProgress: 0 } 
                          : img
                      ));
                      // Resolve immediately after upload completes
                      // Optimization will continue in background
                      if (!uploadComplete) {
                        uploadComplete = true;
                        resolve();
                      }
                    } else if (data.type === 'progress') {
                      // Update optimization progress (in background)
                      setUploadingImages(prev => prev.map(img => 
                        img.filename === filename 
                          ? { ...img, optimizeProgress: data.progress } 
                          : img
                      ));
                    } else if (data.type === 'complete') {
                      // Optimization complete
                      clearInterval(timeoutChecker);
                      const thumbnailUrl = `${API_URL}/optimized/thumbnail/${albumToUse}/${filename}?i=${Date.now()}`;
                      setUploadingImages(prev => {
                        const updated = prev.map(img => 
                          img.filename === filename 
                            ? { ...img, state: 'complete' as UploadState, thumbnailUrl, optimizeProgress: 100 } 
                            : img
                        );
                        // Check if all done after state update
                        setTimeout(() => checkAndReloadIfComplete(albumToUse!), 100);
                        return updated;
                      });
                      trackPhotoUploaded(albumToUse!, 1, [filename]);
                      // If AI generation follows, we'll update the display
                    } else if (data.type === 'ai-generating') {
                      // AI title generation starting - change state back to show progress
                      setUploadingImages(prev => prev.map(img => 
                        img.filename === filename 
                          ? { ...img, state: 'optimizing' as UploadState, error: '🤖 Generating AI title...' } 
                          : img
                      ));
                    } else if (data.type === 'ai-processing') {
                      // AI title generation in progress
                      setUploadingImages(prev => prev.map(img => 
                        img.filename === filename 
                          ? { ...img, error: '🤖 Generating title...' } 
                          : img
                      ));
                    } else if (data.type === 'ai-complete') {
                      // AI title generation complete - mark as complete again
                      console.log(`✨ AI title generated for ${filename}: "${data.title}"`);
                      setUploadingImages(prev => {
                        const updated = prev.map(img => 
                          img.filename === filename 
                            ? { ...img, state: 'complete' as UploadState, error: undefined } 
                            : img
                        );
                        // Check if all done after state update
                        setTimeout(() => checkAndReloadIfComplete(albumToUse!), 100);
                        return updated;
                      });
                    } else if (data.type === 'ai-error') {
                      // AI title generation failed (non-fatal) - mark complete
                      console.warn(`AI title generation failed for ${filename}:`, data.error);
                      setUploadingImages(prev => {
                        const updated = prev.map(img => 
                          img.filename === filename 
                            ? { ...img, state: 'complete' as UploadState, error: undefined } 
                            : img
                        );
                        // Check if all done after state update
                        setTimeout(() => checkAndReloadIfComplete(albumToUse!), 100);
                        return updated;
                      });
                    } else if (data.type === 'error') {
                      // Error occurred
                      clearInterval(timeoutChecker);
                      setUploadingImages(prev => {
                        const updated = prev.map(img => 
                          img.filename === filename 
                            ? { ...img, state: 'error' as UploadState, error: data.error } 
                            : img
                        );
                        // Check if all done after state update
                        setTimeout(() => checkAndReloadIfComplete(albumToUse!), 100);
                        return updated;
                      });
                      setMessage({ type: 'error', text: `Error processing ${filename}: ${data.error}` });
                      if (!uploadComplete) {
                        uploadComplete = true;
                        reject(new Error(data.error));
                      }
                    }
                  } catch (e) {
                    // Ignore parse errors for incomplete data
                  }
                }
              });
            }
          });

          // Handle network errors
          xhr.addEventListener('error', () => {
            clearInterval(timeoutChecker);
            const statusText = xhr.status ? `HTTP ${xhr.status}` : 'Network connection failed';
            reject(new Error(`${statusText} - Unable to reach server`));
          });
          
          // Handle abort
          xhr.addEventListener('abort', () => {
            clearInterval(timeoutChecker);
            reject(new Error('Connection aborted'));
          });
          
          // Handle HTTP errors
          xhr.addEventListener('load', () => {
            if (xhr.status >= 400 && xhr.status < 600) {
              clearInterval(timeoutChecker);
              let errorMsg = `HTTP ${xhr.status}`;
              try {
                const errorData = JSON.parse(xhr.responseText);
                if (errorData.error) {
                  errorMsg += `: ${errorData.error}`;
                }
              } catch (e) {
                errorMsg += `: ${xhr.statusText || 'Server error'}`;
              }
              reject(new Error(errorMsg));
            }
          });

          if (!albumToUse) {
            clearInterval(timeoutChecker);
            reject(new Error('No album selected'));
            return;
          }

          xhr.open('POST', `${API_URL}/api/albums/${encodeURIComponent(albumToUse)}/upload`);
          xhr.withCredentials = true;
          xhr.send(formData);
        });
    } catch (err: any) {
      // Check if we should retry
      const isRetryable = err.message?.includes('timeout') || 
                          err.message?.includes('Network connection failed') ||
                          err.message?.includes('Connection aborted') ||
                          err.message?.includes('Unable to reach server');
      
      if (isRetryable && retryCount < MAX_RETRIES) {
        // Wait before retrying (exponential backoff)
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Retrying ${filename} in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        // Note: Using 'success' type for retry message since 'info' type doesn't exist
        setMessage({ type: 'success', text: `Retrying ${filename} in ${Math.round(delay / 1000)}s...` });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return uploadSingleImage(file, filename, targetAlbum, retryCount + 1);
      }
      
      // Max retries exceeded or non-retryable error
      const errorMsg = retryCount >= MAX_RETRIES 
        ? `${err.message || 'Network error'} (failed after ${MAX_RETRIES} retries)`
        : err.message || 'Network error';
        
      setUploadingImages(prev => prev.map(img => 
        img.filename === filename 
          ? { ...img, state: 'error' as UploadState, error: errorMsg }
          : img
      ));
      setMessage({ type: 'error', text: `Error uploading ${filename}: ${errorMsg}` });
    }
  };

  const processFiles = async (files: FileList | File[], targetAlbum?: string) => {
    const albumToUse = targetAlbum || selectedAlbum;
    if (!files || files.length === 0 || !albumToUse) return;

    // Filter for image files only
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      setMessage({ type: 'error', text: 'No valid image files selected' });
      return;
    }

    if (imageFiles.length < files.length) {
      setMessage({ type: 'error', text: `${files.length - imageFiles.length} non-image file(s) skipped` });
    }

    // Initialize all files as queued
    const newUploadingImages: UploadingImage[] = imageFiles.map(file => ({
      file,
      filename: file.name,
      state: 'queued' as UploadState,
      progress: 0
    }));
    
    setUploadingImages(newUploadingImages);

    // Upload files sequentially (one at a time)
    // But let optimizations run in parallel in the background
    for (const img of newUploadingImages) {
      await uploadSingleImage(img.file, img.filename, albumToUse);
      // Note: uploadSingleImage starts optimization in background (non-blocking)
      // So multiple optimizations can run simultaneously while we upload the next file
    }

    // Wait for all optimizations to complete
    // Check every second until all images are done (complete or error)
    await new Promise<void>((resolve) => {
      const checkComplete = setInterval(() => {
        const allDone = uploadingImagesRef.current.every(img => 
          img.state === 'complete' || img.state === 'error'
        );
        
        if (allDone) {
          clearInterval(checkComplete);
          resolve();
        }
      }, 1000);
      
      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(checkComplete);
        resolve();
      }, 120000);
    });

    // Reload photos after all uploads and optimizations complete
    if (albumToUse) {
      await loadPhotos(albumToUse);
    }

    // Clear uploading images after reload to prevent duplicates
    setUploadingImages([]);
    
    setMessage({ type: 'success', text: `Upload complete! Processed ${newUploadingImages.length} image(s)` });
  };

  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    await processFiles(files);
    
    // Clear the input
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // Only handle file drops, not photo reordering
    if (!e.dataTransfer.types.includes('Files')) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only handle file drops, not photo reordering
    if (!e.dataTransfer.types.includes('Files')) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    // Only handle file drops, not photo reordering
    if (!e.dataTransfer.types.includes('Files')) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!selectedAlbum || uploadingImages.length > 0) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  // Recursively read all files from a directory entry
  const readDirectoryRecursive = async (dirEntry: any): Promise<File[]> => {
    const files: File[] = [];
    const dirReader = dirEntry.createReader();
    
    return new Promise((resolve) => {
      const readEntries = () => {
        dirReader.readEntries(async (entries: any[]) => {
          if (entries.length === 0) {
            resolve(files);
            return;
          }

          for (const entry of entries) {
            if (entry.isFile) {
              // Get the file
              const file: File = await new Promise((resolveFile) => {
                entry.file((f: File) => resolveFile(f));
              });
              
              // Only add image files
              if (file.type.startsWith('image/')) {
                files.push(file);
              }
            } else if (entry.isDirectory) {
              // Recursively read subdirectory
              const subFiles = await readDirectoryRecursive(entry);
              files.push(...subFiles);
            }
          }

          // Read next batch of entries
          readEntries();
        });
      };

      readEntries();
    });
  };

  // Folder management handlers
  const handleCreateFolder = async () => {
    // Clear any previous error
    setFolderModalError('');
    
    if (!newFolderName.trim()) {
      setFolderModalError('Folder name cannot be empty');
      return;
    }

    const sanitized = newFolderName.trim().replace(/[^a-zA-Z0-9\s-]/g, '');
    if (!sanitized) {
      setFolderModalError('Folder name contains no valid characters');
      return;
    }

    try {
      // Create the folder first
      const res = await fetch(`${API_URL}/api/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: sanitized, published: false }),
      });

      if (res.ok) {
        const newFolder = await res.json();
        
        setMessage({ type: 'success', text: `Folder "${sanitized}" created!` });
        setShowFolderModal(false);
        setNewFolderName('');
        setFolderModalError('');
        
        // Add the new folder to local state (at the end)
        setLocalFolders(prev => [...prev, newFolder]);
        
        // If there were unsaved changes, keep them
        // The new folder is just added to the local state without affecting existing changes
        
        // Update navigation dropdown
        window.dispatchEvent(new Event('albums-updated'));
      } else {
        const errorData = await res.json();
        setFolderModalError(errorData.error || 'Failed to create folder');
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
      setFolderModalError('Error creating folder');
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    // Save any unsaved changes first (pass current localAlbums state)
    if (hasUnsavedChanges) {
      const saved = await albumManagement.saveAlbumOrder(localAlbums);
      if (!saved) {
        // If save failed, don't proceed with deletion
        return;
      }
    }
    
    // Check if folder has albums
    const folder = localFolders.find(f => f.name === folderName);
    const albumsInFolder = localAlbums.filter(a => a.folder_id === folder?.id);
    
    // If folder is empty, delete immediately without confirmation
    if (albumsInFolder.length === 0) {
      handleDeleteEmptyFolder(folderName);
      return;
    }
    
    // If folder has albums, show confirmation modal
    setDeletingFolderName(folderName);
    setShowDeleteFolderModal(true);
  };
  
  const handleDeleteEmptyFolder = async (folderName: string) => {
    try {
      const res = await fetch(`${API_URL}/api/folders/${encodeURIComponent(folderName)}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `Folder "${folderName}" deleted` });
        
        // Clear unsaved changes flag so the useEffect will sync with server data
        setHasUnsavedChanges(false);
        
        await loadAlbums();
        
        // Dispatch global event to update navigation dropdown
        window.dispatchEvent(new Event('albums-updated'));
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to delete folder' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };
  
  const handleDeleteFolderWithOption = async (deleteAlbums: boolean) => {
    if (!deletingFolderName) return;
    
    setShowDeleteFolderModal(false);
    
    try {
      const url = deleteAlbums
        ? `${API_URL}/api/folders/${encodeURIComponent(deletingFolderName)}?deleteAlbums=true`
        : `${API_URL}/api/folders/${encodeURIComponent(deletingFolderName)}`;
        
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        const message = deleteAlbums
          ? `Folder "${deletingFolderName}" and all its albums deleted`
          : `Folder "${deletingFolderName}" deleted, albums moved to root`;
        setMessage({ type: 'success', text: message });
        
        // Clear unsaved changes flag so the useEffect will sync with server data
        setHasUnsavedChanges(false);
        
        await loadAlbums();
        
        // Dispatch global event to update navigation dropdown
        window.dispatchEvent(new Event('albums-updated'));
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to delete folder' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setDeletingFolderName(null);
    }
  };

  const handleToggleFolderPublished = async (folderName: string, currentPublished: boolean) => {
    // Check if folder has albums
    const folder = localFolders.find(f => f.name === folderName);
    if (!folder) return;
    
    const albumsInFolder = localAlbums.filter(album => album.folder_id === folder.id);
    
    // Prevent publishing empty folders
    if (!currentPublished && albumsInFolder.length === 0) {
      setMessage({ 
        type: 'error', 
        text: 'Cannot publish empty folder. Add albums to this folder first.' 
      });
      return;
    }
    
    const newPublished = !currentPublished;
    
    // Optimistically update folder and all albums in it
    setLocalFolders(prevFolders =>
      prevFolders.map(f =>
        f.id === folder.id ? { ...f, published: newPublished } : f
      )
    );
    setLocalAlbums(prevAlbums =>
      prevAlbums.map(album =>
        album.folder_id === folder.id ? { ...album, published: newPublished } : album
      )
    );
    
    try {
      // Update folder published status
      const folderRes = await fetch(`${API_URL}/api/folders/${encodeURIComponent(folderName)}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ published: newPublished }),
      });

      if (!folderRes.ok) {
        const error = await folderRes.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update folder' });
        await loadAlbums(); // Revert on error
        return;
      }

      // Update all albums in the folder
      const albumUpdatePromises = albumsInFolder.map(album =>
        fetch(`${API_URL}/api/albums/${encodeURIComponent(album.name)}/publish`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ published: newPublished }),
        })
      );

      await Promise.all(albumUpdatePromises);

      setMessage({ 
        type: 'success', 
        text: `Folder "${folderName}" and ${albumsInFolder.length} ${albumsInFolder.length === 1 ? 'album' : 'albums'} ${newPublished ? 'published' : 'unpublished'}` 
      });
      
      // Sync with database
      await loadAlbums();
      
      // Dispatch global event to update navigation dropdown
      window.dispatchEvent(new Event('albums-updated'));
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
      await loadAlbums(); // Revert on error
    }
  };

  const handleMoveAlbumToFolder = async (albumName: string, folderId: number | null) => {
    const folderName = folderId ? localFolders.find(f => f.id === folderId)?.name : 'none';
    if (!folderName) {
      setMessage({ type: 'error', text: 'Invalid folder' });
      return;
    }

    // Get the target folder's published status (or keep album's current status if moving to uncategorized)
    const targetFolder = folderId ? localFolders.find(f => f.id === folderId) : null;
    const currentAlbum = localAlbums.find(a => a.name === albumName);
    const targetPublishedStatus = targetFolder ? targetFolder.published : (currentAlbum?.published ?? true);

    // Optimistically update the local state immediately for smooth UX
    setLocalAlbums(prevAlbums => 
      prevAlbums.map(album => 
        album.name === albumName 
          ? { ...album, folder_id: folderId, published: targetPublishedStatus }
          : album
      )
    );

    try {
      // Move the album to the folder
      const moveRes = await fetch(`${API_URL}/api/folders/${encodeURIComponent(folderName)}/albums/${encodeURIComponent(albumName)}`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!moveRes.ok) {
        const error = await moveRes.json();
        setMessage({ type: 'error', text: error.error || 'Failed to move album' });
        await loadAlbums(); // Revert on error
        return;
      }

      // Update the album's published status to match the folder
      const publishRes = await fetch(`${API_URL}/api/albums/${encodeURIComponent(albumName)}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ published: targetPublishedStatus }),
      });

      if (!publishRes.ok) {
        console.error('Failed to sync album published status with folder');
      }

      const folderDisplayName = folderId ? folderName : 'root level';
      const publishedText = targetPublishedStatus ? 'published' : 'unpublished';
      setMessage({ 
        type: 'success', 
        text: `Moved "${albumName}" to ${folderDisplayName} and ${publishedText}` 
      });
      
      // Wait a tiny bit for the server to finish processing before notifying
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Don't reload - we already updated optimistically
      window.dispatchEvent(new CustomEvent('albums-updated', { detail: { skipReload: true } }));
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
      // Revert on error
      await loadAlbums();
    }
  };


  const handleOpenRenameModal = (albumName: string) => {
    setRenamingAlbum(albumName);
    setNewAlbumName(albumName);
    setShowRenameModal(true);
  };

  const handleRenameAlbum = async () => {
    if (!renamingAlbum || !newAlbumName.trim()) {
      setMessage({ type: 'error', text: 'Album name cannot be empty' });
      return;
    }

    const sanitized = newAlbumName.trim().replace(/[^a-zA-Z0-9\s-]/g, '');
    if (!sanitized) {
      setMessage({ type: 'error', text: 'Album name contains no valid characters' });
      return;
    }

    if (sanitized === renamingAlbum) {
      setMessage({ type: 'error', text: 'New name must be different from current name' });
      return;
    }

    // Check if album with new name already exists
    if (localAlbums.some(a => a.name === sanitized)) {
      setMessage({ type: 'error', text: 'An album with that name already exists' });
      return;
    }

    try {
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/albums/${encodeURIComponent(renamingAlbum)}/rename`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ newName: sanitized }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to rename album' });
        return;
      }

      setMessage({ type: 'success', text: `Album renamed to "${sanitized}"` });
      setShowRenameModal(false);
      setRenamingAlbum(null);
      setNewAlbumName('');
      
      // If the renamed album was selected, update the selection
      if (selectedAlbum === renamingAlbum) {
        selectAlbum(sanitized);
      }
      
      await loadAlbums();
      
      // Dispatch global event to update navigation dropdown
      window.dispatchEvent(new Event('albums-updated'));
    } catch (err) {
      console.error('Failed to rename album:', err);
      setMessage({ type: 'error', text: 'Error renaming album' });
    }
  };

  // Process dropped items (handles folders)
  const handleDeletePhoto = async (album: string, filename: string, photoTitle: string = '') => {
    const confirmed = await showConfirmation(`Delete this photo${photoTitle ? ` (${photoTitle})` : ''}?\n\nThis action cannot be undone.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/albums/${encodeURIComponent(album)}/photos/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Photo deleted' });
        trackPhotoDeleted(album, filename, photoTitle || filename);
        await loadPhotos(album);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to delete photo' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };


  return (
    <>
      <section className="admin-section">
        <div>
          <h2>📸 Albums & Photos</h2>
          <p className="section-description">Manage your photo albums and upload new images. Drag and drop.</p>
        </div>
        
        {/* Unified Drag-and-Drop Context for Folders and Albums */}
        <DndContext
          sensors={albumSensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleAlbumDragStart}
          onDragOver={handleAlbumDragOver}
          onDragEnd={handleAlbumDragEnd}
        >
          {/* Single SortableContext for ALL albums (enables dragging between folders and uncategorized) */}
          <SortableContext
            items={localAlbums.map((album) => album.name)}
            strategy={rectSortingStrategy}
          >
          
          
          <AlbumToolbar
            hasUnsavedChanges={hasUnsavedChanges}
            localFoldersCount={localFolders.length}
            onCreateFolder={() => setShowFolderModal(true)}
            onSaveChanges={handleSaveChanges}
            onCancelChanges={handleCancelChanges}
          />
          
          <FoldersSection
            localFolders={localFolders}
            localAlbums={localAlbums}
            selectedAlbum={selectedAlbum}
            animatingAlbum={animatingAlbum}
            dragOverAlbum={dragOverAlbum}
            dragOverFolderId={dragOverFolderId}
            placeholderInfo={placeholderInfo}
            onDeleteFolder={handleDeleteFolder}
            onToggleFolderPublished={handleToggleFolderPublished}
            onAlbumClick={(albumName) => selectedAlbum === albumName ? deselectAlbum() : selectAlbum(albumName)}
            onAlbumDragOver={handleAlbumTileDragOver}
            onAlbumDragLeave={(e) => handleAlbumTileDragLeave(e)}
            onAlbumDrop={handleAlbumTileDrop}
            onAlbumRename={(albumName) => handleOpenRenameModal(albumName)}
            onCreateAlbumInFolder={handleCreateAlbumInFolder}
          />
          
          <UncategorizedSection
            localAlbums={localAlbums}
            selectedAlbum={selectedAlbum}
            animatingAlbum={animatingAlbum}
            dragOverAlbum={dragOverAlbum}
            dragOverUncategorized={dragOverUncategorized}
            placeholderInfo={placeholderInfo}
            uploadingImages={uploadingImages}
            isGhostAlbumDragOver={isGhostAlbumDragOver}
            uncategorizedSectionRef={uncategorizedSectionRef}
            ghostTileFileInputRef={ghostTileFileInputRef}
            onAlbumClick={(albumName) => selectedAlbum === albumName ? deselectAlbum() : selectAlbum(albumName)}
            onAlbumDragOver={handleAlbumTileDragOver}
            onAlbumDragLeave={handleAlbumTileDragLeave}
            onAlbumDrop={handleAlbumTileDrop}
            onAlbumRename={handleOpenRenameModal}
            onGhostTileClick={handleGhostTileClick}
            onGhostTileDragOver={handleGhostTileDragOver}
            onGhostTileDragLeave={handleGhostTileDragLeave}
            onGhostTileDrop={handleGhostTileDrop}
            onGhostTileFileSelect={handleGhostTileFileSelect}
          />
          
          
          {/* Unified Drag Overlay for both albums and folders */}
          <DragOverlay>
            {activeAlbumId ? (
              <div className="album-card dragging" style={{ cursor: 'grabbing' }}>
                <div className="album-card-header">
                  <h4>
                    <span className="album-name">{activeAlbumId}</span>
                  </h4>
                  {localAlbums.find(a => a.name === activeAlbumId)?.photoCount !== undefined && (
                    <div className="album-badge">
                      {localAlbums.find(a => a.name === activeAlbumId)?.photoCount} {localAlbums.find(a => a.name === activeAlbumId)?.photoCount === 1 ? 'photo' : 'photos'}
                    </div>
                  )}
                </div>
              </div>
            ) : activeFolderId ? (
              (() => {
                const folder = localFolders.find(f => f.id === activeFolderId);
                const folderAlbums = localAlbums.filter(a => a.folder_id === activeFolderId);
                if (!folder) return null;
                return (
                  <div className="folder-card dragging" style={{ cursor: 'grabbing', opacity: 0.95 }}>
                    <div className="folder-card-header">
                      <div className="folder-drag-handle">
                        <h4 className="folder-card-title">{folder.published ? '📁' : '🔒'} {folder.name}</h4>
                        <div className="folder-count">{folderAlbums.length} {folderAlbums.length === 1 ? 'album' : 'albums'}</div>
                      </div>
                    </div>
                    <div className="folder-albums-grid">
                      {folderAlbums.map((album) => (
                        <div key={album.name} className="album-card">
                          <h4>{album.name}</h4>
                          <span className="photo-count">{album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            ) : null}
          </DragOverlay>
          </SortableContext>
        </DndContext>

          {selectedAlbum && (
            <PhotosPanel
              selectedAlbum={selectedAlbum}
              albumPhotos={albumPhotos}
              uploadingImages={uploadingImages}
              loadingPhotos={loadingPhotos}
              hasEverDragged={hasEverDragged}
              savingOrder={savingOrder}
              isDragging={isDragging}
              activeId={activeId}
              isShuffling={isShuffling}
              localAlbums={localAlbums}
              onClose={deselectAlbum}
              onUploadPhotos={handleUploadPhotos}
              onDeleteAlbum={handleDeleteAlbum}
              onShareAlbum={(albumName) => {
                setShareAlbumName(albumName);
                setShowShareModal(true);
              }}
              onSavePhotoOrder={() => photoManagement.savePhotoOrder()}
              onCancelPhotoOrder={photoManagement.cancelPhotoReorder}
              onShufflePhotos={handleShuffleClick}
              onShuffleStart={handleShuffleStart}
              onShuffleEnd={handleShuffleEnd}
              onPhotoDragStart={handlePhotoDragStart}
              onPhotoDragEnd={handlePhotoDragEnd}
              onOpenEditModal={openEditModal}
              onDeletePhoto={(filename) => handleDeletePhoto(selectedAlbum!, filename)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              setActiveId={setActiveId}
              shuffleButtonRef={shuffleButtonRef}
            />
          )}
      </section>

      <ModalsCollection
        showEditModal={showEditModal}
        editingPhoto={editingPhoto}
        editTitleValue={editTitleValue}
        setEditTitleValue={setEditTitleValue}
        handleCloseEditModal={closeEditModal}
        handleSaveTitle={handleEditSave}
        showRenameModal={showRenameModal}
        renamingAlbum={renamingAlbum}
        newAlbumName={newAlbumName}
        setNewAlbumName={setNewAlbumName}
        setShowRenameModal={setShowRenameModal}
        handleRenameAlbum={handleRenameAlbum}
        showFolderModal={showFolderModal}
        setShowFolderModal={setShowFolderModal}
        folderModalError={folderModalError}
        setFolderModalError={setFolderModalError}
        folderManagement={{
          newFolderName: folderManagement.newFolderName,
          setNewFolderName: folderManagement.setNewFolderName,
          isCreatingFolder: folderManagement.isCreatingFolder,
          handleCreateFolder: async () => {
            const success = await folderManagement.createFolder(folderManagement.newFolderName);
            if (success) {
              setShowFolderModal(false);
              setFolderModalError('');
            } else {
              setFolderModalError('Failed to create folder');
            }
          },
        }}
        showDeleteFolderModal={showDeleteFolderModal}
        deletingFolderName={deletingFolderName}
        setShowDeleteFolderModal={setShowDeleteFolderModal}
        handleDeleteFolder={handleDeleteFolder}
        localFolders={localFolders}
        localAlbums={localAlbums}
        showNewAlbumModal={showNewAlbumModal}
        setShowNewAlbumModal={setShowNewAlbumModal}
        newAlbumNameInput={newAlbumModalName}
        setNewAlbumNameInput={setNewAlbumModalName}
        newAlbumPublished={newAlbumPublished}
        setNewAlbumPublished={setNewAlbumPublished}
        newAlbumModalError={newAlbumModalError}
        handleCreateAlbumSubmit={handleCreateAlbumFromModal}
        showShareModal={showShareModal}
        shareAlbumName={shareAlbumName}
        setShowShareModal={setShowShareModal}
        showConfirmModal={showConfirmModal}
        confirmConfig={confirmConfig}
        setShowConfirmModal={setShowConfirmModal}
      />
    </>
  );
};

export default AlbumsManager;
