'use client';

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
  useState,
} from 'react';
import { authService } from '@/lib/auth.service';
import { useTokenStorage } from '@/hooks/useTokenStorage';

interface User {
  id: string;
  email: string;
  user_name?: string;
  name?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  revokeAllDevices: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getAccessToken, getRefreshToken, getUser, setTokens, clearTokens } =
    useTokenStorage();

  // Initialize auth state
  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, [getUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const response = await authService.login(email, password);
        setTokens(response.access_token, response.refresh_token, response.user);
        setUser(response.user);
      } finally {
        setIsLoading(false);
      }
    },
    [setTokens],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setIsLoading(true);
      try {
        const response = await authService.register(name, email, password);
        setTokens(response.access_token, response.refresh_token, response.user);
        setUser(response.user);
      } finally {
        setIsLoading(false);
      }
    },
    [setTokens],
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      const accessToken = getAccessToken();
      if (accessToken) {
        await authService.logout(accessToken).catch(console.error); // Silently fail if server is down
      }
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, clearTokens]);

  const revokeAllDevices = useCallback(async () => {
    const accessToken = getAccessToken();
    if (!accessToken) throw new Error('No access token');

    await authService.revokeAllTokens(accessToken);
    clearTokens();
    setUser(null);
  }, [getAccessToken, clearTokens]);

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    const response = await authService.refreshToken(refreshToken);
    const currentUser = getUser();
    setTokens(response.access_token, response.refresh_token, currentUser);
  }, [getRefreshToken, getUser, setTokens]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    revokeAllDevices,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
