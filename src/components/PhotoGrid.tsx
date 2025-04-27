import React, { useState, useEffect } from 'react';
import { Photo } from '../types/Photo';
import PhotoModal from './PhotoModal';

/**
 * PhotoGrid Component
 * 
 * Displays a grid of photos with infinite scrolling and photo selection capabilities.
 * Handles loading states, error handling, and pagination.
 */
const PhotoGrid: React.FC = () => {
  // State for managing the currently selected photo in the modal view
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  
  // Loading state to show loading indicators while fetching photos
  const [isLoading, setIsLoading] = useState(true);
  
  // Error state to handle and display any API or loading errors
  const [error, setError] = useState<string | null>(null);
  
  // Current page number for pagination
  const [page, setPage] = useState(1);
  
  // Flag to indicate if there are more photos to load
  const [hasMore, setHasMore] = useState(true);
  
  // State to manage transition animations between photos
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Mock data for testing - replace with actual API call
  const [photos, setPhotos] = useState<Photo[]>([
    {
      id: '1',
      title: 'Sample Photo 1',
      url: '/optimized/thumbnail/sample1.jpg',
      fullUrl: '/optimized/modal/sample1.jpg'
    },
    {
      id: '2',
      title: 'Sample Photo 2',
      url: '/optimized/thumbnail/sample2.jpg',
      fullUrl: '/optimized/modal/sample2.jpg'
    }
  ]);

  // Handle photo selection
  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  // Handle modal navigation
  const handleNext = () => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex < photos.length - 1) {
      setSelectedPhoto(photos[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex > 0) {
      setSelectedPhoto(photos[currentIndex - 1]);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square cursor-pointer overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            onClick={() => handlePhotoClick(photo)}
          >
            <img
              src={photo.url}
              alt={photo.title}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      )}
    </div>
  );
};

export default PhotoGrid; 