/**
 * Optimization Stream Handlers
 * Connects to single SSE endpoint for all optimization updates
 */

import { UploadingImage, Photo } from '../types';
import { trackPhotoUploaded } from '../../../../utils/analytics';

const API_URL = import.meta.env.VITE_API_URL || '';

interface OptimizationStreamHandlersProps {
  setUploadingImages: React.Dispatch<React.SetStateAction<UploadingImage[]>>;
  selectedAlbum: string | null;
}

export const createOptimizationStreamHandlers = (props: OptimizationStreamHandlersProps) => {
  const { setUploadingImages, selectedAlbum } = props;

  let eventSource: EventSource | null = null;

  /**
   * Connect to optimization stream SSE endpoint
   */
  const connectOptimizationStream = () => {
    if (eventSource) {
      return; // Already connected
    }

    console.log('[Optimization Stream] Connecting...');
    
    eventSource = new EventSource(`${API_URL}/api/optimization-stream`, {
      withCredentials: true
    });

    eventSource.onopen = () => {
      console.log('[Optimization Stream] Connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'initial-state') {
          // Server sent current state of all jobs
          console.log(`[Optimization Stream] Received ${data.jobs?.length || 0} active jobs`);
          // TODO: Could sync with existing uploadingImages if needed
        } else if (data.type === 'optimization-update') {
          // Update for a specific photo
          const { jobId, album, filename, progress, state, error, title } = data;

          // Only update if it's for the currently selected album
          if (album !== selectedAlbum) return;

          console.log(`[Optimization Stream] ${jobId}: ${state} (${progress}%)`);

          setUploadingImages((prev: UploadingImage[]) => {
            return prev.map((img: UploadingImage) => {
              if (img.filename !== filename) return img;

              // Update progress
              if (state === 'optimizing') {
                return {
                  ...img,
                  state: 'optimizing',
                  optimizeProgress: progress
                };
              }

              // Update to AI generating
              if (state === 'generating-title') {
                return {
                  ...img,
                  state: 'generating-title'
                };
              }

              // Complete
              if (state === 'complete') {
                const completedPhoto: Photo = {
                  id: `${album}/${filename}`,
                  thumbnail: `/optimized/thumbnail/${encodeURIComponent(album)}/${encodeURIComponent(filename)}`,
                  modal: `/optimized/modal/${encodeURIComponent(album)}/${encodeURIComponent(filename)}`,
                  download: `/optimized/download/${encodeURIComponent(album)}/${encodeURIComponent(filename)}`,
                  title: title || '',
                  album: album,
                };

                trackPhotoUploaded(album, 1, [filename]);

                return {
                  ...img,
                  state: 'complete',
                  photo: completedPhoto
                };
              }

              // Error
              if (state === 'error') {
                // Check if this is an optimization error or if we don't have a photo yet
                if (!img.photo) {
                  return {
                    ...img,
                    state: 'error',
                    error: error || 'Unknown error'
                  };
                } else {
                  // We have a photo, mark it complete with error
                  return {
                    ...img,
                    state: 'complete',
                    photo: {
                      ...img.photo,
                      optimizationError: error
                    }
                  };
                }
              }

              return img;
            });
          });
        }
      } catch (err) {
        console.error('[Optimization Stream] Parse error:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[Optimization Stream] Error:', err);
      eventSource?.close();
      eventSource = null;

      // Attempt reconnect after 5 seconds
      setTimeout(() => {
        if (selectedAlbum) {
          connectOptimizationStream();
        }
      }, 5000);
    };
  };

  /**
   * Disconnect from optimization stream
   */
  const disconnectOptimizationStream = () => {
    if (eventSource) {
      console.log('[Optimization Stream] Disconnecting...');
      eventSource.close();
      eventSource = null;
    }
  };

  return {
    connectOptimizationStream,
    disconnectOptimizationStream
  };
};

