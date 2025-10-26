/**
 * Main application component for the photography website.
 * This component handles the routing and layout of the entire application.
 */

import { useState, useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useParams,
  useLocation,
} from "react-router-dom";
import "./App.css";
import PhotoGrid from "./components/PhotoGrid";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import { SEO } from "./components/SEO";
import { StructuredData } from "./components/StructuredData";
import { API_URL, SITE_URL } from "./config";
import { trackPageView, trackAlbumNavigation, trackExternalLinkClick, trackError, trackDropdownOpen, trackDropdownClose } from "./utils/analytics";
import { fetchWithRateLimitCheck } from "./utils/fetchWrapper";

// Lazy load components that aren't needed on initial page load
const License = lazy(() => import("./components/License"));
const AdminPortal = lazy(() => import("./components/AdminPortal"));
const AuthError = lazy(() => import("./components/AuthError"));
const NotFound = lazy(() => import("./components/NotFound"));

// ExternalLink interface defines the structure for external navigation links
interface ExternalLink {
  title: string;
  url: string;
}

// AlbumRoute component handles the routing for individual album pages
function AlbumRoute() {
  const { album } = useParams();
  const albumTitle = album ? album.charAt(0).toUpperCase() + album.slice(1) : "";
  
  return (
    <>
      <SEO 
        title={`${albumTitle} - Ted Charles Photography`}
        description={`View ${albumTitle} photos from Ted Charles' photography portfolio. Professional ${album} photography.`}
        url={`${SITE_URL}/album/${album}`}
        image={`${SITE_URL}/photos/derpatar.png`}
      />
      <PhotoGrid album={album || ""} />
    </>
  );
}

// PrimesRedirect component forces a full page load to the primes static page
function PrimesRedirect() {
  useEffect(() => {
    // Force a full page reload to the primes page
    window.location.replace("/primes/");
  }, []);
  return <div className="loading">Loading benchmark...</div>;
}

/**
 * Navigation component handles the main navigation menu including:
 * - Albums dropdown
 * - External links dropdown
 * - Mobile menu
 *
 * @param albums - List of available photo albums
 * @param externalLinks - List of external navigation links
 * @param isMenuOpen - State of the mobile menu
 * @param setIsMenuOpen - Function to toggle mobile menu state
 * @param currentAlbum - Currently selected album
 */
function Navigation({
  albums,
  externalLinks,
  isMenuOpen,
  setIsMenuOpen,
  currentAlbum,
}: {
  albums: string[];
  externalLinks: ExternalLink[];
  isMenuOpen: boolean;
  setIsMenuOpen: (value: boolean) => void;
  currentAlbum?: string;
}) {
  // State for managing dropdown visibility
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExternalOpen, setIsExternalOpen] = useState(false);

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

  // Handle mouse leave events for both dropdowns
  const handleDropdownLeave = () => {
    // Use a small delay to allow mouse to move into the dropdown menu
    setTimeout(() => {
      // Check if mouse is still not over any dropdown-related elements
      const dropdowns = document.querySelectorAll('.dropdown-container');
      let mouseOverDropdown = false;
      
      dropdowns.forEach((dropdown) => {
        if (dropdown.matches(':hover')) {
          mouseOverDropdown = true;
        }
      });
      
      if (!mouseOverDropdown) {
        setIsDropdownOpen(false);
        setIsExternalOpen(false);
      }
    }, 100);
  };

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
            {currentAlbum.charAt(0).toUpperCase() + currentAlbum.slice(1)}
          </h1>
        </div>
      )}
      <nav className="album-nav">
        {/* Left side navigation - Albums dropdown */}
        <div className="nav-left">
          <div
            className="dropdown-container"
            onMouseEnter={handleAlbumsHover}
            onMouseLeave={handleDropdownLeave}
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
                  {album.charAt(0).toUpperCase() + album.slice(1)}
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
            onMouseLeave={handleDropdownLeave}
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
                  target="_blank"
                  rel="noopener noreferrer"
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
        </div>
      </nav>
      {/* Mobile menu dropdown */}
      <div
        className={`dropdown-container mobile-dropdown ${
          isMenuOpen ? "active" : ""
        }`}
      >
        <div className={`dropdown-menu ${isMenuOpen ? "open" : ""}`}>
          <div className="mobile-section">
            {albums.map((album) => (
              <Link
                key={album}
                to={`/album/${album}`}
                className="nav-link"
                onClick={() => {
                  setIsMenuOpen(false);
                  trackAlbumNavigation(album, 'mobile_menu');
                }}
              >
                {album.charAt(0).toUpperCase() + album.slice(1)}
              </Link>
            ))}
          </div>
          <div className="mobile-section">
            {externalLinks.map((link) => (
              <a
                key={link.title}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link external"
                onClick={() => {
                  setIsMenuOpen(false);
                  trackExternalLinkClick(link.title, link.url, 'mobile_menu');
                }}
              >
                {link.title}
                <svg
                  className="external-icon"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                >
                  <path
                    d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15 3h6v6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 14L21 3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Main App component that:
 * - Manages application state
 * - Handles data fetching
 * - Sets up routing
 * - Renders the main layout
 */
function App() {
  // Application state
  const [albums, setAlbums] = useState<string[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);
  const [siteName, setSiteName] = useState('Ted Charles');
  const [avatarPath, setAvatarPath] = useState('/photos/derpatar.png');
  const [avatarCacheBust, setAvatarCacheBust] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentAlbum, setCurrentAlbum] = useState<string | undefined>(
    undefined
  );
  const [showFooter, setShowFooter] = useState(false);
  const location = useLocation();

  // Global rate limit handler - any component can trigger this
  useEffect(() => {
    (window as any).handleRateLimit = () => {
      setError("RATE_LIMIT");
      setLoading(false);
    };

    return () => {
      delete (window as any).handleRateLimit;
    };
  }, []);

  // Show footer when user scrolls down
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Show footer if scrolled down at least 200px or near bottom of page
      if (scrollPosition > 200 || scrollPosition + windowHeight > documentHeight - 100) {
        setShowFooter(true);
      } else {
        setShowFooter(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Check initial scroll position
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Update current album based on route changes and track page views
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/album/")) {
      // Extract album name, handling trailing slashes and removing any extra path segments
      const albumName = path.split("/album/")[1].split("/")[0].split("?")[0].trim();
      // Only set if album name is not empty
      if (albumName) {
        setCurrentAlbum(albumName);
        trackPageView(path, `${albumName.charAt(0).toUpperCase() + albumName.slice(1)} - Album`);
      } else {
        setCurrentAlbum(undefined);
        trackPageView(path);
      }
    } else if (path === "/") {
      setCurrentAlbum(undefined);
      trackPageView(path, "Homepage");
    } else if (path === "/license") {
      setCurrentAlbum(undefined);
      trackPageView(path, "License");
    } else {
      setCurrentAlbum(undefined);
      trackPageView(path);
    }
  }, [location]);

  // Handle clicks outside the mobile menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const mobileMenu = document.querySelector(".mobile-menu");
      const hamburgerMenu = document.querySelector(".hamburger-menu");

      if (
        isMenuOpen &&
        mobileMenu &&
        !mobileMenu.contains(event.target as Node) &&
        !hamburgerMenu?.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Handle scroll to close mobile menu
  useEffect(() => {
    const handleScroll = () => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMenuOpen]);

  // Fetch albums, external links, and branding data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [albumsResponse, externalLinksResponse, brandingResponse] = await Promise.all([
        fetchWithRateLimitCheck(`${API_URL}/api/albums`),
        fetchWithRateLimitCheck(`${API_URL}/api/external-pages`),
        fetchWithRateLimitCheck(`${API_URL}/api/branding`),
      ]);

      if (!albumsResponse.ok) {
        throw new Error("Failed to fetch albums");
      }
      if (!externalLinksResponse.ok) {
        throw new Error("Failed to fetch external links");
      }
      if (!brandingResponse.ok) {
        throw new Error("Failed to fetch branding");
      }

      const albumsData = await albumsResponse.json();
      const externalLinksData = await externalLinksResponse.json();
      const brandingData = await brandingResponse.json();

      setAlbums(albumsData.filter((album: string) => album !== "homepage"));
      setExternalLinks(externalLinksData.externalLinks);
      setSiteName(brandingData.siteName || 'Ted Charles');
      setAvatarPath(brandingData.avatarPath || '/photos/derpatar.png');
      setAvatarCacheBust(Date.now()); // Update cache bust when branding refreshes
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      
      // Don't set error state if it's a rate limit (already handled globally)
      if (errorMessage === 'Rate limited') {
        return;
      }
      
      setError(errorMessage);
      setAlbums([]);
      setExternalLinks([]);
      setSiteName('Ted Charles');
      setAvatarPath('/photos/derpatar.png');
      trackError(errorMessage, 'app_initialization');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for admin changes to refresh navigation
    const handleNavigationUpdate = () => {
      fetchData();
    };

    window.addEventListener('albums-updated', handleNavigationUpdate);
    window.addEventListener('external-links-updated', handleNavigationUpdate);
    window.addEventListener('branding-updated', handleNavigationUpdate);

    // Handle window resize for mobile menu
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener('albums-updated', handleNavigationUpdate);
      window.removeEventListener('external-links-updated', handleNavigationUpdate);
      window.removeEventListener('branding-updated', handleNavigationUpdate);
    };
  }, []);

  // Loading and error states
  if (loading) {
    return <div className="loading">Loading albums...</div>;
  }

  if (error) {
    if (error === "RATE_LIMIT") {
      return (
        <div className="error rate-limit-error">
          <div className="rate-limit-icon">🤠</div>
          <h2>Whoa there, partner!</h2>
          <p>Slow down there, feller. You're clicking faster than a tumbleweed in a tornado!</p>
          <p>Give it a moment and try again.</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Try Again
          </button>
        </div>
      );
    }
    return <div className="error">Error: {error}</div>;
  }

  // Main application layout
  return (
    <div className="app">
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
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          currentAlbum={currentAlbum}
        />
      </header>

      <main className="main-content">
        {currentAlbum && currentAlbum.length > 0 && (
          <h1 className="main-content-title">
            {currentAlbum.charAt(0).toUpperCase() + currentAlbum.slice(1)}
          </h1>
        )}
        <StructuredData />
        <Suspense fallback={<div className="loading">Loading...</div>}>
          <Routes>
            <Route path="/" element={
              <>
                <SEO />
                <PhotoGrid album="homepage" />
              </>
            } />
            <Route path="/album/:album" element={<AlbumRoute />} />
            <Route path="/license" element={
              <>
                <SEO 
                  title="License - Ted Charles Photography"
                  description="License information for Ted Charles' photography. All photos are licensed under Creative Commons Attribution 4.0 International License."
                  url={`${SITE_URL}/license`}
                />
                <License />
              </>
            } />
            <Route path="/admin" element={<AdminPortal />} />
            <Route path="/admin/albums" element={<AdminPortal />} />
            <Route path="/admin/links" element={<AdminPortal />} />
            <Route path="/admin/branding" element={<AdminPortal />} />
            <Route path="/admin/metrics" element={<AdminPortal />} />
            <Route path="/auth/error" element={
              <>
                <SEO 
                  title="Authentication Error - Ted Charles Photography"
                  description="Login error"
                  url={`${SITE_URL}/auth/error`}
                />
                <AuthError />
              </>
            } />
            <Route path="/primes" element={<PrimesRedirect />} />
            <Route path="/primes/*" element={<PrimesRedirect />} />
            <Route path="*" element={
              <>
                <SEO 
                  title="404 - Page Not Found - Ted Charles Photography"
                  description="The page you're looking for doesn't exist."
                  url={`${SITE_URL}${location.pathname}`}
                />
                <NotFound />
              </>
            } />
          </Routes>
        </Suspense>
      </main>
      <div className={`footer-wrapper ${showFooter ? 'visible' : ''}`}>
        <Footer
          albums={albums}
          externalLinks={externalLinks}
          currentAlbum={
            location.pathname === "/"
              ? "homepage"
              : location.pathname.startsWith("/album/")
              ? location.pathname.split("/album/")[1].split("/")[0].split("?")[0].trim() || undefined
              : undefined
          }
        />
      </div>
    </div>
  );
}

/**
 * AppWrapper component that:
 * - Sets up the router
 * - Includes ScrollToTop component
 * - Renders the main App component
 */
function AppWrapper() {
  return (
    <Router>
      <ScrollToTop />
      <App />
    </Router>
  );
}

export default AppWrapper;
