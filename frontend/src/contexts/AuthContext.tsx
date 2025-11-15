/**
 * AuthContext
 * Centralized authentication state management
 * Reduces duplicate /api/auth/status requests from multiple components
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'viewer';
  mfaEnabled?: boolean;
  passkeysEnabled?: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  logoutMessage: string | null;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  handleAuthError: (message?: string) => void;
  clearLogoutMessage: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);

  const handleAuthError = useCallback((message?: string) => {
    const msg = message || 'You were logged out';
    setLogoutMessage(msg);
    setIsAuthenticated(false);
    setUser(null);
    
    // Fire event to trigger redirect to /admin
    window.dispatchEvent(new CustomEvent('auth-error', { detail: { message: msg } }));
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/status`, {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        const wasAuthenticated = isAuthenticated;
        const nowAuthenticated = data.authenticated;
        
        setIsAuthenticated(nowAuthenticated);
        setUser(data.user || null);
        
        // If user was authenticated but is no longer, they were logged out
        if (wasAuthenticated && !nowAuthenticated) {
          handleAuthError('You were logged out');
        }
      } else if (res.status === 401) {
        // Session expired or user deleted
        const wasAuthenticated = isAuthenticated;
        setIsAuthenticated(false);
        setUser(null);
        
        if (wasAuthenticated) {
          handleAuthError('Your session has expired');
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, handleAuthError]);

  const clearLogoutMessage = useCallback(() => {
    setLogoutMessage(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setIsAuthenticated(false);
      setUser(null);
      setLogoutMessage(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Poll auth status every 10 seconds to detect session invalidation
  useEffect(() => {
    const interval = setInterval(() => {
      checkAuth();
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isLoading, 
      user, 
      logoutMessage,
      checkAuth, 
      logout,
      handleAuthError,
      clearLogoutMessage
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

