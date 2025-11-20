/**
 * Upload Handlers
 * Handles photo uploads, drag-and-drop file uploads
 */

import { UploadingImage } from '../types';
import { API_URL } from '../../../../config';
import { validateImageFiles } from '../utils/albumHelpers';
import { error, info } from '../../../../utils/logger';


interface UploadHandlersProps {
  uploadingImages: UploadingImage[];
  setUploadingImages: React.Dispatch<React.SetStateAction<UploadingImage[]>>;
  uploadingImagesRef: React.RefObject<UploadingImage[]>;
  uploadBatchSizeRef: React.MutableRefObject<number>;
  setUploadingAlbum: React.Dispatch<React.SetStateAction<string>>;
  selectAlbum: (albumName: string) => void;
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
  loadAlbums: () => Promise<void>;
  language: string;
}

export const createUploadHandlers = (props: UploadHandlersProps) => {
  const {
    // uploadingImages, // not used directly, managed via setUploadingImages
    setUploadingImages,
    // uploadingImagesRef, // not used directly
    uploadBatchSizeRef,
    setUploadingAlbum,
    setMessage,
    loadAlbums,
    // setAlbumPhotos, // no longer used - photos stay in uploadingImages until complete
    language,
  } = props;

  // Upload single image (returns immediately, optimization tracked via SSE stream)
  const uploadSingleImage = async (
    file: File,
    filename: string,
    albumName: string,
    retryCount: number = 0
  ): Promise<void> => {
    // Update state to 'uploading' when we start
    setUploadingImages((prev: UploadingImage[]): UploadingImage[] =>
      prev.map((img: UploadingImage): UploadingImage =>
        img.filename === filename
          ? { ...img, state: 'uploading', progress: 0, retryCount }
          : img
      )
    );
    
    return new Promise<void>((resolve, reject) => {
      const formData = new FormData();
      formData.append('photo', file, filename);
      formData.append('language', language);

      // Use XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadingImages((prev: UploadingImage[]): UploadingImage[] =>
            prev.map((img: UploadingImage): UploadingImage =>
              img.filename === filename
                ? { ...img, state: 'uploading', progress: percentComplete }
                : img
            )
          );
        }
      });
      
      // Set a longer timeout for upload requests (10 minutes)
      xhr.timeout = 600000; // 10 minutes per file
      
      xhr.withCredentials = true; // Include cookies
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              // Update state to 'optimizing' (optimization tracked via separate SSE stream)
              setUploadingImages((prev: UploadingImage[]): UploadingImage[] =>
                prev.map((img: UploadingImage): UploadingImage =>
                  img.filename === filename
                    ? { ...img, state: 'optimizing', progress: 100, optimizeProgress: 0 }
                    : img
                )
              );
              
              resolve(); // Allow next upload to start immediately
            } else {
              reject(new Error('Upload failed'));
            }
          } catch (e) {
            reject(new Error('Invalid server response'));
          }
        } else {
          const errorMsg = `Upload failed: ${xhr.status}`;
          info(`[Upload] ${filename}: ${errorMsg}`);
          setUploadingImages((prev: UploadingImage[]): UploadingImage[] =>
            prev.map((img: UploadingImage): UploadingImage =>
              img.filename === filename
                ? { ...img, state: 'error', error: errorMsg, retryCount }
                : img
            )
          );
          reject(new Error(errorMsg));
        }
      };
      
      xhr.onerror = () => {
        info(`[Upload] ${filename}: Network error (retryCount: ${retryCount})`);
        setUploadingImages((prev: UploadingImage[]): UploadingImage[] =>
          prev.map((img: UploadingImage): UploadingImage =>
            img.filename === filename
              ? { ...img, state: 'error', error: 'Network error', retryCount }
              : img
          )
        );
        reject(new Error('Network error'));
      };
      
      xhr.ontimeout = () => {
        info(`[Upload] ${filename}: Upload timed out (retryCount: ${retryCount})`);
        setUploadingImages((prev: UploadingImage[]): UploadingImage[] =>
          prev.map((img: UploadingImage): UploadingImage =>
            img.filename === filename
              ? { ...img, state: 'error', error: 'Upload timed out', retryCount }
              : img
          )
        );
        reject(new Error('Upload timed out'));
      };
      
      xhr.open('POST', `${API_URL}/api/albums/${encodeURIComponent(albumName)}/upload`);
      xhr.send(formData);
    }).catch((err) => {
      error(`Upload failed for ${filename}:`, err);
      throw err;
    });
  };

  const handleUploadToAlbum = async (
    albumName: string,
    files: File[]
  ): Promise<void> => {
    // Validate files
    const validation = validateImageFiles(files);
    if (!validation.valid.length) {
      setMessage({ type: 'error', text: 'No valid images to upload' });
      return;
    }

    info(`[Upload] Starting upload of ${validation.valid.length} files to album "${albumName}" (4 concurrent uploads)`);

    // Initialize uploading images with upload index for ordering
    const newUploadingImages: UploadingImage[] = validation.valid.map((file, index) => ({
      filename: file.name,
      state: 'queued' as const,
      file,
      uploadIndex: index, // Track original position
    }));

    setUploadingImages(newUploadingImages);
    uploadBatchSizeRef.current = newUploadingImages.length; // Track original batch size
    setUploadingAlbum(albumName); // Track which album is uploading

    let successCount = 0;
    const failedUploads: Array<{ img: UploadingImage; retryCount: number }> = [];

    // Upload images with concurrency pool (4 at a time)
    // This prevents one slow upload from blocking everything
    const CONCURRENT_UPLOADS = 4;
    const uploadPromises: Promise<void>[] = [];
    let uploadIndex = 0;

    const uploadNext = async (): Promise<void> => {
      while (uploadIndex < newUploadingImages.length) {
        const img = newUploadingImages[uploadIndex++];
        
        try {
          await uploadSingleImage(img.file, img.filename, albumName, 0);
          successCount++;
        } catch (err) {
          error(`[Upload] Error:`, err);
          failedUploads.push({ img, retryCount: 0 });
        }
      }
    };

    // Start concurrent upload workers
    for (let i = 0; i < CONCURRENT_UPLOADS; i++) {
      uploadPromises.push(uploadNext());
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    info(`[Upload] Batch complete: ${successCount} succeeded, ${failedUploads.length} failed`);

    // Auto-retry failed uploads (up to 5 attempts)
    const MAX_RETRIES = 5;
    let remainingFailures = failedUploads.length;
    
    if (failedUploads.length > 0) {
      info(`[Upload] 🔄 Auto-retrying ${failedUploads.length} failed uploads...`);
      
      for (const failed of failedUploads) {
        let uploaded = false;
        let currentRetry = 1;
        
        info(`[Upload] Starting retry loop for ${failed.img.filename}`);
        
        while (!uploaded && currentRetry <= MAX_RETRIES) {
          try {
            info(`[Upload] Attempt ${currentRetry}/${MAX_RETRIES} for ${failed.img.filename}...`);
            await uploadSingleImage(failed.img.file, failed.img.filename, albumName, currentRetry);
            successCount++;
            remainingFailures--;
            uploaded = true;
            info(`[Upload] ✓ Retry ${currentRetry}/${MAX_RETRIES} succeeded for ${failed.img.filename}`);
          } catch (err) {
            info(`[Upload] ✗ Retry ${currentRetry}/${MAX_RETRIES} failed for ${failed.img.filename}`);
            if (currentRetry === MAX_RETRIES) {
              error(`[Upload] ✗ All ${MAX_RETRIES} retries exhausted for ${failed.img.filename}`);
            }
            currentRetry++;
          }
        }
      }
      
      if (remainingFailures > 0) {
        info(`[Upload] ⚠️  ${remainingFailures} images failed after ${MAX_RETRIES} retry attempts`);
      } else {
        info(`[Upload] ✅ All failed uploads recovered via auto-retry!`);
      }
    }

    // Reload albums to update photo counts
    await loadAlbums();
    
    // Regenerate static JSON once after the entire batch (instead of after each image)
    if (successCount > 0) {
      try {
        await fetch(`${API_URL}/api/static-json/regenerate`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (err) {
        error(`[Upload] Failed to regenerate static JSON:`, err);
      }
    }
  };


  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Get selected album name from URL or prompt
    const albumName = new URLSearchParams(window.location.search).get('album');
    if (!albumName) {
      setMessage({ type: 'error', text: 'No album selected' });
      return;
    }
    
    await handleUploadToAlbum(albumName, Array.from(files));
    e.target.value = ''; // Reset input
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const validation = validateImageFiles(files);
    
    if (validation.valid.length === 0) {
      setMessage({ type: 'error', text: t('albumsManager.noValidImageFiles') });
      return;
    }
    
    // Handle file drop
  };

  // Manual retry for a single failed image
  const handleRetryUpload = async (filename: string, albumName: string): Promise<void> => {
    const img = props.uploadingImagesRef.current?.find((i) => i.filename === filename);
    if (!img || img.state !== 'error') {
      error(`Cannot retry ${filename}: image not found or not in error state`);
      return;
    }
    
    const currentRetryCount = img.retryCount || 0;
    const MAX_RETRIES = 5;
    
    if (currentRetryCount >= MAX_RETRIES) {
      setMessage({ type: 'error', text: `Maximum retry attempts (${MAX_RETRIES}) reached for ${filename}` });
      return;
    }
    
    try {
      await uploadSingleImage(img.file, filename, albumName, currentRetryCount + 1);
      setMessage({ type: 'success', text: `Successfully uploaded ${filename}` });
      await loadAlbums(); // Refresh album list
    } catch (err) {
      error(`[Upload] Manual retry failed for ${filename}:`, err);
      setMessage({ type: 'error', text: `Retry failed for ${filename}` });
    }
  };

  return {
    handleUploadToAlbum,
    handleUploadPhotos,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    uploadSingleImage,
    handleRetryUpload,
  };
};

