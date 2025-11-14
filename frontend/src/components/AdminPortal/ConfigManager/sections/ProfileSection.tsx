/**
 * Profile Section Component
 * Allows non-admin users (viewers/managers) to manage their own account
 */

import React, { useState, useEffect } from "react";
import { MFASetupModal } from "./UserManagement/MFASetupModal";
import { ConfirmationModal } from "./UserManagement/ConfirmationModal";
import { UserCard } from "./UserManagement/UserCard";
import { PasskeysModal } from "./UserManagement/PasskeysModal";
import { PasswordChangeModal } from "./UserManagement/PasswordChangeModal";
import { userManagementAPI } from "./UserManagement/utils";
import type {
  User,
  Passkey,
  MFASetupData,
  PasswordChangeState,
  MessageType,
} from "./UserManagement/types";

const API_URL = import.meta.env.VITE_API_URL || "";

interface ProfileSectionProps {
  setMessage: (message: MessageType) => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  setMessage,
}) => {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState<
    number | undefined
  >(undefined);
  const [passwordChange, setPasswordChange] = useState<PasswordChangeState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasskeys, setShowPasskeys] = useState<number | undefined>(
    undefined
  );
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [passkeyName, setPasskeyName] = useState("");
  const [mfaSetup, setMfaSetup] = useState<MFASetupData | null>(null);
  const [mfaToken, setMfaToken] = useState("");
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    confirmText: "",
    isDangerous: false,
    requirePassword: false,
    onConfirm: (_password?: string) => {},
  });
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await userManagementAPI.fetchCurrentUser();
      if (user) {
        // Fetch full user details
        const res = await fetch(`${API_URL}/api/auth/status`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setCurrentUser({
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              picture: data.user.picture,
              role: data.user.role,
              mfa_enabled: data.user.mfa_enabled,
              passkey_count: data.user.passkey_count || 0,
              auth_methods: data.user.auth_methods || [],
              is_active: true,
              status: "active",
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to load current user:", error);
    }
  };

  const handleStartMFASetup = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/mfa/setup`, {
        method: 'POST',
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to start MFA setup");

      const data = await res.json();
      setMfaSetup(data);
      setMfaToken("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMFASetup = async (): Promise<void> => {
    if (!mfaSetup) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/mfa/verify-setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          secret: mfaSetup.secret,
          token: mfaToken,
        }),
      });

      if (!res.ok) throw new Error("Failed to verify MFA setup");

      setMessage({ type: "success", text: "MFA enabled successfully" });
      setMfaSetup(null);
      setMfaToken("");
      loadCurrentUser();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async (): Promise<void> => {
    setConfirmModal({
      show: true,
      title: "Disable MFA",
      message:
        "Are you sure you want to disable MFA? This will make your account less secure.",
      confirmText: "Disable MFA",
      isDangerous: true,
      requirePassword: true,
      onConfirm: (password) => {
        if (!password) return;
        setConfirmModal({ ...confirmModal, show: false });
        setConfirmPassword("");
        performDisableMFA(password);
      },
    });
  };

  const performDisableMFA = async (password: string): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/mfa/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      if (!res.ok) throw new Error("Failed to disable MFA");

      setMessage({ type: "success", text: "MFA disabled successfully" });
      loadCurrentUser();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPasskeys = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/passkey/list`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to load passkeys");

      const data = await res.json();
      setPasskeys(data.passkeys || []);
      setShowPasskeys(currentUser?.id);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load passkeys" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPasskey = async (): Promise<void> => {
    if (!passkeyName.trim()) {
      setMessage({ type: "error", text: "Please enter a passkey name" });
      return;
    }

    setLoading(true);
    try {
      const optionsRes = await fetch(
        `${API_URL}/api/auth-extended/passkey/register-options`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!optionsRes.ok) throw new Error("Failed to get passkey options");

      const options = await optionsRes.json();

      const credential = await navigator.credentials.create({
        publicKey: options,
      });

      const verifyRes = await fetch(
        `${API_URL}/api/auth-extended/passkey/register-verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            credential,
            name: passkeyName,
          }),
        }
      );

      if (!verifyRes.ok) throw new Error("Failed to register passkey");

      setMessage({ type: "success", text: "Passkey registered successfully" });
      setPasskeyName("");
      if (showPasskeys !== undefined) {
        handleLoadPasskeys();
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setMessage({ type: "error", text: "Passkey registration cancelled" });
      } else {
        setMessage({
          type: "error",
          text: err.message || "Passkey registration failed",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePasskey = async (passkeyId: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/auth-extended/passkey/${passkeyId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("Failed to remove passkey");

      setMessage({ type: "success", text: "Passkey removed successfully" });
      if (showPasskeys !== undefined) {
        handleLoadPasskeys();
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to remove passkey" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    if (passwordChange.newPassword.length < 8) {
      setMessage({
        type: "error",
        text: "Password must be at least 8 characters",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordChange.currentPassword,
          newPassword: passwordChange.newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to change password");
      }

      setMessage({ type: "success", text: "Password changed successfully" });
      setShowPasswordChange(undefined);
      setPasswordChange({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem 0" }}>
      <UserCard
        user={currentUser}
        currentUser={{ id: currentUser.id, email: currentUser.email, role: currentUser.role }}
        loading={loading}
        isFirstUser={true}
        onResendInvite={() => {}}
        onDeleteUser={() => {}}
        onOpenPasswordChange={setShowPasswordChange}
        onStartMFASetup={handleStartMFASetup}
        onDisableMFA={handleDisableMFA}
        onOpenPasskeys={handleLoadPasskeys}
        onResetMFA={() => {}}
        onSendPasswordReset={() => {}}
        onUpdateRole={() => {}}
      />

      {/* MFA Setup Modal */}
      {mfaSetup && (
        <MFASetupModal
          mfaSetup={mfaSetup}
          mfaToken={mfaToken}
          loading={loading}
          onClose={() => {
            setMfaSetup(null);
            setMfaToken("");
          }}
          onTokenChange={setMfaToken}
          onComplete={handleCompleteMFASetup}
        />
      )}

      {/* Passkeys Modal */}
      {showPasskeys !== undefined && (
        <PasskeysModal
          passkeys={passkeys}
          passkeyName={passkeyName}
          loading={loading}
          onClose={() => setShowPasskeys(undefined)}
          onNameChange={setPasskeyName}
          onRegister={handleRegisterPasskey}
          onRemove={handleRemovePasskey}
        />
      )}

      {/* Password Change Modal */}
      {showPasswordChange !== undefined && (
        <PasswordChangeModal
          passwordChange={passwordChange}
          loading={loading}
          onClose={() => setShowPasswordChange(undefined)}
          onPasswordChangeUpdate={setPasswordChange}
          onChangePassword={handleChangePassword}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isDangerous={confirmModal.isDangerous}
        requirePassword={confirmModal.requirePassword}
        password={confirmPassword}
        onPasswordChange={setConfirmPassword}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal({ ...confirmModal, show: false })}
      />
    </div>
  );
};

