/**
 * Folder Management Handlers
 * Handles folder deletion, toggling published status, and folder operations
 */

import { Album, AlbumFolder } from '../types';
import { API_URL } from '../../../../config';
import { fetchWithRateLimitCheck } from '../../../../utils/fetchWrapper';


interface FolderHandlersProps {
  localAlbums: Album[];
  localFolders: AlbumFolder[];
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
  loadAlbums: () => Promise<void>;
  saveAlbumOrder: (albumsToSave?: Album[], silent?: boolean) => Promise<boolean>;
  setShowFolderDeleteModal: (show: boolean) => void;
  setFolderToDelete: (folder: { name: string; albumCount: number } | null) => void;
}

export const createFolderHandlers = (props: FolderHandlersProps) => {
  const { localAlbums, localFolders, setMessage, loadAlbums, saveAlbumOrder, setShowFolderDeleteModal, setFolderToDelete } = props;

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
      // Show custom modal with options to release or delete albums
      setFolderToDelete({ name: folderName, albumCount: albumsInFolder.length });
      setShowFolderDeleteModal(true);
    }
  };

  const handleDeleteFolderWithAlbums = async (folderName: string, deleteAlbums: boolean): Promise<void> => {
    try {
      const url = `${API_URL}/api/folders/${encodeURIComponent(folderName)}${deleteAlbums ? '?deleteAlbums=true' : ''}`;
      const res = await fetchWithRateLimitCheck(url, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        const action = deleteAlbums ? 'deleted with all albums' : 'deleted (albums moved to Uncategorized)';
        setMessage({ type: 'success', text: `Folder "${folderName}" ${action}` });
        await loadAlbums();
        
        // Notify other components
        window.dispatchEvent(new Event('albums-updated'));
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to delete folder' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
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
        const data = await res.json();
        setMessage({
          type: 'success',
          text: `Folder "${folderName}" ${!currentPublished ? 'published' : 'unpublished'}`,
        });
        await loadAlbums();
        
        // Notify other components (like AdminPortal header dropdown)
        window.dispatchEvent(new Event('albums-updated'));
        
        console.log(`✓ Folder "${folderName}" published=${!currentPublished}, ${data.albumsUpdated || 0} albums updated`);
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
    handleDeleteFolderWithAlbums,
    handleToggleFolderPublished,
  };
};

