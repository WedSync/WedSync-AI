interface CSRFTokenResponse {
  token: string;
  expiresAt: string;
  refreshed?: boolean;
}

export class CSRFClient {
  private static token: string | null = null;
  private static expiresAt: Date | null = null;

  /**
   * Get current CSRF token, fetching if necessary
   */
  static async getToken(): Promise<string> {
    // Check if we have a valid token
    if (this.token && this.expiresAt && new Date() < this.expiresAt) {
      return this.token;
    }

    // Fetch new token
    await this.refreshToken();
    return this.token!;
  }

  /**
   * Refresh CSRF token from server
   */
  static async refreshToken(): Promise<void> {
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch CSRF token: ${response.status} ${response.statusText}`,
        );
      }

      const data: CSRFTokenResponse = await response.json();
      this.token = data.token;
      this.expiresAt = new Date(data.expiresAt);
    } catch (error) {
      console.error('CSRF token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Add CSRF token to fetch request headers
   */
  static async addTokenToHeaders(
    headers: HeadersInit = {},
  ): Promise<HeadersInit> {
    const token = await this.getToken();
    const headersObject = new Headers(headers);
    headersObject.set('X-CSRF-Token', token);
    return headersObject;
  }

  /**
   * Enhanced fetch with automatic CSRF token inclusion
   */
  static async secureFetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    // Only add CSRF token for state-changing methods
    if (
      options.method &&
      ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method)
    ) {
      try {
        options.headers = await this.addTokenToHeaders(options.headers);
      } catch (error) {
        console.error('Failed to add CSRF token to request:', error);
        throw error;
      }
    }

    // Ensure cookies are sent
    options.credentials = options.credentials || 'same-origin';

    // Make the request
    const response = await fetch(url, options);

    // If we get a CSRF error, try refreshing the token and retrying once
    if (response.status === 403) {
      try {
        const errorData = await response.clone().json();
        if (errorData.code && errorData.code.startsWith('CSRF_TOKEN_')) {
          console.warn('CSRF token invalid, attempting refresh and retry');

          // Clear the current token and refresh
          this.token = null;
          this.expiresAt = null;

          if (
            options.method &&
            ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method)
          ) {
            options.headers = await this.addTokenToHeaders(options.headers);
          }

          return fetch(url, options);
        }
      } catch {
        // If we can't parse the error, just return the original response
      }
    }

    return response;
  }

  /**
   * Get CSRF token from cookie (for forms)
   */
  static getTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find((cookie) =>
      cookie.trim().startsWith('csrf-token='),
    );

    return csrfCookie ? decodeURIComponent(csrfCookie.split('=')[1]) : null;
  }

  /**
   * Initialize CSRF token on page load
   */
  static async initialize(): Promise<void> {
    try {
      // Try to get token from cookie first
      const cookieToken = this.getTokenFromCookie();
      if (cookieToken) {
        this.token = cookieToken;
        // Estimate expiry (we don't have exact time, so assume 25 minutes remaining)
        this.expiresAt = new Date(Date.now() + 25 * 60 * 1000);
      }

      // If no cookie token or it's close to expiry, fetch new one
      if (
        !this.token ||
        !this.expiresAt ||
        this.expiresAt.getTime() - Date.now() < 5 * 60 * 1000
      ) {
        await this.refreshToken();
      }
    } catch (error) {
      console.error('CSRF initialization failed:', error);
      // Don't throw here, as the app should still function
    }
  }

  /**
   * Clear stored token (useful for logout)
   */
  static clearToken(): void {
    this.token = null;
    this.expiresAt = null;
  }
}
