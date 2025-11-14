/**
 * Email Service
 * Handles sending emails for user invitations and password resets
 */

import nodemailer from 'nodemailer';
import { getCurrentConfig } from './config.js';

export interface EmailConfig {
  enabled: boolean;
  smtp: {
    host: string;
    port: number;
    secure: boolean; // true for 465, false for other ports
    auth: {
      user: string;
      pass: string;
    };
  };
  from: {
    name: string;
    address: string;
  };
}

/**
 * Get email configuration from config.json
 */
function getEmailConfig(): EmailConfig | null {
  const config = getCurrentConfig();
  return (config as any).email || null;
}

/**
 * Create nodemailer transporter
 */
function createTransporter() {
  const emailConfig = getEmailConfig();
  
  if (!emailConfig || !emailConfig.enabled) {
    return null;
  }
  
  return nodemailer.createTransport({
    host: emailConfig.smtp.host,
    port: emailConfig.smtp.port,
    secure: emailConfig.smtp.secure,
    auth: {
      user: emailConfig.smtp.auth.user,
      pass: emailConfig.smtp.auth.pass,
    },
  });
}

/**
 * Send user invitation email
 */
export async function sendInvitationEmail(
  toEmail: string,
  inviteToken: string,
  inviterName: string
): Promise<boolean> {
  const transporter = createTransporter();
  const emailConfig = getEmailConfig();
  
  if (!transporter || !emailConfig) {
    console.error('[Email] Email service not configured - cannot send invitation');
    return false;
  }
  
  const config = getCurrentConfig();
  const siteName = config.branding?.siteName || 'Photography Portfolio';
  
  // Get frontend URL - use allowedOrigins[0] as it's the actual frontend URL
  let frontendUrl = 'http://localhost:3000';
  if (config.backend?.allowedOrigins && config.backend.allowedOrigins.length > 0) {
    frontendUrl = config.backend.allowedOrigins[0];
  }
  
  const inviteUrl = `${frontendUrl}/invite/${inviteToken}`;
  
  // Get avatar URL
  const avatarPath = config.branding?.avatarPath || '/photos/avatar.png';
  const avatarUrl = `${frontendUrl}${avatarPath}`;
  
  const mailOptions = {
    from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
    to: toEmail,
    subject: `You've been invited to ${siteName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to ${siteName}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            margin: 20px 0;
          }
          .avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background-color: #4ade80;
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 0.9em;
            color: #666;
          }
          .code {
            background-color: #f0f0f0;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            word-break: break-all;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="${avatarUrl}" alt="${siteName}" class="avatar" />
          <h1>Join ${siteName}'s Galleria</h1>
          <p>Hi there,</p>
          <p>${inviterName} has invited you to join <strong>${siteName}'s Galleria</strong>.</p>
          <p>To accept this invitation and set up your account, click the button below:</p>
          <a href="${inviteUrl}" class="button">Accept Invitation</a>
          <p>Or copy and paste this link into your browser:</p>
          <div class="code">${inviteUrl}</div>
          <p><strong>This invitation will expire in 7 days.</strong></p>
          <div class="footer">
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Join ${siteName}'s Galleria

${inviterName} has invited you to join ${siteName}'s Galleria.

To accept this invitation and set up your account, visit:
${inviteUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
    `.trim(),
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email] Invitation sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send invitation:', error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string,
  userName: string | null
): Promise<boolean> {
  const transporter = createTransporter();
  const emailConfig = getEmailConfig();
  
  if (!transporter || !emailConfig) {
    console.error('[Email] Email service not configured - cannot send password reset');
    return false;
  }
  
  const config = getCurrentConfig();
  const siteName = config.branding?.siteName || 'Photography Portfolio';
  
  // Get frontend URL - use allowedOrigins[0] as it's the actual frontend URL
  let frontendUrl = 'http://localhost:3000';
  if (config.backend?.allowedOrigins && config.backend.allowedOrigins.length > 0) {
    frontendUrl = config.backend.allowedOrigins[0];
  }
  
  const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
  
  // Get avatar URL
  const avatarPath = config.branding?.avatarPath || '/photos/avatar.png';
  const avatarUrl = `${frontendUrl}${avatarPath}`;
  
  const greeting = userName ? `Hi ${userName}` : 'Hi there';
  
  const mailOptions = {
    from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
    to: toEmail,
    subject: `Password Reset Request - ${siteName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - ${siteName}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            margin: 20px 0;
          }
          .avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background-color: #ef4444;
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 0.9em;
            color: #666;
          }
          .code {
            background-color: #f0f0f0;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            word-break: break-all;
            margin: 10px 0;
          }
          .warning {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 12px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="${avatarUrl}" alt="${siteName}" class="avatar" />
          <h1>Password Reset Request</h1>
          <p>${greeting},</p>
          <p>We received a request to reset your password for <strong>${siteName}'s Galleria</strong>.</p>
          <p>To reset your password, click the button below:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <div class="code">${resetUrl}</div>
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>This link will expire in 1 hour</li>
              <li>If you didn't request this, please ignore this email</li>
              <li>Your password will not change until you create a new one</li>
            </ul>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>If you need assistance, please contact your administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Password Reset Request - ${siteName}

${greeting},

We received a request to reset your password for ${siteName}.

To reset your password, visit:
${resetUrl}

⚠️ Important:
- This link will expire in 1 hour
- If you didn't request this, please ignore this email
- Your password will not change until you create a new one

This is an automated message, please do not reply to this email.
    `.trim(),
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email] Password reset sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send password reset:', error);
    return false;
  }
}

/**
 * Test email configuration
 */
export async function testEmailConfig(): Promise<{ success: boolean; error?: string }> {
  const transporter = createTransporter();
  
  if (!transporter) {
    return { success: false, error: 'Email service not configured' };
  }
  
  try {
    await transporter.verify();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

