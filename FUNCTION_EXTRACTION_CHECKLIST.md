# Function Extraction Checklist

Generated: 2025-11-13T21:31:32.885Z

**Total Files:** 27
**Total Functions Found:** 130

---

## Directory: `frontend/src`

### File: `App.tsx`
Path: `frontend/src/App.tsx`

- [ ] **checkSetup** (line 100)
- [ ] **checkAuth** (line 134)
- [ ] **handleLogoutEvent** (line 151)
- [ ] **fetchData** (line 209)
- [ ] **updateNavigationSilently** (line 298)

## Directory: `frontend/src/components`

### File: `Footer.tsx`
Path: `frontend/src/components/Footer.tsx`

- [ ] **fetchCurrentYear** (line 24)

### File: `Header.tsx`
Path: `frontend/src/components/Header.tsx`

- [ ] **checkAuth** (line 79)
- [ ] **handleScroll** (line 99)
- [ ] **handleAlbumsHover** (line 117)
- [ ] **handleLinksHover** (line 125)
- [ ] **handleClickOutside** (line 134)
- [ ] **handleAlbumsClick** (line 166)
- [ ] **handleLinksClick** (line 178)
- [ ] **handleLogout** (line 515)

### File: `PhotoGrid.tsx`
Path: `frontend/src/components/PhotoGrid.tsx`

- [ ] **reconstructPhoto** (line 64)
- [ ] **handlePhotoClick** (line 89)
- [ ] **handleCloseModal** (line 110)
- [ ] **handleScroll** (line 161)
- [ ] **fetchPhotos** (line 206)
- [ ] **handleImageLoad** (line 295)
- [ ] **getNumColumns** (line 311)
- [ ] **handleResize** (line 340)
- [ ] **distributePhotos** (line 354)

### File: `SSEToaster.tsx`
Path: `frontend/src/components/SSEToaster.tsx`

- [ ] **handleToasterDragStart** (line 45)
- [ ] **handleGlobalMouseMove** (line 59)
- [ ] **handleGlobalMouseUp** (line 67)
- [ ] **handleMouseLeave** (line 110)
- [ ] **handleScroll** (line 127)
- [ ] **handleMaximizeClick** (line 163)
- [ ] **handleCollapseClick** (line 185)

### File: `SharedAlbum.tsx`
Path: `frontend/src/components/SharedAlbum.tsx`

- [ ] **validateShareLink** (line 53)
- [ ] **addMessage** (line 102)
- [ ] **removeMessage** (line 112)
- [ ] **checkExpiration** (line 125)

## Directory: `frontend/src/components/AdminPortal`

### File: `AdminPortal.tsx`
Path: `frontend/src/components/AdminPortal/AdminPortal.tsx`

- [ ] **loadCSS** (line 40)
- [ ] **getActiveTab** (line 72)
- [ ] **addMessage** (line 95)
- [ ] **removeMessage** (line 106)
- [ ] **checkForRunningJobs** (line 112)
- [ ] **handleAlbumsUpdated** (line 189)
- [ ] **loadExternalLinks** (line 208)
- [ ] **loadBranding** (line 220)
- [ ] **loadAlbums** (line 241)
- [ ] **handleLogout** (line 270)

### File: `PasswordInput.tsx`
Path: `frontend/src/components/AdminPortal/PasswordInput.tsx`

- [ ] **toggleVisibility** (line 22)
- [ ] **copyToClipboard** (line 26)

### File: `ShareModal.tsx`
Path: `frontend/src/components/AdminPortal/ShareModal.tsx`

- [ ] **generateLink** (line 35)
- [ ] **handleExpirationChange** (line 75)
- [ ] **handleCustomMinutesSubmit** (line 87)
- [ ] **handleCopyClick** (line 97)

## Directory: `frontend/src/components/AdminPortal/AlbumsManager`

### File: `index.tsx`
Path: `frontend/src/components/AdminPortal/AlbumsManager/index.tsx`

- [ ] **showConfirmation** (line 207)
- [ ] **handleModalCancel** (line 337)
- [ ] **handleCreateAlbumFromModal** (line 339)

## Directory: `frontend/src/components/AdminPortal/AlbumsManager/components`

### File: `SortableAlbumCard.tsx`
Path: `frontend/src/components/AdminPortal/AlbumsManager/components/SortableAlbumCard.tsx`

- [ ] **handleTouchStart** (line 49)
- [ ] **handleTouchMove** (line 55)
- [ ] **handleTouchEnd** (line 68)
- [ ] **handleClick** (line 78)

### File: `SortablePhotoItem.tsx`
Path: `frontend/src/components/AdminPortal/AlbumsManager/components/SortablePhotoItem.tsx`

- [ ] **handleTouchStart** (line 38)
- [ ] **handleTouchMove** (line 44)
- [ ] **handleTouchEnd** (line 58)
- [ ] **handleTouchCancel** (line 82)
- [ ] **handleOverlayClick** (line 89)

## Directory: `frontend/src/components/AdminPortal/ConfigManager`

### File: `index.tsx`
Path: `frontend/src/components/AdminPortal/ConfigManager/index.tsx`

- [ ] **showConfirmation** (line 49)
- [ ] **handleModalCancel** (line 66)
- [ ] **checkForRunningJobs** (line 90)
- [ ] **reconnectToTitlesJob** (line 173)
- [ ] **reconnectToOptimizationJob** (line 251)
- [ ] **loadConfig** (line 328)
- [ ] **checkMissingTitles** (line 349)
- [ ] **handleGenerateTitles** (line 440)
- [ ] **handleRunOptimization** (line 532)
- [ ] **handleSetupOpenAI** (line 647)

## Directory: `frontend/src/components/AdminPortal/ConfigManager/sections`

### File: `AdvancedSettingsSection.tsx`
Path: `frontend/src/components/AdminPortal/ConfigManager/sections/AdvancedSettingsSection.tsx`

- [ ] **updateConfig** (line 60)
- [ ] **updateArrayItem** (line 75)
- [ ] **addArrayItem** (line 92)
- [ ] **removeArrayItem** (line 109)
- [ ] **handleToggleOpenObserve** (line 127)
- [ ] **handleSaveSection** (line 176)
- [ ] **handleRestartBackend** (line 214)
- [ ] **handleRestartFrontend** (line 254)
- [ ] **hasUnsavedChanges** (line 290)

### File: `BrandingSection.tsx`
Path: `frontend/src/components/AdminPortal/ConfigManager/sections/BrandingSection.tsx`

- [ ] **handleAvatarFileSelect** (line 35)
- [ ] **handleAvatarDragOver** (line 44)
- [ ] **handleAvatarDragLeave** (line 50)
- [ ] **handleAvatarDrop** (line 56)
- [ ] **handleAvatarClick** (line 70)
- [ ] **handleBrandingChange** (line 74)

### File: `ImageOptimizationSection.tsx`
Path: `frontend/src/components/AdminPortal/ConfigManager/sections/ImageOptimizationSection.tsx`

- [ ] **updateConfig** (line 33)
- [ ] **handleSaveSection** (line 48)
- [ ] **hasUnsavedChanges** (line 86)

### File: `LinksSection.tsx`
Path: `frontend/src/components/AdminPortal/ConfigManager/sections/LinksSection.tsx`

- [ ] **handleAddLink** (line 58)
- [ ] **handleDeleteLink** (line 62)
- [ ] **handleLinkChange** (line 66)
- [ ] **handleMoveUp** (line 76)
- [ ] **handleMoveDown** (line 85)
- [ ] **handleCancelLinks** (line 94)
- [ ] **handleSaveLinks** (line 99)
- [ ] **hasUnsavedLinksChanges** (line 135)

### File: `OpenAISection.tsx`
Path: `frontend/src/components/AdminPortal/ConfigManager/sections/OpenAISection.tsx`

- [ ] **updateConfig** (line 78)
- [ ] **handleToggleAutoAI** (line 94)
- [ ] **validateOpenAIKey** (line 150)
- [ ] **handleSaveSection** (line 176)
- [ ] **hasUnsavedChanges** (line 230)

## Directory: `frontend/src/components/AdminPortal/Metrics`

### File: `Metrics.tsx`
Path: `frontend/src/components/AdminPortal/Metrics/Metrics.tsx`

- [ ] **normalizeAlbumName** (line 64)
- [ ] **formatNumber** (line 231)
- [ ] **formatDuration** (line 235)
- [ ] **formatDate** (line 249)
- [ ] **toggleRowExpansion** (line 255)
- [ ] **isRowExpanded** (line 297)
- [ ] **toggleTableExpansion** (line 301)
- [ ] **isTableExpanded** (line 308)

### File: `StatsCards.tsx`
Path: `frontend/src/components/AdminPortal/Metrics/StatsCards.tsx`

- [ ] **formatNumber** (line 13)
- [ ] **formatDuration** (line 17)

### File: `VisitorMap.tsx`
Path: `frontend/src/components/AdminPortal/Metrics/VisitorMap.tsx`

- [ ] **getMarkerRadius** (line 37)
- [ ] **getMarkerOpacity** (line 47)
- [ ] **formatLocationName** (line 55)

## Directory: `frontend/src/components/Misc`

### File: `AuthError.tsx`
Path: `frontend/src/components/Misc/AuthError.tsx`

- [ ] **getErrorMessage** (line 13)

### File: `SEO.tsx`
Path: `frontend/src/components/Misc/SEO.tsx`

- [ ] **updateMetaTag** (line 46)
- [ ] **updateCanonicalLink** (line 58)

## Directory: `frontend/src/components/PhotoModal`

### File: `InfoPanel.tsx`
Path: `frontend/src/components/PhotoModal/InfoPanel.tsx`

- [ ] **formatFileSize** (line 18)

### File: `PhotoModal.tsx`
Path: `frontend/src/components/PhotoModal/PhotoModal.tsx`

- [ ] **fetchBranding** (line 79)
- [ ] **handleTouchStart** (line 431)
- [ ] **handleTouchEnd** (line 436)
- [ ] **handleFullscreenChange** (line 465)
- [ ] **handleKeyDown** (line 523)

## Directory: `frontend/src/components/SetupWizard`

### File: `SetupWizard.tsx`
Path: `frontend/src/components/SetupWizard/SetupWizard.tsx`

- [ ] **handleAvatarChange** (line 47)
- [ ] **checkSetupStatus** (line 73)
- [ ] **handleSubmit** (line 92)

## Directory: `frontend/src/contexts`

### File: `SSEToasterContext.tsx`
Path: `frontend/src/contexts/SSEToasterContext.tsx`

- [ ] **resetToasterState** (line 87)
- [ ] **useSSEToaster** (line 169)

