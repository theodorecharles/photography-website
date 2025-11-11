# Share Links Image Loading Fix

## Problem Identified

The initial implementation had a critical issue where shared album photos wouldn't load:

1. **SharedAlbum** component fetched from `/api/shared/:secretKey` (which returns album + photos)
2. But then passed only the album name to **PhotoGrid**
3. **PhotoGrid** tried to re-fetch from `/api/albums/:album/photos`
4. That endpoint **rejects unpublished albums** for non-authenticated users
5. Result: Images would fail to load for shared unpublished albums

## Solution

Modified the flow to use the photos already fetched from the share link endpoint:

### Changes Made

1. **PhotoGrid Component** (`frontend/src/components/PhotoGrid.tsx`)
   - Added optional `initialPhotos?: Photo[]` prop
   - Modified useEffect to skip API fetch if `initialPhotos` is provided
   - Added `initialPhotos` to dependency array

2. **SharedAlbum Component** (`frontend/src/components/SharedAlbum.tsx`)
   - Added `photos` state to store photos from API response
   - Extracts `data.photos` from the `/api/shared/:secretKey` response
   - Passes photos to PhotoGrid via `initialPhotos` prop

## How It Works Now

### For Shared Albums (via share link):
1. User visits `/shared/:secretKey`
2. SharedAlbum validates the link via `/api/shared/:secretKey`
3. Endpoint returns `{ album, photos, expiresAt }`
4. SharedAlbum passes both `album` and `initialPhotos` to PhotoGrid
5. PhotoGrid skips API fetch and uses provided photos
6. Images load from static `/optimized/` paths (no auth required)

### For Regular Albums (authenticated or published):
1. PhotoGrid receives only `album` prop (no `initialPhotos`)
2. PhotoGrid fetches photos from `/api/albums/:album/photos`
3. Works as before with auth/publish checks

## Image Serving

Images are served as static files from these paths:
- `/optimized/thumbnail/:album/:filename` - Thumbnail images
- `/optimized/modal/:album/:filename` - Modal/full-size images  
- `/optimized/download/:album/:filename` - Download images

These are served by Express static middleware with CORS headers, so they work for:
- Authenticated users
- Non-authenticated users with share links
- Published albums

## Files Modified

1. `frontend/src/components/PhotoGrid.tsx`
   - Added `initialPhotos` prop
   - Added check to skip fetch if `initialPhotos` provided

2. `frontend/src/components/SharedAlbum.tsx`
   - Added `photos` state
   - Extracts photos from API response
   - Passes photos to PhotoGrid

## Testing

To verify the fix works:

1. Create an unpublished album with photos
2. Generate a share link from admin portal
3. Open share link in incognito window (not authenticated)
4. Verify:
   - Album loads
   - Photos are visible
   - Photos can be clicked to open modal
   - Full-size images load in modal
   - Download works

All functionality should work identically to published albums, but accessed via the share link.

## Why This Works

The key insight is that:
- **Photo data** (list of filenames, titles, etc.) requires API access with auth/share checks
- **Photo files** themselves are static assets served with CORS, no auth required

By fetching the photo data once via the share link endpoint (which validates the secret key), we get both the authorization AND the photo list. Then the actual image files load as regular static assets.

This is secure because:
- Secret keys are cryptographically random (256-bit)
- Can't enumerate share links (404 for invalid keys)
- Share links can expire
- Album must exist and match the share link
- Share links are tied to specific albums via foreign key
