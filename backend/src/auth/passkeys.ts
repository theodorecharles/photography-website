/**
 * Passkeys (WebAuthn) Module
 * Handles passkey registration and authentication
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';
import config from '../config.js';

// Get RP (Relying Party) configuration from environment or config
const getRPConfig = () => {
  // Dynamically determine RP ID from environment or config
  let rpID = process.env.RP_ID;
  let origin = process.env.ORIGIN;
  
  // If not set via env vars, try to infer from config
  if (!rpID || !origin) {
    try {
      if (config.frontend?.apiUrl) {
        const url = new URL(config.frontend.apiUrl);
        const hostname = url.hostname;
        
        // Extract base domain (remove subdomains like 'api-dev' or 'www-dev')
        if (hostname.includes('tedcharles.net')) {
          // Use the full subdomain for RP ID to match origin exactly
          rpID = rpID || 'www-dev.tedcharles.net';
          origin = origin || config.frontend.apiUrl.replace('api-dev', 'www-dev').replace('api.', 'www.');
        } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
          rpID = rpID || 'localhost';
          origin = origin || `http://localhost:${config.frontend?.port || 3000}`;
        }
      }
    } catch (err) {
      console.warn('Could not infer RP config from config.json:', err);
    }
  }
  
  // Fallback to defaults
  rpID = rpID || 'localhost';
  origin = origin || 'http://localhost:3000';
  const rpName = process.env.RP_NAME || 'Photography Portfolio';
  
  console.log('[Passkeys] RP Config:', { rpID, rpName, origin });
  
  return { rpID, rpName, origin };
};

/**
 * Generate options for passkey registration
 */
export async function generatePasskeyRegistrationOptions(
  userId: number,
  userEmail: string,
  userName: string,
  existingPasskeys: any[] = []
) {
  const { rpID, rpName } = getRPConfig();
  
  // Encode user ID as base64url to ensure it's valid for WebAuthn
  const userIdBase64 = Buffer.from(`user-${userId}`, 'utf-8').toString('base64url');
  
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: userIdBase64,
    userName: userEmail,
    userDisplayName: userName || userEmail,
    attestationType: 'none',
    excludeCredentials: existingPasskeys.map(passkey => ({
      id: Buffer.from(passkey.credentialID, 'base64url'),
      type: 'public-key',
      transports: passkey.transports,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      // Remove platform restriction to allow security keys too
    },
  });

  return options;
}

/**
 * Verify passkey registration response
 */
export async function verifyPasskeyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string
): Promise<VerifiedRegistrationResponse> {
  const { rpID, origin } = getRPConfig();
  
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  return verification;
}

/**
 * Generate options for passkey authentication
 */
export async function generatePasskeyAuthenticationOptions(
  existingPasskeys: any[] = []
) {
  const { rpID } = getRPConfig();
  
  console.log('[Passkey Auth Options] Generating for RP:', rpID);
  
  // Don't specify allowCredentials - this lets password managers (like 1Password)
  // automatically offer their stored passkeys without browser showing generic options
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    // timeout: 60000, // 60 seconds
  });

  return options;
}

/**
 * Verify passkey authentication response
 */
export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  credentialPublicKey: string,
  credentialCounter: number
): Promise<VerifiedAuthenticationResponse> {
  const { rpID, origin } = getRPConfig();
  
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    authenticator: {
      credentialPublicKey: Buffer.from(credentialPublicKey, 'base64url'),
      credentialID: Buffer.from(response.id, 'base64url'),
      counter: credentialCounter,
    },
  });

  return verification;
}
