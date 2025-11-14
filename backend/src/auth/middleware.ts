/**
 * Authentication Middleware
 * Handles authentication checks for protected routes
 * Supports both Passport-based sessions (Google OAuth) and credential-based sessions
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if user is authenticated
 * Works with both Passport sessions and credential-based sessions
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Debug logging
  console.log('[Auth Middleware]', {
    path: req.path,
    method: req.method,
    hasIsAuthenticated: !!req.isAuthenticated,
    isAuthenticatedResult: req.isAuthenticated ? req.isAuthenticated() : false,
    sessionId: req.sessionID,
    hasUserId: !!(req.session as any)?.userId,
    userId: (req.session as any)?.userId,
    cookies: Object.keys(req.cookies || {}),
  });
  
  // Check if authenticated via Passport (Google OAuth)
  if (req.isAuthenticated && req.isAuthenticated()) {
    console.log('[Auth Middleware] ✅ Authenticated via Passport');
    return next();
  }
  
  // Check if authenticated via credential login (session.userId)
  if ((req.session as any)?.userId) {
    console.log('[Auth Middleware] ✅ Authenticated via credentials');
    return next();
  }
  
  console.log('[Auth Middleware] ❌ Not authenticated');
  return res.status(401).json({ error: 'Not authenticated' });
}

/**
 * Middleware to check if user is authenticated (compatible with old isAuthenticated)
 * This maintains backwards compatibility with existing routes
 */
export const isAuthenticated = requireAuth;

/**
 * Helper function to get user from request
 */
async function getUserFromRequest(req: Request): Promise<any> {
  // Check Passport session (Google OAuth)
  if (req.user) {
    return req.user;
  }
  
  // Check credential session
  if ((req.session as any)?.user) {
    return (req.session as any).user;
  }
  
  return null;
}

/**
 * Middleware to check if user is authenticated AND has admin role
 * Viewers can view but not modify
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // First check if authenticated
  const isAuth = (req.isAuthenticated && req.isAuthenticated()) || !!(req.session as any)?.userId;
  
  if (!isAuth) {
    console.log('[Admin Middleware] ❌ Not authenticated');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Get user and check role
  const user = await getUserFromRequest(req);
  
  if (!user || !user.role) {
    console.log('[Admin Middleware] ❌ No user or role found');
    return res.status(403).json({ error: 'Access denied - role required' });
  }
  
  if (user.role !== 'admin') {
    console.log('[Admin Middleware] ❌ User is not admin:', user.role);
    return res.status(403).json({ error: 'Access denied - admin role required' });
  }
  
  console.log('[Admin Middleware] ✅ User is admin');
  next();
}

/**
 * Middleware to check if user is authenticated AND has manager or admin role
 * Managers can modify content (albums, photos, branding, links) but not system settings
 */
export async function requireManager(req: Request, res: Response, next: NextFunction) {
  // First check if authenticated
  const isAuth = (req.isAuthenticated && req.isAuthenticated()) || !!(req.session as any)?.userId;
  
  if (!isAuth) {
    console.log('[Manager Middleware] ❌ Not authenticated');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Get user and check role
  const user = await getUserFromRequest(req);
  
  if (!user || !user.role) {
    console.log('[Manager Middleware] ❌ No user or role found');
    return res.status(403).json({ error: 'Access denied - role required' });
  }
  
  if (user.role !== 'admin' && user.role !== 'manager') {
    console.log('[Manager Middleware] ❌ User is not admin or manager:', user.role);
    return res.status(403).json({ error: 'Access denied - manager role required' });
  }
  
  console.log('[Manager Middleware] ✅ User is admin or manager');
  next();
}
