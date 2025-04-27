import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useParams } from 'react-router-dom';
import './App.css'
import PhotoGrid from './components/PhotoGrid';
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

  return (
    <>
      <nav className="album-nav">
        <ul>
          {albums.map((album) => (
            <li key={album}>
              <Link 
                to={`/album/${album}`}
                className={`nav-link ${location.pathname === `/album/${album}` ? 'active' : ''}`}
              >
                {album.charAt(0).toUpperCase() + album.slice(1)}
              </Link>
            </li>
          ))}
          {externalLinks.map((link) => (
            <li key={link.title}>
              <a 
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link external"
              >
                {link.title}
                <svg className="external-icon" viewBox="0 0 24 24" width="16" height="16">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 3h6v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 14L21 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div 
        className={`hamburger-menu ${isMenuOpen ? 'active' : ''}`}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <div className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      <div className={`mobile-menu ${isMenuOpen ? 'active' : ''}`}>
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
        {externalLinks.map((link) => (
          <a
            key={link.title}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link external"
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
    </>
  );
}

function App() {
  const [albums, setAlbums] = useState<string[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        </Routes>
      </main>
    </div>
  );
}

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppWrapper;
