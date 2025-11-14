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
              marginBottom: '1rem',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

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

