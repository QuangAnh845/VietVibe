import { ErrorHandler } from './error-handler';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
  skipErrorHandling?: boolean;
}

/**
 * Get token from localStorage (without hooks)
 */
function getStoredToken(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

/**
 * Set token in localStorage (without hooks)
 */
function setStoredToken(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
}

/**
 * Generic API fetch wrapper with token refresh interceptor
 * Automatically adds Bearer token to requests
 * Handles 401 by refreshing token and retrying
 */
export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { skipAuth = false, skipErrorHandling = false, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers || {});

  // Add Bearer token if not skipped
  if (!skipAuth) {
    const token = getStoredToken(TOKEN_KEY);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Set default content type if not set
  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  let response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Check if this is an authentication endpoint (login, register, refresh)
  const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/register');

  // Handle 401 - attempt token refresh
  if (response.status === 401 && !skipAuth && !isAuthEndpoint) {
    const storedRefreshToken = getStoredToken(REFRESH_TOKEN_KEY);

    if (storedRefreshToken && !endpoint.includes('/auth/refresh')) {
      try {
        // Try to refresh token
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: storedRefreshToken,
          }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const { access_token: newAccessToken, refresh_token: newRefreshToken } = refreshData;

          // Store new tokens in localStorage
          setStoredToken(TOKEN_KEY, newAccessToken);
          setStoredToken(REFRESH_TOKEN_KEY, newRefreshToken);

          // Retry original request with new token
          headers.set('Authorization', `Bearer ${newAccessToken}`);
          response = await fetch(url, {
            ...fetchOptions,
            headers,
          });
        } else {
          // Refresh failed - redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    } else if (!storedRefreshToken) {
      // No refresh token - redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }


  // Parse response
  let data: any;
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  // Handle non-OK responses
  if (!response.ok) {
    if (!skipErrorHandling) {
      const error = ErrorHandler.parseError({
        statusCode: response.status,
        message: data.message || data.error || 'An error occurred',
      });

      // Only redirect to login for non-auth endpoints (session expiration, etc.)
      // For auth endpoints (login, register), let the component handle the error
      if (error.action === 'REDIRECT_LOGIN' && typeof window !== 'undefined' && !isAuthEndpoint) {
        window.location.href = '/login';
      }

      throw error;
    } else {
      throw new Error(data.message || data.error || `HTTP ${response.status}`);
    }
  }

  return data as T;
}

/**
 * Short-hand for common HTTP methods
 */
export const api = {
  get: <T,>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),

  post: <T,>(endpoint: string, body?: any, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T,>(endpoint: string, body?: any, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T,>(endpoint: string, body?: any, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T,>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};

// Legacy export for backward compatibility
export const apiCall = apiFetch;
