/**
 * Header component that contains the site branding and navigation.
 * Includes:
 * - Avatar and site name (branding)
 * - Albums dropdown
 * - Links dropdown
 * - Current album title display
 */

import { useState, useEffect } from "react";
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

interface HeaderProps {
  albums: string[];
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
  externalLinks,
  currentAlbum,
}: {
  albums: string[];
  externalLinks: ExternalLink[];
  currentAlbum?: string;
}) {
  // State for managing dropdown visibility
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExternalOpen, setIsExternalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/status`, {
          credentials: 'include',
        });
        setIsAuthenticated(res.ok);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

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
                const urlParams = new URLSearchParams(location.search);
                const hasEditParam = urlParams.get('edit') === 'true';
                
                if (hasEditParam) {
                  // Remove edit parameter
                  urlParams.delete('edit');
                } else {
                  // Add edit parameter
                  urlParams.set('edit', 'true');
                }
                
                const newSearch = urlParams.toString();
                navigate({
                  pathname: location.pathname,
                  search: newSearch ? `?${newSearch}` : '',
                });
              }}
              className="edit-album-btn"
              title={location.search.includes('edit=true') ? "Close edit mode" : "Edit this album"}
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
              {albums.map((album) => (
                <Link
                  key={album}
                  to={`/album/${album}`}
                  className="nav-link"
                  onClick={() => {
                    trackDropdownClose('albums', 'navigation');
                    setIsDropdownOpen(false);
                    trackAlbumNavigation(album, 'header');
                  }}
                >
                  {album}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right side navigation - External links dropdown */}
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
      </nav>
    </>
  );
}

/**
 * Header component that displays branding and navigation
 */
export default function Header({
  albums,
  externalLinks,
  currentAlbum,
  siteName,
  avatarPath,
  avatarCacheBust,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
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
        externalLinks={externalLinks}
        currentAlbum={currentAlbum}
      />
    </header>
  );
}

