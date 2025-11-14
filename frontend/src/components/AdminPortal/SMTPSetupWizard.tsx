/**
 * SMTP Setup Wizard Modal
 * Guides users through configuring SMTP for email delivery
 */

import React, { useState } from 'react';
import { PasswordInput } from './PasswordInput';
import './ShareModal.css';

const API_URL = import.meta.env.VITE_API_URL || '';

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
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#fff' }}>
            Gmail Setup Instructions:
          </h4>
          <ol style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: 0 }}>
            <li>Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" style={{ color: '#4299e1' }}>Google Account Security</a></li>
            <li>Enable 2-Step Verification if not already enabled</li>
            <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: '#4299e1' }}>App Passwords</a></li>
            <li>Create a new app password for "Mail"</li>
            <li>Copy the 16-character password (no spaces)</li>
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
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#fff' }}>
            SendGrid Setup Instructions:
          </h4>
          <ol style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: 0 }}>
            <li>Sign up for a <a href="https://sendgrid.com" target="_blank" rel="noopener noreferrer" style={{ color: '#4299e1' }}>SendGrid account</a></li>
            <li>Create an API key in Settings → API Keys</li>
            <li>Use <strong>"apikey"</strong> as the username (literally the word "apikey")</li>
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
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#fff' }}>
            AWS SES Setup Instructions:
          </h4>
          <ol style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: 0 }}>
            <li>Set up <a href="https://console.aws.amazon.com/ses" target="_blank" rel="noopener noreferrer" style={{ color: '#4299e1' }}>AWS SES</a> in your region</li>
            <li>Verify your sending domain or email</li>
            <li>Create SMTP credentials in SES Console</li>
            <li>Use the provided SMTP username and password</li>
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
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#fff' }}>
            Mailgun Setup Instructions:
          </h4>
          <ol style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: 0 }}>
            <li>Sign up for a <a href="https://mailgun.com" target="_blank" rel="noopener noreferrer" style={{ color: '#4299e1' }}>Mailgun account</a></li>
            <li>Add and verify your domain</li>
            <li>Go to Sending → Domain Settings → SMTP credentials</li>
            <li>Create SMTP credentials or use the default</li>
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
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#fff' }}>
            Custom SMTP Configuration:
          </h4>
          <p style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: 0 }}>
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
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>
          📧 Set Up Email (SMTP)
        </h2>

        {step === 1 && (
          <>
            <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>
              Choose an email provider to send invitation and password reset emails.
              Gmail is the easiest option for getting started.
            </p>

            {/* Provider Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#fff',
                  fontWeight: 500,
                }}
              >
                Select Provider:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                          ? 'rgba(66, 153, 225, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                      border:
                        provider === p.value
                          ? '2px solid #4299e1'
                          : '2px solid transparent',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (provider !== p.value) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (provider !== p.value) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name="provider"
                      value={p.value}
                      checked={provider === p.value}
                      onChange={() => handleProviderChange(p.value as Provider)}
                      style={{ marginRight: '1rem' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontWeight: 500 }}>{p.label}</div>
                      <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.25rem' }}>
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
                background: 'rgba(66, 153, 225, 0.1)',
                borderLeft: '3px solid #4299e1',
                borderRadius: '4px',
                marginBottom: '1.5rem',
              }}
            >
              {providerPresets[provider].instructions}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
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
            <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>
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
                    color: '#fff',
                    fontSize: '0.9rem',
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
                      color: '#fff',
                      fontSize: '0.9rem',
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
                      color: '#fff',
                      fontSize: '0.9rem',
                    }}
                  >
                    SSL/TLS:
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      height: '2.5rem',
                      color: '#ccc',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={config.secure}
                      onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
                      style={{ marginRight: '0.5rem' }}
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
                    color: '#fff',
                    fontSize: '0.9rem',
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
                    color: '#fff',
                    fontSize: '0.9rem',
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

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }} />

              {/* From Name */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#fff',
                    fontSize: '0.9rem',
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
                    color: '#fff',
                    fontSize: '0.9rem',
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
              }}
            >
              <button onClick={() => setStep(1)} className="btn-secondary" disabled={saving}>
                ← Back
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
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
  );
};

export default SMTPSetupWizard;

