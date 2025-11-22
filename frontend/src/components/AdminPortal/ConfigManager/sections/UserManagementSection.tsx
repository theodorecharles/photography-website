/**
 * User Management Section Component
 * Manages user accounts, MFA, passkeys, and authentication methods
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../../../config';
import { 
  trackUserInvited, 
  trackUserDeleted, 
  trackUserRoleChanged, 
  trackMFAReset, 
  trackPasswordResetSent 
} from '../../../../utils/analytics';
import { MFASetupModal } from "./UserManagement/MFASetupModal";
import { ConfirmationModal } from "./UserManagement/ConfirmationModal";
import { NewUserModal } from "./UserManagement/NewUserModal";
import { UserCard } from "./UserManagement/UserCard";
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
import { error } from '../../../../utils/logger';


interface UserManagementSectionProps {
  setMessage: (message: MessageType) => void;
  setActionButtons: (buttons: React.ReactNode) => void;
}

const UserManagementSection: React.FC<UserManagementSectionProps> = ({
  setMessage,
  setActionButtons,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    email: string;
    role: string;
  } | null>(null);

  // SMTP configuration check
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);
  const [smtpBannerDismissed, setSmtpBannerDismissed] = useState<boolean>(false);

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
    confirmText: t('common.confirm'),
    onConfirm: () => {},
    isDangerous: false,
    requirePassword: false,
  });
  const [confirmPassword, setConfirmPassword] = useState("");

  // Get current user info
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Load users and check SMTP on mount
  useEffect(() => {
    loadUsers();
    checkSmtpConfig();
  }, []);

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
      error("Failed to fetch current user:", err);
    }
  };

  // Update action buttons based on user role and SMTP config
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin' || smtpConfigured === null) {
      setActionButtons(null);
      return;
    }

    const buttons = [];

    // Show SMTP setup button if not configured and not dismissed
    if (!smtpConfigured && !smtpBannerDismissed) {
      buttons.push(
        <button
          key="setup-smtp"
          onClick={() => navigate('/admin/settings/email')}
          className="btn-primary"
          style={{ fontSize: '0.875rem', padding: '0.4rem 0.8rem', whiteSpace: 'nowrap' }}
        >
          {t('userManagement.setupSmtp')}
        </button>,
        <button
          key="dismiss"
          onClick={async () => {
            try {
              // Load current config
              const res = await fetch(`${API_URL}/api/config`, {
                credentials: 'include',
              });

              if (res.ok) {
                const config = await res.json();
                
                // Set smtpBannerDismissed flag
                const updatedConfig = {
                  ...config,
                  smtpBannerDismissed: true
                };

                // Save updated config
                const saveRes = await fetch(`${API_URL}/api/config`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify(updatedConfig),
                });

                if (saveRes.ok) {
                  setSmtpBannerDismissed(true);
                }
              }
            } catch (err) {
              error('Failed to dismiss SMTP banner:', err);
            }
          }}
          className="btn-secondary"
          style={{ fontSize: '0.875rem', padding: '0.4rem 0.8rem', whiteSpace: 'nowrap' }}
        >
          {t('common.dismiss')}
        </button>
      );
    } else {
      // Show Invite User button when SMTP is configured or banner dismissed
      buttons.push(
        <button
          key="invite-user"
          onClick={() => setShowNewUserForm(!showNewUserForm)}
          className="btn-primary"
          style={{ fontSize: '0.875rem', padding: '0.4rem 0.8rem', whiteSpace: 'nowrap' }}
        >
          {showNewUserForm ? t('common.cancel') : t('userManagement.inviteUser')}
        </button>
      );
    }

    setActionButtons(<>{buttons}</>);
  }, [currentUser, smtpConfigured, smtpBannerDismissed, showNewUserForm, t, navigate, setActionButtons]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const users = await userManagementAPI.loadUsers();
      setUsers(users);
    } catch (err) {
      setMessage({ type: "error", text: t('userManagement.failedToLoadUsers') });
    } finally {
      setLoading(false);
    }
  };

  const checkSmtpConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/config`, {
        credentials: 'include',
      });
      if (res.ok) {
        const config = await res.json();
        
        // Check if SMTP is configured
        const emailConfig = config.email || {};
        const isConfigured =
          emailConfig.enabled &&
          emailConfig.smtp?.host &&
          emailConfig.smtp?.auth?.user &&
          emailConfig.smtp?.auth?.pass;
        setSmtpConfigured(isConfigured);
        
        // Check if banner has been dismissed
        const bannerDismissed = config.environment?.features?.smtpBannerDismissed || false;
        setSmtpBannerDismissed(bannerDismissed);
      }
    } catch (err) {
      error("Failed to check SMTP config:", err);
    }
  };

  const handleInviteUser = async () => {
    if (!newUser.email) {
      setMessage({ type: "error", text: t('userManagement.emailRequired') });
      return;
    }

    setLoading(true);
    try {
      const data = await userManagementAPI.inviteUser(newUser);
      
      // Track user invited
      trackUserInvited(newUser.email, newUser.role);
      
      // If email was sent, close the modal and show success
      if (data.emailSent) {
        setMessage({
          type: "success",
          text: t('userManagement.invitationSentSuccessfully'),
        });
        setShowNewUserForm(false);
        setNewUser({ email: "", role: "viewer" });
        loadUsers();
        return;
      }
      
      // Email was NOT sent (SMTP not configured)
      // Store invite token in form so the NewUserModal can handle copying
      const inviteToken = data.user.invite_token || data.inviteUrl?.split('/invite/')[1];
      if (inviteToken) {
        setNewUser({ 
          ...newUser, 
          inviteToken: inviteToken
        });
      }
      
      loadUsers();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || t('userManagement.failedToInvite'),
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
      title: t('userManagement.resendInvite'),
      message: t('userManagement.resendInviteConfirm'),
      confirmText: t('userManagement.resendInvite'),
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
              text: t('userManagement.invitationLinkGenerated'),
            });
          } else {
            const message = data.emailSent
              ? t('userManagement.invitationResentSuccessfully')
              : t('userManagement.invitationUpdatedEmailFailed');
            setMessage({
              type: data.emailSent ? "success" : "error",
              text: message,
            });
          }
          loadUsers();
        },
        errorMessage: t('userManagement.failedToResendInvite'),
      }
    );
  };

  const handleResetMFA = async (userId: number) => {
    setConfirmModal({
      show: true,
      title: t('userManagement.resetMfa'),
      message: t('userManagement.resetMfaConfirm'),
      confirmText: t('userManagement.disableMfa'),
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
        throw new Error(data.error || t('userManagement.failedToResetMfa'));
      }

      const data = await res.json();
      
      // Track MFA reset
      const user = users.find(u => u.id === userId);
      if (user) {
        trackMFAReset(user.email, userId);
      }
      
      setMessage({
        type: "success",
        text: data.message || t('userManagement.mfaReset'),
      });

      loadUsers();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || t('userManagement.failedToResetMfa') });
    } finally {
      setLoading(false);
    }
  };

  const handleSendPasswordReset = async (userId: number) => {
    setConfirmModal({
      show: true,
      title: t('userManagement.sendPasswordReset'),
      message: t('userManagement.sendPasswordResetConfirm'),
      confirmText: t('userManagement.sendPasswordReset'),
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
        throw new Error(data.error || t('userManagement.failedToSendPasswordReset'));
      }

      const data = await res.json();
      
      // Track password reset sent
      const user = users.find(u => u.id === userId);
      if (user) {
        trackPasswordResetSent(user.email, userId);
      }
      
      setMessage({
        type: "success",
        text: data.message || t('userManagement.passwordResetSent'),
      });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || t('userManagement.failedToSendPasswordReset'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    // Prevent deleting yourself
    if (currentUser && userId === currentUser.id) {
      setMessage({ type: "error", text: t('userManagement.cannotDeleteOwnAccount') });
      return;
    }

    setConfirmModal({
      show: true,
      title: t('userManagement.deleteUser'),
      message: t('userManagement.deleteUserConfirm'),
      confirmText: t('userManagement.deleteUser'),
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

      if (!res.ok) throw new Error(t('userManagement.failedToDelete'));

      // Track user deleted
      const user = users.find(u => u.id === userId);
      if (user) {
        trackUserDeleted(user.email, userId);
      }

      setMessage({
        type: "success",
        text: t('userManagement.userDeleted'),
      });
      loadUsers();
    } catch (err) {
      setMessage({ type: "error", text: t('userManagement.failedToDelete') });
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

      if (!res.ok) throw new Error(t('userManagement.failedToStartMfaSetup'));

      const data = await res.json();
      setMfaSetup({
        userId: _userId,
        qrCode: data.qrCode,
        secret: data.secret,
        backupCodes: data.backupCodes,
        setupToken: data.setupToken,
      });
    } catch (err) {
      setMessage({ type: "error", text: t('userManagement.failedToStartMfaSetup') });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMFASetup = async () => {
    if (!mfaSetup || mfaToken.length !== 6) {
      setMessage({ type: "error", text: t('userManagement.invalidMfaCode') });
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

      if (!res.ok) throw new Error(t('userManagement.invalidVerificationCode'));

      setMessage({ type: "success", text: t('userManagement.mfaEnabledSuccessfully') });
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
      title: t('userManagement.disableMfa'),
      message: t('userManagement.disableMfaConfirm'),
      confirmText: t('userManagement.disableMfa'),
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

      if (!res.ok) throw new Error(t('userManagement.failedToDisableMfa'));

      setMessage({ type: "success", text: t('userManagement.mfaDisabledSuccessfully') });
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

      if (!res.ok) throw new Error(t('userManagement.failedToLoadPasskeys'));

      const data = await res.json();
      setPasskeys(data.passkeys || []);
      setShowPasskeys(userId);
    } catch (err) {
      setMessage({ type: "error", text: t('userManagement.failedToLoadPasskeys') });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPasskey = async (userId: number): Promise<void> => {
    if (!passkeyName.trim()) {
      setMessage({
        type: "error",
        text: t('userManagement.passkeyNameRequired'),
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

      if (!optionsRes.ok) throw new Error(t('userManagement.failedToGetRegistrationOptions'));

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

      if (!verifyRes.ok) throw new Error(t('userManagement.passkeyRegistrationFailed'));

      setMessage({ type: "success", text: t('userManagement.passkeyRegisteredSuccessfully') });
      setPasskeyName("");
      handleLoadPasskeys(userId);
      loadUsers(); // Refresh user list to update passkey count
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setMessage({ type: "error", text: t('userManagement.passkeyRegistrationCancelled') });
      } else {
        setMessage({
          type: "error",
          text: err.message || t('userManagement.passkeyRegistrationFailed'),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePasskey = async (passkeyId: string) => {
    setConfirmModal({
      show: true,
      title: t('userManagement.removePasskey'),
      message: t('userManagement.removePasskeyConfirm'),
      confirmText: t('userManagement.remove'),
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

      if (!res.ok) throw new Error(t('userManagement.failedToRemovePasskey'));

      setMessage({ type: "success", text: t('userManagement.passkeyRemovedSuccessfully') });
      if (showPasskeys) {
        handleLoadPasskeys(showPasskeys);
      }
      loadUsers(); // Refresh user list to update passkey count
    } catch (err) {
      setMessage({ type: "error", text: t('userManagement.failedToRemovePasskey') });
    } finally {
      setLoading(false);
    }
  };

  // Password Change
  const handleChangePassword = async (_userId: number): Promise<void> => {
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      setMessage({ type: "error", text: t('userManagement.passwordsDoNotMatch') });
      return;
    }

    if (passwordChange.newPassword.length < 8) {
      setMessage({
        type: "error",
        text: t('userManagement.passwordMinLength'),
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
        throw new Error(data.error || t('userManagement.failedToChangePassword'));
      }

      setMessage({ type: "success", text: t('userManagement.passwordChangedSuccessfully') });
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
      // Get old role before updating
      const user = users.find(u => u.id === userId);
      const oldRole = user?.role || '';
      
      await userManagementAPI.updateUserRole(userId, role);
      
      // Track role change
      if (user) {
        trackUserRoleChanged(user.email, userId, oldRole, role);
      }
      
      setMessage({ type: "success", text: t('userManagement.userRoleUpdated', { role }) });
      loadUsers();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-section="user-management">
        <div className="branding-grid">
          {/* SMTP Warning Banner - Admin Only (shows warning message without buttons) */}
          {currentUser && currentUser.role === "admin" && !smtpConfigured && !smtpBannerDismissed && (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '1rem',
                background: 'rgba(251, 191, 36, 0.1)',
                borderLeft: '3px solid #f59e0b',
                borderRadius: '4px',
                marginBottom: '1rem',
              }}
            >
              <strong
                style={{
                  color: '#f59e0b',
                  display: 'block',
                  marginBottom: '0.25rem',
                }}
              >
                {t('userManagement.emailNotConfigured')}
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#ccc', margin: 0 }}>
                {t('userManagement.setupSmtpDescriptionDismissible')}
              </p>
            </div>
          )}

          {/* Users List */}
          <div style={{ gridColumn: "1 / -1" }}>
              {loading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "#888",
                  }}
                >
                  {t('userManagement.loadingUsers')}
                </div>
              ) : users.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "#888",
                  }}
                >
                  {t('userManagement.noUsersFound')}
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

          {/* New User Invitation Modal */}
          {showNewUserForm && (
            <NewUserModal
              newUser={newUser}
              loading={loading}
              smtpConfigured={smtpConfigured || false}
              onClose={() => {
                setShowNewUserForm(false);
                setNewUser({ email: "", role: "viewer" });
              }}
              onChange={setNewUser}
              onSubmit={handleInviteUser}
            />
          )}
        </div>
    </div>
  );
};

export default UserManagementSection;
