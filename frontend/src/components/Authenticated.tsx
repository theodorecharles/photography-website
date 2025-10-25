/**
 * Authenticated Page Component
 * Displays after successful Google OAuth login
 */

import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import './Authenticated.css';

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

export default function Authenticated() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication status
    fetch(`${API_URL}/api/auth/status`, {
      credentials: 'include', // Important: send cookies
    })
      .then((res) => res.json())
      .then((data) => {
        setAuthStatus(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to check auth status:', err);
        setLoading(false);
      });
  }, []);

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
      <div className="authenticated-page">
        <div className="auth-container">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!authStatus?.authenticated) {
    return (
      <div className="authenticated-page">
        <div className="auth-container">
          <h1>Not Authenticated</h1>
          <p>Please log in to access this page.</p>
          <a href="/" className="btn-home">Go Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="authenticated-page">
      <div className="auth-container">
        <h1>Welcome!</h1>
        {authStatus.user?.picture && (
          <img 
            src={authStatus.user.picture} 
            alt={authStatus.user.name}
            className="user-avatar"
          />
        )}
        <p className="user-name">{authStatus.user?.name}</p>
        <p className="user-email">{authStatus.user?.email}</p>
        
        <div className="auth-actions">
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
          <a href="/" className="btn-home">Go Home</a>
        </div>
      </div>
    </div>
  );
}

