/**
 * Authentication Routes
 * Handles Google OAuth login, logout, and session management
 */

import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from '../config.js';

const router = Router();

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
      const frontendUrl = process.env.NODE_ENV === 'production'
        ? apiUrl.replace('api.', '')
        : apiUrl.replace(':3001', ':5173');

      // Handle authentication errors
      if (err) {
        const reason = err.message || 'failed';
        return res.redirect(`${frontendUrl}/auth/error?reason=${reason}`);
      }

      if (!user) {
        return res.redirect(`${frontendUrl}/auth/error?reason=failed`);
      }

      // Log the user in
      req.logIn(user, (err) => {
        if (err) {
          return res.redirect(`${frontendUrl}/auth/error?reason=failed`);
        }
        // Successful authentication
        return res.redirect(`${frontendUrl}/authenticated`);
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
router.post('/logout', (req: Request, res: Response) => {
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

