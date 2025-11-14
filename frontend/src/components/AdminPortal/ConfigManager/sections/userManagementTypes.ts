/**
 * Type definitions for User Management
 */

export interface User {
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

export interface Passkey {
  id: string;
  name: string;
  created_at: string;
}

export interface MFASetupData {
  userId: number;
  qrCode: string;
  secret: string;
  backupCodes: string[];
  setupToken: string;
}

export interface ConfirmModalState {
  show: boolean;
  title: string;
  message: string;
  confirmText: string;
  onConfirm: (password?: string) => void;
  isDangerous?: boolean;
  requirePassword?: boolean;
}

export interface PasswordChangeState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface NewUserState {
  email: string;
  role: string;
}

