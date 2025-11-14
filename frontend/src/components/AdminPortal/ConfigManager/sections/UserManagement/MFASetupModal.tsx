import React from "react";

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
  return (
    <div className="modal-overlay">
      <div className="share-modal" style={{ maxWidth: "550px" }}>
        <div className="share-modal-header">
          <h2>Enable Two-Factor Authentication</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }}
          className="share-modal-content"
        >
          <div style={{ marginBottom: "1.5rem" }}>
            <p className="share-description">
              Scan this QR code with your authenticator app (Google
              Authenticator, Authy, 1Password, etc.)
            </p>
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <img
                src={mfaSetup.qrCode}
                alt="MFA QR Code"
                style={{
                  maxWidth: "250px",
                  border: "2px solid #3a3a3a",
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
                padding: "0.75rem",
                borderRadius: "6px",
                fontSize: "0.85rem",
                textAlign: "center",
                fontFamily: "monospace",
                color: "#e5e7eb",
                letterSpacing: "0.05em",
              }}
            >
              {mfaSetup.secret}
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label className="branding-label">
              Enter verification code from your app
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
              Cancel
            </button>
            <button
              type="button"
              onClick={onComplete}
              className="btn-primary"
              disabled={loading || mfaToken.length !== 6}
            >
              {loading ? "Verifying..." : "Enable MFA"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
