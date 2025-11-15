/**
 * Login Page
 * Handles both credential-based and Google OAuth login
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PasswordInput } from '../AdminPortal/PasswordInput';

const API_URL = import.meta.env.VITE_API_URL || '';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);

  // Check for success messages in URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const message = params.get('message');
    
    if (message === 'signup-complete') {
      setSuccessMessage('Account created successfully! You can now sign in.');
    } else if (message === 'password-reset-complete') {
      setSuccessMessage('Password reset successfully! You can now sign in with your new password.');
    }
  }, [location.search]);

  // Check if Google OAuth is configured
  useEffect(() => {
    const checkGoogleOAuth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/status`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setGoogleOAuthEnabled(data.googleOAuthEnabled || false);
        }
      } catch (err) {
        console.error('Failed to check Google OAuth status:', err);
      }
    };
    checkGoogleOAuth();
  }, []);

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth-extended/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await res.json();
      
      // If MFA is required, redirect to MFA setup/verification
      if (data.mfaRequired) {
        // MFA setup flow would go here
        // For now, just show error
        throw new Error('MFA verification required');
      }

      // Successful login - redirect to admin with fresh login flag
      window.dispatchEvent(new Event('auth-changed'));
      navigate('/admin', { state: { freshLogin: true } });
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          background: '#2a2a2a',
          border: '1px solid #3a3a3a',
          borderRadius: '12px',
          padding: '3rem',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
          <h1
            style={{
              fontSize: '1.75rem',
              marginBottom: '0.5rem',
              color: '#ffffff',
            }}
          >
            Sign In
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
            Sign in to access the admin portal
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div
            style={{
              background: 'rgba(74, 222, 128, 0.1)',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              color: '#4ade80',
              padding: '0.75rem',
              borderRadius: '6px',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              textAlign: 'center',
            }}
          >
            ✓ {successMessage}
          </div>
        )}

        {/* Credential Login Form */}
        <form onSubmit={handleCredentialLogin}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="branding-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="branding-input"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="branding-label">Password</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
            <a
              href="/reset-password"
              style={{
                fontSize: '0.875rem',
                color: 'var(--primary-color)',
                textDecoration: 'none',
              }}
            >
              Forgot password?
            </a>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '0.75rem',
                borderRadius: '6px',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1rem',
              opacity: loading ? 0.5 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider - Only show if Google OAuth is enabled */}
        {googleOAuthEnabled && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.5rem 0',
              gap: '1rem',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: '#3a3a3a' }} />
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#3a3a3a' }} />
          </div>
        )}

        {/* Google Sign In Button */}
        {googleOAuthEnabled && (
          <a
            href={`${API_URL}/api/auth/google`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '1rem',
              fontSize: '1rem',
              background: '#ffffff',
              color: '#1f2937',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            <svg
              style={{ width: '20px', height: '20px', marginRight: '0.75rem' }}
              viewBox="0 0 24 24"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </a>
        )}

        <p
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.875rem',
            color: '#9ca3af',
          }}
        >
          Don't have an account? Contact an administrator for an invitation.
        </p>
      </div>
    </div>
  );
};

export default Login;

