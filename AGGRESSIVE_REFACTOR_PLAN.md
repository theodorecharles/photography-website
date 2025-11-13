# Aggressive Refactor Plan - AlbumsManager

## Current State
- **3,498 lines** 🔴
- Monolithic component with everything

## Target State
- **~300 lines** ✅ (main orchestrator)
- Modular, testable, maintainable

---

## Strategy

### Phase 1: Split UI into Components (Highest Impact)
Extract massive JSX blocks into focused components

**Components to create:**
1. **ToolbarButtons** (~50 lines) - Save/Cancel buttons at top
2. **CreateFolderButton** (~30 lines) - Folder creation
3. **AlbumsGrid** (~400 lines) - Main albums display with folders
4. **PhotosPanel** (~500 lines) - Photo management when album selected
5. **Modals** (~200 lines) - All modal dialogs

**Estimated reduction:** ~1,200 lines moved to components

### Phase 2: Extract Handlers (Medium Impact)
Move handler functions to hooks or utilities

**What stays in main component:**
- State coordination
- Hook initialization
- Event dispatching

**What moves out:**
- Upload handlers → already have state, just need to connect
- Complex business logic → utils

**Estimated reduction:** ~800 lines moved to hooks/utils

### Phase 3: Clean Up (Low Impact)
- Remove duplicate code
- Consolidate imports
- Add JSDoc comments

---

## Execution Order

1. ✅ Commit current state (all bug fixes)
2. Create component: AlbumsGridSection
3. Create component: PhotosPanel  
4. Create component: Modals collection
5. Update main file to use components
6. Test
7. Commit
8. Celebrate 🎉

---

## Time Estimate
- 2-3 hours of focused work
- Will actually make it ~300 lines this time! 😂

