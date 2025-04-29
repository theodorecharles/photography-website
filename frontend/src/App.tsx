/**
 * Main application component for the photography website.
 * This component handles the routing and layout of the entire application.
 */

import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useParams } from 'react-router-dom';
import './App.css'
import PhotoGrid from './components/PhotoGrid';
import Footer from './components/Footer';
import License from './components/License';
import ScrollToTop from './components/ScrollToTop';
import { API_URL } from './config';

interface ExternalLink {
  title: string;
  url: string;
}

function AlbumRoute() {
  const { album } = useParams();
  return <PhotoGrid album={album || ''} />;
}

function Navigation({ albums, externalLinks, isMenuOpen, setIsMenuOpen }: { 
  albums: string[], 
  externalLinks: ExternalLink[], 
  isMenuOpen: boolean, 
  setIsMenuOpen: (value: boolean) => void 
}) {
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExternalOpen, setIsExternalOpen] = useState(false);

  const handleAlbumsHover = () => {
    setIsExternalOpen(false);
    setIsDropdownOpen(true);
  };

  const handleLinksHover = () => {
    setIsDropdownOpen(false);
    setIsExternalOpen(true);
  };

  const handleDropdownLeave = () => {
    setIsDropdownOpen(false);
    setIsExternalOpen(false);
  };

  return (
    <>
      <nav className="album-nav" style={{position: "absolute", right: "0", marginRight: "1rem"}}>
        <div 
          className="dropdown-container"
          onMouseEnter={handleAlbumsHover}
          onMouseLeave={handleDropdownLeave}
        >
          <button 
            className="nav-link"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            Albums
            <svg 
              className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} 
              viewBox="0 0 24 24" 
              width="16" 
              height="16"
            >
              <path d="M6 9L12 15L18 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className={`dropdown-menu ${isDropdownOpen ? 'open' : ''}`}>
            {albums.map((album) => (
              <Link 
                key={album}
                to={`/album/${album}`}
                className={`nav-link ${location.pathname === `/album/${album}` ? 'active' : ''}`}
                onClick={() => setIsDropdownOpen(false)}
              >
                {album.charAt(0).toUpperCase() + album.slice(1)}
              </Link>
            ))}
          </div>
        </div>
        <div 
          className="dropdown-container"
          onMouseEnter={handleLinksHover}
          onMouseLeave={handleDropdownLeave}
        >
          <button 
            className="nav-link"
            onClick={() => setIsExternalOpen(!isExternalOpen)}
          >
            Links
            <svg 
              className={`dropdown-arrow ${isExternalOpen ? 'open' : ''}`} 
              viewBox="0 0 24 24" 
              width="16" 
              height="16"
            >
              <path d="M6 9L12 15L18 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className={`dropdown-menu ${isExternalOpen ? 'open' : ''}`}>
            {externalLinks.map((link) => (
              <a
                key={link.title}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link external"
                onClick={() => setIsExternalOpen(false)}
              >
                {link.title}
                <svg className="external-icon" viewBox="0 0 24 24" width="16" height="16">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 3h6v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 14L21 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            ))}
          </div>
        </div>
      </nav>
      <div 
        className="hamburger-menu"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <div className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      <div 
        className={`dropdown-container mobile-dropdown ${isMenuOpen ? 'active' : ''}`}
      >
        <div className={`dropdown-menu ${isMenuOpen ? 'open' : ''}`}>
          <div className="mobile-section">
            {/* <h3>Albums</h3> */}
            {albums.map((album) => (
              <Link 
                key={album}
                to={`/album/${album}`}
                className={`nav-link ${location.pathname === `/album/${album}` ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                {album.charAt(0).toUpperCase() + album.slice(1)}
              </Link>
            ))}
          </div>
          <div className="mobile-section">
            {/* <h3>Links</h3> */}
            {externalLinks.map((link) => (
              <a
                key={link.title}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link external"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.title}
                <svg className="external-icon" viewBox="0 0 24 24" width="16" height="16">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 3h6v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 14L21 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function App() {
  const [albums, setAlbums] = useState<string[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Handle clicks outside the mobile menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const mobileMenu = document.querySelector('.mobile-menu');
      const hamburgerMenu = document.querySelector('.hamburger-menu');
      
      if (isMenuOpen && 
          mobileMenu && 
          !mobileMenu.contains(event.target as Node) && 
          !hamburgerMenu?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Handle scroll to close mobile menu
  useEffect(() => {
    const handleScroll = () => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [albumsResponse, externalLinksResponse] = await Promise.all([
          fetch(`${API_URL}/api/albums`),
          fetch(`${API_URL}/api/external-pages`)
        ]);

        if (!albumsResponse.ok) {
          throw new Error('Failed to fetch albums');
        }
        if (!externalLinksResponse.ok) {
          throw new Error('Failed to fetch external links');
        }

        const albumsData = await albumsResponse.json();
        const externalLinksData = await externalLinksResponse.json();

        setAlbums(albumsData.filter((album: string) => album !== 'homepage'));
        setExternalLinks(externalLinksData.externalLinks);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setAlbums([]);
        setExternalLinks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return <div className="loading">Loading albums...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <Link to="/">
            <img 
              src={`${API_URL}/photos/derpatar.png`}
              alt="Ted Charles" 
              className="avatar"
            />
            <h1 className="header-title">
              Ted Charles
            </h1>
          </Link>
        </div>
        <Navigation 
          albums={albums} 
          externalLinks={externalLinks} 
          isMenuOpen={isMenuOpen} 
          setIsMenuOpen={setIsMenuOpen} 
        />
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<PhotoGrid album="homepage" />} />
          <Route path="/album/:album" element={<AlbumRoute />} />
          <Route path="/license" element={<License />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function AppWrapper() {
  return (
    <Router>
      <ScrollToTop />
      <App />
    </Router>
  );
}

export default AppWrapper;
