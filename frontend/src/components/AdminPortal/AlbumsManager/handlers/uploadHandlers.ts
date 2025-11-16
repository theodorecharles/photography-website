/**
 * Upload Handlers
 * Handles photo uploads, drag-and-drop file uploads
 */

import { UploadingImage } from '../types';
import { validateImageFiles } from '../utils/albumHelpers';

const API_URL = import.meta.env.VITE_API_URL || '';

interface UploadHandlersProps {
  uploadingImages: UploadingImage[];
  setUploadingImages: React.Dispatch<React.SetStateAction<UploadingImage[]>>;
  uploadingImagesRef: React.RefObject<UploadingImage[]>;
  selectAlbum: (albumName: string) => void;
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
  loadAlbums: () => Promise<void>;
}

export const createUploadHandlers = (props: UploadHandlersProps) => {
  const {
    // uploadingImages, // not used directly, managed via setUploadingImages
    setUploadingImages,
    // uploadingImagesRef, // not used directly
    setMessage,
    loadAlbums,
    // setAlbumPhotos, // no longer used - photos stay in uploadingImages until complete
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
              console.log(`✅ File uploaded: ${filename}, optimization continues in background`);
              
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
          setUploadingImages((prev: UploadingImage[]): UploadingImage[] =>
            prev.map((img: UploadingImage): UploadingImage =>
              img.filename === filename
                ? { ...img, state: 'error', error: `Upload failed: ${xhr.status}` }
                : img
            )
          );
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => {
        setUploadingImages((prev: UploadingImage[]): UploadingImage[] =>
          prev.map((img: UploadingImage): UploadingImage =>
            img.filename === filename
              ? { ...img, state: 'error', error: 'Network error' }
              : img
          )
        );
        reject(new Error('Network error'));
      };
      
      xhr.ontimeout = () => {
        setUploadingImages((prev: UploadingImage[]): UploadingImage[] =>
          prev.map((img: UploadingImage): UploadingImage =>
            img.filename === filename
              ? { ...img, state: 'error', error: 'Upload timed out' }
              : img
          )
        );
        reject(new Error('Upload timed out'));
      };
      
      xhr.open('POST', `${API_URL}/api/albums/${encodeURIComponent(albumName)}/upload`);
      xhr.send(formData);
    }).catch((err) => {
      console.error(`Upload failed for ${filename}:`, err);
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

    console.log(`[Upload] Starting upload of ${validation.valid.length} files to album "${albumName}"`);

    // Initialize uploading images with upload index for ordering
    const newUploadingImages: UploadingImage[] = validation.valid.map((file, index) => ({
      filename: file.name,
      state: 'queued' as const,
      file,
      uploadIndex: index, // Track original position
    }));

    setUploadingImages(newUploadingImages);

    let successCount = 0;
    let errorCount = 0;

    // Upload images one-by-one (fast as possible)
    // uploadSingleImage resolves as soon as upload finishes, 
    // optimization/AI continues in background
    for (const img of newUploadingImages) {
      try {
        await uploadSingleImage(img.file, img.filename, albumName);
        successCount++;
        console.log(`[Upload] Progress: ${successCount}/${validation.valid.length} uploaded successfully`);
        // Next upload starts immediately after previous file is uploaded
        // (doesn't wait for optimization or AI)
      } catch (err) {
        errorCount++;
        console.error(`[Upload] Error (${errorCount} total errors):`, err);
        // Continue with next upload even if one fails
      }
    }

    console.log(`[Upload] Batch complete: ${successCount} succeeded, ${errorCount} failed`);

    // Auto-retry failed uploads (up to 5 attempts)
    if (errorCount > 0) {
      console.log(`[Upload] Retrying ${errorCount} failed uploads...`);
      const MAX_RETRIES = 5;
      
      // Get list of failed images
      const failedImages = newUploadingImages.filter((img) => {
        const current = props.uploadingImagesRef.current?.find((i) => i.filename === img.filename);
        return current?.state === 'error' && (current?.retryCount || 0) < MAX_RETRIES;
      });
      
      for (const img of failedImages) {
        const current = props.uploadingImagesRef.current?.find((i) => i.filename === img.filename);
        const currentRetryCount = current?.retryCount || 0;
        
        if (currentRetryCount < MAX_RETRIES) {
          try {
            console.log(`[Upload] Retry ${currentRetryCount + 1}/${MAX_RETRIES}: ${img.filename}`);
            await uploadSingleImage(img.file, img.filename, albumName, currentRetryCount + 1);
            successCount++;
            errorCount--;
          } catch (err) {
            console.error(`[Upload] Retry failed for ${img.filename}:`, err);
          }
        }
      }
      
      console.log(`[Upload] After retries: ${successCount} succeeded, ${errorCount} failed`);
    }

    // Reload albums to update photo counts
    await loadAlbums();
    
    // Regenerate static JSON once after the entire batch (instead of after each image)
    if (successCount > 0) {
      try {
        console.log(`[Upload] Regenerating static JSON after batch upload...`);
        const response = await fetch(`${API_URL}/api/static-json/regenerate`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          console.log(`[Upload] ✓ Static JSON regenerated`);
        }
      } catch (err) {
        console.error(`[Upload] Failed to regenerate static JSON:`, err);
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
      setMessage({ type: 'error', text: 'No valid image files found' });
      return;
    }
    
    // Handle file drop
  };

  // Manual retry for a single failed image
  const handleRetryUpload = async (filename: string, albumName: string): Promise<void> => {
    const img = props.uploadingImagesRef.current?.find((i) => i.filename === filename);
    if (!img || img.state !== 'error') {
      console.error(`Cannot retry ${filename}: image not found or not in error state`);
      return;
    }
    
    const currentRetryCount = img.retryCount || 0;
    const MAX_RETRIES = 5;
    
    if (currentRetryCount >= MAX_RETRIES) {
      setMessage({ type: 'error', text: `Maximum retry attempts (${MAX_RETRIES}) reached for ${filename}` });
      return;
    }
    
    try {
      console.log(`[Upload] Manual retry ${currentRetryCount + 1}/${MAX_RETRIES}: ${filename}`);
      await uploadSingleImage(img.file, filename, albumName, currentRetryCount + 1);
      setMessage({ type: 'success', text: `Successfully uploaded ${filename}` });
      await loadAlbums(); // Refresh album list
    } catch (err) {
      console.error(`[Upload] Manual retry failed for ${filename}:`, err);
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

