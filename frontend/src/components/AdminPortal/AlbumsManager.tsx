/**
 * Albums Manager Component  
 * Manages photo albums, photo uploads, and image optimization settings
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Album, Photo } from './types';
import { 
  trackAlbumCreated,
  trackAlbumDeleted,
  trackPhotoUploaded,
  trackPhotoDeleted
} from '../../utils/analytics';
import { cacheBustValue } from '../../config';
import './AlbumsManager.css';
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

// Sortable Photo Item Component
interface SortablePhotoItemProps {
  photo: Photo;
  index: number;
  onEdit: (photo: Photo) => void;
  onDelete: (album: string, filename: string, title: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  totalPhotos: number;
}

const SortablePhotoItem: React.FC<SortablePhotoItemProps> = ({
  photo,
  index,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  totalPhotos,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const imageUrl = `${API_URL}${photo.thumbnail}?i=${cacheBustValue}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`admin-photo-item ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <img
        src={imageUrl}
        alt={photo.title}
        className="admin-photo-thumbnail"
      />

      {/* Reorder controls (mobile) */}
      <div className="photo-reorder-controls-mobile">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp(index);
          }}
          disabled={index === 0}
          className="btn-reorder-mobile"
          title="Move up"
          type="button"
        >
          ↑
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown(index);
          }}
          disabled={index === totalPhotos - 1}
          className="btn-reorder-mobile"
          title="Move down"
          type="button"
        >
          ↓
        </button>
      </div>

      <div className="photo-overlay">
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

// Helper function to format album name to title case
const toTitleCase = (str: string): string => {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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
  setMessage: (message: { type: 'success' | 'error'; text: string } | null) => void;
}

const AlbumsManager: React.FC<AlbumsManagerProps> = ({
  albums,
  loadAlbums,
  setMessage,
}) => {
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const uploadingImagesRef = useRef<UploadingImage[]>([]);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
  const [originalPhotoOrder, setOriginalPhotoOrder] = useState<Photo[]>([]);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMainDropZoneDragging, setIsMainDropZoneDragging] = useState(false);
  const [animatingAlbum, setAnimatingAlbum] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [hasEverDragged, setHasEverDragged] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Keep ref in sync with state
  useEffect(() => {
    uploadingImagesRef.current = uploadingImages;
  }, [uploadingImages]);

  // Load photos when album is selected
  useEffect(() => {
    if (selectedAlbum) {
      loadPhotos(selectedAlbum);
    }
  }, [selectedAlbum]);

  const loadPhotos = async (albumName: string) => {
    try {
      const res = await fetch(
        `${API_URL}/api/albums/${encodeURIComponent(albumName)}/photos`,
        { credentials: 'include' }
      );
      const data = await res.json();
      const photos = Array.isArray(data) ? data : (data.photos || []);
      setAlbumPhotos(photos);
      setOriginalPhotoOrder(photos); // Store original order for comparison
      setHasEverDragged(false); // Reset drag state when loading new album
    } catch (err) {
      console.error('Failed to load photos:', err);
      setAlbumPhotos([]);
      setOriginalPhotoOrder([]);
      setHasEverDragged(false);
    }
  };

  // Check if photo order has changed or if user has started dragging
  const hasOrderChanged = () => {
    if (!hasEverDragged) return false;
    if (albumPhotos.length !== originalPhotoOrder.length) return false;
    return albumPhotos.some((photo, index) => photo.id !== originalPhotoOrder[index].id);
  };

  // Handle drag start for dnd-kit
  const handleDragStart = (event: DragEndEvent) => {
    setHasEverDragged(true); // Mark that user has started dragging
    setActiveId(event.active.id as string);
  };

  // Handle drag end for dnd-kit
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setAlbumPhotos((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
    
    setActiveId(null);
  };

  // Handle move up (mobile)
  const handleMovePhotoUp = (index: number) => {
    if (index === 0) return;
    setHasEverDragged(true); // Mark that user has reordered
    const newPhotos = [...albumPhotos];
    [newPhotos[index - 1], newPhotos[index]] = [newPhotos[index], newPhotos[index - 1]];
    setAlbumPhotos(newPhotos);
  };

  // Handle move down (mobile)
  const handleMovePhotoDown = (index: number) => {
    if (index === albumPhotos.length - 1) return;
    setHasEverDragged(true); // Mark that user has reordered
    const newPhotos = [...albumPhotos];
    [newPhotos[index], newPhotos[index + 1]] = [newPhotos[index + 1], newPhotos[index]];
    setAlbumPhotos(newPhotos);
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

  // Speed up animation when button is pressed and start shuffling
  const handleShuffleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (savingOrder) return;
    
    setHasEverDragged(true); // Mark that user has reordered
    
    const button = e.currentTarget;
    button.classList.add('shuffling-active');
    
    // Add zoom class to all photos during shuffle
    const photoElements = document.querySelectorAll('.admin-photo-item');
    photoElements.forEach((el) => {
      el.classList.add('shuffling-active');
    });
    
    // Start continuous shuffling with progressive speed increase
    let currentInterval = 100; // Start at 100ms between swaps
    
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
    
    // Speed up by 20% every 500ms for 3 seconds (6 iterations)
    for (let i = 1; i <= 6; i++) {
      const timeout = setTimeout(() => {
        currentInterval = currentInterval * 0.8; // Reduce interval by 20% = 20% faster
        startShuffling(currentInterval);
      }, i * 500);
      speedupTimeoutsRef.current.push(timeout);
    }
  };

  // Stop shuffling and slow down animation when button is released
  const handleShuffleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    
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
    
    // Return to normal speed
    slowdownTimeoutRef.current = setTimeout(() => {
      button.classList.remove('shuffling-slowing');
    }, 1000);
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

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) return;

    try {
      // Apply title case to the album name before creating
      const albumName = toTitleCase(newAlbumName.trim());
      const res = await fetch(`${API_URL}/api/albums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: albumName }),
      });

      if (res.ok) {
        setNewAlbumName('');
        trackAlbumCreated(albumName);
        
        // Select the album immediately - sessionStorage will persist it across refresh
        setSelectedAlbum(albumName);
        setMessage({ type: 'success', text: `Album "${albumName}" created!` });
        
        // Trigger refresh of header navigation
        await loadAlbums();
        window.dispatchEvent(new Event('albums-updated'));
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to create album' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };

  const handleDeleteAlbum = async (albumName: string) => {
    if (!confirm(`Delete album "${albumName}" and all its photos?`)) return;

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
                      // Optimization complete (in background)
                      clearInterval(timeoutChecker);
                      const thumbnailUrl = `${API_URL}/optimized/thumbnail/${albumToUse}/${filename}?i=${Date.now()}`;
                      setUploadingImages(prev => prev.map(img => 
                        img.filename === filename 
                          ? { ...img, state: 'complete' as UploadState, thumbnailUrl, optimizeProgress: 100 } 
                          : img
                      ));
                      trackPhotoUploaded(albumToUse!, 1, [filename]);
                    } else if (data.type === 'error') {
                      // Error occurred
                      clearInterval(timeoutChecker);
                      setUploadingImages(prev => prev.map(img => 
                        img.filename === filename 
                          ? { ...img, state: 'error' as UploadState, error: data.error } 
                          : img
                      ));
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
  const processDroppedItems = async (items: DataTransferItemList): Promise<{ files: File[], folderName: string | null }> => {
    const allFiles: File[] = [];
    let folderName: string | null = null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        
        if (entry) {
          if (entry.isDirectory) {
            // It's a folder - get the folder name
            if (!folderName) {
              folderName = entry.name;
            }
            // Recursively read all files
            const files = await readDirectoryRecursive(entry);
            allFiles.push(...files);
          } else if (entry.isFile) {
            // It's a single file
            const file = item.getAsFile();
            if (file && file.type.startsWith('image/')) {
              allFiles.push(file);
            }
          }
        }
      }
    }

    return { files: allFiles, folderName };
  };

  const handleMainDropZoneDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMainDropZoneDragging(true);
  };

  const handleMainDropZoneDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're actually leaving the drop zone (not entering a child)
    if (e.currentTarget === e.target) {
      setIsMainDropZoneDragging(false);
    }
  };

  const handleMainDropZoneDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMainDropZoneDragging(false);

    if (uploadingImages.length > 0) {
      setMessage({ type: 'error', text: 'Upload already in progress' });
      return;
    }

    // Process dropped items (handles folders and files)
    const { files: imageFiles, folderName } = await processDroppedItems(e.dataTransfer.items);
    
    if (imageFiles.length === 0) {
      setMessage({ type: 'error', text: 'No image files found in dropped folder' });
      return;
    }

    // If album is selected, upload to that album
    if (selectedAlbum) {
      await processFiles(imageFiles);
      return;
    }

    // No album selected - try to create one from folder name
    if (!folderName) {
      setMessage({ type: 'error', text: 'Please drag a folder or select an album first' });
      return;
    }

    // Create the album with title case
    const albumName = toTitleCase(folderName.trim());
    
    try {
      const res = await fetch(`${API_URL}/api/albums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: albumName }),
      });

      if (!res.ok) {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to create album' });
        return;
      }

      // Album created successfully
      trackAlbumCreated(folderName);
      setSelectedAlbum(albumName);
      setMessage({ type: 'success', text: `Album "${albumName}" created! Uploading ${imageFiles.length} image(s)...` });
      
      // Load albums locally (don't dispatch event yet - it would cause a refresh and interrupt upload)
      await loadAlbums();

      // Upload the files with the newly created album name
      await processFiles(imageFiles, albumName);
      
      // NOW trigger global refresh after uploads complete
      window.dispatchEvent(new Event('albums-updated'));
      
    } catch (err) {
      console.error('Failed to create album:', err);
      setMessage({ type: 'error', text: 'Failed to create album' });
    }
  };

  const handleDeletePhoto = async (album: string, filename: string, photoTitle: string = '') => {
    if (!confirm(`Delete this photo?`)) return;

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
          <div className="create-album-section">
            <div className="create-album">
              <h3>Create New Album</h3>
              <div className="album-input-group">
              <input
                type="text"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="Album name (e.g., Nature Photos, Street Portraits)"
                className="branding-input"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateAlbum()}
              />
                <button 
                  onClick={handleCreateAlbum}
                  className="btn-primary"
                >
                  Create Album
                </button>
              </div>
            </div>

            <div 
              className={`main-drop-zone ${isMainDropZoneDragging ? 'dragging' : ''} ${uploadingImages.length > 0 ? 'disabled' : ''}`}
              onDragOver={uploadingImages.length > 0 ? undefined : handleMainDropZoneDragOver}
              onDragLeave={uploadingImages.length > 0 ? undefined : handleMainDropZoneDragLeave}
              onDrop={uploadingImages.length > 0 ? undefined : handleMainDropZoneDrop}
            >
              <div className="drop-zone-icon">📁</div>
              <div className="drop-zone-text">
                <strong>{uploadingImages.length > 0 ? 'Upload in progress...' : 'Drop folder here'}</strong>
                <span className="drop-zone-hint">
                  {uploadingImages.length > 0 
                    ? 'Please wait for current upload to complete'
                    : selectedAlbum 
                      ? `Add images to "${selectedAlbum}"` 
                      : 'Create album from folder name'}
                </span>
              </div>
            </div>
          </div>

          <div className="albums-list">
            <h3>Your Albums ({albums.length})</h3>
            {albums.length === 0 ? (
              <p style={{ color: '#888', marginTop: '1rem' }}>
                No albums yet. Create one to get started!
              </p>
            ) : (
              <div className="album-grid">
                {albums.map((album) => (
                  <div 
                    key={album.name} 
                    className={`album-card ${selectedAlbum === album.name ? 'selected' : ''} ${album.published === false ? 'unpublished' : ''} ${animatingAlbum === album.name ? 'animating' : ''}`}
                    onClick={() => setSelectedAlbum(selectedAlbum === album.name ? null : album.name)}
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
                  </div>
                ))}
              </div>
            )}
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
                  <label 
                    className="toggle-switch btn-action-item"
                    title={albums.find(a => a.name === selectedAlbum)?.published === false ? "Publish album (make visible to public)" : "Unpublish album (hide from public)"}
                  >
                    <input
                      type="checkbox"
                      checked={albums.find(a => a.name === selectedAlbum)?.published !== false}
                      onChange={(e) => {
                        handleTogglePublished(selectedAlbum, albums.find(a => a.name === selectedAlbum)?.published !== false, e as any);
                      }}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">
                      {albums.find(a => a.name === selectedAlbum)?.published === false ? 'Unpublished' : 'Published'}
                    </span>
                  </label>
                  
                  {albums.find(a => a.name === selectedAlbum)?.published === false && (
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
                </div>
                
                {hasOrderChanged() && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                        onMouseLeave={handleShuffleMouseUp}
                        disabled={savingOrder}
                        className="btn-action btn-shuffle-order"
                        title="Hold to shuffle photos"
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="unsaved-indicator">
                        Unsaved changes
                      </span>
                      <button
                        onClick={handleSavePhotoOrder}
                        disabled={savingOrder}
                        className="btn-action btn-save-order"
                        title="Save photo order"
                        style={{ 
                          background: 'linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 80%, white))',
                          color: '#000',
                          fontWeight: 600
                        }}
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

              {albumPhotos.length === 0 && uploadingImages.length === 0 ? (
                <p style={{ color: '#888', marginTop: '1rem' }}>
                  No photos in this album yet. Upload some to get started!
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div className="photos-grid">
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
                          <span className="state-text">Optimizing...</span>
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
                      {albumPhotos.map((photo, index) => (
                        <SortablePhotoItem
                          key={photo.id}
                          photo={photo}
                          index={index}
                          onEdit={handleOpenEditModal}
                          onDelete={handleDeletePhoto}
                          onMoveUp={handleMovePhotoUp}
                          onMoveDown={handleMovePhotoDown}
                          totalPhotos={albumPhotos.length}
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
                  autoFocus
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
    </>
  );
};

export default AlbumsManager;

