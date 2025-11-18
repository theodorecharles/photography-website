/**
 * Invite Link Modal
 * Displays a copyable invitation link when email service is disabled
 */

import React, { useState } from 'react';
import { error } from '../../../../../utils/logger';

interface InviteLinkModalProps {
  inviteUrl: string;
  userEmail: string;
  onClose: () => void;
}

export const InviteLinkModal: React.FC<InviteLinkModalProps> = ({
  inviteUrl,
  userEmail,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      error('Failed to copy:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="share-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <div className="share-modal-header">
          <h2>📧 Invitation Link</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="share-modal-content">
          <div
            style={{
              background: 'rgba(255, 200, 0, 0.1)',
              border: '1px solid rgba(255, 200, 0, 0.3)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#ffc800', lineHeight: 1.6 }}>
              <strong>⚠️ Email Service Not Configured</strong>
              <br />
              The invitation email could not be sent automatically. Please copy the link below and send it to the user manually.
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#d1d5db' }}>
              User Email:
            </label>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '0.75rem',
                borderRadius: '6px',
                fontSize: '0.95rem',
                color: '#e5e7eb',
                fontFamily: 'monospace',
              }}
            >
              {userEmail}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#d1d5db' }}>
              Invitation Link:
            </label>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '0.75rem',
                  paddingRight: '100px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  color: '#4ade80',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  border: '1px solid rgba(74, 222, 128, 0.3)',
                }}
              >
                {inviteUrl}
              </div>
              <button
                onClick={handleCopy}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  background: copied ? '#4ade80' : 'var(--primary-color)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: 600,
                }}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(66, 153, 225, 0.1)',
              border: '1px solid rgba(66, 153, 225, 0.3)',
              borderRadius: '6px',
              padding: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#93c5fd', lineHeight: 1.6 }}>
              <strong>💡 Tip:</strong> This invitation link will expire in 7 days. The user can use it to create their account and set up their credentials.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={handleCopy} className="btn-primary">
              {copied ? '✓ Copied to Clipboard' : 'Copy Link'}
            </button>
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

