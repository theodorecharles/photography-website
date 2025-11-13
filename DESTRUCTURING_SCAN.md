# Destructuring Assignment Scan Report

Generated: 2025-11-13T21:45:56.251Z

**Files with Destructuring**: 15
**Total Destructuring Blocks**: 25

---

## File: `frontend/src/components/AdminPortal/AlbumsManager/components/SortableAlbumCard.tsx`

**Blocks found:** 1

### Block 1 (lines 37-44)

**Source:** `useSortable({ id: album.name })`

```typescript
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: album.name });
```

---

## File: `frontend/src/components/AdminPortal/AlbumsManager/components/SortableFolderCard.tsx`

**Blocks found:** 1

### Block 1 (lines 53-60)

**Source:** `useSortable({`

```typescript
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
```

---

## File: `frontend/src/components/AdminPortal/AlbumsManager/components/SortablePhotoItem.tsx`

**Blocks found:** 1

### Block 1 (lines 25-32)

**Source:** `useSortable({ id: photo.id })`

```typescript
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });
```

---

## File: `frontend/src/components/AdminPortal/AlbumsManager/handlers/albumHandlers.ts`

**Blocks found:** 1

### Block 1 (lines 31-46)

**Source:** `props`

```typescript
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
  } = props;
```

---

## File: `frontend/src/components/AdminPortal/AlbumsManager/handlers/dragDropHandlers.ts`

**Blocks found:** 1

### Block 1 (lines 27-40)

**Source:** `props`

```typescript
  const {
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
  } = props;
```

---

## File: `frontend/src/components/AdminPortal/AlbumsManager/handlers/folderHandlers.ts`

**Blocks found:** 1

### Block 1 (lines 20-20)

**Source:** `props`

```typescript
  const { localAlbums, localFolders, setMessage, loadAlbums, saveAlbumOrder } = props;
```

---

## File: `frontend/src/components/AdminPortal/AlbumsManager/handlers/photoHandlers.ts`

**Blocks found:** 1

### Block 1 (lines 19-19)

**Source:** `props`

```typescript
  const { selectedAlbum, loadPhotos, shufflePhotos, setMessage } = props;
```

---

## File: `frontend/src/components/AdminPortal/AlbumsManager/handlers/uiInteractionHandlers.ts`

**Blocks found:** 1

### Block 1 (lines 26-40)

**Source:** `props`

```typescript
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
```

---

## File: `frontend/src/components/AdminPortal/AlbumsManager/handlers/uploadHandlers.ts`

**Blocks found:** 1

### Block 1 (lines 22-29)

**Source:** `props`

```typescript
  const {
    uploadingImages,
    setUploadingImages,
    uploadingImagesRef,
    selectAlbum,
    setMessage,
    loadAlbums,
  } = props;
```

---

## File: `frontend/src/components/AdminPortal/AlbumsManager/index.tsx`

**Blocks found:** 9

### Block 1 (lines 63-72)

**Source:** `albumManagement`

```typescript
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
```

### Block 2 (lines 74-91)

**Source:** `photoManagement`

```typescript
  const {
    selectedAlbum,
    albumPhotos,
    setAlbumPhotos,
    loadingPhotos,
    hasEverDragged,
    setHasEverDragged,
    savingOrder,
    selectAlbum,
    deselectAlbum,
    editingPhoto,
    editTitleValue,
    setEditTitleValue,
    showEditModal,
    openEditModal,
    closeEditModal,
    handleEditSave,
  } = photoManagement;
```

### Block 3 (lines 114-118)

**Source:** `folderManagement`

```typescript
  const {
    newFolderName,
    setNewFolderName,
    isCreatingFolder,
  } = folderManagement;
```

### Block 4 (lines 144-294)

**Source:** `useRef(false)`

```typescript
  const [placeholderInfo, setPlaceholderInfo] = useState<{
    folderId: number | null;
    insertAtIndex: number;
  } | null>(null);
  
  // Ref to track if we're currently dragging (for touch scroll prevention)
  const isDraggingRef = useRef(false);
  
  // Ref for ghost tile file input
  const ghostTileFileInputRef = useRef<HTMLInputElement>(null);

  // Ref for uncategorized section (for manual bounding box checks)
  const uncategorizedSectionRef = useRef<HTMLDivElement>(null);

  // Detect if device supports touch
  const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  
  // Configure dnd-kit sensors for photos
  // Desktop: minimal delay for instant drag, mobile: longer delay to differentiate tap vs drag
  const photoSensors = useSensors(
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
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmModalConfig | null>(null);
  
  // Folder deletion modal state
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [deletingFolderName, setDeletingFolderName] = useState<string | null>(null);

  // Helper function to show confirmation modal (using imported utility)
  const showConfirmation = (message: string): Promise<boolean> => {
    return createConfirmation(message, setShowConfirmModal, setConfirmConfig);
  };

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
  });

  const uiHandlers = createUIInteractionHandlers({
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
    saveAlbumOrder: albumManagement.saveAlbumOrder,
    uploadingImages,
  });

  const photoHandlers = createPhotoHandlers({
    selectedAlbum,
    loadPhotos: photoManagement.loadPhotos,
    shufflePhotos: photoManagement.shufflePhotos,
    setMessage,
  });

  // Destructure all handlers
  const {
    handlePhotoDragStart,
    handlePhotoDragEnd,
    handleAlbumDragStart,
    handleAlbumDragOver,
    handleAlbumDragEnd,
    handleAlbumTileDragOver,
    handleAlbumTileDragLeave,
    handleAlbumTileDrop,
  } = dragDropHandlers;
```

### Block 5 (lines 296-300)

**Source:** `folderHandlers`

```typescript
  const {
    handleDeleteFolder,
    handleDeleteEmptyFolder,
    handleToggleFolderPublished,
  } = folderHandlers;
```

### Block 6 (lines 302-308)

**Source:** `uploadHandlers`

```typescript
  const {
    handleUploadToAlbum,
    handleUploadPhotos,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = uploadHandlers;
```

### Block 7 (lines 310-316)

**Source:** `albumHandlers`

```typescript
  const {
    handleDeleteAlbum,
    handleTogglePublished,
    handleOpenRenameModal,
    handleRenameAlbum,
    handleMoveAlbumToFolder,
  } = albumHandlers;
```

### Block 8 (lines 318-327)

**Source:** `uiHandlers`

```typescript
  const {
    handleGhostTileClick,
    handleGhostTileDragOver,
    handleGhostTileDragLeave,
    handleGhostTileDrop,
    handleGhostTileFileSelect,
    handleCreateAlbumInFolder,
    handleSaveChanges,
    handleCancelChanges,
  } = uiHandlers;
```

### Block 9 (lines 329-334)

**Source:** `photoHandlers`

```typescript
  const {
    handleDeletePhoto,
    handleShuffleClick,
    handleShuffleStart,
    handleShuffleEnd,
  } = photoHandlers;
```

---

## File: `frontend/src/components/AdminPortal/Metrics/Metrics.tsx`

**Blocks found:** 3

### Block 1 (lines 85-85)

**Source:** `useState<Record<string, Set<number>>>({})`

```typescript
  const [expandedRows, setExpandedRows] = useState<Record<string, Set<number>>>({});
```

### Block 2 (lines 86-86)

**Source:** `useState<Record<string, boolean>>({})`

```typescript
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
```

### Block 3 (lines 412-412)

**Source:** `point.date.toString().split(/[-T]/)`

```typescript
                      const [year, month, day] = point.date.toString().split(/[-T]/);
```

---

## File: `frontend/src/components/AdminPortal/Metrics/VisitorsChart.tsx`

**Blocks found:** 1

### Block 1 (lines 48-48)

**Source:** `point.date.toString().split(/[-T]/)`

```typescript
    const [year, month, day] = point.date.toString().split(/[-T]/);
```

---

## File: `frontend/src/components/SSEToaster.tsx`

**Blocks found:** 1

### Block 1 (lines 13-40)

**Source:** `useSSEToaster()`

```typescript
  const {
    generatingTitles,
    titlesOutput,
    titlesProgress,
    titlesWaiting,
    titlesOutputRef,
    isOptimizationRunning,
    optimizationLogs,
    optimizationProgress,
    optimizationOutputRef,
    isToasterCollapsed,
    setIsToasterCollapsed,
    isToasterMaximized,
    setIsToasterMaximized,
    toasterPosition,
    setToasterPosition,
    isDragging,
    setIsDragging,
    dragStart,
    setDragStart,
    dragOffset,
    setDragOffset,
    hasToasterAnimated,
    isScrollLocked,
    setIsScrollLocked,
    stopTitlesHandler,
    stopOptimizationHandler,
  } = useSSEToaster();
```

---

## File: `frontend/src/contexts/SSEToasterContext.tsx`

**Blocks found:** 1

### Block 1 (lines 78-78)

**Source:** `useState<{ x: number`

```typescript
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
```

---

## File: `frontend/src/utils/photoHelpers.ts`

**Blocks found:** 1

### Block 1 (lines 31-31)

**Source:** `data`

```typescript
  const [filename, title, albumFromData] = data;
```

---

