# Additional Cleanup Opportunities

This document lists potential cleanup items found in the codebase. These are **suggestions only** - review each before implementing.

## 1. Commented Out Code Blocks

### `frontend/src/components/AdminPortal/AlbumsManager/index.tsx`

**Lines 327-329:** Commented out `showConfirmation` function
```typescript
// const showConfirmation = (message: string): Promise<boolean> => {
//   return createConfirmation(message, setShowConfirmModal, setConfirmConfig);
// };
```
**Reason:** This was replaced by an inline implementation (line 71). Safe to remove.

**Line 271:** Commented out `isDraggingRef`
```typescript
// const isDraggingRef = useRef(false); // unused for now
```
**Reason:** Marked as unused. Safe to remove if not needed.

**Lines 287-299:** Large block of commented out `photoSensors` configuration
```typescript
// const photoSensors = useSensors(
//   useSensor(PointerSensor, {
//     activationConstraint: isTouchDevice ? {
//       delay: 300,
//       tolerance: 8,
//     } : {
//       distance: 5,
//     },
//   }),
//   useSensor(KeyboardSensor, {
//     coordinateGetter: sortableKeyboardCoordinates,
//   })
// );
```
**Reason:** Marked as "unused for now". Consider removing if not planned for future use, or move to a comment block explaining why it's kept.

**Line 421:** Commented out `handleModalCancel`
```typescript
// const handleModalCancel = () => cancelModal(setShowConfirmModal, setConfirmConfig); // unused
```
**Reason:** Explicitly marked as unused. Safe to remove.

### `frontend/src/utils/analytics.ts`

**Line 10:** Commented out import
```typescript
// import { showToast } from './toast'; // Disabled - working correctly
```
**Reason:** Comment says "working correctly" - safe to remove if toast functionality is not needed.

## 2. Deprecated Backend Endpoint

### `backend/src/routes/metrics.ts`

**Lines 21-25:** Deprecated `/api/metrics/query` endpoint
```typescript
router.post('/query', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  res.status(403).json({ 
    error: 'This endpoint is deprecated for security reasons. Use GET /api/metrics/stats instead.' 
  });
});
```
**Status:** No frontend code calls this endpoint (verified via grep).
**Recommendation:** Can be safely removed entirely, or kept for a grace period to catch any external API consumers.

## 3. Console.log Statements

Many `console.log` statements exist throughout the codebase. These are useful for debugging but could be:
- Removed in production builds
- Converted to a proper logging utility
- Conditionally enabled via environment variable

**Files with console.log:**
- `frontend/src/components/AdminPortal/AlbumsManager/index.tsx` (5 instances)
- `frontend/src/components/AdminPortal/AlbumsManager/handlers/folderHandlers.ts` (1 instance)
- `frontend/src/components/AdminPortal/AdminPortal.tsx` (many instances - debug logs)
- `frontend/src/components/SharedAlbum.tsx` (likely has some)

**Recommendation:** Consider implementing a logging utility that:
- Logs in development
- Silences or sends to monitoring service in production
- Allows filtering by log level (debug, info, warn, error)

## 4. Data Backup Folders

Multiple `data-backup-*` folders exist in the project root:
- `data-backup-20251114-163154/`
- `data-backup-20251114-163403/`
- `data-backup-20251114-164455/`
- `data-backup-20251114-185215/`
- `data-backup-20251114-203151/`
- `data-backup-20251114-203534/`
- `data-backup-20251114-203855/`
- `data-backup-20251114-210606/`

**Status:** Already in `.gitignore` (line 26: `data-backup-*/`)
**Recommendation:** These are likely old backups. Safe to delete if no longer needed, or archive them outside the project directory.

## 5. Unused State Variable

### `frontend/src/components/AdminPortal/AlbumsManager/index.tsx`

**Line 324:** `deletingFolderName` state variable
```typescript
const [deletingFolderName] = useState<string | null>(null);
```
**Status:** Only declared, never used (no setter called).
**Recommendation:** Verify if this was intended for future use or can be removed.

## Priority Recommendations

### High Priority (Safe to Remove)
1. ✅ Commented out code blocks in AlbumsManager/index.tsx (lines 271, 327-329, 421)
2. ✅ Commented out import in analytics.ts (line 10)
3. ✅ Unused `deletingFolderName` state variable (if not needed)

### Medium Priority (Review First)
1. ⚠️ Deprecated `/api/metrics/query` endpoint (remove if no external consumers)
2. ⚠️ Large commented `photoSensors` block (remove if not planned, or document why kept)

### Low Priority (Nice to Have)
1. 📝 Implement proper logging utility to replace console.log statements
2. 🗑️ Clean up old data-backup folders (if no longer needed)

## Notes

- All items were verified as unused/unreferenced before listing
- Commented code blocks are safe to remove but review context first
- Console.log statements may be intentional for debugging - review before removing
- Data backup folders are already gitignored, so they won't affect version control


