/**
 * Invite Link Modal
 * Displays a copyable invitation link when email service is disabled
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
          <h2>📧 {t('userManagement.invitationLink')}</h2>
          <button className="close-button" onClick={onClose} aria-label={t('common.close')}>
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
              <strong>{t('userManagement.emailServiceNotConfigured')}</strong>
              <br />
              {t('userManagement.emailServiceNotConfiguredDescription')}
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#d1d5db' }}>
              {t('userManagement.userEmail')}:
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
              {t('userManagement.invitationLink')}:
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
                {copied ? t('photo.copied') : t('userManagement.copy')}
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
              <strong>{t('userManagement.tip')}:</strong> {t('userManagement.invitationLinkExpiry')}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={handleCopy} className="btn-primary">
              {copied ? t('userManagement.copiedToClipboard') : t('userManagement.copyLink')}
            </button>
            <button onClick={onClose} className="btn-secondary">
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

