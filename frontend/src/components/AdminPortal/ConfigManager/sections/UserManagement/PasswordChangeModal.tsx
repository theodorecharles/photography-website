import React from "react";
import { PasswordInput } from "../../../PasswordInput";
import type { PasswordChangeState } from "./types";

interface PasswordChangeModalProps {
  passwordChange: PasswordChangeState;
  loading: boolean;
  onClose: () => void;
  onPasswordChangeUpdate: (change: PasswordChangeState) => void;
  onChangePassword: () => void;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  passwordChange,
  loading,
  onClose,
  onPasswordChangeUpdate,
  onChangePassword,
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="share-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "500px" }}
      >
        <div className="share-modal-header">
          <h2>🔑 Change Password</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChangePassword();
            return false;
          }}
          className="share-modal-content"
        >
          <p className="share-description" style={{ marginBottom: "1.5rem" }}>
            Enter your current password and choose a new password.
          </p>

          <div style={{ marginBottom: "1rem" }}>
            <label className="branding-label">Current Password</label>
            <PasswordInput
              value={passwordChange.currentPassword}
              onChange={(e) =>
                onPasswordChangeUpdate({
                  ...passwordChange,
                  currentPassword: e.target.value,
                })
              }
              placeholder="Enter current password"
              required
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label className="branding-label">New Password</label>
            <PasswordInput
              value={passwordChange.newPassword}
              onChange={(e) =>
                onPasswordChangeUpdate({
                  ...passwordChange,
                  newPassword: e.target.value,
                })
              }
              placeholder="Enter new password (min 8 characters)"
              required
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label className="branding-label">Confirm New Password</label>
            <PasswordInput
              value={passwordChange.confirmPassword}
              onChange={(e) =>
                onPasswordChangeUpdate({
                  ...passwordChange,
                  confirmPassword: e.target.value,
                })
              }
              placeholder="Confirm new password"
              required
            />
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
              onClick={onChangePassword}
              className="btn-primary"
              disabled={
                loading ||
                !passwordChange.currentPassword ||
                !passwordChange.newPassword ||
                !passwordChange.confirmPassword
              }
            >
              {loading ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
