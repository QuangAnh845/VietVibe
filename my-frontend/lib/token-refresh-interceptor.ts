import { useTokenStorage } from '@/hooks/useTokenStorage';

/**
 * Token Refresh Interceptor
 * Detects 401 responses and automatically attempts to refresh token
 */
export class TokenRefreshInterceptor {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  /**
   * Subscribe to token refresh completion
   */
  private subscribeTokenRefresh(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  /**
   * Notify subscribers when token is refreshed
   */
  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(apiBase: string): Promise<string | null> {
    try {
      const { refreshToken } = useTokenStorage();
      const storedRefreshToken = refreshToken.get();

      if (!storedRefreshToken) {
        return null;
      }

      const response = await fetch(`${apiBase}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: storedRefreshToken,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const { accessToken, refreshToken: newRefreshToken } = data;

      // Store new tokens
      useTokenStorage().accessToken.set(accessToken);
      useTokenStorage().refreshToken.set(newRefreshToken);

      return accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  /**
   * Intercept fetch requests - add Bearer token
   */
  async interceptRequest(config: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<{ url: string; options: RequestInit }> {
    const { accessToken } = useTokenStorage();
    const token = accessToken.get();

    const options: RequestInit = {
      method: config.method || 'GET',
      headers: {
        ...config.headers,
      },
    };

    if (token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    if (config.body) {
      options.body = config.body;
    }

    return { url: config.url, options };
  }

  /**
   * Intercept fetch response - handle 401
   */
  async interceptResponse(
    response: Response,
    originalRequest: { url: string; options: RequestInit },
    apiBase: string,
  ): Promise<Response> {
    // Not a 401 - return as-is
    if (response.status !== 401) {
      return response;
    }

    // Check if this is already a refresh attempt (prevent infinite loop)
    if (originalRequest.url.includes('/auth/refresh')) {
      return response;
    }

    // If already refreshing, wait for completion
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.subscribeTokenRefresh((token: string) => {
          // Update Authorization header with new token
          const newOptions = { ...originalRequest.options };
          newOptions.headers = {
            ...(newOptions.headers as Record<string, string>),
            Authorization: `Bearer ${token}`,
          };

          // Retry original request
          fetch(originalRequest.url, newOptions).then(resolve);
        });
      });
    }

    // Start refresh process
    this.isRefreshing = true;

    try {
      const newAccessToken = await this.refreshAccessToken(apiBase);

      if (!newAccessToken) {
        // Refresh failed - redirect to login
        window.location.href = '/login';
        this.isRefreshing = false;
        return response;
      }

      // Token refreshed successfully
      this.onRefreshed(newAccessToken);

      // Retry original request with new token
      const newOptions = { ...originalRequest.options };
      newOptions.headers = {
        ...(newOptions.headers as Record<string, string>),
        Authorization: `Bearer ${newAccessToken}`,
      };

      const retryResponse = await fetch(originalRequest.url, newOptions);
      this.isRefreshing = false;
      return retryResponse;
    } catch (error) {
      console.error('Token refresh interceptor error:', error);
      this.isRefreshing = false;
      window.location.href = '/login';
      return response;
    }
  }
}

// Export singleton instance
export const tokenRefreshInterceptor = new TokenRefreshInterceptor();
