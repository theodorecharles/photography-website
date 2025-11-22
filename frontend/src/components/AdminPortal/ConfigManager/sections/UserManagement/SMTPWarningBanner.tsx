import React from 'react';
import { useTranslation } from 'react-i18next';

interface SMTPWarningBannerProps {
  smtpConfigured: boolean | null;
  showNewUserForm: boolean;
  bannerDismissed: boolean;
  onSetupSmtp: () => void;
  onToggleNewUserForm: () => void;
  onDismissBanner: () => void;
}

export const SMTPWarningBanner: React.FC<SMTPWarningBannerProps> = ({
  smtpConfigured,
  showNewUserForm,
  bannerDismissed,
  onSetupSmtp,
  onToggleNewUserForm,
  onDismissBanner,
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
      {!smtpConfigured && !bannerDismissed ? (
        // Show warning banner with "Set up SMTP" and "Dismiss" buttons when SMTP is not configured
        <div
          className="smtp-warning-banner"
          style={{
            flex: 1,
            padding: '1rem',
            background: 'rgba(251, 191, 36, 0.1)',
            borderLeft: '3px solid #f59e0b',
            borderRadius: '4px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ flex: '1 1 auto', minWidth: '250px' }}>
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
              {t('userManagement.setupSmtpDescriptionDismissible')}
            </p>
          </div>
          <div 
            className="smtp-warning-banner-buttons"
            style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={onSetupSmtp}
              className="btn-primary"
              style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}
            >
              {t('userManagement.setupSmtp')}
            </button>
            <button
              onClick={onDismissBanner}
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}
            >
              {t('common.dismiss')}
            </button>
          </div>
        </div>
      ) : (
        // Show Invite User / Cancel button when SMTP is configured OR banner dismissed
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

