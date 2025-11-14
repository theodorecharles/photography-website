import React from 'react';

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
  // Don't render anything while checking SMTP config
  if (smtpConfigured === null) {
    return null;
  }

  return (
    <div
      style={{
        gridColumn: '1 / -1',
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      {!smtpConfigured && (
        <div
          style={{
            flex: 1,
            padding: '1rem',
            background: 'rgba(251, 191, 36, 0.1)',
            borderLeft: '3px solid #f59e0b',
            borderRadius: '4px',
          }}
        >
          <strong
            style={{
              color: '#f59e0b',
              display: 'block',
              marginBottom: '0.25rem',
            }}
          >
            ⚠️ Email Not Configured
          </strong>
          <p style={{ fontSize: '0.85rem', color: '#ccc', margin: 0 }}>
            Set up SMTP to send user invitation and password reset emails.
          </p>
        </div>
      )}
      <button
        onClick={() => {
          if (smtpConfigured) {
            onToggleNewUserForm();
          } else {
            onSetupSmtp();
          }
        }}
        className="btn-primary"
        style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}
      >
        {!smtpConfigured ? '📧 Set up SMTP' : showNewUserForm ? 'Cancel' : '+ Invite User'}
      </button>
    </div>
  );
};

