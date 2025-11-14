/**
 * Auth.js Configuration
 * Configures authentication providers and callbacks
 */

import { ExpressAuth } from '@auth/express';
import Google from '@auth/core/providers/google';
import Credentials from '@auth/core/providers/credentials';
import type { AuthConfig, Session } from '@auth/core/types';
import config from '../config.js';
import {
  getUserByEmail,
  getUserByGoogleId,
  getUserById,
  createUser,
  linkGoogleAccount,
  verifyPassword,
  updateLastLogin,
  recordMFAAttempt,
  getRecentMFAAttempts,
  type User,
} from '../database-users.js';
import { verifyTOTP } from './mfa.js';

// Extend the Session type to include our user data
declare module '@auth/core/types' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role?: string;
      mfaVerified?: boolean;
      requiresMFA?: boolean;
    };
  }
  
  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role?: string;
    mfaEnabled?: boolean;
  }
}

/**
 * Auth.js configuration
 */
export function getAuthConfig(): AuthConfig {
  const googleConfig = config.auth?.google;
  const sessionSecret = config.auth?.sessionSecret;
  
  if (!sessionSecret) {
    console.error('⚠️  No session secret configured! Auth will not work properly.');
  }

  return {
    secret: sessionSecret,
    trustHost: true,
    
    providers: [
      // Google OAuth Provider
      Google({
        clientId: googleConfig?.clientId || '',
        clientSecret: googleConfig?.clientSecret || '',
        authorization: {
          params: {
            prompt: 'consent',
            access_type: 'offline',
            response_type: 'code',
          },
        },
        profile(profile) {
          return {
            id: profile.sub,
            email: profile.email,
            name: profile.name,
            image: profile.picture,
          };
        },
      }),
      
      // Email/Password Provider
      Credentials({
        id: 'credentials',
        name: 'Credentials',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
          mfaToken: { label: 'MFA Token', type: 'text' },
        },
        async authorize(credentials, req) {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Missing credentials');
          }

          // Find user by email
          const user = getUserByEmail(credentials.email as string);

          if (!user) {
            throw new Error('Invalid credentials');
          }

          // Check if user is active
          if (!user.is_active) {
            throw new Error('Account is disabled');
          }

          // Verify password
          if (!verifyPassword(user, credentials.password as string)) {
            throw new Error('Invalid credentials');
          }

          // Check if MFA is enabled
          if (user.mfa_enabled) {
            const mfaToken = credentials.mfaToken as string;
            
            if (!mfaToken) {
              // Return user with MFA required flag
              return {
                id: user.id.toString(),
                email: user.email,
                name: user.name,
                image: user.picture,
                role: user.role,
                mfaEnabled: true,
              };
            }

            // Verify MFA token
            const ipAddress = (req as any).ip || 'unknown';
            
            if (!user.totp_secret || !verifyTOTP(user.totp_secret, mfaToken)) {
              recordMFAAttempt(user.id, ipAddress, false);
              
              const failedAttempts = getRecentMFAAttempts(user.id);
              if (failedAttempts >= 5) {
                throw new Error('Too many failed attempts. Please try again later.');
              }
              
              throw new Error('Invalid MFA token');
            }

            recordMFAAttempt(user.id, ipAddress, true);
          }

          // Update last login
          updateLastLogin(user.id);

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            image: user.picture,
            role: user.role,
            mfaEnabled: user.mfa_enabled,
          };
        },
      }),
    ],

    callbacks: {
      async signIn({ user, account, profile }) {
        // Handle Google OAuth sign in
        if (account?.provider === 'google') {
          const googleId = profile?.sub || user.id;
          
          // Check if user exists by Google ID
          let dbUser = getUserByGoogleId(googleId);
          
          if (!dbUser) {
            // Check if user exists by email
            dbUser = getUserByEmail(user.email!);
            
            if (dbUser) {
              // Link Google account to existing user
              linkGoogleAccount(
                dbUser.id,
                googleId,
                user.name || undefined,
                user.image || undefined
              );
            } else {
              // Check if email is in authorized list
              const authorizedEmails = config.auth?.authorizedEmails || [];
              if (authorizedEmails.length > 0 && !authorizedEmails.includes(user.email!)) {
                return false; // Deny sign in
              }
              
              // Create new user
              dbUser = createUser({
                email: user.email!,
                google_id: googleId,
                name: user.name || undefined,
                picture: user.image || undefined,
                auth_methods: ['google'],
                email_verified: true,
              });
            }
          }
          
          // Update last login
          updateLastLogin(dbUser.id);
        }
        
        return true;
      },

      async jwt({ token, user, account, trigger }) {
        // Add user info to token on sign in
        if (user) {
          token.id = user.id;
          token.role = user.role;
          token.mfaEnabled = (user as any).mfaEnabled;
        }
        
        return token;
      },

      async session({ session, token }) {
        // Add custom fields to session
        if (session.user) {
          session.user.id = token.id as string;
          session.user.role = token.role as string;
          session.user.requiresMFA = token.mfaEnabled as boolean;
        }
        
        return session;
      },
    },

    pages: {
      signIn: '/login',
      error: '/auth/error',
    },

    session: {
      strategy: 'jwt',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
  };
}

/**
 * Create Auth.js Express handler
 */
export function createAuthHandler() {
  return ExpressAuth(getAuthConfig());
}
