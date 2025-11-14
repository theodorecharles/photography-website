import React from 'react';
import { PasswordInput } from '../../../PasswordInput';

interface ConfirmationModalProps {
  show: boolean;
  title: string;
  message: string;
  confirmText: string;
  isDangerous?: boolean;
  requirePassword?: boolean;
  password: string;
  onPasswordChange: (value: string) => void;
  onConfirm: (password?: string) => void;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  show,
  title,
  message,
  confirmText,
  isDangerous,
  requirePassword,
  password,
  onPasswordChange,
  onConfirm,
  onClose,
}) => {
  if (!show) return null;

  const handleConfirm = () => {
    onConfirm(password || undefined);
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
          <h2>{title}</h2>
          <button className="close-button" onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="share-modal-content">
          <p className="share-description">{message}</p>

          {requirePassword && (
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
              className={isDangerous ? 'btn-secondary' : 'btn-primary'}
              style={
                isDangerous
                  ? {
                      background: 'rgba(239, 68, 68, 0.2)',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                    }
                  : {}
              }
              disabled={requirePassword && !password}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

