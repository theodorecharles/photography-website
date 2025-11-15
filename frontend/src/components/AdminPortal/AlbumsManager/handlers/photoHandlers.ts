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
  setDeletingPhotoId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const createPhotoHandlers = (props: PhotoHandlersProps) => {
  const { /* selectedAlbum, */ loadPhotos, shufflePhotos, setMessage, showConfirmation, setAlbumPhotos, setDeletingPhotoId } = props;

  let shuffleInterval: NodeJS.Timeout | null = null;
  
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
            
            // Remove photo from local state - this triggers grid reflow
            setAlbumPhotos((prev: Photo[]) => prev.filter((p: Photo) => p.id !== photoId));
            
            // Clear deleting state after a brief delay to allow reflow animation
            await new Promise(resolve => setTimeout(resolve, 100));
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
    shufflePhotos();
  };

  const handleShuffleStart = (): void => {
    if (shuffleInterval) return;
    
    shuffleInterval = setInterval(() => {
      shufflePhotos();
    }, 100);
  };

  const handleShuffleEnd = (): void => {
    if (shuffleInterval) {
      clearInterval(shuffleInterval);
      shuffleInterval = null;
    }
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

