import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '@/lib/api';
import { User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<{ user: User; token: string }>;
  register: (username: string, fullName: string, email: string, password: string, hallOfResidence: string) => Promise<{ user: User; token: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user_info');
    try {
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with localStorage if changed elsewhere (optional, but good for multi-tab)
  useEffect(() => {
    const handleStorageChange = () => {
        const storedUser = localStorage.getItem('user_info');
        const storedToken = localStorage.getItem('auth_token');
        setUser(storedUser ? JSON.parse(storedUser) : null);
        setToken(storedToken);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  async function login(username: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await api.login(username, password);
      setUser(user);
      setToken(token);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_info', JSON.stringify(user));
      setLoading(false);
      return { user, token };
    } catch (err: unknown) {
      setError((err as Error).message);
      setLoading(false);
      throw err;
    }
  }

  async function register(username: string, fullName: string, email: string, password: string, hallOfResidence: string) {
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await api.register(username, fullName, email, password, hallOfResidence);
      setUser(user);
      setToken(token);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_info', JSON.stringify(user));
      setLoading(false);
      return { user, token };
    } catch (err: unknown) {
      setError((err as Error).message);
      setLoading(false);
      throw err;
    }
  }

  function logout() {
    api.logout();
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      error,
      login,
      register,
      logout,
      isAuthenticated: !!user && !!token
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};
