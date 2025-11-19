import React from 'react';
import { useTranslation } from 'react-i18next';

interface SMTPWarningBannerProps {
  smtpConfigured: boolean | null;
  showNewUserForm: boolean;
  onSetupSmtp: () => void;
  onToggleNewUserForm: () => void;
}

export const SMTPWarningBanner: React.FC<SMTPWarningBannerProps> = ({
  smtpConfigured,
  showNewUserForm,
  onSetupSmtp,
  onToggleNewUserForm,
}) => {
  const { t } = useTranslation();
  // Don't render anything while checking SMTP config
  if (smtpConfigured === null) {
    return null;
  }

  return (
    <div
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      {!smtpConfigured ? (
        // Show warning banner with "Set up SMTP" button when SMTP is not configured
        <div
          style={{
            flex: 1,
            padding: '1rem',
            background: 'rgba(251, 191, 36, 0.1)',
            borderLeft: '3px solid #f59e0b',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ flex: 1 }}>
            <strong
              style={{
                color: '#f59e0b',
                display: 'block',
                marginBottom: '0.25rem',
              }}
            >
              {t('userManagement.emailNotConfigured')}
            </strong>
            <p style={{ fontSize: '0.85rem', color: '#ccc', margin: 0 }}>
              {t('userManagement.setupSmtpDescription')}
            </p>
          </div>
          <button
            onClick={onSetupSmtp}
            className="btn-primary"
            style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {t('userManagement.setupSmtp')}
          </button>
        </div>
      ) : (
        // Show Invite User / Cancel button when SMTP is configured
        <button
          onClick={onToggleNewUserForm}
          className="btn-primary"
          style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}
        >
          {showNewUserForm ? t('common.cancel') : t('userManagement.inviteUser')}
        </button>
      )}
    </div>
  );
};

