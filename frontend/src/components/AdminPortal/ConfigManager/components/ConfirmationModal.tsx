/**
 * Confirmation Modal Component
 * Reusable modal for confirmations with optional password input
 */

import React from 'react';
import { PasswordInput } from '../../PasswordInput';
import { ConfirmModalState } from '../sections/userManagementTypes';

interface ConfirmationModalProps {
  modal: ConfirmModalState;
  password: string;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  modal,
  password,
  onPasswordChange,
  onClose,
}) => {
  if (!modal.show) return null;

  const handleConfirm = () => {
    modal.onConfirm(password || undefined);
    onPasswordChange('');
  };

  const handleClose = () => {
    onClose();
    onPasswordChange('');
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="share-modal-header">
          <h2>{modal.title}</h2>
          <button className="close-button" onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="share-modal-content">
          <p className="share-description">{modal.message}</p>

          {modal.requirePassword && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="branding-label">Password</label>
              <PasswordInput
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="Enter your password to confirm"
                required
              />
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              paddingTop: '1rem',
              borderTop: '1px solid #3a3a3a',
            }}
          >
            <button onClick={handleClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={modal.isDangerous ? 'btn-secondary' : 'btn-primary'}
              style={
                modal.isDangerous
                  ? {
                      background: 'rgba(239, 68, 68, 0.2)',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                    }
                  : {}
              }
              disabled={modal.requirePassword && !password}
            >
              {modal.confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
