/**
 * Optimization Stream Handlers
 * Connects to single SSE endpoint for all optimization updates
 */

import { UploadingImage, Photo } from '../types';
import { trackPhotoUploaded } from '../../../../utils/analytics';

const API_URL = import.meta.env.VITE_API_URL || '';

interface OptimizationStreamHandlersProps {
  setUploadingImages: React.Dispatch<React.SetStateAction<UploadingImage[]>>;
  selectedAlbumRef: React.MutableRefObject<string | null>;
}

export const createOptimizationStreamHandlers = (props: OptimizationStreamHandlersProps) => {
  const { setUploadingImages, selectedAlbumRef } = props;

  let eventSource: EventSource | null = null;

  /**
   * Connect to optimization stream SSE endpoint
   */
  const connectOptimizationStream = () => {
    // Don't reconnect if already connected or connecting
    if (eventSource) {
      if (eventSource.readyState === EventSource.OPEN) {
        console.log('[Optimization Stream] Already connected, skipping reconnection');
        return;
      } else if (eventSource.readyState === EventSource.CONNECTING) {
        console.log('[Optimization Stream] Connection in progress, skipping reconnection');
        return;
      } else {
        // Connection is closed, clean it up
        console.log('[Optimization Stream] Closing stale connection');
        eventSource.close();
        eventSource = null;
      }
    }

    console.log('[Optimization Stream] Establishing new connection...');
    
    eventSource = new EventSource(`${API_URL}/api/optimization-stream`, {
      withCredentials: true
    });

    eventSource.onopen = () => {
      console.log('[Optimization Stream] ✅ Connected successfully');
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

          console.log(`[Optimization Stream] Update received: ${jobId} - ${state} (${progress}%) - Album: "${album}" vs Selected: "${selectedAlbumRef.current}"`);

          // Only update if it's for the currently selected album
          if (album !== selectedAlbumRef.current) {
            console.log(`[Optimization Stream] Skipping update - album mismatch`);
            return;
          }

          setUploadingImages((prev: UploadingImage[]) => {
            const imageExists = prev.some(img => img.filename === filename);
            if (!imageExists) {
              console.warn(`[Optimization Stream] Image ${filename} not found in uploadingImages array`);
            }
            
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
                console.log(`[Optimization Stream] ✅ Marking ${filename} as complete`);
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

    eventSource.onerror = (error) => {
      console.error('[Optimization Stream] Connection error', error);
      if (eventSource) {
        console.log('[Optimization Stream] EventSource readyState:', eventSource.readyState);
        eventSource.close();
        eventSource = null;
      }
      // Don't auto-reconnect - the parent component will reconnect if needed
    };
  };

  /**
   * Disconnect from optimization stream
   */
  const disconnectOptimizationStream = () => {
    if (eventSource) {
      console.log('[Optimization Stream] 🔌 Disconnecting...');
      eventSource.close();
      eventSource = null;
    } else {
      console.log('[Optimization Stream] Already disconnected');
    }
  };

  return {
    connectOptimizationStream,
    disconnectOptimizationStream
  };
};

