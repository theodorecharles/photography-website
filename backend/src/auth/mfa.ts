/**
 * Multi-Factor Authentication (MFA) Module
 * Handles TOTP generation and verification
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import config from '../config.js';

/**
 * Generate TOTP secret for user
 */
export function generateTOTPSecret(userEmail: string): {
  secret: string;
  otpauth_url: string;
} {
  const siteName = config.branding?.siteName || 'Photography Portfolio';
  
  const secret = speakeasy.generateSecret({
    name: `${siteName} (${userEmail})`,
    issuer: siteName,
    length: 32,
  });

  return {
    secret: secret.base32!,
    otpauth_url: secret.otpauth_url!,
  };
}

/**
 * Generate QR code as data URL for TOTP setup
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  return await QRCode.toDataURL(otpauthUrl);
}

/**
 * Verify TOTP token
 */
export function verifyTOTP(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2, // Allow 2 time steps before/after (60 seconds window)
  });
}

/**
 * Generate backup codes (one-time use codes)
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  
  return codes;
}

/**
 * Check if MFA is required based on rate limiting
 */
export function shouldRequireMFA(failedAttempts: number, maxAttempts: number = 5): boolean {
  return failedAttempts >= maxAttempts;
}
