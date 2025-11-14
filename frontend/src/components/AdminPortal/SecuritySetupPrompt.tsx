/**
 * Security Setup Prompt Modal
 * Prompts users to set up MFA/Passkey after first credential login
 */

import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

interface SecuritySetupPromptProps {
  onComplete: () => void;
  onDismiss: () => void;
}

interface MFASetupData {
  qrCode: string;
  secret: string;
  backupCodes: string[];
  setupToken: string;
}

const SecuritySetupPrompt: React.FC<SecuritySetupPromptProps> = ({
  onComplete,
  onDismiss,
}) => {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [mfaSetup, setMfaSetup] = useState<MFASetupData | null>(null);
  const [mfaToken, setMfaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDismiss = () => {
    if (dontAskAgain) {
      localStorage.setItem('security-setup-dismissed', 'true');
    }
    onDismiss();
  };

  const handleStartMFASetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/mfa/setup`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to start MFA setup');

      const data = await res.json();
      setMfaSetup({
        qrCode: data.qrCode,
        secret: data.secret,
        backupCodes: data.backupCodes,
        setupToken: data.setupToken,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to start MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMFASetup = async () => {
    if (!mfaSetup || mfaToken.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/mfa/verify-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          setupToken: mfaSetup.setupToken,
          token: mfaToken,
          backupCodes: mfaSetup.backupCodes,
        }),
      });

      if (!res.ok) throw new Error('Invalid verification code');

      // Mark as dismissed since they completed setup
      if (dontAskAgain) {
        localStorage.setItem('security-setup-dismissed', 'true');
      }
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={mfaSetup ? undefined : handleDismiss}>
      <div
        className="share-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: mfaSetup ? '550px' : '500px' }}
      >
        <div className="share-modal-header">
          <h2>{mfaSetup ? 'Enable Two-Factor Authentication' : '🔐 Secure Your Account'}</h2>
          <button
            className="close-button"
            onClick={mfaSetup ? () => setMfaSetup(null) : handleDismiss}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="share-modal-content">
          {/* Error Display */}
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                padding: '0.75rem',
                marginBottom: '1rem',
                color: '#f87171',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
          )}

          {!mfaSetup ? (
            // Intro Screen
            <>
              <p className="share-description" style={{ marginBottom: '1rem' }}>
                Your account is currently protected only by a password. We strongly
                recommend setting up additional security measures to protect your
                account.
              </p>

              <div
                style={{
                  background: 'rgba(74, 222, 128, 0.1)',
                  border: '1px solid rgba(74, 222, 128, 0.3)',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <h3
                  style={{
                    color: '#4ade80',
                    fontSize: '0.95rem',
                    marginBottom: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  ✓ Multi-Factor Authentication (MFA)
                </h3>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#e5e7eb' }}>
                  <li style={{ marginBottom: '0.5rem' }}>
                    Adds an extra layer of security with time-based codes
                  </li>
                  <li style={{ marginBottom: '0.5rem' }}>
                    Works with apps like Google Authenticator or Authy
                  </li>
                  <li>Get backup codes for account recovery</li>
                </ul>
              </div>

              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <h3
                  style={{
                    color: '#60a5fa',
                    fontSize: '0.95rem',
                    marginBottom: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  🔑 Passkeys (Optional)
                </h3>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#e5e7eb' }}>
                  <li style={{ marginBottom: '0.5rem' }}>
                    Use biometrics or device PIN for quick, secure login
                  </li>
                  <li style={{ marginBottom: '0.5rem' }}>
                    No passwords needed - just your fingerprint or face
                  </li>
                  <li>Can be set up after enabling MFA</li>
                </ul>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.5rem',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                }}
              >
                <input
                  type="checkbox"
                  id="dont-ask-again"
                  checked={dontAskAgain}
                  onChange={(e) => setDontAskAgain(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label
                  htmlFor="dont-ask-again"
                  style={{
                    fontSize: '0.875rem',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  Don't ask me again
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  paddingTop: '1rem',
                  borderTop: '1px solid #3a3a3a',
                }}
              >
                <button onClick={handleDismiss} className="btn-secondary" disabled={loading}>
                  Maybe Later
                </button>
                <button
                  onClick={handleStartMFASetup}
                  className="btn-primary"
                  disabled={loading}
                  style={{
                    background: 'rgba(74, 222, 128, 0.2)',
                    borderColor: 'rgba(74, 222, 128, 0.3)',
                    color: '#4ade80',
                  }}
                >
                  {loading ? 'Starting...' : 'Set Up MFA Now'}
                </button>
              </div>
            </>
          ) : (
            // MFA Setup Screen
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <p className="share-description">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
                </p>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <img
                    src={mfaSetup.qrCode}
                    alt="MFA QR Code"
                    style={{
                      maxWidth: '250px',
                      border: '2px solid #3a3a3a',
                      borderRadius: '8px',
                      background: 'white',
                      padding: '0.5rem',
                    }}
                  />
                </div>
                <div
                  style={{
                    background: '#1e1e1e',
                    border: '1px solid #3a3a3a',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    color: '#e5e7eb',
                    letterSpacing: '0.05em',
                  }}
                >
                  {mfaSetup.secret}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#e5e7eb', fontWeight: 600 }}>
                  Backup Codes
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: '0 0 0.75rem 0', lineHeight: 1.5 }}>
                  Save these codes in a safe place. Each can be used once if you lose access to your authenticator.
                </p>
                <div
                  style={{
                    background: '#1e1e1e',
                    border: '1px solid #3a3a3a',
                    padding: '1rem',
                    borderRadius: '6px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    color: '#d1d5db',
                  }}
                >
                  {mfaSetup.backupCodes.map((code, i) => (
                    <div key={i} style={{ padding: '0.25rem' }}>
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="branding-label">Enter verification code from your app</label>
                <input
                  type="text"
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="branding-input"
                  maxLength={6}
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em' }}
                  autoFocus
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  paddingTop: '1rem',
                  borderTop: '1px solid #3a3a3a',
                }}
              >
                <button onClick={() => setMfaSetup(null)} className="btn-secondary" disabled={loading}>
                  Back
                </button>
                <button
                  onClick={handleCompleteMFASetup}
                  className="btn-primary"
                  disabled={loading || mfaToken.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Enable MFA'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecuritySetupPrompt;

