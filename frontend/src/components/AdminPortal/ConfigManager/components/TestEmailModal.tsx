/**
 * Test Email Modal
 * Allows admin to send a test email to verify SMTP configuration
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../../config';


interface TestEmailModalProps {
  onClose: () => void;
}

export const TestEmailModal: React.FC<TestEmailModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSendTest = async () => {
    if (!email || !email.includes('@')) {
      setResult({ type: 'error', message: t('testEmailModal.invalidEmail') });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/api/config/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      await res.json(); // Consume response

      if (res.ok) {
        setResult({
          type: 'success',
          message: t('testEmailModal.successMessage'),
        });
      } else {
        setResult({
          type: 'error',
          message: t('testEmailModal.errorMessage'),
        });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: t('testEmailModal.errorMessageDetail'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="generic-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <div className="generic-modal-header">
          <h2>{t('testEmailModal.title')}</h2>
          <button className="close-button" onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>
        <div className="generic-modal-content">
          <p style={{ marginBottom: '1.5rem', color: '#d1d5db', fontSize: '0.95rem' }}>
            {t('testEmailModal.description')}
          </p>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="branding-label">{t('testEmailModal.emailLabel')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('testEmailModal.emailPlaceholder')}
              className="branding-input"
              style={{ width: '100%' }}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleSendTest();
                }
              }}
            />
          </div>

          {result && (
            <div
              style={{
                padding: '1rem',
                borderRadius: '6px',
                marginBottom: '1.5rem',
                background: result.type === 'success' 
                  ? 'rgba(74, 222, 128, 0.1)' 
                  : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${result.type === 'success' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: result.type === 'success' ? '#4ade80' : '#ef4444',
                fontSize: '0.9rem',
              }}
            >
              {result.type === 'success' ? '✓ ' : '⚠ '}
              {result.message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button onClick={onClose} className="btn-secondary" disabled={loading}>
              {t('testEmailModal.close')}
            </button>
            <button 
              onClick={handleSendTest} 
              className="btn-primary" 
              disabled={loading || !email}
            >
              {loading ? t('testEmailModal.sending') : t('testEmailModal.sendButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

