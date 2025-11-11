/**
 * Main application component for the photography website.
 * This component handles the routing and layout of the entire application.
 */

import { useState, useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
  useLocation,
} from "react-router-dom";
import "./App.css";
import PhotoGrid from "./components/PhotoGrid";
import Header, { ExternalLink } from "./components/Header";
import Footer from "./components/Footer";
import ScrollToTop from "./components/Misc/ScrollToTop";
import { SEO } from "./components/Misc/SEO";
import { StructuredData } from "./components/Misc/StructuredData";
import { API_URL, SITE_URL } from "./config";
import { trackPageView, trackError } from "./utils/analytics";
import { fetchWithRateLimitCheck } from "./utils/fetchWrapper";

// Lazy load components that aren't needed on initial page load
const License = lazy(() => import("./components/Misc/License"));
const AdminPortal = lazy(() => import("./components/AdminPortal"));
const AuthError = lazy(() => import("./components/Misc/AuthError"));
const NotFound = lazy(() => import("./components/Misc/NotFound"));
const SharedAlbum = lazy(() => import("./components/SharedAlbum"));

// AlbumRoute component handles the routing for individual album pages
function AlbumRoute({ onAlbumNotFound }: { onAlbumNotFound: () => void }) {
  const { album } = useParams();
  // Decode URI-encoded album name
  const decodedAlbum = album ? decodeURIComponent(album) : "";
  
  return (
    <>
      <SEO 
        title={`${decodedAlbum} - Ted Charles Photography`}
        description={`View ${decodedAlbum} photos from Ted Charles' photography portfolio. Professional ${decodedAlbum} photography.`}
        url={`${SITE_URL}/album/${album}`}
        image={`${SITE_URL}/photos/derpatar.png`}
      />
      <PhotoGrid album={decodedAlbum} onAlbumNotFound={onAlbumNotFound} />
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
  const [primaryColor, setPrimaryColor] = useState('#4ade80');
  const [secondaryColor, setSecondaryColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAlbum, setCurrentAlbum] = useState<string | undefined>(
    undefined
  );
  const [showFooter, setShowFooter] = useState(false);
  const [hideAlbumTitle, setHideAlbumTitle] = useState(false);
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

  // Apply theme colors to CSS custom properties
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--secondary-color', secondaryColor);
  }, [primaryColor, secondaryColor]);

  // Show footer after initial content loads
  useEffect(() => {
    // Wait a bit for images to start loading
    const timer = setTimeout(() => {
      setShowFooter(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Update current album based on route changes and track page views
  useEffect(() => {
    const path = location.pathname;
    // Reset hideAlbumTitle when route changes
    setHideAlbumTitle(false);
    
    if (path.startsWith("/album/")) {
      // Extract album name, handling trailing slashes and removing any extra path segments
      const encodedAlbum = path.split("/album/")[1].split("/")[0].split("?")[0].trim();
      // Only set if album name is not empty
      if (encodedAlbum) {
        const albumName = decodeURIComponent(encodedAlbum);
        setCurrentAlbum(albumName);
        trackPageView(path, `${albumName} - Album`);
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

      // Handle both array of strings (for non-authenticated) and array of objects (for authenticated)
      // Only show published albums in the main navigation, even for authenticated users
      const albumNames = Array.isArray(albumsData) 
        ? albumsData
            .filter((album: string | { name: string; published: boolean }) => {
              // If it's a string, include it (legacy behavior)
              if (typeof album === 'string') return true;
              // If it's an object, only include if published
              return album.published === true;
            })
            .map((album: string | { name: string; published: boolean }) => 
              typeof album === 'string' ? album : album.name
            )
            .filter((album: string) => album !== "homepage")
        : [];
      
      setAlbums(albumNames);
      setExternalLinks(externalLinksData.externalLinks);
      setSiteName(brandingData.siteName || 'Ted Charles');
      setAvatarPath(brandingData.avatarPath || '/photos/derpatar.png');
      setPrimaryColor(brandingData.primaryColor || '#4ade80');
      setSecondaryColor(brandingData.secondaryColor || '#3b82f6');
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

    // Silent update for navigation without triggering loading state
    const updateNavigationSilently = async () => {
      try {
        const albumsResponse = await fetchWithRateLimitCheck(`${API_URL}/api/albums`);
        if (albumsResponse.ok) {
          const albumsData = await albumsResponse.json();
          const albumNames = Array.isArray(albumsData) 
            ? albumsData
                .filter((album: string | { name: string; published: boolean }) => {
                  if (typeof album === 'string') return true;
                  return album.published === true;
                })
                .map((album: string | { name: string; published: boolean }) => 
                  typeof album === 'string' ? album : album.name
                )
                .filter((album: string) => album !== "homepage")
            : [];
          setAlbums(albumNames);
        }
      } catch (err) {
        // Silently fail - don't disrupt user experience
        console.error('Failed to update navigation:', err);
      }
    };

    // Listen for admin changes to refresh navigation silently
    window.addEventListener('albums-updated', updateNavigationSilently);
    window.addEventListener('external-links-updated', fetchData);
    window.addEventListener('branding-updated', fetchData);
    
    return () => {
      window.removeEventListener('albums-updated', updateNavigationSilently);
      window.removeEventListener('external-links-updated', fetchData);
      window.removeEventListener('branding-updated', fetchData);
    };
  }, []);

  // Loading and error states
  // Skip loading state for admin routes - they handle their own loading
  if (loading && !location.pathname.startsWith('/admin')) {
    return (
      <div className="photo-grid-loading">
        <div className="loading-spinner"></div>
        <p>Loading albums...</p>
      </div>
    );
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
      <Header
        albums={albums}
        externalLinks={externalLinks}
        currentAlbum={currentAlbum}
        siteName={siteName}
        avatarPath={avatarPath}
        avatarCacheBust={avatarCacheBust}
      />

      <main className="main-content">
        {currentAlbum && currentAlbum.length > 0 && !hideAlbumTitle && (
          <h1 className="main-content-title">
            {currentAlbum}
          </h1>
        )}
        <StructuredData />
        <Suspense fallback={
          <div className="photo-grid-loading">
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        }>
          <Routes>
            <Route path="/" element={
              <>
                <SEO />
                <PhotoGrid album="homepage" />
              </>
            } />
            <Route path="/album/:album" element={<AlbumRoute onAlbumNotFound={() => setHideAlbumTitle(true)} />} />
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
            <Route path="/admin/metrics" element={<AdminPortal />} />
            <Route path="/admin/settings" element={<AdminPortal />} />
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
            <Route path="/shared/:secretKey" element={<SharedAlbum />} />
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
      {!location.pathname.startsWith('/admin') && (
        <div className={`footer-wrapper ${showFooter ? 'visible' : ''}`}>
          <Footer
            albums={albums}
            externalLinks={externalLinks}
          currentAlbum={
            location.pathname === "/"
              ? "homepage"
              : location.pathname.startsWith("/album/")
              ? decodeURIComponent(location.pathname.split("/album/")[1].split("/")[0].split("?")[0].trim()) || undefined
              : undefined
          }
          />
        </div>
      )}
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
