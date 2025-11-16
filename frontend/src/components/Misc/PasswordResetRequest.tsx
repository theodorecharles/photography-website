/**
 * Password Reset Request Page
 * Users request a password reset link via email
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { API_URL } from '../../config';
const PasswordResetRequest: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#4ade80');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/auth-extended/password-reset/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to request password reset");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to request password reset");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
            Check Your Email
          </h1>
          <p
            style={{
              color: "#9ca3af",
              marginBottom: "2rem",
              lineHeight: 1.6,
            }}
          >
            If an account exists with <strong style={{ color: "#e5e7eb" }}>{email}</strong>, you will receive
            a password reset link shortly.
          </p>
          <p
            style={{
              color: "#9ca3af",
              fontSize: "0.875rem",
              marginBottom: "2rem",
            }}
          >
            The link will expire in 1 hour.
          </p>
          <button
            onClick={() => navigate("/admin")}
            className="btn-primary"
            style={{
              padding: "0.75rem 2rem",
              fontSize: "1rem",
            }}
          >
            Back to Login
          </button>
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
            Reset Your Password
          </h1>
          <p style={{ color: "#9ca3af", fontSize: "0.95rem" }}>
            Enter your email address and we'll send you a link to reset your
            password.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label className="branding-label">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="branding-input"
              style={{
                width: "100%",
              }}
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
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div
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
        </div>

        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            background: "rgba(251, 191, 36, 0.1)",
            border: "1px solid rgba(251, 191, 36, 0.3)",
            borderRadius: "6px",
            fontSize: "0.875rem",
            color: "#fbbf24",
          }}
        >
          <strong>Note:</strong> Password reset is only available for accounts
          without MFA enabled. If you have MFA enabled, please contact an
          administrator for assistance.
        </div>
      </div>
    </div>
  );
};

export default PasswordResetRequest;
