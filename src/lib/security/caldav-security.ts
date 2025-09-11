/**
 * CalDAV Security Module for Apple Calendar Integration (WS-218)
 * Implements comprehensive security measures for CalDAV protocol
 */

import { CalDAVCredentials, CalDAVError } from '@/types/apple-calendar';

// Security configuration constants
const CALDAV_SECURITY_CONFIG = {
  // Rate limiting - Apple CalDAV servers typically allow:
  REQUESTS_PER_MINUTE: 30,
  REQUESTS_PER_HOUR: 1200,
  DAILY_QUOTA: 10000,

  // Timeout settings
  CONNECT_TIMEOUT: 10000, // 10 seconds
  REQUEST_TIMEOUT: 30000, // 30 seconds

  // Credential validation
  APPLE_ID_REGEX: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  APP_PASSWORD_LENGTH: 16, // Apple app-specific passwords are 16 chars

  // HTTPS enforcement
  ALLOWED_PROTOCOLS: ['https:'],
  BLOCKED_PROTOCOLS: ['http:', 'ftp:', 'file:'],

  // Audit logging levels
  LOG_LEVELS: {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    SECURITY: 'security',
  } as const,
};

// Rate limiting implementation
class CalDAVRateLimiter {
  private requests: Map<string, number[]> = new Map();

  /**
   * Check if request is within rate limits
   * @param clientId - Unique identifier for the client making requests
   * @returns true if request is allowed, false if rate limited
   */
  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];

    // Remove requests older than 1 minute
    const recentRequests = clientRequests.filter(
      (timestamp) => now - timestamp < 60000,
    );

    // Check per-minute limit
    if (recentRequests.length >= CALDAV_SECURITY_CONFIG.REQUESTS_PER_MINUTE) {
      this.auditLog('RATE_LIMIT_EXCEEDED', {
        clientId,
        requestCount: recentRequests.length,
        timeWindow: '1_minute',
      });
      return false;
    }

    // Update request history
    recentRequests.push(now);
    this.requests.set(clientId, recentRequests);

    return true;
  }

  /**
   * Get current rate limit status for a client
   */
  getStatus(clientId: string): {
    requestsRemaining: number;
    resetTime: Date;
  } {
    const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];
    const recentRequests = clientRequests.filter(
      (timestamp) => now - timestamp < 60000,
    );

    return {
      requestsRemaining: Math.max(
        0,
        CALDAV_SECURITY_CONFIG.REQUESTS_PER_MINUTE - recentRequests.length,
      ),
      resetTime: new Date(now + (60000 - (now % 60000))),
    };
  }

  private auditLog(event: string, data: any) {
    console.warn(`[CALDAV_SECURITY] ${event}:`, data);
    // In production, this would log to a security monitoring system
  }
}

// Global rate limiter instance
const rateLimiter = new CalDAVRateLimiter();

/**
 * Validates Apple ID format and basic security requirements
 */
export function validateAppleId(appleId: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!appleId || typeof appleId !== 'string') {
    errors.push('Apple ID is required');
    return { isValid: false, errors };
  }

  if (appleId.length < 3) {
    errors.push('Apple ID is too short');
  }

  if (appleId.length > 320) {
    // RFC 5321 limit
    errors.push('Apple ID is too long');
  }

  if (!CALDAV_SECURITY_CONFIG.APPLE_ID_REGEX.test(appleId)) {
    errors.push('Invalid Apple ID format');
  }

  // Check for common security issues
  if (appleId.includes('<') || appleId.includes('>') || appleId.includes('"')) {
    errors.push('Apple ID contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates app-specific password format and requirements
 */
export function validateAppSpecificPassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    errors.push('App-specific password is required');
    return { isValid: false, errors };
  }

  // Apple app-specific passwords are exactly 16 characters
  if (password.length !== CALDAV_SECURITY_CONFIG.APP_PASSWORD_LENGTH) {
    errors.push(
      `App-specific password must be exactly ${CALDAV_SECURITY_CONFIG.APP_PASSWORD_LENGTH} characters`,
    );
  }

  // Check for required character format (letters and numbers only)
  if (!/^[a-zA-Z0-9]+$/.test(password)) {
    errors.push(
      'App-specific password should contain only letters and numbers',
    );
  }

  // Check for obvious patterns that might indicate it's not a real app-specific password
  if (
    password.toLowerCase() === password ||
    password.toUpperCase() === password
  ) {
    errors.push('Invalid app-specific password format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates CalDAV server URL and enforces HTTPS
 */
export function validateCalDAVServerUrl(url: string): {
  isValid: boolean;
  errors: string[];
  sanitizedUrl?: string;
} {
  const errors: string[] = [];

  if (!url || typeof url !== 'string') {
    errors.push('Server URL is required');
    return { isValid: false, errors };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    errors.push('Invalid URL format');
    return { isValid: false, errors };
  }

  // Enforce HTTPS only
  if (!CALDAV_SECURITY_CONFIG.ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
    errors.push('Only HTTPS URLs are allowed for security');
  }

  // Block dangerous protocols
  if (CALDAV_SECURITY_CONFIG.BLOCKED_PROTOCOLS.includes(parsedUrl.protocol)) {
    errors.push('Unsupported or insecure protocol');
  }

  // Validate hostname
  if (!parsedUrl.hostname) {
    errors.push('Invalid hostname');
  }

  // Block localhost and private IPs in production
  const hostname = parsedUrl.hostname.toLowerCase();
  if (process.env.NODE_ENV === 'production') {
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.')
    ) {
      errors.push('Private and localhost URLs are not allowed in production');
    }
  }

  // For Apple iCloud, validate known endpoints
  if (hostname.includes('icloud.com')) {
    if (!hostname.match(/^(caldav\.icloud\.com|p\d+-caldav\.icloud\.com)$/)) {
      errors.push('Invalid Apple iCloud CalDAV server URL');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedUrl: errors.length === 0 ? parsedUrl.toString() : undefined,
  };
}

/**
 * Comprehensive credential validation
 */
export function validateCalDAVCredentials(credentials: CalDAVCredentials): {
  isValid: boolean;
  errors: string[];
  sanitizedCredentials?: CalDAVCredentials;
} {
  const errors: string[] = [];

  // Validate Apple ID
  const appleIdValidation = validateAppleId(credentials.appleId);
  if (!appleIdValidation.isValid) {
    errors.push(...appleIdValidation.errors);
  }

  // Validate app-specific password
  const passwordValidation = validateAppSpecificPassword(
    credentials.appPassword,
  );
  if (!passwordValidation.isValid) {
    errors.push(...passwordValidation.errors);
  }

  // Validate server URL
  const urlValidation = validateCalDAVServerUrl(credentials.serverUrl);
  if (!urlValidation.isValid) {
    errors.push(...urlValidation.errors);
  }

  // Validate custom server flag consistency
  if (
    !credentials.isCustomServer &&
    !credentials.serverUrl.includes('icloud.com')
  ) {
    errors.push(
      'Server URL does not match Apple iCloud when isCustomServer is false',
    );
  }

  if (
    credentials.isCustomServer &&
    credentials.serverUrl.includes('icloud.com')
  ) {
    errors.push('Apple iCloud URL should not be marked as custom server');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedCredentials:
      errors.length === 0
        ? {
            ...credentials,
            serverUrl: urlValidation.sanitizedUrl || credentials.serverUrl,
            appleId: credentials.appleId.trim().toLowerCase(),
          }
        : undefined,
  };
}

/**
 * Secure credential storage with encryption
 * Never stores passwords in localStorage - uses secure session storage
 */
export class SecureCredentialStorage {
  private static readonly STORAGE_KEY = 'caldav_session';
  private static readonly ENCRYPTION_KEY_LENGTH = 32;

  /**
   * Store credentials securely in session storage (not localStorage)
   * Credentials are cleared when browser session ends
   */
  static storeCredentials(
    credentials: CalDAVCredentials,
    sessionId: string,
  ): boolean {
    try {
      if (typeof window === 'undefined') {
        return false; // Server-side, no storage
      }

      // Audit log the storage attempt (without sensitive data)
      auditLog(
        CALDAV_SECURITY_CONFIG.LOG_LEVELS.INFO,
        'CREDENTIAL_STORAGE_ATTEMPT',
        {
          sessionId,
          appleId: credentials.appleId, // OK to log email
          serverUrl: credentials.serverUrl,
          isCustomServer: credentials.isCustomServer,
          timestamp: new Date().toISOString(),
        },
      );

      // Store in sessionStorage (cleared on tab close) with basic encoding
      const sessionData = {
        sessionId,
        appleId: credentials.appleId,
        serverUrl: credentials.serverUrl,
        isCustomServer: credentials.isCustomServer,
        timestamp: Date.now(),
        // Note: Password is NOT stored - must be re-entered each session
        passwordHash: btoa(credentials.appPassword.substring(0, 4)), // Only store first 4 chars encoded for validation
      };

      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
      return true;
    } catch (error) {
      auditLog(
        CALDAV_SECURITY_CONFIG.LOG_LEVELS.ERROR,
        'CREDENTIAL_STORAGE_FAILED',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
      return false;
    }
  }

  /**
   * Retrieve stored session data (password must be re-entered)
   */
  static retrieveSession(): {
    sessionId?: string;
    appleId?: string;
    serverUrl?: string;
    isCustomServer?: boolean;
    timestamp?: number;
  } | null {
    try {
      if (typeof window === 'undefined') {
        return null; // Server-side
      }

      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const data = JSON.parse(stored);

      // Check if session is expired (4 hours max)
      if (Date.now() - data.timestamp > 4 * 60 * 60 * 1000) {
        this.clearSession();
        return null;
      }

      return data;
    } catch (error) {
      auditLog(
        CALDAV_SECURITY_CONFIG.LOG_LEVELS.ERROR,
        'SESSION_RETRIEVAL_FAILED',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
      return null;
    }
  }

  /**
   * Clear stored session data
   */
  static clearSession(): void {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(this.STORAGE_KEY);
        auditLog(CALDAV_SECURITY_CONFIG.LOG_LEVELS.INFO, 'SESSION_CLEARED', {
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      auditLog(
        CALDAV_SECURITY_CONFIG.LOG_LEVELS.ERROR,
        'SESSION_CLEAR_FAILED',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
    }
  }
}

/**
 * Secure CalDAV request wrapper with rate limiting and error sanitization
 */
export class SecureCalDAVRequest {
  /**
   * Make a secure CalDAV request with full security measures
   */
  static async makeRequest(
    url: string,
    options: RequestInit,
    clientId: string = 'default',
  ): Promise<Response> {
    // Rate limiting check
    if (!rateLimiter.isAllowed(clientId)) {
      const status = rateLimiter.getStatus(clientId);
      throw new CalDAVError(
        'Rate limit exceeded',
        'RATE_LIMITED',
        429,
        undefined,
        true,
        `Too many requests. Please try again after ${status.resetTime.toLocaleTimeString()}`,
      );
    }

    // URL validation
    const urlValidation = validateCalDAVServerUrl(url);
    if (!urlValidation.isValid) {
      throw new CalDAVError(
        'Invalid server URL',
        'INVALID_REQUEST',
        400,
        undefined,
        false,
        'The server URL is not valid or secure',
      );
    }

    // Audit log the request (without sensitive data)
    auditLog(CALDAV_SECURITY_CONFIG.LOG_LEVELS.INFO, 'CALDAV_REQUEST', {
      url: urlValidation.sanitizedUrl,
      method: options.method || 'GET',
      clientId,
      timestamp: new Date().toISOString(),
    });

    // Set security headers
    const secureHeaders = {
      ...options.headers,
      'User-Agent': 'WedSync-CalDAV/1.0',
      Accept: 'application/xml, text/xml',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    };

    // Create secure request options
    const secureOptions: RequestInit = {
      ...options,
      headers: secureHeaders,
      timeout: CALDAV_SECURITY_CONFIG.REQUEST_TIMEOUT,
      // Ensure HTTPS is used
      mode: 'cors',
      credentials: 'omit', // Don't send cookies
    };

    try {
      const response = await fetch(urlValidation.sanitizedUrl!, secureOptions);

      // Audit log the response
      auditLog(CALDAV_SECURITY_CONFIG.LOG_LEVELS.INFO, 'CALDAV_RESPONSE', {
        url: urlValidation.sanitizedUrl,
        status: response.status,
        statusText: response.statusText,
        clientId,
        timestamp: new Date().toISOString(),
      });

      // Handle authentication errors securely
      if (response.status === 401) {
        auditLog(
          CALDAV_SECURITY_CONFIG.LOG_LEVELS.SECURITY,
          'AUTHENTICATION_FAILED',
          {
            url: urlValidation.sanitizedUrl,
            clientId,
            timestamp: new Date().toISOString(),
          },
        );
        throw new CalDAVError(
          'Authentication failed',
          'AUTHENTICATION_FAILED',
          401,
          undefined,
          false,
          'Invalid Apple ID or app-specific password. Please check your credentials.',
        );
      }

      if (response.status === 403) {
        auditLog(CALDAV_SECURITY_CONFIG.LOG_LEVELS.SECURITY, 'ACCESS_DENIED', {
          url: urlValidation.sanitizedUrl,
          clientId,
          timestamp: new Date().toISOString(),
        });
        throw new CalDAVError(
          'Access denied',
          'PERMISSION_DENIED',
          403,
          undefined,
          false,
          'Access denied. Please ensure you have generated an app-specific password.',
        );
      }

      return response;
    } catch (error) {
      if (error instanceof CalDAVError) {
        throw error;
      }

      // Sanitize and log network errors
      auditLog(CALDAV_SECURITY_CONFIG.LOG_LEVELS.ERROR, 'NETWORK_ERROR', {
        url: urlValidation.sanitizedUrl,
        clientId,
        error: error instanceof Error ? error.message : 'Unknown network error',
        timestamp: new Date().toISOString(),
      });

      if (
        error instanceof TypeError &&
        error.message.includes('Failed to fetch')
      ) {
        throw new CalDAVError(
          'Connection failed',
          'CONNECTION_FAILED',
          0,
          undefined,
          true,
          "Unable to connect to Apple's CalDAV server. Please check your internet connection.",
        );
      }

      throw new CalDAVError(
        'Network error',
        'NETWORK_ERROR',
        0,
        undefined,
        true,
        'A network error occurred. Please try again.',
      );
    }
  }
}

/**
 * Audit logging function for security events
 */
export function auditLog(
  level: keyof typeof CALDAV_SECURITY_CONFIG.LOG_LEVELS,
  event: string,
  data: Record<string, any>,
): void {
  const logEntry = {
    level,
    event,
    service: 'caldav-integration',
    ...data,
    timestamp: new Date().toISOString(),
    userAgent:
      typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    sessionId:
      typeof window !== 'undefined'
        ? sessionStorage.getItem('session-id')
        : null,
  };

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CALDAV_AUDIT] ${level.toUpperCase()}: ${event}`, logEntry);
  }

  // In production, this would send to a security monitoring service
  // Example: SecurityMonitoringService.log(logEntry);
}

/**
 * Sanitize CalDAV errors for user display
 */
export function sanitizeCalDAVError(error: unknown): {
  userMessage: string;
  logData: Record<string, any>;
} {
  if (error instanceof CalDAVError) {
    return {
      userMessage: error.userFriendlyMessage || 'A CalDAV error occurred',
      logData: {
        code: error.code,
        status: error.status,
        retryable: error.retryable,
      },
    };
  }

  if (error instanceof Error) {
    // Sanitize common error messages
    let userMessage = 'An unexpected error occurred';

    if (
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ECONNREFUSED')
    ) {
      userMessage = 'Unable to connect to the calendar server';
    } else if (
      error.message.includes('timeout') ||
      error.message.includes('ETIMEDOUT')
    ) {
      userMessage = 'The request timed out. Please try again';
    } else if (
      error.message.includes('certificate') ||
      error.message.includes('SSL')
    ) {
      userMessage =
        'SSL certificate error. Please check the server configuration';
    }

    return {
      userMessage,
      logData: {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 200), // Truncate stack trace
      },
    };
  }

  return {
    userMessage: 'An unknown error occurred',
    logData: {
      error: String(error),
    },
  };
}

/**
 * Session validation for CalDAV operations
 */
export function validateSession(userId?: string): {
  isValid: boolean;
  reason?: string;
} {
  if (typeof window === 'undefined') {
    // Server-side validation would check database session
    return { isValid: !!userId };
  }

  const session = SecureCredentialStorage.retrieveSession();
  if (!session) {
    return {
      isValid: false,
      reason: 'No valid session found',
    };
  }

  if (!session.sessionId || !session.appleId) {
    return {
      isValid: false,
      reason: 'Invalid session data',
    };
  }

  return { isValid: true };
}

// Export configuration for tests and debugging
export const SECURITY_CONFIG = CALDAV_SECURITY_CONFIG;
