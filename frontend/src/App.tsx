import { useState, useEffect } from 'react';
import './App.css'
import PhotoGrid from './components/PhotoGrid';
import { API_URL } from './config';

interface ExternalLink {
  title: string;
  url: string;
}

function App() {
  const [albums, setAlbums] = useState<string[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);
  const [currentAlbum, setCurrentAlbum] = useState<string>('homepage');
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

  const handleAlbumClick = (album: string) => {
    setCurrentAlbum(album);
    setIsMenuOpen(false);
  };

  const handleExternalLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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
          <img 
            src={`${API_URL}/photos/derpatar.png`}
            alt="Ted Charles" 
            className="avatar"
          />
          <h1 
            className="header-title"
            onClick={() => handleAlbumClick('homepage')}
          >
            Ted Charles
          </h1>
        </div>
        <nav className="album-nav">
          <ul>
            {albums.map((album) => (
              <li key={album}>
                <button 
                  className={`nav-link ${currentAlbum === album ? 'active' : ''}`}
                  onClick={() => handleAlbumClick(album)}
                >
                  {album.charAt(0).toUpperCase() + album.slice(1)}
                </button>
              </li>
            ))}
            {externalLinks.map((link) => (
              <li key={link.title}>
                <button 
                  className="nav-link"
                  onClick={() => handleExternalLinkClick(link.url)}
                >
                  {link.title}
                </button>
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
            <button
              key={album}
              className={`nav-link ${currentAlbum === album ? 'active' : ''}`}
              onClick={() => handleAlbumClick(album)}
            >
              {album.charAt(0).toUpperCase() + album.slice(1)}
            </button>
          ))}
          {externalLinks.map((link) => (
            <button
              key={link.title}
              className="nav-link"
              onClick={() => handleExternalLinkClick(link.url)}
            >
              {link.title}
            </button>
          ))}
        </div>
      </header>

      <main className="main-content">
        <PhotoGrid album={currentAlbum} />
      </main>
    </div>
  )
}

export default App
