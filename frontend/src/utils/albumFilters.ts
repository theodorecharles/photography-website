/**
 * Album and Folder Filtering Utilities
 * Centralizes the logic for filtering albums and folders based on authentication
 * and published status. This eliminates duplication across App.tsx.
 */

interface Album {
  name: string;
  published: boolean | number; // SQLite returns 1/0 for booleans
  folder_id?: number | null;
}

interface Folder {
  id: number;
  name: string;
  published: boolean | number;
}

/**
 * Filters albums based on authentication status
 * - Always excludes 'homepage' album
 * - Shows all albums to authenticated users
 * - Shows only published albums to unauthenticated users
 */
export const filterAlbums = (
  albums: Album[],
  isAuthenticated: boolean
): Album[] => {
  return albums.filter((album) => {
    // Always exclude homepage album from navigation
    if (album.name === 'homepage') return false;
    
    // Show all albums to authenticated users
    if (isAuthenticated) return true;
    
    // Only show published albums to public
    // Note: SQLite returns boolean as 1/0, so we check for both true and 1
    return album.published === true || album.published === 1;
  });
};

/**
 * Filters folders based on authentication status
 * - Shows all folders to authenticated users
 * - Shows only published folders to unauthenticated users
 * 
 * Note: SQLite returns boolean as 1/0, so we check for both true and 1
 */
export const filterFolders = (
  folders: Folder[],
  isAuthenticated: boolean
): Folder[] => {
  // Show all folders to authenticated users
  if (isAuthenticated) return folders;
  
  // Only show published folders to public
  return folders.filter((folder) => 
    folder.published === true || folder.published === 1
  );
};

/**
 * Processes raw album data from API into filtered albums and folders
 * Handles both old format (array of strings/objects) and new format (object with albums/folders)
 */
export const processAlbumData = (
  albumsData: any,
  isAuthenticated: boolean
): { albums: Album[]; folders: Folder[] } => {
  // Handle new API format: { albums: [...], folders: [...] }
  if (albumsData && typeof albumsData === 'object' && 'albums' in albumsData) {
    return {
      albums: filterAlbums(albumsData.albums || [], isAuthenticated),
      folders: filterFolders(albumsData.folders || [], isAuthenticated),
    };
  }
  
  // Handle old format (array of strings or objects)
  const albums = Array.isArray(albumsData)
    ? albumsData
        .filter((album: string | Album) => {
          if (typeof album === 'string') return album !== 'homepage';
          if (album.name === 'homepage') return false;
          // Include all albums if authenticated, only published if not
          if (isAuthenticated) return true;
          return album.published === true;
        })
        .map((album: string | Album): Album => {
          if (typeof album === 'string') {
            return { name: album, published: true, folder_id: null };
          }
          return album;
        })
    : [];

  return {
    albums,
    folders: [],
  };
};

