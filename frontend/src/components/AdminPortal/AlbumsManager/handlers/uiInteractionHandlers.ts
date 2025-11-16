/**
 * UI Interaction Handlers
 * Handles ghost tile interactions, save/cancel, and folder creation
 */

import React from 'react';
import { Album } from '../types';
import { validateImageFiles, sanitizeAndTitleCase } from '../utils/albumHelpers';

// TypeScript declarations for FileSystem API
interface FileSystemEntry {
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly name: string;
}

interface FileSystemFileEntry extends FileSystemEntry {
  file(successCallback: (file: File) => void, errorCallback?: (error: Error) => void): void;
}

interface FileSystemDirectoryEntry extends FileSystemEntry {
  createReader(): FileSystemDirectoryReader;
}

interface FileSystemDirectoryReader {
  readEntries(
    successCallback: (entries: FileSystemEntry[]) => void,
    errorCallback?: (error: Error) => void
  ): void;
}

// DataTransferItem.webkitGetAsEntry is already declared in lib.dom.d.ts
// No need to redeclare it here

interface UIInteractionHandlersProps {
  localAlbums: Album[];
  loadAlbums: () => Promise<void>;
  setShowNewAlbumModal: (show: boolean) => void;
  setNewAlbumFiles: (files: File[]) => void;
  setNewAlbumModalName: (name: string) => void;
  setIsGhostAlbumDragOver: (value: boolean) => void;
  setDragOverFolderGhostTile: (folderId: number | null) => void;
  setTargetFolderId: (id: number | null) => void;
  ghostTileFileInputRef: React.RefObject<HTMLInputElement | null>;
  folderGhostTileRefs: React.MutableRefObject<Map<number, React.RefObject<HTMLInputElement>>>;
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
  saveAlbumOrder: (albumsToSave?: Album[], silent?: boolean) => Promise<boolean>;
  uploadingImages: any[];
}

export const createUIInteractionHandlers = (props: UIInteractionHandlersProps) => {
  const {
    localAlbums,
    loadAlbums,
    setShowNewAlbumModal,
    setNewAlbumFiles,
    setNewAlbumModalName,
    setIsGhostAlbumDragOver,
    setDragOverFolderGhostTile,
    setTargetFolderId,
    ghostTileFileInputRef,
    folderGhostTileRefs,
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

    let allFiles: File[] = [];
    let folderName = '';

    // Handle folder drops using DataTransferItems API
    if (e.dataTransfer.items) {
      const items = Array.from(e.dataTransfer.items);
      
      // Process all items (folders and files)
      for (const item of items) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            if (entry.isDirectory) {
              // It's a folder - extract files recursively
              folderName = entry.name;
              const dirEntry = entry as unknown as FileSystemDirectoryEntry;
              const files = await getAllFilesFromDirectory(dirEntry, entry.name);
              allFiles.push(...files);
            } else if (entry.isFile) {
              // It's a file
              const file = item.getAsFile();
              if (file) allFiles.push(file);
            }
          }
        }
      }
    }

    // Fallback to dataTransfer.files if items API didn't work
    if (allFiles.length === 0) {
      allFiles = Array.from(e.dataTransfer.files);
    }

    const validation = validateImageFiles(allFiles);

    // Only show error if NO valid images were found
    if (validation.valid.length === 0) {
      setMessage({ type: 'error', text: 'No valid image files found. Please select JPEG, PNG, GIF, or WebP images.' });
      return;
    }

    // Use detected folder name or try to extract from file paths
    if (!folderName && validation.valid.length > 0) {
      const firstFile = validation.valid[0];
      if (firstFile.webkitRelativePath) {
        const pathParts = firstFile.webkitRelativePath.split('/');
        if (pathParts.length > 1) {
          folderName = pathParts[0];
        }
      }
    }

    if (folderName) {
      setNewAlbumModalName(sanitizeAndTitleCase(folderName));
    } else {
      setNewAlbumModalName('');
    }

    setNewAlbumFiles(validation.valid);
    setShowNewAlbumModal(true);
  };

  // Helper function to recursively get all files from a directory
  const getAllFilesFromDirectory = async (
    dirEntry: FileSystemDirectoryEntry,
    path: string = ''
  ): Promise<File[]> => {
    const files: File[] = [];
    const reader = dirEntry.createReader();

    return new Promise((resolve) => {
      const readEntries = () => {
        reader.readEntries(async (entries) => {
          if (entries.length === 0) {
            resolve(files);
            return;
          }

          for (const entry of entries) {
            if (entry.isFile) {
              const fileEntry = entry as FileSystemFileEntry;
              const file = await new Promise<File>((res) => {
                fileEntry.file((f) => {
                  // Create a new File object with webkitRelativePath set
                  const newFile = new File([f], f.name, { type: f.type });
                  Object.defineProperty(newFile, 'webkitRelativePath', {
                    value: `${path}/${f.name}`,
                    writable: false
                  });
                  res(newFile);
                });
              });
              files.push(file);
            } else if (entry.isDirectory) {
              const subFiles = await getAllFilesFromDirectory(
                entry as FileSystemDirectoryEntry,
                `${path}/${entry.name}`
              );
              files.push(...subFiles);
            }
          }

          readEntries();
        });
      };

      readEntries();
    });
  };

  const handleGhostTileFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (uploadingImages.length > 0) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validation = validateImageFiles(fileArray);

    // Only show error if NO valid images were found
    if (validation.valid.length === 0) {
      setMessage({ type: 'error', text: 'No valid image files found. Please select JPEG, PNG, GIF, or WebP images.' });
      return;
    }

    // Extract folder name from the first file's path
    const extractFolderName = (files: File[]): string => {
      if (files.length === 0) return '';
      
      const firstFile = files[0];
      // Check webkitRelativePath for folder selection
      if (firstFile.webkitRelativePath) {
        const pathParts = firstFile.webkitRelativePath.split('/');
        if (pathParts.length > 1) {
          return pathParts[0]; // First part is the folder name
        }
      }
      return '';
    };

    const folderName = extractFolderName(validation.valid);
    if (folderName) {
      setNewAlbumModalName(sanitizeAndTitleCase(folderName));
    } else {
      setNewAlbumModalName('');
    }

    setNewAlbumFiles(validation.valid);
    setShowNewAlbumModal(true);
    e.target.value = '';
  };

  const handleCreateAlbumInFolder = (folderId: number): void => {
    setTargetFolderId(folderId);
    setShowNewAlbumModal(true);
  };

  const handleFolderGhostTileClick = (folderId: number): void => {
    if (uploadingImages.length > 0) return;
    // Get or create ref for this folder
    if (!folderGhostTileRefs.current.has(folderId)) {
      folderGhostTileRefs.current.set(folderId, React.createRef<HTMLInputElement>() as React.RefObject<HTMLInputElement>);
    }
    const ref = folderGhostTileRefs.current.get(folderId);
    ref?.current?.click();
  };

  const handleFolderGhostTileDragOver = (e: React.DragEvent, folderId: number): void => {
    if (uploadingImages.length > 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderGhostTile(folderId);
  };

  const handleFolderGhostTileDragLeave = (e: React.DragEvent): void => {
    if (uploadingImages.length > 0) return;
    e.stopPropagation();
    setDragOverFolderGhostTile(null);
  };

  const handleFolderGhostTileDrop = async (e: React.DragEvent, folderId: number): Promise<void> => {
    if (uploadingImages.length > 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderGhostTile(null);

    let allFiles: File[] = [];
    let folderName = '';

    // Handle folder drops using DataTransferItems API
    if (e.dataTransfer.items) {
      const items = Array.from(e.dataTransfer.items);
      
      // Process all items (folders and files)
      for (const item of items) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            if (entry.isDirectory) {
              // It's a folder - extract files recursively
              folderName = entry.name;
              const dirEntry = entry as unknown as FileSystemDirectoryEntry;
              const files = await getAllFilesFromDirectory(dirEntry, entry.name);
              allFiles.push(...files);
            } else if (entry.isFile) {
              // It's a file
              const file = item.getAsFile();
              if (file) allFiles.push(file);
            }
          }
        }
      }
    }

    // Fallback to dataTransfer.files if items API didn't work
    if (allFiles.length === 0) {
      allFiles = Array.from(e.dataTransfer.files);
    }

    const validation = validateImageFiles(allFiles);

    // Only show error if NO valid images were found
    if (validation.valid.length === 0) {
      setMessage({ type: 'error', text: 'No valid image files found. Please select JPEG, PNG, GIF, or WebP images.' });
      return;
    }

    // Use detected folder name or try to extract from file paths
    if (!folderName && validation.valid.length > 0) {
      const firstFile = validation.valid[0];
      if (firstFile.webkitRelativePath) {
        const pathParts = firstFile.webkitRelativePath.split('/');
        if (pathParts.length > 1) {
          folderName = pathParts[0];
        }
      }
    }

    if (folderName) {
      setNewAlbumModalName(sanitizeAndTitleCase(folderName));
    } else {
      setNewAlbumModalName('');
    }

    setTargetFolderId(folderId);
    setNewAlbumFiles(validation.valid);
    setShowNewAlbumModal(true);
  };

  const handleFolderGhostTileFileSelect = (e: React.ChangeEvent<HTMLInputElement>, folderId: number): void => {
    if (uploadingImages.length > 0) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validation = validateImageFiles(fileArray);

    // Only show error if NO valid images were found
    if (validation.valid.length === 0) {
      setMessage({ type: 'error', text: 'No valid image files found. Please select JPEG, PNG, GIF, or WebP images.' });
      return;
    }

    // Extract folder name from the first file's path
    const extractFolderName = (files: File[]): string => {
      if (files.length === 0) return '';
      
      const firstFile = files[0];
      // Check webkitRelativePath for folder selection
      if (firstFile.webkitRelativePath) {
        const pathParts = firstFile.webkitRelativePath.split('/');
        if (pathParts.length > 1) {
          return pathParts[0]; // First part is the folder name
        }
      }
      return '';
    };

    const folderName = extractFolderName(validation.valid);
    if (folderName) {
      setNewAlbumModalName(sanitizeAndTitleCase(folderName));
    } else {
      setNewAlbumModalName('');
    }

    setTargetFolderId(folderId);
    setNewAlbumFiles(validation.valid);
    setShowNewAlbumModal(true);
    e.target.value = '';
  };

  const handleSaveChanges = async (): Promise<void> => {
    const success = await saveAlbumOrder(localAlbums);
    // saveAlbumOrder already shows success message and sets hasUnsavedChanges
    // No need to duplicate the message here
    if (!success) {
      // Error message already shown by saveAlbumOrder
      return;
    }
    // Reload albums and folders to get updated published states
    // (backend may auto-update folder published state when last album is removed)
    await loadAlbums();
  };

  return {
    handleGhostTileClick,
    handleGhostTileDragOver,
    handleGhostTileDragLeave,
    handleGhostTileDrop,
    handleGhostTileFileSelect,
    handleCreateAlbumInFolder,
    handleFolderGhostTileClick,
    handleFolderGhostTileDragOver,
    handleFolderGhostTileDragLeave,
    handleFolderGhostTileDrop,
    handleFolderGhostTileFileSelect,
    handleSaveChanges,
  };
};

