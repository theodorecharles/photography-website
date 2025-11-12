/**
 * Albums Manager Component  
 * Manages photo albums, photo uploads, and image optimization settings
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Album, Photo } from './types';
import { 
  trackAlbumCreated,
  trackAlbumDeleted,
  trackPhotoUploaded,
  trackPhotoDeleted
} from '../../utils/analytics';
import { cacheBustValue } from '../../config';
import { fetchWithRateLimitCheck } from '../../utils/fetchWrapper';
import ShareModal from './ShareModal';
import './AlbumsManager.css';
import './PhotoOrderControls.css';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_URL = import.meta.env.VITE_API_URL || '';

type UploadState = 'queued' | 'uploading' | 'optimizing' | 'complete' | 'error';

// Sortable Album Card Component with drop zone
interface SortableAlbumCardProps {
  album: Album;
  isSelected: boolean;
  isAnimating: boolean;
  isDragOver: boolean;
  onClick: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
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
      <div className="album-card-header">
        <h4>
          <span className="album-name">{album.name}</span>
        </h4>
        {album.photoCount !== undefined && (
          <div className="album-badge">
            {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}
          </div>
        )}
      </div>
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

// Sortable Photo Item Component
interface SortablePhotoItemProps {
  photo: Photo;
  onEdit: (photo: Photo) => void;
  onDelete: (album: string, filename: string, title: string) => void;
}

const SortablePhotoItem: React.FC<SortablePhotoItemProps> = ({
  photo,
  onEdit,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`admin-photo-item ${isDragging ? 'dragging' : ''} ${showOverlay ? 'show-overlay' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      {...attributes}
      {...listeners}
    >
      <img
        src={imageUrl}
        alt={photo.title}
        className="admin-photo-thumbnail"
      />

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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

interface UploadingImage {
  file: File;
  filename: string;
  state: UploadState;
  thumbnailUrl?: string;
  error?: string;
  progress?: number;
  optimizeProgress?: number; // 0-100 for optimization progress
}

interface AlbumsManagerProps {
  albums: Album[];
  loadAlbums: () => Promise<void>;
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

const AlbumsManager: React.FC<AlbumsManagerProps> = ({
  albums,
  loadAlbums,
  setMessage,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Local albums state that syncs with props - allows for optimistic updates during drag
  const [localAlbums, setLocalAlbums] = useState<Album[]>(albums);
  
  // Sync local albums with props when props change (from parent load)
  useEffect(() => {
    setLocalAlbums(albums);
  }, [albums]);
  
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const uploadingImagesRef = useRef<UploadingImage[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  
  // Handle album preselection from URL parameter
  useEffect(() => {
    const albumParam = searchParams.get('album');
    if (albumParam && albums.some(a => a.name === albumParam)) {
      setSelectedAlbum(albumParam);
      // Clear the parameter after setting the selection
      searchParams.delete('album');
      setSearchParams(searchParams, { replace: true });
    }
  }, [albums, searchParams, setSearchParams]);
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [originalPhotoOrder, setOriginalPhotoOrder] = useState<Photo[]>([]);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [animatingAlbum, setAnimatingAlbum] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [hasEverDragged, setHasEverDragged] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  
  // State for drag-and-drop on album tiles
  const [dragOverAlbum, setDragOverAlbum] = useState<string | null>(null);
  const [isGhostAlbumDragOver, setIsGhostAlbumDragOver] = useState(false);
  const [showNewAlbumModal, setShowNewAlbumModal] = useState(false);
  const [newAlbumFiles, setNewAlbumFiles] = useState<File[]>([]);
  const [newAlbumModalName, setNewAlbumModalName] = useState('');
  
  // Ref for ghost tile file input
  const ghostTileFileInputRef = useRef<HTMLInputElement>(null);

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareAlbumName, setShareAlbumName] = useState<string | null>(null);
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

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

  const loadPhotos = async (albumName: string) => {
    setLoadingPhotos(true);
    try {
      // Add cache-busting parameter to ensure fresh data
      const cacheBust = Date.now();
      const res = await fetch(
        `${API_URL}/api/albums/${encodeURIComponent(albumName)}/photos?_=${cacheBust}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      const photos = Array.isArray(data) ? data : (data.photos || []);
      console.log(`📷 Loaded ${photos.length} photos for album: ${albumName}`);
      setAlbumPhotos(photos);
      setOriginalPhotoOrder(photos); // Store original order for comparison
      setHasEverDragged(false); // Reset drag state when loading new album
    } catch (err) {
      console.error('Failed to load photos:', err);
      setAlbumPhotos([]);
      setOriginalPhotoOrder([]);
      setHasEverDragged(false);
    } finally {
      setLoadingPhotos(false);
    }
  };

  // Check if photo order has changed or if user has started dragging
  const hasOrderChanged = () => {
    if (!hasEverDragged) return false;
    if (albumPhotos.length !== originalPhotoOrder.length) return false;
    return albumPhotos.some((photo, index) => photo.id !== originalPhotoOrder[index].id);
  };

  // Handle drag start for photos
  const handlePhotoDragStart = (event: DragEndEvent) => {
    setHasEverDragged(true); // Mark that user has started dragging
    setActiveId(event.active.id as string);
    // Prevent scrolling during drag on mobile
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
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
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  };

  // Handle drag start for albums
  const handleAlbumDragStart = (event: DragEndEvent) => {
    setActiveAlbumId(event.active.id as string);
    // Prevent scrolling during drag on mobile
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  };

  // Handle drag end for albums with auto-save
  const handleAlbumDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveAlbumId(null);
    // Re-enable scrolling after drag
    document.body.style.overflow = '';
    document.body.style.touchAction = '';

    if (over && active.id !== over.id) {
      const oldIndex = localAlbums.findIndex((album) => album.name === active.id);
      const newIndex = localAlbums.findIndex((album) => album.name === over.id);

      const reorderedAlbums = arrayMove(localAlbums, oldIndex, newIndex);
      
      // Optimistically update local state immediately for smooth UX
      setLocalAlbums(reorderedAlbums);
      
      // Save the new order to the backend
      try {
        const albumOrders = reorderedAlbums.map((album, index) => ({
          name: album.name,
          sort_order: index,
        }));

        const response = await fetchWithRateLimitCheck(
          `${API_URL}/api/albums/sort-order`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ albumOrders }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to save album order');
        }

        // Success! Sync parent state with database
        await loadAlbums();
        
        // Dispatch global event to update navigation dropdown
        window.dispatchEvent(new Event('albums-updated'));
      } catch (error) {
        console.error('Error saving album order:', error);
        setMessage({ type: 'error', text: 'Failed to save album order' });
        // On error, reload to revert to saved order
        await loadAlbums();
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

  const handleGhostTileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGhostAlbumDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Filter for image files only
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setMessage({ type: 'error', text: 'No valid image files found' });
      return;
    }

    // Show modal to name the new album
    setNewAlbumFiles(imageFiles);
    setShowNewAlbumModal(true);
    setNewAlbumModalName('');
  };

  // Handle click on ghost tile (for mobile/manual file selection)
  const handleGhostTileClick = () => {
    ghostTileFileInputRef.current?.click();
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

    // Show modal to name the new album
    setNewAlbumFiles(imageFiles);
    setShowNewAlbumModal(true);
    setNewAlbumModalName('');
    
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
    setSelectedAlbum(albumName);

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
        
        // Close modal and upload files
        setShowNewAlbumModal(false);
        setMessage({ type: 'success', text: `Album "${sanitized}" created!` });
        
        // Upload the files
        await handleUploadToAlbum(sanitized, newAlbumFiles);
        
        // Clear state
        setNewAlbumFiles([]);
        setNewAlbumModalName('');
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
  const handleSavePhotoOrder = async () => {
    if (!selectedAlbum) return;
    
    setSavingOrder(true);
    try {
      const photoOrder = albumPhotos.map((photo) => ({
        filename: photo.id.split('/').pop() || photo.id
      }));

      const res = await fetch(`${API_URL}/api/albums/${encodeURIComponent(selectedAlbum)}/photo-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ photoOrder }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Photo order saved!' });
        setOriginalPhotoOrder(albumPhotos); // Update original order
        setHasEverDragged(false); // Reset drag state after save
      } else {
        setMessage({ type: 'error', text: 'Failed to save photo order' });
      }
    } catch (err) {
      console.error('Failed to save photo order:', err);
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setSavingOrder(false);
    }
  };

  // Cancel photo order changes
  const handleCancelPhotoOrder = () => {
    setAlbumPhotos(originalPhotoOrder);
    setHasEverDragged(false); // Reset drag state
  };

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

  const handleOpenEditModal = async (photo: Photo) => {
    setEditingPhoto(photo);
    setShowEditModal(true);
    
    // Load the title for this specific photo when opening the modal
    const filename = photo.id.split('/').pop();
    if (!filename) {
      setEditTitleValue('');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/image-metadata/${encodeURIComponent(photo.album)}/${encodeURIComponent(filename)}`, {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        setEditTitleValue(data.title || '');
      } else {
        // No metadata exists yet, start with empty
        setEditTitleValue('');
      }
    } catch (err) {
      console.error('Failed to load photo title:', err);
      setEditTitleValue('');
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingPhoto(null);
    setEditTitleValue('');
  };

  const handleSaveTitle = async () => {
    if (!editingPhoto) return;

    const filename = editingPhoto.id.split('/').pop();
    const album = editingPhoto.album;

    if (!filename) {
      setMessage({ type: 'error', text: 'Invalid photo filename' });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/image-metadata/${encodeURIComponent(album)}/${encodeURIComponent(filename)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: editTitleValue || null, description: null }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Title updated successfully!' });
        handleCloseEditModal();
      } else {
        setMessage({ type: 'error', text: 'Failed to update title' });
      }
    } catch (err) {
      console.error('Failed to save title:', err);
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };

  const handleDeleteAlbum = async (albumName: string) => {
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
        if (selectedAlbum === albumName) setSelectedAlbum(null);
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
        <h2>📸 Albums & Photos</h2>
        <p className="section-description">Manage your photo albums and upload new images</p>
        <div className="albums-management">
          <div className="albums-list">
              <DndContext
                sensors={albumSensors}
                collisionDetection={closestCenter}
                onDragStart={handleAlbumDragStart}
                onDragEnd={handleAlbumDragEnd}
              >
                <SortableContext
                  items={localAlbums.map((album) => album.name)}
                  strategy={rectSortingStrategy}
                >
                  <div className="album-grid">
                    {localAlbums.map((album) => (
                      <SortableAlbumCard
                        key={album.name}
                        album={album}
                        isSelected={selectedAlbum === album.name}
                        isAnimating={animatingAlbum === album.name}
                        isDragOver={dragOverAlbum === album.name}
                        onClick={() => setSelectedAlbum(selectedAlbum === album.name ? null : album.name)}
                        onDragOver={(e) => handleAlbumTileDragOver(e, album.name)}
                        onDragLeave={handleAlbumTileDragLeave}
                        onDrop={(e) => handleAlbumTileDrop(e, album.name)}
                      />
                    ))}
                    
                    {/* Ghost tile for creating new albums */}
                    <div 
                      className={`album-card ghost-album-tile ${isGhostAlbumDragOver ? 'drag-over-ghost' : ''}`}
                      onClick={handleGhostTileClick}
                      onDragOver={handleGhostTileDragOver}
                      onDragLeave={handleGhostTileDragLeave}
                      onDrop={handleGhostTileDrop}
                    >
                      <div className="ghost-tile-content">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 8v8M8 12h8"/>
                        </svg>
                        {isGhostAlbumDragOver && (
                          <span className="ghost-tile-hint">Drop to create</span>
                        )}
                      </div>
                      <input
                        ref={ghostTileFileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleGhostTileFileSelect}
                        style={{ display: 'none' }}
                      />
                    </div>
                  </div>
                </SortableContext>
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
                  ) : null}
                </DragOverlay>
              </DndContext>
          </div>

          {selectedAlbum && (
            <div 
              className={`album-photos ${isDragging ? 'drag-over' : ''}`}
              onDragOver={uploadingImages.length > 0 ? undefined : handleDragOver}
              onDragLeave={uploadingImages.length > 0 ? undefined : handleDragLeave}
              onDrop={uploadingImages.length > 0 ? undefined : handleDrop}
            >
              <div className="photos-header">
                <div className="album-actions-grid">
                  <label className="btn-action btn-upload btn-action-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                    </svg>
                    {uploadingImages.length > 0 ? 'Uploading...' : 'Upload Photos'}
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleUploadPhotos}
                      disabled={uploadingImages.length > 0}
                      style={{ display: 'none' }}
                    />
                  </label>
                  
                  <button
                    onClick={() => handleDeleteAlbum(selectedAlbum)}
                    className="btn-action btn-delete btn-action-item"
                    title="Delete album"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                    Delete Album
                  </button>
                  
                  {/* Only show share button for unpublished albums */}
                  {!localAlbums.find(a => a.name === selectedAlbum)?.published && (
                    <button
                      onClick={() => {
                        setShareAlbumName(selectedAlbum);
                        setShowShareModal(true);
                      }}
                      className="btn-action btn-generate-link btn-action-item"
                      title="Generate link for album"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3"/>
                        <circle cx="6" cy="12" r="3"/>
                        <circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                      </svg>
                      Share Album
                    </button>
                  )}
                  
                  {!localAlbums.find(a => a.name === selectedAlbum)?.published && (
                    <button
                      onClick={() => window.open(`/album/${selectedAlbum}`, '_blank')}
                      className="btn-action btn-preview btn-action-item"
                      title="Preview unpublished album"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      Preview Album
                    </button>
                  )}
                  
                  <label 
                    className="toggle-switch btn-action-item"
                    title={localAlbums.find(a => a.name === selectedAlbum)?.published === false ? "Publish album (make visible to public)" : "Unpublish album (hide from public)"}
                  >
                    <input
                      type="checkbox"
                      checked={localAlbums.find(a => a.name === selectedAlbum)?.published !== false}
                      onChange={(e) => {
                        handleTogglePublished(selectedAlbum, localAlbums.find(a => a.name === selectedAlbum)?.published !== false, e as any);
                      }}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">
                      {localAlbums.find(a => a.name === selectedAlbum)?.published === false ? 'Unpublished' : 'Published'}
                    </span>
                  </label>
                </div>
                
                {hasOrderChanged() && (
                  <div className="photo-order-controls">
                    <div className="photo-order-row photo-order-row-secondary">
                      <button
                        onClick={handleCancelPhotoOrder}
                        disabled={savingOrder}
                        className="btn-action btn-cancel-order"
                        title="Cancel changes"
                      >
                        Cancel
                      </button>
                      <button
                        onMouseDown={handleShuffleMouseDown}
                        onMouseUp={handleShuffleMouseUp}
                        onMouseLeave={handleShuffleMouseLeave}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          shuffleButtonRef.current = e.currentTarget;
                          isLongPressRef.current = false;
                          shuffleClickTimeoutRef.current = setTimeout(() => {
                            isLongPressRef.current = true;
                            handleShuffleStart();
                          }, 200);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          if (shuffleClickTimeoutRef.current) {
                            clearTimeout(shuffleClickTimeoutRef.current);
                            shuffleClickTimeoutRef.current = null;
                          }
                          if (isLongPressRef.current) {
                            handleShuffleEnd();
                          } else {
                            handleShuffleClick();
                          }
                          isLongPressRef.current = false;
                        }}
                        disabled={savingOrder}
                        className="btn-action btn-shuffle-order"
                        title="Click to shuffle, hold to animate"
                      >
                        <svg 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{ marginRight: '0.5rem' }}
                        >
                          <polyline points="16 3 21 3 21 8"></polyline>
                          <line x1="4" y1="20" x2="21" y2="3"></line>
                          <polyline points="21 16 21 21 16 21"></polyline>
                          <line x1="15" y1="15" x2="21" y2="21"></line>
                          <line x1="4" y1="4" x2="9" y2="9"></line>
                        </svg>
                        Shuffle
                      </button>
                    </div>
                    <div className="photo-order-row photo-order-row-primary">
                      <span className="unsaved-indicator">
                        Unsaved changes
                      </span>
                      <button
                        onClick={handleSavePhotoOrder}
                        disabled={savingOrder}
                        className="btn-action btn-save-order"
                        title="Save photo order"
                      >
                        {savingOrder ? 'Saving...' : 'Save Order'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {isDragging && uploadingImages.length === 0 && (
                <div className="drop-overlay">
                  <div className="drop-overlay-content">
                    <div className="drop-icon">📁</div>
                    <p>Drop images here to upload</p>
                  </div>
                </div>
              )}

              {uploadingImages.length > 0 && (
                <div className="upload-progress-container">
                  <div className="upload-progress-info">
                    <span className="upload-progress-percent">
                      {uploadingImages.filter(img => img.state === 'complete' || img.state === 'error').length} / {uploadingImages.length} complete
                    </span>
                  </div>
                  <div className="upload-progress-bar">
                    <div 
                      className="upload-progress-fill"
                      style={{ 
                        width: `${(uploadingImages.filter(img => img.state === 'complete' || img.state === 'error').length / uploadingImages.length) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Show error summary at the top */}
              {uploadingImages.some(img => img.state === 'error') && (
                <div className="upload-errors-summary">
                  <div className="errors-summary-header">
                    <span className="error-icon">⚠️</span>
                    <strong>Failed Uploads ({uploadingImages.filter(img => img.state === 'error').length})</strong>
                  </div>
                  <div className="error-files-list">
                    {uploadingImages
                      .filter(img => img.state === 'error')
                      .map((img, idx) => (
                        <div key={`error-${idx}`} className="error-file-item">
                          <div className="error-file-info">
                            <span className="error-filename">{img.filename}</span>
                            <span className="error-reason">{img.error || 'Upload failed'}</span>
                          </div>
                          <button
                            className="error-dismiss-btn"
                            onClick={() => {
                              setUploadingImages(prev => prev.filter(i => i.filename !== img.filename));
                            }}
                            title="Dismiss"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {loadingPhotos ? (
                <div className="loading-container" style={{ marginTop: '2rem' }}>
                  <div className="loading-spinner"></div>
                  <p>Loading photos...</p>
                </div>
              ) : albumPhotos.length === 0 && uploadingImages.length === 0 ? (
                <p style={{ color: '#888', marginTop: '1rem' }}>
                  No photos in this album yet. Upload some to get started!
                </p>
              ) : (
                <DndContext
                  sensors={photoSensors}
                  collisionDetection={closestCenter}
                  onDragStart={handlePhotoDragStart}
                  onDragEnd={handlePhotoDragEnd}
                >
                  <div className={`photos-grid ${isShuffling ? 'shuffling-grid' : ''}`}>
                    {/* Show uploading images first */}
                    {uploadingImages.map((img, idx) => (
                    <div key={`uploading-${idx}`} className="admin-photo-item uploading-photo-item">
                      {img.state === 'queued' && (
                        <div className="photo-state-overlay">
                          <div className="state-icon">⏳</div>
                          <span className="state-text">Queued</span>
                        </div>
                      )}
                      {img.state === 'uploading' && (
                        <div className="photo-state-overlay">
                          <div className="progress-circle">
                            <svg className="progress-ring" width="60" height="60">
                              <circle
                                className="progress-ring-circle-bg"
                                stroke="rgba(255, 255, 255, 0.1)"
                                strokeWidth="4"
                                fill="transparent"
                                r="26"
                                cx="30"
                                cy="30"
                              />
                              <circle
                                className="progress-ring-circle"
                                stroke="var(--primary-color)"
                                strokeWidth="4"
                                fill="transparent"
                                r="26"
                                cx="30"
                                cy="30"
                                strokeDasharray={`${2 * Math.PI * 26}`}
                                strokeDashoffset={`${2 * Math.PI * 26 * (1 - (img.progress || 0) / 100)}`}
                                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                              />
                            </svg>
                            <span className="progress-percentage">{img.progress}%</span>
                          </div>
                          <span className="state-text">Uploading...</span>
                        </div>
                      )}
                      {img.state === 'optimizing' && (
                        <div className="photo-state-overlay">
                          <div className="progress-circle">
                            <svg className="progress-ring" width="60" height="60">
                              <circle
                                className="progress-ring-circle-bg"
                                stroke="rgba(255, 255, 255, 0.1)"
                                strokeWidth="4"
                                fill="transparent"
                                r="26"
                                cx="30"
                                cy="30"
                              />
                              <circle
                                className="progress-ring-circle"
                                stroke="var(--primary-color)"
                                strokeWidth="4"
                                fill="transparent"
                                r="26"
                                cx="30"
                                cy="30"
                                strokeDasharray={`${2 * Math.PI * 26}`}
                                strokeDashoffset={`${2 * Math.PI * 26 * (1 - (img.optimizeProgress || 0) / 100)}`}
                                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                              />
                            </svg>
                            <span className="progress-percentage">{img.optimizeProgress || 0}%</span>
                          </div>
                          <span className="state-text">{img.error || 'Optimizing...'}</span>
                        </div>
                      )}
                      {img.state === 'complete' && img.thumbnailUrl && (
                        <>
                          <img 
                            src={img.thumbnailUrl}
                            alt={img.filename}
                            className="admin-photo-thumbnail"
                          />
                          <div className="photo-complete-badge">✓</div>
                        </>
                      )}
                      {img.state === 'error' && (
                        <div className="photo-state-overlay error">
                          <div className="state-icon">⚠️</div>
                          <span className="state-text">Error</span>
                          <span className="error-message">{img.error}</span>
                        </div>
                      )}
                      <div className="photo-filename">{img.filename}</div>
                    </div>
                    ))}
                    
                    {/* Show existing album photos with drag and drop */}
                    <SortableContext items={albumPhotos.map(p => p.id)} strategy={rectSortingStrategy}>
                      {albumPhotos.map((photo) => (
                        <SortablePhotoItem
                          key={photo.id}
                          photo={photo}
                          onEdit={handleOpenEditModal}
                          onDelete={handleDeletePhoto}
                        />
                      ))}
                    </SortableContext>
                  </div>
                  <DragOverlay>
                    {activeId ? (
                      <div className="admin-photo-item dragging" style={{ cursor: 'grabbing' }}>
                        <img
                          src={`${API_URL}${albumPhotos.find(p => p.id === activeId)?.thumbnail}?i=${cacheBustValue}`}
                          alt="Dragging"
                          className="admin-photo-thumbnail"
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Edit Title Modal - Use Portal to escape admin-container z-index stacking context */}
      {showEditModal && editingPhoto && createPortal(
        <div 
          className="edit-title-modal" 
          onClick={handleCloseEditModal}
        >
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Edit Photo Title</h3>
              <button 
                className="modal-close-btn"
                onClick={handleCloseEditModal}
                title="Close"
              >
                ×
              </button>
            </div>
            
            <div className="edit-modal-body">
              <div className="edit-modal-photo">
                <img 
                  src={`${API_URL}${editingPhoto.thumbnail}?i=${cacheBustValue}`}
                  alt={editingPhoto.title}
                />
              </div>
              
              <div className="edit-modal-info">
                <label className="edit-modal-label">
                  Filename: <span className="filename-display">{editingPhoto.id.split('/').pop()}</span>
                </label>
                
                <label className="edit-modal-label">Title</label>
                <input
                  type="text"
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  className="edit-modal-input"
                  placeholder="Enter title..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveTitle();
                    } else if (e.key === 'Escape') {
                      handleCloseEditModal();
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="edit-modal-footer">
              <button 
                className="btn-secondary"
                onClick={handleCloseEditModal}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleSaveTitle}
              >
                Save Title
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* New Album Modal - Use Portal to escape admin-container z-index stacking context */}
      {showNewAlbumModal && createPortal(
        <div 
          className="edit-title-modal" 
          onClick={() => setShowNewAlbumModal(false)}
        >
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Create New Album</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowNewAlbumModal(false)}
                title="Close"
              >
                ×
              </button>
            </div>
            
            <div className="edit-modal-body">
              <div className="edit-modal-info" style={{ width: '100%' }}>
                <label className="edit-modal-label">
                  {newAlbumFiles.length} {newAlbumFiles.length === 1 ? 'photo' : 'photos'} selected
                </label>
                
                <label className="edit-modal-label">Album Name</label>
                <input
                  type="text"
                  value={newAlbumModalName}
                  onChange={(e) => setNewAlbumModalName(e.target.value)}
                  className="edit-modal-input"
                  placeholder="Enter album name..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateAlbumFromModal();
                    } else if (e.key === 'Escape') {
                      setShowNewAlbumModal(false);
                    }
                  }}
                />
                <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  A new album will be created with {newAlbumFiles.length} {newAlbumFiles.length === 1 ? 'photo' : 'photos'}
                </p>
              </div>
            </div>
            
            <div className="edit-modal-footer">
              <button
                onClick={() => setShowNewAlbumModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAlbumFromModal}
                className="btn-primary"
              >
                Create Album
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {showShareModal && shareAlbumName && (
        <ShareModal
          album={shareAlbumName}
          onClose={() => {
            setShowShareModal(false);
            setShareAlbumName(null);
          }}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmConfig && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "1rem",
          }}
          onClick={handleModalCancel}
        >
          <div
            style={{
              backgroundColor: "#1a1a1a",
              border: "2px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "12px",
              padding: "2rem",
              maxWidth: "500px",
              width: "100%",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                color: "#e5e7eb",
                fontSize: "1.1rem",
                lineHeight: "1.6",
                marginBottom: "2rem",
                whiteSpace: "pre-wrap",
              }}
            >
              {confirmConfig.message}
            </div>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handleModalCancel}
                className="btn-secondary"
                style={{ minWidth: "100px" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmConfig.onConfirm}
                className="btn-primary"
                style={{ minWidth: "100px" }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AlbumsManager;

