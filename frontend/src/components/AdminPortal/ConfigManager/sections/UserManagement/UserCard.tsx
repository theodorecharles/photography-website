import React, { useState, useRef, useEffect } from 'react';
import { PasswordInput } from '../../../PasswordInput';
import { LockIcon } from '../../../../icons';
import type { User, PasswordChangeState } from './types';

interface UserCardProps {
  user: User;
  currentUser: { id: number; email: string; role: string } | null;
  loading: boolean;
  showPasswordChange: number | undefined;
  passwordChange: PasswordChangeState;
  isFirstUser: boolean;
  onResendInvite: (userId: number) => void;
  onDeleteUser: (userId: number) => void;
  onShowPasswordChange: (userId: number | undefined) => void;
  onPasswordChangeUpdate: (change: PasswordChangeState) => void;
  onChangePassword: (userId: number) => void;
  onStartMFASetup: (userId: number) => void;
  onDisableMFA: (userId: number) => void;
  onOpenPasskeys: (userId: number) => void;
  onResetMFA: (userId: number) => void;
  onSendPasswordReset: (userId: number) => void;
  onUpdateRole: (userId: number, role: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  currentUser,
  loading,
  showPasswordChange,
  passwordChange,
  isFirstUser,
  onResendInvite,
  onDeleteUser,
  onShowPasswordChange,
  onPasswordChangeUpdate,
  onChangePassword,
  onStartMFASetup,
  onDisableMFA,
  onOpenPasskeys,
  onResetMFA,
  onSendPasswordReset,
  onUpdateRole,
}) => {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // Debug: Log current user on first render
  if (isFirstUser) {
    console.log('[UserManagement] Rendering users. CurrentUser:', currentUser);
  }

  // Close role dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
      }
    };

    if (showRoleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showRoleDropdown]);

  const handleRoleChange = (newRole: string) => {
    onUpdateRole(user.id, newRole);
    setShowRoleDropdown(false);
  };

  const canEditRole = currentUser && currentUser.role === 'admin' && user.id !== currentUser.id;

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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '0.75rem',
        }}
      >
        <div style={{ flex: 1 }}>
          <h4
            style={{
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              color: '#ffffff',
            }}
          >
            {user.name || user.email}
            {currentUser && user.id === currentUser.id && (
              <span
                style={{
                  fontSize: '0.75rem',
                  background: 'var(--primary-color)',
                  color: '#1a1a1a',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '12px',
                  fontWeight: 600,
                }}
              >
                You
              </span>
            )}
            {user.status === 'invited' && (
              <span
                style={{
                  fontSize: '0.75rem',
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '12px',
                  fontWeight: 600,
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}
              >
                ✉️ Invited
              </span>
            )}
            {user.status === 'invite_expired' && (
              <span
                style={{
                  fontSize: '0.75rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '12px',
                  fontWeight: 600,
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                ⏱️ Invite Expired
              </span>
            )}
          </h4>
          <div
            style={{
              fontSize: '0.85rem',
              color: '#9ca3af',
              marginTop: '0.25rem',
            }}
          >
            {user.email}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexShrink: 0,
          }}
        >
          {/* Admin-only actions: Resend Invite and Delete */}
          {currentUser && currentUser.role === 'admin' && (
            <>
              {user.status === 'invite_expired' && (
                <button
                  onClick={() => onResendInvite(user.id)}
                  className="btn-primary"
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                  }}
                  disabled={loading}
                  title="Resend invitation email"
                >
                  Resend Invite
                </button>
              )}
              <button
                onClick={() => onDeleteUser(user.id)}
                className="btn-secondary"
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.85rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  opacity: loading || Boolean(currentUser && user.id === currentUser.id) ? 0.4 : 1,
                  cursor: loading || Boolean(currentUser && user.id === currentUser.id) ? 'not-allowed' : 'pointer',
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
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}
      >
        <div style={{ position: 'relative', zIndex: showRoleDropdown ? 1001 : 'auto' }} ref={roleDropdownRef}>
          <span
            onClick={() => canEditRole && setShowRoleDropdown(!showRoleDropdown)}
            style={{
              fontSize: '0.75rem',
              background:
                user.role === 'admin'
                  ? 'rgba(251, 191, 36, 0.2)'
                  : user.role === 'manager'
                  ? 'rgba(59, 130, 246, 0.2)'
                  : 'rgba(156, 163, 175, 0.2)',
              color: user.role === 'admin' ? '#fbbf24' : user.role === 'manager' ? '#60a5fa' : '#9ca3af',
              padding: '0.25rem 0.6rem',
              borderRadius: '12px',
              fontWeight: 600,
              border:
                user.role === 'admin'
                  ? '1px solid rgba(251, 191, 36, 0.3)'
                  : user.role === 'manager'
                  ? '1px solid rgba(59, 130, 246, 0.3)'
                  : '1px solid rgba(156, 163, 175, 0.3)',
              cursor: canEditRole ? 'pointer' : 'default',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (canEditRole) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (canEditRole) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
            title={canEditRole ? 'Click to change role' : undefined}
          >
            {user.role === 'admin' ? '👑 Admin' : user.role === 'manager' ? '📝 Manager' : '👁️ Viewer'}
            {canEditRole && ' ▾'}
          </span>

          {/* Role Dropdown */}
          {showRoleDropdown && canEditRole && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                background: '#2a2a2a',
                border: '1px solid #3a3a3a',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                zIndex: 1002,
                minWidth: '120px',
                overflow: 'hidden',
              }}
            >
              {['admin', 'manager', 'viewer'].map((role) => (
                <div
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    color: user.role === role ? '#4ade80' : '#e5e7eb',
                    background: user.role === role ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (user.role !== role) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (user.role !== role) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {role === 'admin' && '👑 '}
                  {role === 'manager' && '📝 '}
                  {role === 'viewer' && '👁️ '}
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                  {user.role === role && ' ✓'}
                </div>
              ))}
            </div>
          )}
        </div>
        {user.auth_methods.filter((method) => method !== 'passkey').map((method) => (
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
            {method === 'credentials' ? '🔑 Password' : method === 'google' ? '🔐 Google' : method}
          </span>
        ))}
        {user.mfa_enabled && (
          <span
            style={{
              fontSize: '0.75rem',
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#4ade80',
              padding: '0.25rem 0.6rem',
              borderRadius: '12px',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            🛡️ MFA
          </span>
        )}
        {user.passkey_count > 0 && (
          <span
            style={{
              fontSize: '0.75rem',
              background: 'rgba(236, 72, 153, 0.2)',
              color: '#f472b6',
              padding: '0.25rem 0.6rem',
              borderRadius: '12px',
              border: '1px solid rgba(236, 72, 153, 0.3)',
            }}
          >
            🔑 {user.passkey_count} Passkey{user.passkey_count !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* User Actions */}
      {currentUser && user.status !== 'invited' && user.status !== 'invite_expired' && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Own Account Actions */}
          {user.id === currentUser.id && (
            <>
              {/* Change Password */}
              {user.auth_methods.includes('credentials') && showPasswordChange !== user.id && (
                <button
                  onClick={() => onShowPasswordChange(user.id)}
                  className="btn-secondary"
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                  }}
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
                      onClick={() => onStartMFASetup(user.id)}
                      className="btn-primary"
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.85rem',
                      }}
                      disabled={loading}
                    >
                      Enable MFA
                    </button>
                  ) : (
                    <button
                      onClick={() => onDisableMFA(user.id)}
                      className="btn-secondary"
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.85rem',
                      }}
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
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenPasskeys(user.id);
                  }}
                  className="btn-secondary"
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                  }}
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
                  onClick={() => onResetMFA(user.id)}
                  className="btn-secondary"
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                    background: '#fbbf24',
                    borderColor: '#f59e0b',
                  }}
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
                  onClick={() => onSendPasswordReset(user.id)}
                  className="btn-secondary"
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                  }}
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
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <h5 style={{ margin: 0 }}>Change Password</h5>
            <button
              onClick={() => onShowPasswordChange(undefined)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#9ca3af',
              }}
            >
              ×
            </button>
          </div>
          <div className="branding-group">
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
            />
          </div>
          <div className="branding-group">
            <label className="branding-label">New Password</label>
            <PasswordInput
              value={passwordChange.newPassword}
              onChange={(e) =>
                onPasswordChangeUpdate({
                  ...passwordChange,
                  newPassword: e.target.value,
                })
              }
              placeholder="Enter new password (min 8 chars)"
            />
          </div>
          <div className="branding-group">
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
            />
          </div>
          <div className="section-button-group">
            <button
              onClick={() => onShowPasswordChange(undefined)}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button onClick={() => onChangePassword(user.id)} className="btn-primary" disabled={loading}>
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

