import React, { useState } from 'react';
import type { NewUserState } from './types';
import { copyInvitationUrl } from './utils';
import { error } from '../../../../../utils/logger';

interface NewUserFormProps {
  newUser: NewUserState;
  loading: boolean;
  onChange: (newUser: NewUserState) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export const NewUserForm: React.FC<NewUserFormProps> = ({
  newUser,
  loading,
  onChange,
  onCancel,
  onSubmit,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = async () => {
    if (!newUser.inviteToken) return;
    
    try {
      await copyInvitationUrl(newUser.inviteToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      error('Failed to copy invitation link:', err);
    }
  };

  return (
    <>
      <div className="branding-group">
        <label className="branding-label">Email *</label>
        <input
          type="email"
          value={newUser.email}
          onChange={(e) => onChange({ ...newUser, email: e.target.value })}
          className="branding-input"
          placeholder="user@example.com"
          disabled={!!newUser.inviteToken}
        />
        <p
          style={{
            fontSize: '0.85rem',
            color: '#9ca3af',
            margin: '0.5rem 0 0 0',
          }}
        >
          An invitation email will be sent to this address. The user will set up their name, password, and MFA.
        </p>
      </div>
      <div className="branding-group">
        <label className="branding-label">Role *</label>
        <select
          value={newUser.role}
          onChange={(e) => onChange({ ...newUser, role: e.target.value })}
          className="branding-input"
          disabled={!!newUser.inviteToken}
        >
          <option value="viewer">Viewer</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      
      {newUser.inviteToken && (
        <div
          style={{
            background: 'rgba(74, 222, 128, 0.1)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#4ade80', lineHeight: 1.6 }}>
            <strong>✓ Invitation Sent</strong>
            <br />
            You can also copy the invitation link below to send it manually.
          </p>
        </div>
      )}

      <div className="section-button-group">
        <button onClick={onCancel} className="btn-secondary" disabled={loading}>
          {newUser.inviteToken ? 'Close' : 'Cancel'}
        </button>
        {!newUser.inviteToken ? (
          <button onClick={onSubmit} className="btn-primary" disabled={loading}>
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        ) : (
          <button 
            onClick={handleCopyInvite} 
            className="btn-primary"
            style={{
              background: copied ? '#4ade80' : 'var(--primary-color)',
            }}
          >
            {copied ? '✓ Copied' : '📋 Copy Invitation Link'}
          </button>
        )}
      </div>
    </>
  );
};

