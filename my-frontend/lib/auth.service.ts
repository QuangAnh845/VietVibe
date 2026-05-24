import { api } from './api';
import { ErrorHandler } from './error-handler';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    user_name: string;
    role: string;
  };
}

interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post<LoginResponse>('/auth/login', { email, password }, {
        skipAuth: true,
      });
      return response;
    } catch (error) {
      const parsedError = ErrorHandler.parseError(error);
      throw new Error(parsedError.message);
    }
  },

  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<LoginResponse> {
    try {
      const response = await api.post<LoginResponse>('/auth/register', { name, email, password }, {
        skipAuth: true,
      });
      return response;
    } catch (error) {
      const parsedError = ErrorHandler.parseError(error);
      throw new Error(parsedError.message);
    }
  },

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const response = await api.post<RefreshTokenResponse>(
        '/auth/refresh',
        { refresh_token: refreshToken },
        { skipAuth: true },
      );
      return response;
    } catch (error) {
      const parsedError = ErrorHandler.parseError(error);
      throw new Error(parsedError.message);
    }
  },

  async logout(accessToken: string): Promise<void> {
    try {
      await api.post('/auth/logout', {});
    } catch (error) {
      // Silently fail on logout - user wants to logout anyway
      console.error('Logout failed:', error);
    }
  },

  async revokeToken(accessToken: string, reason?: string): Promise<void> {
    try {
      await api.post('/auth/revoke', { reason: reason || 'logout' });
    } catch (error) {
      const parsedError = ErrorHandler.parseError(error);
      throw new Error(parsedError.message);
    }
  },

  async revokeAllTokens(accessToken: string): Promise<void> {
    try {
      await api.post('/auth/revoke-all', {});
    } catch (error) {
      const parsedError = ErrorHandler.parseError(error);
      throw new Error(parsedError.message);
    }
  },

  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<any> {
    try {
      const response = await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      return response;
    } catch (error) {
      const parsedError = ErrorHandler.parseError(error);
      throw new Error(parsedError.message);
    }
  },

  async getAuditHistory(limit = 50): Promise<any> {
    try {
      const response = await api.get(`/auth/audit-history`);
      return response;
    } catch (error) {
      const parsedError = ErrorHandler.parseError(error);
      throw new Error(parsedError.message);
    }
  },
};
