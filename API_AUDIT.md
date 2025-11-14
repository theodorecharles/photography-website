# API Endpoint Audit

## Issues Found (ALL FIXED ✅)

### ✅ 1. Photo Reorder Endpoint Mismatch - FIXED
**Frontend:** ~~`/api/albums/${album}/photos/reorder`~~ → `/api/albums/${album}/photo-order` (POST)
**Backend:** `/api/albums/${album}/photo-order` (POST)
**Location:** `frontend/src/components/AdminPortal/AlbumsManager/hooks/usePhotoManagement.ts:114`
**Status:** ✅ Fixed - Changed frontend to use `/photo-order`

### ✅ 2. Update Photo Title - Endpoint Doesn't Exist - FIXED
**Frontend:** ~~`/api/albums/${album}/photos/${filename}/title` (PUT)~~ → `/api/image-metadata/${album}/${filename}` (PUT)
**Backend:** `/api/image-metadata/${album}/${filename}` (PUT)
**Location:** `frontend/src/components/AdminPortal/AlbumsManager/hooks/usePhotoManagement.ts:165`
**Status:** ✅ Fixed - Changed to use correct image-metadata endpoint

### ✅ 3. Move Album to Folder - Endpoint Mismatch - FIXED
**Frontend:** ~~`/api/albums/${album}/folder` (PATCH)~~ → `/api/albums/${album}/move` (PUT)
**Backend:** `/api/albums/${album}/move` (PUT)
**Location:** `frontend/src/components/AdminPortal/AlbumsManager/hooks/useFolderManagement.ts:129`
**Status:** ✅ Fixed - Changed endpoint and method

### ✅ 4. Toggle Folder Published - Endpoint Mismatch - FIXED
**Frontend:** ~~`/api/folders/${folder}/toggle-published` (PUT)~~ → `/api/folders/${folder}/publish` (PATCH)
**Backend:** `/api/folders/${folder}/publish` (PATCH)
**Location:** `frontend/src/components/AdminPortal/AlbumsManager/handlers/folderHandlers.ts:77`
**Status:** ✅ Fixed - Changed endpoint and HTTP method

## All Backend Endpoints

### Setup (`/api/setup`)
- ✅ GET `/status`
- ✅ POST `/initialize`
- ✅ POST `/upload-avatar`

### Auth (`/api/auth`)
- ✅ GET `/google`
- ✅ GET `/google/callback`
- ✅ GET `/status`
- ✅ POST `/logout`

### Albums (Read - no prefix)
- ✅ GET `/api/albums`
- ✅ GET `/api/albums/:album/photos`
- ✅ GET `/api/random-photos`
- ✅ GET `/api/shared/:secretKey`
- ✅ GET `/api/photos/:album/:filename/exif`

### Album Management (`/api/albums`)
- ✅ POST `/` (create album)
- ✅ DELETE `/:album`
- ✅ DELETE `/:album/photos/:photo`
- ✅ POST `/:album/upload`
- ✅ PATCH `/:album/rename`
- ✅ PATCH `/:album/publish`
- ⚠️  POST `/:album/optimize` (not used in frontend)
- ✅ POST `/:album/photo-order`
- ✅ PUT `/sort-order`
- ✅ PUT `/:albumName/move`

### Folders (`/api/folders`)
- ✅ GET `/`
- ✅ POST `/`
- ✅ DELETE `/:folder`
- ✅ PATCH `/:folder/publish`
- ⚠️  PATCH `/:folder/albums/:album` (not used in frontend)
- ⚠️  PUT `/sort-order` (not used in frontend)

### External Links (`/api/external-links`)
- ✅ GET `/`
- ✅ PUT `/`

### Branding (`/api/branding`)
- ✅ GET `/`
- ✅ PUT `/`
- ✅ POST `/upload-avatar`

### Config (`/api/config`)
- ✅ GET `/`
- ✅ POST `/validate-openai-key`
- ✅ PUT `/`

### Metrics (`/api/metrics`)
- ✅ POST `/query`
- ✅ GET `/visitors-over-time`
- ✅ GET `/visitor-locations`
- ✅ GET `/pageviews-by-hour`
- ✅ GET `/stats`

### Analytics (`/api/analytics`)
- ✅ POST `/track`

### AI Titles (`/api/ai-titles`)
- ✅ GET `/status`
- ✅ GET `/check-missing`
- ✅ POST `/stop`
- ✅ POST `/generate`

### Image Optimization (`/api/image-optimization`)
- ⚠️  GET `/settings` (not used in frontend)
- ⚠️  PUT `/settings` (not used in frontend)
- ✅ GET `/status`
- ✅ POST `/stop`
- ✅ POST `/optimize`

### Image Metadata (`/api/image-metadata`)
- ✅ GET `/:album/:filename`
- ⚠️  GET `/album/:album` (not used in frontend)
- ⚠️  GET `/all` (not used in frontend)
- ⚠️  POST `/` (not used in frontend)
- ✅ PUT `/:album/:filename` (should be used for title updates)
- ⚠️  DELETE `/:album/:filename` (not used in frontend)

### Share Links (`/api/share-links`)
- ✅ POST `/create`
- ⚠️  GET `/validate/:secretKey` (not used in frontend)
- ⚠️  GET `/album/:album` (not used in frontend)
- ⚠️  DELETE `/album/:album` (not used in frontend)

### Preview Grid (`/api/preview-grid`)
- ⚠️  GET `/album/:albumName` (not used in frontend)
- ⚠️  GET `/shared/:secretKey` (not used in frontend)

### Static JSON (`/api/static-json`)
- ⚠️  POST `/generate` (not used in frontend)
- ⚠️  GET `/status` (not used in frontend)

### System (`/api/system`)
- ✅ POST `/restart/backend`
- ✅ POST `/restart/frontend`

### External Pages
- ✅ GET `/api/external-pages`

### Health
- ✅ GET `/api/health`

### Other
- ✅ GET `/api/current-year`
- ✅ GET `/sitemap.xml`

## Summary
- **Critical Issues:** 4 endpoint mismatches that will cause 404 errors
- **Working Endpoints:** Most endpoints are correctly matched
- **Unused Backend Endpoints:** Several backend endpoints exist but aren't used by frontend

