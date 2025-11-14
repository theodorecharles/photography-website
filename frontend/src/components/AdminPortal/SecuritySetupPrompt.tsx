/**
 * Security Setup Prompt Modal
 * Prompts users to set up MFA/Passkey after first credential login
 */

import React, { useState } from 'react';

interface SecuritySetupPromptProps {
  onSetupMFA: () => void;
  onDismiss: () => void;
}

const SecuritySetupPrompt: React.FC<SecuritySetupPromptProps> = ({
  onSetupMFA,
  onDismiss,
}) => {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  const handleDismiss = () => {
    if (dontAskAgain) {
      localStorage.setItem('security-setup-dismissed', 'true');
    }
    onDismiss();
  };

  const handleSetup = () => {
    if (dontAskAgain) {
      localStorage.setItem('security-setup-dismissed', 'true');
    }
    onSetupMFA();
  };

  return (
    <div className="modal-overlay" onClick={handleDismiss}>
      <div
        className="share-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <div className="share-modal-header">
          <h2>🔐 Secure Your Account</h2>
          <button
            className="close-button"
            onClick={handleDismiss}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="share-modal-content">
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
            <button onClick={handleDismiss} className="btn-secondary">
              Maybe Later
            </button>
            <button
              onClick={handleSetup}
              className="btn-primary"
              style={{
                background: 'rgba(74, 222, 128, 0.2)',
                borderColor: 'rgba(74, 222, 128, 0.3)',
                color: '#4ade80',
              }}
            >
              Set Up MFA Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySetupPrompt;

