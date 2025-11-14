import React from "react";
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
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="share-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "600px" }}
      >
        <div className="share-modal-header">
          <h2>🔑 Manage Passkeys</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="share-modal-content">
          <p className="share-description" style={{ marginBottom: "1rem" }}>
            Passkeys provide secure, passwordless authentication using
            biometrics or device security.
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
                No passkeys registered yet
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
                      Added {new Date(passkey.created_at).toLocaleDateString()}
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
                    Remove
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
              Register New Passkey
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                value={passkeyName}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Passkey name (e.g., MacBook Touch ID)"
                className="branding-input"
                style={{ flex: 1 }}
              />
              <button
                onClick={onRegister}
                className="btn-primary"
                style={{ padding: "0.5rem 1rem", whiteSpace: "nowrap" }}
                disabled={loading || !passkeyName.trim()}
              >
                {loading ? "Registering..." : "+ Register"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
