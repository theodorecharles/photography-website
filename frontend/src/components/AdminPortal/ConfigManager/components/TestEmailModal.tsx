/**
 * Test Email Modal
 * Allows admin to send a test email to verify SMTP configuration
 */

import React, { useState } from 'react';

import { API_URL } from '../../../../config';
interface TestEmailModalProps {
  onClose: () => void;
}

export const TestEmailModal: React.FC<TestEmailModalProps> = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSendTest = async () => {
    if (!email || !email.includes('@')) {
      setResult({ type: 'error', message: 'Please enter a valid email address' });
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

      const data = await res.json();

      if (res.ok) {
        setResult({
          type: 'success',
          message: data.message || 'Test email sent successfully! Check your inbox.',
        });
      } else {
        setResult({
          type: 'error',
          message: data.error || 'Failed to send test email',
        });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: 'Failed to send test email. Please check your configuration.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="share-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <div className="share-modal-header">
          <h2>Send Test Email</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="share-modal-content">
          <p style={{ marginBottom: '1.5rem', color: '#d1d5db', fontSize: '0.95rem' }}>
            Enter an email address to send a test message and verify your SMTP configuration is working correctly.
          </p>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="branding-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
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
              Close
            </button>
            <button 
              onClick={handleSendTest} 
              className="btn-primary" 
              disabled={loading || !email}
            >
              {loading ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

