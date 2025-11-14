/**
 * Invite Signup Page
 * Users land here from invitation email to complete their registration
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PasswordInput } from '../AdminPortal/PasswordInput';

const API_URL = import.meta.env.VITE_API_URL || '';

const InviteSignup: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  
  // Form fields
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Validation
  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/invite/${token}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Invalid invitation');
      }

      const data = await res.json();
      setEmail(data.email);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to validate invitation');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/invite/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete signup');
      }

      // Signup successful - redirect to login
      navigate('/login?message=signup-complete');
    } catch (err: any) {
      setError(err.message || 'Failed to complete signup');
      setLoading(false);
    }
  };

  if (loading && !email) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
      }}>
        <div style={{
          background: '#2a2a2a',
          border: '1px solid #3a3a3a',
          borderRadius: '12px',
          padding: '3rem',
          maxWidth: '500px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}>
          <p style={{ color: '#9ca3af' }}>Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !email) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
      }}>
        <div style={{
          background: '#2a2a2a',
          border: '1px solid #3a3a3a',
          borderRadius: '12px',
          padding: '3rem',
          maxWidth: '500px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: '1rem',
          }}>
            ❌
          </div>
          <h1 style={{
            fontSize: '1.5rem',
            marginBottom: '1rem',
            color: '#ffffff',
          }}>
            Invalid Invitation
          </h1>
          <p style={{
            color: '#9ca3af',
            marginBottom: '2rem',
          }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
            }}
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1a1a1a',
      padding: '2rem',
    }}>
      <div style={{
        background: '#2a2a2a',
        border: '1px solid #3a3a3a',
        borderRadius: '12px',
        padding: '3rem',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
          <h1 style={{
            fontSize: '1.75rem',
            marginBottom: '0.5rem',
            color: '#ffffff',
          }}>
            Complete Your Registration
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
            You've been invited to join. Please set up your account.
          </p>
        </div>

        {/* Email Display */}
        <div style={{
          background: '#1e1e1e',
          border: '1px solid #3a3a3a',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
            Signing up as
          </div>
          <div style={{ fontWeight: 600, color: '#e5e7eb' }}>
            {email}
          </div>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="branding-label">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="branding-input"
              style={{
                width: '100%',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="branding-label">
              Password *
            </label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
            />
            <p style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
              marginTop: '0.5rem',
            }}>
              Must be at least 8 characters long
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="branding-label">
              Confirm Password *
            </label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              padding: '0.75rem',
              borderRadius: '6px',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
            }}>
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
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          fontSize: '0.875rem',
          color: '#9ca3af',
        }}>
          Already have an account?{' '}
          <a
            href="/login"
            style={{
              color: 'var(--primary-color)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
};

export default InviteSignup;

