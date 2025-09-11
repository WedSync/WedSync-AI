/**
 * LogRocket Integration for WS-151
 * User session recording with 10% sampling and wedding-day optimization
 */

import LogRocket from 'logrocket';
import { setupLogRocketReact } from 'logrocket-react';

interface LogRocketUserData {
  userId: string;
  email?: string;
  organizationId?: string;
  userType?: 'wedding_planner' | 'vendor' | 'couple' | 'guest' | 'admin';
  weddingId?: string;
  subscriptionTier?: string;
}

interface SessionConfig {
  samplingRate: number;
  weddingDaySamplingRate: number;
  enableNetworkCapture: boolean;
  enableDOMCapture: boolean;
  enableConsoleCapture: boolean;
}

export class LogRocketIntegrationService {
  private static instance: LogRocketIntegrationService;
  private initialized = false;
  private isWeddingDay = false;
  private currentSessionUrl?: string;
  private sessionData: Map<string, any> = new Map();
  private config: SessionConfig;

  private constructor() {
    this.isWeddingDay = process.env.NEXT_PUBLIC_WEDDING_DAY_MODE === 'true';
    this.config = this.getSessionConfig();
  }

  static getInstance(): LogRocketIntegrationService {
    if (!LogRocketIntegrationService.instance) {
      LogRocketIntegrationService.instance = new LogRocketIntegrationService();
    }
    return LogRocketIntegrationService.instance;
  }

  /**
   * Initialize LogRocket with optimized sampling
   */
  initializeLogRocket(): void {
    if (typeof window === 'undefined') return;
    if (this.initialized) return;
    if (!this.shouldEnableLogRocket()) return;

    const appId = process.env.NEXT_PUBLIC_LOGROCKET_APP_ID;
    if (!appId) {
      console.warn('LogRocket App ID not found - session recording disabled');
      return;
    }

    try {
      // Check sampling rate before initializing
      if (!this.shouldRecordSession()) {
        console.log('LogRocket: Session not selected for recording (sampling)');
        return;
      }

      // Initialize LogRocket
      LogRocket.init(appId, {
        // Network capture optimization
        network: {
          requestSanitizer: this.sanitizeNetworkRequests.bind(this),
          responseSanitizer: this.sanitizeNetworkResponses.bind(this),
          isEnabled: this.config.enableNetworkCapture,
        },

        // DOM capture optimization
        dom: {
          isEnabled: this.config.enableDOMCapture,
          // Reduce DOM capture on wedding day
          inputSanitizer: this.sanitizeDOMInputs.bind(this),
          textSanitizer: this.sanitizeDOMText.bind(this),
        },

        // Console capture
        console: {
          isEnabled: this.config.enableConsoleCapture,
          shouldAggregateConsoleErrors: !this.isWeddingDay,
        },

        // Performance optimization
        shouldCaptureIP: !this.isWeddingDay,
        shouldDebugLog: process.env.NODE_ENV !== 'production',
      });

      // Setup React integration
      setupLogRocketReact(LogRocket);

      this.initialized = true;

      // Get session URL for monitoring
      LogRocket.getSessionURL((sessionURL) => {
        this.currentSessionUrl = sessionURL;
        console.log('LogRocket session started:', sessionURL);
      });

      // Track initialization
      this.trackEvent('logrocket_initialized', {
        wedding_day_mode: this.isWeddingDay,
        sampling_rate: this.config.samplingRate,
        timestamp: Date.now(),
      });

      console.log('LogRocket initialized successfully', {
        weddingDayMode: this.isWeddingDay,
        samplingRate: this.config.samplingRate,
        networkCapture: this.config.enableNetworkCapture,
        domCapture: this.config.enableDOMCapture,
      });
    } catch (error) {
      console.error('Failed to initialize LogRocket:', error);
      this.initialized = false;
    }
  }

  /**
   * Get session configuration based on environment
   */
  private getSessionConfig(): SessionConfig {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      samplingRate: isProduction ? 0.1 : 0.5, // 10% in production, 50% in development
      weddingDaySamplingRate: 0.02, // 2% on wedding day
      enableNetworkCapture: !this.isWeddingDay,
      enableDOMCapture: !this.isWeddingDay || Math.random() < 0.1,
      enableConsoleCapture: !this.isWeddingDay,
    };
  }

  /**
   * Determine if LogRocket should be enabled
   */
  shouldEnableLogRocket(): boolean {
    // Disable completely on wedding day if performance is critical
    if (
      this.isWeddingDay &&
      process.env.DISABLE_LOGROCKET_WEDDING_DAY === 'true'
    ) {
      return false;
    }

    // Check if user has opted out
    if (typeof localStorage !== 'undefined') {
      const optOut = localStorage.getItem('logrocket-opt-out');
      if (optOut === 'true') {
        return false;
      }
    }

    return true;
  }

  /**
   * Determine if this session should be recorded based on sampling
   */
  private shouldRecordSession(): boolean {
    const samplingRate = this.isWeddingDay
      ? this.config.weddingDaySamplingRate
      : this.config.samplingRate;

    return Math.random() < samplingRate;
  }

  /**
   * Identify user for LogRocket session tracking
   */
  async identifyLogRocketUser(userData: LogRocketUserData): Promise<void> {
    if (!this.initialized) {
      console.warn('LogRocket not initialized - cannot identify user');
      return;
    }

    try {
      // Sanitize user data to remove sensitive information
      const sanitizedData = this.sanitizeUserData(userData);

      // Store user data for session context
      this.sessionData.set('user', sanitizedData);

      // Identify user in LogRocket
      LogRocket.identify(userData.userId, sanitizedData);

      // Track user identification
      this.trackEvent('user_identified', {
        user_type: userData.userType,
        organization_id: userData.organizationId,
        subscription_tier: userData.subscriptionTier,
        wedding_day_mode: this.isWeddingDay,
      });

      console.log('LogRocket user identified:', {
        userId: userData.userId,
        userType: userData.userType,
        weddingId: userData.weddingId,
      });
    } catch (error) {
      console.error('Failed to identify LogRocket user:', error);
    }
  }

  /**
   * Sanitize user data to remove sensitive information
   */
  private sanitizeUserData(userData: LogRocketUserData): Record<string, any> {
    const sanitized: Record<string, any> = {
      user_type: userData.userType,
      organization_id: userData.organizationId,
      subscription_tier: userData.subscriptionTier,
      wedding_id: userData.weddingId,
      identified_at: new Date().toISOString(),
    };

    // Only include email domain, not full email
    if (userData.email) {
      const emailDomain = userData.email.split('@')[1];
      sanitized.email_domain = emailDomain;
    }

    return sanitized;
  }

  /**
   * Sanitize network requests to remove sensitive data
   */
  private sanitizeNetworkRequests(request: any): any {
    if (!request) return request;

    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'x-api-key',
      'cookie',
      'set-cookie',
    ];
    if (request.headers) {
      sensitiveHeaders.forEach((header) => {
        delete request.headers[header];
      });
    }

    // Sanitize request body for specific endpoints
    if (request.body && typeof request.body === 'string') {
      try {
        const body = JSON.parse(request.body);
        const sanitized = this.sanitizeRequestBody(body, request.url);
        request.body = JSON.stringify(sanitized);
      } catch (error) {
        // If not JSON, leave as is but truncate if too long
        if (request.body.length > 1000) {
          request.body = request.body.substring(0, 1000) + '... [TRUNCATED]';
        }
      }
    }

    return request;
  }

  /**
   * Sanitize network responses to remove sensitive data
   */
  private sanitizeNetworkResponses(response: any): any {
    if (!response) return response;

    // Remove sensitive headers
    const sensitiveHeaders = ['set-cookie', 'x-api-key', 'authorization'];
    if (response.headers) {
      sensitiveHeaders.forEach((header) => {
        delete response.headers[header];
      });
    }

    // Sanitize response body
    if (response.body && typeof response.body === 'string') {
      try {
        const body = JSON.parse(response.body);
        const sanitized = this.sanitizeResponseBody(body);
        response.body = JSON.stringify(sanitized);
      } catch (error) {
        // If not JSON, truncate if too long
        if (response.body.length > 2000) {
          response.body = response.body.substring(0, 2000) + '... [TRUNCATED]';
        }
      }
    }

    return response;
  }

  /**
   * Sanitize request body based on URL patterns
   */
  private sanitizeRequestBody(body: any, url: string): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };

    // Common sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'api_key',
      'secret',
      'apiKey',
      'creditCard',
      'ssn',
      'socialSecurityNumber',
      'taxId',
    ];

    sensitiveFields.forEach((field) => {
      if (sensitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // URL-specific sanitization
    if (url.includes('/auth/')) {
      sanitized.password = '[REDACTED]';
      sanitized.confirmPassword = '[REDACTED]';
    }

    if (url.includes('/payment/')) {
      sanitized.cardNumber = '[REDACTED]';
      sanitized.cvv = '[REDACTED]';
      sanitized.expiryDate = '[REDACTED]';
    }

    return sanitized;
  }

  /**
   * Sanitize response body to remove sensitive information
   */
  private sanitizeResponseBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };

    // Remove tokens and sensitive data
    const sensitiveFields = [
      'accessToken',
      'refreshToken',
      'token',
      'apiKey',
      'password',
      'hash',
      'salt',
      'secret',
    ];

    const sanitizeObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;

      if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeObject(item));
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (
          sensitiveFields.some((field) =>
            key.toLowerCase().includes(field.toLowerCase()),
          )
        ) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Sanitize DOM inputs to remove sensitive data
   */
  private sanitizeDOMInputs(input: any): any {
    if (!input) return input;

    // Redact sensitive input types
    const sensitiveTypes = ['password', 'email', 'tel', 'ssn', 'credit-card'];
    const sensitiveNames = ['password', 'email', 'phone', 'ssn', 'card', 'cvv'];

    if (input.type && sensitiveTypes.includes(input.type.toLowerCase())) {
      input.value = '[REDACTED]';
    }

    if (
      input.name &&
      sensitiveNames.some((name) => input.name.toLowerCase().includes(name))
    ) {
      input.value = '[REDACTED]';
    }

    return input;
  }

  /**
   * Sanitize DOM text content
   */
  private sanitizeDOMText(text: string): string {
    if (!text || typeof text !== 'string') return text;

    // Wedding day optimization - redact more aggressively
    if (this.isWeddingDay && text.length > 100) {
      return '[REDACTED_WEDDING_DAY]';
    }

    // Redact patterns that look like sensitive data
    let sanitized = text;

    // Credit card numbers
    sanitized = sanitized.replace(
      /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g,
      '[CARD_REDACTED]',
    );

    // SSN patterns
    sanitized = sanitized.replace(/\d{3}-\d{2}-\d{4}/g, '[SSN_REDACTED]');

    // Email addresses (partial)
    sanitized = sanitized.replace(
      /[\w._%+-]+@[\w.-]+\.[A-Z]{2,}/gi,
      '[EMAIL_REDACTED]',
    );

    // Phone numbers
    sanitized = sanitized.replace(
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      '[PHONE_REDACTED]',
    );

    return sanitized;
  }

  /**
   * Track custom events in LogRocket
   */
  trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (!this.initialized) return;

    try {
      const eventData = {
        ...properties,
        wedding_day_mode: this.isWeddingDay,
        timestamp: Date.now(),
        session_url: this.currentSessionUrl,
      };

      LogRocket.track(eventName, eventData);

      // Store event for session context
      if (!this.sessionData.has('events')) {
        this.sessionData.set('events', []);
      }

      const events = this.sessionData.get('events');
      events.push({ name: eventName, data: eventData, timestamp: Date.now() });

      // Keep only recent events to prevent memory bloat
      if (events.length > 50) {
        events.shift();
      }
    } catch (error) {
      console.error('Failed to track LogRocket event:', error);
    }
  }

  /**
   * Capture exception in LogRocket
   */
  captureException(error: Error, additionalInfo?: Record<string, any>): void {
    if (!this.initialized) return;

    try {
      LogRocket.captureException(error, additionalInfo);

      this.trackEvent('exception_captured', {
        error_name: error.name,
        error_message: error.message,
        additional_info: additionalInfo,
        stack_available: !!error.stack,
      });
    } catch (logRocketError) {
      console.error(
        'Failed to capture exception in LogRocket:',
        logRocketError,
      );
    }
  }

  /**
   * Get current session information
   */
  getSessionInfo(): {
    initialized: boolean;
    sessionUrl?: string;
    weddingDayMode: boolean;
    samplingRate: number;
    config: SessionConfig;
  } {
    return {
      initialized: this.initialized,
      sessionUrl: this.currentSessionUrl,
      weddingDayMode: this.isWeddingDay,
      samplingRate: this.isWeddingDay
        ? this.config.weddingDaySamplingRate
        : this.config.samplingRate,
      config: this.config,
    };
  }

  /**
   * Stop session recording (for privacy or performance reasons)
   */
  stopRecording(): void {
    if (!this.initialized) return;

    try {
      LogRocket.stopRecording();
      this.trackEvent('recording_stopped', {
        reason: 'manual_stop',
        session_duration:
          Date.now() - (this.sessionData.get('start_time') || Date.now()),
      });
    } catch (error) {
      console.error('Failed to stop LogRocket recording:', error);
    }
  }
}

// Export singleton instance and convenience functions
export const logRocketIntegration = LogRocketIntegrationService.getInstance();

export const initializeLogRocket = () => {
  logRocketIntegration.initializeLogRocket();
};

export const identifyLogRocketUser = (userData: LogRocketUserData) => {
  return logRocketIntegration.identifyLogRocketUser(userData);
};

export const shouldEnableLogRocket = () => {
  return logRocketIntegration.shouldEnableLogRocket();
};

// Auto-initialize if running in browser and app ID is available
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_LOGROCKET_APP_ID) {
  // Small delay to ensure proper initialization order
  setTimeout(() => {
    initializeLogRocket();
  }, 100);
}
