/**
 * LoginForm Component
 * Handles all authentication UI (Google OAuth, Passkey, Credentials)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../../config';
import { AuthMethod } from './types';
import {
  GoogleLogoIcon,
  HomeIcon,
  LockIcon,
} from '../icons/';

interface LoginFormProps {
  availableAuthMethods: {
    google: boolean;
    passkey: boolean;
    password: boolean;
  };
  onLoginSuccess: () => void;
}

export default function LoginForm({ availableAuthMethods, onLoginSuccess }: LoginFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeAuthTab, setActiveAuthTab] = useState<AuthMethod>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Read URL and set auth tab on mount/navigation (when user uses back button or direct URL)
  useEffect(() => {
    const path = location.pathname;
    
    if (path === '/admin/login/passkey') {
      setActiveAuthTab('passkey');
    } else if (path === '/admin/login/password') {
      setActiveAuthTab('credentials');
    } else if (path === '/admin/login') {
      setActiveAuthTab(null);
    }
  }, [location.pathname]);

  // Load saved passkey email when switching to passkey tab
  useEffect(() => {
    if (activeAuthTab === 'passkey') {
      const savedEmail = localStorage.getItem('passkeyEmail');
      if (savedEmail) {
        setUsername(savedEmail);
      }
    }
  }, [activeAuthTab]);

  // Sync URL with auth tab state (when user clicks buttons)
  const updateAuthRoute = (method: AuthMethod) => {
    if (method === 'passkey') {
      navigate('/admin/login/passkey');
    } else if (method === 'credentials') {
      navigate('/admin/login/password');
    } else {
      navigate('/admin/login');
    }
    setActiveAuthTab(method);
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

      // Success
      setLoginLoading(false);
      onLoginSuccess();
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

      // Success
      setLoginLoading(false);
      onLoginSuccess();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setLoginError('Authentication cancelled');
      } else {
        setLoginError(err.message || 'Passkey authentication failed');
      }
      setLoginLoading(false);
    }
  };

  return (
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
          <div className="login-error">
            {loginError}
          </div>
        )}

        {/* Auth Method Selection - Main Screen */}
        {!activeAuthTab && (
          <div className="auth-actions">
            {availableAuthMethods.google && (
              <a 
                href={`${API_URL}/api/auth/google`} 
                className="btn-login btn-login-google"
              >
                <GoogleLogoIcon width="20" height="20" style={{ marginRight: '12px' }} />
                Sign in with Google
              </a>
            )}
            
            {availableAuthMethods.passkey && (
              <button
                onClick={() => updateAuthRoute('passkey')}
                className="btn-login btn-login-passkey"
              >
                <span style={{ fontSize: '1.2rem', marginRight: '12px' }}>🔑</span>
                Sign in with Passkey
              </button>
            )}
            
            {availableAuthMethods.password && (
              <button
                onClick={() => updateAuthRoute('credentials')}
                className="btn-login btn-login-password"
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
              <form onSubmit={handleCredentialsLogin} className="auth-form-full">
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
                <div className="auth-input-group auth-input-group-spaced">
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
                  className="btn-login btn-login-full"
                  disabled={loginLoading}
                >
                  {loginLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCredentialsLogin} className="auth-form-full">
                <div className="mfa-info-box">
                  <p className="mfa-info-box-title">
                    Two-Factor Authentication Required
                  </p>
                  <p className="mfa-info-box-text">
                    Enter the 6-digit code from your authenticator app for:
                  </p>
                  <p className="mfa-info-box-email">
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
                    className="auth-input mfa-token-input"
                    name="totp"
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    required
                    autoComplete="one-time-code"
                    disabled={loginLoading}
                    maxLength={6}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="btn-login btn-login-full"
                  disabled={loginLoading || mfaToken.length !== 6}
                  style={{ marginBottom: '0.5rem' }}
                >
                  {loginLoading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequiresMFA(false);
                    setMfaToken('');
                    setLoginError(null);
                    updateAuthRoute(null);
                  }}
                  disabled={loginLoading}
                  className="btn-back"
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
            <form onSubmit={(e) => { e.preventDefault(); handlePasskeyLogin(); }} className="auth-form-full">
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
                className="btn-login btn-login-full"
                disabled={loginLoading || !username}
                style={{ marginBottom: '0.5rem' }}
              >
                {loginLoading ? 'Authenticating...' : '🔑 Sign in with Passkey'}
              </button>
              <button
                type="button"
                onClick={() => {
                  updateAuthRoute(null);
                  setUsername('');
                  setLoginError(null);
                }}
                disabled={loginLoading}
                className="btn-back"
              >
                Back
              </button>
            </form>
          </div>
        )}

        {/* Return to Gallery Link */}
        <div className="auth-return-link">
          <a href="/" className="btn-home">
            <HomeIcon width="18" height="18" style={{ marginRight: '8px' }} />
            Return to Gallery
          </a>
        </div>
      </div>
    </div>
  );
}

