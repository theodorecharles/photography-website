/**
 * Header component that contains the site branding and navigation.
 * Includes:
 * - Avatar and site name (branding)
 * - Albums dropdown
 * - Links dropdown
 * - Current album title display
 */

import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Header.css";
import { API_URL } from "../config";
import {
  trackAlbumNavigation,
  trackExternalLinkClick,
  trackDropdownOpen,
  trackDropdownClose
} from "../utils/analytics";

export interface ExternalLink {
  title: string;
  url: string;
}

export interface AlbumFolder {
  id: number;
  name: string;
  published: boolean | number; // SQLite returns 0/1 for booleans
}

export interface AlbumWithFolder {
  name: string;
  folder_id?: number | null;
  published?: boolean | number; // SQLite returns 0/1 for booleans
}

interface HeaderProps {
  albums: string[] | AlbumWithFolder[];
  folders?: AlbumFolder[];
  externalLinks: ExternalLink[];
  currentAlbum?: string;
  siteName: string;
  avatarPath: string;
  avatarCacheBust: number;
}

/**
 * Navigation component handles the dropdown menus for albums and links
 */
function Navigation({
  albums,
  folders,
  externalLinks,
  currentAlbum,
}: {
  albums: string[] | AlbumWithFolder[];
  folders?: AlbumFolder[];
  externalLinks: ExternalLink[];
  currentAlbum?: string;
}) {
  // State for managing dropdown visibility
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExternalOpen, setIsExternalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [openFolderId, setOpenFolderId] = useState<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/status`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(data.authenticated === true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, [location.pathname]); // Re-check when route changes

  // Close dropdowns when page is scrolled
  useEffect(() => {
    const handleScroll = () => {
      if (isDropdownOpen) {
        trackDropdownClose('albums', 'scroll');
      }
      if (isExternalOpen) {
        trackDropdownClose('links', 'scroll');
      }
      setIsDropdownOpen(false);
      setIsExternalOpen(false);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isDropdownOpen, isExternalOpen]);

  // Handle hover events for Albums dropdown
  const handleAlbumsHover = () => {
    if (isExternalOpen) {
      setIsExternalOpen(false);
      setIsDropdownOpen(true);
    }
  };

  // Handle hover events for Links dropdown
  const handleLinksHover = () => {
    if (isDropdownOpen) {
      setIsDropdownOpen(false);
      setIsExternalOpen(true);
    }
  };

  // Handle clicks outside the dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdownContainers = document.querySelectorAll('.dropdown-container');
      let clickedInside = false;
      
      dropdownContainers.forEach((container) => {
        if (container.contains(event.target as Node)) {
          clickedInside = true;
        }
      });
      
      if (!clickedInside) {
        if (isDropdownOpen) {
          trackDropdownClose('albums', 'outside_click');
          setIsDropdownOpen(false);
        }
        if (isExternalOpen) {
          trackDropdownClose('links', 'outside_click');
          setIsExternalOpen(false);
        }
      }
    };

    if (isDropdownOpen || isExternalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isExternalOpen]);

  // Handle click events for Albums dropdown
  const handleAlbumsClick = () => {
    setIsExternalOpen(false);
    const willOpen = !isDropdownOpen;
    setIsDropdownOpen(willOpen);
    if (willOpen) {
      trackDropdownOpen('albums');
    } else {
      trackDropdownClose('albums', 'click');
    }
  };

  // Handle click events for Links dropdown
  const handleLinksClick = () => {
    setIsDropdownOpen(false);
    const willOpen = !isExternalOpen;
    setIsExternalOpen(willOpen);
    if (willOpen) {
      trackDropdownOpen('links');
    } else {
      trackDropdownClose('links', 'click');
    }
  };

  // Calculate if there are any albums/folders to show
  const hasAlbumsToShow = useMemo(() => {
    if (folders && folders.length > 0) {
      // Check if any folder has albums (after filtering for published if not authenticated)
      return folders.some(folder => {
        const folderAlbums = albums.filter(album => {
          const albumObj = typeof album === 'string' ? { name: album, folder_id: null } : album;
          if (albumObj.folder_id !== folder.id) return false;
          if (!isAuthenticated) {
            const isPublished = typeof album === 'string' ? true : (album.published === true || album.published === 1);
            return isPublished;
          }
          return true;
        });
        return folderAlbums.length > 0;
      });
    }
    // No folders, check if there are any albums
    return albums.length > 0;
  }, [albums, folders, isAuthenticated]);

  // Calculate if there are any links to show
  const hasLinksToShow = externalLinks && externalLinks.length > 0;

  return (
    <>
      {/* Album title display in the center of the navigation */}
      {currentAlbum && currentAlbum.length > 0 && (
        <div className="nav-center">
          <h1 className="album-title">
            {currentAlbum}
          </h1>
          {/* Edit Album button - only shown when authenticated and on an album page */}
          {isAuthenticated && currentAlbum !== 'homepage' && (
            <button
              onClick={() => {
                navigate(`/admin/albums?album=${encodeURIComponent(currentAlbum)}`);
              }}
              className="edit-album-btn"
              title="Edit this album"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>
          )}
        </div>
      )}
      <nav className="album-nav">
        {/* Left side navigation - Albums dropdown */}
        {hasAlbumsToShow && (
        <div className="nav-left">
          <div
            className="dropdown-container"
            onMouseEnter={handleAlbumsHover}
          >
            <button className="nav-link" onClick={handleAlbumsClick}>
              Albums
              <svg
                className={`dropdown-arrow ${isDropdownOpen ? "open" : ""}`}
                viewBox="0 0 24 24"
                width="16"
                height="16"
              >
                <path
                  d="M6 9L12 15L18 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className={`dropdown-menu ${isDropdownOpen ? "open" : ""}`}>
              {folders && folders.length > 0 ? (
                <>
                  {/* Albums without folders */}
                  {albums.filter(album => {
                    const albumObj = typeof album === 'string' ? { name: album, folder_id: null } : album;
                    return !albumObj.folder_id;
                  }).map(album => {
                    const albumName = typeof album === 'string' ? album : album.name;
                    const isPublished = typeof album === 'string' ? true : (album.published === true || album.published === 1);
                    return (
                      <Link
                        key={albumName}
                        to={`/album/${albumName}`}
                        className="nav-link"
                        onClick={() => {
                          trackDropdownClose('albums', 'navigation');
                          setIsDropdownOpen(false);
                          trackAlbumNavigation(albumName, 'header');
                        }}
                      >
                        {!isPublished && (
                          <svg
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            style={{ marginRight: '6px', opacity: 0.6 }}
                          >
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        )}
                        {albumName}
                      </Link>
                    );
                  })}
                  
                  {/* Folders with nested albums */}
                  {folders.map(folder => {
                    const folderAlbums = albums.filter(album => {
                      const albumObj = typeof album === 'string' ? { name: album, folder_id: null } : album;
                      // Filter by folder ID
                      if (albumObj.folder_id !== folder.id) return false;
                      // For unauthenticated users, only show published albums
                      if (!isAuthenticated) {
                        const isPublished = typeof album === 'string' ? true : (album.published === true || album.published === 1);
                        return isPublished;
                      }
                      return true;
                    });
                    
                    console.log(`🔍 Header.tsx - Folder "${folder.name}" (published: ${folder.published}):`, {
                      isAuthenticated,
                      totalAlbumsInFolder: albums.filter(a => {
                        const albumObj = typeof a === 'string' ? { folder_id: null } : a;
                        return albumObj.folder_id === folder.id;
                      }).length,
                      filteredAlbumsCount: folderAlbums.length,
                      folderAlbums: folderAlbums.map(a => typeof a === 'string' ? a : `${a.name} (pub: ${a.published})`)
                    });
                    
                    // Don't show empty folders in the dropdown
                    if (folderAlbums.length === 0) {
                      console.log(`🔍 Header.tsx - Hiding folder "${folder.name}" (empty after filtering)`);
                      return null;
                    }
                    
                    const isFolderPublished = folder.published === true || folder.published === 1;
                    
                    // Show only non-empty folders
                    return (
                      <div key={folder.id} className="folder-item">
                        <button
                          className="nav-link folder-link"
                          onClick={() => setOpenFolderId(openFolderId === folder.id ? null : folder.id)}
                        >
                          {!isFolderPublished && isAuthenticated ? (
                            // Lock icon for unpublished folders
                            <svg
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              style={{ marginRight: '6px', opacity: 0.6 }}
                            >
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                          ) : (
                            // Chevron for published folders
                            <svg
                              className={`folder-chevron ${openFolderId === folder.id ? "open" : ""}`}
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              style={{ marginRight: '6px' }}
                            >
                              <path
                                d="M9 18l6-6-6-6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                          {folder.name}
                        </button>
                        {openFolderId === folder.id && (
                          <div className="folder-submenu">
                            {folderAlbums.length > 0 ? (
                              folderAlbums.map(album => {
                                const albumName = typeof album === 'string' ? album : album.name;
                                const isPublished = typeof album === 'string' ? true : (album.published === true || album.published === 1);
                                return (
                                  <Link
                                    key={albumName}
                                    to={`/album/${albumName}`}
                                    className="nav-link submenu-link"
                                    onClick={() => {
                                      trackDropdownClose('albums', 'navigation');
                                      setIsDropdownOpen(false);
                                      setOpenFolderId(null);
                                      trackAlbumNavigation(albumName, 'header');
                                    }}
                                  >
                                    {!isPublished && (
                                      <svg
                                        viewBox="0 0 24 24"
                                        width="14"
                                        height="14"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        style={{ marginRight: '6px', opacity: 0.6 }}
                                      >
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                      </svg>
                                    )}
                                    {albumName}
                                  </Link>
                                );
                              })
                            ) : (
                              <div className="nav-link submenu-link" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                                No albums in this folder
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                // No folders - show flat list
                albums.map(album => {
                  const albumName = typeof album === 'string' ? album : album.name;
                  const isPublished = typeof album === 'string' ? true : (album.published === true || album.published === 1);
                  return (
                    <Link
                      key={albumName}
                      to={`/album/${albumName}`}
                      className="nav-link"
                      onClick={() => {
                        trackDropdownClose('albums', 'navigation');
                        setIsDropdownOpen(false);
                        trackAlbumNavigation(albumName, 'header');
                      }}
                    >
                      {!isPublished && (
                        <svg
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{ marginRight: '6px', opacity: 0.6 }}
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      )}
                      {albumName}
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
        )}

        {/* Right side navigation - External links dropdown */}
        {hasLinksToShow && (
        <div className="nav-right">
          <div
            className="dropdown-container"
            onMouseEnter={handleLinksHover}
          >
            <button className="nav-link" onClick={handleLinksClick}>
              Links
              <svg
                className={`dropdown-arrow ${isExternalOpen ? "open" : ""}`}
                viewBox="0 0 24 24"
                width="16"
                height="16"
              >
                <path
                  d="M6 9L12 15L18 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className={`dropdown-menu ${isExternalOpen ? "open" : ""}`}>
              {externalLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  className="nav-link"
                  onClick={() => {
                    trackDropdownClose('links', 'navigation');
                    trackExternalLinkClick(link.title, link.url, 'header');
                  }}
                >
                  {link.title}
                </a>
              ))}
            </div>
          </div>
          
          {/* Edit Links button - only shown when authenticated */}
          {isAuthenticated && (
            <Link
              to="/admin/settings?section=links"
              className="edit-album-btn"
              title="Edit links"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </Link>
          )}
        </div>
        )}
      </nav>
    </>
  );
}

/**
 * Header component that displays branding and navigation
 */
export default function Header({
  albums,
  folders,
  externalLinks,
  currentAlbum,
  siteName,
  avatarPath,
  avatarCacheBust,
}: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/status`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(data.authenticated === true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, [location.pathname]); // Re-check on route change

  // Check if we're in the admin panel
  const isInAdminPanel = location.pathname.startsWith('/admin');

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setIsAuthenticated(false);
      navigate('/');
      window.location.reload(); // Reload to clear any cached state
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        {/* Logout button - only shown when authenticated and NOT in admin panel */}
        {isAuthenticated && !isInAdminPanel && (
          <button
            onClick={handleLogout}
            className="logout-btn"
            title="Logout"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        )}
        <Link to="/">
          <img
            src={`${API_URL}${avatarPath}?v=${avatarCacheBust}`}
            alt={siteName}
            className="avatar"
          />
          <h1 className="header-title">{siteName}</h1>
        </Link>
      </div>
      <Navigation
        albums={albums}
        folders={folders}
        externalLinks={externalLinks}
        currentAlbum={currentAlbum}
      />
    </header>
  );
}

