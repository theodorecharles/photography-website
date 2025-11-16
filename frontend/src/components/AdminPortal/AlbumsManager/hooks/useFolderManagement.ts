/**
 * useFolderManagement Hook
 * Manages folder creation, deletion, and organization
 */

import { useState, useCallback } from 'react';
import { ConfirmModalConfig } from '../types';
import { fetchWithRateLimitCheck } from '../../../../utils/fetchWrapper';

const API_URL = import.meta.env.VITE_API_URL || '';

interface UseFolderManagementProps {
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
  loadAlbums: () => Promise<void>;
  showConfirmation: (config: ConfirmModalConfig) => void;
}

export const useFolderManagement = ({
  setMessage,
  loadAlbums,
  showConfirmation,
}: UseFolderManagementProps) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const createFolder = useCallback(async (folderName: string): Promise<boolean> => {
    const sanitizedName = folderName.trim();
    
    if (!sanitizedName) {
      setMessage({ type: 'error', text: 'Folder name cannot be empty' });
      return false;
    }

    setIsCreatingFolder(true);
    try {
      const res = await fetchWithRateLimitCheck(`${API_URL}/api/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: sanitizedName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create folder');
      }

      await loadAlbums();
      setMessage({ type: 'success', text: `Folder "${sanitizedName}" created!` });
      setNewFolderName('');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create folder';
      setMessage({ type: 'error', text: errorMessage });
      return false;
    } finally {
      setIsCreatingFolder(false);
    }
  }, [loadAlbums, setMessage]);

  const deleteFolder = useCallback(async (folderId: number, folderName: string): Promise<boolean> => {
    showConfirmation({
      message: `Are you sure you want to delete the folder "${folderName}"? Albums in this folder will be moved to Uncategorized.`,
      confirmText: 'Delete Folder',
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetchWithRateLimitCheck(`${API_URL}/api/folders/${folderId}`, {
            method: 'DELETE',
            credentials: 'include',
          });

          if (!res.ok) {
            throw new Error('Failed to delete folder');
          }

          await loadAlbums();
          setMessage({ type: 'success', text: `Folder "${folderName}" deleted!` });
          
          // Notify other components
          window.dispatchEvent(new Event('albums-updated'));
        } catch (err) {
          setMessage({ type: 'error', text: 'Failed to delete folder' });
        }
      },
    });
    return true; // Return immediately, actual deletion happens in onConfirm
  }, [loadAlbums, setMessage, showConfirmation]);

  const toggleFolderPublished = useCallback(async (
    folderId: number,
    folderName: string,
    currentPublished: boolean
  ): Promise<boolean> => {
    try {
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/folders/${folderId}/publish`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ published: !currentPublished }),
        }
      );

      if (!res.ok) {
        throw new Error('Failed to update folder');
      }

      await loadAlbums();
      setMessage({
        type: 'success',
        text: `Folder "${folderName}" ${!currentPublished ? 'published' : 'unpublished'}!`,
      });
      
      // Notify other components
      window.dispatchEvent(new Event('albums-updated'));
      
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update folder' });
      return false;
    }
  }, [loadAlbums, setMessage]);

  const moveAlbumToFolder = useCallback(async (
    albumName: string,
    targetFolderId: number | null
  ): Promise<boolean> => {
    try {
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/albums/${encodeURIComponent(albumName)}/move`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ folder_id: targetFolderId }),
        }
      );

      if (!res.ok) {
        throw new Error('Failed to move album');
      }

      return true;
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to move album' });
      return false;
    }
  }, [setMessage]);

  const saveFolderOrder = useCallback(async (folders: Array<{ id: number; name: string; published: boolean; sort_order: number | null }>): Promise<boolean> => {
    try {
      // Format folders for the API (needs folderOrders array with name and sort_order)
      const folderOrders = folders.map((folder, index) => ({
        name: folder.name,
        sort_order: index,
      }));

      const res = await fetchWithRateLimitCheck(`${API_URL}/api/folders/sort-order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ folderOrders }),
      });

      if (!res.ok) {
        throw new Error('Failed to save folder order');
      }

      setMessage({ type: 'success', text: 'Folder order saved!' });
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save folder order' });
      return false;
    }
  }, [setMessage]);

  return {
    newFolderName,
    setNewFolderName,
    isCreatingFolder,
    createFolder,
    deleteFolder,
    toggleFolderPublished,
    moveAlbumToFolder,
    saveFolderOrder,
  };
};

