/**
 * Admin Portal Component
 * Allows authenticated users to manage site settings
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL, cacheBustValue } from '../../config';
import './AdminPortal.css';
import Metrics from './Metrics';
import {
  trackLoginSucceeded,
  trackLogout,
  trackAdminTabChange,
  trackAlbumCreated,
  trackAlbumDeleted,
  trackPhotoUploaded,
  trackPhotoDeleted,
  trackExternalLinksUpdate,
  trackBrandingUpdate,
  trackAvatarUpload,
} from '../../utils/analytics';

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

interface ImageOptimizationSettings {
  concurrency: number;
  images: {
    thumbnail: {
      quality: number;
      maxDimension: number;
    };
    modal: {
      quality: number;
      maxDimension: number;
    };
    download: {
      quality: number;
      maxDimension: number;
    };
  };
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

type Tab = 'branding' | 'links' | 'albums' | 'metrics';

export default function AdminPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Determine active tab from URL
  const getActiveTab = (): Tab => {
    if (location.pathname.includes('/links')) return 'links';
    if (location.pathname.includes('/branding')) return 'branding';
    if (location.pathname.includes('/metrics')) return 'metrics';
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
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [optimizationSettings, setOptimizationSettings] = useState<ImageOptimizationSettings>({
    concurrency: 4,
    images: {
      thumbnail: { quality: 60, maxDimension: 512 },
      modal: { quality: 90, maxDimension: 2048 },
      download: { quality: 100, maxDimension: 4096 }
    }
  });
  const [optimizationErrors, setOptimizationErrors] = useState<{
    concurrency?: string;
    thumbnailQuality?: string;
    thumbnailMaxDimension?: string;
    modalQuality?: string;
    modalMaxDimension?: string;
    downloadQuality?: string;
    downloadMaxDimension?: string;
  }>({});
  const [optimizationOutput, setOptimizationOutput] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationComplete, setOptimizationComplete] = useState(false);
  const [savingOptimization, setSavingOptimization] = useState(false);
  const outputConsoleRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll output console to bottom when new content is added
  useEffect(() => {
    if (outputConsoleRef.current) {
      outputConsoleRef.current.scrollTop = outputConsoleRef.current.scrollHeight;
    }
  }, [optimizationOutput]);

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
        if (res.status === 429 && (window as any).handleRateLimit) {
          (window as any).handleRateLimit();
          throw new Error('Rate limited');
        }
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
          trackLoginSucceeded(data.user?.email, data.user?.name);
          loadExternalLinks();
          loadBranding();
          loadAlbums();
          loadOptimizationSettings();
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

  const loadOptimizationSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/image-optimization/settings`, {
        credentials: 'include',
      });
      const data = await res.json();
      setOptimizationSettings(data);
    } catch (err) {
      console.error('Failed to load optimization settings:', err);
    }
  };

  const validateOptimizationSettings = () => {
    const errors: typeof optimizationErrors = {};
    
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
    
    setSavingOptimization(true);
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
      setSavingOptimization(false);
    }
  };

  const handleRunOptimization = async (force: boolean = false) => {
    setIsOptimizing(true);
    setOptimizationComplete(false);
    setOptimizationOutput([]);
    
    try {
      const res = await fetch(`${API_URL}/api/image-optimization/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ force }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to start optimization');
      }
      
      // Set up SSE to receive output
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No reader available');
      }
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.type === 'stdout' || data.type === 'stderr') {
                setOptimizationOutput(prev => [...prev, data.message]);
              } else if (data.type === 'complete') {
                setOptimizationOutput(prev => [...prev, '', data.message]);
                setOptimizationComplete(true);
              } else if (data.type === 'error') {
                setOptimizationOutput(prev => [...prev, `ERROR: ${data.message}`]);
                setMessage({ type: 'error', text: 'Optimization failed' });
              }
            } catch (e) {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to run optimization:', err);
      setOptimizationOutput(prev => [...prev, `ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`]);
      setMessage({ type: 'error', text: 'Failed to run optimization' });
    } finally {
      setIsOptimizing(false);
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
        trackAlbumCreated(newAlbumName.trim());
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
        trackAlbumDeleted(album);
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

  const pollForThumbnail = async (photoId: string, thumbnailUrl: string, album: string, maxAttempts = 30) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Add cache bust parameter to prevent cached 404 responses
        const cacheBustUrl = `${thumbnailUrl}?t=${Date.now()}`;
        const response = await fetch(cacheBustUrl, { method: 'HEAD' });
        if (response.ok) {
          // Thumbnail is ready
          setOptimizingPhotos(prev => {
            const newSet = new Set(prev);
            newSet.delete(photoId);
            return newSet;
          });
          // Reload album photos to get fresh URLs and ensure cache is bypassed
          await loadAlbumPhotos(album);
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
        const uploadedFiles = data.files || [];
        const photoTitles = uploadedFiles.map((f: any) => {
          const filename = f.filename || f;
          // Generate title from filename by removing extension and replacing separators
          return filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        });
        trackPhotoUploaded(selectedAlbum, uploadedFiles.length, photoTitles);
        
        // Reload photos to get the new photo IDs
        await loadAlbumPhotos(selectedAlbum);
        
        // Mark new photos as optimizing and start polling
        if (data.files && Array.isArray(data.files)) {
          const filenames = data.files.map((f: any) => f.filename || f);
          // Use album/filename format to match photo.id from API
          const newPhotoIds = filenames.map((f: string) => `${selectedAlbum}/${f}`);
          setOptimizingPhotos(prev => new Set([...prev, ...newPhotoIds]));
          
          // Start polling for each uploaded photo
          for (const filename of filenames) {
            const photoId = `${selectedAlbum}/${filename}`;
            const thumbnailUrl = `${API_URL}/optimized/thumbnail/${selectedAlbum}/${filename}`;
            pollForThumbnail(photoId, thumbnailUrl, selectedAlbum);
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
        const photoTitle = photoId.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        trackPhotoDeleted(album, photoId, photoTitle);
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
      // Keep track of the updated branding data to send
      let updatedBranding = { ...branding };
      
      // First upload avatar if there's a pending file
      if (pendingAvatarFile) {
        console.log('Uploading avatar file:', pendingAvatarFile.name, pendingAvatarFile.size, 'bytes');
        const formData = new FormData();
        formData.append('avatar', pendingAvatarFile);

        const avatarRes = await fetch(`${API_URL}/api/branding/upload-avatar`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (avatarRes.ok) {
          const data = await avatarRes.json();
          console.log('Avatar uploaded successfully:', data);
          // Update both state and our local copy
          updatedBranding.avatarPath = data.avatarPath;
          setBranding(prev => ({
            ...prev,
            avatarPath: data.avatarPath
          }));
          // Track avatar upload
          trackAvatarUpload();
          // Clear pending avatar
          setPendingAvatarFile(null);
          setAvatarPreviewUrl(null);
        } else {
          const errorData = await avatarRes.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Avatar upload failed:', avatarRes.status, errorData);
          throw new Error(errorData.error || 'Failed to upload avatar');
        }
      }

      // Then save branding settings with the updated avatarPath
      const res = await fetch(`${API_URL}/api/branding`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedBranding),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Branding settings saved successfully!' });
        // Track branding update - track all branding fields that could have changed
        const updatedFields = Object.keys(branding).filter(key => branding[key as keyof BrandingConfig]);
        trackBrandingUpdate(updatedFields);
        // Reload branding to get fresh avatar path with updated timestamp
        await loadBranding();
        // Notify main app to refresh site name
        window.dispatchEvent(new Event('branding-updated'));
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Branding save failed:', res.status, errorData);
        setMessage({ type: 'error', text: errorData.error || 'Failed to save branding settings' });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error saving branding settings';
      setMessage({ type: 'error', text: errorMessage });
      console.error('Failed to save branding settings:', err);
    } finally {
      setSavingBranding(false);
    }
  };

  const handleAvatarFileSelect = (file: File) => {
    // Use FileReader to create data URL for better cross-origin compatibility
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    setPendingAvatarFile(file);
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
      trackLogout(authStatus?.user?.email);
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
              Albums
            </button>
            <button
              className={`tab-button ${activeTab === 'links' ? 'active' : ''}`}
              onClick={() => navigate('/admin/links')}
            >
              Links
            </button>
            <button
              className={`tab-button ${activeTab === 'branding' ? 'active' : ''}`}
              onClick={() => navigate('/admin/branding')}
            >
              Branding
            </button>
            <button
              className={`tab-button ${activeTab === 'metrics' ? 'active' : ''}`}
              onClick={() => navigate('/admin/metrics')}
            >
              Metrics
            </button>
          </div>
        </div>

        {message && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        {activeTab === 'metrics' && (
          <Metrics />
        )}

        {activeTab === 'branding' && (
        <section className="admin-section">
          <h2>🎨 Branding</h2>
          <p className="section-description">Customize your site's appearance, colors, and branding</p>
          
          <div className="branding-grid">
            <div className="branding-group">
              <label className="branding-label">Avatar/Logo</label>
              <div className="avatar-upload-container">
                {(avatarPreviewUrl || branding.avatarPath) && (
                  <img 
                    src={avatarPreviewUrl || `${API_URL}${branding.avatarPath}?v=${Date.now()}`} 
                    alt="Current avatar"
                    className="current-avatar-preview"
                    key={avatarPreviewUrl || branding.avatarPath}
                  />
                )}
                <label className="btn-secondary upload-avatar-btn">
                  {pendingAvatarFile ? 'Change Avatar' : 'Select Avatar'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleAvatarFileSelect(file);
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
              {savingBranding ? 'Saving...' : 'Save'}
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
                              // Extract filename from photo.id (format: "album/filename.jpg")
                              const filename = photo.id.split('/').pop() || photo.id;
                              handleDeletePhoto(photo.album, filename);
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
                  // Clear error when user types
                  if (optimizationErrors.concurrency) {
                    setOptimizationErrors({ ...optimizationErrors, concurrency: undefined });
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
              <p className="section-description" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                Number of images to process in parallel. Higher values are faster but use more CPU.
              </p>
            </div>
            
            <div className="optimization-grid">
              <div className="optimization-group">
                <h4>Thumbnail</h4>
                <div className="form-group">
                  <label>Quality (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={optimizationSettings.images.thumbnail.quality}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : parseInt(e.target.value);
                      setOptimizationSettings({
                        ...optimizationSettings,
                        images: { ...optimizationSettings.images, thumbnail: { ...optimizationSettings.images.thumbnail, quality: value as any } }
                      });
                      if (optimizationErrors.thumbnailQuality) {
                        setOptimizationErrors({ ...optimizationErrors, thumbnailQuality: undefined });
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    style={{
                      borderColor: optimizationErrors.thumbnailQuality ? '#dc3545' : undefined
                    }}
                  />
                  {optimizationErrors.thumbnailQuality && (
                    <p style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      {optimizationErrors.thumbnailQuality}
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label>Max Dimension (px)</label>
                  <input
                    type="number"
                    min="128"
                    max="4096"
                    value={optimizationSettings.images.thumbnail.maxDimension}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : parseInt(e.target.value);
                      setOptimizationSettings({
                        ...optimizationSettings,
                        images: { ...optimizationSettings.images, thumbnail: { ...optimizationSettings.images.thumbnail, maxDimension: value as any } }
                      });
                      if (optimizationErrors.thumbnailMaxDimension) {
                        setOptimizationErrors({ ...optimizationErrors, thumbnailMaxDimension: undefined });
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    style={{
                      borderColor: optimizationErrors.thumbnailMaxDimension ? '#dc3545' : undefined
                    }}
                  />
                  {optimizationErrors.thumbnailMaxDimension && (
                    <p style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      {optimizationErrors.thumbnailMaxDimension}
                    </p>
                  )}
                </div>
              </div>

              <div className="optimization-group">
                <h4>Modal</h4>
                <div className="form-group">
                  <label>Quality (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={optimizationSettings.images.modal.quality}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : parseInt(e.target.value);
                      setOptimizationSettings({
                        ...optimizationSettings,
                        images: { ...optimizationSettings.images, modal: { ...optimizationSettings.images.modal, quality: value as any } }
                      });
                      if (optimizationErrors.modalQuality) {
                        setOptimizationErrors({ ...optimizationErrors, modalQuality: undefined });
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    style={{
                      borderColor: optimizationErrors.modalQuality ? '#dc3545' : undefined
                    }}
                  />
                  {optimizationErrors.modalQuality && (
                    <p style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      {optimizationErrors.modalQuality}
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label>Max Dimension (px)</label>
                  <input
                    type="number"
                    min="512"
                    max="8192"
                    value={optimizationSettings.images.modal.maxDimension}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : parseInt(e.target.value);
                      setOptimizationSettings({
                        ...optimizationSettings,
                        images: { ...optimizationSettings.images, modal: { ...optimizationSettings.images.modal, maxDimension: value as any } }
                      });
                      if (optimizationErrors.modalMaxDimension) {
                        setOptimizationErrors({ ...optimizationErrors, modalMaxDimension: undefined });
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    style={{
                      borderColor: optimizationErrors.modalMaxDimension ? '#dc3545' : undefined
                    }}
                  />
                  {optimizationErrors.modalMaxDimension && (
                    <p style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      {optimizationErrors.modalMaxDimension}
                    </p>
                  )}
                </div>
              </div>

              <div className="optimization-group">
                <h4>Download</h4>
                <div className="form-group">
                  <label>Quality (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={optimizationSettings.images.download.quality}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : parseInt(e.target.value);
                      setOptimizationSettings({
                        ...optimizationSettings,
                        images: { ...optimizationSettings.images, download: { ...optimizationSettings.images.download, quality: value as any } }
                      });
                      if (optimizationErrors.downloadQuality) {
                        setOptimizationErrors({ ...optimizationErrors, downloadQuality: undefined });
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    style={{
                      borderColor: optimizationErrors.downloadQuality ? '#dc3545' : undefined
                    }}
                  />
                  {optimizationErrors.downloadQuality && (
                    <p style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      {optimizationErrors.downloadQuality}
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label>Max Dimension (px)</label>
                  <input
                    type="number"
                    min="1024"
                    max="16384"
                    value={optimizationSettings.images.download.maxDimension}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : parseInt(e.target.value);
                      setOptimizationSettings({
                        ...optimizationSettings,
                        images: { ...optimizationSettings.images, download: { ...optimizationSettings.images.download, maxDimension: value as any } }
                      });
                      if (optimizationErrors.downloadMaxDimension) {
                        setOptimizationErrors({ ...optimizationErrors, downloadMaxDimension: undefined });
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    style={{
                      borderColor: optimizationErrors.downloadMaxDimension ? '#dc3545' : undefined
                    }}
                  />
                  {optimizationErrors.downloadMaxDimension && (
                    <p style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      {optimizationErrors.downloadMaxDimension}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {optimizationOutput.length > 0 && !optimizationComplete && (
              <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
                <h4 style={{ color: '#f9fafb', marginBottom: '1rem' }}>Output</h4>
                <div className="output-console" ref={outputConsoleRef}>
                  {optimizationOutput.map((line, index) => (
                    <div key={index} className="output-line">{line}</div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <button
                className="btn-primary"
                onClick={handleSaveOptimizationSettings}
                disabled={savingOptimization}
              >
                {savingOptimization ? 'Saving...' : 'Save Settings'}
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  className="button"
                  style={{ 
                    backgroundColor: '#dc3545', 
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    cursor: isOptimizing ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => handleRunOptimization(true)}
                  disabled={isOptimizing}
                >
                  {isOptimizing ? 'Running...' : 'Force Regenerate All'}
                </button>
                {optimizationComplete && (
                  <span style={{ color: '#28a745', fontSize: '1.5rem' }}>✓</span>
                )}
              </div>
            </div>
        </section>
        </>
        )}
      </div>
    </div>
  );
}

