/**
 * Mobile Reorder Handlers
 * Handlers for moving albums and folders up/down using arrow buttons on mobile
 */

import { Album, Folder } from '../types';

interface MobileReorderHandlersParams {
  localAlbums: Album[];
  setLocalAlbums: React.Dispatch<React.SetStateAction<Album[]>>;
  localFolders: Folder[];
  setLocalFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  saveAlbumOrder: (albumsToSave?: Album[], silent?: boolean) => Promise<boolean>;
  saveFolderOrder: (foldersToSave: Folder[]) => Promise<boolean>;
}

export const createMobileReorderHandlers = ({
  localAlbums,
  setLocalAlbums,
  localFolders,
  setLocalFolders,
  saveAlbumOrder,
  saveFolderOrder,
}: MobileReorderHandlersParams) => {
  /**
   * Move an album up in its current context (folder or uncategorized)
   */
  const handleAlbumMoveUp = async (albumName: string) => {
    const albumIndex = localAlbums.findIndex(a => a.name === albumName);
    if (albumIndex <= 0) return; // Already at the top
    
    const album = localAlbums[albumIndex];
    const prevAlbum = localAlbums[albumIndex - 1];
    
    // Only allow moving within the same folder context
    if (album.folder_id !== prevAlbum.folder_id) return;
    
    // Swap positions
    const newAlbums = [...localAlbums];
    [newAlbums[albumIndex - 1], newAlbums[albumIndex]] = [newAlbums[albumIndex], newAlbums[albumIndex - 1]];
    
    setLocalAlbums(newAlbums);
    
    // Save immediately
    await saveAlbumOrder(newAlbums, true);
  };

  /**
   * Move an album down in its current context (folder or uncategorized)
   */
  const handleAlbumMoveDown = async (albumName: string) => {
    const albumIndex = localAlbums.findIndex(a => a.name === albumName);
    if (albumIndex < 0 || albumIndex >= localAlbums.length - 1) return; // Already at the bottom or not found
    
    const album = localAlbums[albumIndex];
    const nextAlbum = localAlbums[albumIndex + 1];
    
    // Only allow moving within the same folder context
    if (album.folder_id !== nextAlbum.folder_id) return;
    
    // Swap positions
    const newAlbums = [...localAlbums];
    [newAlbums[albumIndex], newAlbums[albumIndex + 1]] = [newAlbums[albumIndex + 1], newAlbums[albumIndex]];
    
    setLocalAlbums(newAlbums);
    
    // Save immediately
    await saveAlbumOrder(newAlbums, true);
  };

  /**
   * Move a folder up in the folder list
   */
  const handleFolderMoveUp = async (folderId: number) => {
    const folderIndex = localFolders.findIndex(f => f.id === folderId);
    if (folderIndex <= 0) return; // Already at the top
    
    // Swap positions
    const newFolders = [...localFolders];
    [newFolders[folderIndex - 1], newFolders[folderIndex]] = [newFolders[folderIndex], newFolders[folderIndex - 1]];
    
    setLocalFolders(newFolders);
    
    // Save immediately
    await saveFolderOrder(newFolders);
  };

  /**
   * Move a folder down in the folder list
   */
  const handleFolderMoveDown = async (folderId: number) => {
    const folderIndex = localFolders.findIndex(f => f.id === folderId);
    if (folderIndex < 0 || folderIndex >= localFolders.length - 1) return; // Already at the bottom or not found
    
    // Swap positions
    const newFolders = [...localFolders];
    [newFolders[folderIndex], newFolders[folderIndex + 1]] = [newFolders[folderIndex + 1], newFolders[folderIndex]];
    
    setLocalFolders(newFolders);
    
    // Save immediately
    await saveFolderOrder(newFolders);
  };

  return {
    handleAlbumMoveUp,
    handleAlbumMoveDown,
    handleFolderMoveUp,
    handleFolderMoveDown,
  };
};

