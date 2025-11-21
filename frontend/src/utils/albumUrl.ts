/**
 * Utility functions for building album URLs with folder paths
 */

/**
 * Build a URL path for an album, including folder if applicable
 * @param albumName - The name of the album
 * @param folders - Array of folder objects with id and name
 * @param folderId - The folder_id of the album (null if not in a folder)
 * @returns URL path like "/album/FolderName/AlbumName" or "/album/AlbumName"
 */
export function buildAlbumUrl(
  albumName: string,
  folders: Array<{ id: number; name: string }>,
  folderId: number | null | undefined
): string {
  // If album is not in a folder, use simple path
  if (!folderId) {
    return `/album/${encodeURIComponent(albumName)}`;
  }

  // Find the folder name
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) {
    // Folder not found, fall back to simple path
    return `/album/${encodeURIComponent(albumName)}`;
  }

  // Build path with folder: /album/FolderName/AlbumName
  return `/album/${encodeURIComponent(folder.name)}/${encodeURIComponent(albumName)}`;
}

/**
 * Parse an album URL path to extract folder and album names
 * Handles both formats:
 * - /album/AlbumName (no folder)
 * - /album/FolderName/AlbumName (with folder)
 * @param path - The URL path (e.g., "/album/Wedding/Videos")
 * @returns Object with folderName and albumName (folderName is null if no folder)
 */
export function parseAlbumUrl(path: string): {
  folderName: string | null;
  albumName: string;
} {
  // Remove leading/trailing slashes and split
  const parts = path.replace(/^\/+|\/+$/g, '').split('/');

  // Expected format: ["album", "FolderName", "AlbumName"] or ["album", "AlbumName"]
  if (parts.length === 3 && parts[0] === 'album') {
    // Has folder: /album/FolderName/AlbumName
    return {
      folderName: decodeURIComponent(parts[1]),
      albumName: decodeURIComponent(parts[2]),
    };
  } else if (parts.length === 2 && parts[0] === 'album') {
    // No folder: /album/AlbumName
    return {
      folderName: null,
      albumName: decodeURIComponent(parts[1]),
    };
  }

  // Fallback: treat as album name without folder
  return {
    folderName: null,
    albumName: decodeURIComponent(parts[parts.length - 1] || ''),
  };
}

