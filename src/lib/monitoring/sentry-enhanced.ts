/**
 * Enhanced Sentry Configuration for WS-151
 * Session replay, wedding-day optimization, and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';

interface WeddingErrorContext {
  weddingId?: string;
  vendorId?: string;
  eventType?:
    | 'ceremony_timeline'
    | 'vendor_coordination'
    | 'guest_management'
    | 'payment_processing';
  criticalLevel?: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: number;
}

interface SentryConfig {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
  integrations: any[];
  beforeSend?: (event: any, hint: any) => any | null;
  transport?: any;
}

export class EnhancedSentryService {
  private static instance: EnhancedSentryService;
  private initialized = false;
  private isWeddingDay = false;
  private errorCount = 0;
  private sessionId?: string;

  private constructor() {
    this.isWeddingDay = process.env.NEXT_PUBLIC_WEDDING_DAY_MODE === 'true';
  }

  static getInstance(): EnhancedSentryService {
    if (!EnhancedSentryService.instance) {
      EnhancedSentryService.instance = new EnhancedSentryService();
    }
    return EnhancedSentryService.instance;
  }

  /**
   * Initialize Enhanced Sentry with session replay and wedding-day optimizations
   */
  initializeEnhancedSentry(): void {
    if (this.initialized) return;

    const config = this.getSentryConfig();

    try {
      Sentry.init(config);
      this.initialized = true;
      this.sessionId = this.generateSessionId();

      // Set up wedding-specific context
      Sentry.setContext('wedding_mode', {
        enabled: this.isWeddingDay,
        session_id: this.sessionId,
        performance_mode: this.isWeddingDay ? 'minimal' : 'standard',
      });

      console.log('Enhanced Sentry initialized', {
        weddingDayMode: this.isWeddingDay,
        sessionReplay: config.replaysSessionSampleRate > 0,
        tracesSampling: config.tracesSampleRate,
      });
    } catch (error) {
      console.error('Failed to initialize Enhanced Sentry:', error);
      this.initialized = false;
    }
  }

  /**
   * Get optimized Sentry configuration based on environment
   */
  getSentryConfig(): SentryConfig {
    const isProduction = process.env.NODE_ENV === 'production';
    const dsn = process.env.SENTRY_DSN;

    if (!dsn) {
      throw new Error('SENTRY_DSN environment variable is required');
    }

    // Dynamic sampling rates based on wedding day mode
    const baseConfig: SentryConfig = {
      dsn,
      environment: this.isWeddingDay
        ? 'wedding-day'
        : isProduction
          ? 'production'
          : 'development',

      // Ultra-low sampling for wedding day to minimize performance impact
      tracesSampleRate: this.isWeddingDay ? 0.01 : isProduction ? 0.1 : 0.5,

      // Session replay sampling - critical for debugging but performance sensitive
      replaysSessionSampleRate: this.isWeddingDay
        ? 0.001
        : isProduction
          ? 0.1
          : 0.3,
      replaysOnErrorSampleRate: this.isWeddingDay ? 0.1 : 1.0,

      integrations: this.getOptimizedIntegrations(),
      beforeSend: this.createBeforeSendHandler(),
    };

    // Add performance transport for wedding day
    if (this.isWeddingDay) {
      baseConfig.transport = this.createOptimizedTransport();
    }

    return baseConfig;
  }

  /**
   * Get optimized Sentry integrations
   */
  private getOptimizedIntegrations(): any[] {
    const integrations = [];

    // Session Replay - optimized for performance
    integrations.push(
      Sentry.replayIntegration({
        // Reduce data collection on wedding day
        maskAllText: this.isWeddingDay,
        blockAllMedia: this.isWeddingDay,
        maskAllInputs: true,

        // Network optimization
        networkDetailAllowUrls: [
          typeof window !== 'undefined' ? window.location.origin : '',
          '/api/critical',
          '/api/booking',
          '/api/rsvp',
        ],

        // Reduce DOM capture frequency for performance
        maskFn: (text) => {
          if (this.isWeddingDay && text.length > 50) {
            return '[REDACTED_WEDDING_DAY]';
          }
          return text.length > 200 ? '[TRUNCATED]' : text;
        },

        // Session replay optimization
        sampleRate: this.isWeddingDay ? 0.001 : 0.1,
        errorSampleRate: this.isWeddingDay ? 0.1 : 1.0,
      }),
    );

    // Browser Tracing - conditional on wedding day
    if (!this.isWeddingDay || Math.random() < 0.01) {
      integrations.push(
        Sentry.browserTracingIntegration({
          // Only trace critical routes on wedding day
          tracingOrigins: this.isWeddingDay
            ? [window.location?.origin + '/api/critical']
            : ['localhost', window.location?.origin || '', /^\/api/],

          routingInstrumentation:
            typeof window !== 'undefined'
              ? Sentry.reactRouterV6Instrumentation(
                  React.useEffect,
                  useLocation,
                  useNavigationType,
                  createRoutesFromChildren,
                  matchRoutes,
                )
              : undefined,
        }),
      );
    }

    // HTTP Integration with smart filtering
    integrations.push(
      Sentry.httpIntegration({
        // Only monitor critical endpoints on wedding day
        tracingOrigins: this.isWeddingDay
          ? ['/api/critical', '/api/booking', '/api/rsvp']
          : [/^\/api/],
        breadcrumbs: !this.isWeddingDay,
      }),
    );

    return integrations;
  }

  /**
   * Create optimized before-send handler
   */
  private createBeforeSendHandler() {
    return (event: any, hint: any) => {
      // Increment error count for monitoring
      this.errorCount++;

      // On wedding day, only process critical errors
      if (this.isWeddingDay) {
        const isCritical = this.isCriticalError(event, hint);
        if (!isCritical && event.level !== 'error' && event.level !== 'fatal') {
          return null; // Drop non-critical events
        }
      }

      // Truncate large payloads to reduce network impact
      if (event.extra && JSON.stringify(event.extra).length > 10000) {
        event.extra = {
          truncated: 'Payload truncated for performance',
          originalKeys: Object.keys(event.extra),
          truncatedAt: new Date().toISOString(),
        };
      }

      // Add wedding-specific context
      if (event.tags) {
        event.tags.wedding_day_mode = this.isWeddingDay.toString();
        event.tags.error_sequence = this.errorCount.toString();
        event.tags.session_id = this.sessionId;
      }

      // Rate limiting for high-frequency errors
      if (this.errorCount > 100 && this.isWeddingDay) {
        console.warn('Error rate limit reached in wedding day mode');
        return null;
      }

      return event;
    };
  }

  /**
   * Create optimized transport for wedding day
   */
  private createOptimizedTransport() {
    return Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport, {
      shouldStore: () => true,
      maxQueueSize: this.isWeddingDay ? 10 : 100,
      flushAtStartup: !this.isWeddingDay,
    });
  }

  /**
   * Determine if error is critical for wedding day
   */
  private isCriticalError(event: any, hint: any): boolean {
    const criticalPatterns = [
      'payment',
      'booking',
      'authentication',
      'database',
      'stripe',
      'critical',
      'wedding_day',
      'ceremony',
      'vendor_coordination',
    ];

    const message = event.message || event.exception?.values?.[0]?.value || '';
    const type = event.exception?.values?.[0]?.type || event.level || '';

    return criticalPatterns.some(
      (pattern) =>
        message.toLowerCase().includes(pattern) ||
        type.toLowerCase().includes(pattern),
    );
  }

  /**
   * Capture wedding-specific errors with enhanced context
   */
  captureWeddingError(error: Error, context?: WeddingErrorContext): string {
    const errorId = `wedding_error_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const enhancedContext = {
      ...context,
      timestamp: context?.timestamp || Date.now(),
      session_id: this.sessionId,
      error_sequence: this.errorCount + 1,
      wedding_day_mode: this.isWeddingDay,
    };

    // Set Sentry context
    Sentry.withScope((scope) => {
      scope.setContext('wedding_error', enhancedContext);
      scope.setTag('error_type', 'wedding');
      scope.setTag('critical_level', context?.criticalLevel || 'medium');
      scope.setTag('event_type', context?.eventType || 'unknown');

      if (context?.weddingId) {
        scope.setTag('wedding_id', context.weddingId);
      }

      if (context?.vendorId) {
        scope.setTag('vendor_id', context.vendorId);
      }

      scope.setLevel(
        this.mapCriticalLevelToSentryLevel(context?.criticalLevel),
      );

      Sentry.captureException(error, {
        fingerprint: [errorId],
        contexts: {
          wedding: enhancedContext,
        },
      });
    });

    // Console logging for immediate visibility
    if (context?.criticalLevel === 'critical' || this.isWeddingDay) {
      console.error('CRITICAL WEDDING ERROR:', {
        errorId,
        message: error.message,
        context: enhancedContext,
      });
    }

    return errorId;
  }

  /**
   * Map critical level to Sentry severity
   */
  private mapCriticalLevelToSentryLevel(level?: string): Sentry.SeverityLevel {
    switch (level) {
      case 'critical':
        return 'fatal';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'error';
    }
  }

  /**
   * Generate unique session identifier
   */
  private generateSessionId(): string {
    return `ws_session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Get current Sentry status and metrics
   */
  getStatus() {
    return {
      initialized: this.initialized,
      weddingDayMode: this.isWeddingDay,
      errorCount: this.errorCount,
      sessionId: this.sessionId,
      config: {
        tracesSampleRate: this.getSentryConfig().tracesSampleRate,
        replaysSessionSampleRate:
          this.getSentryConfig().replaysSessionSampleRate,
      },
    };
  }

  /**
   * Reset error count (for testing or administrative purposes)
   */
  resetErrorCount(): void {
    this.errorCount = 0;
  }
}

// Export singleton instance and convenience functions
export const enhancedSentry = EnhancedSentryService.getInstance();

export const initializeEnhancedSentry = () => {
  enhancedSentry.initializeEnhancedSentry();
};

export const getSentryConfig = () => {
  return enhancedSentry.getSentryConfig();
};

export const captureWeddingError = (
  error: Error,
  context?: WeddingErrorContext,
) => {
  return enhancedSentry.captureWeddingError(error, context);
};

// Auto-initialize on import if DSN is available
if (process.env.SENTRY_DSN) {
  initializeEnhancedSentry();
}
