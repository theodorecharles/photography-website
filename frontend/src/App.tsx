import { useState, useEffect } from 'react';
import './App.css'
import PhotoGrid from './components/PhotoGrid';
import { API_URL } from './config';

function App() {
  const [albums, setAlbums] = useState<string[]>([]);
  const [currentAlbum, setCurrentAlbum] = useState<string>('homepage');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/albums`);
        if (!response.ok) {
          throw new Error('Failed to fetch albums');
        }
        const data = await response.json();
        setAlbums(data.filter((album: string) => album !== 'homepage'));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setAlbums([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlbums();
  }, []);

  const handleAlbumClick = (album: string) => {
    setCurrentAlbum(album);
    setIsMenuOpen(false);
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
                  className={currentAlbum === album ? 'active' : ''}
                  onClick={() => handleAlbumClick(album)}
                >
                  {album.charAt(0).toUpperCase() + album.slice(1)}
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
              className={currentAlbum === album ? 'active' : ''}
              onClick={() => handleAlbumClick(album)}
            >
              {album.charAt(0).toUpperCase() + album.slice(1)}
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
