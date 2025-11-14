/**
 * Extended Authentication Routes
 * Handles MFA setup, passkey registration, and user management
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../auth/middleware.js';
import {
  getUserById,
  updateUser,
  updatePassword,
  enableMFA,
  disableMFA,
  addPasskey,
  removePasskey,
  updatePasskeyCounter,
  getPasskeyByCredentialId,
  verifyPassword,
  verifyBackupCode,
  createUser,
  getUserByEmail,
  getAllUsers,
  deleteUser,
  createInvitedUser,
  getUserByInviteToken,
  completeInvitation,
  setPasswordResetToken,
  getUserByPasswordResetToken,
  clearPasswordResetToken,
  resendInvitation,
  type User,
} from '../database-users.js';
import {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTP,
  generateBackupCodes,
} from '../auth/mfa.js';
import {
  generatePasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  generatePasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
} from '../auth/passkeys.js';
import crypto from 'crypto';
import { sendInvitationEmail, sendPasswordResetEmail } from '../email.js';

const router = Router();

/**
 * Helper to get user ID from either Passport session or credential session
 */
function getUserIdFromRequest(req: Request): number | null {
  // Check credential session first (has database ID directly)
  if ((req.session as any)?.userId) {
    return parseInt((req.session as any).userId);
  }
  
  // Check Passport session (Google OAuth) - need to look up by email
  if (req.user && (req.user as any).email) {
    const email = (req.user as any).email;
    const user = getUserByEmail(email);
    return user ? user.id : null;
  }
  
  return null;
}

// Store temporary challenges in memory (in production, use Redis or session store)
const challenges = new Map<string, { challenge: string; userId?: number; user?: User; expires: number }>();

// Clean up expired challenges every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of challenges.entries()) {
    if (value.expires < now) {
      challenges.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Login with email/password (with optional MFA)
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, mfaToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    // Find user by email
    const user = getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    // Verify password
    if (!verifyPassword(user, password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if MFA is enabled
    if (user.mfa_enabled) {
      if (!mfaToken) {
        // Store user in temporary challenge for MFA verification
        const sessionId = crypto.randomUUID();
        challenges.set(`mfa-login-${sessionId}`, {
          challenge: sessionId,
          userId: user.id,
          user: user,
          expires: Date.now() + 5 * 60 * 1000, // 5 minutes
        });
        
        return res.status(401).json({ 
          requiresMFA: true,
          sessionId,
          message: 'MFA verification required'
        });
      }

      // Verify MFA token
      const ipAddress = req.ip || 'unknown';
      
      if (!user.totp_secret || !verifyTOTP(user.totp_secret, mfaToken)) {
        // Try backup code
        if (!verifyBackupCode(user, mfaToken)) {
          return res.status(401).json({ error: 'Invalid MFA token' });
        }
      }
    }

    // Login successful - create session
    (req.session as any).userId = user.id;
    (req.session as any).user = {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      role: user.role,
      mfa_enabled: user.mfa_enabled,
      passkey_enabled: user.passkeys && user.passkeys.length > 0,
      auth_methods: user.auth_methods,
    };

    console.log('[Login] Creating session for user:', {
      userId: user.id,
      email: user.email,
      role: user.role,
      mfa_enabled: user.mfa_enabled,
      sessionID: req.sessionID,
    });

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('[Login] Session save error:', err);
        return res.status(500).json({ error: 'Session creation failed' });
      }

      console.log('[Login] ✅ Session saved successfully:', {
        sessionID: req.sessionID,
        userId: (req.session as any).userId,
      });

      res.json({
        success: true,
        user: {
          id: user!.id,
          email: user!.email,
          name: user!.name,
          picture: user!.picture,
        },
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Invite new user (admin only)
 * Sends invitation email, user must complete signup
 */
router.post('/invite', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user already exists
    if (getUserByEmail(email)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Determine role - only admins can create other admins
    let userRole = 'viewer'; // Default role
    const creatorUserId = getUserIdFromRequest(req);
    
    if (creatorUserId) {
      const creator = getUserById(creatorUserId);
      
      if (creator && creator.role === 'admin') {
        // Admin can set any role
        if (role === 'admin') {
          userRole = 'admin';
        } else if (role === 'manager') {
          userRole = 'manager';
        } else {
          userRole = 'viewer';
        }
      } else {
        // Non-admin can only create viewers
        userRole = 'viewer';
      }
    }

    // Generate invite token (secure random string)
    const inviteToken = crypto.randomBytes(32).toString('hex');
    
    // Set expiry to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invited user
    const user = createInvitedUser({
      email,
      role: userRole,
      invite_token: inviteToken,
      invite_expires_at: expiresAt.toISOString(),
    });

    // Get inviter name for email
    const inviter = creatorUserId ? getUserById(creatorUserId) : null;
    const inviterName = inviter?.name || 'Administrator';

    // Send invitation email
    const emailSent = await sendInvitationEmail(email, inviteToken, inviterName);

    if (!emailSent) {
      console.warn('[Invite] Failed to send invitation email, but user created');
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      emailSent,
    });
  } catch (error) {
    console.error('Invitation error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

/**
 * Resend invitation (admin only)
 */
router.post('/invite/resend/:userId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status !== 'invite_expired' && user.status !== 'invited') {
      return res.status(400).json({ error: 'User has already completed signup' });
    }

    // Generate new invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    
    // Set expiry to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update user with new token
    resendInvitation(userId, inviteToken, expiresAt.toISOString());

    // Get inviter name for email
    const creatorUserId = getUserIdFromRequest(req);
    const inviter = creatorUserId ? getUserById(creatorUserId) : null;
    const inviterName = inviter?.name || 'Administrator';

    // Send invitation email
    const emailSent = await sendInvitationEmail(user.email, inviteToken, inviterName);

    res.json({
      success: true,
      emailSent,
    });
  } catch (error) {
    console.error('Resend invitation error:', error);
    res.status(500).json({ error: 'Failed to resend invitation' });
  }
});

/**
 * Validate invite token
 */
router.get('/invite/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const user = getUserByInviteToken(token);

    if (!user) {
      return res.status(404).json({ error: 'Invalid invitation link' });
    }

    // Check if invitation has expired
    if (user.invite_expires_at) {
      const expiresAt = new Date(user.invite_expires_at);
      if (expiresAt < new Date()) {
        return res.status(400).json({ error: 'Invitation has expired' });
      }
    }

    // Check if user has already completed signup
    if (user.status === 'active') {
      return res.status(400).json({ error: 'Invitation already used' });
    }

    res.json({
      valid: true,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error('Validate invite error:', error);
    res.status(500).json({ error: 'Failed to validate invitation' });
  }
});

/**
 * Complete user signup from invitation
 */
router.post('/invite/:token/complete', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { name, password, totpToken, setupToken } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password are required' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = getUserByInviteToken(token);

    if (!user) {
      return res.status(404).json({ error: 'Invalid invitation link' });
    }

    // Check if invitation has expired
    if (user.invite_expires_at) {
      const expiresAt = new Date(user.invite_expires_at);
      if (expiresAt < new Date()) {
        return res.status(400).json({ error: 'Invitation has expired' });
      }
    }

    // Check if user has already completed signup
    if (user.status === 'active') {
      return res.status(400).json({ error: 'Invitation already used' });
    }

    // Complete the invitation (set name, password, mark as active)
    completeInvitation(user.id, { name, password });

    // If MFA setup was requested, enable it
    if (totpToken && setupToken) {
      const setup = challenges.get(`mfa-setup-${setupToken}`);
      if (setup && setup.userId === user.id && setup.expires > Date.now()) {
        // Verify TOTP token (from MFA setup during signup)
        // Note: This allows optional MFA setup during signup
        const { backupCodes } = req.body;
        if (backupCodes) {
          enableMFA(user.id, setup.challenge, backupCodes);
          challenges.delete(`mfa-setup-${setupToken}`);
        }
      }
    }

    // Get updated user
    const updatedUser = getUserById(user.id);

    res.json({
      success: true,
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        name: updatedUser!.name,
        role: updatedUser!.role,
      },
    });
  } catch (error) {
    console.error('Complete signup error:', error);
    res.status(500).json({ error: 'Failed to complete signup' });
  }
});

/**
 * Request password reset (public endpoint)
 */
router.post('/password-reset/request', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = getUserByEmail(email);

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      return res.json({ success: true, message: 'If the email exists, a password reset link has been sent' });
    }

    // Only allow password reset if user doesn't have MFA enabled
    if (user.mfa_enabled) {
      return res.status(400).json({ 
        error: 'Password reset not available for accounts with MFA enabled. Contact an administrator for assistance.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set expiry to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Save reset token
    setPasswordResetToken(user.id, resetToken, expiresAt.toISOString());

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(user.email, resetToken, user.name);

    if (!emailSent) {
      console.error('[Password Reset] Failed to send email');
      return res.status(500).json({ error: 'Failed to send password reset email' });
    }

    res.json({ 
      success: true, 
      message: 'If the email exists, a password reset link has been sent' 
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

/**
 * Validate password reset token
 */
router.get('/password-reset/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const user = getUserByPasswordResetToken(token);

    if (!user) {
      return res.status(404).json({ error: 'Invalid password reset link' });
    }

    // Check if reset token has expired
    if (user.password_reset_expires_at) {
      const expiresAt = new Date(user.password_reset_expires_at);
      if (expiresAt < new Date()) {
        return res.status(400).json({ error: 'Password reset link has expired' });
      }
    }

    res.json({
      valid: true,
      email: user.email,
    });
  } catch (error) {
    console.error('Validate password reset error:', error);
    res.status(500).json({ error: 'Failed to validate password reset link' });
  }
});

/**
 * Complete password reset
 */
router.post('/password-reset/:token/complete', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = getUserByPasswordResetToken(token);

    if (!user) {
      return res.status(404).json({ error: 'Invalid password reset link' });
    }

    // Check if reset token has expired
    if (user.password_reset_expires_at) {
      const expiresAt = new Date(user.password_reset_expires_at);
      if (expiresAt < new Date()) {
        return res.status(400).json({ error: 'Password reset link has expired' });
      }
    }

    // Update password
    updatePassword(user.id, password);
    
    // Clear reset token
    clearPasswordResetToken(user.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Complete password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * Admin: Reset user's MFA (disable MFA only)
 */
router.post('/users/:userId/reset-mfa', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.mfa_enabled) {
      return res.status(400).json({ error: 'User does not have MFA enabled' });
    }

    // Disable MFA
    disableMFA(userId);

    console.log(`[Admin] MFA disabled for user ${user.email} (ID: ${userId})`);

    res.json({
      success: true,
      message: 'MFA has been disabled',
    });
  } catch (error) {
    console.error('Reset MFA error:', error);
    res.status(500).json({ error: 'Failed to reset MFA' });
  }
});

// Send password reset email (admin-initiated)
router.post('/users/:userId/send-password-reset', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user uses password authentication
    const authMethods = user.auth_methods || [];
    if (!authMethods.includes('credentials')) {
      return res.status(400).json({ error: 'User does not use password authentication' });
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set expiry to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Save reset token
    setPasswordResetToken(userId, resetToken, expiresAt.toISOString());

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(user.email, resetToken, user.name);

    console.log(`[Admin] Password reset email sent to ${user.email} (ID: ${userId})`);

    res.json({
      success: true,
      emailSent,
      message: 'Password reset email has been sent',
    });
  } catch (error) {
    console.error('Send password reset error:', error);
    res.status(500).json({ error: 'Failed to send password reset email' });
  }
});

/**
 * Change password
 */
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    if (!verifyPassword(user, currentPassword)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Update password
    updatePassword(userId, newPassword);

    res.json({ success: true });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

/**
 * Enable MFA - Step 1: Generate TOTP secret and QR code
 */
router.post('/mfa/setup', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const user = getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.mfa_enabled) {
      return res.status(400).json({ error: 'MFA is already enabled' });
    }

    // Generate TOTP secret
    const { secret, otpauth_url } = generateTOTPSecret(user.email);
    
    // Generate QR code
    const qrCode = await generateQRCode(otpauth_url);
    
    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Store secret temporarily (not saved to DB until verification)
    const setupToken = crypto.randomBytes(32).toString('hex');
    challenges.set(`mfa-setup-${setupToken}`, {
      challenge: secret,
      userId,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    res.json({
      setupToken,
      qrCode,
      secret,
      backupCodes,
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'MFA setup failed' });
  }
});

/**
 * Enable MFA - Step 2: Verify TOTP token and enable MFA
 */
router.post('/mfa/verify-setup', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { setupToken, token, backupCodes } = req.body;

    if (!setupToken || !token || !backupCodes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get temporary secret
    const setup = challenges.get(`mfa-setup-${setupToken}`);
    if (!setup || setup.userId !== userId || setup.expires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired setup token' });
    }

    // Verify TOTP token
    if (!verifyTOTP(setup.challenge, token)) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Enable MFA
    enableMFA(userId, setup.challenge, backupCodes);
    challenges.delete(`mfa-setup-${setupToken}`);

    res.json({ success: true });
  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

/**
 * Disable MFA
 */
router.post('/mfa/disable', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { password } = req.body;

    const user = getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password before disabling MFA
    if (user.password_hash && !verifyPassword(user, password)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    disableMFA(userId);

    res.json({ success: true });
  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

/**
 * Get new backup codes
 */
router.post('/mfa/backup-codes', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { password } = req.body;

    const user = getUserById(userId);
    if (!user || !user.mfa_enabled) {
      return res.status(400).json({ error: 'MFA is not enabled' });
    }

    // Verify password
    if (user.password_hash && !verifyPassword(user, password)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes();
    enableMFA(userId, user.totp_secret!, backupCodes);

    res.json({ backupCodes });
  } catch (error) {
    console.error('Backup codes error:', error);
    res.status(500).json({ error: 'Failed to generate backup codes' });
  }
});

/**
 * Start passkey registration
 */
router.post('/passkey/register-options', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const user = getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const options = await generatePasskeyRegistrationOptions(
      user.id,
      user.email,
      user.name || user.email,
      user.passkeys || []
    );

    console.log('[Passkey Registration] Generated options:', {
      challengeLength: options.challenge.length,
      challenge: options.challenge,
      userId: options.user.id,
      userIdLength: options.user.id.length,
      userName: options.user.name,
      rpId: options.rp.id,
      rpName: options.rp.name,
      excludeCredentialsCount: options.excludeCredentials?.length || 0,
    });

    // Store challenge
    const challengeKey = `passkey-reg-${userId}`;
    challenges.set(challengeKey, {
      challenge: options.challenge,
      userId,
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    res.json(options);
  } catch (error) {
    console.error('Passkey registration options error:', error);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
});

/**
 * Verify passkey registration
 */
router.post('/passkey/register-verify', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { credential, name } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Missing credential' });
    }

    // Get stored challenge
    const challengeKey = `passkey-reg-${userId}`;
    const stored = challenges.get(challengeKey);
    
    if (!stored || stored.userId !== userId || stored.expires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired challenge' });
    }

    // Verify registration
    const verification = await verifyPasskeyRegistration(credential, stored.challenge);

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Passkey verification failed' });
    }

    // Save passkey
    // Convert Uint8Array to base64url (URL-safe base64 without padding)
    const credentialIDBase64 = Buffer.from(verification.registrationInfo.credentialID)
      .toString('base64url');
    
    const credentialPublicKeyBase64 = Buffer.from(verification.registrationInfo.credentialPublicKey)
      .toString('base64url');
    
    const passkey = {
      id: crypto.randomUUID(),
      name: name || `Passkey ${Date.now()}`,
      credentialID: credentialIDBase64,
      credentialPublicKey: credentialPublicKeyBase64,
      counter: verification.registrationInfo.counter,
      transports: credential.response.transports,
    };

    addPasskey(userId, passkey);
    challenges.delete(challengeKey);

    res.json({ success: true, passkey: { id: passkey.id, name: passkey.name } });
  } catch (error: any) {
    console.error('Passkey registration verification error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({ error: error.message || 'Passkey registration failed' });
  }
});

/**
 * Get authentication options for passkey login
 */
router.post('/passkey/auth-options', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    // If email provided, get user's passkeys
    let passkeys: any[] = [];
    if (email) {
      const user = getUserByEmail(email);
      if (user && user.passkeys) {
        passkeys = user.passkeys;
        console.log('[Passkey Auth] Found user with passkeys:', {
          email,
          passkeyCount: passkeys.length,
          passkeys: passkeys.map(pk => ({
            id: pk.id,
            name: pk.name,
            credentialIDLength: pk.credentialID?.length,
            transports: pk.transports
          }))
        });
      } else {
        console.log('[Passkey Auth] User not found or has no passkeys:', email);
      }
    } else {
      console.log('[Passkey Auth] No email provided, returning empty allowCredentials');
    }

    const options = await generatePasskeyAuthenticationOptions(passkeys);

    // Store challenge
    const sessionId = crypto.randomUUID();
    challenges.set(`passkey-auth-${sessionId}`, {
      challenge: options.challenge,
      expires: Date.now() + 5 * 60 * 1000,
    });

    res.json({ ...options, sessionId });
  } catch (error) {
    console.error('Passkey auth options error:', error);
    res.status(500).json({ error: 'Failed to generate auth options' });
  }
});

/**
 * Verify passkey authentication
 */
router.post('/passkey/auth-verify', async (req: Request, res: Response) => {
  try {
    const { credential, sessionId } = req.body;

    if (!credential || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get stored challenge
    const stored = challenges.get(`passkey-auth-${sessionId}`);
    if (!stored || stored.expires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired challenge' });
    }

    // Find passkey by credential ID
    const result = getPasskeyByCredentialId(credential.id);
    if (!result) {
      return res.status(400).json({ error: 'Passkey not found' });
    }

    const { user, passkey } = result;

    // Verify authentication
    const verification = await verifyPasskeyAuthentication(
      credential,
      stored.challenge,
      passkey.credentialPublicKey,
      passkey.counter
    );

    if (!verification.verified) {
      return res.status(400).json({ error: 'Passkey verification failed' });
    }

    // Update counter
    updatePasskeyCounter(user.id, passkey.id, verification.authenticationInfo.newCounter);
    challenges.delete(`passkey-auth-${sessionId}`);

    // Create session
    (req.session as any).userId = user.id;
    (req.session as any).user = {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      role: user.role,
    };

    console.log('[Passkey Login] Creating session for user:', {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionID: req.sessionID,
    });

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('[Passkey Login] Session save error:', err);
        return res.status(500).json({ error: 'Session creation failed' });
      }

      console.log('[Passkey Login] ✅ Session saved successfully');
      
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
        },
      });
    });
  } catch (error) {
    console.error('Passkey auth verification error:', error);
    res.status(500).json({ error: 'Passkey authentication failed' });
  }
});

/**
 * List user's passkeys
 */
router.get('/passkey/list', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const user = getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passkeys = (user.passkeys || []).map(pk => ({
      id: pk.id,
      name: pk.name,
      created_at: pk.created_at,
    }));

    res.json({ passkeys });
  } catch (error) {
    console.error('Passkey list error:', error);
    res.status(500).json({ error: 'Failed to list passkeys' });
  }
});

/**
 * Remove a passkey
 */
router.delete('/passkey/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const passkeyId = req.params.id;

    const success = removePasskey(userId, passkeyId);

    if (!success) {
      return res.status(404).json({ error: 'Passkey not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Passkey removal error:', error);
    res.status(500).json({ error: 'Failed to remove passkey' });
  }
});

/**
 * List all users (admin only)
 */
router.get('/users', requireAuth, (req: Request, res: Response) => {
  try {
    const users = getAllUsers();
    
    // Remove sensitive data and add computed fields
    const sanitizedUsers = users.map((user: User) => {
      // Determine display status based on user state
      let displayStatus = null;
      if (user.status === 'invited') {
        // Check if invite has expired
        if (user.invite_expires_at) {
          const expiresAt = new Date(user.invite_expires_at);
          if (expiresAt < new Date()) {
            displayStatus = 'invite_expired';
          } else {
            displayStatus = 'invited';
          }
        } else {
          displayStatus = 'invited';
        }
      }
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        auth_methods: user.auth_methods,
        mfa_enabled: user.mfa_enabled,
        passkey_count: user.passkeys?.length || 0,
        is_active: user.is_active,
        status: displayStatus, // Only show status if invited or expired
        created_at: user.created_at,
        last_login_at: user.last_login_at,
      };
    });

    res.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * Delete user (admin only - can't delete yourself)
 */
router.delete('/users/:userId', requireAdmin, (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const currentUserId = getUserIdFromRequest(req);
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Prevent deleting yourself
    if (userId === currentUserId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Get target user
    const targetUser = getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete user
    const success = deleteUser(userId);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete user' });
    }
    
    console.log(`[User Management] User ${targetUser.email} (ID: ${userId}) deleted by user ID: ${currentUserId}`);
    
    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * Update user role (Admin only)
 */
router.patch('/users/:userId/role', requireAdmin, (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { role } = req.body;
    const currentUserId = getUserIdFromRequest(req);
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Validate role
    const validRoles = ['admin', 'manager', 'viewer'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, manager, or viewer' });
    }
    
    // Get target user
    const targetUser = getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent changing your own role
    if (userId === currentUserId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }
    
    // Update user role
    updateUser(userId, { role });
    
    console.log(`[User Management] User ${targetUser.email} (ID: ${userId}) role changed to ${role} by user ID: ${currentUserId}`);
    
    res.json({
      success: true,
      message: 'User role updated successfully',
      role,
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

/**
 * Get user's enabled auth methods
 */
router.get('/user/methods', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const user = getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      authMethods: user.auth_methods,
      mfaEnabled: user.mfa_enabled,
      passkeyCount: user.passkeys?.length || 0,
      hasPassword: !!user.password_hash,
      hasGoogleLinked: !!user.google_id,
    });
  } catch (error) {
    console.error('Auth methods error:', error);
    res.status(500).json({ error: 'Failed to get auth methods' });
  }
});

export default router;
