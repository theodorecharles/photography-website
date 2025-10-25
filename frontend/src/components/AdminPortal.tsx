/**
 * Admin Portal Component
 * Allows authenticated users to manage site settings
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../config';
import './AdminPortal.css';
import {
  trackAdminAuth,
  trackAdminTabChange,
  trackAlbumManagement,
  trackPhotoManagement,
  trackExternalLinksUpdate,
  trackBrandingUpdate,
  trackAvatarUpload,
} from '../utils/analytics';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthStatus {
  authenticated: boolean;
  user?: User;
}

interface ExternalLink {
  title: string;
  url: string;
}

interface BrandingConfig {
  siteName: string;
  avatarPath: string;
  primaryColor: string;
  secondaryColor: string;
  metaDescription: string;
  metaKeywords: string;
  faviconPath: string;
}

interface Album {
  name: string;
  photoCount?: number;
}

interface Photo {
  id: string;
  title: string;
  album: string;
  src: string;
  thumbnail: string;
  download: string;
}

type Tab = 'branding' | 'links' | 'albums';

export default function AdminPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Determine active tab from URL
  const getActiveTab = (): Tab => {
    if (location.pathname.includes('/links')) return 'links';
    if (location.pathname.includes('/branding')) return 'branding';
    return 'albums';
  };
  const activeTab = getActiveTab();
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);
  const [branding, setBranding] = useState<BrandingConfig>({
    siteName: '',
    avatarPath: '',
    primaryColor: '#4ade80',
    secondaryColor: '#22c55e',
    metaDescription: '',
    metaKeywords: '',
    faviconPath: ''
  });
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [optimizingPhotos, setOptimizingPhotos] = useState<Set<string>>(new Set());

  // Redirect /admin to /admin/albums
  useEffect(() => {
    if (location.pathname === '/admin') {
      navigate('/admin/albums', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    // Check authentication status
    console.log('[AdminPortal] Checking auth status...');
    console.log('[AdminPortal] API_URL:', API_URL);
    console.log('[AdminPortal] Current location:', window.location.href);
    console.log('[AdminPortal] Cookies:', document.cookie);
    
    fetch(`${API_URL}/api/auth/status`, {
      credentials: 'include',
    })
      .then((res) => {
        console.log('[AdminPortal] Auth status response:', res.status, res.statusText);
        console.log('[AdminPortal] Response headers:', {
          'set-cookie': res.headers.get('set-cookie'),
          'access-control-allow-credentials': res.headers.get('access-control-allow-credentials'),
        });
        return res.json();
      })
      .then((data) => {
        console.log('[AdminPortal] Auth status data:', data);
        setAuthStatus(data);
        if (data.authenticated) {
          console.log('[AdminPortal] User is authenticated, loading data');
          // Track admin portal access
          trackAdminAuth('login', data.user?.email);
          loadExternalLinks();
          loadBranding();
          loadAlbums();
        } else {
          console.log('[AdminPortal] User is NOT authenticated');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('[AdminPortal] Failed to check auth status:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedAlbum) {
      loadAlbumPhotos(selectedAlbum);
    }
  }, [selectedAlbum]);

  // Track tab changes
  useEffect(() => {
    if (authStatus?.authenticated) {
      trackAdminTabChange(activeTab);
    }
  }, [activeTab, authStatus]);

  const loadExternalLinks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/external-links`, {
        credentials: 'include',
      });
      const data = await res.json();
      setExternalLinks(data.links || []);
    } catch (err) {
      console.error('Failed to load external links:', err);
    }
  };

  const loadBranding = async () => {
    try {
      const res = await fetch(`${API_URL}/api/branding`, {
        credentials: 'include',
      });
      const data = await res.json();
      // Ensure all values are strings (not undefined)
      setBranding({
        siteName: data.siteName || '',
        avatarPath: data.avatarPath || '',
        primaryColor: data.primaryColor || '#4ade80',
        secondaryColor: data.secondaryColor || '#22c55e',
        metaDescription: data.metaDescription || '',
        metaKeywords: data.metaKeywords || '',
        faviconPath: data.faviconPath || ''
      });
    } catch (err) {
      console.error('Failed to load branding config:', err);
    }
  };

  const loadAlbums = async () => {
    try {
      const res = await fetch(`${API_URL}/api/albums`, {
        credentials: 'include',
      });
      const albumNames = await res.json();
      const albumsList: Album[] = albumNames.map((name: string) => ({ name }));
      setAlbums(albumsList);
    } catch (err) {
      console.error('Failed to load albums:', err);
    }
  };

  const loadAlbumPhotos = async (album: string) => {
    try {
      const res = await fetch(`${API_URL}/api/albums/${album}/photos`, {
        credentials: 'include',
      });
      const photos = await res.json();
      setAlbumPhotos(photos);
    } catch (err) {
      console.error('Failed to load album photos:', err);
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) {
      setMessage({ type: 'error', text: 'Album name is required' });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/albums`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name: newAlbumName.trim() }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Album created successfully!' });
        // Track album creation
        trackAlbumManagement('create', newAlbumName.trim());
        setNewAlbumName('');
        loadAlbums();
        // Notify main app to refresh navigation
        window.dispatchEvent(new Event('albums-updated'));
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to create album' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error creating album' });
      console.error('Failed to create album:', err);
    }
  };

  const handleDeleteAlbum = async (album: string) => {
    if (!confirm(`Are you sure you want to delete the album "${album}" and all its photos?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/albums/${album}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Album deleted successfully!' });
        // Track album deletion
        trackAlbumManagement('delete', album);
        if (selectedAlbum === album) {
          setSelectedAlbum(null);
          setAlbumPhotos([]);
        }
        loadAlbums();
        // Notify main app to refresh navigation
        window.dispatchEvent(new Event('albums-updated'));
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to delete album' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error deleting album' });
      console.error('Failed to delete album:', err);
    }
  };

  const pollForThumbnail = async (photoId: string, thumbnailUrl: string, maxAttempts = 30) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(thumbnailUrl, { method: 'HEAD' });
        if (response.ok) {
          // Thumbnail is ready
          setOptimizingPhotos(prev => {
            const newSet = new Set(prev);
            newSet.delete(photoId);
            return newSet;
          });
          return true;
        }
      } catch (err) {
        // Continue polling
      }
      // Wait 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    // Timeout - remove from optimizing set anyway
    setOptimizingPhotos(prev => {
      const newSet = new Set(prev);
      newSet.delete(photoId);
      return newSet;
    });
    return false;
  };

  const handleUploadPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedAlbum) {
      setMessage({ type: 'error', text: 'Please select an album first' });
      return;
    }

    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('photos', files[i]);
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/albums/${selectedAlbum}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: 'success', text: 'Photos uploaded! Optimizing...' });
        
        // Track photo upload
        const uploadCount = data.files ? data.files.length : files.length;
        trackPhotoManagement('upload', selectedAlbum, uploadCount);
        
        // Reload photos to get the new photo IDs
        await loadAlbumPhotos(selectedAlbum);
        
        // Mark new photos as optimizing and start polling
        if (data.files && Array.isArray(data.files)) {
          const newPhotoIds = data.files.map((f: any) => f.filename || f);
          setOptimizingPhotos(prev => new Set([...prev, ...newPhotoIds]));
          
          // Start polling for each uploaded photo
          for (const filename of newPhotoIds) {
            const thumbnailUrl = `${API_URL}/optimized/thumbnail/${selectedAlbum}/${filename}`;
            pollForThumbnail(filename, thumbnailUrl);
          }
        }
        
        // Reset file input
        event.target.value = '';
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to upload photos' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error uploading photos' });
      console.error('Failed to upload photos:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhoto = async (album: string, photoId: string) => {
    if (!confirm(`Are you sure you want to delete this photo?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/albums/${album}/photos/${photoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Photo deleted successfully!' });
        // Track photo deletion
        trackPhotoManagement('delete', album, undefined, photoId);
        loadAlbumPhotos(album);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to delete photo' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error deleting photo' });
      console.error('Failed to delete photo:', err);
    }
  };

  const handleSaveLinks = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const res = await fetch(`${API_URL}/api/external-links`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ links: externalLinks }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'External links saved successfully!' });
        // Track external links update
        trackExternalLinksUpdate(externalLinks.length);
        // Notify main app to refresh navigation
        window.dispatchEvent(new Event('external-links-updated'));
      } else {
        setMessage({ type: 'error', text: 'Failed to save external links' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error saving external links' });
      console.error('Failed to save external links:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddLink = () => {
    setExternalLinks([...externalLinks, { title: '', url: '' }]);
  };

  const handleDeleteLink = (index: number) => {
    setExternalLinks(externalLinks.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, field: 'title' | 'url', value: string) => {
    const newLinks = [...externalLinks];
    newLinks[index][field] = value;
    setExternalLinks(newLinks);
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    setMessage(null);
    
    try {
      const res = await fetch(`${API_URL}/api/branding`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(branding),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Branding settings saved successfully!' });
        // Track branding update - track all branding fields that could have changed
        const updatedFields = Object.keys(branding).filter(key => branding[key as keyof BrandingConfig]);
        trackBrandingUpdate(updatedFields);
        // Notify main app to refresh site name
        window.dispatchEvent(new Event('branding-updated'));
      } else {
        setMessage({ type: 'error', text: 'Failed to save branding settings' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error saving branding settings' });
      console.error('Failed to save branding settings:', err);
    } finally {
      setSavingBranding(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setSavingBranding(true);
    setMessage(null);
    
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`${API_URL}/api/branding/upload-avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setBranding(prev => ({
          ...prev,
          avatarPath: data.avatarPath
        }));
        setMessage({ type: 'success', text: 'Avatar uploaded successfully!' });
        // Track avatar upload
        trackAvatarUpload();
        // Notify main app to refresh
        window.dispatchEvent(new Event('branding-updated'));
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to upload avatar' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error uploading avatar' });
      console.error('Failed to upload avatar:', err);
    } finally {
      setSavingBranding(false);
    }
  };

  const handleBrandingChange = (field: keyof BrandingConfig, value: string) => {
    setBranding(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogout = async () => {
    try {
      // Track logout before actually logging out
      trackAdminAuth('logout', authStatus?.user?.email);
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="admin-portal">
        <div className="admin-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading site settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!authStatus?.authenticated) {
    return (
      <div className="admin-portal">
        <div className="admin-container">
          <div className="auth-section">
            <div className="auth-card">
              <div className="auth-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <path d="M9 9h6v6H9z"/>
                  <path d="M9 1v6"/>
                  <path d="M15 1v6"/>
                  <path d="M9 17v6"/>
                  <path d="M15 17v6"/>
                  <path d="M1 9h6"/>
                  <path d="M17 9h6"/>
                  <path d="M1 15h6"/>
                  <path d="M17 15h6"/>
                </svg>
              </div>
              
              <h2>Authentication Required</h2>
              <p className="auth-description">
                You need to sign in with your Google account to access the admin panel and manage your photography website.
              </p>
              
              <div className="auth-actions">
                <a href={`${API_URL}/api/auth/google`} className="btn-login">
                  <svg width="20" height="20" viewBox="0 0 18 18" style={{ marginRight: '12px' }}>
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.55 0 9s.348 2.827.957 4.042l3.007-2.335z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  Sign in with Google
                </a>
                <a href="/" className="btn-home">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9,22 9,12 15,12 15,22"/>
                  </svg>
                  Return to Gallery
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal">
      <div className="admin-container">
        <div className="admin-header">
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
          <div className="admin-tabs">
            <button
              className={`tab-button ${activeTab === 'albums' ? 'active' : ''}`}
              onClick={() => navigate('/admin/albums')}
            >
              <span className="tab-emoji">📸 </span>Albums
            </button>
            <button
              className={`tab-button ${activeTab === 'links' ? 'active' : ''}`}
              onClick={() => navigate('/admin/links')}
            >
              <span className="tab-emoji">🔗 </span>Links
            </button>
            <button
              className={`tab-button ${activeTab === 'branding' ? 'active' : ''}`}
              onClick={() => navigate('/admin/branding')}
            >
              <span className="tab-emoji">🎨 </span>Branding
            </button>
          </div>
        </div>

        {message && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        {activeTab === 'branding' && (
        <section className="admin-section">
          <h2>🎨 Branding</h2>
          <p className="section-description">Customize your site's appearance, colors, and branding</p>
          
          <div className="branding-grid">
            <div className="branding-group">
              <label className="branding-label">Avatar/Logo</label>
              <div className="avatar-upload-container">
                {branding.avatarPath && (
                  <img 
                    src={`${API_URL}${branding.avatarPath}`} 
                    alt="Current avatar"
                    className="current-avatar-preview"
                  />
                )}
                <label className="btn-secondary upload-avatar-btn">
                  {savingBranding ? 'Uploading...' : 'Upload New Avatar'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleAvatarUpload(file);
                      }
                    }}
                    style={{ display: 'none' }}
                    disabled={savingBranding}
                  />
                </label>
              </div>
            </div>

            <div className="branding-group">
              <label className="branding-label">Site Name</label>
              <input
                type="text"
                value={branding.siteName}
                onChange={(e) => handleBrandingChange('siteName', e.target.value)}
                className="branding-input"
                placeholder="Your site name"
              />
            </div>

            <div className="branding-group full-width">
              <label className="branding-label">Meta Description</label>
              <textarea
                value={branding.metaDescription}
                onChange={(e) => handleBrandingChange('metaDescription', e.target.value)}
                className="branding-textarea"
                placeholder="Brief description of your site for search engines"
                rows={3}
              />
            </div>

            <div className="branding-group full-width">
              <label className="branding-label">Meta Keywords</label>
              <input
                type="text"
                value={branding.metaKeywords}
                onChange={(e) => handleBrandingChange('metaKeywords', e.target.value)}
                className="branding-input"
                placeholder="photography, portfolio, your name (comma separated)"
              />
            </div>

          </div>

          <div className="section-actions">
            <button 
              onClick={handleSaveBranding} 
              className="btn-primary"
              disabled={savingBranding}
            >
              {savingBranding ? 'Saving...' : 'Save Branding Settings'}
            </button>
          </div>
        </section>
        )}

        {activeTab === 'links' && (
        <section className="admin-section">
          <h2>🔗 External Links</h2>
          <p className="section-description">Manage links shown in the navigation menu</p>
          
          <div className="links-list">
            {externalLinks.map((link, index) => (
              <div key={index} className="link-item">
                <div className="link-fields">
                  <input
                    type="text"
                    placeholder="Title"
                    value={link.title}
                    onChange={(e) => handleLinkChange(index, 'title', e.target.value)}
                    className="link-input"
                  />
                  <input
                    type="text"
                    placeholder="URL"
                    value={link.url}
                    onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                    className="link-input"
                  />
                </div>
                <button
                  onClick={() => handleDeleteLink(index)}
                  className="btn-delete"
                  title="Delete link"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="section-actions">
            <button onClick={handleAddLink} className="btn-secondary">
              + Add Link
            </button>
            <button 
              onClick={handleSaveLinks} 
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </section>
        )}

        {activeTab === 'albums' && (
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
                      const imageUrl = `${API_URL}${photo.thumbnail}`;
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
                          <span className="photo-title">{photo.title}</span>
                          <button
                            onClick={() => handleDeletePhoto(photo.album, photo.id)}
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
        )}
      </div>
    </div>
  );
}

