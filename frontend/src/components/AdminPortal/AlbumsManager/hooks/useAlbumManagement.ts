/**
 * useAlbumManagement Hook
 * Manages album state, creation, deletion, and organization
 */

import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../../../config';
import { Album, AlbumFolder } from '../types';
import { fetchWithRateLimitCheck } from '../../../../utils/fetchWrapper';
import { trackAlbumCreated, trackAlbumDeleted } from '../../../../utils/analytics';
import { info } from '../../../../utils/logger';


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
  const [animatingAlbum, setAnimatingAlbum] = useState<string | null>(null);

  // Sync local state with props when props change
  useEffect(() => {
    setLocalAlbums(albums);
  }, [albums]);

  // Always sync folders - folder changes are independent of album changes
  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

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
      
      // Step 1: Check for albums that changed folders and move them first
      const albumsThatMovedFolders = albumsForSaving.filter(localAlbum => {
        const originalAlbum = albums.find(a => a.name === localAlbum.name);
        if (!originalAlbum) return false;
        
        // Check if folder_id changed (handle null/undefined equivalence)
        const originalFolderId = originalAlbum.folder_id ?? null;
        const newFolderId = localAlbum.folder_id ?? null;
        return originalFolderId !== newFolderId;
      });
      
      info('Albums that changed folders:', albumsThatMovedFolders.map(a => ({
        name: a.name,
        from: albums.find(orig => orig.name === a.name)?.folder_id,
        to: a.folder_id,
      })));
      
      // Move albums between folders
      for (const album of albumsThatMovedFolders) {
        const folder = localFolders.find(f => f.id === album.folder_id);
        const folderName = folder?.name || null;
        
        info(`Moving album "${album.name}" to folder:`, folderName);
        
        const moveRes = await fetchWithRateLimitCheck(`${API_URL}/api/albums/${encodeURIComponent(album.name)}/move`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            folderName,
            published: album.published,
          }),
          credentials: 'include',
        });
        
        if (!moveRes.ok) {
          const errorText = await moveRes.text();
          throw new Error(`Failed to move album "${album.name}": ${errorText}`);
        }
      }
      
      // Step 2: Format albums for the API (needs albumOrders array with name and sort_order)
      const albumOrders = albumsForSaving.map((album, index) => ({
        name: album.name,
        sort_order: index,
      }));

      // Save albums order
      const albumRes = await fetchWithRateLimitCheck(`${API_URL}/api/albums/sort-order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumOrders }),
        credentials: 'include',
      });

      if (!albumRes.ok) {
        throw new Error('Failed to save album order');
      }

      // Step 3: Save folders order (if any folders exist)
      if (localFolders.length > 0) {
        const folderOrders = localFolders.map((folder, index) => ({
          name: folder.name,
          sort_order: index,
        }));

        const folderRes = await fetchWithRateLimitCheck(`${API_URL}/api/folders/sort-order`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderOrders }),
          credentials: 'include',
        });

        if (!folderRes.ok) {
          throw new Error('Failed to save folder order');
        }
      }

      // Reload albums from server to get the saved order
      await loadAlbums();
      
      // Only show success message if not silent
      if (!silent) {
        const message = localFolders.length > 0 
          ? 'Changes saved successfully!' 
          : 'Album order saved successfully!';
        setMessage({ type: 'success', text: message });
      }
      
      // Notify other components
      window.dispatchEvent(new CustomEvent('albums-updated', { detail: { skipReload: true } }));
      
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save changes';
      setMessage({ type: 'error', text: errorMsg });
      return false;
    }
  }, [localAlbums, localFolders, albums, setMessage, loadAlbums]);

  return {
    localAlbums,
    setLocalAlbums,
    localFolders,
    setLocalFolders,
    animatingAlbum,
    setAnimatingAlbum,
    createAlbum,
    deleteAlbum,
    toggleAlbumPublished,
    saveAlbumOrder,
  };
};

