/**
 * Admin Portal Component
 * Main orchestrator for admin functionality - delegates to sub-components
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../../config';
// CSS will be loaded dynamically to ensure proper loading in dev mode
import { AuthStatus, ExternalLink, BrandingConfig, Album, AlbumFolder } from './types';
import AlbumsManager from './AlbumsManager';
import Metrics from './Metrics/Metrics';
import ConfigManager from './ConfigManager';
import {
  trackLoginSucceeded,
  trackLogout,
  trackAdminTabChange,
} from '../../utils/analytics';
import { useSSEToaster } from '../../contexts/SSEToasterContext';
import { getActiveTab } from '../../utils/adminHelpers';
import {
  CpuIcon,
  GoogleLogoIcon,
  HomeIcon,
  LogoutIcon,
  ImageIcon,
  BarChartIcon,
  SettingsIcon
} from '../icons';

export default function AdminPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [cssLoaded, setCssLoaded] = useState(false);
  const sseToaster = useSSEToaster();
  
  // Aggressively load CSS in dev mode
  useEffect(() => {
    const loadCSS = async () => {
      try {
        // Dynamic import to force Vite to inject CSS
        await Promise.all([
          import('./AdminPortal.css'),
          import('./AlbumsManager.css'),
          import('./PhotoOrderControls.css'),
          import('./ConfigManager.css'),
          import('./BrandingManager.css'),
          import('./LinksManager.css'),
          import('./ShareModal.css'),
          import('./PasswordInput.css'),
          import('./Metrics/Metrics.css'),
          import('./Metrics/VisitorMap.css'),
          import('leaflet/dist/leaflet.css'),
        ]);
        
        // Wait for browser to process and apply styles
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        console.log('✅ Admin CSS loaded');
      } catch (err) {
        console.error('Failed to load CSS:', err);
      } finally {
        setCssLoaded(true);
      }
    };
    
    loadCSS();
  }, []);
  
  // Determine active tab from URL
  const activeTab = getActiveTab(location.pathname);
  
  // Shared state
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
  const [folders, setFolders] = useState<AlbumFolder[]>([]);
  const [messages, setMessages] = useState<Array<{ id: number; type: 'success' | 'error'; text: string }>>([]);

  // Helper to add a new message
  const addMessage = (message: { type: 'success' | 'error'; text: string }) => {
    const newMessage = { ...message, id: Date.now() + Math.random() };
    setMessages(prev => [newMessage, ...prev]); // Add to beginning (newest on top)
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== newMessage.id));
    }, 5000);
  };

  // Helper to remove a specific message
  const removeMessage = (id: number) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  // Check for running jobs on mount to ensure SSE toaster appears if jobs are running
  useEffect(() => {
    const checkForRunningJobs = async () => {
      try {
        // Check AI titles job
        const titlesRes = await fetch(`${API_URL}/api/ai-titles/status`, {
          credentials: "include",
        });
        if (titlesRes.ok) {
          const titlesStatus = await titlesRes.json();
          if (titlesStatus.running && !titlesStatus.isComplete) {
            console.log("[AdminPortal] Found running titles job, ensuring toaster visibility");
            sseToaster.setGeneratingTitles(true);
          }
        }

        // Check optimization job
        const optRes = await fetch(`${API_URL}/api/image-optimization/status`, {
          credentials: "include",
        });
        if (optRes.ok) {
          const optStatus = await optRes.json();
          if (optStatus.running && !optStatus.isComplete) {
            console.log("[AdminPortal] Found running optimization job, ensuring toaster visibility");
            sseToaster.setIsOptimizationRunning(true);
          }
        }
      } catch (err) {
        console.error("[AdminPortal] Failed to check for running jobs:", err);
      }
    };

    // Only check if no jobs are currently showing (to avoid interfering with active jobs)
    if (!sseToaster.generatingTitles && !sseToaster.isOptimizationRunning) {
      checkForRunningJobs();
    }
  }, []);

  // Check authentication on mount
  useEffect(() => {
    fetch(`${API_URL}/api/auth/status`, {
      credentials: 'include',
    })
      .then((res) => {
        // Check for rate limiting
        if (res.status === 429) {
          if ((window as any).handleRateLimit) {
            (window as any).handleRateLimit();
          }
          throw new Error('Rate limited');
        }
        return res.json();
      })
      .then((data) => {
        setAuthStatus(data);
        if (data.authenticated) {
          // Track admin portal access
          trackLoginSucceeded(data.user?.email, data.user?.name);
          loadExternalLinks();
          loadBranding();
          loadAlbums();
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to check auth status:', err);
        setLoading(false);
      });
  }, []);

  // Track tab changes
  useEffect(() => {
    if (authStatus?.authenticated) {
      trackAdminTabChange(activeTab);
    }
  }, [activeTab, authStatus]);

  // Listen for albums-updated events from AlbumsManager
  useEffect(() => {
    const handleAlbumsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      // Don't reload if the event came from AlbumsManager drag operations
      // AlbumsManager already has the optimistic state
      if (customEvent.detail?.skipReload) {
        console.log('📢 AdminPortal: albums-updated event received, skipping reload (optimistic update)');
        return;
      }
      console.log('📢 AdminPortal: albums-updated event received, reloading albums...');
      loadAlbums();
    };

    window.addEventListener('albums-updated', handleAlbumsUpdated);
    
    return () => {
      window.removeEventListener('albums-updated', handleAlbumsUpdated);
    };
  }, []);

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
      const data = await res.json();
      
      // New API format: { albums: [...], folders: [...] }
      // Handle backward compatibility with old array format
      if (Array.isArray(data)) {
        // Old format (array of albums)
        const albumsList: Album[] = data.map((album: string | { name: string; published: boolean }) => {
          if (typeof album === 'string') {
            return { name: album, published: true };
          }
          return album;
        });
        setAlbums(albumsList);
        setFolders([]);
      } else {
        // New format (object with albums and folders)
        setAlbums(data.albums || []);
        setFolders(data.folders || []);
      }
    } catch (err) {
      console.error('Failed to load albums:', err);
    }
  };

  const handleLogout = async () => {
    try {
      // Track logout before actually logging out
      trackLogout(authStatus?.user?.email);
      // Immediately update auth state (synchronous) to prevent header flash
      window.dispatchEvent(new Event('user-logged-out'));
      // Make logout API call
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      // Navigate home
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (loading || !cssLoaded) {
    return (
      <div className="admin-portal">
        <div className="admin-container">
          <div
            className="loading-container"
            style={{
              minHeight: "calc(100vh - 100px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              paddingTop: "2rem",
            }}
          >
            <div className="loading-spinner"></div>
            <p>{!cssLoaded ? 'Loading styles...' : 'Loading site settings...'}</p>
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
                <CpuIcon width="48" height="48" />
              </div>
              
              <h2>Authentication Required</h2>
              <p className="auth-description">
                You need to sign in with your Google account to access the admin panel and manage your photography website.
              </p>
              
              <div className="auth-actions">
                <a href={`${API_URL}/api/auth/google`} className="btn-login">
                  <GoogleLogoIcon width="20" height="20" style={{ marginRight: '12px' }} />
                  Sign in with Google
                </a>
                <a href="/" className="btn-home">
                  <HomeIcon width="18" height="18" style={{ marginRight: '8px' }} />
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
            <LogoutIcon width="18" height="18" style={{ marginRight: '8px' }} />
            Logout
          </button>
          <div className="admin-tabs">
            <button
              className={`tab-button ${activeTab === 'albums' ? 'active' : ''}`}
              onClick={() => navigate('/admin/albums')}
            >
              <ImageIcon width="20" height="20" style={{ marginRight: '8px' }} />
              Albums
            </button>
            <button
              className={`tab-button ${activeTab === 'metrics' ? 'active' : ''}`}
              onClick={() => navigate('/admin/metrics')}
            >
              <BarChartIcon width="20" height="20" style={{ marginRight: '8px' }} />
              Metrics
            </button>
            <button
              className={`tab-button ${activeTab === 'config' ? 'active' : ''}`}
              onClick={() => navigate('/admin/settings')}
            >
              <SettingsIcon width="20" height="20" style={{ marginRight: '8px' }} />
              Settings
            </button>
          </div>
        </div>

        <div className="toast-container">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`toast toast-${message.type}`}
            >
              <div className="toast-content">
                <span className="toast-icon">
                  {message.type === 'success' ? '✓' : '⚠'}
                </span>
                <span className="toast-text">{message.text}</span>
                <button 
                  className="toast-close"
                  onClick={() => removeMessage(message.id)}
                  aria-label="Close notification"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        {activeTab === 'metrics' && (
          <Metrics />
        )}

        {activeTab === 'albums' && (
          <AlbumsManager
            albums={albums}
            folders={folders}
            loadAlbums={loadAlbums}
            setMessage={addMessage}
          />
        )}

        {activeTab === 'config' && (
          <ConfigManager
            setMessage={addMessage}
            branding={branding}
            setBranding={setBranding}
            loadBranding={loadBranding}
            externalLinks={externalLinks}
            setExternalLinks={setExternalLinks}
          />
        )}
      </div>
    </div>
  );
}
