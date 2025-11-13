# Data Directory Migration Notes

## Overview
All persistent data has been moved to a centralized `/data` directory for easier Docker volume mounting.

## Changes Made

### 1. **Backend Configuration** (`backend/src/config.ts`)
- Added `DATA_DIR` constant: defaults to `<project_root>/data` or `process.env.DATA_DIR`
- Updated `config.json` path: now `data/config.json` instead of `config/config.json`
- Updated `OPTIMIZED_DIR`: now `data/optimized` instead of root `optimized/`
- Added `DB_PATH` export: now `data/gallery.db` instead of root `gallery.db`
- Updated `photosDir` default: now `data/photos` instead of root `photos/`

### 2. **Database** (`backend/src/database.ts`)
- Now imports `DB_PATH` from `config.ts` instead of hardcoding path
- Database file is now at `data/gallery.db`

### 3. **All Route Files Updated**
Updated to use `DATA_DIR` for config.json access:
- `routes/config.ts`
- `routes/branding.ts`
- `routes/external-links.ts`
- `routes/image-optimization.ts`
- `routes/external-pages.ts`
- `routes/auth.ts`
- `routes/setup.ts`
- `routes/album-management.ts`
- `security.ts`

### 4. **Migration Script** (`migrate-to-data-directory.js`)
Created an idempotent migration script that moves:
- `gallery.db` → `data/gallery.db`
- `gallery.db-shm` → `data/gallery.db-shm` (SQLite shared memory)
- `gallery.db-wal` → `data/gallery.db-wal` (SQLite write-ahead log)
- `config/config.json` → `data/config.json`
- `photos/` → `data/photos/`
- `optimized/` → `data/optimized/`

### 5. **Restart Script** (`restart.sh`)
- Added call to `migrate-to-data-directory.js` before other migrations
- Updated all `config.json` references to check `data/config.json` first, fall back to old location
- Backward compatible with old structure during transition

## File Locations (Before → After)

| File/Directory | Old Location | New Location |
|---|---|---|
| Database | `./gallery.db` | `./data/gallery.db` |
| Config | `./config/config.json` | `./data/config.json` |
| Photos | `./photos/` | `./data/photos/` |
| Optimized Images | `./optimized/` | `./data/optimized/` |
| Avatar | `./photos/avatar.png` | `./data/photos/avatar.png` |

## Docker Usage

```dockerfile
# Dockerfile example
VOLUME ["/data"]
ENV DATA_DIR=/data
```

```bash
# Docker run example
docker run -v /host/path:/data -e DATA_DIR=/data photography-website
```

## Migration Scripts Needing Updates (when merging to oobe)

The following migration scripts exist on `oobe` branch and will need to be updated to use `data/gallery.db`:

1. **`migrate-database.js`**
   - Update: `const NEW_DB_PATH = path.join(__dirname, 'data', 'gallery.db');`

2. **`migrate-add-sort-order.js`**
   - Update: `const DB_PATH = path.join(__dirname, 'data', 'gallery.db');`

3. **`migrate-add-share-links.js`**
   - Update: `const DB_PATH = path.join(__dirname, 'data', 'gallery.db');`

4. **`migrate-add-album-folders.js`**
   - Update: `const DB_PATH = path.join(__dirname, 'data', 'gallery.db');`

5. **`migrate-fix-share-links-fk.js`**
   - Update: `const DB_PATH = path.join(__dirname, 'data', 'gallery.db');`

6. **`migrate-add-folder-sort-order.js`**
   - Update: `const DB_PATH = path.join(__dirname, 'data', 'gallery.db');`

7. **`optimize_all_images.js`**
   - Update config path references to use `data/config.json`

8. **`scripts/generate-static-json.js`**
   - Update config path references to use `data/config.json`

## Testing Checklist

- [ ] Run `migrate-to-data-directory.js` on existing installation
- [ ] Verify all files moved to `/data`
- [ ] Test setup wizard creates files in `/data`
- [ ] Test photo upload to `/data/photos/`
- [ ] Test image optimization to `/data/optimized/`
- [ ] Test config updates to `/data/config.json`
- [ ] Test database operations with `/data/gallery.db`
- [ ] Test Docker volume mounting with `-v /host/data:/data`

## Backward Compatibility

The changes include fallbacks to old locations:
- `restart.sh` checks both `data/config.json` and `config/config.json`
- Migration script is idempotent and safe to run multiple times
- No data loss - files are moved, not copied

## Environment Variables

- `DATA_DIR`: Override default data directory location (default: `./data`)
- All existing environment variables remain functional

## Notes

- Old `config/` directory can remain for `config.example.json`
- Migration is one-way (files are moved, not copied)
- All absolute paths in `config.json` remain unchanged (e.g., avatarPath is still `/photos/avatar.png` URL)

