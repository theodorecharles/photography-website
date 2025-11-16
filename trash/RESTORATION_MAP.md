# Trash Folder - File Restoration Map

This folder contains unused files that have been moved from the codebase. Use this document to restore files if needed.

## Files Moved

### 1. `frontend/src/components/AdminPortal/AlbumsManager/utils/modalHelpers.ts`
**Original Location:** `frontend/src/components/AdminPortal/AlbumsManager/utils/modalHelpers.ts`  
**Trash Location:** `trash/frontend/src/components/AdminPortal/AlbumsManager/utils/modalHelpers.ts`  
**Reason:** Unused utility file. Contains `showConfirmation` and `handleModalCancel` functions that are never imported. The `AlbumsManager/index.tsx` component defines its own `showConfirmation` function inline instead.  
**Restore Command:**
```bash
mv trash/frontend/src/components/AdminPortal/AlbumsManager/utils/modalHelpers.ts frontend/src/components/AdminPortal/AlbumsManager/utils/modalHelpers.ts
```

### 2. `frontend/src/components/icons/CpuIcon.tsx`
**Original Location:** `frontend/src/components/icons/CpuIcon.tsx`  
**Trash Location:** `trash/frontend/src/components/icons/CpuIcon.tsx`  
**Reason:** Unused icon component. Exported in `icons/index.ts` but never imported or used anywhere in the codebase.  
**Restore Command:**
```bash
mv trash/frontend/src/components/icons/CpuIcon.tsx frontend/src/components/icons/CpuIcon.tsx
```
**Additional Step:** If restored, also add back to `frontend/src/components/icons/index.ts`:
```typescript
export { default as CpuIcon } from './CpuIcon';
```

## Export Cleanups (Not Moved, Just Modified)

The following barrel files had unused exports removed. These changes are in the main codebase, not in trash:

### 3. `frontend/src/components/AdminPortal/index.ts`
**Removed Exports:**
- `export { default as Metrics } from './Metrics/Metrics';`
- `export { default as VisitorMap } from './Metrics/VisitorMap';`

**Reason:** These exports were never imported from this barrel file. Components import directly from their source files instead.  
**Restore:** Add back lines 8-9 to the file if needed.

### 4. `frontend/src/components/PhotoModal/index.ts`
**Removed Export:**
- `export type { Photo, ExifData } from './types';`

**Reason:** These types are never imported from this barrel file. The `Photo` type is imported from `types/photo.ts` instead.  
**Restore:** Add back line 6 to the file if needed.

### 5. `frontend/src/components/icons/index.ts`
**Removed Export:**
- `export { default as CpuIcon } from './CpuIcon';` (line 14)

**Reason:** CpuIcon component was moved to trash, so export was removed.  
**Restore:** Add back line 14 to the file if CpuIcon is restored.

## Date Moved
2025-01-XX (check git history for exact date)

## Notes
- All files were verified as unused before moving
- No imports or references to these files exist in the codebase
- If restoring, make sure to test the application thoroughly

