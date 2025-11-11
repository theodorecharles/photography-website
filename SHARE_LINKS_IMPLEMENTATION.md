# Share Links Feature Implementation

This document describes the share links feature that allows admins to generate shareable links for unpublished albums.

## Overview

The share links feature allows authenticated admins to create time-limited (or permanent) shareable URLs for unpublished albums, enabling visitors to access hidden albums without authentication.

## Features

- **Secure Links**: Each share link uses a 64-character hexadecimal secret key (256-bit security)
- **Configurable Expiration**: Choose from 7 expiration options:
  - 15 minutes
  - 1 hour
  - 12 hours
  - 1 day
  - 1 week
  - 1 month
  - Forever (never expires)
- **Copy Link Button**: Easy one-click copy to clipboard functionality
- **Cowboy-Themed Error Pages**: 
  - 404 error for invalid links
  - Custom expired link page with cowboy theme

## Components Created

### Backend

1. **Database Migration** (`migrate-add-share-links.js`)
   - Creates `share_links` table with columns:
     - `id`: Primary key
     - `album`: Foreign key to albums table
     - `secret_key`: 64-char hex string (unique)
     - `expires_at`: Nullable datetime for expiration
     - `created_at`: Timestamp
   - Indexes on `secret_key` and `expires_at` for performance

2. **Database Functions** (`backend/src/database.ts`)
   - `createShareLink()`: Generate new share link with secure random key
   - `getShareLinkBySecret()`: Retrieve share link by secret key
   - `isShareLinkExpired()`: Check if link has expired
   - `deleteShareLink()`: Delete individual share link
   - `deleteShareLinksForAlbum()`: Delete all links for an album
   - `getShareLinksForAlbum()`: Get all links for an album (admin)
   - `deleteExpiredShareLinks()`: Cleanup function for expired links

3. **Share Links Routes** (`backend/src/routes/share-links.ts`)
   - `POST /api/share-links/create`: Create new share link (requires auth + CSRF)
   - `GET /api/share-links/validate/:secretKey`: Validate a share link
   - `GET /api/share-links/album/:album`: Get all links for album (admin)
   - `DELETE /api/share-links/album/:album`: Delete all links for album (admin)

4. **Shared Album Route** (`backend/src/routes/albums.ts`)
   - `GET /api/shared/:secretKey`: Fetch album data using share link
   - Returns 410 status if link is expired
   - Returns 404 if link is invalid
   - Bypasses published status check

### Frontend

1. **ShareModal Component** (`frontend/src/components/AdminPortal/ShareModal.tsx`)
   - Modal dialog for creating share links
   - Dropdown selector for expiration time
   - Generated link display with copy button
   - Shows expiration date and creation date
   - "Create Another Link" functionality

2. **ShareModal Styles** (`frontend/src/components/AdminPortal/ShareModal.css`)
   - Modern dark theme styling
   - Responsive design for mobile
   - Copy button with success state animation

3. **ExpiredLink Component** (`frontend/src/components/Misc/ExpiredLink.tsx`)
   - Cowboy-themed expired link error page
   - Consistent with existing 404 page styling

4. **SharedAlbum Component** (`frontend/src/components/SharedAlbum.tsx`)
   - Route handler for `/shared/:secretKey`
   - Validates share link before displaying album
   - Shows appropriate error page for invalid/expired links
   - Renders PhotoGrid for valid links

5. **Admin Controls** (`frontend/src/components/AdminPortal/AlbumsManager.tsx`)
   - Added "Share Album" button for unpublished albums
   - Button only appears when album is unpublished
   - Opens ShareModal when clicked
   - Purple/violet theme to distinguish from other actions

## Usage

### Creating a Share Link

1. Navigate to Admin Portal → Albums
2. Select an unpublished album
3. Click the "Share Album" button (purple button with share icon)
4. Choose expiration time from dropdown
5. Click "Generate Share Link"
6. Copy the generated URL using the "Copy Link" button
7. Share the URL with intended recipients

### Accessing a Shared Album

1. Visit the shared URL: `https://yourdomain.com/shared/<secret-key>`
2. If valid and not expired, the album will be displayed
3. If expired, a cowboy-themed error page appears
4. If invalid, a 404 cowboy error page appears

## Database Schema

```sql
CREATE TABLE share_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  album TEXT NOT NULL,
  secret_key TEXT NOT NULL UNIQUE,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (album) REFERENCES albums(name) ON DELETE CASCADE
);

CREATE INDEX idx_share_links_secret_key ON share_links(secret_key);
CREATE INDEX idx_share_links_expires_at ON share_links(expires_at);
```

## Security Considerations

- Secret keys are generated using `crypto.randomBytes(32)` for cryptographic security
- CSRF protection on link creation endpoint
- Authentication required to create links
- Links can only access albums that exist in the database
- Foreign key constraint ensures links are deleted when album is deleted
- Share links bypass authentication but not filesystem security

## Future Enhancements

Consider adding:
- View count tracking for share links
- Ability to revoke/delete individual share links
- Email notifications when links are accessed
- Maximum usage count per link
- Password-protected share links
- Scheduled cleanup job for expired links

## Files Modified/Created

### Created Files:
- `migrate-add-share-links.js`
- `backend/src/routes/share-links.ts`
- `frontend/src/components/AdminPortal/ShareModal.tsx`
- `frontend/src/components/AdminPortal/ShareModal.css`
- `frontend/src/components/Misc/ExpiredLink.tsx`
- `frontend/src/components/SharedAlbum.tsx`
- `SHARE_LINKS_IMPLEMENTATION.md` (this file)

### Modified Files:
- `backend/src/database.ts` - Added share link functions
- `backend/src/server.ts` - Registered share-links router, added CSRF header
- `backend/src/routes/albums.ts` - Added shared album endpoint
- `frontend/src/App.tsx` - Added /shared/:secretKey route
- `frontend/src/components/AdminPortal/AlbumsManager.tsx` - Added share button and modal
- `frontend/src/components/AdminPortal/AlbumsManager.css` - Added share button styles

## Testing

To test the feature:

1. Run the migration: `node migrate-add-share-links.js`
2. Restart the backend server
3. Create an unpublished album
4. Generate a share link
5. Test accessing the link in an incognito window
6. Test expired links by setting a 15-minute expiration and waiting
