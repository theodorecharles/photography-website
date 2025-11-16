/**
 * SMTP Settings Component
 */

import React, { useState } from 'react';
import { ConfigData } from '../types';
import { PasswordInput } from '../../PasswordInput';
import { TestEmailModal } from './TestEmailModal';
import { SMTPProvidersModal } from './SMTPProvidersModal';
import { Toggle } from './Toggle';

import { API_URL } from '../../../../config';
interface SMTPSettingsProps {
  config: ConfigData;
  originalConfig: ConfigData;
  setConfig: (config: ConfigData) => void;
  setOriginalConfig: (config: ConfigData) => void;
  updateConfig: (path: string[], value: any) => void;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onCancel: () => void;
  savingSection: string | null;
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}

type FieldKey = 'host' | 'port' | 'username' | 'password' | 'fromName' | 'fromAddress';

const SMTPSettings: React.FC<SMTPSettingsProps> = ({
  config,
  originalConfig,
  setConfig,
  setOriginalConfig,
  updateConfig,
  hasUnsavedChanges: _hasUnsavedChanges,
  onSave: _onSave,
  onCancel: _onCancel,
  savingSection: _savingSection,
  setMessage,
  sectionRef,
}) => {
  const [showTestModal, setShowTestModal] = useState(false);
  const [showProvidersModal, setShowProvidersModal] = useState(false);
  const [editingField, setEditingField] = useState<FieldKey | null>(null);
  const [savingField, setSavingField] = useState<FieldKey | null>(null);

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

  const originalEmailConfig = (originalConfig as any).email || {
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

  // Check if a specific field has changed
  const hasFieldChanged = (field: FieldKey): boolean => {
    switch (field) {
      case 'host':
        return emailConfig.smtp.host !== originalEmailConfig.smtp.host;
      case 'port':
        return emailConfig.smtp.port !== originalEmailConfig.smtp.port;
      case 'username':
        return emailConfig.smtp.auth.user !== originalEmailConfig.smtp.auth.user;
      case 'password':
        return emailConfig.smtp.auth.pass !== originalEmailConfig.smtp.auth.pass;
      case 'fromName':
        return emailConfig.from.name !== originalEmailConfig.from.name;
      case 'fromAddress':
        return emailConfig.from.address !== originalEmailConfig.from.address;
      default:
        return false;
    }
  };

  // Save individual field
  const saveField = async (field: FieldKey) => {
    if (!config) return;

    setSavingField(field);
    try {
      const res = await fetch(`${API_URL}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setOriginalConfig(structuredClone(config));
        setEditingField(null);
        setMessage({
          type: 'success',
          text: 'Setting saved successfully',
        });
        // Notify other components that SMTP config has been updated
        window.dispatchEvent(new Event('smtp-config-updated'));
      } else {
        const error = await res.json();
        setMessage({
          type: 'error',
          text: error.error || 'Failed to save setting',
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setSavingField(null);
    }
  };

  // Cancel individual field edit
  const cancelField = (field: FieldKey) => {
    switch (field) {
      case 'host':
        updateConfig(['email', 'smtp', 'host'], originalEmailConfig.smtp.host);
        break;
      case 'port':
        updateConfig(['email', 'smtp', 'port'], originalEmailConfig.smtp.port);
        break;
      case 'username':
        updateConfig(['email', 'smtp', 'auth', 'user'], originalEmailConfig.smtp.auth.user);
        break;
      case 'password':
        updateConfig(['email', 'smtp', 'auth', 'pass'], originalEmailConfig.smtp.auth.pass);
        break;
      case 'fromName':
        updateConfig(['email', 'from', 'name'], originalEmailConfig.from.name);
        break;
      case 'fromAddress':
        updateConfig(['email', 'from', 'address'], originalEmailConfig.from.address);
        break;
    }
    setEditingField(null);
  };

  // Auto-save toggle for enabling/disabling email
  const handleToggleEnabled = async () => {
    if (!config) return;

    const newValue = !emailConfig.enabled;

    // Optimistically update UI
    const newConfig = {
      ...config,
      email: {
        ...emailConfig,
        enabled: newValue,
      },
    };
    setConfig(newConfig);

    try {
      const res = await fetch(`${API_URL}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newConfig),
      });

      if (res.ok) {
        // Update original config to match
        setOriginalConfig(structuredClone(newConfig));
        setMessage({
          type: 'success',
          text: `Email service ${newValue ? 'enabled' : 'disabled'}`,
        });
        // Notify other components that SMTP config has been updated
        window.dispatchEvent(new Event('smtp-config-updated'));
      } else {
        const error = await res.json();
        setMessage({
          type: 'error',
          text: error.error || 'Failed to update setting',
        });
        // Revert on error
        setConfig(config);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
      // Revert on error
      setConfig(config);
    }
  };

  // Auto-save toggle for SSL/TLS
  const handleToggleSecure = async () => {
    if (!config) return;

    const newValue = !emailConfig.smtp.secure;

    // Optimistically update UI
    const newConfig = {
      ...config,
      email: {
        ...emailConfig,
        smtp: {
          ...emailConfig.smtp,
          secure: newValue,
        },
      },
    };
    setConfig(newConfig);

    try {
      const res = await fetch(`${API_URL}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newConfig),
      });

      if (res.ok) {
        // Update original config to match
        setOriginalConfig(structuredClone(newConfig));
        setMessage({
          type: 'success',
          text: `SSL/TLS ${newValue ? 'enabled' : 'disabled'}`,
        });
        // Notify other components that SMTP config has been updated
        window.dispatchEvent(new Event('smtp-config-updated'));
      } else {
        const error = await res.json();
        setMessage({
          type: 'error',
          text: error.error || 'Failed to update setting',
        });
        // Revert on error
        setConfig(config);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
      // Revert on error
      setConfig(config);
    }
  };

  // Render field with save/cancel buttons
  const renderFieldWithActions = (
    field: FieldKey,
    label: string,
    input: React.ReactNode
  ) => {
    const hasChanged = hasFieldChanged(field);
    const isSaving = savingField === field;

    return (
      <div className="branding-group" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label className="branding-label">{label}</label>
          {hasChanged && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => cancelField(field)}
                disabled={isSaving}
                className="btn-secondary"
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.75rem',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveField(field)}
                disabled={isSaving}
                className="btn-primary"
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.75rem',
                }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
        {input}
      </div>
    );
  };

  return (
    <div className="openai-section" style={{ marginBottom: '2rem' }} ref={sectionRef}>
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isConfigured && emailConfig.enabled && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProvidersModal(true);
                }}
                className="btn-secondary"
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.85rem',
                }}
              >
                Setup Instructions
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTestModal(true);
                }}
                className="btn-secondary"
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.85rem',
                }}
              >
                Test Email
              </button>
            </>
          )}
        </div>
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
        {/* Enable Email Service Toggle */}
        <div className="branding-group">
          <Toggle
            checked={emailConfig.enabled}
            onChange={handleToggleEnabled}
            label="Enable Email Service"
          />
        </div>

        {/* SSL/TLS Toggle */}
        <div className="branding-group">
          <Toggle
            checked={emailConfig.smtp.secure}
            onChange={handleToggleSecure}
            label="Use SSL/TLS (port 465 only)"
            disabled={!emailConfig.enabled}
          />
          <p
            style={{
              fontSize: '0.8rem',
              color: '#666',
              marginTop: '0.5rem',
              marginBottom: 0,
              marginLeft: '52px', // Align with toggle label
            }}
          >
          </p>
        </div>

        {/* SMTP Fields - Only show when enabled */}
        {emailConfig.enabled && (
          <>
            {/* SMTP Host */}
            {renderFieldWithActions(
              'host',
              'SMTP Host',
              <input
                type="text"
                value={emailConfig.smtp.host}
                onChange={(e) => {
                  updateConfig(['email', 'smtp', 'host'], e.target.value);
                  if (!editingField) setEditingField('host');
                }}
                placeholder="smtp.gmail.com"
                className="branding-input"
              />
            )}

            {/* SMTP Port */}
            {renderFieldWithActions(
              'port',
              'SMTP Port',
              <input
                type="number"
                value={emailConfig.smtp.port}
                onChange={(e) => {
                  updateConfig(['email', 'smtp', 'port'], parseInt(e.target.value) || 587);
                  if (!editingField) setEditingField('port');
                }}
                className="branding-input"
              />
            )}

            {/* SMTP Username */}
            {renderFieldWithActions(
              'username',
              'SMTP Username',
              <input
                type="text"
                value={emailConfig.smtp.auth.user}
                onChange={(e) => {
                  updateConfig(['email', 'smtp', 'auth', 'user'], e.target.value);
                  if (!editingField) setEditingField('username');
                }}
                placeholder="your-email@gmail.com"
                className="branding-input"
              />
            )}

            {/* SMTP Password */}
            {renderFieldWithActions(
              'password',
              'SMTP Password',
              <PasswordInput
                value={emailConfig.smtp.auth.pass}
                onChange={(e) => {
                  updateConfig(['email', 'smtp', 'auth', 'pass'], e.target.value);
                  if (!editingField) setEditingField('password');
                }}
                placeholder="App password or SMTP password"
              />
            )}

            {/* From Name */}
            {renderFieldWithActions(
              'fromName',
              'From Name',
              <input
                type="text"
                value={emailConfig.from.name}
                onChange={(e) => {
                  updateConfig(['email', 'from', 'name'], e.target.value);
                  if (!editingField) setEditingField('fromName');
                }}
                placeholder="Photography Site"
                className="branding-input"
              />
            )}

            {/* From Email Address */}
            {renderFieldWithActions(
              'fromAddress',
              'From Email Address',
              <input
                type="email"
                value={emailConfig.from.address}
                onChange={(e) => {
                  updateConfig(['email', 'from', 'address'], e.target.value);
                  if (!editingField) setEditingField('fromAddress');
                }}
                placeholder="noreply@yoursite.com"
                className="branding-input"
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showTestModal && (
        <TestEmailModal onClose={() => setShowTestModal(false)} />
      )}
      {showProvidersModal && (
        <SMTPProvidersModal onClose={() => setShowProvidersModal(false)} />
      )}
    </div>
  );
};

export default SMTPSettings;
