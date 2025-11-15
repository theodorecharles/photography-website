/**
 * useAlbumManagement Hook
 * Manages album state, creation, deletion, and organization
 */

import { useState, useEffect, useCallback } from 'react';
import { Album, AlbumFolder } from '../types';
import { fetchWithRateLimitCheck } from '../../../../utils/fetchWrapper';
import { trackAlbumCreated, trackAlbumDeleted } from '../../../../utils/analytics';

const API_URL = import.meta.env.VITE_API_URL || '';

interface UseAlbumManagementProps {
  albums: Album[];
  folders: AlbumFolder[];
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
  loadAlbums: () => Promise<void>;
}

export const useAlbumManagement = ({
  albums,
  folders,
  setMessage,
  loadAlbums,
}: UseAlbumManagementProps) => {
  // Local state for optimistic updates
  const [localAlbums, setLocalAlbums] = useState<Album[]>(albums);
  const [localFolders, setLocalFolders] = useState<AlbumFolder[]>(folders);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [animatingAlbum, setAnimatingAlbum] = useState<string | null>(null);

  // Sync local state with props when props change (if no unsaved changes)
  useEffect(() => {
    if (!hasUnsavedChanges) {
      setLocalAlbums(albums);
    }
  }, [albums, hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setLocalFolders(folders);
    }
  }, [folders, hasUnsavedChanges]);

  const createAlbum = useCallback(async (albumName: string): Promise<boolean> => {
    try {
      const res = await fetchWithRateLimitCheck(`${API_URL}/api/albums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: albumName }),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create album');
      }

      await loadAlbums();
      setMessage({ type: 'success', text: `Album "${albumName}" created successfully!` });
      trackAlbumCreated(albumName);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setMessage({ type: 'error', text: errorMessage });
      return false;
    }
  }, [loadAlbums, setMessage]);

  const deleteAlbum = useCallback(async (albumName: string): Promise<boolean> => {
    if (!confirm(`Are you sure you want to delete the album "${albumName}"? This will delete all photos in the album.`)) {
      return false;
    }

    setAnimatingAlbum(albumName);
    
    try {
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/albums/${encodeURIComponent(albumName)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!res.ok) {
        throw new Error('Failed to delete album');
      }

      setTimeout(() => {
        setAnimatingAlbum(null);
        loadAlbums();
      }, 300);

      setMessage({ type: 'success', text: `Album "${albumName}" deleted successfully!` });
      trackAlbumDeleted(albumName);
      return true;
    } catch (err) {
      setAnimatingAlbum(null);
      setMessage({ type: 'error', text: 'Failed to delete album' });
      return false;
    }
  }, [loadAlbums, setMessage]);

  const toggleAlbumPublished = useCallback(async (
    albumName: string,
    currentPublished: boolean
  ): Promise<boolean> => {
    try {
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/albums/${encodeURIComponent(albumName)}/publish`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ published: !currentPublished }),
          credentials: 'include',
        }
      );

      if (!res.ok) {
        throw new Error('Failed to update album');
      }

      // Update local state optimistically
      setLocalAlbums(prev =>
        prev.map(album =>
          album.name === albumName
            ? { ...album, published: !currentPublished }
            : album
        )
      );

      setMessage({
        type: 'success',
        text: `Album "${albumName}" ${!currentPublished ? 'published' : 'unpublished'}!`,
      });
      
      // Notify other components
      window.dispatchEvent(new Event('albums-updated'));
      
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update album' });
      return false;
    }
  }, [setMessage]);

  const saveAlbumOrder = useCallback(async (albumsToSave?: Album[], silent?: boolean): Promise<boolean> => {
    try {
      // Use provided albums or fall back to internal state
      const albumsForSaving = albumsToSave || localAlbums;
      
      // Format albums for the API (needs albumOrders array with name and sort_order)
      const albumOrders = albumsForSaving.map((album, index) => ({
        name: album.name,
        sort_order: index,
      }));

      const res = await fetchWithRateLimitCheck(`${API_URL}/api/albums/sort-order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumOrders }),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to save album order');
      }

      setHasUnsavedChanges(false);
      
      // Only show success message if not silent
      if (!silent) {
        setMessage({ type: 'success', text: 'Album order saved successfully!' });
      }
      
      // Notify other components
      window.dispatchEvent(new CustomEvent('albums-updated', { detail: { skipReload: true } }));
      
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save album order' });
      return false;
    }
  }, [localAlbums, setMessage]);

  const cancelReorder = useCallback(() => {
    setLocalAlbums(albums);
    setLocalFolders(folders);
    setHasUnsavedChanges(false);
    setMessage({ type: 'success', text: 'Changes discarded' });
  }, [albums, folders, setMessage]);

  return {
    localAlbums,
    setLocalAlbums,
    localFolders,
    setLocalFolders,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    animatingAlbum,
    setAnimatingAlbum,
    createAlbum,
    deleteAlbum,
    toggleAlbumPublished,
    saveAlbumOrder,
    cancelReorder,
  };
};

