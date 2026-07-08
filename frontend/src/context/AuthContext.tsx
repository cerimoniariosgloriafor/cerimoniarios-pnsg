import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

type AuthContextType = {
  user: any | null;
  loading: boolean;
  mustChangePassword: boolean;
  accessToken: string | null;
  login: (identity: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: any | null) => void;
  setMustChangePassword: (v: boolean) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const tok = localStorage.getItem('accessToken');
      if (!tok) {
        setLoading(false);
        return;
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${tok}`;
      try {
        const r = await axios.get('/auth/me');
        const payload = r.data || {};
        const u = payload.user || payload;
        setUser(u || null);
        setAccessToken(tok);
        setMustChangePassword(!!u?.mustChangePassword);
      } catch (err) {
        console.error('initAuth failed', err);
        localStorage.removeItem('accessToken');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (identity: string, password: string) => {
    const res = await axios.post('/auth/login', { identity, password });
    const { accessToken: token, user: u, mustChangePassword: mcp } = res.data || {};
    if (token) {
      localStorage.setItem('accessToken', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setAccessToken(token);
    }
    setUser(u || null);
    setMustChangePassword(!!mcp);
  };

  const logout = async () => {
    try { await axios.post('/auth/logout'); } catch {}
    localStorage.removeItem('accessToken');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, mustChangePassword, accessToken, login, logout, setUser, setMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
