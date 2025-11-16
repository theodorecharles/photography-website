/**
 * Password Reset Complete Page
 * Users land here from password reset email to set a new password
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PasswordInput } from '../AdminPortal/PasswordInput';

import { API_URL } from '../../config';
const PasswordResetComplete: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#4ade80');
  
  // Form fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Load branding config on mount
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const res = await fetch(`${API_URL}/api/branding`);
        if (res.ok) {
          const data = await res.json();
          setPrimaryColor(data.primaryColor || '#4ade80');
        }
      } catch (err) {
        console.error('Failed to load branding:', err);
      }
    };

    loadBranding();
  }, []);

  // Validation
  useEffect(() => {
    if (!token) {
      setError('Invalid reset link');
      setLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/password-reset/${token}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Invalid or expired reset link');
      }

      const data = await res.json();
      setEmail(data.email);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to validate reset link');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
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
      const res = await fetch(`${API_URL}/api/auth-extended/password-reset/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/admin?message=password-reset-complete');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
      setLoading(false);
    }
  };

  if (loading && !email) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#2a2a2a",
            border: "1px solid #3a3a3a",
            borderRadius: "12px",
            padding: "3rem",
            maxWidth: "500px",
            width: "90%",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
          }}
        >
          <p style={{ color: "#9ca3af" }}>Validating reset link...</p>
        </div>
      </div>
    );
  }

  if (error && !email) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#2a2a2a",
            border: "1px solid #3a3a3a",
            borderRadius: "12px",
            padding: "3rem",
            maxWidth: "500px",
            width: "90%",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>❌</div>
          <h1
            style={{
              fontSize: "1.5rem",
              marginBottom: "1rem",
              color: "#ffffff",
            }}
          >
            Invalid Reset Link
          </h1>
          <p
            style={{
              color: "#9ca3af",
              marginBottom: "2rem",
            }}
          >
            {error}
          </p>
          <button
            onClick={() => navigate("/reset-password")}
            className="btn-primary"
            style={{
              padding: "0.75rem 2rem",
              fontSize: "1rem",
            }}
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#2a2a2a",
            border: "1px solid #3a3a3a",
            borderRadius: "12px",
            padding: "3rem",
            maxWidth: "500px",
            width: "90%",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
          <h1
            style={{
              fontSize: "1.75rem",
              marginBottom: "1rem",
              color: "#ffffff",
            }}
          >
            Password Reset Successfully
          </h1>
          <p
            style={{
              color: "#9ca3af",
              marginBottom: "2rem",
              lineHeight: 1.6,
            }}
          >
            Your password has been updated. You can now sign in with your new password.
          </p>
          <p
            style={{
              color: "#9ca3af",
              fontSize: "0.875rem",
            }}
          >
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "#2a2a2a",
          border: "1px solid #3a3a3a",
          borderRadius: "12px",
          padding: "3rem",
          maxWidth: "500px",
          width: "100%",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔑</div>
          <h1
            style={{
              fontSize: "1.75rem",
              marginBottom: "0.5rem",
              color: "#ffffff",
            }}
          >
            Set New Password
          </h1>
          <p style={{ color: "#9ca3af", fontSize: "0.95rem" }}>
            Create a new password for your account.
          </p>
        </div>

        {/* Email Display */}
        <div
          style={{
            background: "#1e1e1e",
            border: "1px solid #3a3a3a",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#9ca3af", marginBottom: "0.25rem" }}>
            Resetting password for
          </div>
          <div style={{ fontWeight: 600, color: "#e5e7eb" }}>
            {email}
          </div>
        </div>

        {/* Password Reset Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label className="branding-label">
              New Password *
            </label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
            />
            <p
              style={{
                fontSize: "0.75rem",
                color: "#9ca3af",
                marginTop: "0.5rem",
              }}
            >
              Must be at least 8 characters long
            </p>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label className="branding-label">
              Confirm New Password *
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
            <div
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
                padding: "0.75rem",
                borderRadius: "6px",
                marginBottom: "1.5rem",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "1rem",
              fontWeight: 600,
              background: primaryColor,
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              opacity: loading ? 0.5 : 1,
              cursor: loading ? "not-allowed" : "pointer",
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.filter = 'brightness(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
            fontSize: "0.875rem",
            color: "#9ca3af",
          }}
        >
          Remember your password?{" "}
          <a
            href="/admin"
            style={{
              color: primaryColor,
              textDecoration: "none",
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

export default PasswordResetComplete;
