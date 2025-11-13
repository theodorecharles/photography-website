# Function Extraction Checklist

**Total Functions Found:** 108
**Total Files:** 23

---

## `frontend/src/App.tsx`

- [ ] **checkSetup** (line 100)
  ```100:100:frontend/src/App.tsx
  const checkSetup = async () => {
  ```

- [ ] **checkAuth** (line 134)
  ```134:134:frontend/src/App.tsx
  const checkAuth = async () => {
  ```

- [ ] **handleLogoutEvent** (line 151)
  ```151:151:frontend/src/App.tsx
  const handleLogoutEvent = () => {
  ```

- [ ] **fetchData** (line 209)
  ```209:209:frontend/src/App.tsx
  const fetchData = async () => {
  ```

- [ ] **updateNavigationSilently** (line 298)
  ```298:298:frontend/src/App.tsx
  const updateNavigationSilently = async () => {
  ```

---

## `frontend/src/components/AdminPortal/AdminPortal.tsx`

- [ ] **loadCSS** (line 41)
  ```41:41:frontend/src/components/AdminPortal/AdminPortal.tsx
  const loadCSS = async () => {
  ```

- [ ] **addMessage** (line 91)
  ```91:91:frontend/src/components/AdminPortal/AdminPortal.tsx
  const addMessage = (message: { type: 'success' | 'error'; text: string }) => {
  ```

- [ ] **removeMessage** (line 102)
  ```102:102:frontend/src/components/AdminPortal/AdminPortal.tsx
  const removeMessage = (id: number) => {
  ```

- [ ] **checkForRunningJobs** (line 108)
  ```108:108:frontend/src/components/AdminPortal/AdminPortal.tsx
  const checkForRunningJobs = async () => {
  ```

- [ ] **handleAlbumsUpdated** (line 185)
  ```185:185:frontend/src/components/AdminPortal/AdminPortal.tsx
  const handleAlbumsUpdated = (event: Event) => {
  ```

- [ ] **loadExternalLinks** (line 204)
  ```204:204:frontend/src/components/AdminPortal/AdminPortal.tsx
  const loadExternalLinks = async () => {
  ```

- [ ] **loadBranding** (line 216)
  ```216:216:frontend/src/components/AdminPortal/AdminPortal.tsx
  const loadBranding = async () => {
  ```

- [ ] **loadAlbums** (line 237)
  ```237:237:frontend/src/components/AdminPortal/AdminPortal.tsx
  const loadAlbums = async () => {
  ```

- [ ] **handleLogout** (line 266)
  ```266:266:frontend/src/components/AdminPortal/AdminPortal.tsx
  const handleLogout = async () => {
  ```

---

## `frontend/src/components/AdminPortal/AlbumsManager/components/SortableAlbumCard.tsx`

- [ ] **handleTouchStart** (line 49)
  ```49:49:frontend/src/components/AdminPortal/AlbumsManager/components/SortableAlbumCard.tsx
  const handleTouchStart = (e: React.TouchEvent) => {
  ```

- [ ] **handleTouchMove** (line 55)
  ```55:55:frontend/src/components/AdminPortal/AlbumsManager/components/SortableAlbumCard.tsx
  const handleTouchMove = (e: React.TouchEvent) => {
  ```

- [ ] **handleTouchEnd** (line 68)
  ```68:68:frontend/src/components/AdminPortal/AlbumsManager/components/SortableAlbumCard.tsx
  const handleTouchEnd = (e: React.TouchEvent) => {
  ```

- [ ] **handleClick** (line 78)
  ```78:78:frontend/src/components/AdminPortal/AlbumsManager/components/SortableAlbumCard.tsx
  const handleClick = (e: React.MouseEvent) => {
  ```

---

## `frontend/src/components/AdminPortal/AlbumsManager/components/SortablePhotoItem.tsx`

- [ ] **handleTouchStart** (line 38)
  ```38:38:frontend/src/components/AdminPortal/AlbumsManager/components/SortablePhotoItem.tsx
  const handleTouchStart = (e: React.TouchEvent) => {
  ```

- [ ] **handleTouchMove** (line 44)
  ```44:44:frontend/src/components/AdminPortal/AlbumsManager/components/SortablePhotoItem.tsx
  const handleTouchMove = (e: React.TouchEvent) => {
  ```

- [ ] **handleTouchEnd** (line 58)
  ```58:58:frontend/src/components/AdminPortal/AlbumsManager/components/SortablePhotoItem.tsx
  const handleTouchEnd = (e: React.TouchEvent) => {
  ```

- [ ] **handleTouchCancel** (line 82)
  ```82:82:frontend/src/components/AdminPortal/AlbumsManager/components/SortablePhotoItem.tsx
  const handleTouchCancel = () => {
  ```

- [ ] **handleOverlayClick** (line 89)
  ```89:89:frontend/src/components/AdminPortal/AlbumsManager/components/SortablePhotoItem.tsx
  const handleOverlayClick = (e: React.MouseEvent) => {
  ```

---

## `frontend/src/components/AdminPortal/AlbumsManager/index.tsx`

- [ ] **handleModalCancel** (line 288)
  ```288:288:frontend/src/components/AdminPortal/AlbumsManager/index.tsx
  const handleModalCancel = () => cancelModal(setShowConfirmModal, setConfirmConfig);
  ```

- [ ] **handleCreateAlbumFromModal** (line 290)
  ```290:290:frontend/src/components/AdminPortal/AlbumsManager/index.tsx
  const handleCreateAlbumFromModal = async () => {
  ```

---

## `frontend/src/components/AdminPortal/ConfigManager/index.tsx`

- [ ] **handleModalCancel** (line 66)
  ```66:66:frontend/src/components/AdminPortal/ConfigManager/index.tsx
  const handleModalCancel = () => {
  ```

- [ ] **checkForRunningJobs** (line 90)
  ```90:90:frontend/src/components/AdminPortal/ConfigManager/index.tsx
  const checkForRunningJobs = async () => {
  ```

- [ ] **reconnectToTitlesJob** (line 173)
  ```173:173:frontend/src/components/AdminPortal/ConfigManager/index.tsx
  const reconnectToTitlesJob = async () => {
  ```

- [ ] **reconnectToOptimizationJob** (line 251)
  ```251:251:frontend/src/components/AdminPortal/ConfigManager/index.tsx
  const reconnectToOptimizationJob = async () => {
  ```

- [ ] **loadConfig** (line 328)
  ```328:328:frontend/src/components/AdminPortal/ConfigManager/index.tsx
  const loadConfig = async () => {
  ```

- [ ] **checkMissingTitles** (line 349)
  ```349:349:frontend/src/components/AdminPortal/ConfigManager/index.tsx
  const checkMissingTitles = async () => {
  ```

- [ ] **handleGenerateTitles** (line 440)
  ```440:440:frontend/src/components/AdminPortal/ConfigManager/index.tsx
  const handleGenerateTitles = async (forceRegenerate = false) => {
  ```

- [ ] **handleRunOptimization** (line 532)
  ```532:532:frontend/src/components/AdminPortal/ConfigManager/index.tsx
  const handleRunOptimization = async (force: boolean = false) => {
  ```

- [ ] **handleSetupOpenAI** (line 647)
  ```647:647:frontend/src/components/AdminPortal/ConfigManager/index.tsx
  const handleSetupOpenAI = () => {
  ```

---

## `frontend/src/components/AdminPortal/ConfigManager/sections/AdvancedSettingsSection.tsx`

- [ ] **updateConfig** (line 60)
  ```60:60:frontend/src/components/AdminPortal/ConfigManager/sections/AdvancedSettingsSection.tsx
  const updateConfig = (path: string[], value: any) => {
  ```

- [ ] **updateArrayItem** (line 75)
  ```75:75:frontend/src/components/AdminPortal/ConfigManager/sections/AdvancedSettingsSection.tsx
  const updateArrayItem = (path: string[], index: number, value: string) => {
  ```

- [ ] **addArrayItem** (line 92)
  ```92:92:frontend/src/components/AdminPortal/ConfigManager/sections/AdvancedSettingsSection.tsx
  const addArrayItem = (path: string[]) => {
  ```

- [ ] **removeArrayItem** (line 109)
  ```109:109:frontend/src/components/AdminPortal/ConfigManager/sections/AdvancedSettingsSection.tsx
  const removeArrayItem = (path: string[], index: number) => {
  ```

- [ ] **handleToggleOpenObserve** (line 127)
  ```127:127:frontend/src/components/AdminPortal/ConfigManager/sections/AdvancedSettingsSection.tsx
  const handleToggleOpenObserve = async () => {
  ```

- [ ] **handleSaveSection** (line 176)
  ```176:176:frontend/src/components/AdminPortal/ConfigManager/sections/AdvancedSettingsSection.tsx
  const handleSaveSection = async (sectionName: string) => {
  ```

- [ ] **handleRestartBackend** (line 214)
  ```214:214:frontend/src/components/AdminPortal/ConfigManager/sections/AdvancedSettingsSection.tsx
  const handleRestartBackend = async () => {
  ```

- [ ] **handleRestartFrontend** (line 254)
  ```254:254:frontend/src/components/AdminPortal/ConfigManager/sections/AdvancedSettingsSection.tsx
  const handleRestartFrontend = async () => {
  ```

---

## `frontend/src/components/AdminPortal/ConfigManager/sections/BrandingSection.tsx`

- [ ] **handleAvatarFileSelect** (line 35)
  ```35:35:frontend/src/components/AdminPortal/ConfigManager/sections/BrandingSection.tsx
  const handleAvatarFileSelect = (file: File) => {
  ```

- [ ] **handleAvatarDragOver** (line 44)
  ```44:44:frontend/src/components/AdminPortal/ConfigManager/sections/BrandingSection.tsx
  const handleAvatarDragOver = (e: React.DragEvent) => {
  ```

- [ ] **handleAvatarDragLeave** (line 50)
  ```50:50:frontend/src/components/AdminPortal/ConfigManager/sections/BrandingSection.tsx
  const handleAvatarDragLeave = (e: React.DragEvent) => {
  ```

- [ ] **handleAvatarDrop** (line 56)
  ```56:56:frontend/src/components/AdminPortal/ConfigManager/sections/BrandingSection.tsx
  const handleAvatarDrop = (e: React.DragEvent) => {
  ```

- [ ] **handleAvatarClick** (line 70)
  ```70:70:frontend/src/components/AdminPortal/ConfigManager/sections/BrandingSection.tsx
  const handleAvatarClick = () => {
  ```

- [ ] **handleBrandingChange** (line 74)
  ```74:74:frontend/src/components/AdminPortal/ConfigManager/sections/BrandingSection.tsx
  const handleBrandingChange = (field: keyof BrandingConfig, value: string) => {
  ```

---

## `frontend/src/components/AdminPortal/ConfigManager/sections/ImageOptimizationSection.tsx`

- [ ] **updateConfig** (line 33)
  ```33:33:frontend/src/components/AdminPortal/ConfigManager/sections/ImageOptimizationSection.tsx
  const updateConfig = (path: string[], value: any) => {
  ```

- [ ] **handleSaveSection** (line 48)
  ```48:48:frontend/src/components/AdminPortal/ConfigManager/sections/ImageOptimizationSection.tsx
  const handleSaveSection = async (sectionName: string) => {
  ```

---

## `frontend/src/components/AdminPortal/ConfigManager/sections/LinksSection.tsx`

- [ ] **handleAddLink** (line 58)
  ```58:58:frontend/src/components/AdminPortal/ConfigManager/sections/LinksSection.tsx
  const handleAddLink = () => {
  ```

- [ ] **handleDeleteLink** (line 62)
  ```62:62:frontend/src/components/AdminPortal/ConfigManager/sections/LinksSection.tsx
  const handleDeleteLink = (index: number) => {
  ```

- [ ] **handleMoveUp** (line 76)
  ```76:76:frontend/src/components/AdminPortal/ConfigManager/sections/LinksSection.tsx
  const handleMoveUp = (index: number) => {
  ```

- [ ] **handleMoveDown** (line 85)
  ```85:85:frontend/src/components/AdminPortal/ConfigManager/sections/LinksSection.tsx
  const handleMoveDown = (index: number) => {
  ```

- [ ] **handleCancelLinks** (line 94)
  ```94:94:frontend/src/components/AdminPortal/ConfigManager/sections/LinksSection.tsx
  const handleCancelLinks = () => {
  ```

- [ ] **handleSaveLinks** (line 99)
  ```99:99:frontend/src/components/AdminPortal/ConfigManager/sections/LinksSection.tsx
  const handleSaveLinks = async () => {
  ```

---

## `frontend/src/components/AdminPortal/ConfigManager/sections/OpenAISection.tsx`

- [ ] **updateConfig** (line 78)
  ```78:78:frontend/src/components/AdminPortal/ConfigManager/sections/OpenAISection.tsx
  const updateConfig = (path: string[], value: any) => {
  ```

- [ ] **handleToggleAutoAI** (line 94)
  ```94:94:frontend/src/components/AdminPortal/ConfigManager/sections/OpenAISection.tsx
  const handleToggleAutoAI = async () => {
  ```

- [ ] **handleSaveSection** (line 176)
  ```176:176:frontend/src/components/AdminPortal/ConfigManager/sections/OpenAISection.tsx
  const handleSaveSection = async () => {
  ```

---

## `frontend/src/components/AdminPortal/Metrics/Metrics.tsx`

- [ ] **formatNumber** (line 198)
  ```198:198:frontend/src/components/AdminPortal/Metrics/Metrics.tsx
  const formatNumber = (num: number) => {
  ```

- [ ] **formatDuration** (line 202)
  ```202:202:frontend/src/components/AdminPortal/Metrics/Metrics.tsx
  const formatDuration = (ms: number) => {
  ```

- [ ] **formatDate** (line 216)
  ```216:216:frontend/src/components/AdminPortal/Metrics/Metrics.tsx
  const formatDate = (timestamp: number) => {
  ```

- [ ] **toggleRowExpansion** (line 222)
  ```222:222:frontend/src/components/AdminPortal/Metrics/Metrics.tsx
  const toggleRowExpansion = (tableName: string, rowIndex: number) => {
  ```

- [ ] **toggleTableExpansion** (line 268)
  ```268:268:frontend/src/components/AdminPortal/Metrics/Metrics.tsx
  const toggleTableExpansion = (tableName: string) => {
  ```

---

## `frontend/src/components/AdminPortal/PasswordInput.tsx`

- [ ] **toggleVisibility** (line 22)
  ```22:22:frontend/src/components/AdminPortal/PasswordInput.tsx
  const toggleVisibility = () => {
  ```

- [ ] **copyToClipboard** (line 26)
  ```26:26:frontend/src/components/AdminPortal/PasswordInput.tsx
  const copyToClipboard = async () => {
  ```

---

## `frontend/src/components/AdminPortal/ShareModal.tsx`

- [ ] **generateLink** (line 35)
  ```35:35:frontend/src/components/AdminPortal/ShareModal.tsx
  const generateLink = async (expirationMinutes: number | null) => {
  ```

- [ ] **handleExpirationChange** (line 75)
  ```75:75:frontend/src/components/AdminPortal/ShareModal.tsx
  const handleExpirationChange = (newExpiration: number | null) => {
  ```

- [ ] **handleCustomMinutesSubmit** (line 87)
  ```87:87:frontend/src/components/AdminPortal/ShareModal.tsx
  const handleCustomMinutesSubmit = () => {
  ```

- [ ] **handleCopyClick** (line 97)
  ```97:97:frontend/src/components/AdminPortal/ShareModal.tsx
  const handleCopyClick = async () => {
  ```

---

## `frontend/src/components/Footer.tsx`

- [ ] **fetchCurrentYear** (line 24)
  ```24:24:frontend/src/components/Footer.tsx
  const fetchCurrentYear = async () => {
  ```

---

## `frontend/src/components/Header.tsx`

- [ ] **checkAuth** (line 79)
  ```79:79:frontend/src/components/Header.tsx
  const checkAuth = async () => {
  ```

- [ ] **handleScroll** (line 99)
  ```99:99:frontend/src/components/Header.tsx
  const handleScroll = () => {
  ```

- [ ] **handleAlbumsHover** (line 117)
  ```117:117:frontend/src/components/Header.tsx
  const handleAlbumsHover = () => {
  ```

- [ ] **handleLinksHover** (line 125)
  ```125:125:frontend/src/components/Header.tsx
  const handleLinksHover = () => {
  ```

- [ ] **handleClickOutside** (line 134)
  ```134:134:frontend/src/components/Header.tsx
  const handleClickOutside = (event: MouseEvent) => {
  ```

- [ ] **handleAlbumsClick** (line 166)
  ```166:166:frontend/src/components/Header.tsx
  const handleAlbumsClick = () => {
  ```

- [ ] **handleLinksClick** (line 178)
  ```178:178:frontend/src/components/Header.tsx
  const handleLinksClick = () => {
  ```

- [ ] **checkAuth** (line 493)
  ```493:493:frontend/src/components/Header.tsx
  const checkAuth = async () => {
  ```

- [ ] **handleLogout** (line 515)
  ```515:515:frontend/src/components/Header.tsx
  const handleLogout = async () => {
  ```

---

## `frontend/src/components/Misc/SEO.tsx`

- [ ] **updateMetaTag** (line 46)
  ```46:46:frontend/src/components/Misc/SEO.tsx
  function updateMetaTag(attribute: string, key: string, content: string) {
  ```

- [ ] **updateCanonicalLink** (line 58)
  ```58:58:frontend/src/components/Misc/SEO.tsx
  function updateCanonicalLink(url: string) {
  ```

---

## `frontend/src/components/PhotoGrid.tsx`

- [ ] **handlePhotoClick** (line 65)
  ```65:65:frontend/src/components/PhotoGrid.tsx
  const handlePhotoClick = (photo: Photo) => {
  ```

- [ ] **handleCloseModal** (line 86)
  ```86:86:frontend/src/components/PhotoGrid.tsx
  const handleCloseModal = () => {
  ```

- [ ] **handleScroll** (line 137)
  ```137:137:frontend/src/components/PhotoGrid.tsx
  const handleScroll = () => {
  ```

- [ ] **fetchPhotos** (line 182)
  ```182:182:frontend/src/components/PhotoGrid.tsx
  const fetchPhotos = async () => {
  ```

- [ ] **handleResize** (line 299)
  ```299:299:frontend/src/components/PhotoGrid.tsx
  const handleResize = () => {
  ```

- [ ] **handleScroll** (line 323)
  ```323:323:frontend/src/components/PhotoGrid.tsx
  const handleScroll = () => {
  ```

---

## `frontend/src/components/PhotoModal/PhotoModal.tsx`

- [ ] **fetchBranding** (line 79)
  ```79:79:frontend/src/components/PhotoModal/PhotoModal.tsx
  const fetchBranding = async () => {
  ```

- [ ] **handleTouchStart** (line 431)
  ```431:431:frontend/src/components/PhotoModal/PhotoModal.tsx
  const handleTouchStart = (e: React.TouchEvent) => {
  ```

- [ ] **handleTouchEnd** (line 436)
  ```436:436:frontend/src/components/PhotoModal/PhotoModal.tsx
  const handleTouchEnd = (e: React.TouchEvent) => {
  ```

- [ ] **handleFullscreenChange** (line 465)
  ```465:465:frontend/src/components/PhotoModal/PhotoModal.tsx
  const handleFullscreenChange = () => {
  ```

- [ ] **handleKeyDown** (line 523)
  ```523:523:frontend/src/components/PhotoModal/PhotoModal.tsx
  const handleKeyDown = (e: KeyboardEvent) => {
  ```

---

## `frontend/src/components/SSEToaster.tsx`

- [ ] **handleToasterDragStart** (line 45)
  ```45:45:frontend/src/components/SSEToaster.tsx
  const handleToasterDragStart = (e: React.MouseEvent) => {
  ```

- [ ] **handleGlobalMouseMove** (line 59)
  ```59:59:frontend/src/components/SSEToaster.tsx
  const handleGlobalMouseMove = (e: MouseEvent) => {
  ```

- [ ] **handleGlobalMouseUp** (line 67)
  ```67:67:frontend/src/components/SSEToaster.tsx
  const handleGlobalMouseUp = () => {
  ```

- [ ] **handleMouseLeave** (line 110)
  ```110:110:frontend/src/components/SSEToaster.tsx
  const handleMouseLeave = () => {
  ```

- [ ] **handleScroll** (line 127)
  ```127:127:frontend/src/components/SSEToaster.tsx
  const handleScroll = () => {
  ```

- [ ] **handleMaximizeClick** (line 163)
  ```163:163:frontend/src/components/SSEToaster.tsx
  const handleMaximizeClick = () => {
  ```

- [ ] **handleCollapseClick** (line 185)
  ```185:185:frontend/src/components/SSEToaster.tsx
  const handleCollapseClick = () => {
  ```

---

## `frontend/src/components/SetupWizard/SetupWizard.tsx`

- [ ] **handleAvatarChange** (line 36)
  ```36:36:frontend/src/components/SetupWizard/SetupWizard.tsx
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  ```

- [ ] **checkSetupStatus** (line 62)
  ```62:62:frontend/src/components/SetupWizard/SetupWizard.tsx
  const checkSetupStatus = async () => {
  ```

- [ ] **handleSubmit** (line 81)
  ```81:81:frontend/src/components/SetupWizard/SetupWizard.tsx
  const handleSubmit = async (e: React.FormEvent) => {
  ```

---

## `frontend/src/components/SharedAlbum.tsx`

- [ ] **validateShareLink** (line 53)
  ```53:53:frontend/src/components/SharedAlbum.tsx
  const validateShareLink = async () => {
  ```

- [ ] **addMessage** (line 102)
  ```102:102:frontend/src/components/SharedAlbum.tsx
  const addMessage = (message: { type: 'success' | 'error'; text: string }) => {
  ```

- [ ] **removeMessage** (line 112)
  ```112:112:frontend/src/components/SharedAlbum.tsx
  const removeMessage = (id: number) => {
  ```

- [ ] **checkExpiration** (line 125)
  ```125:125:frontend/src/components/SharedAlbum.tsx
  const checkExpiration = () => {
  ```

---

## `frontend/src/contexts/SSEToasterContext.tsx`

- [ ] **resetToasterState** (line 87)
  ```87:87:frontend/src/contexts/SSEToasterContext.tsx
  const resetToasterState = () => {
  ```

---

