/**
 * Custom Collision Detection for Drag and Drop
 * Handles complex collision logic for albums, folders, and grids
 */

import { CollisionDetection, rectIntersection, closestCorners, pointerWithin } from '@dnd-kit/core';

/**
 * Custom collision detection that prioritizes grid containers for cross-context drops
 * Returns grid IDs (folder-grid-X or uncategorized-grid) to enable drops into empty folders
 */
export const customCollisionDetection: CollisionDetection = (args) => {
  const activeId = String(args.active?.id || '');
  
  // When dragging an album (not a folder)
  if (activeId && !activeId.startsWith('folder-')) {
    // FIRST: Check for ghost tile collisions using pointerWithin (cursor-based, not rectangle-based)
    // This prevents ghost tiles from activating when the dragged item's rectangle overlaps but cursor doesn't
    const ghostTileContainers = Array.from(args.droppableContainers.values())
      .filter(container => {
        const id = String(container.id);
        return id.startsWith('ghost-');
      });
    
    const ghostTileCollisions = pointerWithin({
      ...args,
      droppableContainers: ghostTileContainers,
    });
    
    // If pointer is over a ghost tile, prioritize it
    if (ghostTileCollisions.length > 0) {
      return ghostTileCollisions;
    }
    
    // SECOND: Check for grid collisions - these are the drop zones for reordering
    const gridContainers = Array.from(args.droppableContainers.values())
      .filter(container => {
        const id = String(container.id);
        return id.startsWith('folder-grid-') || id === 'uncategorized-grid';
      });
    
    const gridCollisions = rectIntersection({
      ...args,
      droppableContainers: gridContainers,
    });
    
    // If we're over a grid, check for album collisions for precise positioning
    if (gridCollisions.length > 0) {
      // Get all album containers EXCEPT the one being dragged (to avoid self-collision)
      const albumContainers = Array.from(args.droppableContainers.values())
        .filter(container => {
          const id = String(container.id);
          const isAlbum = !id.startsWith('folder-') && !id.endsWith('-grid') && !id.startsWith('ghost-');
          const isNotSelf = id !== activeId; // Exclude the dragged album
          return isAlbum && isNotSelf;
        });
      
      // Try to find album collisions for precise positioning
      if (albumContainers.length > 0) {
        const albumCollisions = closestCorners({
          ...args,
          droppableContainers: albumContainers,
        });
        
        // If we found an album collision, use it for positioning
        if (albumCollisions.length > 0) {
          return albumCollisions;
        }
      }
      
      // No album collisions (empty grid or no nearby albums) - return the grid itself
      // This allows dropping into empty folders!
      return gridCollisions;
    }
  }
  
  // For folders being dragged, or default behavior
  // Use pointerWithin for folders for more precise drop targeting
  if (activeId.startsWith('folder-')) {
    return pointerWithin(args);
  }
  
  // Default: use closestCorners for everything else
  return closestCorners(args);
};

