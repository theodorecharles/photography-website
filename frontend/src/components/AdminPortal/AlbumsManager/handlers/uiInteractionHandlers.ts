/**
 * UI Interaction Handlers
 * Handles ghost tile interactions, save/cancel, and folder creation
 */

import { Album, AlbumFolder } from '../types';
import { validateImageFiles, sanitizeAndTitleCase } from '../utils/albumHelpers';

interface UIInteractionHandlersProps {
  localAlbums: Album[];
  setLocalAlbums: (albums: Album[]) => void;
  albums: Album[];
  folders: AlbumFolder[];
  setHasUnsavedChanges: (value: boolean) => void;
  setShowNewAlbumModal: (show: boolean) => void;
  setNewAlbumFiles: (files: File[]) => void;
  setIsGhostAlbumDragOver: (value: boolean) => void;
  setTargetFolderId: (id: number | null) => void;
  ghostTileFileInputRef: React.RefObject<HTMLInputElement | null>;
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
  saveAlbumOrder: (albumsToSave?: Album[]) => Promise<boolean>;
  uploadingImages: any[];
}

export const createUIInteractionHandlers = (props: UIInteractionHandlersProps) => {
  const {
    localAlbums,
    setLocalAlbums,
    albums,
    folders,
    setHasUnsavedChanges,
    setShowNewAlbumModal,
    setNewAlbumFiles,
    setIsGhostAlbumDragOver,
    setTargetFolderId,
    ghostTileFileInputRef,
    setMessage,
    saveAlbumOrder,
    uploadingImages,
  } = props;

  const handleGhostTileClick = (): void => {
    if (uploadingImages.length > 0) return;
    ghostTileFileInputRef.current?.click();
  };

  const handleGhostTileDragOver = (e: React.DragEvent): void => {
    if (uploadingImages.length > 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIsGhostAlbumDragOver(true);
  };

  const handleGhostTileDragLeave = (e: React.DragEvent): void => {
    if (uploadingImages.length > 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIsGhostAlbumDragOver(false);
  };

  const handleGhostTileDrop = async (e: React.DragEvent): Promise<void> => {
    if (uploadingImages.length > 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIsGhostAlbumDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const validation = validateImageFiles(files);

    if (!validation.valid) {
      setMessage({ type: 'error', text: validation.error || 'Invalid files' });
      return;
    }

    setNewAlbumFiles(validation.files);
    setShowNewAlbumModal(true);
  };

  const handleGhostTileFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (uploadingImages.length > 0) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validation = validateImageFiles(fileArray);

    if (!validation.valid) {
      setMessage({ type: 'error', text: validation.error || 'Invalid files' });
      return;
    }

    setNewAlbumFiles(validation.files);
    setShowNewAlbumModal(true);
    e.target.value = '';
  };

  const handleCreateAlbumInFolder = (folderId: number): void => {
    setTargetFolderId(folderId);
    setShowNewAlbumModal(true);
  };

  const handleSaveChanges = async (): Promise<void> => {
    const success = await saveAlbumOrder(localAlbums);
    if (success) {
      setMessage({ type: 'success', text: 'Changes saved successfully!' });
      setHasUnsavedChanges(false);
    }
  };

  const handleCancelChanges = (): void => {
    setLocalAlbums(albums);
    setHasUnsavedChanges(false);
    setMessage({ type: 'success', text: 'Changes discarded' });
  };

  return {
    handleGhostTileClick,
    handleGhostTileDragOver,
    handleGhostTileDragLeave,
    handleGhostTileDrop,
    handleGhostTileFileSelect,
    handleCreateAlbumInFolder,
    handleSaveChanges,
    handleCancelChanges,
  };
};

