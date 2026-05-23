import { useAuth } from '@/context/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export const apiCall = async (
  endpoint: string,
  options: RequestInit = {},
  useAuthContext?: ReturnType<typeof useAuth>,
): Promise<any> => {
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options.headers,
    },
  });

  // Handle token expiration
  if (response.status === 401 && useAuthContext?.refreshAccessToken) {
    try {
      await useAuthContext.refreshAccessToken();
      // Retry request with new token
      return apiCall(endpoint, options, useAuthContext);
    } catch (error) {
      // Refresh failed, need to login again
      useAuthContext?.logout?.();
      throw error;
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
};
