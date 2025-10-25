/**
 * Authentication Routes
 * Handles Google OAuth login, logout, and session management
 */

import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from '../config.js';

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

// Configure Google OAuth Strategy
const googleConfig = config.auth?.google;
const authorizedEmails = config.auth?.authorizedEmails || [];

// Derive callback URL from API URL in config
const callbackURL = `${config.frontend?.apiUrl}/api/auth/google/callback`;

if (googleConfig?.clientId && googleConfig?.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleConfig.clientId,
        clientSecret: googleConfig.clientSecret,
        callbackURL: callbackURL,
      },
      (accessToken, refreshToken, profile, done) => {
        // Extract user information
        const email = profile.emails?.[0]?.value;
        
        if (!email) {
          return done(new Error('no_email'));
        }

        // Check if user is authorized
        if (!authorizedEmails.includes(email)) {
          return done(new Error('unauthorized'));
        }

        // Create user object
        const user: AuthenticatedUser = {
          id: profile.id,
          email: email,
          name: profile.displayName,
          picture: profile.photos?.[0]?.value,
        };

        return done(null, user);
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
}

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
      // Derive frontend URL from config
      const apiUrl = config.frontend?.apiUrl || '';
      const frontendPort = config.frontend?.port || 3000;
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
          
          // Successful authentication - redirect to admin portal
          return res.redirect(`${frontendUrl}/admin`);
        });
      });
    })(req, res, next);
  }
);

// Route: Check authentication status
router.get('/status', (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: req.user,
    });
  } else {
    res.json({
      authenticated: false,
    });
  }
});

// Route: Logout
// Using POST with authentication middleware provides CSRF protection
// because authenticated requests require valid session cookie
router.post('/logout', isAuthenticated, (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session destruction failed' });
      }
      res.json({ success: true });
    });
  });
});

export default router;

