/**
 * Upload Handlers
 * Handles photo uploads, drag-and-drop file uploads
 */

import { UploadingImage } from '../types';
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
  loadPhotos: (albumName: string) => Promise<void>;
}

export const createUploadHandlers = (props: UploadHandlersProps) => {
  const {
    // uploadingImages, // not used directly, managed via setUploadingImages
    setUploadingImages,
    // uploadingImagesRef, // not used directly
    selectAlbum,
    setMessage,
    loadAlbums,
    loadPhotos,
  } = props;

  // Upload single image with SSE progress tracking
  const uploadSingleImage = async (
    file: File,
    filename: string,
    albumName: string
  ): Promise<void> => {
    // Update state to 'uploading' when we start
    setUploadingImages((prev: UploadingImage[]): UploadingImage[] =>
      prev.map((img: UploadingImage): UploadingImage =>
        img.filename === filename
          ? { ...img, state: 'uploading', progress: 0 }
          : img
      )
    );
    
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('photo', file, filename);
      
      let uploadResolved = false;

      fetch(`${API_URL}/api/albums/${encodeURIComponent(albumName)}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Upload failed with status ${response.status}`);
        }

        // Response is SSE stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';

        // Continue reading SSE stream in background
        const processStream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process SSE messages
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || ''; // Keep incomplete message in buffer
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.substring(6));
                
                setUploadingImages((prev: UploadingImage[]): UploadingImage[] =>
                  prev.map((img: UploadingImage): UploadingImage =>
                    img.filename === filename
                      ? {
                          ...img,
                          state: data.type === 'complete' ? 'complete' : 
                                 data.type === 'error' ? 'error' :
                                 data.type === 'ai-generating' ? 'generating-title' :
                                 data.type === 'progress' ? 'optimizing' :
                                 data.type === 'uploaded' ? 'optimizing' : 'uploading',
                          progress: 100,
                          optimizeProgress: data.type === 'progress' ? data.progress : 
                                           data.type === 'complete' ? 100 : 0,
                          error: data.error,
                          // Switch from blob to real thumbnail when complete
                          thumbnailUrl: data.type === 'complete' 
                            ? `${API_URL}/optimized/thumbnail/${encodeURIComponent(albumName)}/${encodeURIComponent(filename)}?i=0`
                            : img.thumbnailUrl,
                        }
                      : img
                  )
                );

                // Resolve promise as soon as file is uploaded (don't wait for optimization)
                if (data.type === 'uploaded' && !uploadResolved) {
                  uploadResolved = true;
                  console.log(`✅ File uploaded: ${filename}, optimization will continue in background`);
                  resolve();
                  // Continue processing SSE events in background
                }
                
                // Track analytics when complete
                if (data.type === 'complete') {
                  trackPhotoUploaded(albumName, 1, [filename]);
                  return; // Exit stream processing
                } else if (data.type === 'error') {
                  if (!uploadResolved) {
                    reject(new Error(data.error || 'Upload failed'));
                  } else {
                    // Upload succeeded but optimization failed - just log it
                    console.error(`❌ Optimization failed for ${filename}:`, data.error);
                  }
                  return; // Exit stream processing
                }
              }
            }
          }
        };

        // Process stream in background
        processStream().catch(err => {
          console.error(`SSE stream error for ${filename}:`, err);
        });
        
      }).catch(err => {
        if (!uploadResolved) {
          reject(err);
        }
      });
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

    // Upload each file sequentially (but don't wait for optimization)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📤 Uploading file ${i + 1}/${files.length}: ${file.name}`);
      try {
        await uploadSingleImage(file, file.name, albumName);
        console.log(`✅ File uploaded: ${file.name} (optimization continues in background)`);
      } catch (error) {
        console.error(`❌ Failed to upload ${file.name}:`, error);
        // Continue with next file even if one fails
      }
    }

    // All files uploaded - optimization continues asynchronously
    console.log(`✅ All ${files.length} files uploaded. Optimization continues in background...`);
    
    // Reload albums and photos to show newly uploaded images immediately
    await Promise.all([
      loadAlbums(),
      loadPhotos(albumName)
    ]);
    
    // Poll to check if all optimizations are complete before clearing
    const checkComplete = () => {
      setUploadingImages(prev => {
        const allComplete = prev.every(img => img.state === 'complete' || img.state === 'error');
        if (allComplete) {
          // Clear after showing completion state briefly
          setTimeout(() => setUploadingImages([]), 1500);
          return prev;
        }
        // Check again in 500ms
        setTimeout(checkComplete, 500);
        return prev;
      });
    };
    
    // Start checking after a short delay to let first optimization messages arrive
    setTimeout(checkComplete, 1000);
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

