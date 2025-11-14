/**
 * Password Reset Complete Page
 * Users land here from password reset email to set a new password
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PasswordInput } from "../AdminPortal/PasswordInput";

const API_URL = import.meta.env.VITE_API_URL || "";

const PasswordResetComplete: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  // Form fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);

  // Validation
  useEffect(() => {
    if (!token) {
      setError("Invalid password reset link");
      setLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/auth-extended/password-reset/${token}`,
        {
          credentials: "include",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Invalid password reset link");
      }

      const data = await res.json();
      setEmail(data.email);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to validate password reset link");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/auth-extended/password-reset/${token}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ password }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reset password");
      }

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login?message=password-reset");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
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
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "3rem",
            maxWidth: "500px",
            width: "90%",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#6b7280" }}>Validating reset link...</p>
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
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "3rem",
            maxWidth: "500px",
            width: "90%",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>❌</div>
          <h1
            style={{
              fontSize: "1.5rem",
              marginBottom: "1rem",
              color: "#1f2937",
            }}
          >
            Invalid or Expired Link
          </h1>
          <p
            style={{
              color: "#6b7280",
              marginBottom: "2rem",
            }}
          >
            {error}
          </p>
          <button
            onClick={() => navigate("/reset-password")}
            style={{
              background: "var(--primary-color)",
              color: "white",
              border: "none",
              padding: "0.75rem 2rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: 600,
              marginRight: "1rem",
            }}
          >
            Request New Link
          </button>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "#6b7280",
              color: "white",
              border: "none",
              padding: "0.75rem 2rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: 600,
            }}
          >
            Go to Homepage
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
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "3rem",
            maxWidth: "500px",
            width: "90%",
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
            Password Reset Successful
          </h1>
          <p
            style={{
              color: "#6b7280",
              marginBottom: "2rem",
            }}
          >
            Your password has been successfully reset. Redirecting to login...
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
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
          <h1
            style={{
              fontSize: "1.75rem",
              marginBottom: "0.5rem",
              color: "#1f2937",
            }}
          >
            Set New Password
          </h1>
          <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
            Create a new password for your account.
          </p>
        </div>

        {/* Email Display */}
        <div
          style={{
            background: "#f3f4f6",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "0.85rem",
              color: "#6b7280",
              marginBottom: "0.25rem",
            }}
          >
            Resetting password for
          </div>
          <div style={{ fontWeight: 600, color: "#1f2937" }}>{email}</div>
        </div>

        {/* Password Reset Form */}
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
                color: "#6b7280",
                marginTop: "0.5rem",
              }}
            >
              Must be at least 8 characters long
            </p>
          </div>

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
            {loading ? "Resetting Password..." : "Reset Password"}
          </button>
        </form>

        <p
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
        </p>
      </div>
    </div>
  );
};

export default PasswordResetComplete;
