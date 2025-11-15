/**
 * Albums Manager - Main Orchestrator
 * Manages albums, photos, uploads, and image optimization
 * 
 * Refactored to use extracted components:
 * - SortableAlbumCard: Drag-and-drop album cards
 * - SortablePhotoItem: Drag-and-drop photo thumbnails
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UploadingImage, AlbumsManagerProps, ConfirmModalConfig } from './types';
import { trackAlbumCreated } from '../../../utils/analytics';
import PhotosPanel from './components/PhotosPanel';
import AlbumToolbar from './components/AlbumToolbar';
import FoldersSection from './components/FoldersSection';
import UncategorizedSection from './components/UncategorizedSection';
import ModalsCollection from './components/ModalsCollection';
import { useAlbumManagement } from './hooks/useAlbumManagement';
import { usePhotoManagement } from './hooks/usePhotoManagement';
import { useFolderManagement } from './hooks/useFolderManagement';
import { isValidAlbumName } from './utils/albumHelpers';
import { customCollisionDetection } from './utils/collisionDetection';
import { createDragDropHandlers } from './handlers/dragDropHandlers';
import { createFolderHandlers } from './handlers/folderHandlers';
import { createUploadHandlers } from './handlers/uploadHandlers';
import { createAlbumHandlers } from './handlers/albumHandlers';
import { createUIInteractionHandlers } from './handlers/uiInteractionHandlers';
import { createPhotoHandlers } from './handlers/photoHandlers';
import '../AlbumsManager.css';
import '../PhotoOrderControls.css';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

const API_URL = import.meta.env.VITE_API_URL || '';

const AlbumsManager: React.FC<AlbumsManagerProps> = ({
  albums,
  folders,
  loadAlbums,
  setMessage,
  userRole,
}) => {
  // Check if user can edit (admin or manager)
  const canEdit = userRole === 'admin' || userRole === 'manager';
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Confirmation modal state (needed early for hooks)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmModalConfig | null>(null);
  
  // Helper function to show confirmation dialog
  const showConfirmation = useCallback((config: ConfirmModalConfig) => {
    setConfirmConfig(config);
    setShowConfirmModal(true);
  }, []);
  
  // Use custom hooks for album, photo, and folder management
  const albumManagement = useAlbumManagement({ albums, folders, setMessage, loadAlbums });
  const photoManagement = usePhotoManagement({ setMessage, showConfirmation });
  const folderManagement = useFolderManagement({ setMessage, loadAlbums, showConfirmation });
  
  // Extract commonly used values from hooks
  const {
    localAlbums,
    setLocalAlbums,
    localFolders,
    setLocalFolders,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    animatingAlbum,
    setAnimatingAlbum,
  } = albumManagement;
  
  const {
    selectedAlbum,
    albumPhotos,
    // setAlbumPhotos,
    loadingPhotos,
    hasEverDragged,
    // setHasEverDragged,
    savingOrder,
    selectAlbum: selectAlbumInternal,
    deselectAlbum: deselectAlbumInternal,
    editingPhoto,
    editTitleValue,
    setEditTitleValue,
    showEditModal,
    openEditModal,
    closeEditModal,
    handleEditSave,
  } = photoManagement;
  
  // Sync URL with selected album state
  useEffect(() => {
    const albumParam = searchParams.get('album');
    
    // If URL has an album and it's valid
    if (albumParam && albums.some(a => a.name === albumParam)) {
      // Only select if not already selected (to prevent infinite loop)
      if (selectedAlbum !== albumParam) {
        selectAlbumInternal(albumParam);
      }
    } else if (!albumParam && selectedAlbum) {
      // If URL has no album but state has one, deselect
      deselectAlbumInternal();
    }
  }, [albums, searchParams, selectedAlbum, selectAlbumInternal, deselectAlbumInternal]);
  
  // Wrapper to update URL when selecting an album
  const selectAlbum = useCallback((albumName: string) => {
    setSearchParams({ album: albumName }, { replace: false });
  }, [setSearchParams]);
  
  // Wrapper to clear URL when deselecting an album
  const deselectAlbum = useCallback(() => {
    searchParams.delete('album');
    setSearchParams(searchParams, { replace: false });
  }, [searchParams, setSearchParams]);
  
  // Upload state (keeping this in component for now due to complexity)
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const uploadingImagesRef = useRef<UploadingImage[]>([]);
  
  // Drag-and-drop state (keeping this in component for now)
  const [isDragging] = useState(false);
  const [isShuffling] = useState(false);
  
  // Folder management is handled via folderManagement object
  
  // State for drag-and-drop on album tiles
  const [dragOverAlbum] = useState<string | null>(null);
  const [isGhostAlbumDragOver, setIsGhostAlbumDragOver] = useState(false);
  const [showNewAlbumModal, setShowNewAlbumModal] = useState(false);
  const [newAlbumFiles, setNewAlbumFiles] = useState<File[]>([]);
  const [newAlbumModalName, setNewAlbumModalName] = useState('');
  const [newAlbumPublished, setNewAlbumPublished] = useState(true);
  const [newAlbumModalError, setNewAlbumModalError] = useState('');
  
  // Folder modal state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderModalError, setFolderModalError] = useState('');
  const [targetFolderId, setTargetFolderId] = useState<number | null>(null);
  
  // Rename album state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingAlbum, setRenamingAlbum] = useState<string | null>(null);
  const [newAlbumName, setNewAlbumName] = useState('');
  
  // Folder drag-over state (when an album is dragged over a folder)
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null>(null);
  const [dragOverUncategorized, setDragOverUncategorized] = useState(false);
  
  // Track where to show the placeholder when dragging between folders
  const [placeholderInfo, setPlaceholderInfo] = useState<{
    folderId: number | null;
    insertAtIndex: number;
  } | null>(null);
  
  // Ref to track if we're currently dragging (for touch scroll prevention)
  // const isDraggingRef = useRef(false); // unused for now
  
  // Ref for ghost tile file input
  const ghostTileFileInputRef = useRef<HTMLInputElement>(null);

  // Ref for uncategorized section (for manual bounding box checks)
  const uncategorizedSectionRef = useRef<HTMLDivElement>(null);

  // Detect if device supports touch
  const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  
  // Configure dnd-kit sensors for photos (unused for now)
  // Desktop: minimal delay for instant drag, mobile: longer delay to differentiate tap vs drag
  // const photoSensors = useSensors(
  //   useSensor(PointerSensor, {
  //     activationConstraint: isTouchDevice ? {
  //       delay: 300, // Mobile: require 300ms hold before drag starts
  //       tolerance: 8, // Mobile: allow 8px movement during the delay
  //     } : {
  //       distance: 5, // Desktop: require 5px movement to start drag (prevents accidental drags on click)
  //     },
  //   }),
  //   useSensor(KeyboardSensor, {
  //     coordinateGetter: sortableKeyboardCoordinates,
  //   })
  // );

  // Configure dnd-kit sensors for albums
  const albumSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isTouchDevice ? {
        delay: 300, // Mobile: require 300ms hold before drag starts
        tolerance: 8, // Mobile: allow 8px movement during the delay
      } : {
        distance: 5, // Desktop: require 5px movement to start drag (prevents accidental drags on click)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // State for album drag-and-drop
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareAlbumName, setShareAlbumName] = useState<string | null>(null);
  
  // Folder deletion modal state
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [deletingFolderName] = useState<string | null>(null);

  // Helper function to show confirmation modal (using imported utility)
  // const showConfirmation = (message: string): Promise<boolean> => {
  //   return createConfirmation(message, setShowConfirmModal, setConfirmConfig);
  // };

// Initialize all handlers using factory functions
  const dragDropHandlers = createDragDropHandlers({
    localAlbums,
    setLocalAlbums,
    localFolders,
    setLocalFolders,
    setHasUnsavedChanges,
    setAnimatingAlbum,
    setActiveAlbumId,
    setActiveFolderId,
    setDragOverFolderId,
    setDragOverUncategorized,
    setPlaceholderInfo,
    uncategorizedSectionRef,
  });

  const folderHandlers = createFolderHandlers({
    localAlbums,
    localFolders,
    setMessage,
    loadAlbums,
    saveAlbumOrder: albumManagement.saveAlbumOrder,
  });

  const uploadHandlers = createUploadHandlers({
    uploadingImages,
    setUploadingImages,
    uploadingImagesRef,
    selectAlbum,
    setMessage,
    loadAlbums,
  });

  const albumHandlers = createAlbumHandlers({
    localAlbums,
    setLocalAlbums,
    localFolders,
    selectedAlbum,
    deselectAlbum,
    selectAlbum,
    setMessage,
    loadAlbums,
    saveAlbumOrder: albumManagement.saveAlbumOrder,
    setShowRenameModal,
    setRenamingAlbum,
    setNewAlbumName,
    renamingAlbum,
    newAlbumName,
    showConfirmation,
  });

  const uiHandlers = createUIInteractionHandlers({
    localAlbums,
    setLocalAlbums,
    albums,
    setHasUnsavedChanges,
    setShowNewAlbumModal,
    setNewAlbumFiles,
    setNewAlbumModalName,
    setIsGhostAlbumDragOver,
    setTargetFolderId,
    ghostTileFileInputRef,
    setMessage,
    saveAlbumOrder: albumManagement.saveAlbumOrder,
    uploadingImages,
  });

  const photoHandlers = createPhotoHandlers({
    selectedAlbum,
    loadPhotos: photoManagement.loadPhotos,
    shufflePhotos: photoManagement.shufflePhotos,
    setMessage,
    showConfirmation,
  });

  // Handlers are accessed via namespace pattern (e.g., dragDropHandlers.handlePhotoDragStart)
  // This makes it clearer where each handler comes from

  // Additional handlers that need to stay inline due to local state dependencies
  // const handleModalCancel = () => cancelModal(setShowConfirmModal, setConfirmConfig); // unused

  const handleCloseNewAlbumModal = () => {
    setShowNewAlbumModal(false);
    setNewAlbumModalName('');
    setNewAlbumFiles([]);
    setNewAlbumModalError('');
    setTargetFolderId(null);
  };

  const handleCreateAlbumFromModal = async () => {
    // Validate album name
    if (!isValidAlbumName(newAlbumModalName)) {
      setNewAlbumModalError('Album name must be at least 2 characters and contain only letters, numbers, spaces, hyphens, and underscores');
      return;
    }
    
    // Check for duplicate names
    if (localAlbums.some(a => a.name.toLowerCase() === newAlbumModalName.trim().toLowerCase())) {
      setNewAlbumModalError('An album with this name already exists');
      return;
    }
    
    try {
      // Step 1: Create empty album first
      const createBody: any = { name: newAlbumModalName };
      if (targetFolderId !== null) {
        createBody.folder_id = targetFolderId;
      }
      
      const res = await fetch(`${API_URL}/api/albums`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createBody),
      });
      
      if (!res.ok) {
        const error = await res.json();
        setNewAlbumModalError(error.error || 'Failed to create album');
        return;
      }
      
      // Step 2: Set published state if needed
      if (newAlbumPublished) {
        await fetch(`${API_URL}/api/albums/${encodeURIComponent(newAlbumModalName)}/publish`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ published: true }),
        });
      }
      
      // Step 3: Upload photos one by one using SSE workflow
      setMessage({ type: 'success', text: `Album "${newAlbumModalName}" created` });
      trackAlbumCreated(newAlbumModalName);
      await loadAlbums();
      handleCloseNewAlbumModal();
      selectAlbum(newAlbumModalName);
      
      // Upload files using the SSE workflow
      if (newAlbumFiles.length > 0) {
        await uploadHandlers.handleUploadToAlbum(newAlbumModalName, newAlbumFiles);
      }
    } catch (err) {
      setNewAlbumModalError('Network error occurred');
    }
  };

  // Ref for shuffle button (for long-press shuffle)
  const shuffleButtonRef = useRef<HTMLButtonElement>(null);


  return (
    <>
      <section className="admin-section">
        <div>
          <h2>Albums</h2>
          <p className="section-description">Manage your photo albums and upload new images. Drag and drop.</p>
        </div>
        
        {/* Unified Drag-and-Drop Context for Folders and Albums */}
        <DndContext
          sensors={albumSensors}
          collisionDetection={customCollisionDetection}
          onDragStart={dragDropHandlers.handleAlbumDragStart}
          onDragOver={dragDropHandlers.handleAlbumDragOver}
          onDragEnd={dragDropHandlers.handleAlbumDragEnd}
        >
          {/* Single SortableContext for ALL albums (enables dragging between folders and uncategorized) */}
          <SortableContext
            items={localAlbums.map((album) => album.name)}
            strategy={rectSortingStrategy}
          >
          
          
          <AlbumToolbar
            hasUnsavedChanges={hasUnsavedChanges}
            localFoldersCount={localFolders.length}
            onCreateFolder={() => setShowFolderModal(true)}
            onSaveChanges={uiHandlers.handleSaveChanges}
            onCancelChanges={uiHandlers.handleCancelChanges}
            canEdit={canEdit}
          />
          
          <FoldersSection
            localFolders={localFolders}
            localAlbums={localAlbums}
            selectedAlbum={selectedAlbum}
            animatingAlbum={animatingAlbum}
            dragOverAlbum={dragOverAlbum}
            dragOverFolderId={dragOverFolderId}
            placeholderInfo={placeholderInfo}
            onDeleteFolder={folderHandlers.handleDeleteFolder}
            onToggleFolderPublished={folderHandlers.handleToggleFolderPublished}
            onAlbumClick={(albumName) => selectedAlbum === albumName ? deselectAlbum() : selectAlbum(albumName)}
            onAlbumDragOver={dragDropHandlers.handleAlbumTileDragOver}
            onAlbumDragLeave={(e) => dragDropHandlers.handleAlbumTileDragLeave(e)}
            onAlbumDrop={dragDropHandlers.handleAlbumTileDrop}
            onCreateAlbumInFolder={uiHandlers.handleCreateAlbumInFolder}
            canEdit={canEdit}
          />
          
          <UncategorizedSection
            localAlbums={localAlbums}
            selectedAlbum={selectedAlbum}
            animatingAlbum={animatingAlbum}
            dragOverAlbum={dragOverAlbum}
            dragOverUncategorized={dragOverUncategorized}
            placeholderInfo={placeholderInfo}
            uploadingImages={uploadingImages}
            isGhostAlbumDragOver={isGhostAlbumDragOver}
            uncategorizedSectionRef={uncategorizedSectionRef}
            ghostTileFileInputRef={ghostTileFileInputRef}
            onAlbumClick={(albumName) => selectedAlbum === albumName ? deselectAlbum() : selectAlbum(albumName)}
            onAlbumDragOver={dragDropHandlers.handleAlbumTileDragOver}
            onAlbumDragLeave={dragDropHandlers.handleAlbumTileDragLeave}
            onAlbumDrop={dragDropHandlers.handleAlbumTileDrop}
            onGhostTileClick={uiHandlers.handleGhostTileClick}
            onGhostTileDragOver={uiHandlers.handleGhostTileDragOver}
            onGhostTileDragLeave={uiHandlers.handleGhostTileDragLeave}
            onGhostTileDrop={uiHandlers.handleGhostTileDrop}
            onGhostTileFileSelect={uiHandlers.handleGhostTileFileSelect}
            canEdit={canEdit}
          />
          
          
          {/* Unified Drag Overlay for both albums and folders */}
          <DragOverlay>
            {activeAlbumId ? (
              <div className="album-card dragging" style={{ cursor: 'grabbing' }}>
                <div className="album-card-header">
                  <h4>
                    <span className="album-name">{activeAlbumId}</span>
                  </h4>
                  {localAlbums.find(a => a.name === activeAlbumId)?.photoCount !== undefined && (
                    <div className="album-badge">
                      {localAlbums.find(a => a.name === activeAlbumId)?.photoCount} {localAlbums.find(a => a.name === activeAlbumId)?.photoCount === 1 ? 'photo' : 'photos'}
                    </div>
                  )}
                </div>
              </div>
            ) : activeFolderId ? (
              (() => {
                const folder = localFolders.find(f => f.id === activeFolderId);
                const folderAlbums = localAlbums.filter(a => a.folder_id === activeFolderId);
                if (!folder) return null;
                return (
                  <div className="folder-card dragging" style={{ cursor: 'grabbing', opacity: 0.95 }}>
                    <div className="folder-card-header">
                      <div className="folder-drag-handle">
                        <h4 className="folder-card-title">{folder.published ? '📁' : '🔒'} {folder.name}</h4>
                        <div className="folder-count">{folderAlbums.length} {folderAlbums.length === 1 ? 'album' : 'albums'}</div>
                      </div>
                    </div>
                    <div className="folder-albums-grid">
                      {folderAlbums.map((album) => (
                        <div key={album.name} className="album-card">
                          <h4>{album.name}</h4>
                          <span className="photo-count">{album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            ) : null}
          </DragOverlay>
          </SortableContext>
        </DndContext>

          {selectedAlbum && (
            <PhotosPanel
              selectedAlbum={selectedAlbum}
              albumPhotos={albumPhotos}
              uploadingImages={uploadingImages}
              loadingPhotos={loadingPhotos}
              hasEverDragged={hasEverDragged}
              savingOrder={savingOrder}
              isDragging={isDragging}
              isShuffling={isShuffling}
              localAlbums={localAlbums}
              onClose={deselectAlbum}
              onUploadPhotos={uploadHandlers.handleUploadPhotos}
              onDeleteAlbum={albumHandlers.handleDeleteAlbum}
              onShareAlbum={(albumName) => {
                setShareAlbumName(albumName);
                setShowShareModal(true);
              }}
              onTogglePublished={albumHandlers.handleTogglePublished}
              onPreviewAlbum={(albumName) => {
                window.open(`/album/${encodeURIComponent(albumName)}`, '_blank');
              }}
              onSavePhotoOrder={() => photoManagement.savePhotoOrder()}
              onCancelPhotoOrder={photoManagement.cancelPhotoReorder}
              onShufflePhotos={photoHandlers.handleShuffleClick}
              onShuffleStart={photoHandlers.handleShuffleStart}
              onShuffleEnd={photoHandlers.handleShuffleEnd}
              onPhotoDragStart={(event, setActiveId) => photoManagement.handlePhotoDragStart(event, setActiveId)}
              onPhotoDragEnd={(event, setActiveId) => photoManagement.handlePhotoDragEnd(event, setActiveId)}
              onOpenEditModal={openEditModal}
              onDeletePhoto={(filename) => photoHandlers.handleDeletePhoto(selectedAlbum!, filename)}
              onDragOver={uploadHandlers.handleDragOver}
              onDragLeave={uploadHandlers.handleDragLeave}
              onDrop={uploadHandlers.handleDrop}
              shuffleButtonRef={shuffleButtonRef}
              canEdit={canEdit}
            />
          )}
      </section>

      <ModalsCollection
        showEditModal={showEditModal}
        editingPhoto={editingPhoto}
        editTitleValue={editTitleValue}
        setEditTitleValue={setEditTitleValue}
        handleCloseEditModal={closeEditModal}
        handleSaveTitle={handleEditSave}
        showRenameModal={showRenameModal}
        renamingAlbum={renamingAlbum}
        newAlbumName={newAlbumName}
        setNewAlbumName={setNewAlbumName}
        setShowRenameModal={setShowRenameModal}
        handleRenameAlbum={albumHandlers.handleRenameAlbum}
        showFolderModal={showFolderModal}
        setShowFolderModal={setShowFolderModal}
        folderModalError={folderModalError}
        setFolderModalError={setFolderModalError}
        folderManagement={{
          newFolderName: folderManagement.newFolderName,
          setNewFolderName: folderManagement.setNewFolderName,
          isCreatingFolder: folderManagement.isCreatingFolder,
          handleCreateFolder: async () => {
            const success = await folderManagement.createFolder(folderManagement.newFolderName);
            if (success) {
              setShowFolderModal(false);
              setFolderModalError('');
            } else {
              setFolderModalError('Failed to create folder');
            }
          },
        }}
        showDeleteFolderModal={showDeleteFolderModal}
        deletingFolderName={deletingFolderName}
        setShowDeleteFolderModal={setShowDeleteFolderModal}
        handleDeleteFolder={folderHandlers.handleDeleteFolder}
        localFolders={localFolders}
        localAlbums={localAlbums}
        showNewAlbumModal={showNewAlbumModal}
        setShowNewAlbumModal={handleCloseNewAlbumModal}
        newAlbumNameInput={newAlbumModalName}
        setNewAlbumNameInput={setNewAlbumModalName}
        newAlbumPublished={newAlbumPublished}
        setNewAlbumPublished={setNewAlbumPublished}
        newAlbumModalError={newAlbumModalError}
        handleCreateAlbumSubmit={handleCreateAlbumFromModal}
        showShareModal={showShareModal}
        shareAlbumName={shareAlbumName}
        setShowShareModal={setShowShareModal}
        showConfirmModal={showConfirmModal}
        confirmConfig={confirmConfig}
        setShowConfirmModal={setShowConfirmModal}
      />
    </>
  );
};

export default AlbumsManager;
