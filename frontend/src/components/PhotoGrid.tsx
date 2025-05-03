/**
 * PhotoGrid component for displaying a grid of photos.
 * This component handles fetching and displaying photos from the backend,
 * and provides functionality for viewing photos in a modal.
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './PhotoGrid.css';
import { API_URL, cacheBustValue } from '../config';

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
  const location = useLocation();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalImageLoaded, setModalImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number }>>({});

  // Get query parameters from current URL
  const queryParams = new URLSearchParams(location.search);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}&i=${cacheBustValue}` : `?i=${cacheBustValue}`;

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
        const albumsResponse = await fetch(`${API_URL}/api/albums${queryString}`);
        if (!albumsResponse.ok) {
          throw new Error('Failed to fetch albums');
        }
        const albumsData = await albumsResponse.json();
        
        if (album === 'homepage') {
          // Fetch all photos from each album for homepage
          const allPhotosPromises = albumsData.map(async (albumName: string) => {
            const albumResponse = await fetch(`${API_URL}/api/albums/${albumName}/photos${queryString}`);
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
          const response = await fetch(`${API_URL}/api/albums/${album}/photos${queryString}`);
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
  }, [album, queryString]);

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

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>, photoId: string) => {
    const img = e.currentTarget;
    img.classList.add('loaded');
    setImageDimensions(prev => ({
      ...prev,
      [photoId]: {
        width: img.naturalWidth,
        height: img.naturalHeight
      }
    }));
  };

  // Function to get number of columns based on window width
  const getNumColumns = () => {
    if (window.innerWidth >= 1600) return 5;
    if (window.innerWidth >= 1200) return 4;
    if (window.innerWidth >= 900) return 3;
    if (window.innerWidth >= 600) return 2;
    return 1;
  };

  // State for number of columns
  const [numColumns, setNumColumns] = useState(getNumColumns());

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setNumColumns(getNumColumns());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Function to distribute photos into columns
  const distributePhotos = (photos: Photo[], numColumns: number) => {
    // Initialize columns with empty arrays
    const columns: Photo[][] = Array.from({ length: numColumns }, () => []);
    
    // Calculate total height for each photo based on its aspect ratio
    const photoHeights = photos.map(photo => {
      const dimensions = imageDimensions[photo.id];
      if (!dimensions) return 1; // Default to 1 if dimensions not loaded yet
      return dimensions.height / dimensions.width;
    });
    
    // Initialize column heights
    const columnHeights = Array(numColumns).fill(0);

    // Distribute photos to columns
    photos.forEach((photo, index) => {
      // Find the column with the smallest current height
      let shortestColumnIndex = 0;
      let shortestHeight = columnHeights[0];
      
      for (let i = 1; i < numColumns; i++) {
        if (columnHeights[i] < shortestHeight) {
          shortestHeight = columnHeights[i];
          shortestColumnIndex = i;
        }
      }

      // Add photo to the shortest column
      columns[shortestColumnIndex].push(photo);
      columnHeights[shortestColumnIndex] += photoHeights[index];
    });

    return columns;
  };

  if (loading) {
    return <div className="loading">Loading photos...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="photo-grid">
      {distributePhotos(photos, numColumns).map((column, columnIndex) => (
        <div key={columnIndex} className="photo-column">
          {column.map((photo) => (
            <div 
              key={photo.id} 
              className="photo-item"
              style={{
                aspectRatio: imageDimensions[photo.id] 
                  ? `${imageDimensions[photo.id].width} / ${imageDimensions[photo.id].height}`
                  : '1 / 1'
              }}
              onClick={() => {
                handlePhotoClick(photo);
              }}
            >
              <img 
                src={`${API_URL}${photo.thumbnail}${queryString}`}
                alt={photo.title}
                loading="lazy"
                onLoad={(e) => handleImageLoad(e, photo.id)}
              />
            </div>
          ))}
        </div>
      ))}
      
      {selectedPhoto && (
        <div 
          className="modal" 
          onClick={handleCloseModal}
        >
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-controls">
              <button onClick={() => {
                window.open(`${API_URL}${selectedPhoto.download}${queryString}`, '_blank');
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
              src={`${API_URL}${selectedPhoto.thumbnail}${queryString}`}
              alt={selectedPhoto.title}
              className="modal-placeholder"
              style={{ display: modalImageLoaded ? 'none' : 'block' }}
            />
            <img 
              src={`${API_URL}${selectedPhoto.src}${queryString}`}
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