import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NewUserForm } from './NewUserForm';
import type { NewUserState } from './types';

interface NewUserModalProps {
  newUser: NewUserState;
  loading: boolean;
  smtpConfigured: boolean;
  onClose: () => void;
  onChange: (newUser: NewUserState) => void;
  onSubmit: () => void;
}

export const NewUserModal: React.FC<NewUserModalProps> = ({
  newUser,
  loading,
  smtpConfigured,
  onClose,
  onChange,
  onSubmit,
}) => {
  const { t } = useTranslation();

  // Disable body scroll when modal is open (iOS-compatible)
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="generic-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "600px" }}
      >
        <div className="generic-modal-header">
          <h2>{t('userManagement.inviteUser')}</h2>
          <button className="close-button" onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>
        <div className="generic-modal-content">
          <NewUserForm
            newUser={newUser}
            loading={loading}
            smtpConfigured={smtpConfigured}
            onChange={onChange}
            onCancel={onClose}
            onSubmit={onSubmit}
          />
        </div>
      </div>
    </div>
  );
};

