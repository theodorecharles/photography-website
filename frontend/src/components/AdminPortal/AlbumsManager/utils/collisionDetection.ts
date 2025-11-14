/**
 * Custom Collision Detection for Drag and Drop
 * Handles complex collision logic for albums, folders, and grids
 */

import { CollisionDetection, rectIntersection, closestCorners, pointerWithin } from '@dnd-kit/core';

/**
 * Custom collision detection that prioritizes album-to-album collisions within grids
 * Uses closestCorners for better gap detection in grid layouts
 */
export const customCollisionDetection: CollisionDetection = (args) => {
  const activeId = String(args.active?.id || '');
  
  // When dragging an album (not a folder)
  if (activeId && !activeId.startsWith('folder-')) {
    // First, check for grid collisions to see if we're over a specific folder/uncategorized area
    const gridContainers = Array.from(args.droppableContainers.values())
      .filter(container => {
        const id = String(container.id);
        return id.startsWith('folder-grid-') || id === 'uncategorized-grid';
      });
    
    const gridCollisions = rectIntersection({
      ...args,
      droppableContainers: gridContainers,
    });
    
    // If we're over a grid, check for album collisions WITHIN that grid only
    if (gridCollisions.length > 0) {
      const gridId = String(gridCollisions[0].id);
      
      // Only get album collisions from droppable containers (albums only)
      const albumContainers = Array.from(args.droppableContainers.values())
        .filter(container => {
          const id = String(container.id);
          return !id.startsWith('folder-') && !id.endsWith('-grid');
        });
      
      // If there are no albums at all in droppable containers, use the grid
      if (albumContainers.length === 0) {
        return gridCollisions;
      }
      
      // Filter albums to ONLY those in the current grid
      let albumsInGrid;
      if (gridId === 'uncategorized-grid') {
        // For uncategorized grid, include albums without a folder
        albumsInGrid = albumContainers.filter(_container => {
          // const id = String(container.id); // unused for now
          // Check if this album is in the uncategorized section
          // (This would need to be determined by the album's folder_id)
          return true; // Simplified - in real implementation, check folder_id
        });
      } else {
        // For folder grids, only include albums in that specific folder
        // const folderId = gridId.replace('folder-grid-', ''); // unused for now
        albumsInGrid = albumContainers.filter(_container => {
          // const id = String(container.id); // unused for now
          // Check if this album belongs to the folder
          // (This would need to be determined by the album's folder_id)
          return true; // Simplified - in real implementation, check folder_id
        });
      }
      
      // If we have albums in this grid, use closestCorners for better positioning
      if (albumsInGrid.length > 0) {
        const albumCollisions = closestCorners({
          ...args,
          droppableContainers: albumsInGrid,
        });
        
        // If we found a collision with an album in this grid, use it
        if (albumCollisions.length > 0) {
          return albumCollisions;
        }
      }
      
      // If no album collision, return the grid itself as the collision target
      return gridCollisions;
    }
    
    // If we're not over any grid, check for folder collisions
    const folderContainers = Array.from(args.droppableContainers.values())
      .filter(container => {
        const id = String(container.id);
        return id.startsWith('folder-') && !id.endsWith('-grid');
      });
    
    const folderCollisions = pointerWithin({
      ...args,
      droppableContainers: folderContainers,
    });
    
    if (folderCollisions.length > 0) {
      return folderCollisions;
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

