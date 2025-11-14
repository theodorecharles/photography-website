/**
 * Photo Management Handlers
 * Handles photo deletion and shuffle functionality
 */

import { fetchWithRateLimitCheck } from '../../../../utils/fetchWrapper';
import { trackPhotoDeleted } from '../../../../utils/analytics';
import { ConfirmModalConfig } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

interface PhotoHandlersProps {
  selectedAlbum: string | null;
  loadPhotos: (albumName: string) => Promise<void>;
  shufflePhotos: () => void;
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
  showConfirmation: (config: ConfirmModalConfig) => void;
}

export const createPhotoHandlers = (props: PhotoHandlersProps) => {
  const { /* selectedAlbum, */ loadPhotos, shufflePhotos, setMessage, showConfirmation } = props;

  let shuffleInterval: NodeJS.Timeout | null = null;

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
            await loadPhotos(album);
          } else {
            const error = await res.json();
            setMessage({ type: 'error', text: error.error || 'Failed to delete photo' });
          }
        } catch (err) {
          setMessage({ type: 'error', text: 'Network error occurred' });
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
    handleShuffleClick,
    handleShuffleStart,
    handleShuffleEnd,
    handleShuffleMouseDown,
    handleShuffleMouseUp,
    handleShuffleMouseLeave,
  };
};

