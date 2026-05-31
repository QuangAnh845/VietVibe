'use client';

import { useCallback } from 'react';

const TOKEN_KEY = 'access_token';
const LEGACY_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';
const LEGACY_AUTH_KEY = 'vietvibe_auth';

export const useTokenStorage = () => {
  const getAccessToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
    }
    return null;
  }, []);

  const getRefreshToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
  }, []);

  const getUser = useCallback(() => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem(USER_KEY);
      if (user) {
        return JSON.parse(user);
      }

      const legacyAuth = localStorage.getItem(LEGACY_AUTH_KEY);
      if (!legacyAuth) {
        return null;
      }

      try {
        const parsed = JSON.parse(legacyAuth) as { user?: unknown };
        return parsed.user ?? null;
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  const setTokens = useCallback((accessToken: string, refreshToken: string, user: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(LEGACY_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(
        LEGACY_AUTH_KEY,
        JSON.stringify({
          accessToken,
          refreshToken,
          user,
          loggedInAt: new Date().toISOString(),
        }),
      );
    }
  }, []);

  const clearTokens = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(LEGACY_AUTH_KEY);
    }
  }, []);

  return {
    getAccessToken,
    getRefreshToken,
    getUser,
    setTokens,
    clearTokens,
  };
};
