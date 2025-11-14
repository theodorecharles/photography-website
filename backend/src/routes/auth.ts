/**
 * Authentication Routes
 * Handles Google OAuth login, logout, and session management
 */

import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config, { DATA_DIR } from '../config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUserByEmail, createUser, getUserByGoogleId, linkGoogleAccount, getUserById } from '../database-users.js';

const router = Router();

/**
 * Helper function to send analytics event
 */
async function sendAnalyticsEvent(eventData: any) {
  try {
    const analyticsConfig = config.analytics?.openobserve;
    if (!analyticsConfig?.enabled) return;

    const { endpoint, organization, stream, username, password } = analyticsConfig;
    if (!endpoint || !organization || !stream || !username || !password) return;

    // Construct the full URL: {endpoint}{organization}/{stream}/_json
    const analyticsUrl = `${endpoint}${organization}/${stream}/_json`;
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    
    await fetch(analyticsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify([{
        ...eventData,
        timestamp: new Date().toISOString(),
      }]),
    });
  } catch (error) {
    // Silently fail - don't break auth flow
    console.debug('Analytics tracking failed:', error);
  }
}

// Type definitions for authenticated user
interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// Function to initialize Google OAuth Strategy
export function initializeGoogleStrategy() {
  console.log('🔄 Attempting to initialize Google OAuth strategy...');
  
  // Reload config to get latest values
  // Go up one level from backend to project root
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const configPath = path.join(DATA_DIR, 'config.json');
  
  let latestConfig;
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    latestConfig = JSON.parse(configContent);
    console.log('✓ Config file loaded successfully');
  } catch (err) {
    console.log('⚠️  Could not load config for Google OAuth:', err);
    return false;
  }
  
  const googleConfig = latestConfig.environment?.auth?.google;
  const authorizedEmails = latestConfig.environment?.auth?.authorizedEmails || [];
  const callbackURL = `${latestConfig.environment?.frontend?.apiUrl}/api/auth/google/callback`;

  console.log('📋 OAuth config check:');
  console.log('  - Client ID:', googleConfig?.clientId ? '✓ Present' : '✗ Missing');
  console.log('  - Client Secret:', googleConfig?.clientSecret ? '✓ Present' : '✗ Missing');
  console.log('  - Authorized Emails:', authorizedEmails.length);
  console.log('  - Callback URL:', callbackURL);

  if (googleConfig?.clientId && googleConfig?.clientSecret) {
    // Remove existing strategy if it exists
    try {
      passport.unuse('google');
      console.log('✓ Removed old Google strategy');
    } catch (e) {
      // Strategy doesn't exist yet, that's fine
      console.log('ℹ️  No existing Google strategy to remove');
    }
    
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleConfig.clientId,
          clientSecret: googleConfig.clientSecret,
          callbackURL: callbackURL,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Extract user information
            const email = profile.emails?.[0]?.value;
            
            if (!email) {
              return done(new Error('no_email'));
            }

            // Check if user is authorized
            if (!authorizedEmails.includes(email)) {
              return done(new Error('unauthorized'));
            }

            // Check if user exists in database
            let dbUser = getUserByEmail(email);
            
            if (!dbUser) {
              // Check by Google ID
              dbUser = getUserByGoogleId(profile.id);
            }

            if (!dbUser) {
              // Create new user in database
              // First user becomes admin, others become viewers
              const isFirstUser = authorizedEmails.length === 1;
              dbUser = createUser({
                email: email,
                google_id: profile.id,
                name: profile.displayName,
                picture: profile.photos?.[0]?.value,
                auth_methods: ['google'],
                email_verified: true,
                role: isFirstUser ? 'admin' : 'viewer',
              });
              console.log(`[Google OAuth] Created new user: ${email} with role: ${dbUser.role}`);
            } else if (!dbUser.google_id) {
              // Link Google account to existing user
              linkGoogleAccount(dbUser.id, profile.id, profile.displayName, profile.photos?.[0]?.value);
              console.log(`[Google OAuth] Linked Google account to existing user: ${email}`);
            }

            // Create user object for session
            const user: AuthenticatedUser = {
              id: profile.id,
              email: email,
              name: profile.displayName,
              picture: profile.photos?.[0]?.value,
            };

            return done(null, user);
          } catch (error) {
            console.error('[Google OAuth] Error during authentication:', error);
            return done(error as Error);
          }
        }
      )
    );

    // Serialize user for session
    passport.serializeUser((user: any, done) => {
      done(null, user);
    });

    // Deserialize user from session
    passport.deserializeUser((user: any, done) => {
      done(null, user);
    });
    
    console.log('✅ Google OAuth strategy initialized successfully!');
    return true;
  } else {
    console.log('⚠️  Google OAuth not configured - admin login disabled');
    return false;
  }
}

// Initialize Google OAuth Strategy on startup
initializeGoogleStrategy();

// Middleware to check if user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Route: Initiate Google OAuth login
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

// Route: Google OAuth callback
router.get(
  '/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('google', (err: any, user: any) => {
      // Reload config to get latest values (in case it was just created by OOBE)
      let currentConfig = config;
      try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const configPath = path.join(DATA_DIR, 'config.json');
        const configContent = fs.readFileSync(configPath, 'utf8');
        currentConfig = JSON.parse(configContent);
      } catch (err) {
        // Fall back to imported config if reload fails
        console.warn('[OAuth Callback] Could not reload config, using default');
      }
      
      // Derive frontend URL from config
      const apiUrl = currentConfig.environment?.frontend?.apiUrl || currentConfig.frontend?.apiUrl || '';
      const frontendPort = currentConfig.environment?.frontend?.port || currentConfig.frontend?.port || 3000;
      const isProduction = apiUrl.startsWith('https://');
      const frontendUrl = isProduction
        ? apiUrl.replace(/^https:\/\/api([-\.])/, 'https://www$1')
        : apiUrl.replace(':3001', `:${frontendPort}`);

      // Handle authentication errors
      if (err) {
        if (!isProduction) {
          console.log('[OAuth] Authentication error:', err.message);
        }
        const reason = err.message || 'failed';
        // Track authentication failure
        sendAnalyticsEvent({
          event_type: 'login_failed',
          failure_reason: reason === 'no_email' ? 'no_email' : reason === 'unauthorized' ? 'unauthorized_email' : 'oauth_error',
          error_message: err.message || 'unknown',
        });
        return res.redirect(`${frontendUrl}/auth/error?reason=${reason}`);
      }

      if (!user) {
        if (!isProduction) {
          console.log('[OAuth] No user returned');
        }
        // Track authentication failure
        sendAnalyticsEvent({
          event_type: 'login_failed',
          failure_reason: 'no_user',
        });
        return res.redirect(`${frontendUrl}/auth/error?reason=failed`);
      }

      // Log the user in
      req.logIn(user, (err) => {
        if (err) {
          if (!isProduction) {
            console.log('[OAuth] Login error:', err);
          }
          // Track authentication failure
          sendAnalyticsEvent({
            event_type: 'login_failed',
            failure_reason: 'login_error',
            user_email: user.email || 'unknown',
          });
          return res.redirect(`${frontendUrl}/auth/error?reason=failed`);
        }
        
        // Explicitly save the session before redirecting
        req.session.save(async (err) => {
          if (err) {
            if (!isProduction) {
              console.log('[OAuth] Session save error:', err);
            }
            // Track authentication failure
            await sendAnalyticsEvent({
              event_type: 'login_failed',
              failure_reason: 'session_save_error',
              user_email: user.email || 'unknown',
            });
            return res.redirect(`${frontendUrl}/auth/error?reason=failed`);
          }
          
          // Track successful authentication
          await sendAnalyticsEvent({
            event_type: 'login_succeeded',
            user_email: user.email || 'unknown',
            user_name: user.name || 'unknown',
          });
          
          // Redirect directly to admin - simple and straightforward
          return res.redirect(`${frontendUrl}/admin`);
        });
      });
    })(req, res, next);
  }
);

// Route: Check authentication status
router.get('/status', (req: Request, res: Response) => {
  // Check Passport authentication (Google OAuth)
  if (req.isAuthenticated && req.isAuthenticated()) {
    const passportUser = req.user as any;
    
    // Look up full user details from database
    const dbUser = getUserByEmail(passportUser.email);
    if (dbUser) {
      return res.json({
        authenticated: true,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          picture: dbUser.picture || passportUser.picture,
          role: dbUser.role,
          mfa_enabled: dbUser.mfa_enabled,
          passkey_enabled: dbUser.passkeys && dbUser.passkeys.length > 0,
          auth_methods: dbUser.auth_methods,
        },
      });
    }
    
    return res.json({
      authenticated: true,
      user: req.user,
    });
  }
  
  // Check credential-based session
  if ((req.session as any)?.userId) {
    const sessionUser = (req.session as any).user;
    
    // If we have user in session, return it with all fields
    if (sessionUser) {
      return res.json({
        authenticated: true,
        user: {
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.name,
          picture: sessionUser.picture,
          role: sessionUser.role,
          mfa_enabled: sessionUser.mfa_enabled,
          passkey_enabled: sessionUser.passkey_enabled,
          auth_methods: sessionUser.auth_methods,
        },
      });
    }
    
    // Fallback: look up user by ID
    const dbUser = getUserById((req.session as any).userId);
    if (dbUser) {
      return res.json({
        authenticated: true,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          picture: dbUser.picture,
          role: dbUser.role,
          mfa_enabled: dbUser.mfa_enabled,
          passkey_enabled: dbUser.passkeys && dbUser.passkeys.length > 0,
          auth_methods: dbUser.auth_methods,
        },
      });
    }
    
    return res.json({
      authenticated: true,
      user: { id: (req.session as any).userId },
    });
  }
  
  res.json({
    authenticated: false,
  });
});

// Route: Logout via GET redirect (for simple links)
router.get('/logout-redirect', (req: Request, res: Response) => {
  console.log('[Logout Redirect] Starting logout for session:', req.sessionID);
  
  // Handle both auth methods
  if (req.isAuthenticated && req.isAuthenticated()) {
    req.logout((err) => {
      if (err) console.error('[Logout Redirect] Passport logout error:', err);
      req.session.destroy((err) => {
        if (err) console.error('[Logout Redirect] Session destroy error:', err);
        console.log('[Logout Redirect] ✅ Logged out, redirecting to homepage');
        res.redirect('/');
      });
    });
  } else {
    req.session.destroy((err) => {
      if (err) console.error('[Logout Redirect] Session destroy error:', err);
      console.log('[Logout Redirect] ✅ Logged out, redirecting to homepage');
      res.redirect('/');
    });
  }
});

// Route: Logout
// Allow both Passport and credential sessions to logout
router.post('/logout', (req: Request, res: Response) => {
  console.log('[Logout] Starting logout for session:', req.sessionID);
  console.log('[Logout] Session data:', {
    hasIsAuthenticated: !!req.isAuthenticated,
    isAuthenticatedResult: req.isAuthenticated ? req.isAuthenticated() : false,
    hasUserId: !!(req.session as any)?.userId,
    userId: (req.session as any)?.userId,
  });
  
  // Always destroy the session regardless of auth method
  // For Passport sessions, call logout first
  if (req.isAuthenticated && req.isAuthenticated()) {
    console.log('[Logout] Passport session detected - calling req.logout()');
    req.logout((err) => {
      if (err) {
        console.error('[Logout] Passport logout error:', err);
      }
      
      // Always destroy session even if Passport logout fails
      req.session.destroy((err) => {
        if (err) {
          console.error('[Logout] Session destroy error:', err);
          return res.status(500).json({ error: 'Session destruction failed' });
        }
        console.log('[Logout] ✅ Passport session destroyed successfully');
        res.json({ success: true });
      });
    });
  } else {
    // Credential-based session or already logged out
    console.log('[Logout] Credential session detected - destroying session');
    req.session.destroy((err) => {
      if (err) {
        console.error('[Logout] Session destroy error:', err);
        return res.status(500).json({ error: 'Session destruction failed' });
      }
      console.log('[Logout] ✅ Credential session destroyed successfully');
      res.json({ success: true });
    });
  }
});

export default router;

