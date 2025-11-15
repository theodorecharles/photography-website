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
import { ProfileSection } from './ConfigManager/sections/ProfileSection';
import SecuritySetupPrompt from './SecuritySetupPrompt';
import {
  trackLoginSucceeded,
  trackLogout,
  trackAdminTabChange,
} from '../../utils/analytics';
import { useSSEToaster } from '../../contexts/SSEToasterContext';
import { getActiveTab } from '../../utils/adminHelpers';
import {
  GoogleLogoIcon,
  HomeIcon,
  LogoutIcon,
  ImageIcon,
  BarChartIcon,
  SettingsIcon,
  LockIcon,
  UserIcon
} from '../icons/';

type AuthMethod = 'google' | 'credentials' | 'passkey' | null;

export default function AdminPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [cssLoaded, setCssLoaded] = useState(false);
  const sseToaster = useSSEToaster();
  
  // Login state
  const [activeAuthTab, setActiveAuthTab] = useState<AuthMethod>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Load saved passkey email when switching to passkey tab
  useEffect(() => {
    if (activeAuthTab === 'passkey') {
      const savedEmail = localStorage.getItem('passkeyEmail');
      if (savedEmail) {
        setUsername(savedEmail);
      }
    }
  }, [activeAuthTab]);
  
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
    faviconPath: ''
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

  // Check if OpenObserve analytics is enabled
  const checkMetricsEnabled = async () => {
    try {
      const res = await fetch(`${API_URL}/api/config`, {
        credentials: 'include',
      });
      if (res.ok) {
        const config = await res.json();
        const isEnabled = config?.analytics?.openobserve?.enabled === true;
        setMetricsEnabled(isEnabled);
      }
    } catch (err) {
      console.error('Failed to check metrics config:', err);
    }
  };

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
      // Ensure all values are strings (not undefined)
      const brandingData = {
        siteName: data.siteName || '',
        avatarPath: data.avatarPath || '',
        primaryColor: data.primaryColor || '#4ade80',
        secondaryColor: data.secondaryColor || '#22c55e',
        metaDescription: data.metaDescription || '',
        metaKeywords: data.metaKeywords || '',
        faviconPath: data.faviconPath || ''
      };
      console.log('[AdminPortal] Setting branding state to:', brandingData);
      setBranding(brandingData);
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


  // Handle credential login
  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth-extended/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: username,
          password,
          mfaToken: mfaToken || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresMFA) {
          setRequiresMFA(true);
          setLoginError(null);
        } else {
          setLoginError(data.error || 'Login failed');
        }
        setLoginLoading(false);
        return;
      }

      // Success - fetch auth status and check if security prompt needed
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
          
          console.log('[Login] Checking security setup after credential login:', {
            hasMFA,
            hasPasskey,
            authMethods,
            isCredentialUser,
            isGoogleUser,
            shouldShow: isCredentialUser && !isGoogleUser && !hasMFA && !hasPasskey,
          });
          
          if (isCredentialUser && !isGoogleUser && !hasMFA && !hasPasskey) {
            console.log('[Login] Showing security prompt after credential login');
            setShowSecurityPrompt(true);
          }
        }
        
        setLoginLoading(false);
      } else {
        window.location.reload();
      }
    } catch (err) {
      setLoginError('Network error. Please try again.');
      setLoginLoading(false);
    }
  };

  // Handle passkey login
  const handlePasskeyLogin = async () => {
    setLoginError(null);
    setLoginLoading(true);

    try {
      // Get authentication options with email to narrow down passkeys
      const optionsRes = await fetch(`${API_URL}/api/auth-extended/passkey/auth-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username || undefined }),
      });

      if (!optionsRes.ok) {
        throw new Error('Failed to get authentication options');
      }

      const { sessionId, ...options } = await optionsRes.json();

      // Start WebAuthn authentication
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const credential = await startAuthentication(options);

      // Verify authentication
      const verifyRes = await fetch(`${API_URL}/api/auth-extended/passkey/auth-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential, sessionId }),
      });

      const data = await verifyRes.json();

      if (!verifyRes.ok) {
        setLoginError(data.error || 'Passkey authentication failed');
        setLoginLoading(false);
        return;
      }

      // Store email for next time
      if (username) {
        localStorage.setItem('passkeyEmail', username);
      }

      // Success - fetch auth status
      const authRes = await fetch(`${API_URL}/api/auth/status`, {
        credentials: 'include',
      });
      
      if (authRes.ok) {
        const authData = await authRes.json();
        setAuthStatus(authData);
        
        // Load albums after successful login
        loadAlbums();
        
        setLoginLoading(false);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setLoginError('Authentication cancelled');
      } else {
        setLoginError(err.message || 'Passkey authentication failed');
      }
      setLoginLoading(false);
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
                <LockIcon width="48" height="48" />
              </div>
              
              <h2>Sign in to Galleria</h2>
              <p className="auth-description">
                Choose your authentication method to access Galleria.
              </p>

              {loginError && (
                <div className="login-error" style={{
                  background: '#fee2e2',
                  border: '1px solid #ef4444',
                  color: '#991b1b',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  marginBottom: '1.5rem',
                  fontSize: '0.875rem'
                }}>
                  {loginError}
                </div>
              )}

              {/* Auth Method Selection - Main Screen */}
              {!activeAuthTab && (
                <div className="auth-actions">
                  {availableAuthMethods.google && (
                    <a 
                      href={`${API_URL}/api/auth/google`} 
                      className="btn-login"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none',
                        width: '100%',
                        height: '56px',
                        background: 'white',
                        border: '1px solid #d1d5db',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                        color: '#374151'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                      }}
                    >
                      <GoogleLogoIcon width="20" height="20" style={{ marginRight: '12px' }} />
                      Sign in with Google
                    </a>
                  )}
                  
                  {availableAuthMethods.passkey && (
                    <button
                      onClick={() => setActiveAuthTab('passkey')}
                      className="btn-login"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '56px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                      }}
                    >
                      <span style={{ fontSize: '1.2rem', marginRight: '12px' }}>🔑</span>
                      Sign in with Passkey
                    </button>
                  )}
                  
                  {availableAuthMethods.password && (
                    <button
                      onClick={() => setActiveAuthTab('credentials')}
                      className="btn-login"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '56px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                      }}
                    >
                      <LockIcon width="20" height="20" style={{ marginRight: '12px' }} />
                      Sign in with Password
                    </button>
                  )}
                </div>
              )}

              {/* Google OAuth - Hidden (only via button) */}
              {activeAuthTab === 'google' && availableAuthMethods.google && (
                <div className="auth-actions">
                  <a href={`${API_URL}/api/auth/google`} className="btn-login">
                    <GoogleLogoIcon width="20" height="20" style={{ marginRight: '12px' }} />
                    Sign in with Google
                  </a>
                </div>
              )}

              {/* Email/Password */}
              {activeAuthTab === 'credentials' && (
                <div className="auth-actions">
                  {!requiresMFA ? (
                    <form onSubmit={handleCredentialsLogin} style={{ width: '100%' }}>
                      <div className="auth-input-group">
                        <label className="auth-input-label">
                          Email
                        </label>
                        <input
                          type="email"
                          className="auth-input"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          autoComplete="email"
                          disabled={loginLoading}
                          placeholder="Enter your email"
                          autoFocus
                        />
                      </div>
                      <div className="auth-input-group" style={{ marginBottom: '1.5rem' }}>
                        <label className="auth-input-label">
                          Password
                        </label>
                        <input
                          type="password"
                          className="auth-input"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                          disabled={loginLoading}
                          placeholder="Enter your password"
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn-login"
                        disabled={loginLoading}
                        style={{ width: '100%' }}
                      >
                        {loginLoading ? 'Signing in...' : 'Sign In'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleCredentialsLogin} style={{ width: '100%' }}>
                      <div style={{
                        textAlign: 'center',
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px'
                      }}>
                        <p style={{ fontWeight: 600, color: '#15803d', margin: '0 0 0.5rem 0' }}>
                          Two-Factor Authentication Required
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#16a34a', margin: '0 0 0.5rem 0' }}>
                          Enter the 6-digit code from your authenticator app for:
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#15803d', fontWeight: 600, margin: 0, fontFamily: 'monospace' }}>
                          {username}
                        </p>
                      </div>
                      {/* Hidden username field for password managers */}
                      <input
                        type="text"
                        name="username"
                        value={username}
                        autoComplete="username"
                        readOnly
                        style={{ display: 'none' }}
                        tabIndex={-1}
                        aria-hidden="true"
                      />
                      <div className="auth-input-group">
                        <label className="auth-input-label">
                          Authentication Code
                        </label>
                        <input
                          type="text"
                          className="auth-input"
                          name="totp"
                          value={mfaToken}
                          onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          required
                          autoComplete="one-time-code"
                          disabled={loginLoading}
                          maxLength={6}
                          style={{
                            fontSize: '1.5rem',
                            textAlign: 'center',
                            letterSpacing: '0.5em',
                            fontWeight: 600
                          }}
                          autoFocus
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn-login"
                        disabled={loginLoading || mfaToken.length !== 6}
                        style={{ width: '100%', marginBottom: '0.5rem' }}
                      >
                        {loginLoading ? 'Verifying...' : 'Verify & Sign In'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRequiresMFA(false);
                          setMfaToken('');
                          setLoginError(null);
                          setActiveAuthTab(null);
                        }}
                        disabled={loginLoading}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'white',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#6b7280'
                        }}
                      >
                        Back
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Passkey */}
              {activeAuthTab === 'passkey' && (
                <div className="auth-actions">
                  <form onSubmit={(e) => { e.preventDefault(); handlePasskeyLogin(); }} style={{ width: '100%' }}>
                    <div className="auth-input-group">
                      <label className="auth-input-label">
                        Email
                      </label>
                      <input
                        type="email"
                        className="auth-input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoComplete="email webauthn"
                        disabled={loginLoading}
                        placeholder="Enter your email"
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-login"
                      disabled={loginLoading || !username}
                      style={{ width: '100%', marginBottom: '0.5rem' }}
                    >
                      {loginLoading ? 'Authenticating...' : '🔑 Sign in with Passkey'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAuthTab(null);
                        setUsername('');
                        setLoginError(null);
                      }}
                      disabled={loginLoading}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: '#6b7280'
                      }}
                    >
                      Back
                    </button>
                  </form>
                </div>
              )}

              {/* Return to Gallery Link */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
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
      </div>
    </div>
  );
}
