/**
 * Albums Manager Component  
 * Manages photo albums, photo uploads, and image optimization settings
 */

import { useState, useEffect } from 'react';
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
  const [saving, setSaving] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
  const [optimizingPhotos, setOptimizingPhotos] = useState<Set<string>>(new Set());
  const [photoTitles, setPhotoTitles] = useState<Record<string, string | null>>({});
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

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
    console.log('Opening edit modal for photo:', photo.id);
    setEditingPhoto(photo);
    setEditTitleValue(photoTitles[photo.id] || '');
    setShowEditModal(true);
    console.log('Modal state set to true');
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
      const res = await fetch(`${API_URL}/api/albums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newAlbumName.toLowerCase().trim() }),
      });

      if (res.ok) {
        setNewAlbumName('');
        setMessage({ type: 'success', text: `Album "${newAlbumName}" created!` });
        trackAlbumCreated(newAlbumName);
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

  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedAlbum) return;

    setSaving(true);
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('photos', file));

    try {
      const res = await fetch(`${API_URL}/api/albums/${selectedAlbum}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setMessage({ type: 'success', text: `${files.length} photo(s) uploaded!` });
        const photoTitles = Array.from(files).map(f => f.name);
        trackPhotoUploaded(selectedAlbum, files.length, photoTitles);
        
        // Backend returns 'files' array, not 'photoIds'
        const uploadedFiles = result.files || result.photoIds || [];
        if (uploadedFiles.length > 0) {
          uploadedFiles.forEach((filename: string) => {
            // Prepend album name to match photo.id format (album/filename)
            const fullId = filename.includes('/') ? filename : `${selectedAlbum}/${filename}`;
            setOptimizingPhotos(prev => new Set([...prev, fullId]));
          });
          
          // Poll for completion
          pollOptimization(uploadedFiles);
        } else {
          console.warn('No files in upload result');
        }

        await loadPhotos(selectedAlbum);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Upload failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const pollOptimization = async (filenames: string[]) => {
    const checkStatus = async () => {
      try {
        // Check each thumbnail URL to see if it exists (returns 200 instead of 404)
        const checkPromises = filenames.map(async (filename) => {
          const thumbnailUrl = `${API_URL}/optimized/thumbnail/${selectedAlbum}/${filename}`;
          try {
            const res = await fetch(thumbnailUrl, { method: 'HEAD' });
            return { filename, completed: res.ok };
          } catch {
            return { filename, completed: false };
          }
        });

        const results = await Promise.all(checkPromises);
        const completed = results.filter(r => r.completed).map(r => r.filename);
        
        
        // Remove completed photos from optimizing set
        setOptimizingPhotos(prev => {
          const updated = new Set(prev);
          completed.forEach((filename: string) => {
            const fullId = filename.includes('/') ? filename : `${selectedAlbum}/${filename}`;
            updated.delete(fullId);
          });
          return updated;
        });

        if (completed.length < filenames.length) {
          setTimeout(checkStatus, 2000);
        } else {
          if (selectedAlbum) {
            await loadPhotos(selectedAlbum);
          }
        }
      } catch (err) {
        console.error('Failed to check thumbnail status:', err);
      }
    };

    setTimeout(checkStatus, 2000);
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
          <div className="create-album">
            <h3>Create New Album</h3>
            <div className="album-input-group">
              <input
                type="text"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="Album name (e.g., nature, portraits)"
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
            <div className="album-photos">
              <div className="photos-header">
                <h3>Photos in "{selectedAlbum}"</h3>
                <div className="upload-controls">
                  <label className="btn-primary upload-btn">
                    {saving ? 'Uploading...' : '+ Upload Photos'}
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleUploadPhotos}
                      disabled={saving}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {albumPhotos.length === 0 ? (
                <p style={{ color: '#888', marginTop: '1rem' }}>
                  No photos in this album yet. Upload some to get started!
                </p>
              ) : (
                <div className="photos-grid">
                  {albumPhotos.map((photo) => {
                    const imageUrl = `${API_URL}${photo.thumbnail}?i=${cacheBustValue}`;
                    const isOptimizing = optimizingPhotos.has(photo.id);
                    return (
                    <div key={photo.id} className="admin-photo-item">
                      {isOptimizing ? (
                        <div className="photo-optimizing">
                          <div className="spinner"></div>
                          <span>Optimizing...</span>
                        </div>
                      ) : (
                        <img 
                          src={imageUrl}
                          alt={photo.title}
                          className="admin-photo-thumbnail"
                        />
                      )}
                      <div className="photo-overlay">
                        <div className="photo-actions">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(photo);
                            }}
                            onTouchEnd={(e) => {
                              // Handle touch events for iOS Safari - prevent double-firing
                              e.stopPropagation();
                              if (!showEditModal) {
                                handleOpenEditModal(photo);
                              }
                            }}
                            className="btn-edit-photo"
                            title="Edit title"
                            disabled={isOptimizing}
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
                            disabled={isOptimizing}
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

      {/* Edit Title Modal */}
      {showEditModal && editingPhoto && (
        <div 
          className="modal-backdrop" 
          onClick={handleCloseEditModal}
          data-modal-open="true"
          style={{ display: 'flex' }}
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
        </div>
      )}
    </>
  );
};

export default AlbumsManager;

