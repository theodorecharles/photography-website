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

export default function AdminPortal() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Check authentication status
    fetch(`${API_URL}/api/auth/status`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        setAuthStatus(data);
        if (data.authenticated) {
          loadExternalLinks();
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to check auth status:', err);
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
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!authStatus?.authenticated) {
    return (
      <div className="admin-portal">
        <div className="admin-container">
          <h1>Access Denied</h1>
          <p>You must be logged in to access the admin portal.</p>
          <a href="/" className="btn-home">Go Home</a>
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
              <p className="admin-user-email">{authStatus.user?.email}</p>
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
          <h2>External Links</h2>
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
          <a href="/" className="btn-home">← Back to Site</a>
        </div>
      </div>
    </div>
  );
}

