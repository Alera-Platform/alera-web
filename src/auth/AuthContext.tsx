import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi } from '../api/endpoints.js';
import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from '../api/client.js';
import type { User } from '../types/index.js';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider — uygulama genelinde oturum durumunu sağlar.
 *
 * Açılışta localStorage'da token varsa /auth/me ile doğrular.
 * Token geçersizse temizler.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState(true);

  // Açılışta token doğrula
  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((u) => setUser(u))
      .catch(() => {
        clearStoredToken();
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    setStoredToken(result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const result = await authApi.register(username, email, password);
      setStoredToken(result.token);
      setToken(result.token);
      setUser(result.user);
    },
    [],
  );

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
