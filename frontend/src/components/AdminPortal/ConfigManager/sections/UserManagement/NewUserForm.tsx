import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { NewUserState } from './types';
import { copyInvitationUrl } from './utils';
import { error } from '../../../../../utils/logger';

interface NewUserFormProps {
  newUser: NewUserState;
  loading: boolean;
  smtpConfigured: boolean;
  onChange: (newUser: NewUserState) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export const NewUserForm: React.FC<NewUserFormProps> = ({
  newUser,
  loading,
  smtpConfigured,
  onChange,
  onCancel,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [inviteCompleted, setInviteCompleted] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleCopyInvite = () => {
    // Create the invitation - the useEffect will auto-copy when token is created
    if (!newUser.inviteToken) {
      onSubmit();
    }
  };

  // Close role dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
      }
    };

    if (showRoleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showRoleDropdown]);

  // Auto-copy link when invitation token is created (only if SMTP not configured)
  useEffect(() => {
    if (newUser.inviteToken && !inviteCompleted && !copied && !smtpConfigured) {
      // Automatically copy the link when it's created
      const autoCopy = async () => {
        try {
          await copyInvitationUrl(newUser.inviteToken!);
          setCopied(true);
          setInviteCompleted(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          error('Failed to copy invitation link:', err);
        }
      };
      autoCopy();
    }
  }, [newUser.inviteToken, inviteCompleted, copied, smtpConfigured]);

  const handleRoleSelect = (role: string) => {
    onChange({ ...newUser, role });
    setShowRoleDropdown(false);
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
      </div>
      <div className="branding-group" style={{ marginTop: '1.5rem' }}>
        <label className="branding-label">{t('userManagement.role')} *</label>
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div
            onClick={() => !newUser.inviteToken && setShowRoleDropdown(!showRoleDropdown)}
            className="branding-input"
            style={{
              cursor: newUser.inviteToken ? 'not-allowed' : 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: newUser.inviteToken ? 0.5 : 1,
            }}
          >
            <span>
              {newUser.role === 'admin' && '👑 '}
              {newUser.role === 'manager' && '📝 '}
              {newUser.role === 'viewer' && '👁️ '}
              {t(`userManagement.${newUser.role}`)}
            </span>
            <span style={{ marginLeft: 'auto', opacity: 0.5 }}>▼</span>
          </div>
          
          {showRoleDropdown && !newUser.inviteToken && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: '#2a2a2a',
                border: '1px solid #3a3a3a',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                zIndex: 100001,
                overflow: 'hidden',
              }}
            >
              {['admin', 'manager', 'viewer'].map((role) => (
                <div
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    color: newUser.role === role ? '#4ade80' : '#e5e7eb',
                    background: newUser.role === role ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                    transition: 'background 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    if (newUser.role !== role) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (newUser.role !== role) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {role === 'admin' && '👑 '}
                  {role === 'manager' && '📝 '}
                  {role === 'viewer' && '👁️ '}
                  {t(`userManagement.${role}`)}
                  {newUser.role === role && ' ✓'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {inviteCompleted && (
        <div
          style={{
            background: 'rgba(74, 222, 128, 0.1)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1.5rem',
            marginBottom: '1rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#4ade80', lineHeight: 1.6 }}>
            <strong>✓ {t('userManagement.linkCopied')}</strong>
            <br />
            {t('userManagement.shareLinkWithUser')}
          </p>
        </div>
      )}

      <div 
        className="section-button-group new-user-button-group"
        style={{ marginTop: '1.5rem' }}
      >
        {inviteCompleted ? (
          // After copying: Show only Close button
          <button onClick={onCancel} className="btn-primary" style={{ width: '100%' }}>
            {t('common.close')}
          </button>
        ) : (
          <>
            <button onClick={onCancel} className="btn-secondary" disabled={loading}>
              {t('common.cancel')}
            </button>
            <button 
              onClick={handleCopyInvite} 
              className="btn-primary"
              disabled={loading}
              style={{
                background: copied ? '#4ade80' : 'var(--primary-color)',
              }}
            >
              {loading 
                ? (smtpConfigured ? t('userManagement.sending') : t('userManagement.creating'))
                : copied 
                  ? t('photo.copied') 
                  : (smtpConfigured ? t('userManagement.sendInvitation') : t('userManagement.copyInvitationLinkButton'))}
            </button>
          </>
        )}
      </div>
    </>
  );
};

