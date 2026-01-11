import { useState } from 'react';
import * as api from '@/lib/api';

export function useAuth() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user_info');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function register(username: string, email: string, password: string, hallOfResidence: string) {
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await api.register(username, email, password, hallOfResidence);
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
  }

  return {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token
  };
}

