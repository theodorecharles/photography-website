/**
 * User Management Section Component
 * Manages user accounts, MFA, passkeys, and authentication methods
 */

import React, { useState, useEffect } from "react";
import SectionHeader from "../components/SectionHeader";
import { MFASetupModal } from "./UserManagement/MFASetupModal";
import { ConfirmationModal } from "./UserManagement/ConfirmationModal";
import { NewUserForm } from "./UserManagement/NewUserForm";
import { UserCard } from "./UserManagement/UserCard";
import { SMTPWarningBanner } from "./UserManagement/SMTPWarningBanner";
import { PasskeysModal } from "./UserManagement/PasskeysModal";
import { PasswordChangeModal } from "./UserManagement/PasswordChangeModal";
import { InviteLinkModal } from "./UserManagement/InviteLinkModal";
import { userManagementAPI } from "./UserManagement/utils";
import { withLoadingAndErrorHandling } from "./UserManagement/handlers";
import type {
  User,
  Passkey,
  MFASetupData,
  NewUserState,
  PasswordChangeState,
  MessageType,
} from "./UserManagement/types";

const API_URL = import.meta.env.VITE_API_URL || "";

interface UserManagementSectionProps {
  setMessage: (message: MessageType) => void;
  onNavigateToSmtp?: () => void;
}

const UserManagementSection: React.FC<UserManagementSectionProps> = ({
  setMessage,
  onNavigateToSmtp,
}) => {
  const [showSection, setShowSection] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    email: string;
    role: string;
  } | null>(null);

  // SMTP configuration check
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);

  // New user form (invitation)
  const [showNewUserForm, setShowNewUserForm] = useState<boolean>(false);
  const [newUser, setNewUser] = useState<NewUserState>({
    email: "",
    role: "viewer",
  });
  const [inviteLinkModal, setInviteLinkModal] = useState<{
    show: boolean;
    inviteUrl: string;
    userEmail: string;
  }>({
    show: false,
    inviteUrl: "",
    userEmail: "",
  });

  // MFA state
  const [mfaSetup, setMfaSetup] = useState<MFASetupData | null>(null);
  const [mfaToken, setMfaToken] = useState("");

  // Passkey state
  const [showPasskeys, setShowPasskeys] = useState<number | undefined>(
    undefined
  );
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [passkeyName, setPasskeyName] = useState("");

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState<
    number | undefined
  >(undefined);
  const [passwordChange, setPasswordChange] = useState<PasswordChangeState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: (password?: string) => void;
    isDangerous?: boolean;
    requirePassword?: boolean;
  }>({
    show: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    onConfirm: () => {},
    isDangerous: false,
    requirePassword: false,
  });
  const [confirmPassword, setConfirmPassword] = useState("");

  // Get current user info
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Load users and check SMTP when section is opened
  useEffect(() => {
    if (showSection) {
      loadUsers();
      checkSmtpConfig();
    }
  }, [showSection]);

  // Listen for SMTP config updates from other sections
  useEffect(() => {
    const handleSmtpUpdate = () => {
      checkSmtpConfig();
    };

    window.addEventListener('smtp-config-updated', handleSmtpUpdate);
    return () => {
      window.removeEventListener('smtp-config-updated', handleSmtpUpdate);
    };
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const user = await userManagementAPI.fetchCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (err) {
      console.error("Failed to fetch current user:", err);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const users = await userManagementAPI.loadUsers();
      setUsers(users);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load users" });
    } finally {
      setLoading(false);
    }
  };

  const checkSmtpConfig = async () => {
    try {
      const isConfigured = await userManagementAPI.checkSmtpConfig();
      setSmtpConfigured(isConfigured);
    } catch (err) {
      console.error("Failed to check SMTP config:", err);
    }
  };

  const handleInviteUser = async () => {
    if (!newUser.email) {
      setMessage({ type: "error", text: "Email is required" });
      return;
    }

    setLoading(true);
    try {
      const data = await userManagementAPI.inviteUser(newUser);
      
      // If email is disabled, show the invite link modal
      if (!data.emailEnabled && data.inviteUrl) {
        setInviteLinkModal({
          show: true,
          inviteUrl: data.inviteUrl,
          userEmail: newUser.email,
        });
        setMessage({
          type: "success",
          text: "User created successfully. Copy the invitation link to send to the user.",
        });
        // Store invite token in form so user can copy it
        setNewUser({ 
          ...newUser, 
          inviteToken: data.user.invite_token || data.inviteUrl.split('/invite/')[1]
        });
      } else {
        const message = data.emailSent
          ? "Invitation sent successfully"
          : "User created but email failed to send";

        setMessage({
          type: data.emailSent ? "success" : "error",
          text: message,
        });
        
        // Store invite token in form for copy functionality
        if (data.user.invite_token) {
          setNewUser({ 
            ...newUser, 
            inviteToken: data.user.invite_token
          });
        }
      }

      loadUsers();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Failed to send invitation",
      });
      setLoading(false);
    } finally {
      // Don't close form immediately if we have a token to copy
      if (!newUser.inviteToken) {
        setLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleResendInvite = async (userId: number) => {
    setConfirmModal({
      show: true,
      title: "Resend Invitation",
      message: "Resend invitation email to this user?",
      confirmText: "Resend",
      isDangerous: false,
      onConfirm: () => {
        setConfirmModal({ ...confirmModal, show: false });
        performResendInvite(userId);
      },
    });
  };

  const performResendInvite = async (userId: number) => {
    await withLoadingAndErrorHandling(
      setLoading,
      setMessage,
      () => userManagementAPI.resendInvite(userId),
      {
        onSuccess: (data) => {
          // If email is disabled, show the invite link modal
          if (!data.emailEnabled && data.inviteUrl) {
            const user = users.find(u => u.id === userId);
            setInviteLinkModal({
              show: true,
              inviteUrl: data.inviteUrl,
              userEmail: user?.email || "",
            });
            setMessage({
              type: "success",
              text: "Invitation link generated. Copy the link to send to the user.",
            });
          } else {
            const message = data.emailSent
              ? "Invitation resent successfully"
              : "Invitation updated but email failed to send";
            setMessage({
              type: data.emailSent ? "success" : "error",
              text: message,
            });
          }
          loadUsers();
        },
        errorMessage: "Failed to resend invitation",
      }
    );
  };

  const handleResetMFA = async (userId: number) => {
    setConfirmModal({
      show: true,
      title: "Reset MFA",
      message:
        "This will disable MFA for this user. They will be able to log in with just their password. Continue?",
      confirmText: "Disable MFA",
      isDangerous: true,
      onConfirm: () => {
        setConfirmModal({ ...confirmModal, show: false });
        performResetMFA(userId);
      },
    });
  };

  const performResetMFA = async (userId: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/auth-extended/users/${userId}/reset-mfa`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reset MFA");
      }

      const data = await res.json();
      setMessage({
        type: "success",
        text: data.message || "MFA disabled successfully",
      });

      loadUsers();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to reset MFA" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendPasswordReset = async (userId: number) => {
    setConfirmModal({
      show: true,
      title: "Send Password Reset",
      message:
        "This will send a password reset email to this user. They will have 1 hour to use the link. Continue?",
      confirmText: "Send Reset Email",
      isDangerous: false,
      onConfirm: () => {
        setConfirmModal({ ...confirmModal, show: false });
        performSendPasswordReset(userId);
      },
    });
  };

  const performSendPasswordReset = async (userId: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/auth-extended/users/${userId}/send-password-reset`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send password reset email");
      }

      const data = await res.json();
      setMessage({
        type: "success",
        text: data.message || "Password reset email sent successfully",
      });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Failed to send password reset email",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    // Prevent deleting yourself
    if (currentUser && userId === currentUser.id) {
      setMessage({ type: "error", text: "Cannot delete your own account" });
      return;
    }

    setConfirmModal({
      show: true,
      title: "Delete User",
      message:
        "Are you sure you want to permanently delete this user? This action cannot be undone.",
      confirmText: "Delete User",
      isDangerous: true,
      onConfirm: () => {
        setConfirmModal({ ...confirmModal, show: false });
        performDeleteUser(userId);
      },
    });
  };

  const performDeleteUser = async (userId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete user");

      setMessage({
        type: "success",
        text: "User deleted successfully",
      });
      loadUsers();
    } catch (err) {
      setMessage({ type: "error", text: "Failed to delete user" });
    } finally {
      setLoading(false);
    }
  };

  // MFA Management
  const handleStartMFASetup = async (_userId: number): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/mfa/setup`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to start MFA setup");

      const data = await res.json();
      setMfaSetup({
        userId: _userId,
        qrCode: data.qrCode,
        secret: data.secret,
        backupCodes: data.backupCodes,
        setupToken: data.setupToken,
      });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to start MFA setup" });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMFASetup = async () => {
    if (!mfaSetup || mfaToken.length !== 6) {
      setMessage({ type: "error", text: "Please enter a valid 6-digit code" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/mfa/verify-setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          setupToken: mfaSetup.setupToken,
          token: mfaToken,
          backupCodes: mfaSetup.backupCodes,
        }),
      });

      if (!res.ok) throw new Error("Invalid verification code");

      setMessage({ type: "success", text: "MFA enabled successfully" });
      setMfaSetup(null);
      setMfaToken("");
      loadUsers();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async (_userId: number): Promise<void> => {
    setConfirmModal({
      show: true,
      title: "Disable MFA",
      message:
        "Are you sure you want to disable MFA? This will make the account less secure.",
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
      loadUsers();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Passkey Management
  const handleLoadPasskeys = async (userId: number): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/passkey/list`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to load passkeys");

      const data = await res.json();
      setPasskeys(data.passkeys || []);
      setShowPasskeys(userId);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load passkeys" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPasskey = async (userId: number): Promise<void> => {
    if (!passkeyName.trim()) {
      setMessage({
        type: "error",
        text: "Please enter a name for this passkey",
      });
      return;
    }

    setLoading(true);
    try {
      // Get registration options
      const optionsRes = await fetch(
        `${API_URL}/api/auth-extended/passkey/register-options`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!optionsRes.ok) throw new Error("Failed to get registration options");

      const options = await optionsRes.json();

      // Start WebAuthn registration
      const { startRegistration } = await import("@simplewebauthn/browser");
      const credential = await startRegistration(options);

      // Verify registration
      const verifyRes = await fetch(
        `${API_URL}/api/auth-extended/passkey/register-verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ credential, name: passkeyName }),
        }
      );

      if (!verifyRes.ok) throw new Error("Passkey registration failed");

      setMessage({ type: "success", text: "Passkey registered successfully" });
      setPasskeyName("");
      handleLoadPasskeys(userId);
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
    setConfirmModal({
      show: true,
      title: "Remove Passkey",
      message: "Are you sure you want to remove this passkey?",
      confirmText: "Remove",
      isDangerous: true,
      onConfirm: () => {
        setConfirmModal({ ...confirmModal, show: false });
        performRemovePasskey(passkeyId);
      },
    });
  };

  const performRemovePasskey = async (passkeyId: string) => {
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
      if (showPasskeys) {
        handleLoadPasskeys(showPasskeys);
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to remove passkey" });
    } finally {
      setLoading(false);
    }
  };

  // Password Change
  const handleChangePassword = async (_userId: number): Promise<void> => {
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

  const handleUpdateRole = async (userId: number, role: string) => {
    setLoading(true);
    try {
      await userManagementAPI.updateUserRole(userId, role);
      setMessage({ type: "success", text: `User role updated to ${role}` });
      loadUsers();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="config-group full-width" data-section="user-management">
      <SectionHeader
        title="Users"
        description="Manage user accounts and security settings"
        isExpanded={showSection}
        onToggle={() => setShowSection(!showSection)}
      />

      <div
        className={`collapsible-content ${
          showSection ? "expanded" : "collapsed"
        }`}
        style={{
          maxHeight: showSection ? "10000px" : "0",
          overflow: showSection ? "visible" : "hidden",
        }}
      >
        <div className="branding-grid">
          {/* SMTP Setup Warning or Invite User Button - Admin Only */}
          {currentUser && currentUser.role === "admin" && (
            <SMTPWarningBanner
              smtpConfigured={smtpConfigured}
              showNewUserForm={showNewUserForm}
              onSetupSmtp={onNavigateToSmtp || (() => {})}
              onToggleNewUserForm={() => setShowNewUserForm(!showNewUserForm)}
            />
          )}

          {/* New User Form (Invitation) */}
          {showNewUserForm && (
            <NewUserForm
              newUser={newUser}
              loading={loading}
              onChange={setNewUser}
              onCancel={() => {
                setShowNewUserForm(false);
                setNewUser({ email: "", role: "viewer" });
              }}
              onSubmit={handleInviteUser}
            />
          )}

          {/* Users List */}
          {!showNewUserForm && (
            <div style={{ gridColumn: "1 / -1" }}>
              {loading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "#888",
                  }}
                >
                  Loading users...
                </div>
              ) : users.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "#888",
                  }}
                >
                  No users found
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(100%, 450px), 1fr))",
                    gap: "1rem",
                    overflow: "visible",
                  }}
                >
                  {users.map((user, index) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      currentUser={currentUser}
                      loading={loading}
                      isFirstUser={index === 0}
                      onResendInvite={handleResendInvite}
                      onDeleteUser={handleDeleteUser}
                      onOpenPasswordChange={setShowPasswordChange}
                      onStartMFASetup={handleStartMFASetup}
                      onDisableMFA={handleDisableMFA}
                      onOpenPasskeys={handleLoadPasskeys}
                      onResetMFA={handleResetMFA}
                      onSendPasswordReset={handleSendPasswordReset}
                      onUpdateRole={handleUpdateRole}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

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
              onRegister={() => handleRegisterPasskey(showPasskeys)}
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
              onChangePassword={() => handleChangePassword(showPasswordChange)}
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

          {/* Invite Link Modal (when email is disabled) */}
          {inviteLinkModal.show && (
            <InviteLinkModal
              inviteUrl={inviteLinkModal.inviteUrl}
              userEmail={inviteLinkModal.userEmail}
              onClose={() =>
                setInviteLinkModal({ show: false, inviteUrl: "", userEmail: "" })
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagementSection;
