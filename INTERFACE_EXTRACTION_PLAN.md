# Interface Extraction Plan

## Executive Summary

**Total Interfaces Found**: 116 across 85 files

### Current State
- ✅ **24 interfaces** already in types.ts files (well-organized!)
- 📦 **69 interfaces** are component Props (should stay local)
- 🔄 **23 interfaces** should be extracted/consolidated

---

## Strategy: Keep vs Extract

### ✅ **KEEP LOCAL** (69 interfaces)

**Component Props Interfaces** - These are fine where they are!
- React best practice: Props interfaces live next to components
- Makes components self-documenting
- No benefit from extraction

**Examples:**
- `AlbumToolbarProps`, `PhotosPanelProps`, `SortableAlbumCardProps`
- `HeaderProps`, `FooterProps`, `SEOProps`
- All the `*Props` interfaces

**Reason**: Props interfaces are component-specific contracts. Extracting them would make code harder to understand.

---

## 🔄 **EXTRACT/CONSOLIDATE** (23 interfaces)

### Priority 1: **Duplicate Photo Interface** 🚨

**Problem**: `Photo` interface defined in 2 places!
1. `frontend/src/components/AdminPortal/types.ts` (9 lines)
2. `frontend/src/components/PhotoModal/types.ts` (12 lines)

**Action**: 
- Compare both definitions
- Create single canonical `Photo` interface in `frontend/src/types/photo.ts`
- Update all imports

---

### Priority 2: **Utility Interfaces** (8 interfaces)

These are currently scattered but should be in dedicated util types files:

#### `utils/photoHelpers.ts` interfaces
- `Photo` (export interface) - MOVE to `types/photo.ts`
- `ImageDimensions` (export interface) - MOVE to `types/photo.ts`

#### `utils/mapHelpers.ts` interfaces
- `VisitorLocation` (export interface) - ALREADY defined in Metrics/types.ts!
  - **Action**: Remove duplicate, import from Metrics/types.ts

#### `utils/errorMessages.ts` interfaces
- `ErrorInfo` (export interface) - KEEP (single use, specific to error messages)

#### Other utility interfaces:
- Need to scan remaining 4 utility interfaces from scan

---

### Priority 3: **Shared Domain Interfaces** (11 misc interfaces)

#### Confirmation/Modal Interfaces
- `ConfirmModalConfig` (AlbumsManager/utils/modalHelpers.ts)
  - **Action**: Move to `components/AdminPortal/AlbumsManager/types.ts`

#### Toast/Message Interfaces
- `ToastMessage` (SharedAlbum.tsx)
  - **Action**: Extract to `types/common.ts` if reused, else keep local

#### SEO/Meta Interfaces
- Check if there are meta/SEO interfaces that should be in a central place

---

## 📋 **Detailed Extraction Tasks**

### Task 1: Resolve Photo Interface Duplication
**Files to modify:**
1. Read both Photo definitions
2. Create unified `frontend/src/types/photo.ts`
3. Update imports in:
   - All components using Photo
   - AdminPortal/types.ts (remove Photo)
   - PhotoModal/types.ts (remove Photo)
   - utils/photoHelpers.ts (remove Photo, import instead)

---

### Task 2: Resolve VisitorLocation Duplication
**Files to modify:**
1. Remove `VisitorLocation` from `utils/mapHelpers.ts`
2. Update import to use `AdminPortal/Metrics/types.ts`

---

### Task 3: Centralize Common Types
**Create**: `frontend/src/types/common.ts`

Move these if they're reused:
- `ToastMessage` interface
- `ErrorInfo` interface (if used outside utils)
- Any other cross-cutting concern interfaces

---

## 🎯 **Final Structure**

```
frontend/src/
├── types/
│   ├── photo.ts          # Photo, ImageDimensions
│   └── common.ts         # Shared across domains
├── components/
│   ├── AdminPortal/
│   │   ├── types.ts      # Admin-specific types (no Photo)
│   │   ├── AlbumsManager/
│   │   │   └── types.ts  # AlbumsManager types + ConfirmModalConfig
│   │   ├── ConfigManager/
│   │   │   └── types.ts  # Config types
│   │   └── Metrics/
│   │       └── types.ts  # Stats, VisitorLocation, etc.
│   └── PhotoModal/
│       └── types.ts      # ExifData only (Photo imported)
└── utils/
    ├── photoHelpers.ts   # NO interfaces, imports from types/
    ├── mapHelpers.ts     # NO interfaces, imports from Metrics/types.ts
    └── errorMessages.ts  # ErrorInfo interface (keep)
```

---

## ⚠️ **What NOT to Extract**

1. **Component Props** (69 interfaces) - Keep next to components
2. **Handler Props** - Keep next to handler factory functions
3. **Hook Props** - Keep next to custom hooks
4. **Single-use interfaces** - If only used in one file, keep local

---

## 📊 **Impact Summary**

- **Interfaces to move**: ~8-10
- **Duplicates to resolve**: 2 (Photo, VisitorLocation)
- **New type files to create**: 1-2 (`types/photo.ts`, maybe `types/common.ts`)
- **Imports to update**: ~20-30 files

**Benefits:**
- ✅ No duplicate interface definitions
- ✅ Clear separation: domain types vs component types
- ✅ Utility functions import from canonical type sources
- ✅ Easier to find type definitions

---

## 🚀 **Execution Order**

1. ✅ Scan complete (done)
2. Create `types/photo.ts` and move Photo interface
3. Resolve VisitorLocation duplication
4. Move ConfirmModalConfig to AlbumsManager/types.ts
5. Test build
6. Commit

**Estimated time**: 30-45 minutes
**Risk level**: Low (TypeScript will catch all issues)

