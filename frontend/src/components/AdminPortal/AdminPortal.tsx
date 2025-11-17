/**
 * Admin Portal Component
 * Main orchestrator for admin functionality - delegates to sub-components
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../../config';
// CSS will be loaded dynamically to ensure proper loading in dev mode
import { AuthStatus, ExternalLink, BrandingConfig, Album, AlbumFolder } from './types';
import AlbumsManager from './AlbumsManager';
import Metrics from './Metrics/Metrics';
import ConfigManager from './ConfigManager';
import { ProfileSection } from './ConfigManager/sections/ProfileSection';
import SecuritySetupPrompt from './SecuritySetupPrompt';
import LoginForm from './LoginForm';
import {
  trackLoginSucceeded,
  trackLogout,
  trackAdminTabChange,
} from '../../utils/analytics';
import { useSSEToaster } from '../../contexts/SSEToasterContext';
import { getActiveTab } from '../../utils/adminHelpers';
import {
  LogoutIcon,
  ImageIcon,
  BarChartIcon,
  SettingsIcon,
  UserIcon
} from '../icons/';
import packageJson from '../../../../package.json';

export default function AdminPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [cssLoaded, setCssLoaded] = useState(false);
  const sseToaster = useSSEToaster();
  
  // Redirect to /admin/albums after successful login
  useEffect(() => {
    if (authStatus?.authenticated && location.pathname.startsWith('/admin/login')) {
      navigate('/admin/albums', { replace: true });
    }
  }, [authStatus, location.pathname, navigate]);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (authStatus === null && !loading) {
      const path = location.pathname;
      if (!path.startsWith('/admin/login') && path.startsWith('/admin/')) {
        navigate('/admin/login', { replace: true });
      }
    }
  }, [location.pathname, authStatus, navigate, loading]);
  
  // Aggressively load CSS in dev mode
  useEffect(() => {
    const loadCSS = async () => {
      try {
        // Only import AdminPortal.css - other components import their own CSS
        await import('./AdminPortal.css');
        
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
    faviconPath: '',
    shuffleHomepage: true
  });
  const [albums, setAlbums] = useState<Album[]>([]);
  const [folders, setFolders] = useState<AlbumFolder[]>([]);
  const [messages, setMessages] = useState<Array<{ id: number; type: 'success' | 'error'; text: string }>>([]);
  const [showSecurityPrompt, setShowSecurityPrompt] = useState(false);
  const [metricsEnabled, setMetricsEnabled] = useState(false);
  const [availableAuthMethods, setAvailableAuthMethods] = useState({
    google: false,
    passkey: false,
    password: false,
  });

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
          checkMetricsEnabled();
        } else {
          // Set available auth methods from auth status
          setAvailableAuthMethods(data.availableAuthMethods || {
            google: false,
            passkey: false,
            password: false,
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to check auth status:', err);
        setLoading(false);
      });
  }, []);
  
  // Check for success messages in URL params and show toast
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const message = params.get('message');
    
    if (message === 'signup-complete') {
      addMessage({ type: 'success', text: '✓ Account created successfully! You can now sign in.' });
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (message === 'password-reset-complete') {
      addMessage({ type: 'success', text: '✓ Password reset successfully! You can now sign in with your new password.' });
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [location.search]);

  // Check if OpenObserve analytics is enabled
  const checkMetricsEnabled = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/config`, {
        credentials: 'include',
      });
      if (res.ok) {
        const config = await res.json();
        const isEnabled = config?.analytics?.openobserve?.enabled === true;
        console.log('[AdminPortal] Metrics enabled check:', isEnabled);
        setMetricsEnabled(isEnabled);
      }
    } catch (err) {
      console.error('Failed to check metrics config:', err);
    }
  }, []);

  // Listen for config updates (triggered after restart)
  useEffect(() => {
    const handleConfigUpdate = () => {
      console.log('[AdminPortal] Config update detected, reloading metrics status...');
      checkMetricsEnabled();
    };

    window.addEventListener('config-updated', handleConfigUpdate);
    return () => window.removeEventListener('config-updated', handleConfigUpdate);
  }, [checkMetricsEnabled]);

  // Track tab changes
  useEffect(() => {
    if (authStatus?.authenticated) {
      trackAdminTabChange(activeTab);
    }
  }, [activeTab, authStatus]);

  // Redirect admins from profile to settings
  useEffect(() => {
    if (activeTab === 'profile' && authStatus?.user?.role === 'admin') {
      navigate('/admin/settings');
    }
  }, [activeTab, authStatus, navigate]);

  // Load branding and links when switching to Settings tab
  useEffect(() => {
    if (activeTab === 'config' && authStatus?.authenticated) {
      console.log('[AdminPortal] Settings tab active, loading branding and links');
      loadBranding();
      loadExternalLinks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authStatus]);

  // Redirect from metrics if it's disabled
  useEffect(() => {
    if (activeTab === 'metrics' && !metricsEnabled && authStatus?.authenticated) {
      navigate('/admin');
    }
  }, [activeTab, metricsEnabled, authStatus, navigate]);

  // Check if user needs security setup after fresh login
  useEffect(() => {
    const freshLogin = location.state?.freshLogin;
    const dismissed = localStorage.getItem('security-setup-dismissed') === 'true';
    
    console.log('[Security Prompt] Check:', {
      freshLogin,
      dismissed,
      authenticated: authStatus?.authenticated,
      hasUser: !!authStatus?.user,
      user: authStatus?.user,
      locationState: location.state,
    });
    
    if (freshLogin && authStatus?.authenticated && authStatus?.user && !dismissed) {
      // Check if user has MFA or passkey set up
      const user = authStatus.user;
      const hasMFA = user.mfa_enabled === true;
      const hasPasskey = user.passkey_enabled === true;
      
      // Only show prompt if user signed in with credentials (not Google OAuth) and has no MFA/passkey
      const authMethods = user.auth_methods || [];
      const isCredentialUser = authMethods.includes('credentials');
      const isGoogleUser = authMethods.includes('google');
      
      console.log('[Security Prompt] User security status:', {
        hasMFA,
        hasPasskey,
        authMethods,
        isCredentialUser,
        isGoogleUser,
        shouldShow: isCredentialUser && !isGoogleUser && !hasMFA && !hasPasskey,
      });
      
      if (isCredentialUser && !isGoogleUser && !hasMFA && !hasPasskey) {
        console.log('[Security Prompt] Showing prompt!');
        setShowSecurityPrompt(true);
      }
      
      // Clear the freshLogin state so prompt doesn't show again on navigation
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [authStatus, location.state, navigate, location.pathname]);

  // Define loadAlbums early so it can be used in other hooks
  const loadAlbums = useCallback(async () => {
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
  }, []); // Empty deps - only depends on setState functions which are stable

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
  }, [loadAlbums]); // Added loadAlbums to dependencies to fix stale closure

  const loadExternalLinks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/external-links`, {
        credentials: 'include',
      });
      const data = await res.json();
      console.log('[AdminPortal] Loaded external links from API:', data);
      const linksData = data.links || [];
      console.log('[AdminPortal] Setting externalLinks state to:', linksData);
      setExternalLinks(linksData);
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
      console.log('[AdminPortal] Loaded branding data from API:', data);
      // Ensure all values are set (not undefined)
      const brandingData = {
        siteName: data.siteName || '',
        avatarPath: data.avatarPath || '',
        primaryColor: data.primaryColor || '#4ade80',
        secondaryColor: data.secondaryColor || '#22c55e',
        metaDescription: data.metaDescription || '',
        metaKeywords: data.metaKeywords || '',
        faviconPath: data.faviconPath || '',
        shuffleHomepage: data.shuffleHomepage ?? true
      };
      console.log('[AdminPortal] Setting branding state to:', brandingData);
      setBranding(brandingData);
    } catch (err) {
      console.error('Failed to load branding config:', err);
    }
  };


  // Handle successful login
  const handleLoginSuccess = async () => {
    // Refresh auth status
    const authRes = await fetch(`${API_URL}/api/auth/status`, {
      credentials: 'include',
    });
    
    if (authRes.ok) {
      const authData = await authRes.json();
      setAuthStatus(authData);
      
      // Load albums after successful login
      loadAlbums();
      
      // Check if user needs security setup
      const dismissed = localStorage.getItem('security-setup-dismissed') === 'true';
      const user = authData.user;
      
      if (user && !dismissed) {
        const hasMFA = user.mfa_enabled === true;
        const hasPasskey = user.passkey_enabled === true;
        const authMethods = user.auth_methods || [];
        const isCredentialUser = authMethods.includes('credentials');
        const isGoogleUser = authMethods.includes('google');
        
        if (isCredentialUser && !isGoogleUser && !hasMFA && !hasPasskey) {
          setShowSecurityPrompt(true);
        }
      }
    } else {
      window.location.reload();
    }
  };

  if (loading || !cssLoaded) {
    return (
      <div className="admin-portal">
        <div className="admin-container">
          <div className="loading-container loading-container-full">
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
          <LoginForm 
            availableAuthMethods={availableAuthMethods}
            onLoginSuccess={handleLoginSuccess}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal">
      <div className="admin-container">
        <div className="admin-header">
          <button
            className="btn-logout"
            style={{ display: 'inline-flex', alignItems: 'center' }}
            onClick={async (e) => {
              e.preventDefault();
              try {
                trackLogout(authStatus?.user?.email);
              } catch (error) {
                console.error('Analytics error:', error);
              }
              
              // Call logout endpoint and wait for it to complete
              try {
                await fetch(`${API_URL}/api/auth/logout`, {
                  method: 'POST',
                  credentials: 'include',
                });
              } catch (error) {
                console.error('Logout error:', error);
              }
              
              // Navigate to homepage after logout completes
              window.location.href = '/';
            }}
          >
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
            {metricsEnabled && (
              <button
                className={`tab-button ${activeTab === 'metrics' ? 'active' : ''}`}
                onClick={() => navigate('/admin/metrics')}
              >
                <BarChartIcon width="20" height="20" style={{ marginRight: '8px' }} />
                Metrics
              </button>
            )}
            {/* Show Settings tab only for admins, Profile tab for viewers/managers */}
            {authStatus?.user?.role === 'admin' ? (
              <button
                className={`tab-button ${activeTab === 'config' ? 'active' : ''}`}
                onClick={() => navigate('/admin/settings')}
              >
                <SettingsIcon width="20" height="20" style={{ marginRight: '8px' }} />
                Settings
              </button>
            ) : (
              <button
                className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => navigate('/admin/profile')}
              >
                <UserIcon width="20" height="20" style={{ marginRight: '8px' }} />
                Profile
              </button>
            )}
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

        {activeTab === 'metrics' && metricsEnabled && (
          <Metrics />
        )}

        {activeTab === 'albums' && (
          <AlbumsManager
            albums={albums}
            folders={folders}
            loadAlbums={loadAlbums}
            setMessage={addMessage}
            userRole={(authStatus?.user?.role as 'admin' | 'manager' | 'viewer') || 'viewer'}
          />
        )}

        {activeTab === 'config' && authStatus?.user?.role === 'admin' && (
          <ConfigManager
            setMessage={addMessage}
            branding={branding}
            setBranding={setBranding}
            loadBranding={loadBranding}
            externalLinks={externalLinks}
            setExternalLinks={setExternalLinks}
          />
        )}

        {activeTab === 'profile' && authStatus?.user?.role !== 'admin' && (
          <div className="admin-content">
            <ProfileSection setMessage={addMessage} />
          </div>
        )}

        {/* Security Setup Prompt Modal */}
        {showSecurityPrompt && (
          <SecuritySetupPrompt
            onComplete={async () => {
              // Refresh auth status to get updated MFA status
              const authRes = await fetch(`${API_URL}/api/auth/status`, {
                credentials: 'include',
              });
              
              if (authRes.ok) {
                const authData = await authRes.json();
                setAuthStatus(authData);
              }
              
              setShowSecurityPrompt(false);
            }}
            onDismiss={() => setShowSecurityPrompt(false)}
          />
        )}

        {/* Powered by Galleria Footer */}
        <div className="galleria-footer">
          <span className="footer-text">
            <a 
              href="https://github.com/theodorecharles/photography-website" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-galleria-link"
            >
              Galleria
            </a>
            {' '}v{packageJson.version}
          </span>
        </div>
      </div>
    </div>
  );
}
