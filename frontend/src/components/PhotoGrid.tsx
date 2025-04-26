import { useState, useEffect } from 'react';
import './PhotoGrid.css';

interface PhotoGridProps {
  album: string;
}

interface Photo {
  id: string;
  src: string;
  thumbnail: string;
}

function PhotoGrid({ album }: PhotoGridProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3001/api/albums/${album}/photos`);
        if (!response.ok) {
          throw new Error('Failed to fetch photos');
        }
        const data = await response.json();
        const photosWithFullPaths = data.map((photo: Photo) => ({
          ...photo,
          src: `http://localhost:3001${photo.src}`,
          thumbnail: `http://localhost:3001${photo.thumbnail}`
        }));
        setPhotos(photosWithFullPaths);
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

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  const handleCloseModal = () => {
    setSelectedPhoto(null);
  };

  const handleDownload = async (photo: Photo) => {
    try {
      const response = await fetch(photo.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.id;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading photo:', err);
    }
  };

  const handleNext = () => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    const nextIndex = (currentIndex + 1) % photos.length;
    setSelectedPhoto(photos[nextIndex]);
  };

  const handlePrevious = () => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
    setSelectedPhoto(photos[prevIndex]);
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
          onClick={() => handlePhotoClick(photo)}
        >
          <img src={photo.thumbnail} alt={`Photo ${photo.id}`} />
        </div>
      ))}

      {selectedPhoto && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-controls">
              <button onClick={handleCloseModal}>×</button>
              <button onClick={() => handleDownload(selectedPhoto)}>↓</button>
            </div>
            <div className="modal-navigation">
              <button onClick={handlePrevious}>←</button>
              <button onClick={handleNext}>→</button>
            </div>
            <img src={selectedPhoto.src} alt={`Photo ${selectedPhoto.id}`} />
          </div>
        </div>
      )}
    </div>
  );
}

export default PhotoGrid; 