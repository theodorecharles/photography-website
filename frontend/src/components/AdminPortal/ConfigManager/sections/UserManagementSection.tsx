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
  const [currentUser, setCurrentUser] = useState<{ id: number; email: string } | null>(null);
  
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
        if (data.authenticated && data.user) {
          setCurrentUser({ id: data.user.id, email: data.user.email });
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
    if (!confirm('Resend invitation email to this user?')) {
      return;
    }

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
    if (!confirm('This will disable MFA for this user and send them a password reset email. Continue?')) {
      return;
    }

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
        text: data.message || 'MFA reset successfully' 
      });
      
      loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to reset MFA' });
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

    if (!confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
      return;
    }

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
    if (!confirm('Are you sure you want to disable MFA? This will make the account less secure.')) {
      return;
    }

    const password = prompt('Enter your password to confirm:');
    if (!password) return;

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
    if (!confirm('Are you sure you want to remove this passkey?')) {
      return;
    }

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
    <div className="config-group full-width">
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
          {/* SMTP Setup Warning or Invite User Button */}
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
                <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>
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
              {users.map((user) => (
                <div
                  key={user.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    background: user.is_active ? 'white' : '#f9fafb',
                    opacity: user.is_active ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {user.name || user.email}
                        {currentUser && user.id === currentUser.id && (
                          <span style={{ fontSize: '0.75rem', background: 'var(--primary-color)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            You
                          </span>
                        )}
                        {user.status === 'invited' && (
                          <span style={{ fontSize: '0.75rem', background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            ✉️ Invited
                          </span>
                        )}
                        {user.status === 'invite_expired' && (
                          <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            ⏱️ Invite Expired
                          </span>
                        )}
                      </h4>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {user.email}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#ef4444', borderColor: '#dc2626' }}
                        disabled={loading || Boolean(currentUser && user.id === currentUser.id)}
                        title={currentUser && user.id === currentUser.id ? 'Cannot delete your own account' : 'Delete user'}
                        onMouseEnter={(e) => {
                          if (!(currentUser && user.id === currentUser.id) && !loading) {
                            e.currentTarget.style.background = '#dc2626';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ef4444';
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Role & Auth Methods */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            background: user.role === 'admin' ? '#fef3c7' : user.role === 'manager' ? '#dbeafe' : '#f3f4f6',
                            color: user.role === 'admin' ? '#92400e' : user.role === 'manager' ? '#1e40af' : '#374151',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '12px',
                            fontWeight: 600,
                          }}
                        >
                          {user.role === 'admin' ? '👑 Admin' : user.role === 'manager' ? '📝 Manager' : '👁️ Viewer'}
                        </span>
                    {user.auth_methods.map((method) => (
                      <span
                        key={method}
                        style={{
                          fontSize: '0.75rem',
                          background: '#e0f2fe',
                          color: '#0369a1',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '12px',
                        }}
                      >
                        {method === 'google' ? '🔵 Google' : method === 'credentials' ? '🔒 Password' : method === 'passkey' ? '🔑 Passkey' : method}
                      </span>
                    ))}
                    {user.mfa_enabled && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          background: '#dcfce7',
                          color: '#15803d',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '12px',
                        }}
                      >
                        ✓ MFA Enabled
                      </span>
                    )}
                  </div>

                  {/* User Actions */}
                  {currentUser && user.status !== 'invited' && user.status !== 'invite_expired' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
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

                          {/* MFA Toggle */}
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

                          {/* Passkeys */}
                          <button
                            onClick={() => showPasskeys === user.id ? setShowPasskeys(undefined) : handleLoadPasskeys(user.id)}
                            className="btn-secondary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            disabled={loading}
                          >
                            🔑 Passkeys ({user.passkey_count})
                          </button>
                        </>
                      )}
                      
                      {/* Admin Actions for Other Users */}
                      {user.id !== currentUser.id && user.mfa_enabled && (
                        <button
                          onClick={() => handleResetMFA(user.id)}
                          className="btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#fbbf24', borderColor: '#f59e0b' }}
                          disabled={loading}
                          title="Reset MFA and send password reset email"
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
                    </div>
                  )}

                  {/* Password Change Form */}
                  {showPasswordChange === user.id && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '6px' }}>
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
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h5 style={{ margin: 0 }}>Registered Passkeys</h5>
                <button
                  onClick={() => setShowPasskeys(undefined)}
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}
                >
                  ×
                </button>
                      </div>
                      
                      {passkeys.length === 0 ? (
                        <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0.5rem 0' }}>
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
                                padding: '0.5rem',
                                background: 'white',
                                borderRadius: '4px',
                                border: '1px solid #e5e7eb',
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{passkey.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
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
                      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem' }}>
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
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>
                          Note: Passkeys require HTTPS (or localhost) and a compatible device
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
                </div>
              )}
            </div>
          )}

          {/* MFA Setup Modal */}
          {mfaSetup && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
            }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '90vh',
                overflow: 'auto',
              }}>
                <h3 style={{ margin: '0 0 1rem 0' }}>Enable Two-Factor Authentication</h3>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '0 0 1rem 0' }}>
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
                  </p>
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <img src={mfaSetup.qrCode} alt="MFA QR Code" style={{ maxWidth: '250px', border: '2px solid #e5e7eb', borderRadius: '8px' }} />
                  </div>
                  <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'center', fontFamily: 'monospace' }}>
                    {mfaSetup.secret}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Backup Codes</h4>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 0.75rem 0' }}>
                    Save these codes in a safe place. Each can be used once if you lose access to your authenticator.
                  </p>
                  <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                    {mfaSetup.backupCodes.map((code, i) => (
                      <div key={i}>{code}</div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
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

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
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
          )}

          {/* SMTP Setup Wizard Modal */}
          {showSmtpWizard && (
            <SMTPSetupWizard
              onClose={() => setShowSmtpWizard(false)}
              onComplete={() => {
                setShowSmtpWizard(false);
                checkSmtpConfig(); // Refresh SMTP status
                setMessage({ type: 'success', text: 'SMTP configured! You can now invite users.' });
              }}
              setMessage={setMessage}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagementSection;
