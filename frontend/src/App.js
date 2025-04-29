import React, { useState, useEffect } from 'react';

function App() {
  const [currentAlbum, setCurrentAlbum] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [images, setImages] = useState([]);
  const [filteredImages, setFilteredImages] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // ... existing code ...

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1>Photography Portfolio</h1>
          <div className="album-nav">
            <button
              className={`album-button ${currentAlbum === 'all' ? 'active' : ''}`}
              onClick={() => handleAlbumChange('all')}
            >
              All
            </button>
            {albums.map((album) => (
              <button
                key={album.id}
                className={`album-button ${currentAlbum === album.id ? 'active' : ''}`}
                onClick={() => handleAlbumChange(album.id)}
              >
                {album.name}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main>
        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="image-grid">
            {filteredImages.map((image) => (
              <div key={image.id} className="image-container">
                <img
                  src={image.url}
                  alt={image.title}
                  loading="lazy"
                  onClick={() => handleImageClick(image)}
                />
              </div>
            ))}
          </div>
        )}
      </main>
      {selectedImage && (
        <div className="lightbox" onClick={handleLightboxClose}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={handleLightboxClose}>
              ×
            </button>
            <img src={selectedImage.url} alt={selectedImage.title} />
            <div className="image-info">
              <h2>{selectedImage.title}</h2>
              <p>{selectedImage.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 