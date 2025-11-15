/**
 * Folder Management Handlers
 * Handles folder deletion, toggling published status, and folder operations
 */

import { Album, AlbumFolder } from '../types';
import { fetchWithRateLimitCheck } from '../../../../utils/fetchWrapper';

const API_URL = import.meta.env.VITE_API_URL || '';

interface FolderHandlersProps {
  localAlbums: Album[];
  localFolders: AlbumFolder[];
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
  loadAlbums: () => Promise<void>;
  saveAlbumOrder: (albumsToSave?: Album[], silent?: boolean) => Promise<boolean>;
}

export const createFolderHandlers = (props: FolderHandlersProps) => {
  const { localAlbums, localFolders, setMessage, loadAlbums, saveAlbumOrder } = props;

  const handleDeleteEmptyFolder = async (folderName: string): Promise<boolean> => {
    try {
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/folders/${encodeURIComponent(folderName)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (res.ok) {
        setMessage({ type: 'success', text: `Folder "${folderName}" deleted` });
        await loadAlbums();
        return true;
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to delete folder' });
        return false;
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
      return false;
    }
  };

  const handleDeleteFolder = async (folderName: string): Promise<void> => {
    const folder = localFolders.find(f => f.name === folderName);
    if (!folder) return;

    const albumsInFolder = localAlbums.filter(a => a.folder_id === folder.id);

    // Save any unsaved changes before deleting (silently, no success message)
    const saveSuccess = await saveAlbumOrder(localAlbums, true);
    if (!saveSuccess) {
      setMessage({ type: 'error', text: 'Failed to save changes before deleting folder' });
      return;
    }

    if (albumsInFolder.length === 0) {
      await handleDeleteEmptyFolder(folderName);
    } else {
      // Show confirmation modal for non-empty folder
      setMessage({ 
        type: 'error', 
        text: `Folder "${folderName}" contains ${albumsInFolder.length} album(s). Please use the delete button in the folder card.` 
      });
    }
  };

  const handleToggleFolderPublished = async (
    folderName: string,
    currentPublished: boolean
  ): Promise<void> => {
    try {
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/folders/${encodeURIComponent(folderName)}/publish`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ published: !currentPublished }),
        }
      );

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Folder "${folderName}" ${!currentPublished ? 'published' : 'unpublished'}`,
        });
        await loadAlbums();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update folder' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };

  return {
    handleDeleteFolder,
    handleDeleteEmptyFolder,
    handleToggleFolderPublished,
  };
};

