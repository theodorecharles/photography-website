/**
 * usePhotoManagement Hook
 * Manages photo loading, editing, deletion, and reordering
 */

import { useState, useCallback } from 'react';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Photo, ConfirmModalConfig } from '../types';
import { fetchWithRateLimitCheck } from '../../../../utils/fetchWrapper';
import { trackPhotoDeleted } from '../../../../utils/analytics';

const API_URL = import.meta.env.VITE_API_URL || '';

interface UsePhotoManagementProps {
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
  showConfirmation: (config: ConfirmModalConfig) => void;
}

export const usePhotoManagement = ({ setMessage, showConfirmation }: UsePhotoManagementProps) => {
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [originalPhotoOrder, setOriginalPhotoOrder] = useState<Photo[]>([]);
  const [hasEverDragged, setHasEverDragged] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Photo editing
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
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
            photos: albumPhotos.map((p) => p.id.split('/').pop() || p.id),
          }),
          credentials: 'include',
        }
      );

      if (!res.ok) {
        throw new Error('Failed to save photo order');
      }

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
    setMessage({ type: 'success', text: 'Changes discarded' });
  }, [originalPhotoOrder, setMessage]);

  const shufflePhotos = useCallback(() => {
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

  const updatePhotoTitle = useCallback(
    async (filename: string, newTitle: string): Promise<boolean> => {
      if (!selectedAlbum) return false;
      
      try {
        const res = await fetchWithRateLimitCheck(
          `${API_URL}/api/image-metadata/${encodeURIComponent(selectedAlbum)}/${encodeURIComponent(filename)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle }),
            credentials: 'include',
          }
        );

        if (!res.ok) {
          throw new Error('Failed to update title');
        }

        // Update local state
        setAlbumPhotos((prev) =>
          prev.map((p) =>
            (p.id.split('/').pop() || p.id) === filename ? { ...p, title: newTitle } : p
          )
        );
        setOriginalPhotoOrder((prev) =>
          prev.map((p) =>
            (p.id.split('/').pop() || p.id) === filename ? { ...p, title: newTitle } : p
          )
        );
        
        setMessage({ type: 'success', text: 'Photo title updated!' });
        return true;
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to update title' });
        return false;
      }
    },
    [selectedAlbum, setMessage]
  );

  const openEditModal = useCallback((photo: Photo) => {
    setEditingPhoto(photo);
    setEditTitleValue(photo.title || '');
    setShowEditModal(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingPhoto(null);
    setEditTitleValue('');
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingPhoto) return;
    
    const filename = editingPhoto.id.split('/').pop() || '';
    const success = await updatePhotoTitle(filename, editTitleValue);
    if (success) {
      closeEditModal();
    }
  }, [editingPhoto, editTitleValue, updatePhotoTitle, closeEditModal]);

  // Photo drag handlers
  const handlePhotoDragStart = useCallback((_event: DragEndEvent) => {
    setHasEverDragged(true);
    // Prevent scrolling during drag on mobile
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, []);

  const handlePhotoDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    // Restore scrolling
    document.body.style.overflow = '';
    document.body.style.touchAction = '';

    if (over && active.id !== over.id) {
      setAlbumPhotos((photos) => {
        const oldIndex = photos.findIndex((p) => p.id === active.id);
        const newIndex = photos.findIndex((p) => p.id === over.id);
        return arrayMove(photos, oldIndex, newIndex);
      });
    }
  }, []);

  return {
    selectedAlbum,
    albumPhotos,
    setAlbumPhotos,
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
    updatePhotoTitle,
    handlePhotoDragStart,
    handlePhotoDragEnd,
    // Edit modal
    editingPhoto,
    editTitleValue,
    setEditTitleValue,
    showEditModal,
    openEditModal,
    closeEditModal,
    handleEditSave,
  };
};

