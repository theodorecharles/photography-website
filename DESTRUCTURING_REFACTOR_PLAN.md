# Destructuring Refactor Plan

## Summary
Found 25 destructuring blocks across 15 files.

## Action Plan

### Priority 1: **AlbumsManager/index.tsx** (Blocks 5-9) ✅ **MUST FIX**
The 5 handler destructuring blocks (lines 296-334) - **50 lines of destructuring!**

**BEFORE:**
```typescript
const {
  handlePhotoDragStart,
  handlePhotoDragEnd,
  // ... 8 properties
} = dragDropHandlers;

const {
  handleDeleteFolder,
  // ... 3 properties
} = folderHandlers;

// ... 3 more similar blocks
```

**AFTER:**
```typescript
// Remove all destructuring, use namespace pattern:
dragDropHandlers.handlePhotoDragStart
folderHandlers.handleDeleteFolder
uploadHandlers.handleUploadPhotos
albumHandlers.handleDeleteAlbum
uiHandlers.handleGhostTileClick
photoHandlers.handleDeletePhoto
```

**Impact:** Removes 50 lines, makes code clearer about where handlers come from

---

### Priority 2: **SSEToaster.tsx** (Block 1) - OPTIONAL
28 properties destructured from `useSSEToaster()` (lines 13-40)

**Decision:** Keep for now - this is a custom hook pattern and the properties are used extensively throughout the component. Refactoring would require changing 100+ references.

---

### Priority 3: **Hook Destructuring in AlbumsManager** (Blocks 1-3) - KEEP
These are reasonable:
- `albumManagement` (8 properties) - frequently used together
- `photoManagement` (17 properties) - frequently used together  
- `folderManagement` (3 properties) - small, reasonable

**Decision:** Keep as is - these are logical groupings from custom hooks

---

### Priority 4: **Handler Internal Destructuring** - KEEP
6 handler files destructure their `props` parameter internally.

**Decision:** Keep as is - internal implementation detail of factory functions

---

### Priority 5: **dnd-kit useSortable()** - KEEP
3 files (SortableAlbumCard, SortableFolderCard, SortablePhotoItem)

**Decision:** Keep as is - this is the library's API pattern

---

### Priority 6: **Other Minor Blocks** - KEEP
- Metrics date destructuring - one-liners, fine
- PhotoHelpers data destructuring - one-liner, fine

---

## Execution Order

1. ✅ Fix AlbumsManager/index.tsx handler destructuring (blocks 5-9)
2. ✅ Update all references in JSX to use namespace pattern
3. ✅ Test build
4. ✅ Commit

**Estimated Impact:** Remove ~50 lines of destructuring, improve code clarity

