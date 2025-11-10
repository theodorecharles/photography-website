# Custom Image Ordering Feature

## Overview
This feature enables custom drag-and-drop reordering of images within albums on the album management page, with mobile support via arrow buttons.

## What Was Implemented

### 1. Database Changes
- Added `sort_order` column to `image_metadata` table
- Created migration script: `migrate-add-sort-order.js`
- Added index for optimized ordering queries

### 2. Backend Changes

#### `backend/src/database.ts`
- Updated `getAlbumMetadata()` to order by `sort_order` (with fallback to filename)
- Added `updateImageSortOrder()` function for batch updates with transactions

#### `backend/src/routes/albums.ts`
- Modified `getPhotosInAlbum()` to:
  - Fetch metadata from database (including sort_order)
  - Merge metadata with filesystem photos
  - Sort photos by custom order when available

#### `backend/src/routes/album-management.ts`
- Added `POST /api/albums/:album/photo-order` endpoint
- Validates and sanitizes photo order data
- Updates database and invalidates cache

### 3. Frontend Changes

#### `frontend/src/components/AdminPortal/AlbumsManager.tsx`
- Added state management for photo ordering:
  - `originalPhotoOrder`: tracks initial order for comparison
  - `draggingPhotoIndex`: tracks currently dragging photo
  - `savingOrder`: loading state for save operation

- **Desktop Features**:
  - Drag-and-drop reordering using HTML5 drag API
  - Visual feedback during drag (opacity, scale)
  - Real-time reordering preview

- **Mobile Features**:
  - Up/down arrow buttons for each photo
  - Buttons automatically disable at edges
  - Touch-friendly button sizing

- **UI Enhancements**:
  - "Unsaved changes" indicator (matches config page style)
  - Cancel button to revert changes (red/danger style)
  - Animated save button with pulsing glow
  - Automatic detection of order changes

#### `frontend/src/components/AdminPortal/AlbumsManager.css`
- Drag-and-drop cursor states (grab/grabbing)
- Dragging visual effects (opacity, scale)
- Mobile reorder button styles
- Responsive hide/show for desktop vs mobile controls
- Unsaved changes indicator animations
- Save button pulse animation

### 4. User Experience

**Desktop**:
1. Select an album
2. Drag photos to reorder them
3. See "Unsaved changes" indicator appear with Cancel and Save Order buttons
4. Click "Cancel" to revert changes OR "Save Order" to persist changes
5. Photos load in custom order on album pages

**Mobile**:
1. Select an album
2. Use ↑↓ arrow buttons to reorder photos
3. See "Unsaved changes" indicator appear with Cancel and Save Order buttons
4. Tap "Cancel" to revert changes OR "Save Order" to persist changes
5. Photos load in custom order on album pages

### 5. Data Flow

1. **Loading**: Backend queries database for sort_order, merges with filesystem
2. **Reordering**: Frontend updates local state, shows unsaved indicator
3. **Saving**: Frontend sends array of {filename, sort_order} to backend
4. **Persistence**: Backend batch updates database with transaction
5. **Display**: Album pages query photos with custom order

## Technical Details

### Database Schema
```sql
ALTER TABLE image_metadata ADD COLUMN sort_order INTEGER;
CREATE INDEX idx_album_sort_order ON image_metadata(album, sort_order);
```

### Ordering Logic
- Photos with `sort_order` appear first (ascending)
- Photos without `sort_order` appear after (alphabetically)
- New photos default to NULL sort_order

### API Endpoint
```
POST /api/albums/:album/photo-order
Body: { photoOrder: [{ filename: string }, ...] }
Response: { success: boolean }
```

## Files Modified
- `backend/src/database.ts`
- `backend/src/routes/albums.ts`
- `backend/src/routes/album-management.ts`
- `frontend/src/components/AdminPortal/AlbumsManager.tsx`
- `frontend/src/components/AdminPortal/AlbumsManager.css`

## Files Created
- `migrate-add-sort-order.js` (database migration)
- `FEATURE-CUSTOM-IMAGE-ORDERING.md` (this document)

## Notes
- Migration is idempotent (safe to run multiple times)
- Cache is automatically invalidated when order is saved
- Drag-and-drop is disabled on mobile (640px and below)
- Arrow buttons are hidden on desktop

