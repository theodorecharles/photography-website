/**
 * User Management Section Component
 * Manages user accounts, MFA, passkeys, and authentication methods
 */

import React, { useState, useEffect } from 'react';
import { PasswordInput } from '../../PasswordInput';
import { LockIcon, TrashIcon } from '../../../icons';
import SectionHeader from '../components/SectionHeader';
import SMTPSetupWizard from '../../SMTPSetupWizard';

const API_URL = import.meta.env.VITE_API_URL || '';

interface User {
  id: number;
  email: string;
  name: string | null;
  role: string;
  auth_methods: string[];
  mfa_enabled: boolean;
  passkey_count: number;
  is_active: boolean;
  status: 'invited' | 'invite_expired' | null;
  created_at: string;
  last_login_at: string | null;
}

interface Passkey {
  id: string;
  name: string;
  created_at: string;
}

interface UserManagementSectionProps {
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

const UserManagementSection: React.FC<UserManagementSectionProps> = ({
  setMessage,
}) => {
  const [showSection, setShowSection] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ id: number; email: string; role: string } | null>(null);
  
  // SMTP configuration check
  const [smtpConfigured, setSmtpConfigured] = useState<boolean>(false);
  const [showSmtpWizard, setShowSmtpWizard] = useState<boolean>(false);
  
  // New user form (invitation)
  const [showNewUserForm, setShowNewUserForm] = useState<boolean>(false);
  const [newUser, setNewUser] = useState({
    email: '',
    role: 'viewer',
  });
  
  // MFA state
  const [mfaSetup, setMfaSetup] = useState<{
    userId: number;
    qrCode: string;
    secret: string;
    backupCodes: string[];
    setupToken: string;
  } | null>(null);
  const [mfaToken, setMfaToken] = useState('');
  
  // Passkey state
  const [showPasskeys, setShowPasskeys] = useState<number | undefined>(undefined);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [passkeyName, setPasskeyName] = useState('');
  
  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState<number | undefined>(undefined);
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
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
    title: '',
    message: '',
    confirmText: 'Confirm',
    onConfirm: () => {},
    isDangerous: false,
    requirePassword: false,
  });
  const [confirmPassword, setConfirmPassword] = useState('');

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

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/status`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        console.log('[UserManagement] Auth status response:', data);
        console.log('[UserManagement] Full user object:', JSON.stringify(data.user, null, 2));
        if (data.authenticated && data.user) {
          const userWithRole = { 
            id: data.user.id, 
            email: data.user.email,
            role: data.user.role || 'viewer'
          };
          console.log('[UserManagement] Setting current user:', userWithRole);
          setCurrentUser(userWithRole);
        }
      }
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/users`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load users');
      
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load users' });
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
        const emailConfig = config.email || {};
        const isConfigured = 
          emailConfig.enabled && 
          emailConfig.smtp?.host && 
          emailConfig.smtp?.auth?.user && 
          emailConfig.smtp?.auth?.pass;
        setSmtpConfigured(Boolean(isConfigured));
      }
    } catch (err) {
      console.error('Failed to check SMTP config:', err);
    }
  };

  const handleInviteUser = async () => {
    if (!newUser.email) {
      setMessage({ type: 'error', text: 'Email is required' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newUser),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send invitation');
      }

      const data = await res.json();
      const message = data.emailSent 
        ? 'Invitation sent successfully' 
        : 'User created but email failed to send';
      
      setMessage({ 
        type: data.emailSent ? 'success' : 'error', 
        text: message 
      });
      
      setShowNewUserForm(false);
      setNewUser({ email: '', role: 'viewer' });
      loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to send invitation' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvite = async (userId: number) => {
    setConfirmModal({
      show: true,
      title: 'Resend Invitation',
      message: 'Resend invitation email to this user?',
      confirmText: 'Resend',
      isDangerous: false,
      onConfirm: () => {
        setConfirmModal({ ...confirmModal, show: false });
        performResendInvite(userId);
      },
    });
  };

  const performResendInvite = async (userId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/invite/resend/${userId}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to resend invitation');
      }

      const data = await res.json();
      const message = data.emailSent 
        ? 'Invitation resent successfully' 
        : 'Invitation updated but email failed to send';
      
      setMessage({ 
        type: data.emailSent ? 'success' : 'error', 
        text: message 
      });
      
      loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to resend invitation' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetMFA = async (userId: number) => {
    setConfirmModal({
      show: true,
      title: 'Reset MFA',
      message: 'This will disable MFA for this user. They will be able to log in with just their password. Continue?',
      confirmText: 'Disable MFA',
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
      const res = await fetch(`${API_URL}/api/auth-extended/users/${userId}/reset-mfa`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset MFA');
      }

      const data = await res.json();
      setMessage({ 
        type: 'success', 
        text: data.message || 'MFA disabled successfully' 
      });
      
      loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to reset MFA' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendPasswordReset = async (userId: number) => {
    setConfirmModal({
      show: true,
      title: 'Send Password Reset',
      message: 'This will send a password reset email to this user. They will have 1 hour to use the link. Continue?',
      confirmText: 'Send Reset Email',
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
      const res = await fetch(`${API_URL}/api/auth-extended/users/${userId}/send-password-reset`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send password reset email');
      }

      const data = await res.json();
      setMessage({ 
        type: 'success', 
        text: data.message || 'Password reset email sent successfully' 
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to send password reset email' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    // Prevent deleting yourself
    if (currentUser && userId === currentUser.id) {
      setMessage({ type: 'error', text: 'Cannot delete your own account' });
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Delete User',
      message: 'Are you sure you want to permanently delete this user? This action cannot be undone.',
      confirmText: 'Delete User',
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
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to delete user');

      setMessage({
        type: 'success',
        text: 'User deleted successfully',
      });
      loadUsers();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete user' });
    } finally {
      setLoading(false);
    }
  };

  // MFA Management
  const handleStartMFASetup = async (_userId: number): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/mfa/setup`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to start MFA setup');

      const data = await res.json();
      setMfaSetup({
        userId: _userId,
        qrCode: data.qrCode,
        secret: data.secret,
        backupCodes: data.backupCodes,
        setupToken: data.setupToken,
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to start MFA setup' });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMFASetup = async () => {
    if (!mfaSetup || mfaToken.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit code' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/mfa/verify-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          setupToken: mfaSetup.setupToken,
          token: mfaToken,
          backupCodes: mfaSetup.backupCodes,
        }),
      });

      if (!res.ok) throw new Error('Invalid verification code');

      setMessage({ type: 'success', text: 'MFA enabled successfully' });
      setMfaSetup(null);
      setMfaToken('');
      loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async (_userId: number): Promise<void> => {
    setConfirmModal({
      show: true,
      title: 'Disable MFA',
      message: 'Are you sure you want to disable MFA? This will make the account less secure.',
      confirmText: 'Disable MFA',
      isDangerous: true,
      requirePassword: true,
      onConfirm: (password) => {
        if (!password) return;
        setConfirmModal({ ...confirmModal, show: false });
        setConfirmPassword('');
        performDisableMFA(password);
      },
    });
  };

  const performDisableMFA = async (password: string): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/mfa/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      if (!res.ok) throw new Error('Failed to disable MFA');

      setMessage({ type: 'success', text: 'MFA disabled successfully' });
      loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Passkey Management
  const handleLoadPasskeys = async (userId: number): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/passkey/list`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to load passkeys');

      const data = await res.json();
      setPasskeys(data.passkeys || []);
      setShowPasskeys(userId);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load passkeys' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPasskey = async (userId: number): Promise<void> => {
    if (!passkeyName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a name for this passkey' });
      return;
    }

    setLoading(true);
    try {
      // Get registration options
      const optionsRes = await fetch(`${API_URL}/api/auth-extended/passkey/register-options`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!optionsRes.ok) throw new Error('Failed to get registration options');

      const options = await optionsRes.json();

      // Start WebAuthn registration
      const { startRegistration } = await import('@simplewebauthn/browser');
      const credential = await startRegistration(options);

      // Verify registration
      const verifyRes = await fetch(`${API_URL}/api/auth-extended/passkey/register-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential, name: passkeyName }),
      });

      if (!verifyRes.ok) throw new Error('Passkey registration failed');

      setMessage({ type: 'success', text: 'Passkey registered successfully' });
      setPasskeyName('');
      handleLoadPasskeys(userId);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setMessage({ type: 'error', text: 'Passkey registration cancelled' });
      } else {
        setMessage({ type: 'error', text: err.message || 'Passkey registration failed' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePasskey = async (passkeyId: string) => {
    setConfirmModal({
      show: true,
      title: 'Remove Passkey',
      message: 'Are you sure you want to remove this passkey?',
      confirmText: 'Remove',
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
      const res = await fetch(`${API_URL}/api/auth-extended/passkey/${passkeyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to remove passkey');

      setMessage({ type: 'success', text: 'Passkey removed successfully' });
      if (showPasskeys) {
        handleLoadPasskeys(showPasskeys);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to remove passkey' });
    } finally {
      setLoading(false);
    }
  };

  // Password Change
  const handleChangePassword = async (_userId: number): Promise<void> => {
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (passwordChange.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-extended/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordChange.currentPassword,
          newPassword: passwordChange.newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change password');
      }

      setMessage({ type: 'success', text: 'Password changed successfully' });
      setShowPasswordChange(undefined);
      setPasswordChange({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="config-group full-width" data-section="user-management">
      <SectionHeader
        title="Users"
        description="Manage user accounts, authentication methods, and security settings"
        isExpanded={showSection}
        onToggle={() => setShowSection(!showSection)}
      />

      <div
        className={`collapsible-content ${showSection ? "expanded" : "collapsed"}`}
        style={{
          maxHeight: showSection ? "10000px" : "0",
        }}
      >
        <div className="branding-grid">
          {/* SMTP Setup Warning or Invite User Button - Admin Only */}
          {currentUser && currentUser.role === 'admin' && (
            <div style={{ gridColumn: '1 / -1', marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
              {!smtpConfigured && (
                <div
                  style={{
                    flex: 1,
                    padding: '1rem',
                    background: 'rgba(251, 191, 36, 0.1)',
                    borderLeft: '3px solid #f59e0b',
                    borderRadius: '4px',
                  }}
                >
                  <strong style={{ color: '#f59e0b', display: 'block', marginBottom: '0.25rem' }}>
                    ⚠️ Email Not Configured
                  </strong>
                  <p style={{ fontSize: '0.85rem', color: '#ccc', margin: 0 }}>
                    Set up SMTP to send user invitation and password reset emails.
                  </p>
                </div>
              )}
              <button
                onClick={() => {
                  if (smtpConfigured) {
                    setShowNewUserForm(!showNewUserForm);
                  } else {
                    setShowSmtpWizard(true);
                  }
                }}
                className="btn-primary"
                style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}
              >
                {!smtpConfigured ? '📧 Set up SMTP' : showNewUserForm ? 'Cancel' : '+ Invite User'}
              </button>
            </div>
          )}

          {/* New User Form (Invitation) */}
          {showNewUserForm && (
            <>
              <div className="branding-group">
                <label className="branding-label">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="branding-input"
                  placeholder="user@example.com"
                />
                <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: '0.5rem 0 0 0' }}>
                  An invitation email will be sent to this address. The user will set up their name, password, and MFA.
                </p>
              </div>
              <div className="branding-group">
                <label className="branding-label">Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="branding-input"
                >
                  <option value="viewer">Viewer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="section-button-group">
                <button
                  onClick={() => setShowNewUserForm(false)}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteUser}
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </>
          )}

          {/* Users List */}
          {!showNewUserForm && (
            <div style={{ gridColumn: '1 / -1' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                  Loading users...
                </div>
              ) : users.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                  No users found
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {users.map((user) => {
                // Debug: Check currentUser when rendering each user card
                if (user.id === users[0].id) { // Only log once for first user
                  console.log('[UserManagement] Rendering users. CurrentUser:', currentUser);
                }
                return (
                <div
                  key={user.id}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    opacity: user.is_active ? 1 : 0.6,
                    transition: 'border-color 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (user.is_active) {
                      e.currentTarget.style.borderColor = 'rgba(74, 222, 128, 0.3)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', color: '#ffffff' }}>
                        {user.name || user.email}
                        {currentUser && user.id === currentUser.id && (
                          <span style={{ fontSize: '0.75rem', background: 'var(--primary-color)', color: '#1a1a1a', padding: '0.25rem 0.6rem', borderRadius: '12px', fontWeight: 600 }}>
                            You
                          </span>
                        )}
                        {user.status === 'invited' && (
                          <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '0.25rem 0.6rem', borderRadius: '12px', fontWeight: 600, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                            ✉️ Invited
                          </span>
                        )}
                        {user.status === 'invite_expired' && (
                          <span style={{ fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '0.25rem 0.6rem', borderRadius: '12px', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            ⏱️ Invite Expired
                          </span>
                        )}
                      </h4>
                      <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                        {user.email}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      {/* Admin-only actions: Resend Invite and Delete */}
                      {currentUser && currentUser.role === 'admin' && (
                        <>
                          {user.status === 'invite_expired' && (
                            <button
                              onClick={() => handleResendInvite(user.id)}
                              className="btn-primary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                              disabled={loading}
                              title="Resend invitation email"
                            >
                              Resend Invite
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="btn-secondary"
                            style={{ 
                              padding: '0.4rem 0.8rem', 
                              fontSize: '0.85rem', 
                              background: 'rgba(239, 68, 68, 0.2)', 
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              color: '#ef4444',
                              opacity: (loading || Boolean(currentUser && user.id === currentUser.id)) ? 0.4 : 1,
                              cursor: (loading || Boolean(currentUser && user.id === currentUser.id)) ? 'not-allowed' : 'pointer'
                            }}
                            disabled={loading || Boolean(currentUser && user.id === currentUser.id)}
                            title={currentUser && user.id === currentUser.id ? 'Cannot delete your own account' : 'Delete user'}
                            onMouseEnter={(e) => {
                              if (!(currentUser && user.id === currentUser.id) && !loading) {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!(currentUser && user.id === currentUser.id) && !loading) {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                              }
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Role & Auth Methods */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            background: user.role === 'admin' ? 'rgba(251, 191, 36, 0.2)' : user.role === 'manager' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                            color: user.role === 'admin' ? '#fbbf24' : user.role === 'manager' ? '#60a5fa' : '#9ca3af',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '12px',
                            fontWeight: 600,
                            border: user.role === 'admin' ? '1px solid rgba(251, 191, 36, 0.3)' : user.role === 'manager' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(156, 163, 175, 0.3)',
                          }}
                        >
                          {user.role === 'admin' ? '👑 Admin' : user.role === 'manager' ? '📝 Manager' : '👁️ Viewer'}
                        </span>
                    {user.auth_methods.map((method) => (
                      <span
                        key={method}
                        style={{
                          fontSize: '0.75rem',
                          background: 'rgba(139, 92, 246, 0.2)',
                          color: '#a78bfa',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                        }}
                      >
                        {method === 'google' ? '🔵 Google' : method === 'credentials' ? '🔒 Password' : method === 'passkey' ? '🔑 Passkey' : method}
                      </span>
                    ))}
                    {user.mfa_enabled && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          background: 'rgba(74, 222, 128, 0.2)',
                          color: 'var(--primary-color)',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(74, 222, 128, 0.3)',
                        }}
                      >
                        ✓ MFA Enabled
                      </span>
                    )}
                  </div>

                  {/* User Actions */}
                  {currentUser && user.status !== 'invited' && user.status !== 'invite_expired' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      {/* Own Account Actions */}
                      {user.id === currentUser.id && (
                        <>
                          {/* Change Password */}
                          {user.auth_methods.includes('credentials') && showPasswordChange !== user.id && (
                            <button
                              onClick={() => setShowPasswordChange(user.id)}
                              className="btn-secondary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            >
                              <LockIcon width={14} height={14} />
                              Change Password
                            </button>
                          )}

                          {/* MFA Toggle - Only show for non-Google users */}
                          {user.auth_methods.includes('credentials') && !user.auth_methods.includes('google') && (
                            <>
                              {!user.mfa_enabled ? (
                                <button
                                  onClick={() => handleStartMFASetup(user.id)}
                                  className="btn-primary"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                  disabled={loading}
                                >
                                  Enable MFA
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDisableMFA(user.id)}
                                  className="btn-secondary"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                  disabled={loading}
                                >
                                  Disable MFA
                                </button>
                              )}
                            </>
                          )}

                          {/* Passkeys - Only show for non-Google users */}
                          {user.auth_methods.includes('credentials') && !user.auth_methods.includes('google') && (
                            <button
                              onClick={() => showPasskeys === user.id ? setShowPasskeys(undefined) : handleLoadPasskeys(user.id)}
                              className="btn-secondary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                              disabled={loading}
                            >
                              🔑 Passkeys ({user.passkey_count})
                            </button>
                          )}
                        </>
                      )}
                      
                      {/* Admin Actions for Other Users */}
                      {user.id !== currentUser.id && (
                        <>
                          {/* Reset MFA button - only for users with MFA enabled */}
                          {user.mfa_enabled && (
                            <button
                              onClick={() => handleResetMFA(user.id)}
                              className="btn-secondary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#fbbf24', borderColor: '#f59e0b' }}
                              disabled={loading}
                              title="Disable MFA for this user"
                              onMouseEnter={(e) => {
                                if (!loading) {
                                  e.currentTarget.style.background = '#f59e0b';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#fbbf24';
                              }}
                            >
                              Reset MFA
                            </button>
                          )}

                          {/* Send Password Reset button - only for users with credentials auth */}
                          {user.auth_methods.includes('credentials') && (
                            <button
                              onClick={() => handleSendPasswordReset(user.id)}
                              className="btn-secondary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                              disabled={loading}
                              title="Send password reset email to this user"
                            >
                              Send Password Reset
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Password Change Form */}
                  {showPasswordChange === user.id && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px' }}>
                      <h5 style={{ margin: '0 0 0.75rem 0' }}>Change Password</h5>
                      <div style={{ display: 'grid', gap: '0.75rem' }}>
                        <div className="branding-group">
                          <label className="branding-label">Current Password</label>
                          <PasswordInput
                            value={passwordChange.currentPassword}
                            onChange={(e) => setPasswordChange({ ...passwordChange, currentPassword: e.target.value })}
                          />
                        </div>
                        <div className="branding-group">
                          <label className="branding-label">New Password</label>
                          <PasswordInput
                            value={passwordChange.newPassword}
                            onChange={(e) => setPasswordChange({ ...passwordChange, newPassword: e.target.value })}
                          />
                        </div>
                        <div className="branding-group">
                          <label className="branding-label">Confirm New Password</label>
                          <PasswordInput
                            value={passwordChange.confirmPassword}
                            onChange={(e) => setPasswordChange({ ...passwordChange, confirmPassword: e.target.value })}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                          onClick={() => {
                            setShowPasswordChange(undefined);
                            setPasswordChange({ currentPassword: '', newPassword: '', confirmPassword: '' });
                          }}
                            className="btn-secondary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleChangePassword(user.id)}
                            className="btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            disabled={loading}
                          >
                            {loading ? 'Changing...' : 'Change Password'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Passkeys List */}
                  {showPasskeys === user.id && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h5 style={{ margin: 0 }}>Registered Passkeys</h5>
                <button
                  onClick={() => setShowPasskeys(undefined)}
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#9ca3af' }}
                >
                  ×
                </button>
                      </div>
                      
                      {passkeys.length === 0 ? (
                        <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: '0.5rem 0' }}>
                          No passkeys registered yet
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
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
                                <div style={{ fontWeight: 500, fontSize: '0.9rem', color: '#e5e7eb' }}>{passkey.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                  Added {new Date(passkey.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemovePasskey(passkey.id)}
                                className="btn-secondary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                disabled={loading}
                              >
                                <TrashIcon width={12} height={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Register New Passkey */}
                      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="text"
                            value={passkeyName}
                            onChange={(e) => setPasskeyName(e.target.value)}
                            placeholder="Passkey name (e.g., MacBook Touch ID)"
                            className="branding-input"
                            style={{ flex: 1 }}
                          />
                          <button
                            onClick={() => handleRegisterPasskey(user.id)}
                            className="btn-primary"
                            style={{ padding: '0.5rem 1rem' }}
                            disabled={loading || !passkeyName.trim()}
                          >
                            {loading ? 'Registering...' : '+ Register'}
                          </button>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.5rem 0 0 0' }}>
                          Note: Passkeys require HTTPS (or localhost) and a compatible device
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
                </div>
              )}
            </div>
          )}

          {/* MFA Setup Modal */}
          {mfaSetup && (
            <div className="modal-overlay">
              <div className="share-modal" style={{ maxWidth: '550px' }}>
                <div className="share-modal-header">
                  <h2>Enable Two-Factor Authentication</h2>
                  <button 
                    className="close-button" 
                    onClick={() => {
                      setMfaSetup(null);
                      setMfaToken('');
                    }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="share-modal-content">
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <p className="share-description">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
                  </p>
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <img src={mfaSetup.qrCode} alt="MFA QR Code" style={{ maxWidth: '250px', border: '2px solid #3a3a3a', borderRadius: '8px', background: 'white', padding: '0.5rem' }} />
                  </div>
                  <div style={{ background: '#1e1e1e', border: '1px solid #3a3a3a', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'center', fontFamily: 'monospace', color: '#e5e7eb', letterSpacing: '0.05em' }}>
                    {mfaSetup.secret}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#e5e7eb', fontWeight: 600 }}>Backup Codes</h4>
                  <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: '0 0 0.75rem 0', lineHeight: 1.5 }}>
                    Save these codes in a safe place. Each can be used once if you lose access to your authenticator.
                  </p>
                  <div style={{ background: '#1e1e1e', border: '1px solid #3a3a3a', padding: '1rem', borderRadius: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', fontFamily: 'monospace', color: '#d1d5db' }}>
                    {mfaSetup.backupCodes.map((code, i) => (
                      <div key={i} style={{ padding: '0.25rem' }}>{code}</div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="branding-label">Enter verification code from your app</label>
                  <input
                    type="text"
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="branding-input"
                    maxLength={6}
                    style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #3a3a3a' }}>
                  <button
                    onClick={() => {
                      setMfaSetup(null);
                      setMfaToken('');
                    }}
                    className="btn-secondary"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCompleteMFASetup}
                    className="btn-primary"
                    disabled={loading || mfaToken.length !== 6}
                  >
                    {loading ? 'Verifying...' : 'Enable MFA'}
                  </button>
                </div>
                </div>
              </div>
            </div>
          )}

          {/* SMTP Setup Wizard Modal */}
          {showSmtpWizard && (
            <SMTPSetupWizard
              onClose={() => setShowSmtpWizard(false)}
              onComplete={() => {
                setShowSmtpWizard(false);
                // Wait a moment for config to be written, then refresh
                setTimeout(() => {
                  checkSmtpConfig();
                }, 500);
                setMessage({ type: 'success', text: 'SMTP configured! You can now invite users.' });
              }}
              setMessage={setMessage}
            />
          )}

          {/* Confirmation Modal */}
          {confirmModal.show && (
            <div className="modal-overlay" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
              <div className="share-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="share-modal-header">
                  <h2>{confirmModal.title}</h2>
                  <button 
                    className="close-button" 
                    onClick={() => {
                      setConfirmModal({ ...confirmModal, show: false });
                      setConfirmPassword('');
                    }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="share-modal-content">
                  <p className="share-description">
                    {confirmModal.message}
                  </p>

                  {confirmModal.requirePassword && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label className="branding-label">Password</label>
                      <PasswordInput
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Enter your password to confirm"
                        required
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #3a3a3a' }}>
                    <button
                      onClick={() => {
                        setConfirmModal({ ...confirmModal, show: false });
                        setConfirmPassword('');
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        confirmModal.onConfirm(confirmPassword || undefined);
                        setConfirmPassword('');
                      }}
                      className={confirmModal.isDangerous ? 'btn-secondary' : 'btn-primary'}
                      style={confirmModal.isDangerous ? {
                        background: 'rgba(239, 68, 68, 0.2)',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        color: '#ef4444'
                      } : {}}
                      disabled={confirmModal.requirePassword && !confirmPassword}
                    >
                      {confirmModal.confirmText}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagementSection;
