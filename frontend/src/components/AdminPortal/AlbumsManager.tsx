/**
 * Albums Manager Component  
 * Manages photo albums, photo uploads, and image optimization settings
 */

import { useState, useEffect } from 'react';
import { Album, Photo, ImageOptimizationSettings } from './types';
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
  setAlbums: (albums: Album[]) => void;
  loadAlbums: () => Promise<void>;
  setMessage: (message: { type: 'success' | 'error'; text: string } | null) => void;
}

const AlbumsManager: React.FC<AlbumsManagerProps> = ({
  albums,
  setAlbums,
  loadAlbums,
  setMessage,
}) => {
  const [saving, setSaving] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
  const [optimizingPhotos, setOptimizingPhotos] = useState<Set<string>>(new Set());
  const [optimizationSettings, setOptimizationSettings] = useState<ImageOptimizationSettings>({
    concurrency: 4,
    images: {
      thumbnail: { quality: 60, maxDimension: 512 },
      modal: { quality: 85, maxDimension: 2048 },
      download: { quality: 95, maxDimension: 4096 },
    }
  });
  const [optimizationErrors, setOptimizationErrors] = useState<Record<string, string>>({});
  const [optimizationComplete, setOptimizationComplete] = useState(false);

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
    } catch (err) {
      console.error('Failed to load photos:', err);
      setAlbumPhotos([]); // Set to empty array on error to prevent map errors
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
        console.log('Upload result:', result);
        setMessage({ type: 'success', text: `${files.length} photo(s) uploaded!` });
        const photoTitles = Array.from(files).map(f => f.name);
        trackPhotoUploaded(selectedAlbum, files.length, photoTitles);
        
        // Track optimizing photos - ensure format matches photo.id (album/filename)
        if (result.photoIds) {
          console.log('Backend returned photoIds:', result.photoIds);
          result.photoIds.forEach((id: string) => {
            // If id is just filename, prepend album name to match photo.id format
            const fullId = id.includes('/') ? id : `${selectedAlbum}/${id}`;
            console.log('Adding to optimizingPhotos:', fullId);
            setOptimizingPhotos(prev => new Set([...prev, fullId]));
          });
          
          // Poll for completion
          pollOptimization(result.photoIds);
        } else {
          console.warn('No photoIds in upload result');
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

  const pollOptimization = async (photoIds: string[]) => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/photos/optimization-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ photoIds }),
        });

        if (res.ok) {
          const { completed } = await res.json();
          setOptimizingPhotos(prev => {
            const updated = new Set(prev);
            completed.forEach((id: string) => {
              // Match the format used when adding (album/filename)
              const fullId = id.includes('/') ? id : `${selectedAlbum}/${id}`;
              updated.delete(fullId);
            });
            return updated;
          });

          if (completed.length < photoIds.length) {
            setTimeout(checkStatus, 2000);
          } else if (selectedAlbum) {
            await loadPhotos(selectedAlbum);
          }
        }
      } catch (err) {
        console.error('Failed to check optimization status:', err);
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

  const validateOptimizationSettings = () => {
    const errors: Record<string, string> = {};
    
    // Validate concurrency
    if (optimizationSettings.concurrency === null || optimizationSettings.concurrency === undefined || optimizationSettings.concurrency === '' as any) {
      errors.concurrency = 'Value required';
    } else if (optimizationSettings.concurrency < 1 || optimizationSettings.concurrency > 16) {
      errors.concurrency = 'Must be between 1 and 16';
    }
    
    // Validate thumbnail quality
    if (optimizationSettings.images.thumbnail.quality === null || optimizationSettings.images.thumbnail.quality === undefined || optimizationSettings.images.thumbnail.quality === '' as any) {
      errors.thumbnailQuality = 'Value required';
    } else if (optimizationSettings.images.thumbnail.quality < 0 || optimizationSettings.images.thumbnail.quality > 100) {
      errors.thumbnailQuality = 'Must be between 0 and 100';
    }
    
    // Validate thumbnail maxDimension
    if (optimizationSettings.images.thumbnail.maxDimension === null || optimizationSettings.images.thumbnail.maxDimension === undefined || optimizationSettings.images.thumbnail.maxDimension === '' as any) {
      errors.thumbnailMaxDimension = 'Value required';
    } else if (optimizationSettings.images.thumbnail.maxDimension < 128 || optimizationSettings.images.thumbnail.maxDimension > 4096) {
      errors.thumbnailMaxDimension = 'Must be between 128 and 4096';
    }
    
    // Validate modal quality
    if (optimizationSettings.images.modal.quality === null || optimizationSettings.images.modal.quality === undefined || optimizationSettings.images.modal.quality === '' as any) {
      errors.modalQuality = 'Value required';
    } else if (optimizationSettings.images.modal.quality < 0 || optimizationSettings.images.modal.quality > 100) {
      errors.modalQuality = 'Must be between 0 and 100';
    }
    
    // Validate modal maxDimension
    if (optimizationSettings.images.modal.maxDimension === null || optimizationSettings.images.modal.maxDimension === undefined || optimizationSettings.images.modal.maxDimension === '' as any) {
      errors.modalMaxDimension = 'Value required';
    } else if (optimizationSettings.images.modal.maxDimension < 512 || optimizationSettings.images.modal.maxDimension > 8192) {
      errors.modalMaxDimension = 'Must be between 512 and 8192';
    }
    
    // Validate download quality
    if (optimizationSettings.images.download.quality === null || optimizationSettings.images.download.quality === undefined || optimizationSettings.images.download.quality === '' as any) {
      errors.downloadQuality = 'Value required';
    } else if (optimizationSettings.images.download.quality < 0 || optimizationSettings.images.download.quality > 100) {
      errors.downloadQuality = 'Must be between 0 and 100';
    }
    
    // Validate download maxDimension
    if (optimizationSettings.images.download.maxDimension === null || optimizationSettings.images.download.maxDimension === undefined || optimizationSettings.images.download.maxDimension === '' as any) {
      errors.downloadMaxDimension = 'Value required';
    } else if (optimizationSettings.images.download.maxDimension < 1024 || optimizationSettings.images.download.maxDimension > 16384) {
      errors.downloadMaxDimension = 'Must be between 1024 and 16384';
    }
    
    setOptimizationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveOptimizationSettings = async () => {
    // Validate before saving
    if (!validateOptimizationSettings()) {
      setMessage({ type: 'error', text: 'Please fix validation errors before saving' });
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/image-optimization/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(optimizationSettings),
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Optimization settings saved successfully' });
        setOptimizationErrors({});
      } else {
        setMessage({ type: 'error', text: 'Failed to save optimization settings' });
      }
    } catch (err) {
      console.error('Failed to save optimization settings:', err);
      setMessage({ type: 'error', text: 'Failed to save optimization settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleRunOptimization = async (force: boolean = false) => {
    if (!confirm(force ? 'Force regenerate ALL images? This will take a while.' : 'Run image optimization on all photos?')) return;

    setSaving(true);
    setOptimizationComplete(false);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/image-optimization/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ force }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Optimization started!' });
        setOptimizationComplete(true);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to start optimization' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setSaving(false);
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
                    onClick={() => setSelectedAlbum(album.name)}
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
                    {selectedAlbum === album.name && (
                      <div className="album-badge">Selected</div>
                    )}
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
                    console.log(`Photo ${photo.id} - isOptimizing: ${isOptimizing}, optimizingPhotos:`, Array.from(optimizingPhotos));
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
                        <span className="photo-title">{photo.title}</span>
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
                  );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      
      <section className="admin-section">
        <h2>⚙️ Image Optimization</h2>
        <p className="section-description">Configure image quality and run optimization</p>
        
        <div className="form-group" style={{ maxWidth: '300px', marginBottom: '2rem' }}>
          <label className="branding-label">Concurrency (1-16)</label>
          <input
            type="number"
            min="1"
            max="16"
            value={optimizationSettings.concurrency}
            onChange={(e) => {
              const value = e.target.value === '' ? '' : parseInt(e.target.value);
              setOptimizationSettings({
                ...optimizationSettings,
                concurrency: value as any
              });
              if (optimizationErrors.concurrency) {
                const { concurrency, ...rest } = optimizationErrors;
                setOptimizationErrors(rest);
              }
            }}
            onFocus={(e) => e.target.select()}
            className="branding-input"
            style={{
              borderColor: optimizationErrors.concurrency ? '#dc3545' : undefined
            }}
          />
          {optimizationErrors.concurrency && (
            <p style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {optimizationErrors.concurrency}
            </p>
          )}
        </div>
        
        <div className="optimization-grid">
          {['thumbnail', 'modal', 'download'].map((type) => (
            <div key={type} className="optimization-group">
              <h4>{type.charAt(0).toUpperCase() + type.slice(1)}</h4>
              <div className="form-group">
                <label>Quality (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={optimizationSettings.images[type as keyof typeof optimizationSettings.images].quality}
                  onChange={(e) => {
                    const value = e.target.value === '' ? '' : parseInt(e.target.value);
                    setOptimizationSettings({
                      ...optimizationSettings,
                      images: { 
                        ...optimizationSettings.images, 
                        [type]: { 
                          ...optimizationSettings.images[type as keyof typeof optimizationSettings.images], 
                          quality: value as any 
                        } 
                      }
                    });
                  }}
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="form-group">
                <label>Max Dimension (px)</label>
                <input
                  type="number"
                  min="128"
                  value={optimizationSettings.images[type as keyof typeof optimizationSettings.images].maxDimension}
                  onChange={(e) => {
                    const value = e.target.value === '' ? '' : parseInt(e.target.value);
                    setOptimizationSettings({
                      ...optimizationSettings,
                      images: { 
                        ...optimizationSettings.images, 
                        [type]: { 
                          ...optimizationSettings.images[type as keyof typeof optimizationSettings.images], 
                          maxDimension: value as any 
                        } 
                      }
                    });
                  }}
                  onFocus={(e) => e.target.select()}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
          <button
            className="btn-primary"
            onClick={handleSaveOptimizationSettings}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => handleRunOptimization(true)}
              disabled={saving}
              className="btn-force-regenerate"
            >
              {saving ? 'Running...' : 'Force Regenerate All'}
            </button>
            {optimizationComplete && (
              <span style={{ color: '#28a745', fontSize: '1.5rem' }}>✓</span>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default AlbumsManager;

