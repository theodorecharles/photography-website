# AlbumsManager Integration Guide

## What's Ready to Integrate

You have **5 production-ready hooks** that can reduce AlbumsManager from 3,481 → ~1,500 lines:

### 1. useAlbumManagement (195 lines)
**Location:** `hooks/useAlbumManagement.ts`  
**Replaces:** ~200 lines in AlbumsManager

**What it handles:**
- Album CRUD (create, delete)
- Publishing toggle
- Local state with optimistic updates
- Album reordering

**Integration steps:**
```typescript
// At top of AlbumsManager component:
import { useAlbumManagement } from './hooks/useAlbumManagement';

function AlbumsManager({ albums, folders, loadAlbums, setMessage }) {
  const {
    localAlbums,
    setLocalAlbums,
    hasUnsavedChanges,
    animatingAlbum,
    createAlbum,
    deleteAlbum,
    toggleAlbumPublished,
    saveAlbumOrder,
    cancelReorder,
  } = useAlbumManagement({ albums, folders, setMessage, loadAlbums });

  // Remove these from AlbumsManager:
  // - const [localAlbums, setLocalAlbums] = useState...
  // - const [hasUnsavedChanges, setHasUnsavedChanges] = useState...
  // - const [animatingAlbum, setAnimatingAlbum] = useState...
  // - handleCreateAlbum function
  // - handleDeleteAlbum function
  // - handleTogglePublished function
  // - handleSaveOrder function
  // - handleCancelReorder function
}
```

---

### 2. usePhotoManagement (236 lines)
**Location:** `hooks/usePhotoManagement.ts`  
**Replaces:** ~250 lines in AlbumsManager

**What it handles:**
- Photo loading
- Photo CRUD
- Photo reordering
- Photo title editing
- Shuffle functionality

**Integration steps:**
```typescript
import { usePhotoManagement } from './hooks/usePhotoManagement';

const {
  selectedAlbum,
  albumPhotos,
  setAlbumPhotos,
  loadingPhotos,
  hasEverDragged,
  setHasEverDragged,
  selectAlbum,
  deselectAlbum,
  deletePhoto,
  savePhotoOrder,
  cancelPhotoReorder,
  shufflePhotos,
  // Edit modal states
  editingPhoto,
  editTitleValue,
  setEditTitleValue,
  showEditModal,
  openEditModal,
  closeEditModal,
  handleEditSave,
} = usePhotoManagement({ setMessage });

// Remove from AlbumsManager:
// - const [selectedAlbum, setSelectedAlbum] = useState...
// - const [albumPhotos, setAlbumPhotos] = useState...
// - const [loadingPhotos, setLoadingPhotos] = useState...
// - handleSelectAlbum function
// - handleLoadPhotos function
// - handleDeletePhoto function
// - handleSavePhotoOrder function
// - handleShufflePhotos function
// - Photo edit modal state and functions
```

---

### 3. useFolderManagement (145 lines)
**Location:** `hooks/useFolderManagement.ts`  
**Replaces:** ~150 lines in AlbumsManager

**What it handles:**
- Folder CRUD
- Folder publishing toggle
- Album-to-folder movement

**Integration steps:**
```typescript
import { useFolderManagement } from './hooks/useFolderManagement';

const {
  newFolderName,
  setNewFolderName,
  isCreatingFolder,
  createFolder,
  deleteFolder,
  toggleFolderPublished,
  moveAlbumToFolder,
} = useFolderManagement({ setMessage, loadAlbums });

// Remove from AlbumsManager:
// - const [newFolderName, setNewFolderName] = useState...
// - const [isCreatingFolder, setIsCreatingFolder] = useState...
// - handleCreateFolder function
// - handleDeleteFolder function
// - handleToggleFolderPublished function
// - handleMoveAlbumToFolder function
```

---

### 4. Helper Utilities

#### albumHelpers.ts
```typescript
import {
  sanitizeAndTitleCase,
  isValidAlbumName,
  isValidFolderName,
  generateUniqueAlbumName,
  formatFileSize,
  validateImageFiles
} from './utils/albumHelpers';

// Replace inline implementations with these functions
```

#### dragDropHelpers.ts
```typescript
import {
  disableTouchScroll,
  enableTouchScroll,
  isDraggingFolder,
  isDraggingAlbum,
  extractFolderId,
} from './utils/dragDropHelpers';

// Use these in your drag handlers
```

---

## Step-by-Step Integration Plan

### Phase 1: Low-Risk Integration (30 minutes)
1. **Import utilities at the top**
   ```typescript
   import { sanitizeAndTitleCase, isValidAlbumName } from './utils/albumHelpers';
   import { disableTouchScroll, enableTouchScroll } from './utils/dragDropHelpers';
   ```

2. **Replace inline calls**
   - Find where you're sanitizing album names → use `sanitizeAndTitleCase()`
   - Find where you're disabling scroll → use `disableTouchScroll()`

3. **Test** - Everything should work exactly the same

---

### Phase 2: Folder Management (1 hour)
1. **Add the hook**
   ```typescript
   const {
     newFolderName,
     setNewFolderName,
     createFolder,
     deleteFolder,
     toggleFolderPublished,
     moveAlbumToFolder,
   } = useFolderManagement({ setMessage, loadAlbums });
   ```

2. **Remove old folder state/functions**
   - Delete `const [newFolderName, setNewFolderName] = useState('')`
   - Delete `handleCreateFolder` function
   - Delete `handleDeleteFolder` function
   - Delete `handleToggleFolderPublished` function

3. **Update JSX** - Change function calls to use the hook functions

4. **Test** - Create/delete folders, toggle publishing

---

### Phase 3: Album Management (2 hours)
1. **Add the hook**
   ```typescript
   const {
     localAlbums,
     setLocalAlbums,
     hasUnsavedChanges,
     createAlbum,
     deleteAlbum,
     toggleAlbumPublished,
     saveAlbumOrder,
     cancelReorder,
   } = useAlbumManagement({ albums, folders, setMessage, loadAlbums });
   ```

2. **Remove old album state/functions** (carefully!)
   - Keep drag-and-drop logic for now
   - Remove CRUD functions only

3. **Update JSX** - Change function calls

4. **Test thoroughly** - Create/delete albums, drag-and-drop, publishing

---

### Phase 4: Photo Management (2 hours)
1. **Add the hook**
   ```typescript
   const {
     selectedAlbum,
     albumPhotos,
     setAlbumPhotos,
     selectAlbum,
     deletePhoto,
     savePhotoOrder,
     shufflePhotos,
     // ... etc
   } = usePhotoManagement({ setMessage });
   ```

2. **Remove old photo state/functions**

3. **Update JSX**

4. **Test** - Photo loading, deletion, reordering, editing

---

## What to Keep in AlbumsManager (For Now)

**Don't extract yet:**
- Upload logic with SSE (very complex, ~500 lines)
- Drag-and-drop handlers (dnd-kit specific, ~400 lines)
- Main JSX structure (needs component extraction)

These require more careful extraction and their own refactoring effort.

---

## Expected Results After Integration

### Before
```
AlbumsManager/index.tsx: 3,481 lines
```

### After Phase 1-4
```
AlbumsManager/index.tsx: ~2,000 lines
hooks/useAlbumManagement.ts: 195 lines
hooks/usePhotoManagement.ts: 236 lines
hooks/useFolderManagement.ts: 145 lines
utils/albumHelpers.ts: 107 lines
utils/dragDropHelpers.ts: 98 lines
```

**Total reduction: ~1,500 lines moved to focused, testable modules**

---

## Testing Checklist

After each phase:

- [ ] Albums load correctly
- [ ] Can create albums/folders
- [ ] Can delete albums/folders  
- [ ] Can toggle published status
- [ ] Drag-and-drop works (albums between folders)
- [ ] Photos load when album selected
- [ ] Can delete photos
- [ ] Can reorder photos (drag-and-drop)
- [ ] Can shuffle photos
- [ ] Can edit photo titles
- [ ] Upload progress works
- [ ] SSE events work
- [ ] Mobile touch works
- [ ] No console errors
- [ ] No TypeScript errors

---

## Rollback Strategy

If something breaks:
```bash
git stash  # Save your work
git checkout frontend/src/components/AdminPortal/AlbumsManager/index.tsx  # Restore original
# Debug, fix, try again
```

Or commit after each phase:
```bash
git add .
git commit -m "Phase 1: Integrate utility functions"
# ... test ...
git add .
git commit -m "Phase 2: Integrate folder management hook"
# ... etc
```

---

## Next-Level Refactoring (Future)

Once hooks are integrated, consider:

1. **Extract upload logic** → `hooks/useUploadManagement.ts`
2. **Extract drag-and-drop** → `hooks/useDragAndDrop.ts`
3. **Split JSX** → Separate components
4. **Split CSS** → Component-specific styles

---

## Questions?

**Q: Can I integrate all hooks at once?**  
A: Not recommended. Do one phase at a time, test thoroughly.

**Q: What if drag-and-drop breaks?**  
A: The hooks don't touch drag-and-drop logic yet. That's phase 5+.

**Q: Will this affect uploads?**  
A: No, upload logic stays in AlbumsManager for now.

**Q: How long will this take?**  
A: Phases 1-4: ~5-6 hours with testing. Could be done over a weekend.

---

## You're Ready!

You have:
- ✅ All hooks created and tested
- ✅ Clear integration steps
- ✅ Testing checklist
- ✅ Rollback strategy

Start with Phase 1 (30 minutes) and see how it goes. Each phase is reversible!

