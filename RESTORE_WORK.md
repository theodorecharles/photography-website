# Missing Work to Restore

## 1. Folder Controls on Mobile
- Move publish toggle and delete button below folder name/count on mobile
- Add CSS media query for @media (max-width: 768px)

## 2. SortableContext for Folders  
- Wrap folders list in SortableContext with rectSortingStrategy
- Items: localFolders.map(f => `folder-${f.id}`)

## 3. New Folder Button
- Replace ghost tile with normal button at top right of Folders section
- Button text: "New Folder" with folder icon

## 4. Drag Overlay for Folders
- Show full folder with all albums when dragging
- Not just collapsed view

All drag-and-drop logic is intact. Only UI presentation changes needed.
