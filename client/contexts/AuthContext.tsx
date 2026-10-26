import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
// Navigation is handled by the components that use this context

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, token: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        try {
          await fetchCurrentUser(storedToken);
        } catch (error) {
          console.error('Failed to fetch user during init:', error);
          // Do not force logout redirect on init; just clear invalid token and state
          localStorage.removeItem('access_token');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const fetchCurrentUser = async (authToken: string) => {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
      setToken(authToken);
      return data.user;
    }
    // Parse server error to decide whether to clear token
    const raw = (await response.json().catch(() => undefined)) as unknown;
    if (raw && typeof raw === 'object') {
      const errObj = raw as { code?: unknown };
      if (errObj && errObj.code === 'TOKEN_EXPIRED') {
        // Token expired: clear it
        localStorage.removeItem('access_token');
        setUser(null);
        setToken(null);
      }
    }
    throw new Error('Failed to fetch user');
  };

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: normalizedEmail, password: trimmedPassword }),
    });

    if (!response.ok) {
      const raw = (await response.json().catch(() => undefined)) as unknown;
      let msg = response.statusText || 'Login failed';
      if (raw && typeof raw === 'object') {
        const errObj = raw as { error?: unknown; message?: unknown };
        if (typeof errObj.error === 'string' && errObj.error) msg = errObj.error;
        else if (typeof errObj.message === 'string' && errObj.message) msg = errObj.message;
      }
      throw new Error(msg);
    }

    const { accessToken, user } = await response.json();
    // Store token
    localStorage.setItem('access_token', accessToken);
    setUser(user);
    setToken(accessToken);
  };

  const signup = async (name: string, inviteToken: string, password: string, confirmPassword: string) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, token: inviteToken, password, confirmPassword }),
    });

    if (!response.ok) {
      let errorMessage = 'Signup failed';
      try {
        const errorData = await response.json();
        console.log('Error response:', errorData); // Debug log
        
        // Handle the specific error format we're seeing in development
        if (errorData.error === true && errorData.message) {
          errorMessage = errorData.message;
          if (errorData.description) {
            errorMessage += `: ${errorData.description}`;
          }
        }
        // Handle other error formats
        else if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } 
        else if (errorData.details && Array.isArray(errorData.details)) {
          // Handle validation errors from zod
          errorMessage = errorData.details
            .map((d: { message?: string }) => d.message || 'Validation error')
            .filter(Boolean)
            .join('. ');
        } 
        else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If we can't parse the error response, use the status text
        errorMessage = response.statusText || 'An error occurred during signup';
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('access_token', data.token);
  };

  const logout = useCallback(async () => {
    try {
      // Clear all auth-related items from localStorage
      ['access_token', 'auth_token'].forEach(item => {
        localStorage.removeItem(item);
      });
      
      // Reset state
      setUser(null);
      setToken(null);
      
      // Clear any cached data that might be user-specific
      if (window.sessionStorage) {
        window.sessionStorage.clear();
      }
      
      // Call logout endpoint to clear server-side session
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      
      // Force a hard reload to ensure all state is cleared
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, we still want to clear local state
      localStorage.clear();
      window.location.href = '/login';
    }
  }, []);

  const updateUser = (userData: Partial<User>) => {
    setUser(prevUser => prevUser ? { ...prevUser, ...userData } : null);
  };

  const isAuthenticated = !!token; // avoid accidental redirects when user fetch temporarily fails

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
