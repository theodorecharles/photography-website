/**
 * Albums Manager Component  
 * Manages photo albums, photo uploads, and image optimization settings
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Album, Photo } from './types';
import { 
  trackAlbumCreated,
  trackAlbumDeleted,
  trackPhotoUploaded,
  trackPhotoDeleted
} from '../../utils/analytics';
import { cacheBustValue } from '../../config';
import './AlbumsManager.css';

const API_URL = import.meta.env.VITE_API_URL || '';

type UploadState = 'queued' | 'uploading' | 'optimizing' | 'complete' | 'error';

interface UploadingImage {
  file: File;
  filename: string;
  state: UploadState;
  thumbnailUrl?: string;
  error?: string;
  progress?: number;
  optimizeProgress?: number; // 0-100 for optimization progress
}

interface AlbumsManagerProps {
  albums: Album[];
  loadAlbums: () => Promise<void>;
  setMessage: (message: { type: 'success' | 'error'; text: string } | null) => void;
}

const AlbumsManager: React.FC<AlbumsManagerProps> = ({
  albums,
  loadAlbums,
  setMessage,
}) => {
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const uploadingImagesRef = useRef<UploadingImage[]>([]);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(() => {
    // Restore selected album from sessionStorage on mount
    return sessionStorage.getItem('selectedAlbum');
  });
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
  const [photoTitles, setPhotoTitles] = useState<Record<string, string | null>>({});
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMainDropZoneDragging, setIsMainDropZoneDragging] = useState(false);

  // Keep ref in sync with state
  useEffect(() => {
    uploadingImagesRef.current = uploadingImages;
  }, [uploadingImages]);

  // Persist selected album to sessionStorage whenever it changes
  useEffect(() => {
    if (selectedAlbum) {
      sessionStorage.setItem('selectedAlbum', selectedAlbum);
    } else {
      sessionStorage.removeItem('selectedAlbum');
    }
  }, [selectedAlbum]);

  // Load photos when album is selected
  useEffect(() => {
    if (selectedAlbum) {
      loadPhotos(selectedAlbum);
    }
  }, [selectedAlbum]);

  const loadPhotos = async (albumName: string) => {
    try {
      const res = await fetch(`${API_URL}/api/albums/${albumName}/photos`, {
        credentials: 'include',
      });
      const photos = await res.json();
      setAlbumPhotos(photos);
      
      // Load AI titles for all photos
      loadPhotoTitles(albumName, photos);
    } catch (err) {
      console.error('Failed to load photos:', err);
      setAlbumPhotos([]); // Set to empty array on error to prevent map errors
    }
  };

  const loadPhotoTitles = async (albumName: string, photos: Photo[]) => {
    const titles: Record<string, string | null> = {};
    
    for (const photo of photos) {
      try {
        const filename = photo.id.split('/').pop();
        const res = await fetch(`${API_URL}/api/image-metadata/${albumName}/${filename}`, {
          credentials: 'include',
        });
        
        if (res.ok) {
          const data = await res.json();
          titles[photo.id] = data.title || null;
        } else {
          titles[photo.id] = null;
        }
      } catch (err) {
        titles[photo.id] = null;
      }
    }
    
    setPhotoTitles(titles);
  };

  const handleOpenEditModal = (photo: Photo) => {
    setEditingPhoto(photo);
    setEditTitleValue(photoTitles[photo.id] || '');
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingPhoto(null);
    setEditTitleValue('');
  };

  const handleSaveTitle = async () => {
    if (!editingPhoto) return;

    const filename = editingPhoto.id.split('/').pop();
    const album = editingPhoto.album;

    try {
      const res = await fetch(`${API_URL}/api/image-metadata/${album}/${filename}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: editTitleValue || null, description: null }),
      });

      if (res.ok) {
        setPhotoTitles(prev => ({ ...prev, [editingPhoto.id]: editTitleValue || null }));
        setMessage({ type: 'success', text: 'Title updated successfully!' });
        handleCloseEditModal();
      } else {
        setMessage({ type: 'error', text: 'Failed to update title' });
      }
    } catch (err) {
      console.error('Failed to save title:', err);
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) return;

    try {
      const albumName = newAlbumName.trim();
      const res = await fetch(`${API_URL}/api/albums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: albumName }),
      });

      if (res.ok) {
        const displayName = newAlbumName;
        setNewAlbumName('');
        trackAlbumCreated(displayName);
        
        // Select the album immediately - sessionStorage will persist it across refresh
        setSelectedAlbum(albumName);
        setMessage({ type: 'success', text: `Album "${displayName}" created!` });
        
        // Trigger refresh of header navigation
        await loadAlbums();
        window.dispatchEvent(new Event('albums-updated'));
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to create album' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };

  const handleDeleteAlbum = async (albumName: string) => {
    if (!confirm(`Delete album "${albumName}" and all its photos?`)) return;

    try {
      const res = await fetch(`${API_URL}/api/albums/${albumName}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `Album "${albumName}" deleted` });
        trackAlbumDeleted(albumName);
        if (selectedAlbum === albumName) setSelectedAlbum(null);
        await loadAlbums();
        window.dispatchEvent(new Event('albums-updated'));
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to delete album' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };

  const uploadSingleImage = async (file: File, filename: string, targetAlbum?: string): Promise<void> => {
    const albumToUse = targetAlbum || selectedAlbum;
    // Check file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      setUploadingImages(prev => prev.map(img => 
        img.filename === filename 
          ? { ...img, state: 'error' as UploadState, error: 'File too large (max 100MB)' }
          : img
      ));
      setMessage({ type: 'error', text: `Error: ${filename} is too large (max 100MB)` });
      return;
    }
    
    // Update state to uploading
    setUploadingImages(prev => prev.map(img => 
      img.filename === filename ? { ...img, state: 'uploading' as UploadState } : img
    ));

      try {
        const formData = new FormData();
        formData.append('photo', file);

        // Use XMLHttpRequest for upload progress and SSE response
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          let uploadComplete = false;
          
          // Track upload progress
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percentComplete = Math.round((e.loaded / e.total) * 100);
              setUploadingImages(prev => prev.map(img => 
                img.filename === filename ? { ...img, progress: percentComplete } : img
              ));
            }
          });

          // Handle SSE response stream
          xhr.addEventListener('readystatechange', () => {
            if (xhr.readyState === XMLHttpRequest.LOADING || xhr.readyState === XMLHttpRequest.DONE) {
              const responseText = xhr.responseText;
              const lines = responseText.split('\n');
              
              lines.forEach((line) => {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.substring(6));
                    
                    if (data.type === 'uploaded') {
                      // Upload complete, start optimizing
                      setUploadingImages(prev => prev.map(img => 
                        img.filename === filename 
                          ? { ...img, state: 'optimizing' as UploadState, progress: 100, optimizeProgress: 0 } 
                          : img
                      ));
                      // Resolve immediately after upload completes
                      // Optimization will continue in background
                      if (!uploadComplete) {
                        uploadComplete = true;
                        resolve();
                      }
                    } else if (data.type === 'progress') {
                      // Update optimization progress (in background)
                      setUploadingImages(prev => prev.map(img => 
                        img.filename === filename 
                          ? { ...img, optimizeProgress: data.progress } 
                          : img
                      ));
                    } else if (data.type === 'complete') {
                      // Optimization complete (in background)
                      const thumbnailUrl = `${API_URL}/optimized/thumbnail/${albumToUse}/${filename}?i=${Date.now()}`;
                      setUploadingImages(prev => prev.map(img => 
                        img.filename === filename 
                          ? { ...img, state: 'complete' as UploadState, thumbnailUrl, optimizeProgress: 100 } 
                          : img
                      ));
                      trackPhotoUploaded(albumToUse!, 1, [filename]);
                    } else if (data.type === 'error') {
                      // Error occurred
                      setUploadingImages(prev => prev.map(img => 
                        img.filename === filename 
                          ? { ...img, state: 'error' as UploadState, error: data.error } 
                          : img
                      ));
                      setMessage({ type: 'error', text: `Error processing ${filename}: ${data.error}` });
                      if (!uploadComplete) {
                        uploadComplete = true;
                        reject(new Error(data.error));
                      }
                    }
                  } catch (e) {
                    // Ignore parse errors for incomplete data
                  }
                }
              });
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Network error occurred'));
          });

          xhr.open('POST', `${API_URL}/api/albums/${albumToUse}/upload`);
          xhr.withCredentials = true;
          xhr.send(formData);
        });
    } catch (err: any) {
      setUploadingImages(prev => prev.map(img => 
        img.filename === filename 
          ? { ...img, state: 'error' as UploadState, error: err.message || 'Network error' }
          : img
      ));
      setMessage({ type: 'error', text: `Error uploading ${filename}: ${err.message || 'Network error'}` });
    }
  };

  const processFiles = async (files: FileList | File[], targetAlbum?: string) => {
    const albumToUse = targetAlbum || selectedAlbum;
    if (!files || files.length === 0 || !albumToUse) return;

    // Filter for image files only
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      setMessage({ type: 'error', text: 'No valid image files selected' });
      return;
    }

    if (imageFiles.length < files.length) {
      setMessage({ type: 'error', text: `${files.length - imageFiles.length} non-image file(s) skipped` });
    }

    // Initialize all files as queued
    const newUploadingImages: UploadingImage[] = imageFiles.map(file => ({
      file,
      filename: file.name,
      state: 'queued' as UploadState,
      progress: 0
    }));
    
    setUploadingImages(newUploadingImages);

    // Upload files sequentially (one at a time)
    // But let optimizations run in parallel in the background
    for (const img of newUploadingImages) {
      await uploadSingleImage(img.file, img.filename, albumToUse);
      // Note: uploadSingleImage starts optimization in background (non-blocking)
      // So multiple optimizations can run simultaneously while we upload the next file
    }

    // Wait for all optimizations to complete
    // Check every second until all images are done (complete or error)
    await new Promise<void>((resolve) => {
      const checkComplete = setInterval(() => {
        const allDone = uploadingImagesRef.current.every(img => 
          img.state === 'complete' || img.state === 'error'
        );
        
        if (allDone) {
          clearInterval(checkComplete);
          resolve();
        }
      }, 1000);
      
      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(checkComplete);
        resolve();
      }, 120000);
    });

    // Reload photos after all uploads and optimizations complete
    if (albumToUse) {
      await loadPhotos(albumToUse);
    }

    // Clear uploading images after reload to prevent duplicates
    setUploadingImages([]);
    
    setMessage({ type: 'success', text: `Upload complete! Processed ${newUploadingImages.length} image(s)` });
  };

  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    await processFiles(files);
    
    // Clear the input
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!selectedAlbum || uploadingImages.length > 0) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  // Recursively read all files from a directory entry
  const readDirectoryRecursive = async (dirEntry: any): Promise<File[]> => {
    const files: File[] = [];
    const dirReader = dirEntry.createReader();
    
    return new Promise((resolve) => {
      const readEntries = () => {
        dirReader.readEntries(async (entries: any[]) => {
          if (entries.length === 0) {
            resolve(files);
            return;
          }

          for (const entry of entries) {
            if (entry.isFile) {
              // Get the file
              const file: File = await new Promise((resolveFile) => {
                entry.file((f: File) => resolveFile(f));
              });
              
              // Only add image files
              if (file.type.startsWith('image/')) {
                files.push(file);
              }
            } else if (entry.isDirectory) {
              // Recursively read subdirectory
              const subFiles = await readDirectoryRecursive(entry);
              files.push(...subFiles);
            }
          }

          // Read next batch of entries
          readEntries();
        });
      };

      readEntries();
    });
  };

  // Process dropped items (handles folders)
  const processDroppedItems = async (items: DataTransferItemList): Promise<{ files: File[], folderName: string | null }> => {
    const allFiles: File[] = [];
    let folderName: string | null = null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        
        if (entry) {
          if (entry.isDirectory) {
            // It's a folder - get the folder name
            if (!folderName) {
              folderName = entry.name;
            }
            // Recursively read all files
            const files = await readDirectoryRecursive(entry);
            allFiles.push(...files);
          } else if (entry.isFile) {
            // It's a single file
            const file = item.getAsFile();
            if (file && file.type.startsWith('image/')) {
              allFiles.push(file);
            }
          }
        }
      }
    }

    return { files: allFiles, folderName };
  };

  const handleMainDropZoneDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMainDropZoneDragging(true);
  };

  const handleMainDropZoneDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're actually leaving the drop zone (not entering a child)
    if (e.currentTarget === e.target) {
      setIsMainDropZoneDragging(false);
    }
  };

  const handleMainDropZoneDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMainDropZoneDragging(false);

    if (uploadingImages.length > 0) {
      setMessage({ type: 'error', text: 'Upload already in progress' });
      return;
    }

    // Process dropped items (handles folders and files)
    const { files: imageFiles, folderName } = await processDroppedItems(e.dataTransfer.items);
    
    if (imageFiles.length === 0) {
      setMessage({ type: 'error', text: 'No image files found in dropped folder' });
      return;
    }

    // If album is selected, upload to that album
    if (selectedAlbum) {
      await processFiles(imageFiles);
      return;
    }

    // No album selected - try to create one from folder name
    if (!folderName) {
      setMessage({ type: 'error', text: 'Please drag a folder or select an album first' });
      return;
    }

    // Create the album
    const albumName = folderName.trim();
    
    try {
      const res = await fetch(`${API_URL}/api/albums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: albumName }),
      });

      if (!res.ok) {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to create album' });
        return;
      }

      // Album created successfully
      trackAlbumCreated(folderName);
      setSelectedAlbum(albumName);
      setMessage({ type: 'success', text: `Album "${folderName}" created! Uploading ${imageFiles.length} image(s)...` });
      
      // Load albums locally (don't dispatch event yet - it would cause a refresh and interrupt upload)
      await loadAlbums();

      // Upload the files with the newly created album name
      await processFiles(imageFiles, albumName);
      
      // NOW trigger global refresh after uploads complete
      window.dispatchEvent(new Event('albums-updated'));
      
    } catch (err) {
      console.error('Failed to create album:', err);
      setMessage({ type: 'error', text: 'Failed to create album' });
    }
  };

  const handleDeletePhoto = async (album: string, filename: string, photoTitle: string = '') => {
    if (!confirm(`Delete this photo?`)) return;

    try {
      const res = await fetch(`${API_URL}/api/albums/${album}/photos/${filename}`, {
        method: 'DELETE',
        credentials: 'include',
      });

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
  };


  return (
    <>
      <section className="admin-section">
        <h2>📸 Albums & Photos</h2>
        <p className="section-description">Manage your photo albums and upload new images</p>
        
        <div className="albums-management">
          <div className="create-album-section">
            <div className="create-album">
              <h3>Create New Album</h3>
              <div className="album-input-group">
              <input
                type="text"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="Album name (e.g., Nature Photos, Street Portraits)"
                className="branding-input"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateAlbum()}
              />
                <button 
                  onClick={handleCreateAlbum}
                  className="btn-primary"
                >
                  Create Album
                </button>
              </div>
            </div>

            <div 
              className={`main-drop-zone ${isMainDropZoneDragging ? 'dragging' : ''} ${uploadingImages.length > 0 ? 'disabled' : ''}`}
              onDragOver={uploadingImages.length > 0 ? undefined : handleMainDropZoneDragOver}
              onDragLeave={uploadingImages.length > 0 ? undefined : handleMainDropZoneDragLeave}
              onDrop={uploadingImages.length > 0 ? undefined : handleMainDropZoneDrop}
            >
              <div className="drop-zone-icon">📁</div>
              <div className="drop-zone-text">
                <strong>{uploadingImages.length > 0 ? 'Upload in progress...' : 'Drop folder here'}</strong>
                <span className="drop-zone-hint">
                  {uploadingImages.length > 0 
                    ? 'Please wait for current upload to complete'
                    : selectedAlbum 
                      ? `Add images to "${selectedAlbum}"` 
                      : 'Create album from folder name'}
                </span>
              </div>
            </div>
          </div>

          <div className="albums-list">
            <h3>Your Albums ({albums.length})</h3>
            {albums.length === 0 ? (
              <p style={{ color: '#888', marginTop: '1rem' }}>
                No albums yet. Create one to get started!
              </p>
            ) : (
              <div className="album-grid">
                {albums.map((album) => (
                  <div 
                    key={album.name} 
                    className={`album-card ${selectedAlbum === album.name ? 'selected' : ''}`}
                    onClick={() => setSelectedAlbum(selectedAlbum === album.name ? null : album.name)}
                  >
                    <div className="album-card-header">
                      <h4>{album.name}</h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAlbum(album.name);
                        }}
                        className="btn-delete-small"
                        title="Delete album"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedAlbum && (
            <div 
              className={`album-photos ${isDragging ? 'drag-over' : ''}`}
              onDragOver={uploadingImages.length > 0 ? undefined : handleDragOver}
              onDragLeave={uploadingImages.length > 0 ? undefined : handleDragLeave}
              onDrop={uploadingImages.length > 0 ? undefined : handleDrop}
            >
              <div className="photos-header">
                <h3>Photos in "{selectedAlbum}"</h3>
                <div className="upload-controls">
                  <label className="btn-primary upload-btn">
                    {uploadingImages.length > 0 ? 'Uploading...' : '+ Upload Photos'}
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleUploadPhotos}
                      disabled={uploadingImages.length > 0}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {isDragging && uploadingImages.length === 0 && (
                <div className="drop-overlay">
                  <div className="drop-overlay-content">
                    <div className="drop-icon">📁</div>
                    <p>Drop images here to upload</p>
                  </div>
                </div>
              )}

              {uploadingImages.length > 0 && (
                <div className="upload-progress-container">
                  <div className="upload-progress-info">
                    <span className="upload-progress-percent">
                      {uploadingImages.filter(img => img.state === 'complete' || img.state === 'error').length} / {uploadingImages.length} complete
                    </span>
                  </div>
                  <div className="upload-progress-bar">
                    <div 
                      className="upload-progress-fill"
                      style={{ 
                        width: `${(uploadingImages.filter(img => img.state === 'complete' || img.state === 'error').length / uploadingImages.length) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Show error summary at the top */}
              {uploadingImages.some(img => img.state === 'error') && (
                <div className="upload-errors-summary">
                  <div className="errors-summary-header">
                    <span className="error-icon">⚠️</span>
                    <strong>Failed Uploads ({uploadingImages.filter(img => img.state === 'error').length})</strong>
                  </div>
                  <div className="error-files-list">
                    {uploadingImages
                      .filter(img => img.state === 'error')
                      .map((img, idx) => (
                        <div key={`error-${idx}`} className="error-file-item">
                          <div className="error-file-info">
                            <span className="error-filename">{img.filename}</span>
                            <span className="error-reason">{img.error || 'Upload failed'}</span>
                          </div>
                          <button
                            className="error-dismiss-btn"
                            onClick={() => {
                              setUploadingImages(prev => prev.filter(i => i.filename !== img.filename));
                            }}
                            title="Dismiss"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {albumPhotos.length === 0 && uploadingImages.length === 0 ? (
                <p style={{ color: '#888', marginTop: '1rem' }}>
                  No photos in this album yet. Upload some to get started!
                </p>
              ) : (
                <div className="photos-grid">
                  {/* Show uploading images first */}
                  {uploadingImages.map((img, idx) => (
                    <div key={`uploading-${idx}`} className="admin-photo-item uploading-photo-item">
                      {img.state === 'queued' && (
                        <div className="photo-state-overlay">
                          <div className="state-icon">⏳</div>
                          <span className="state-text">Queued</span>
                        </div>
                      )}
                      {img.state === 'uploading' && (
                        <div className="photo-state-overlay">
                          <div className="progress-circle">
                            <svg className="progress-ring" width="60" height="60">
                              <circle
                                className="progress-ring-circle-bg"
                                stroke="rgba(255, 255, 255, 0.1)"
                                strokeWidth="4"
                                fill="transparent"
                                r="26"
                                cx="30"
                                cy="30"
                              />
                              <circle
                                className="progress-ring-circle"
                                stroke="var(--primary-color)"
                                strokeWidth="4"
                                fill="transparent"
                                r="26"
                                cx="30"
                                cy="30"
                                strokeDasharray={`${2 * Math.PI * 26}`}
                                strokeDashoffset={`${2 * Math.PI * 26 * (1 - (img.progress || 0) / 100)}`}
                                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                              />
                            </svg>
                            <span className="progress-percentage">{img.progress}%</span>
                          </div>
                          <span className="state-text">Uploading...</span>
                        </div>
                      )}
                      {img.state === 'optimizing' && (
                        <div className="photo-state-overlay">
                          <div className="progress-circle">
                            <svg className="progress-ring" width="60" height="60">
                              <circle
                                className="progress-ring-circle-bg"
                                stroke="rgba(255, 255, 255, 0.1)"
                                strokeWidth="4"
                                fill="transparent"
                                r="26"
                                cx="30"
                                cy="30"
                              />
                              <circle
                                className="progress-ring-circle"
                                stroke="var(--primary-color)"
                                strokeWidth="4"
                                fill="transparent"
                                r="26"
                                cx="30"
                                cy="30"
                                strokeDasharray={`${2 * Math.PI * 26}`}
                                strokeDashoffset={`${2 * Math.PI * 26 * (1 - (img.optimizeProgress || 0) / 100)}`}
                                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                              />
                            </svg>
                            <span className="progress-percentage">{img.optimizeProgress || 0}%</span>
                          </div>
                          <span className="state-text">Optimizing...</span>
                        </div>
                      )}
                      {img.state === 'complete' && img.thumbnailUrl && (
                        <>
                          <img 
                            src={img.thumbnailUrl}
                            alt={img.filename}
                            className="admin-photo-thumbnail"
                          />
                          <div className="photo-complete-badge">✓</div>
                        </>
                      )}
                      {img.state === 'error' && (
                        <div className="photo-state-overlay error">
                          <div className="state-icon">⚠️</div>
                          <span className="state-text">Error</span>
                          <span className="error-message">{img.error}</span>
                        </div>
                      )}
                      <div className="photo-filename">{img.filename}</div>
                    </div>
                  ))}
                  
                  {/* Show existing album photos */}
                  {albumPhotos.map((photo) => {
                    const imageUrl = `${API_URL}${photo.thumbnail}?i=${cacheBustValue}`;
                    return (
                      <div key={photo.id} className="admin-photo-item">
                        <img 
                          src={imageUrl}
                          alt={photo.title}
                          className="admin-photo-thumbnail"
                        />
                        <div className="photo-overlay">
                          <div className="photo-actions">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleOpenEditModal(photo);
                              }}
                              onTouchEnd={(e) => {
                                // Handle touch events for iOS Safari
                                e.stopPropagation();
                                e.preventDefault();
                                handleOpenEditModal(photo);
                              }}
                              className="btn-edit-photo"
                              title="Edit title"
                              type="button"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                const filename = photo.id.split('/').pop() || photo.id;
                                handleDeletePhoto(photo.album, filename, photo.title);
                              }}
                              className="btn-delete-photo"
                              title="Delete photo"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Edit Title Modal - Use Portal to escape admin-container z-index stacking context */}
      {showEditModal && editingPhoto && createPortal(
        <div 
          className="edit-title-modal" 
          onClick={handleCloseEditModal}
        >
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Edit Photo Title</h3>
              <button 
                className="modal-close-btn"
                onClick={handleCloseEditModal}
                title="Close"
              >
                ×
              </button>
            </div>
            
            <div className="edit-modal-body">
              <div className="edit-modal-photo">
                <img 
                  src={`${API_URL}${editingPhoto.thumbnail}?i=${cacheBustValue}`}
                  alt={editingPhoto.title}
                />
              </div>
              
              <div className="edit-modal-info">
                <label className="edit-modal-label">
                  Filename: <span className="filename-display">{editingPhoto.id.split('/').pop()}</span>
                </label>
                
                <label className="edit-modal-label">Title</label>
                <input
                  type="text"
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  className="edit-modal-input"
                  placeholder="Enter title..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveTitle();
                    } else if (e.key === 'Escape') {
                      handleCloseEditModal();
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="edit-modal-footer">
              <button 
                className="btn-secondary"
                onClick={handleCloseEditModal}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleSaveTitle}
              >
                Save Title
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default AlbumsManager;

