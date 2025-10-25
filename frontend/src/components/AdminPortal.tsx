/**
 * Admin Portal Component
 * Allows authenticated users to manage site settings
 */

import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import './AdminPortal.css';

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

export default function AdminPortal() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [saving, setSaving] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
          loadExternalLinks();
          loadBranding();
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
      setBranding(data);
    } catch (err) {
      console.error('Failed to load branding config:', err);
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

  const handleBrandingChange = (field: keyof BrandingConfig, value: string) => {
    setBranding(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogout = async () => {
    try {
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
            <p>Loading admin portal...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!authStatus?.authenticated) {
    return (
      <div className="admin-portal">
        <div className="admin-container">
          <h1>Admin Portal</h1>
          <p>You must be logged in to access the admin portal.</p>
          <div className="auth-actions">
            <a href={`${API_URL}/api/auth/google`} className="btn-login">
              <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '8px' }}>
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.55 0 9s.348 2.827.957 4.042l3.007-2.335z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Sign in with Google
            </a>
            <a href="/" className="btn-home">Go Home</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal">
      <div className="admin-container">
        <div className="admin-header">
          <div className="admin-user-info">
            {authStatus.user?.picture && (
              <img 
                src={authStatus.user.picture} 
                alt={authStatus.user.name}
                className="admin-avatar"
              />
            )}
            <div>
              <h1>Admin Portal</h1>
              <div className="admin-status">
                <span className="status-indicator online"></span>
                <p className="admin-user-email">{authStatus.user?.email}</p>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>

        {message && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        <section className="admin-section">
          <h2>🎨 Branding & Appearance</h2>
          <p className="section-description">Customize your site's appearance, colors, and branding</p>
          
          <div className="branding-grid">
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

            <div className="branding-group">
              <label className="branding-label">Avatar/Logo Path</label>
              <input
                type="text"
                value={branding.avatarPath}
                onChange={(e) => handleBrandingChange('avatarPath', e.target.value)}
                className="branding-input"
                placeholder="/photos/avatar.png"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">Primary Color</label>
              <div className="color-input-group">
                <input
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                  className="color-picker"
                />
                <input
                  type="text"
                  value={branding.primaryColor}
                  onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                  className="branding-input color-text"
                  placeholder="#4ade80"
                />
              </div>
            </div>

            <div className="branding-group">
              <label className="branding-label">Secondary Color</label>
              <div className="color-input-group">
                <input
                  type="color"
                  value={branding.secondaryColor}
                  onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                  className="color-picker"
                />
                <input
                  type="text"
                  value={branding.secondaryColor}
                  onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                  className="branding-input color-text"
                  placeholder="#22c55e"
                />
              </div>
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

            <div className="branding-group">
              <label className="branding-label">Favicon Path</label>
              <input
                type="text"
                value={branding.faviconPath}
                onChange={(e) => handleBrandingChange('faviconPath', e.target.value)}
                className="branding-input"
                placeholder="/favicon.ico"
              />
            </div>
          </div>

          <div className="branding-preview">
            <h3>Preview</h3>
            <div className="preview-card" style={{
              '--primary-color': branding.primaryColor,
              '--secondary-color': branding.secondaryColor
            } as React.CSSProperties}>
              <div className="preview-header">
                <div className="preview-avatar">
                  {branding.avatarPath ? (
                    <img src={branding.avatarPath} alt="Avatar" />
                  ) : (
                    <div className="preview-avatar-placeholder">👤</div>
                  )}
                </div>
                <div className="preview-info">
                  <h4>{branding.siteName || 'Your Site Name'}</h4>
                  <p>{branding.metaDescription || 'Your site description'}</p>
                </div>
              </div>
              <div className="preview-colors">
                <div className="preview-color" style={{ backgroundColor: branding.primaryColor }}></div>
                <div className="preview-color" style={{ backgroundColor: branding.secondaryColor }}></div>
              </div>
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

        <div className="admin-footer">
          <div className="footer-info">
            <p>Admin Portal v1.0 • Last updated: {new Date().toLocaleDateString()}</p>
          </div>
          <a href="/" className="btn-home">← Back to Site</a>
        </div>
      </div>
    </div>
  );
}

