/**
 * Admin Portal Component
 * Main orchestrator for admin functionality - delegates to sub-components
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../../config';
// CSS will be loaded dynamically to ensure proper loading in dev mode
import { AuthStatus, ExternalLink, BrandingConfig, Album, AlbumFolder, Tab } from './types';
import AlbumsManager from './AlbumsManager';
import Metrics from './Metrics/Metrics';
import ConfigManager from './ConfigManager';
import {
  trackLoginSucceeded,
  trackLogout,
  trackAdminTabChange,
} from '../../utils/analytics';
import { useSSEToaster } from '../../contexts/SSEToasterContext';

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
        await new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
              });
            });
          });
        });
        
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
  const getActiveTab = (): Tab => {
    if (location.pathname.includes('/settings')) return 'config';
    if (location.pathname.includes('/metrics')) return 'metrics';
    return 'albums';
  };
  const activeTab = getActiveTab();
  
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
          <div className="admin-tabs">
            <button
              className={`tab-button ${activeTab === 'albums' ? 'active' : ''}`}
              onClick={() => navigate('/admin/albums')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              Albums
            </button>
            <button
              className={`tab-button ${activeTab === 'metrics' ? 'active' : ''}`}
              onClick={() => navigate('/admin/metrics')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              Metrics
            </button>
            <button
              className={`tab-button ${activeTab === 'config' ? 'active' : ''}`}
              onClick={() => navigate('/admin/settings')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
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
