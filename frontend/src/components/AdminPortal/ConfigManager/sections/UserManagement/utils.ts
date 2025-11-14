import type { NewUserState } from './types';

const API_URL = import.meta.env.VITE_API_URL || '';

export const userManagementAPI = {
  async fetchCurrentUser() {
    const res = await fetch(`${API_URL}/api/auth/status`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      console.log('[UserManagement] Auth status response:', data);
      if (data.authenticated && data.user) {
        console.log('[UserManagement] Setting current user:', {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
        });
        return {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
        };
      }
    }
    return null;
  },

  async loadUsers() {
    const res = await fetch(`${API_URL}/api/auth-extended/users`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to load users');
    const data = await res.json();
    return data.users || [];
  },

  async checkSmtpConfig() {
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
      return Boolean(isConfigured);
    }
    return false;
  },

  async inviteUser(newUser: NewUserState) {
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

    return await res.json();
  },

  async resendInvite(userId: number) {
    const res = await fetch(`${API_URL}/api/auth-extended/invite/resend/${userId}`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to resend invitation');
    }

    return await res.json();
  },

  async resetMFA(userId: number) {
    const res = await fetch(`${API_URL}/api/auth-extended/users/${userId}/reset-mfa`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to reset MFA');
    }

    return await res.json();
  },

  async sendPasswordReset(userId: number) {
    const res = await fetch(`${API_URL}/api/auth-extended/users/${userId}/send-password-reset`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to send password reset email');
    }

    return await res.json();
  },

  async deleteUser(userId: number) {
    const res = await fetch(`${API_URL}/api/auth-extended/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) throw new Error('Failed to delete user');
  },

  async startMFASetup() {
    const res = await fetch(`${API_URL}/api/auth-extended/mfa/setup`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) throw new Error('Failed to start MFA setup');

    return await res.json();
  },

  async completeMFASetup(setupToken: string, token: string, backupCodes: string[]) {
    const res = await fetch(`${API_URL}/api/auth-extended/mfa/verify-setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        setupToken,
        token,
        backupCodes,
      }),
    });

    if (!res.ok) throw new Error('Invalid verification code');
  },

  async disableMFA(password: string) {
    const res = await fetch(`${API_URL}/api/auth-extended/mfa/disable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });

    if (!res.ok) throw new Error('Failed to disable MFA');
  },

  async loadPasskeys() {
    const res = await fetch(`${API_URL}/api/auth-extended/passkey/list`, {
      credentials: 'include',
    });

    if (!res.ok) throw new Error('Failed to load passkeys');

    const data = await res.json();
    return data.passkeys || [];
  },

  async registerPasskey(name: string) {
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
      body: JSON.stringify({ credential, name }),
    });

    if (!verifyRes.ok) throw new Error('Passkey registration failed');
  },

  async removePasskey(passkeyId: string) {
    const res = await fetch(`${API_URL}/api/auth-extended/passkey/${passkeyId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) throw new Error('Failed to remove passkey');
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const res = await fetch(`${API_URL}/api/auth-extended/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to change password');
    }
  },
};

