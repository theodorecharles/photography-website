/**
 * Photo Management Handlers
 * Handles photo deletion, shuffle functionality, and retry operations
 */

import { fetchWithRateLimitCheck } from '../../../../utils/fetchWrapper';
import { trackPhotoDeleted } from '../../../../utils/analytics';
import { ConfirmModalConfig, Photo } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

interface PhotoHandlersProps {
  selectedAlbum: string | null;
  loadPhotos: (albumName: string) => Promise<void>;
  shufflePhotos: () => void;
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
  showConfirmation: (config: ConfirmModalConfig) => void;
  setAlbumPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  setOriginalPhotoOrder: React.Dispatch<React.SetStateAction<Photo[]>>;
  setDeletingPhotoId: React.Dispatch<React.SetStateAction<string | null>>;
  shuffleIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
  speedupTimeoutsRef: React.MutableRefObject<NodeJS.Timeout[]>;
  setIsShuffling: React.Dispatch<React.SetStateAction<boolean>>;
}

export const createPhotoHandlers = (props: PhotoHandlersProps) => {
  const { /* selectedAlbum, */ loadPhotos, shufflePhotos, setMessage, showConfirmation, setAlbumPhotos, setOriginalPhotoOrder, setDeletingPhotoId, shuffleIntervalRef, speedupTimeoutsRef, setIsShuffling } = props;
  
  // Retry optimization for a photo
  const handleRetryOptimization = async (album: string, filename: string): Promise<void> => {
    try {
      setMessage({ type: 'success', text: `Retrying optimization for ${filename}...` });
      
      // Clear the error state immediately
      setAlbumPhotos((prev: Photo[]) =>
        prev.map((photo: Photo) =>
          photo.id === `${album}/${filename}`
            ? { ...photo, optimizationError: undefined }
            : photo
        )
      );
      
      // Call the optimization endpoint for this specific photo
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/image-optimization/retry-photo`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ album, filename }),
          credentials: 'include',
        }
      );
      
      if (!res.ok) {
        throw new Error('Failed to retry optimization');
      }
      
      setMessage({ type: 'success', text: `Optimization restarted for ${filename}` });
      
      // Reload photos to get the updated version
      await loadPhotos(album);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to retry optimization' });
      // Restore error state
      setAlbumPhotos((prev: Photo[]) =>
        prev.map((photo: Photo) =>
          photo.id === `${album}/${filename}`
            ? { ...photo, optimizationError: 'Optimization failed' }
            : photo
        )
      );
    }
  };
  
  // Retry AI title generation for a photo
  const handleRetryAI = async (album: string, filename: string): Promise<void> => {
    try {
      setMessage({ type: 'success', text: `Retrying AI title generation for ${filename}...` });
      
      // Clear the error state immediately
      setAlbumPhotos((prev: Photo[]) =>
        prev.map((photo: Photo) =>
          photo.id === `${album}/${filename}`
            ? { ...photo, aiError: undefined }
            : photo
        )
      );
      
      // Call the AI title generation endpoint for this specific photo
      const res = await fetchWithRateLimitCheck(
        `${API_URL}/api/ai-titles/retry-photo`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ album, filename }),
          credentials: 'include',
        }
      );
      
      if (!res.ok) {
        throw new Error('Failed to retry AI title generation');
      }
      
      setMessage({ type: 'success', text: `AI title generation restarted for ${filename}` });
      
      // Reload photos to get the updated version
      await loadPhotos(album);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to retry AI title generation' });
      // Restore error state
      setAlbumPhotos((prev: Photo[]) =>
        prev.map((photo: Photo) =>
          photo.id === `${album}/${filename}`
            ? { ...photo, aiError: 'AI generation failed' }
            : photo
        )
      );
    }
  };

  const handleDeletePhoto = async (
    album: string,
    filename: string,
    photoTitle: string = ''
  ): Promise<void> => {
    showConfirmation({
      message: `Delete this photo${photoTitle ? ` (${photoTitle})` : ''}?\n\nThis action cannot be undone.`,
      confirmText: 'Delete Photo',
      isDanger: true,
      onConfirm: async () => {
        // Trigger CRT animation by setting the photo ID
        const photoId = `${album}/${filename}`;
        setDeletingPhotoId(photoId);
        
        // Wait for CRT animation to complete
        await new Promise(resolve => setTimeout(resolve, 800));
        
        try {
          const res = await fetchWithRateLimitCheck(
            `${API_URL}/api/albums/${encodeURIComponent(album)}/photos/${encodeURIComponent(filename)}`,
            {
              method: 'DELETE',
              credentials: 'include',
            }
          );

          if (res.ok) {
            setMessage({ type: 'success', text: 'Photo deleted' });
            trackPhotoDeleted(album, filename, photoTitle || filename);
            
            // Remove photo from both local state AND original order
            // This prevents deleted photos from reappearing when user hits "Cancel"
            setAlbumPhotos((prev: Photo[]) => prev.filter((p: Photo) => p.id !== photoId));
            setOriginalPhotoOrder((prev: Photo[]) => prev.filter((p: Photo) => p.id !== photoId));
            
            // Clear deleting state immediately - this triggers FLIP animation
            setDeletingPhotoId(null);
          } else {
            const error = await res.json();
            setMessage({ type: 'error', text: error.error || 'Failed to delete photo' });
            setDeletingPhotoId(null); // Clear deleting state on error
          }
        } catch (err) {
          setMessage({ type: 'error', text: 'Network error occurred' });
          setDeletingPhotoId(null); // Clear deleting state on error
        }
      },
    });
  };

  // Shuffle handlers
  const handleShuffleClick = (): void => {
    shufflePhotos(); // Full shuffle on single click
  };

  const handleShuffleStart = (): void => {
    // Don't start if already shuffling
    if (shuffleIntervalRef.current) return;
    
    setIsShuffling(true);
    
    // Get the shuffle button to update its animation speed
    const shuffleButton = document.querySelector('.btn-shuffle-order') as HTMLElement;
    
    // Get the photo grid container
    const photoGrid = document.querySelector('.photos-grid') as HTMLElement;
    
    // Add zoom class to all photos during shuffle
    const photoElements = document.querySelectorAll('.admin-photo-item');
    
    // Calculate scale to fit up to 100 images in view
    const albumSize = photoElements.length;
    let scale = 1.0;
    
    if (albumSize > 30) {
      // Scale down for larger albums so more fit in view
      // Target: 100 images should scale to ~0.5 (half size)
      // Formula: scale = 1 - ((albumSize - 30) / 140)
      // 30 photos: 1.0 (no scaling)
      // 50 photos: ~0.86
      // 70 photos: ~0.71
      // 100 photos: 0.5
      // 170 photos: 0 (capped at min)
      scale = Math.max(0.4, 1 - ((albumSize - 30) / 140));
    }
    
    // Apply scale to grid and each photo element
    if (photoGrid) {
      photoGrid.style.setProperty('--shuffle-scale', scale.toString());
    }
    
    photoElements.forEach((el) => {
      (el as HTMLElement).style.setProperty('--shuffle-scale', scale.toString());
      el.classList.add('shuffling-active');
    });
    
    // Calculate speed multiplier based on album size
    // Speed increases linearly with album size: speed = base_speed * (num_photos / 20)
    // Since interval is inverse of speed: interval = base_interval / (num_photos / 20)
    const speedMultiplier = 20 / Math.max(albumSize, 1); // Prevent division by zero
    
    // Start continuous shuffling with progressive speed increase
    let currentInterval = 100 * speedMultiplier; // Adjust base speed by album size
    let currentAnimationSpeed = 0.4; // Start with 0.4s for rainbow rotation
    
    // Update rainbow rotation speed
    if (shuffleButton) {
      shuffleButton.style.setProperty('--animation-speed', `${currentAnimationSpeed}s`);
    }
    
    const startShuffling = (interval: number) => {
      if (shuffleIntervalRef.current) {
        clearInterval(shuffleIntervalRef.current);
      }
      
      shuffleIntervalRef.current = setInterval(() => {
        // Shuffle one photo at a time (swap two random photos)
        setAlbumPhotos((currentPhotos) => {
          const newOrder = [...currentPhotos];
          // Pick two random indices
          const i = Math.floor(Math.random() * newOrder.length);
          const j = Math.floor(Math.random() * newOrder.length);
          
          // Swap them
          if (i !== j) {
            [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
          }
          
          return newOrder;
        });
      }, interval);
    };
    
    startShuffling(currentInterval);
    
    // Speed up by 20% every 500ms for 3 seconds (6 iterations)
    for (let i = 1; i <= 6; i++) {
      const timeout = setTimeout(() => {
        currentInterval = currentInterval * 0.8; // Reduce interval by 20% = 20% faster
        currentAnimationSpeed = currentAnimationSpeed * 0.8; // Speed up rainbow rotation too
        
        if (shuffleButton) {
          shuffleButton.style.setProperty('--animation-speed', `${currentAnimationSpeed}s`);
        }
        
        startShuffling(currentInterval);
      }, i * 500);
      speedupTimeoutsRef.current.push(timeout);
    }
  };

  const handleShuffleEnd = (): void => {
    // Clear all speedup timeouts
    speedupTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    speedupTimeoutsRef.current = [];
    
    // Stop shuffling
    if (shuffleIntervalRef.current) {
      clearInterval(shuffleIntervalRef.current);
      shuffleIntervalRef.current = null;
    }
    
    setIsShuffling(false);
    
    // Reset rainbow rotation speed back to normal
    const shuffleButton = document.querySelector('.btn-shuffle-order') as HTMLElement;
    if (shuffleButton) {
      shuffleButton.style.removeProperty('--animation-speed');
    }
    
    // Reset grid scale
    const photoGrid = document.querySelector('.photos-grid') as HTMLElement;
    if (photoGrid) {
      photoGrid.style.removeProperty('--shuffle-scale');
    }
    
    // Remove zoom class from photos and reset their scale
    setTimeout(() => {
      const photoElements = document.querySelectorAll('.admin-photo-item');
      photoElements.forEach((el) => {
        (el as HTMLElement).style.removeProperty('--shuffle-scale');
        el.classList.remove('shuffling-active');
      });
    }, 200);
  };

  const handleShuffleMouseDown = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    handleShuffleStart();
  };

  const handleShuffleMouseUp = (): void => {
    handleShuffleEnd();
  };

  const handleShuffleMouseLeave = (): void => {
    handleShuffleEnd();
  };

  return {
    handleDeletePhoto,
    handleRetryOptimization,
    handleRetryAI,
    handleShuffleClick,
    handleShuffleStart,
    handleShuffleEnd,
    handleShuffleMouseDown,
    handleShuffleMouseUp,
    handleShuffleMouseLeave,
  };
};

