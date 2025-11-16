/**
 * Drag and Drop Helper Utilities
 * Helper functions for touch scroll prevention and drag state management
 */

/**
 * Disables touch scrolling during drag operations
 * Prevents unwanted page scrolling on mobile devices
 */
export const disableTouchScroll = (): void => {
  document.body.style.overflow = 'hidden';
  document.body.style.touchAction = 'none';
  document.documentElement.style.overflow = 'hidden';
};

/**
 * Re-enables touch scrolling after drag operations
 */
export const enableTouchScroll = (): void => {
  document.body.style.overflow = '';
  document.body.style.touchAction = '';
  document.documentElement.style.overflow = '';
};

/**
 * Checks if a drag event is dragging a folder
 */
export const isDraggingFolder = (activeId: string): boolean => {
  return activeId.startsWith('folder-');
};

/**
 * Checks if a drag event is dragging an album
 */
export const isDraggingAlbum = (activeId: string): boolean => {
  return !activeId.startsWith('folder-') && !activeId.endsWith('-grid');
};

/**
 * Extracts folder ID from a drag event ID
 * @returns folder ID or null if not a folder
 */
export const extractFolderId = (id: string): number | null => {
  if (!id.startsWith('folder-')) return null;
  const numericId = parseInt(id.replace('folder-', '').replace('-grid', ''));
  return isNaN(numericId) ? null : numericId;
};

/**
 * Checks if a droppable ID is a grid container
 */
export const isGridContainer = (id: string): boolean => {
  return id.endsWith('-grid') || id === 'uncategorized-grid';
};

/**
 * Determines if two rectangles overlap
 * Used for custom collision detection
 */
export const doRectsOverlap = (
  rect1: DOMRect,
  rect2: DOMRect,
  threshold: number = 0
): boolean => {
  return !(
    rect1.right < rect2.left - threshold ||
    rect1.left > rect2.right + threshold ||
    rect1.bottom < rect2.top - threshold ||
    rect1.top > rect2.bottom + threshold
  );
};

/**
 * Calculates the center point of a DOMRect
 */
export const getRectCenter = (rect: DOMRect): { x: number; y: number } => {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
};

/**
 * Checks if a point is inside a rectangle
 */
export const isPointInRect = (
  point: { x: number; y: number },
  rect: DOMRect
): boolean => {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
};

/**
 * Gets the final position of a dragged element after delta is applied
 */
export const getFinalPosition = (
  element: Element,
  delta: { x: number; y: number }
): { x: number; y: number } => {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + delta.x + rect.width / 2,
    y: rect.top + delta.y + rect.height / 2,
  };
};

