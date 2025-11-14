/**
 * SMTP Settings Component
 */

import React from 'react';
import { ConfigData } from '../types';
import { PasswordInput } from '../../PasswordInput';

interface SMTPSettingsProps {
  config: ConfigData;
  updateConfig: (path: string[], value: any) => void;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onCancel: () => void;
  savingSection: string | null;
}

const SMTPSettings: React.FC<SMTPSettingsProps> = ({
  config,
  updateConfig,
  hasUnsavedChanges,
  onSave,
  onCancel,
  savingSection,
}) => {
  const emailConfig = (config as any).email || {
    enabled: false,
    smtp: {
      host: '',
      port: 587,
      secure: false,
      auth: {
        user: '',
        pass: '',
      },
    },
    from: {
      name: '',
      address: '',
    },
  };

  const isConfigured = emailConfig.smtp.host && emailConfig.smtp.auth.user;

  return (
    <div className="openai-section" style={{ marginBottom: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <label className="openai-section-label">
          EMAIL (SMTP)
          {isConfigured && (
            <span
              style={{
                marginLeft: '0.5rem',
                fontSize: '0.75rem',
                color: '#4ade80',
                fontWeight: 'normal',
              }}
            >
              ✓ Configured
            </span>
          )}
        </label>
        {hasUnsavedChanges && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              disabled={savingSection !== null}
              className="btn-secondary"
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.85rem',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              disabled={savingSection !== null}
              className="btn-primary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              {savingSection === 'Email' ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
      <p
        style={{
          fontSize: '0.85rem',
          color: '#888',
          marginTop: '0',
          marginBottom: '1rem',
        }}
      >
        Configure SMTP settings for sending user invitation and password reset emails
      </p>
      
      <div className="config-grid-inner">
        {/* Enabled Toggle */}
        <div className="branding-group full-width">
          <label className="branding-label">
            <input
              type="checkbox"
              checked={emailConfig.enabled}
              onChange={(e) =>
                updateConfig(['email', 'enabled'], e.target.checked)
              }
              style={{ marginRight: '0.5rem' }}
            />
            Enable Email Service
          </label>
        </div>

        {/* SMTP Server */}
        <div className="branding-group">
          <label className="branding-label">SMTP Host</label>
          <input
            type="text"
            value={emailConfig.smtp.host}
            onChange={(e) =>
              updateConfig(['email', 'smtp', 'host'], e.target.value)
            }
            placeholder="smtp.gmail.com"
            className="branding-input"
            disabled={!emailConfig.enabled}
          />
        </div>

        <div className="branding-group">
          <label className="branding-label">SMTP Port</label>
          <input
            type="number"
            value={emailConfig.smtp.port}
            onChange={(e) =>
              updateConfig(
                ['email', 'smtp', 'port'],
                parseInt(e.target.value) || 587
              )
            }
            className="branding-input"
            disabled={!emailConfig.enabled}
          />
        </div>

        {/* Secure Toggle */}
        <div className="branding-group full-width">
          <label className="branding-label">
            <input
              type="checkbox"
              checked={emailConfig.smtp.secure}
              onChange={(e) =>
                updateConfig(['email', 'smtp', 'secure'], e.target.checked)
              }
              style={{ marginRight: '0.5rem' }}
              disabled={!emailConfig.enabled}
            />
            Use SSL/TLS (port 465 only)
          </label>
          <p
            style={{
              fontSize: '0.8rem',
              color: '#666',
              marginTop: '0.25rem',
              marginBottom: 0,
            }}
          >
            Only enable for port 465. Use port 587 with this disabled for most providers.
          </p>
        </div>

        {/* Authentication */}
        <div className="branding-group">
          <label className="branding-label">SMTP Username</label>
          <input
            type="text"
            value={emailConfig.smtp.auth.user}
            onChange={(e) =>
              updateConfig(['email', 'smtp', 'auth', 'user'], e.target.value)
            }
            placeholder="your-email@gmail.com"
            className="branding-input"
            disabled={!emailConfig.enabled}
          />
        </div>

        <div className="branding-group">
          <label className="branding-label">SMTP Password</label>
          <PasswordInput
            value={emailConfig.smtp.auth.pass}
            onChange={(e) =>
              updateConfig(['email', 'smtp', 'auth', 'pass'], e.target.value)
            }
            placeholder="App password or SMTP password"
            disabled={!emailConfig.enabled}
          />
        </div>

        {/* From Address */}
        <div className="branding-group">
          <label className="branding-label">From Name</label>
          <input
            type="text"
            value={emailConfig.from.name}
            onChange={(e) =>
              updateConfig(['email', 'from', 'name'], e.target.value)
            }
            placeholder="Photography Site"
            className="branding-input"
            disabled={!emailConfig.enabled}
          />
        </div>

        <div className="branding-group">
          <label className="branding-label">From Email Address</label>
          <input
            type="email"
            value={emailConfig.from.address}
            onChange={(e) =>
              updateConfig(['email', 'from', 'address'], e.target.value)
            }
            placeholder="noreply@yoursite.com"
            className="branding-input"
            disabled={!emailConfig.enabled}
          />
        </div>
      </div>

      {/* Gmail Instructions */}
      {emailConfig.smtp.host === 'smtp.gmail.com' && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'rgba(66, 153, 225, 0.1)',
            borderLeft: '3px solid #4299e1',
            borderRadius: '4px',
          }}
        >
          <strong style={{ color: '#4299e1', display: 'block', marginBottom: '0.5rem' }}>
            📧 Gmail Setup Instructions:
          </strong>
          <ol style={{ fontSize: '0.85rem', color: '#ccc', margin: 0, paddingLeft: '1.5rem' }}>
            <li>Go to your Google Account settings</li>
            <li>Enable 2-Step Verification if not already enabled</li>
            <li>Go to <strong>App passwords</strong>: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: '#4299e1' }}>myaccount.google.com/apppasswords</a></li>
            <li>Create a new app password for "Mail"</li>
            <li>Use the 16-character password (no spaces) in the SMTP Password field above</li>
          </ol>
        </div>
      )}

      {/* Other providers hint */}
      {emailConfig.enabled && !isConfigured && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '4px',
            fontSize: '0.85rem',
            color: '#888',
          }}
        >
          <strong style={{ color: '#fff' }}>Popular SMTP Providers:</strong>
          <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
            <li><strong>Gmail:</strong> smtp.gmail.com, port 587</li>
            <li><strong>SendGrid:</strong> smtp.sendgrid.net, port 587 (username: "apikey")</li>
            <li><strong>AWS SES:</strong> email-smtp.us-east-1.amazonaws.com, port 587</li>
            <li><strong>Mailgun:</strong> smtp.mailgun.org, port 587</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default SMTPSettings;

