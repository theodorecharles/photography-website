import { useState, useEffect } from 'react';
import './PhotoGrid.css';
import { API_URL } from '../config';

interface PhotoGridProps {
  album: string;
  onPhotoSelect: (photo: Photo) => void;
}

interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  download: string;
  title: string;
  album: string;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ album, onPhotoSelect }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalImageLoaded, setModalImageLoaded] = useState(false);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setLoading(true);
        let response;
        if (album === 'homepage') {
          response = await fetch(`${API_URL}/api/random-photos?count=2`);
        } else {
          response = await fetch(`${API_URL}/api/albums/${album}/photos`);
        }
        if (!response.ok) {
          throw new Error('Failed to fetch photos');
        }
        const data = await response.json();
        setPhotos(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setPhotos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [album]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPhoto) return;

      if (e.key === 'Escape') {
        setSelectedPhoto(null);
      } else if (e.key === 'ArrowLeft') {
        const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
        const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
        setModalImageLoaded(false);
        setSelectedPhoto(photos[prevIndex]);
      } else if (e.key === 'ArrowRight') {
        const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
        const nextIndex = (currentIndex + 1) % photos.length;
        setModalImageLoaded(false);
        setSelectedPhoto(photos[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, photos]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.classList.add('loaded');
  };

  if (loading) {
    return <div className="loading">Loading photos...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="photo-grid">
      {photos.map((photo) => (
        <div 
          key={photo.id} 
          className="photo-item"
          onClick={() => {
            setModalImageLoaded(false);
            setSelectedPhoto(photo);
          }}
        >
          <img 
            src={`${API_URL}${photo.thumbnail}`}
            alt={photo.title}
            loading="lazy"
            onLoad={handleImageLoad}
          />
        </div>
      ))}
      
      {selectedPhoto && (
        <div 
          className="modal" 
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-controls">
              <button onClick={() => {
                window.open(`${API_URL}${selectedPhoto.download}`, '_blank');
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              <button onClick={() => setSelectedPhoto(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-navigation">
              <button onClick={() => {
                const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
                const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
                setModalImageLoaded(false);
                setSelectedPhoto(photos[prevIndex]);
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 12L18 18" />
                </svg>
              </button>
              <button onClick={() => {
                const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
                const nextIndex = (currentIndex + 1) % photos.length;
                setModalImageLoaded(false);
                setSelectedPhoto(photos[nextIndex]);
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6L18 12L6 18" />
                </svg>
              </button>
            </div>
            <img 
              src={`${API_URL}${selectedPhoto.thumbnail}`}
              alt={selectedPhoto.title}
              className="modal-placeholder"
              style={{ display: modalImageLoaded ? 'none' : 'block' }}
            />
            <img 
              src={`${API_URL}${selectedPhoto.src}`}
              alt={selectedPhoto.title}
              onLoad={() => setModalImageLoaded(true)}
              style={{ display: modalImageLoaded ? 'block' : 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGrid; 