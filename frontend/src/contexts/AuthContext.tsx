/**
 * AuthContext
 * Centralized authentication state management
 * Reduces duplicate /api/auth/status requests from multiple components
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { API_URL } from '../config';
import { error as logError } from '../utils/logger';

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
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/status`, {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(data.authenticated);
        setUser(data.user || null);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (err) {
      logError('Auth check failed:', err);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setIsAuthenticated(false);
      setUser(null);
    } catch (err) {
      logError('Logout failed:', err);
    }
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      user,
      checkAuth,
      logout
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
