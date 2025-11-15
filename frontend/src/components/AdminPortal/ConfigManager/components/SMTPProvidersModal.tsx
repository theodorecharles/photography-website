/**
 * SMTP Providers Setup Instructions Modal
 * Shows setup instructions for popular SMTP providers
 */

import React from 'react';

interface SMTPProvidersModalProps {
  onClose: () => void;
}

export const SMTPProvidersModal: React.FC<SMTPProvidersModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="share-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '700px' }}
      >
        <div className="share-modal-header">
          <h2>📧 SMTP Provider Setup Instructions</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="share-modal-content">
          {/* Gmail */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#e5e7eb', fontSize: '0.95rem', fontWeight: 600 }}>
              Gmail
            </h4>
            <p style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: '0.5rem', lineHeight: 1.6 }}>
              <strong style={{ color: '#e5e7eb' }}>Host:</strong> smtp.gmail.com<br />
              <strong style={{ color: '#e5e7eb' }}>Port:</strong> 587<br />
              <strong style={{ color: '#e5e7eb' }}>SSL/TLS:</strong> Disabled
            </p>
            <ol style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: 0, lineHeight: 1.6, paddingLeft: '1.5rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>
                Go to{' '}
                <a
                  href="https://myaccount.google.com/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary-color)', textDecoration: 'none', borderBottom: '1px solid var(--primary-color)' }}
                >
                  Google Account Security
                </a>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>Enable 2-Step Verification if not already enabled</li>
              <li style={{ marginBottom: '0.5rem' }}>
                Go to{' '}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary-color)', textDecoration: 'none', borderBottom: '1px solid var(--primary-color)' }}
                >
                  App Passwords
                </a>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>Create a new app password for "Mail"</li>
              <li style={{ marginBottom: '0.5rem' }}>Copy the 16-character password (no spaces)</li>
              <li>Use your Gmail address as the username</li>
            </ol>
          </div>

          {/* SendGrid */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#e5e7eb', fontSize: '0.95rem', fontWeight: 600 }}>
              SendGrid
            </h4>
            <p style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: '0.5rem', lineHeight: 1.6 }}>
              <strong style={{ color: '#e5e7eb' }}>Host:</strong> smtp.sendgrid.net<br />
              <strong style={{ color: '#e5e7eb' }}>Port:</strong> 587<br />
              <strong style={{ color: '#e5e7eb' }}>SSL/TLS:</strong> Disabled
            </p>
            <ol style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: 0, lineHeight: 1.6, paddingLeft: '1.5rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>
                Sign up for a{' '}
                <a
                  href="https://sendgrid.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary-color)', textDecoration: 'none', borderBottom: '1px solid var(--primary-color)' }}
                >
                  SendGrid account
                </a>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Create an API key in Settings → API Keys or visit{' '}
                <a
                  href="https://app.sendgrid.com/settings/api_keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary-color)', textDecoration: 'none', borderBottom: '1px solid var(--primary-color)' }}
                >
                  API Keys Settings
                </a>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Use <strong style={{ color: '#e5e7eb' }}>"apikey"</strong> as the username (literally the word "apikey")
              </li>
              <li>Use your API key as the password</li>
            </ol>
          </div>

          {/* AWS SES */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#e5e7eb', fontSize: '0.95rem', fontWeight: 600 }}>
              AWS SES
            </h4>
            <p style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: '0.5rem', lineHeight: 1.6 }}>
              <strong style={{ color: '#e5e7eb' }}>Host:</strong> email-smtp.{'{region}'}.amazonaws.com<br />
              <strong style={{ color: '#e5e7eb' }}>Port:</strong> 587<br />
              <strong style={{ color: '#e5e7eb' }}>SSL/TLS:</strong> Disabled
            </p>
            <ol style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: 0, lineHeight: 1.6, paddingLeft: '1.5rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>
                Set up{' '}
                <a
                  href="https://console.aws.amazon.com/ses"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary-color)', textDecoration: 'none', borderBottom: '1px solid var(--primary-color)' }}
                >
                  AWS SES
                </a>{' '}
                in your region
              </li>
              <li style={{ marginBottom: '0.5rem' }}>Verify your sending domain or email</li>
              <li style={{ marginBottom: '0.5rem' }}>Create SMTP credentials in SES Console</li>
              <li style={{ marginBottom: '0.5rem' }}>Use the provided SMTP username and password</li>
              <li>Update the host to match your region (e.g., email-smtp.eu-west-1.amazonaws.com)</li>
            </ol>
          </div>

          {/* Mailgun */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#e5e7eb', fontSize: '0.95rem', fontWeight: 600 }}>
              Mailgun
            </h4>
            <p style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: '0.5rem', lineHeight: 1.6 }}>
              <strong style={{ color: '#e5e7eb' }}>Host:</strong> smtp.mailgun.org<br />
              <strong style={{ color: '#e5e7eb' }}>Port:</strong> 587<br />
              <strong style={{ color: '#e5e7eb' }}>SSL/TLS:</strong> Disabled
            </p>
            <ol style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: 0, lineHeight: 1.6, paddingLeft: '1.5rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>
                Sign up for a{' '}
                <a
                  href="https://mailgun.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary-color)', textDecoration: 'none', borderBottom: '1px solid var(--primary-color)' }}
                >
                  Mailgun account
                </a>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>Add and verify your domain</li>
              <li style={{ marginBottom: '0.5rem' }}>Go to Sending → Domain Settings → SMTP credentials</li>
              <li style={{ marginBottom: '0.5rem' }}>Create SMTP credentials or use the default</li>
              <li>Use postmaster@yourdomain.mailgun.org as username</li>
            </ol>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button onClick={onClose} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

