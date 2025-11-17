/**
 * Main application component for the photography website.
 * This component handles the routing and layout of the entire application.
 */

import { useState, useEffect, lazy, Suspense } from "react";
import { useAuth } from "./contexts/AuthContext";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
  useLocation,
  useNavigate,
  Link,
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
import { SSEToasterProvider } from "./contexts/SSEToasterContext";
import { AuthProvider } from "./contexts/AuthContext";
import SSEToaster from "./components/SSEToaster";
import { filterAlbums, filterFolders } from "./utils/albumFilters";

// Import AdminPortal - CSS is handled within the component for dev mode compatibility
import AdminPortal from "./components/AdminPortal";

// Lazy load other components that aren't needed on initial page load
const License = lazy(() => import("./components/Misc/License"));
const AuthError = lazy(() => import("./components/Misc/AuthError"));
import NotFound from "./components/Misc/NotFound";
const SharedAlbum = lazy(() => import("./components/SharedAlbum"));
const SetupWizard = lazy(() => import("./components/SetupWizard"));
const InviteSignup = lazy(() => import("./components/Misc/InviteSignup"));
const PasswordResetRequest = lazy(() => import("./components/Misc/PasswordResetRequest"));
const PasswordResetComplete = lazy(() => import("./components/Misc/PasswordResetComplete"));

// LicenseWrapper component to show footer when license page loads
function LicenseWrapper({ setShowFooter }: { setShowFooter: (show: boolean) => void }) {
  useEffect(() => {
    setShowFooter(true);
  }, [setShowFooter]);

  return (
    <>
      <SEO 
        title="License - Ted Charles Photography"
        description="License information for Ted Charles' photography. All photos are licensed under Creative Commons Attribution 4.0 International License."
        url={`${SITE_URL}/license`}
      />
      <License />
    </>
  );
}

// AlbumRoute component handles the routing for individual album pages
function AlbumRoute({ onAlbumNotFound, onLoadComplete }: { onAlbumNotFound: () => void; onLoadComplete: () => void }) {
  const { album } = useParams();
  // Decode URI-encoded album name
  const decodedAlbum = album ? decodeURIComponent(album) : "";
  
  return (
    <>
      <SEO 
        title={`${decodedAlbum} - Ted Charles Photography`}
        description={`View ${decodedAlbum} photos from Ted Charles' photography portfolio. Professional ${decodedAlbum} photography.`}
        url={`${SITE_URL}/album/${album}`}
        image={`${SITE_URL}/photos/avatar.png`}
      />
      <PhotoGrid 
        album={decodedAlbum} 
        onAlbumNotFound={onAlbumNotFound}
        onLoadComplete={onLoadComplete}
      />
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

// NotFoundRedirect component updates URL to /404 for catch-all routes
function NotFoundRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Only redirect if we're not already at /404
    if (location.pathname !== '/404') {
      navigate('/404', { replace: true });
    }
  }, [navigate, location.pathname]);
  
  return <NotFound />;
}

// RateLimitError component for 429 error page
function RateLimitError() {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Only redirect if we're not already at /429
    if (location.pathname !== '/429') {
      navigate('/429', { replace: true });
    }
  }, [navigate, location.pathname]);
  
  return (
    <div className="error rate-limit-error">
      <div className="rate-limit-icon">🤠</div>
      <h2>Whoa there, partner!</h2>
      <p>Slow down there, feller. You're clicking faster than a tumbleweed in a tornado!</p>
      <p>Give it a moment and try again.</p>
      <div className="not-found-actions">
        <Link to="/" className="home-button">
          Head Back Home
        </Link>
      </div>
    </div>
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
  const [albums, setAlbums] = useState<string[] | Array<{name: string; folder_id?: number | null}>>([]);
  const [folders, setFolders] = useState<Array<{id: number; name: string; published: boolean}>>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);
  const [siteName, setSiteName] = useState('Ted Charles');
  const [avatarPath, setAvatarPath] = useState('/photos/avatar.png');
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
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Check if initial setup is complete
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await fetch(`${API_URL}/api/setup/status`);
        const data = await response.json();
        setSetupComplete(data.setupComplete);
        
        // Only proceed with normal loading if setup is complete
        if (!data.setupComplete) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Setup check failed:', err);
        // Assume setup is complete if check fails (backward compatibility)
        setSetupComplete(true);
      }
    };
    
    checkSetup();
  }, []);

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

  // Hide footer on navigation
  useEffect(() => {
    setShowFooter(false);
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

      // Handle new API format: { albums: [...], folders: [...] } or old format: [...]
      if (albumsData && typeof albumsData === 'object' && 'albums' in albumsData) {
        // New format with folders
        const filteredAlbums = filterAlbums(albumsData.albums || [], isAuthenticated);
        const filteredFolders = filterFolders(albumsData.folders || [], isAuthenticated);
        
        console.log('🔍 App.tsx fetchData - isAuthenticated:', isAuthenticated);
        console.log('🔍 App.tsx fetchData - Raw folders from backend:', albumsData.folders);
        console.log('🔍 App.tsx fetchData - Filtered folders:', filteredFolders);
        console.log('🔍 App.tsx fetchData - Filtered albums:', filteredAlbums);
        
        setAlbums(filteredAlbums);
        // Normalize published field to boolean (SQLite returns 0/1)
        setFolders(filteredFolders.map(f => ({ ...f, published: !!f.published })));
      } else {
        // Old format (array of strings or objects)
      const albumNames = Array.isArray(albumsData) 
        ? albumsData
            .filter((album: string | { name: string; published: boolean }) => {
                if (typeof album === 'string') return album !== 'homepage';
                if (album.name === 'homepage') return false;
              // If it's an object, include all albums if authenticated, only published if not
              if (isAuthenticated) return true;
              return album.published === true;
            })
            .map((album: string | { name: string; published: boolean }) => 
              typeof album === 'string' ? album : album.name
            )
        : [];
      
      setAlbums(albumNames);
        setFolders([]);
      }
      setExternalLinks(externalLinksData.externalLinks);
      setSiteName(brandingData.siteName || 'Ted Charles');
      setAvatarPath(brandingData.avatarPath || '/photos/avatar.png');
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
      setFolders([]);
      setExternalLinks([]);
      setSiteName('Ted Charles');
      setAvatarPath('/photos/avatar.png');
      trackError(errorMessage, 'app_initialization');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch data if setup is complete
    if (setupComplete === true) {
    fetchData();
    }

    // Silent update for navigation without triggering loading state
    const updateNavigationSilently = async () => {
      console.log('🔄 albums-updated event received, updating navigation...');
      try {
        const albumsResponse = await fetchWithRateLimitCheck(`${API_URL}/api/albums`);
        if (albumsResponse.ok) {
          const albumsData = await albumsResponse.json();
          console.log('✅ Navigation updated with folders:', albumsData.folders);
          
          // Handle new API format: { albums: [...], folders: [...] } or old format: [...]
          if (albumsData && typeof albumsData === 'object' && 'albums' in albumsData) {
            // New format with folders
            const filteredAlbums = filterAlbums(albumsData.albums || [], isAuthenticated);
            const filteredFolders = filterFolders(albumsData.folders || [], isAuthenticated);
            
            setAlbums(filteredAlbums);
            // Normalize published field to boolean (SQLite returns 0/1)
            setFolders(filteredFolders.map(f => ({ ...f, published: !!f.published })));
          } else {
            // Old format (array of strings or objects)
          const albumNames = Array.isArray(albumsData) 
            ? albumsData
                .filter((album: string | { name: string; published: boolean }) => {
                    if (typeof album === 'string') return album !== 'homepage';
                    if (album.name === 'homepage') return false;
                  // Include all albums if authenticated, only published if not
                  if (isAuthenticated) return true;
                  return album.published === true;
                })
                .map((album: string | { name: string; published: boolean }) => 
                  typeof album === 'string' ? album : album.name
                )
            : [];
            
          setAlbums(albumNames);
            setFolders([]);
          }
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
  }, [isAuthenticated, setupComplete]); // Re-fetch when authentication or setup changes

  // Show setup wizard if setup is not complete
  if (setupComplete === false) {
    return (
      <Suspense fallback={
        <div className="photo-grid-loading">
          <div className="loading-spinner"></div>
          <p>Loading setup...</p>
        </div>
      }>
        <SetupWizard />
      </Suspense>
    );
  }

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
        <div className="app">
          <Header
            albums={albums}
            folders={folders}
            externalLinks={externalLinks}
            currentAlbum={undefined}
            siteName={siteName}
            avatarPath={avatarPath}
            avatarCacheBust={avatarCacheBust}
          />
          <main className="main-content">
            <RateLimitError />
          </main>
          <div className="footer-wrapper visible">
            <Footer
              albums={Array.isArray(albums) && albums.length > 0 && typeof albums[0] === 'object' ? albums.map(a => typeof a === 'string' ? a : a.name) : albums as string[]}
              externalLinks={externalLinks}
              currentAlbum={undefined}
            />
          </div>
        </div>
      );
    }
    return (
      <div className="error backend-error">
        <div className="error-icon-large">❌</div>
        <h2>Backend Error</h2>
        <p className="error-description">Unable to connect to the server</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Reload Page
        </button>
      </div>
    );
  }

  // Check if current route is a standalone page (no main layout)
  const isStandalonePage = location.pathname.startsWith('/shared/') ||
                          location.pathname.startsWith('/setup');

  // Standalone pages render without the main layout
  if (isStandalonePage) {
    return (
      <div className="app">
        <Suspense fallback={
          <div className="photo-grid-loading">
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        }>
          <Routes>
            <Route path="/shared/:secretKey" element={<SharedAlbum />} />
            <Route path="/setup" element={<SetupWizard />} />
          </Routes>
        </Suspense>
      </div>
    );
  }

  // Main application layout for regular pages
  return (
    <div className="app">
      <Header
        albums={albums}
        folders={folders}
        externalLinks={externalLinks}
        currentAlbum={currentAlbum}
        siteName={siteName}
        avatarPath={avatarPath}
        avatarCacheBust={avatarCacheBust}
      />
      
      {/* Global SSE Toaster - appears across all pages */}
      <SSEToaster />

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
                <PhotoGrid 
                  album="homepage"
                  onLoadComplete={() => setShowFooter(true)}
                />
              </>
            } />
            <Route path="/album/:album" element={<AlbumRoute onAlbumNotFound={() => setHideAlbumTitle(true)} onLoadComplete={() => setShowFooter(true)} />} />
            <Route path="/license" element={
              <LicenseWrapper setShowFooter={setShowFooter} />
            } />
            <Route path="/admin" element={<AdminPortal />} />
            <Route path="/admin/login" element={<AdminPortal />} />
            <Route path="/admin/login/password" element={<AdminPortal />} />
            <Route path="/admin/login/passkey" element={<AdminPortal />} />
            <Route path="/admin/albums" element={<AdminPortal />} />
            <Route path="/admin/metrics" element={<AdminPortal />} />
            <Route path="/admin/settings" element={<AdminPortal />} />
            <Route path="/admin/profile" element={<AdminPortal />} />
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
            <Route path="/invite/:token" element={
              <>
                <SEO 
                  title="Complete Registration - Ted Charles Photography"
                  description="Complete your account registration"
                  url={`${SITE_URL}/invite`}
                />
                <InviteSignup />
              </>
            } />
            <Route path="/reset-password" element={
              <>
                <SEO 
                  title="Reset Password - Ted Charles Photography"
                  description="Reset your account password"
                  url={`${SITE_URL}/reset-password`}
                />
                <PasswordResetRequest />
              </>
            } />
            <Route path="/reset-password/:token" element={
              <>
                <SEO 
                  title="Set New Password - Ted Charles Photography"
                  description="Set a new password for your account"
                  url={`${SITE_URL}/reset-password`}
                />
                <PasswordResetComplete />
              </>
            } />
            <Route path="/primes" element={<PrimesRedirect />} />
            <Route path="/primes/*" element={<PrimesRedirect />} />
            <Route path="/404" element={
              <>
                <SEO 
                  title="404 - Page Not Found - Ted Charles Photography"
                  description="The page you're looking for doesn't exist."
                  url={`${SITE_URL}/404`}
                />
                <NotFound />
              </>
            } />
            <Route path="/429" element={
              <>
                <SEO 
                  title="429 - Too Many Requests - Ted Charles Photography"
                  description="Please slow down and try again."
                  url={`${SITE_URL}/429`}
                />
                <RateLimitError />
              </>
            } />
            <Route path="*" element={
              <>
                <SEO 
                  title="404 - Page Not Found - Ted Charles Photography"
                  description="The page you're looking for doesn't exist."
                  url={`${SITE_URL}/404`}
                />
                <NotFoundRedirect />
              </>
            } />
          </Routes>
        </Suspense>
      </main>
      {!location.pathname.startsWith('/admin') && (
        <div className={`footer-wrapper ${showFooter || location.pathname === '/404' || location.pathname === '/429' ? 'visible' : ''}`}>
          <Footer
            albums={Array.isArray(albums) && albums.length > 0 && typeof albums[0] === 'object' ? albums.map(a => typeof a === 'string' ? a : a.name) : albums as string[]}
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
 * - Wraps app with SSEToasterProvider for global job state
 * - Renders the main App component
 */
function AppWrapper() {
  return (
    <Router>
      <AuthProvider>
        <SSEToasterProvider>
          <ScrollToTop />
          <App />
        </SSEToasterProvider>
      </AuthProvider>
    </Router>
  );
}

export default AppWrapper;
