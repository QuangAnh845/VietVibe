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
import { userService } from '@/lib/user.service';

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
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getAccessToken, getRefreshToken, getUser, setTokens, clearTokens } =
    useTokenStorage();

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;
    const initializeUser = async () => {
      const storedUser = getUser();
      if (storedUser) {
        setUser(storedUser);
        
        const token = getAccessToken();
        if (token) {
          try {
            const profile = await userService.getProfile(token);
            if (isMounted) {
              const mappedUser = {
                ...storedUser,
                ...profile,
                id: profile._id || storedUser.id,
              };
              setUser(mappedUser);
              setTokens(token, getRefreshToken()!, mappedUser);
            }
          } catch (error) {
            console.error('Failed to fetch profile', error);
          }
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };
    initializeUser();
    return () => {
      isMounted = false;
    };
  }, [getUser, getAccessToken, getRefreshToken, setTokens]);

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

  const updateUser = useCallback(
    (userData: Partial<User>) => {
      setUser((prev) => {
        if (!prev) return null;
        const updatedUser = { ...prev, ...userData };
        const currentAccessToken = getAccessToken();
        const currentRefreshToken = getRefreshToken();
        if (currentAccessToken && currentRefreshToken) {
          setTokens(currentAccessToken, currentRefreshToken, updatedUser);
        }
        return updatedUser;
      });
    },
    [getAccessToken, getRefreshToken, setTokens],
  );

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    revokeAllDevices,
    refreshAccessToken,
    updateUser,
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
