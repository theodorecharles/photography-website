import { useState, useEffect } from 'react';
import './PhotoGrid.css';
import { API_URL } from '../config';

interface PhotoGridProps {
  album: string;
}

interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  download: string;
}

function PhotoGrid({ album }: PhotoGridProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [modalImageLoaded, setModalImageLoaded] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  // const [isSwiping, setIsSwiping] = useState(false);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    // setIsSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    setTouchEnd(e.targetTouches[0].clientX);
    const offset = e.targetTouches[0].clientX - touchStart;
    setSwipeOffset(offset);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || !selectedPhoto) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
      const nextIndex = (currentIndex + 1) % photos.length;
      setSelectedPhoto(photos[nextIndex]);
    } else if (isRightSwipe) {
      const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
      const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
      setSelectedPhoto(photos[prevIndex]);
    }
    
    setSwipeOffset(0);
    // setIsSwiping(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!selectedPhoto) return;
    
    if (e.key === 'ArrowLeft') {
      const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
      const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
      setModalImageLoaded(false);
      setSelectedPhoto(photos[prevIndex]);
    } else if (e.key === 'ArrowRight') {
      const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
      const nextIndex = (currentIndex + 1) % photos.length;
      setModalImageLoaded(false);
      setSelectedPhoto(photos[nextIndex]);
    } else if (e.key === 'Escape') {
      setSelectedPhoto(null);
    }
  };

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/albums/${album}/photos`);
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

  useEffect(() => {
    if (selectedPhoto) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPhoto, photos]);

  useEffect(() => {
    if (selectedPhoto) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [selectedPhoto]);

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
            alt={photo.id}
            loading="lazy"
          />
        </div>
      ))}
      
      {selectedPhoto && (
        <div 
          className="modal" 
          onClick={() => setSelectedPhoto(null)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
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
            <div className="modal-images" style={{ transform: `translateX(${swipeOffset}px)` }}>
              <img 
                src={`${API_URL}${selectedPhoto.thumbnail}`}
                alt={selectedPhoto.id}
                className="modal-placeholder"
                style={{ display: modalImageLoaded ? 'none' : 'block' }}
              />
              <img 
                src={`${API_URL}${selectedPhoto.src}`}
                alt={selectedPhoto.id}
                onLoad={() => setModalImageLoaded(true)}
                style={{ display: modalImageLoaded ? 'block' : 'none' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PhotoGrid; 