import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '../../../../icons';
import type { Passkey } from './types';

interface PasskeysListProps {
  passkeys: Passkey[];
  passkeyName: string;
  loading: boolean;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onRegister: () => void;
  onRemove: (passkeyId: string) => void;
}

export const PasskeysList: React.FC<PasskeysListProps> = ({
  passkeys,
  passkeyName,
  loading,
  onClose,
  onNameChange,
  onRegister,
  onRemove,
}) => {
  const { t } = useTranslation();
  return (
    <div
      style={{
        marginTop: '1rem',
        padding: '1rem',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <h5 style={{ margin: 0 }}>{t('userManagement.registeredPasskeys')}</h5>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#9ca3af',
          }}
        >
          ×
        </button>
      </div>

      {passkeys.length === 0 ? (
        <p
          style={{
            color: '#9ca3af',
            fontSize: '0.85rem',
            margin: '0.5rem 0',
          }}
        >
          {t('userManagement.noPasskeysRegistered')}
        </p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}
        >
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                background: '#1e1e1e',
                borderRadius: '6px',
                border: '1px solid #3a3a3a',
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    color: '#e5e7eb',
                  }}
                >
                  {passkey.name}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                  }}
                >
                  {t('userManagement.added')} {new Date(passkey.created_at).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => onRemove(passkey.id)}
                className="btn-secondary"
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.8rem',
                }}
                disabled={loading}
              >
                <TrashIcon width={12} height={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Register New Passkey */}
      <div
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '0.75rem',
          marginTop: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={passkeyName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={t('userManagement.passkeyNamePlaceholder')}
                className="branding-input"
                style={{ flex: 1 }}
              />
              <button
                onClick={onRegister}
                className="btn-primary"
                style={{ padding: '0.5rem 1rem' }}
                disabled={loading || !passkeyName.trim()}
              >
                {loading ? t('userManagement.registering') : t('userManagement.register')}
              </button>
            </div>
            <p
              style={{
                fontSize: '0.75rem',
                color: '#9ca3af',
                margin: '0.5rem 0 0 0',
              }}
            >
              {t('userManagement.passkeysNote')}
            </p>
      </div>
    </div>
  );
};

