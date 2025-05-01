/**
 * PhotoGrid component for displaying a grid of photos.
 * This component handles fetching and displaying photos from the backend,
 * and provides functionality for viewing photos in a modal.
 */

import { useState, useEffect } from 'react';
import './PhotoGrid.css';
import { API_URL } from '../config';
import { Link } from 'react-router-dom';

interface PhotoGridProps {
  album: string;
}

interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  download: string;
  title: string;
  album: string;
  metadata?: {
    created: string;
    modified: string;
    size: number;
  };
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ album }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalImageLoaded, setModalImageLoaded] = useState(false);
  const [albums, setAlbums] = useState<string[]>([]);

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  const handleCloseModal = () => {
    setSelectedPhoto(null);
  };

  // Handle body scrolling when modal opens/closes
  useEffect(() => {
    if (selectedPhoto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedPhoto]);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setLoading(true);
        
        // Always fetch albums list first
        const albumsResponse = await fetch(`${API_URL}/api/albums`);
        if (!albumsResponse.ok) {
          throw new Error('Failed to fetch albums');
        }
        const albumsData = await albumsResponse.json();
        setAlbums(albumsData);
        
        if (album === 'homepage') {
          // Fetch all photos from each album for homepage
          const allPhotosPromises = albumsData.map(async (albumName: string) => {
            const albumResponse = await fetch(`${API_URL}/api/albums/${albumName}/photos`);
            if (!albumResponse.ok) {
              throw new Error(`Failed to fetch photos from album ${albumName}`);
            }
            return albumResponse.json();
          });
          
          const allPhotosArrays = await Promise.all(allPhotosPromises);
          const allPhotos = allPhotosArrays.flat();
          
          // Randomly select 9 photos
          const shuffled = [...allPhotos].sort(() => 0.5 - Math.random());
          setPhotos(shuffled.slice(0, 9));
        } else {
          // For specific album pages, fetch photos normally
          const response = await fetch(`${API_URL}/api/albums/${album}/photos`);
          if (!response.ok) {
            throw new Error('Failed to fetch photos');
          }
          const data = await response.json();
          // Sort photos by creation date, newest first
          const sortedPhotos = data.sort((a: Photo, b: Photo) => {
            if (!a.metadata || !b.metadata) return 0;
            return new Date(b.metadata.created).getTime() - new Date(a.metadata.created).getTime();
          });
          setPhotos(sortedPhotos);
        }
        
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
            handlePhotoClick(photo);
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
      
      <div className="photo-item albums-list">
        <div className="albums-list-content">
          <h3>{album === 'homepage' ? 'Select an album' : 'Select another album'}</h3>
          <div className="albums-buttons">
            {albums
              .filter(albumName => albumName !== 'homepage' && (album === 'homepage' || albumName !== album))
              .map((albumName) => (
                <Link
                  key={albumName}
                  to={`/album/${albumName}`}
                  className="album-button"
                >
                  {albumName.charAt(0).toUpperCase() + albumName.slice(1)}
                </Link>
              ))}
          </div>
        </div>
      </div>
      
      {selectedPhoto && (
        <div 
          className="modal" 
          onClick={handleCloseModal}
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
              <button onClick={handleCloseModal}>
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