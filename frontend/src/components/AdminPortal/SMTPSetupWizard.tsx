/**
 * SMTP Setup Wizard Modal
 * Guides users through configuring SMTP for email delivery
 */

import React, { useState } from 'react';
import { API_URL } from '../../config';
import { PasswordInput } from './PasswordInput';
import './GenericModal.css';


interface SMTPSetupWizardProps {
  onClose: () => void;
  onComplete: () => void;
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

type Provider = 'gmail' | 'sendgrid' | 'aws' | 'mailgun' | 'custom';

const SMTPSetupWizard: React.FC<SMTPSetupWizardProps> = ({
  onClose,
  onComplete,
  setMessage,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [provider, setProvider] = useState<Provider>('gmail');
  const [saving, setSaving] = useState(false);
  
  const [config, setConfig] = useState({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromName: '',
    fromAddress: '',
  });

  const providerPresets = {
    gmail: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      instructions: (
        <div>
          <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#e5e7eb', fontSize: '0.95rem', fontWeight: 600 }}>
            Gmail Setup Instructions:
          </h4>
          <ol style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: 0, lineHeight: 1.6, paddingLeft: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none', borderBottom: '1px solid var(--primary-color)' }}>Google Account Security</a></li>
            <li style={{ marginBottom: '0.5rem' }}>Enable 2-Step Verification if not already enabled</li>
            <li style={{ marginBottom: '0.5rem' }}>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none', borderBottom: '1px solid var(--primary-color)' }}>App Passwords</a></li>
            <li style={{ marginBottom: '0.5rem' }}>Create a new app password for "Mail"</li>
            <li style={{ marginBottom: '0.5rem' }}>Copy the 16-character password (no spaces)</li>
            <li>Use your Gmail address as the username</li>
          </ol>
        </div>
      ),
    },
    sendgrid: {
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      instructions: (
        <div>
          <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#e5e7eb', fontSize: '0.95rem', fontWeight: 600 }}>
            SendGrid Setup Instructions:
          </h4>
          <ol style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: 0, lineHeight: 1.6, paddingLeft: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>Sign up for a <a href="https://sendgrid.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none', borderBottom: '1px solid var(--primary-color)' }}>SendGrid account</a></li>
            <li style={{ marginBottom: '0.5rem' }}>Create an API key in Settings → API Keys</li>
            <li style={{ marginBottom: '0.5rem' }}>Use <strong style={{ color: '#e5e7eb' }}>"apikey"</strong> as the username (literally the word "apikey")</li>
            <li>Use your API key as the password</li>
          </ol>
        </div>
      ),
    },
    aws: {
      host: 'email-smtp.us-east-1.amazonaws.com',
      port: 587,
      secure: false,
      instructions: (
        <div>
          <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#e5e7eb', fontSize: '0.95rem', fontWeight: 600 }}>
            AWS SES Setup Instructions:
          </h4>
          <ol style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: 0, lineHeight: 1.6, paddingLeft: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>Set up <a href="https://console.aws.amazon.com/ses" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none', borderBottom: '1px solid var(--primary-color)' }}>AWS SES</a> in your region</li>
            <li style={{ marginBottom: '0.5rem' }}>Verify your sending domain or email</li>
            <li style={{ marginBottom: '0.5rem' }}>Create SMTP credentials in SES Console</li>
            <li style={{ marginBottom: '0.5rem' }}>Use the provided SMTP username and password</li>
            <li>Update the host to match your region (e.g., email-smtp.eu-west-1.amazonaws.com)</li>
          </ol>
        </div>
      ),
    },
    mailgun: {
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      instructions: (
        <div>
          <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#e5e7eb', fontSize: '0.95rem', fontWeight: 600 }}>
            Mailgun Setup Instructions:
          </h4>
          <ol style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: 0, lineHeight: 1.6, paddingLeft: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>Sign up for a <a href="https://mailgun.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none', borderBottom: '1px solid var(--primary-color)' }}>Mailgun account</a></li>
            <li style={{ marginBottom: '0.5rem' }}>Add and verify your domain</li>
            <li style={{ marginBottom: '0.5rem' }}>Go to Sending → Domain Settings → SMTP credentials</li>
            <li style={{ marginBottom: '0.5rem' }}>Create SMTP credentials or use the default</li>
            <li>Use postmaster@yourdomain.mailgun.org as username</li>
          </ol>
        </div>
      ),
    },
    custom: {
      host: '',
      port: 587,
      secure: false,
      instructions: (
        <div>
          <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#e5e7eb', fontSize: '0.95rem', fontWeight: 600 }}>
            Custom SMTP Configuration:
          </h4>
          <p style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: 0, lineHeight: 1.6 }}>
            Enter your SMTP server details. Most providers use port 587 with STARTTLS.
            Only enable SSL/TLS if your provider requires port 465.
          </p>
        </div>
      ),
    },
  };

  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    const preset = providerPresets[newProvider];
    setConfig({
      ...config,
      host: preset.host,
      port: preset.port,
      secure: preset.secure,
      user: newProvider === 'sendgrid' ? 'apikey' : '',
      pass: '',
    });
  };

  const handleSave = async () => {
    // Validation
    if (!config.host || !config.user || !config.pass || !config.fromName || !config.fromAddress) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }

    setSaving(true);
    try {
      // Fetch current config
      const getRes = await fetch(`${API_URL}/api/config`, {
        credentials: 'include',
      });

      if (!getRes.ok) throw new Error('Failed to fetch config');
      const currentConfig = await getRes.json();

      // Update with SMTP settings
      const updatedConfig = {
        ...currentConfig,
        email: {
          enabled: true,
          smtp: {
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
              user: config.user,
              pass: config.pass,
            },
          },
          from: {
            name: config.fromName,
            address: config.fromAddress,
          },
        },
      };

      // Save config
      const saveRes = await fetch(`${API_URL}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedConfig),
      });

      if (!saveRes.ok) throw new Error('Failed to save SMTP configuration');

      setMessage({ type: 'success', text: 'SMTP configured successfully!' });
      onComplete();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to configure SMTP',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="generic-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '700px' }}
      >
        <div className="generic-modal-header">
          <h2>📧 Set Up Email (SMTP)</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="generic-modal-content">

        {step === 1 && (
          <>
            <p className="share-description">
              Choose an email provider to send invitation and password reset emails.
              Gmail is the easiest option for getting started.
            </p>

            {/* Provider Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  color: '#e5e7eb',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                }}
              >
                Select Provider:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { value: 'gmail', label: '📧 Gmail (Recommended)', desc: 'Free, 500 emails/day' },
                  { value: 'sendgrid', label: '📮 SendGrid', desc: 'Free tier: 100 emails/day' },
                  { value: 'aws', label: '☁️ AWS SES', desc: 'Pay as you go' },
                  { value: 'mailgun', label: '✉️ Mailgun', desc: 'Free trial available' },
                  { value: 'custom', label: '⚙️ Custom SMTP Server', desc: 'Use your own provider' },
                ].map((p) => (
                  <label
                    key={p.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '1rem',
                      background:
                        provider === p.value
                          ? 'rgba(74, 222, 128, 0.15)'
                          : '#1e1e1e',
                      border:
                        provider === p.value
                          ? '2px solid var(--primary-color)'
                          : '1px solid #3a3a3a',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (provider !== p.value) {
                        e.currentTarget.style.borderColor = '#4a4a4a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (provider !== p.value) {
                        e.currentTarget.style.borderColor = '#3a3a3a';
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name="provider"
                      value={p.value}
                      checked={provider === p.value}
                      onChange={() => handleProviderChange(p.value as Provider)}
                      style={{ marginRight: '1rem', accentColor: 'var(--primary-color)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#ffffff', fontWeight: 500 }}>{p.label}</div>
                      <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                        {p.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Provider Instructions */}
            <div
              style={{
                padding: '1rem',
                background: 'rgba(74, 222, 128, 0.1)',
                border: '1px solid rgba(74, 222, 128, 0.3)',
                borderRadius: '8px',
                marginBottom: '1.5rem',
              }}
            >
              {providerPresets[provider].instructions}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button onClick={() => setStep(2)} className="btn-primary">
                Next →
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="share-description">
              Enter your SMTP credentials and sender information.
            </p>

            {/* SMTP Configuration Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Host */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#e5e7eb',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                  }}
                >
                  SMTP Host:
                </label>
                <input
                  type="text"
                  value={config.host}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="branding-input"
                  disabled={provider !== 'custom'}
                />
              </div>

              {/* Port and Secure */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      color: '#e5e7eb',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  >
                    Port:
                  </label>
                  <input
                    type="number"
                    value={config.port}
                    onChange={(e) =>
                      setConfig({ ...config, port: parseInt(e.target.value) || 587 })
                    }
                    className="branding-input"
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      color: '#e5e7eb',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  >
                    SSL/TLS:
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      height: '2.5rem',
                      color: '#d1d5db',
                      fontSize: '0.85rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={config.secure}
                      onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
                      style={{ marginRight: '0.5rem', accentColor: 'var(--primary-color)' }}
                    />
                    Port 465 only
                  </label>
                </div>
              </div>

              {/* Username */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#e5e7eb',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                  }}
                >
                  Username:
                </label>
                <input
                  type="text"
                  value={config.user}
                  onChange={(e) => setConfig({ ...config, user: e.target.value })}
                  placeholder={provider === 'sendgrid' ? 'apikey' : 'your-email@gmail.com'}
                  className="branding-input"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#e5e7eb',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                  }}
                >
                  Password:
                </label>
                <PasswordInput
                  value={config.pass}
                  onChange={(e) => setConfig({ ...config, pass: e.target.value })}
                  placeholder="App password or SMTP password"
                />
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #3a3a3a', margin: '0.5rem 0' }} />

              {/* From Name */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#e5e7eb',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                  }}
                >
                  From Name:
                </label>
                <input
                  type="text"
                  value={config.fromName}
                  onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                  placeholder="Photography Site"
                  className="branding-input"
                />
              </div>

              {/* From Address */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#e5e7eb',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                  }}
                >
                  From Email:
                </label>
                <input
                  type="email"
                  value={config.fromAddress}
                  onChange={(e) => setConfig({ ...config, fromAddress: e.target.value })}
                  placeholder="noreply@yoursite.com"
                  className="branding-input"
                />
              </div>
            </div>

            {/* Navigation */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid #3a3a3a',
              }}
            >
              <button onClick={() => setStep(1)} className="btn-secondary" disabled={saving}>
                ← Back
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={onClose} className="btn-secondary" disabled={saving}>
                  Cancel
                </button>
                <button onClick={handleSave} className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Complete Setup'}
                </button>
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default SMTPSetupWizard;

