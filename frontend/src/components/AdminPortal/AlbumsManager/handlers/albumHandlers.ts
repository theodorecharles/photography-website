/**
 * Album Management Handlers
 * Handles album deletion, renaming, publishing, and moving between folders
 */

import { Album, AlbumFolder, ConfirmModalConfig } from '../types';
import { API_URL } from '../../../../config';
import { fetchWithRateLimitCheck } from '../../../../utils/fetchWrapper';
import { trackAlbumDeleted } from '../../../../utils/analytics';
import { sanitizeAndTitleCase, isValidAlbumName } from '../utils/albumHelpers';


interface AlbumHandlersProps {
  localAlbums: Album[];
  setLocalAlbums: (albums: Album[]) => void;
  localFolders: AlbumFolder[];
  selectedAlbum: string | null;
  deselectAlbum: () => void;
  selectAlbum: (albumName: string) => void;
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
  loadAlbums: () => Promise<void>;
  saveAlbumOrder: (albumsToSave?: Album[], silent?: boolean) => Promise<boolean>;
  setShowRenameModal: (show: boolean) => void;
  setRenamingAlbum: (album: string | null) => void;
  setNewAlbumName: (name: string) => void;
  renamingAlbum: string | null;
  newAlbumName: string;
  showConfirmation: (config: ConfirmModalConfig) => void;
  closePhotosPanel?: () => void; // Optional handler to trigger closing animation
}

export const createAlbumHandlers = (props: AlbumHandlersProps) => {
  const {
    localAlbums,
    setLocalAlbums,
    localFolders,
    selectedAlbum,
    deselectAlbum,
    selectAlbum,
    setMessage,
    loadAlbums,
    saveAlbumOrder,
    setShowRenameModal,
    setRenamingAlbum,
    setNewAlbumName,
    renamingAlbum,
    newAlbumName,
    showConfirmation,
    closePhotosPanel,
  } = props;

  const handleDeleteAlbum = async (albumName: string): Promise<void> => {
    // Save any unsaved changes before deleting (silently, no success message)
    const saveSuccess = await saveAlbumOrder(localAlbums, true);
    if (!saveSuccess) {
      setMessage({ type: 'error', text: 'Failed to save changes before deleting album' });
      return;
    }

    showConfirmation({
      message: `Are you sure you want to delete the album "${albumName}"?\n\nThis will permanently delete all photos in this album.\n\nThis action cannot be undone.`,
      confirmText: 'Delete Album',
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetchWithRateLimitCheck(
            `${API_URL}/api/albums/${encodeURIComponent(albumName)}`,
            {
              method: 'DELETE',
              credentials: 'include',
            }
          );

          if (res.ok) {
            setMessage({ type: 'success', text: `Album "${albumName}" deleted` });
            trackAlbumDeleted(albumName);
            // If deleting the currently open album, trigger closing animation
            if (selectedAlbum === albumName) {
              if (closePhotosPanel) {
                closePhotosPanel(); // Triggers animation, then calls deselectAlbum
              } else {
                deselectAlbum(); // Fallback if animation handler not available
              }
            }
            await loadAlbums();
            window.dispatchEvent(new Event('albums-updated'));
          } else {
            const error = await res.json();
            setMessage({ type: 'error', text: error.error || 'Failed to delete album' });
          }
        } catch (err) {
          setMessage({ type: 'error', text: 'Network error occurred' });
        }
      },
    });
  };

  const handleTogglePublished = async (
    albumName: string,
    currentPublished: boolean,
    event?: React.MouseEvent
  ): Promise<void> => {
    if (event) {
      event.stopPropagation();
    }

    const newPublishedState = !currentPublished;

    try {
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/albums/${encodeURIComponent(albumName)}/publish`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ published: newPublishedState }),
        }
      );

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Album "${albumName}" ${newPublishedState ? 'published' : 'unpublished'}`,
        });
        await loadAlbums();
        window.dispatchEvent(new Event('albums-updated'));
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update album' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };

  const handleToggleHomepage = async (
    albumName: string,
    currentShowOnHomepage: boolean,
    event?: React.MouseEvent
  ): Promise<void> => {
    if (event) {
      event.stopPropagation();
    }

    const newShowOnHomepageState = !currentShowOnHomepage;

    try {
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/albums/${encodeURIComponent(albumName)}/show-on-homepage`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ showOnHomepage: newShowOnHomepageState }),
        }
      );

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Album "${albumName}" ${newShowOnHomepageState ? 'added to' : 'removed from'} homepage`,
        });
        await loadAlbums();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update album' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };

  const handleOpenRenameModal = (albumName: string): void => {
    setRenamingAlbum(albumName);
    setNewAlbumName(albumName);
    setShowRenameModal(true);
  };

  const handleRenameAlbum = async (): Promise<void> => {
    if (!renamingAlbum) return;

    const sanitized = sanitizeAndTitleCase(newAlbumName);

    if (!isValidAlbumName(sanitized)) {
      setMessage({
        type: 'error',
        text: 'Album name can only contain letters, numbers, spaces, hyphens, and underscores',
      });
      return;
    }

    if (sanitized === renamingAlbum) {
      setShowRenameModal(false);
      return;
    }

    if (localAlbums.some(a => a.name === sanitized)) {
      setMessage({ type: 'error', text: `Album "${sanitized}" already exists` });
      return;
    }

    try {
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/albums/${encodeURIComponent(renamingAlbum)}/rename`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ newName: sanitized }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to rename album');
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

  const handleMoveAlbumToFolder = async (
    albumName: string,
    folderId: number | null
  ): Promise<void> => {
    const currentAlbum = localAlbums.find(a => a.name === albumName);
    if (!currentAlbum) return;

    const targetFolder = folderId ? localFolders.find(f => f.id === folderId) : null;
    const targetPublishedStatus = targetFolder 
      ? targetFolder.published 
      : (currentAlbum?.published ?? true);

    const updatedAlbums = localAlbums.map(album =>
      album.name === albumName
        ? { ...album, folder_id: folderId, published: targetPublishedStatus }
        : album
    );

    setLocalAlbums(updatedAlbums);

    try {
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/albums/${encodeURIComponent(albumName)}/move`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ folderId, published: targetPublishedStatus }),
        }
      );

      if (!res.ok) {
        throw new Error('Failed to move album');
      }

      const folderName = targetFolder?.name || 'Uncategorized';
      setMessage({ type: 'success', text: `Album moved to ${folderName}` });
      await loadAlbums();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to move album' });
      // Revert on error
      setLocalAlbums(localAlbums);
    }
  };

  return {
    handleDeleteAlbum,
    handleTogglePublished,
    handleToggleHomepage,
    handleOpenRenameModal,
    handleRenameAlbum,
    handleMoveAlbumToFolder,
  };
};

