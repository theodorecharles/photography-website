import React, { useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { TrashIcon } from "../../../../icons";
import type { Passkey } from "./types";

interface PasskeysModalProps {
  passkeys: Passkey[];
  passkeyName: string;
  loading: boolean;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onRegister: () => void;
  onRemove: (passkeyId: string) => void;
}

export const PasskeysModal: React.FC<PasskeysModalProps> = ({
  passkeys,
  passkeyName,
  loading,
  onClose,
  onNameChange,
  onRegister,
  onRemove,
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
          <h2>🔑 {t('userManagement.managePasskeys')}</h2>
          <button className="close-button" onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>
        <div className="generic-modal-content">
          <p className="share-description" style={{ marginBottom: "1rem" }}>
            {t('userManagement.passkeysDescription')}
          </p>

          {passkeys.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.03)",
                borderRadius: "6px",
                marginBottom: "1rem",
              }}
            >
              <p
                style={{
                  color: "#9ca3af",
                  fontSize: "0.9rem",
                  margin: 0,
                }}
              >
                {t('userManagement.noPasskeysRegistered')}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              {passkeys.map((passkey) => (
                <div
                  key={passkey.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: "0.9rem",
                        color: "#e5e7eb",
                      }}
                    >
                      {passkey.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                      }}
                    >
                      {t('userManagement.added')} {new Date(passkey.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(passkey.id)}
                    className="btn-secondary"
                    style={{
                      padding: "0.4rem 0.7rem",
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                    disabled={loading}
                  >
                    <TrashIcon width={14} height={14} />
                    {t('userManagement.remove')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Register New Passkey */}
          <div
            style={{
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              paddingTop: "1rem",
            }}
          >
            <label
              className="branding-label"
              style={{ marginBottom: "0.5rem" }}
            >
              {t('userManagement.registerNewPasskey')}
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
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
                style={{ padding: "0.5rem 1rem", whiteSpace: "nowrap" }}
                disabled={loading || !passkeyName.trim()}
              >
                {loading ? t('userManagement.registering') : t('userManagement.register')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
