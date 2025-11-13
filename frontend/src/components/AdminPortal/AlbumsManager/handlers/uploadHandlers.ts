/**
 * Upload Handlers
 * Handles photo uploads, drag-and-drop file uploads
 */

import { UploadingImage, UploadState } from '../types';
import { trackPhotoUploaded } from '../../../../utils/analytics';
import { validateImageFiles } from '../utils/albumHelpers';

const API_URL = import.meta.env.VITE_API_URL || '';

interface UploadHandlersProps {
  uploadingImages: UploadingImage[];
  setUploadingImages: React.Dispatch<React.SetStateAction<UploadingImage[]>>;
  uploadingImagesRef: React.MutableRefObject<UploadingImage[]>;
  selectAlbum: (albumName: string) => void;
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
  loadAlbums: () => Promise<void>;
}

export const createUploadHandlers = (props: UploadHandlersProps) => {
  const {
    // uploadingImages, // not used directly, managed via setUploadingImages
    setUploadingImages,
    // uploadingImagesRef, // not used directly
    selectAlbum,
    setMessage,
    loadAlbums,
  } = props;

  // Upload single image with SSE progress tracking
  const uploadSingleImage = async (
    file: File,
    filename: string,
    albumName: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('photos', file, filename);

      // Listen to SSE for this upload
      const eventSource = new EventSource(
        `${API_URL}/api/upload-progress?filename=${encodeURIComponent(filename)}`
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        setUploadingImages((prev: UploadingImage[]): UploadingImage[] =>
          prev.map((img: UploadingImage): UploadingImage =>
            img.filename === filename
              ? {
                  ...img,
                  state: data.state,
                  progress: data.progress,
                  optimizeProgress: data.optimizeProgress,
                  error: data.error,
                }
              : img
          )
        );

        if (data.state === 'complete' || data.state === 'error') {
          eventSource.close();
          if (data.state === 'complete') {
            trackPhotoUploaded(albumName, 1, [filename]);
            resolve();
          } else {
            reject(new Error(data.error || 'Upload failed'));
          }
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        reject(new Error('SSE connection failed'));
      };

      xhr.open('POST', `${API_URL}/api/albums/${encodeURIComponent(albumName)}/photos`);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadingImages((prev: UploadingImage[]): UploadingImage[] =>
            prev.map((img: UploadingImage): UploadingImage =>
              img.filename === filename
                ? { ...img, progress: percentComplete, state: 'uploading' as UploadState }
                : img
            )
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status !== 200) {
          eventSource.close();
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        eventSource.close();
        reject(new Error('Network error during upload'));
      };

      xhr.send(formData);
    });
  };

  const handleUploadToAlbum = async (albumName: string, files: File[]): Promise<void> => {
    if (files.length === 0) return;

    console.log(`📤 Starting upload of ${files.length} files to album: ${albumName}`);

    // Prepare uploading images
    const newUploadingImages: UploadingImage[] = files.map(file => ({
      file,
      filename: file.name,
      state: 'queued' as const,
      thumbnailUrl: URL.createObjectURL(file)
    }));

    setUploadingImages(newUploadingImages);
    selectAlbum(albumName);

    // Upload each file - SSE events will handle state updates
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📤 Uploading file ${i + 1}/${files.length}: ${file.name}`);
      try {
        await uploadSingleImage(file, file.name, albumName);
        console.log(`✅ Upload initiated for: ${file.name}`);
      } catch (error) {
        console.error(`❌ Failed to upload ${file.name}:`, error);
        // Continue with next file even if one fails
      }
    }

    // All uploads initiated - SSE events will update state and trigger reload
    console.log(`✅ All uploads initiated. Processing will complete via SSE events...`);
    await loadAlbums();
  };

  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = e.target.files;
    if (!files) return;
    
    // Handle upload logic here
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

  return {
    handleUploadToAlbum,
    handleUploadPhotos,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    uploadSingleImage,
  };
};

