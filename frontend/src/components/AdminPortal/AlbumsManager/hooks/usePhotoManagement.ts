/**
 * usePhotoManagement Hook
 * Manages photo loading, editing, deletion, and reordering
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../../config';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Photo, ConfirmModalConfig } from '../types';
import { fetchWithRateLimitCheck } from '../../../../utils/fetchWrapper';
import { 
  trackPhotoDeleted, 
  trackPhotoOrderSaved, 
  trackPhotoShuffle, 
  trackPhotoTitleEdited 
} from '../../../../utils/analytics';
import { warn } from '../../../../utils/logger';


interface UsePhotoManagementProps {
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
  showConfirmation: (config: ConfirmModalConfig) => void;
}

export const usePhotoManagement = ({ setMessage, showConfirmation }: UsePhotoManagementProps) => {
  const { t } = useTranslation();
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [originalPhotoOrder, setOriginalPhotoOrder] = useState<Photo[]>([]);
  const [hasEverDragged, setHasEverDragged] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Photo editing
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [editDescriptionValue, setEditDescriptionValue] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  const loadPhotos = useCallback(async (albumName: string) => {
    setLoadingPhotos(true);
    try {
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/albums/${encodeURIComponent(albumName)}/photos`,
        { credentials: 'include' }
      );

      if (!res.ok) {
        throw new Error('Failed to load photos');
      }

      const data = await res.json();
      setAlbumPhotos(data);
      setOriginalPhotoOrder(data);
      setHasEverDragged(false);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load photos' });
      setAlbumPhotos([]);
      setOriginalPhotoOrder([]);
    } finally {
      setLoadingPhotos(false);
    }
  }, [setMessage]);

  const selectAlbum = useCallback(
    (albumName: string) => {
      setSelectedAlbum(albumName);
      loadPhotos(albumName);
    },
    [loadPhotos]
  );

  const deselectAlbum = useCallback(() => {
    setSelectedAlbum(null);
    setAlbumPhotos([]);
    setOriginalPhotoOrder([]);
    setHasEverDragged(false);
  }, []);

  const deletePhoto = useCallback(
    async (filename: string): Promise<boolean> => {
      if (!selectedAlbum) return false;
      
      showConfirmation({
        message: `Are you sure you want to delete "${filename}"?\n\nThis action cannot be undone.`,
        confirmText: 'Delete Photo',
        isDanger: true,
        onConfirm: async () => {
          try {
            const res = await fetchWithRateLimitCheck(
              `${API_URL}/api/albums/${encodeURIComponent(selectedAlbum)}/photos/${encodeURIComponent(filename)}`,
              {
                method: 'DELETE',
                credentials: 'include',
              }
            );

            if (!res.ok) {
              throw new Error('Failed to delete photo');
            }

            // Remove photo from local state
            setAlbumPhotos((prev) => prev.filter((p) => p.id.split('/').pop() !== filename));
            setOriginalPhotoOrder((prev) => prev.filter((p) => p.id.split('/').pop() !== filename));
            
            setMessage({ type: 'success', text: `Photo "${filename}" deleted!` });
            trackPhotoDeleted(selectedAlbum, filename, '');
          } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete photo' });
          }
        },
      });
      return true; // Return immediately, actual deletion happens in onConfirm
    },
    [selectedAlbum, setMessage, showConfirmation]
  );

  const savePhotoOrder = useCallback(async (): Promise<boolean> => {
    if (!selectedAlbum) return false;
    
    setSavingOrder(true);
    try {
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/albums/${encodeURIComponent(selectedAlbum)}/photo-order`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoOrder: albumPhotos.map((p) => ({
              filename: p.id.split('/').pop() || p.id
            })),
          }),
          credentials: 'include',
        }
      );

      if (!res.ok) {
        throw new Error('Failed to save photo order');
      }

      trackPhotoOrderSaved(selectedAlbum, albumPhotos.length);
      setOriginalPhotoOrder([...albumPhotos]);
      setHasEverDragged(false);
      setMessage({ type: 'success', text: 'Photo order saved!' });
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save photo order' });
      return false;
    } finally {
      setSavingOrder(false);
    }
  }, [selectedAlbum, albumPhotos, setMessage]);

  const cancelPhotoReorder = useCallback(() => {
    setAlbumPhotos([...originalPhotoOrder]);
    setHasEverDragged(false);
    setMessage({ type: 'success', text: t('albumsManager.changesDiscarded') });
  }, [originalPhotoOrder, setMessage, t]);

  const shufflePhotos = useCallback(() => {
    if (selectedAlbum) {
      trackPhotoShuffle(selectedAlbum);
    }
    setAlbumPhotos((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    setHasEverDragged(true);
  }, []);

  const updatePhotoMetadata = useCallback(
    async (filename: string, newTitle: string, newDescription: string): Promise<boolean> => {
      if (!selectedAlbum) return false;
      
      try {
        const res = await fetchWithRateLimitCheck(
          `${API_URL}/api/image-metadata/${encodeURIComponent(selectedAlbum)}/${encodeURIComponent(filename)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle, description: newDescription }),
            credentials: 'include',
          }
        );

        if (!res.ok) {
          throw new Error('Failed to update metadata');
        }

        // Find the photo to get old title
        const photo = albumPhotos.find((p) => (p.id.split('/').pop() || p.id) === filename);
        const oldTitle = photo?.title || '';
        
        // Track title edit
        if (selectedAlbum && photo) {
          trackPhotoTitleEdited(selectedAlbum, photo.id, oldTitle, newTitle);
        }
        
        // Update local state
        setAlbumPhotos((prev) =>
          prev.map((p) =>
            (p.id.split('/').pop() || p.id) === filename 
              ? { ...p, title: newTitle, description: newDescription } 
              : p
          )
        );
        setOriginalPhotoOrder((prev) =>
          prev.map((p) =>
            (p.id.split('/').pop() || p.id) === filename 
              ? { ...p, title: newTitle, description: newDescription } 
              : p
          )
        );
        
        setMessage({ type: 'success', text: 'Metadata updated!' });
        return true;
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to update metadata' });
        return false;
      }
    },
    [selectedAlbum, albumPhotos, setMessage]
  );

  const openEditModal = useCallback((photo: Photo) => {
    setEditingPhoto(photo);
    setEditTitleValue(photo.title || '');
    setEditDescriptionValue(photo.description || '');
    setShowEditModal(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingPhoto(null);
    setEditTitleValue('');
    setEditDescriptionValue('');
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingPhoto) return;
    
    const filename = editingPhoto.id.split('/').pop() || '';
    const success = await updatePhotoMetadata(filename, editTitleValue, editDescriptionValue);
    if (success) {
      closeEditModal();
    }
  }, [editingPhoto, editTitleValue, editDescriptionValue, updatePhotoMetadata, closeEditModal]);

  // Photo drag handlers
  const handlePhotoDragStart = useCallback((event: DragEndEvent, setActiveId?: (id: string | null) => void) => {
    setHasEverDragged(true);
    // Set the active ID for the drag overlay
    if (setActiveId) {
      setActiveId(event.active.id as string);
    }
    // Note: touch-action is handled by CSS based on .dragging class
    // No need to manually manipulate styles here
  }, []);

  const handlePhotoDragEnd = useCallback((event: DragEndEvent, setActiveId?: (id: string | null) => void) => {
    const { active, over } = event;

    // Clear the active ID immediately
    if (setActiveId) {
      setActiveId(null);
    }

    // Note: touch-action is handled by CSS based on .dragging class
    // The .dragging class will be removed automatically by dnd-kit

    if (over && active.id !== over.id) {
      setAlbumPhotos((photos) => {
        const oldIndex = photos.findIndex((p) => p && p.id === active.id);
        const newIndex = photos.findIndex((p) => p && p.id === over.id);
        
        // Only perform move if both indices are valid
        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(photos, oldIndex, newIndex);
        }
        
        warn('Invalid drag: item not found in albumPhotos', { 
          activeId: active.id, 
          overId: over.id,
          oldIndex,
          newIndex
        });
        return photos;
      });
    }
  }, []);

  return {
    selectedAlbum,
    setSelectedAlbum,
    albumPhotos,
    setAlbumPhotos,
    setOriginalPhotoOrder,
    loadingPhotos,
    hasEverDragged,
    setHasEverDragged,
    savingOrder,
    selectAlbum,
    deselectAlbum,
    loadPhotos,
    deletePhoto,
    savePhotoOrder,
    cancelPhotoReorder,
    shufflePhotos,
    updatePhotoMetadata,
    handlePhotoDragStart,
    handlePhotoDragEnd,
    // Edit modal
    editingPhoto,
    editTitleValue,
    setEditTitleValue,
    editDescriptionValue,
    setEditDescriptionValue,
    showEditModal,
    openEditModal,
    closeEditModal,
    handleEditSave,
  };
};

