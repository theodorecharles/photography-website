/**
 * Password Reset Request Page
 * Users request a password reset link via email
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";

const PasswordResetRequest: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "2rem",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "3rem",
            maxWidth: "500px",
            width: "100%",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
          <h1
            style={{
              fontSize: "1.75rem",
              marginBottom: "1rem",
              color: "#1f2937",
            }}
          >
            Check Your Email
          </h1>
          <p
            style={{
              color: "#6b7280",
              marginBottom: "2rem",
              lineHeight: 1.6,
            }}
          >
            If an account exists with <strong>{email}</strong>, you will receive
            a password reset link shortly.
          </p>
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.875rem",
              marginBottom: "2rem",
            }}
          >
            The link will expire in 1 hour.
          </p>
          <button
            onClick={() => navigate("/login")}
            style={{
              background: "var(--primary-color)",
              color: "white",
              border: "none",
              padding: "0.75rem 2rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: 600,
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
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "3rem",
          maxWidth: "500px",
          width: "100%",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔑</div>
          <h1
            style={{
              fontSize: "1.75rem",
              marginBottom: "0.5rem",
              color: "#1f2937",
            }}
          >
            Reset Your Password
          </h1>
          <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
            Enter your email address and we'll send you a link to reset your
            password.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "1rem",
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: "#fee2e2",
                border: "1px solid #fecaca",
                color: "#991b1b",
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
              background: loading ? "#9ca3af" : "var(--primary-color)",
              color: "white",
              border: "none",
              padding: "1rem",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontWeight: 600,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.opacity = "0.9";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
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
            color: "#6b7280",
          }}
        >
          Remember your password?{" "}
          <a
            href="/login"
            style={{
              color: "var(--primary-color)",
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
            background: "#fef3c7",
            borderRadius: "6px",
            fontSize: "0.875rem",
            color: "#92400e",
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
