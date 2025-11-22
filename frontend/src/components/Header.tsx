/**
 * Header component that contains the site branding and navigation.
 * Includes:
 * - Avatar and site name (branding)
 * - Albums dropdown
 * - Links dropdown
 * - Current album title display
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Header.css";
import { API_URL } from "../config";
import {
  trackAlbumNavigation,
  trackExternalLinkClick,
  trackDropdownOpen,
  trackDropdownClose
} from "../utils/analytics";
import {
  EditIcon,
  DropdownArrowIcon,
  LockIcon,
  ChevronRightIcon,
  LogoutIcon
} from "./icons/";
import { error } from '../utils/logger';

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
  const { t } = useTranslation();
  // State for managing dropdown visibility
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExternalOpen, setIsExternalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [openFolderId, setOpenFolderId] = useState<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const navigationAttemptRef = useRef<string | null>(null);
  
  // Close dropdown when location changes (after navigation completes)
  useEffect(() => {
    // Check if we were trying to navigate somewhere
    if (navigationAttemptRef.current && location.pathname === navigationAttemptRef.current) {
      console.log('[Header] Navigation completed successfully to:', location.pathname);
      navigationAttemptRef.current = null;
    }
    setIsDropdownOpen(false);
    setOpenFolderId(null);
  }, [location.pathname]);
  
  // Check if user is authenticated and get their role
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/status`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(data.authenticated === true);
          setUserRole(data.user?.role || null);
        } else {
          setIsAuthenticated(false);
          setUserRole(null);
        }
      } catch {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    };
    checkAuth();
    
    // Listen for logout events to immediately update auth state
    const handleLogoutEvent = () => {
      setIsAuthenticated(false);
      setUserRole(null);
    };
    window.addEventListener('user-logged-out', handleLogoutEvent);
    
    return () => {
      window.removeEventListener('user-logged-out', handleLogoutEvent);
    };
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
      const target = event.target as Node;
      const dropdownContainers = document.querySelectorAll('.dropdown-container');
      let clickedInside = false;
      
      dropdownContainers.forEach((container) => {
        // Check if click is inside the container OR inside any dropdown menu
        if (container.contains(target)) {
          clickedInside = true;
        }
        // Also check dropdown menus specifically
        const dropdownMenu = container.querySelector('.dropdown-menu');
        if (dropdownMenu && dropdownMenu.contains(target)) {
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

    // Use mousedown on document (capture phase) to catch clicks before they reach buttons
    if (isDropdownOpen || isExternalOpen) {
      // Use capture phase to check before the click reaches the button
      document.addEventListener('mousedown', handleClickOutside, true);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
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
      const hasFolderAlbums = folders.some(folder => {
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
      
      // Also check if there are uncategorized albums
      const hasUncategorizedAlbums = albums.some(album => {
        const albumObj = typeof album === 'string' ? { name: album, folder_id: null } : album;
        if (albumObj.folder_id) return false; // Skip albums in folders
        if (!isAuthenticated) {
          const isPublished = typeof album === 'string' ? true : (album.published === true || album.published === 1);
          return isPublished;
        }
        return true;
      });
      
      return hasFolderAlbums || hasUncategorizedAlbums;
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
          {/* Edit Album button - only shown for admins and managers */}
          {isAuthenticated && (userRole === 'admin' || userRole === 'manager') && currentAlbum !== 'homepage' && (
            <button
              onClick={() => {
                navigate(`/admin/albums?album=${encodeURIComponent(currentAlbum)}`);
              }}
                              className="edit-album-btn"
              title={t('header.editAlbum')}
            >
              <EditIcon width="16" height="16" />
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
              {t('header.albums')}
              <DropdownArrowIcon 
                className={`dropdown-arrow ${isDropdownOpen ? "open" : ""}`}
                width="16"
                height="16"
              />
            </button>
            <div className={`dropdown-menu ${isDropdownOpen ? "open" : ""}`}>
              {folders && folders.length > 0 ? (
                <>
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
                    
                    // Don't show empty folders in the dropdown
                    if (folderAlbums.length === 0) {
                      return null;
                    }
                    
                    const isFolderPublished = folder.published === true || folder.published === 1;
                    
                    // Show only non-empty folders
                    return (
                      <div key={folder.id} className="folder-item">
                        <button
                          className={`nav-link folder-link ${openFolderId === folder.id ? 'open' : ''}`}
                          onClick={() => setOpenFolderId(openFolderId === folder.id ? null : folder.id)}
                        >
                          {!isFolderPublished && isAuthenticated ? (
                            // Lock icon for unpublished folders
                            <LockIcon 
                              width="14"
                              height="14"
                              style={{ opacity: 0.6 }}
                            />
                          ) : (
                            // Chevron for published folders
                            <ChevronRightIcon 
                              className={`folder-chevron ${openFolderId === folder.id ? "open" : ""}`}
                              width="14"
                              height="14"
                            />
                          )}
                          <span>{folder.name}</span>
                        </button>
                        {openFolderId === folder.id && (
                          <div className="folder-submenu">
                            {folderAlbums.length > 0 ? (
                              folderAlbums.map(album => {
                                const albumName = typeof album === 'string' ? album : album.name;
                                const isPublished = typeof album === 'string' ? true : (album.published === true || album.published === 1);
                                return (
                                  <button
                                    key={albumName}
                                    type="button"
                                    className="nav-link submenu-link"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const path = `/album/${encodeURIComponent(albumName)}`;
                                      trackAlbumNavigation(albumName, 'header');
                                      trackDropdownClose('albums', 'navigation');
                                      setIsDropdownOpen(false);
                                      setOpenFolderId(null);
                                      navigate(path, { replace: false });
                                    }}
                                  >
                                    {!isPublished && (
                                      <LockIcon 
                                        width="14"
                                        height="14"
                                        style={{ marginRight: '6px', opacity: 0.6, flexShrink: 0 }}
                                      />
                                    )}
                                    <span>{albumName}</span>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="nav-link submenu-link" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                                {t('header.noAlbumsInFolder')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Uncategorized albums (after folders) */}
                  {albums.filter(album => {
                    const albumObj = typeof album === 'string' ? { name: album, folder_id: null } : album;
                    return !albumObj.folder_id;
                  }).map(album => {
                    const albumName = typeof album === 'string' ? album : album.name;
                    const isPublished = typeof album === 'string' ? true : (album.published === true || album.published === 1);
                    return (
                      <button
                        key={albumName}
                        type="button"
                        className="nav-link"
                        onMouseDown={(e) => {
                          // Use onMouseDown to fire before click-outside handler
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('[Header] Button mousedown:', albumName);
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('[Header] Button clicked:', albumName);
                          const path = `/album/${encodeURIComponent(albumName)}`;
                          trackAlbumNavigation(albumName, 'header');
                          trackDropdownClose('albums', 'navigation');
                          // Close dropdown first, then navigate
                          setIsDropdownOpen(false);
                          // Force navigation with multiple strategies
                          console.log('[Header] Navigating to:', path);
                          console.log('[Header] Current location.pathname:', location.pathname);
                          navigate(path, { replace: false });
                          console.log('[Header] navigate() called');
                          // Double-check: if URL didn't update after 50ms, force it via history API
                          setTimeout(() => {
                            const currentUrl = window.location.pathname;
                            console.log('[Header] After 50ms, URL is:', currentUrl);
                            console.log('[Header] React Router location.pathname:', location.pathname);
                            if (currentUrl !== path) {
                              console.log('[Header] URL mismatch - forcing via history API');
                              // Update URL directly and dispatch popstate to trigger React Router
                              window.history.pushState({}, '', path);
                              window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
                            } else if (currentUrl === path && location.pathname !== path) {
                              console.log('[Header] URL updated but React Router location didn\'t - forcing sync');
                              // URL updated but React Router didn't - force it
                              window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
                            }
                          }, 50);
                        }}
                      >
                        {!isPublished && (
                          <LockIcon 
                            width="14"
                            height="14"
                            style={{ marginRight: '6px', opacity: 0.6, flexShrink: 0 }}
                          />
                        )}
                        <span>{albumName}</span>
                      </button>
                    );
                  })}
                </>
              ) : (
                // No folders - show flat list
                albums.map(album => {
                  const albumName = typeof album === 'string' ? album : album.name;
                  const isPublished = typeof album === 'string' ? true : (album.published === true || album.published === 1);
                  return (
                    <button
                      key={albumName}
                      type="button"
                      className="nav-link"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const path = `/album/${encodeURIComponent(albumName)}`;
                          trackAlbumNavigation(albumName, 'header');
                          trackDropdownClose('albums', 'navigation');
                          setIsDropdownOpen(false);
                          navigate(path, { replace: false });
                        }}
                    >
                      {!isPublished && (
                        <LockIcon 
                          width="14"
                          height="14"
                          style={{ marginRight: '6px', opacity: 0.6, flexShrink: 0 }}
                        />
                      )}
                      <span>{albumName}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
        )}

        {/* Right side navigation - External links dropdown and edit button */}
        {(hasLinksToShow || (isAuthenticated && userRole === 'admin')) && (
        <div className="nav-right">
          {hasLinksToShow && (
          <div
            className="dropdown-container"
            onMouseEnter={handleLinksHover}
          >
            <button className="nav-link" onClick={handleLinksClick}>
              {t('header.links')}
              <DropdownArrowIcon 
                className={`dropdown-arrow ${isExternalOpen ? "open" : ""}`}
                width="16"
                height="16"
              />
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
          )}
          
          {/* Edit Links button - only shown for admins (links are in settings) */}
          {isAuthenticated && userRole === 'admin' && (
            <Link
              to="/admin/settings?section=links"
              className="edit-album-btn"
              title={t('header.editLinks')}
            >
              <EditIcon width="16" height="16" />
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
  console.log('[PERF] Header rendering at', performance.now(), 'ms with', albums.length, 'albums and', externalLinks.length, 'links');
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const hasLoadedOnce = useRef(false);

  // Track when avatar loads for the first time
  const handleAvatarLoad = () => {
    setAvatarLoaded(true);
    hasLoadedOnce.current = true;
  };

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
      // Immediately update auth state (synchronous)
      setIsAuthenticated(false);
      window.dispatchEvent(new Event('user-logged-out'));
      // Make logout API call
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      // Navigate home
      navigate('/');
    } catch (err) {
      error('Logout failed:', err);
    }
  };

  return (
    <header className={`header ${hasLoadedOnce.current || avatarLoaded ? 'header-visible' : ''}`}>
      <div className="header-left">
        {/* Logout button - only shown when authenticated and NOT in admin panel */}
        {isAuthenticated && !isInAdminPanel && (
          <button
            onClick={handleLogout}
            className="logout-btn"
            title={t('header.logout')}
          >
            <LogoutIcon width="20" height="20" />
          </button>
        )}
        <Link to="/">
          <img
            src={`${API_URL}${avatarPath}?v=${avatarCacheBust}`}
            alt={siteName}
            className="avatar"
            onLoad={handleAvatarLoad}
            onError={handleAvatarLoad} // Show even on error to avoid permanent blank
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

