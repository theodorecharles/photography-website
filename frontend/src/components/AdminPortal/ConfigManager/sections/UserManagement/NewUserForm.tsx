import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        <label className="branding-label">{t('userManagement.email')} *</label>
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
          {t('userManagement.invitationEmailDescription')}
        </p>
      </div>
      <div className="branding-group">
        <label className="branding-label">{t('userManagement.role')} *</label>
        <select
          value={newUser.role}
          onChange={(e) => onChange({ ...newUser, role: e.target.value })}
          className="branding-input"
          disabled={!!newUser.inviteToken}
        >
          <option value="viewer">{t('userManagement.viewer')}</option>
          <option value="manager">{t('userManagement.manager')}</option>
          <option value="admin">{t('userManagement.admin')}</option>
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
            <strong>{t('userManagement.invitationSent')}</strong>
            <br />
            {t('userManagement.copyInvitationLinkManually')}
          </p>
        </div>
      )}

      <div className="section-button-group">
        <button onClick={onCancel} className="btn-secondary" disabled={loading}>
          {newUser.inviteToken ? t('common.close') : t('common.cancel')}
        </button>
        {!newUser.inviteToken ? (
          <button onClick={onSubmit} className="btn-primary" disabled={loading}>
            {loading ? t('userManagement.sending') : t('userManagement.sendInvitation')}
          </button>
        ) : (
          <button 
            onClick={handleCopyInvite} 
            className="btn-primary"
            style={{
              background: copied ? '#4ade80' : 'var(--primary-color)',
            }}
          >
            {copied ? t('photo.copied') : t('userManagement.copyInvitationLinkButton')}
          </button>
        )}
      </div>
    </>
  );
};

