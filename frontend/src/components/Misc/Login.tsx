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

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
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

      // Successful login - redirect to admin
      window.dispatchEvent(new Event('auth-changed'));
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to Google OAuth endpoint
    window.location.href = `${API_URL}/api/auth/google`;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
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
              marginBottom: '1rem',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '1.5rem 0',
          }}
        >
          <div
            style={{
              flex: 1,
              height: '1px',
              background: '#3a3a3a',
            }}
          />
          <span
            style={{
              padding: '0 1rem',
              color: '#9ca3af',
              fontSize: '0.875rem',
            }}
          >
            OR
          </span>
          <div
            style={{
              flex: 1,
              height: '1px',
              background: '#3a3a3a',
            }}
          />
        </div>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          style={{
            width: '100%',
            padding: '1rem',
            fontSize: '1rem',
            background: '#fff',
            color: '#1f2937',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontWeight: 500,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
            />
            <path
              fill="#34A853"
              d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z"
            />
            <path
              fill="#EA4335"
              d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
            />
          </svg>
          Continue with Google
        </button>

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

