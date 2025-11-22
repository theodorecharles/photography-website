import React, { useEffect } from "react";
import { useTranslation } from 'react-i18next';

interface MFASetupModalProps {
  mfaSetup: {
    qrCode: string;
    secret: string;
  };
  mfaToken: string;
  loading: boolean;
  onClose: () => void;
  onTokenChange: (token: string) => void;
  onComplete: () => void;
}

export const MFASetupModal: React.FC<MFASetupModalProps> = ({
  mfaSetup,
  mfaToken,
  loading,
  onClose,
  onTokenChange,
  onComplete,
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
          <h2>{t('userManagement.enableTwoFactorAuthentication')}</h2>
          <button className="close-button" onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }}
          className="generic-modal-content"
        >
          <div style={{ marginBottom: "1rem" }}>
            <p className="share-description">
              {t('userManagement.scanQrCodeDescription')}
            </p>
            <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
              <img
                src={mfaSetup.qrCode}
                alt={t('userManagement.mfaQrCode')}
                style={{
                  maxWidth: "250px",
                  width: "100%",
                  border: "1px solid #3a3a3a",
                  borderRadius: "8px",
                  background: "white",
                  padding: "0.5rem",
                }}
              />
            </div>
            <div
              style={{
                background: "#1e1e1e",
                border: "1px solid #3a3a3a",
                padding: "0.5rem",
                borderRadius: "6px",
                fontSize: "0.8rem",
                textAlign: "center",
                fontFamily: "monospace",
                color: "#e5e7eb",
                letterSpacing: "0.05em",
                wordBreak: "break-all",
              }}
            >
              {mfaSetup.secret}
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label className="branding-label">
              {t('userManagement.enterVerificationCode')}
            </label>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <input
                type="text"
                value={mfaToken}
                onChange={(e) =>
                  onTokenChange(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                onInput={(e) =>
                  onTokenChange(
                    (e.target as HTMLInputElement).value
                      .replace(/\D/g, "")
                      .slice(0, 6)
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (mfaToken.length === 6) {
                      onComplete();
                    }
                  }
                }}
                placeholder="000000"
                className="branding-input"
                maxLength={6}
                style={{
                  textAlign: "center",
                  fontSize: "1.5rem",
                  letterSpacing: "0.5em",
                  width: "200px",
                }}
                autoComplete="one-time-code"
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "flex-end",
              paddingTop: "1rem",
              borderTop: "1px solid #3a3a3a",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={onComplete}
              className="btn-primary"
              disabled={loading || mfaToken.length !== 6}
            >
              {loading ? t('userManagement.verifying') : t('userManagement.enableMfa')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
