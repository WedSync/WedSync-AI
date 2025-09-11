/**
 * WS-233 API Usage Monitoring - API Monitoring Middleware
 * Team C Integration: Middleware for automatic API call monitoring
 * Intercepts outbound HTTP requests to external APIs and adds usage tracking
 */

import {
  apiUsageTracker,
  type APIService,
} from '@/lib/monitoring/api-usage-tracker';
import { logger } from '@/lib/monitoring/edge-logger';
import { v4 as uuidv4 } from 'uuid';

// API service detection patterns
const API_SERVICE_PATTERNS = {
  'api.openai.com': 'openai' as APIService,
  'openai.com': 'openai' as APIService,
  'supabase.co': 'supabase' as APIService,
  'supabase.com': 'supabase' as APIService,
  'api.resend.com': 'resend' as APIService,
  'resend.com': 'resend' as APIService,
  'api.twilio.com': 'twilio' as APIService,
  'twilio.com': 'twilio' as APIService,
  'api.vercel.com': 'vercel' as APIService,
  'vercel.com': 'vercel' as APIService,
};

// Request context for tracking
interface RequestContext {
  requestId: string;
  organizationId: string;
  userId?: string;
  startTime: number;
  apiService: APIService;
  endpoint: string;
  method: string;
}

// Global request tracking
const activeRequests = new Map<string, RequestContext>();

/**
 * API Monitoring Middleware Configuration
 */
export interface APIMonitoringConfig {
  organizationId: string;
  userId?: string;
  enabledServices: APIService[];
  trackingLevel: 'minimal' | 'standard' | 'detailed';
  bufferSize: number;
  flushInterval: number; // milliseconds
  rateLimit: {
    enabled: boolean;
    requestsPerMinute: number;
  };
}

const DEFAULT_CONFIG: APIMonitoringConfig = {
  organizationId: '',
  enabledServices: ['openai', 'supabase', 'resend', 'twilio', 'vercel'],
  trackingLevel: 'standard',
  bufferSize: 50,
  flushInterval: 30000,
  rateLimit: {
    enabled: true,
    requestsPerMinute: 100,
  },
};

/**
 * Core API Monitoring Middleware
 */
export class APIMonitoringMiddleware {
  private config: APIMonitoringConfig;
  private originalFetch?: typeof fetch;
  private isInitialized = false;

  constructor(config: Partial<APIMonitoringConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the middleware by patching global fetch
   */
  initialize(): void {
    if (this.isInitialized) {
      logger.warn('API monitoring middleware already initialized');
      return;
    }

    // Store original fetch
    this.originalFetch = globalThis.fetch;

    // Patch global fetch
    globalThis.fetch = this.createMonitoredFetch();

    this.isInitialized = true;

    logger.info('API monitoring middleware initialized', {
      organizationId: this.config.organizationId,
      enabledServices: this.config.enabledServices,
      trackingLevel: this.config.trackingLevel,
    });
  }

  /**
   * Restore original fetch and cleanup
   */
  cleanup(): void {
    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch;
    }
    this.isInitialized = false;

    logger.info('API monitoring middleware cleaned up', {
      organizationId: this.config.organizationId,
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<APIMonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };

    logger.info('API monitoring middleware config updated', {
      organizationId: this.config.organizationId,
      changes: Object.keys(newConfig),
    });
  }

  /**
   * Create monitored fetch function
   */
  private createMonitoredFetch() {
    const originalFetch = this.originalFetch!;
    const config = this.config;

    return async function monitoredFetch(
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const method = init?.method || 'GET';

      // Check if this is an external API we should monitor
      const apiService = detectAPIService(url);
      if (!apiService || !config.enabledServices.includes(apiService)) {
        // Not a monitored API, use original fetch
        return originalFetch(input, init);
      }

      const requestId = uuidv4();
      const startTime = Date.now();
      const endpoint = extractEndpoint(url, apiService);

      // Create request context
      const context: RequestContext = {
        requestId,
        organizationId: config.organizationId,
        userId: config.userId,
        startTime,
        apiService,
        endpoint,
        method: method.toUpperCase(),
      };

      // Store in active requests
      activeRequests.set(requestId, context);

      try {
        // Pre-flight checks
        const limitCheck = await apiUsageTracker.checkUsageLimits(
          config.organizationId,
          apiService,
          endpoint,
          0.001, // Small estimated cost for pre-flight
        );

        if (!limitCheck.allowed) {
          activeRequests.delete(requestId);
          const error = new Error(
            `API usage blocked: ${limitCheck.warnings.join(', ')}`,
          );

          // Track the blocked request
          await trackAPICall(context, 429, error.message, 0, 0);

          throw error;
        }

        // Log warnings
        if (limitCheck.warnings.length > 0) {
          logger.warn('API usage warnings', {
            organizationId: config.organizationId,
            userId: config.userId,
            requestId,
            apiService,
            endpoint,
            warnings: limitCheck.warnings,
          });
        }

        // Execute the actual request
        const response = await originalFetch(input, init);
        const duration = Date.now() - startTime;

        // Calculate request/response sizes
        const requestSize = calculateRequestSize(init);
        const responseSize = calculateResponseSize(response);

        // Track successful request
        await trackAPICall(
          context,
          response.status,
          undefined,
          requestSize,
          responseSize,
          response,
        );

        // Clean up
        activeRequests.delete(requestId);

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        const statusCode = getErrorStatusCode(error);

        // Track failed request
        await trackAPICall(context, statusCode, error.message, 0, 0);

        // Clean up
        activeRequests.delete(requestId);

        throw error;
      }
    };
  }
}

/**
 * Track API call with usage tracking system
 */
async function trackAPICall(
  context: RequestContext,
  statusCode: number,
  errorMessage?: string,
  requestSize?: number,
  responseSize?: number,
  response?: Response,
): Promise<void> {
  try {
    const duration = Date.now() - context.startTime;

    // Extract metadata based on API service
    const metadata = await extractMetadata(
      context.apiService,
      context.endpoint,
      response,
      errorMessage,
    );

    // Track the usage
    await apiUsageTracker.trackAPIUsage({
      apiService: context.apiService,
      endpoint: context.endpoint,
      method: context.method,
      requestId: context.requestId,
      organizationId: context.organizationId,
      userId: context.userId,
      requestSize,
      responseSize,
      duration,
      statusCode,
      metadata,
    });

    // Log based on status
    if (statusCode >= 400) {
      logger.error('API call failed', {
        organizationId: context.organizationId,
        userId: context.userId,
        requestId: context.requestId,
        apiService: context.apiService,
        endpoint: context.endpoint,
        method: context.method,
        statusCode,
        duration,
        error: errorMessage,
      });
    } else {
      logger.info('API call tracked', {
        organizationId: context.organizationId,
        userId: context.userId,
        requestId: context.requestId,
        apiService: context.apiService,
        endpoint: context.endpoint,
        method: context.method,
        statusCode,
        duration,
        requestSize,
        responseSize,
      });
    }
  } catch (trackingError) {
    logger.error('Failed to track API call', {
      requestId: context.requestId,
      apiService: context.apiService,
      endpoint: context.endpoint,
      trackingError: trackingError.message,
    });
  }
}

/**
 * Detect which API service a URL belongs to
 */
function detectAPIService(url: string): APIService | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    for (const [pattern, service] of Object.entries(API_SERVICE_PATTERNS)) {
      if (hostname.includes(pattern)) {
        return service;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract endpoint path from URL based on service
 */
function extractEndpoint(url: string, apiService: APIService): string {
  try {
    const urlObj = new URL(url);
    let path = urlObj.pathname;

    // Clean up path based on service
    switch (apiService) {
      case 'openai':
        // Remove version prefix: /v1/chat/completions -> /chat/completions
        path = path.replace(/^\/v\d+/, '');
        break;
      case 'supabase':
        // Extract table/operation from Supabase REST API
        if (path.includes('/rest/v1/')) {
          path = path.replace(/^.*\/rest\/v\d+/, '');
        }
        break;
      case 'twilio':
        // Remove account SID: /2010-04-01/Accounts/AC.../Messages -> /Messages
        path = path.replace(/^\/\d{4}-\d{2}-\d{2}\/Accounts\/[^\/]+/, '');
        break;
      default:
        // Keep original path for other services
        break;
    }

    return path || '/';
  } catch {
    return '/unknown';
  }
}

/**
 * Extract metadata specific to each API service
 */
async function extractMetadata(
  apiService: APIService,
  endpoint: string,
  response?: Response,
  errorMessage?: string,
): Promise<Record<string, any>> {
  const metadata: Record<string, any> = {};

  if (errorMessage) {
    metadata.error = errorMessage;
    return metadata;
  }

  if (!response) return metadata;

  try {
    switch (apiService) {
      case 'openai':
        // Extract token usage from OpenAI responses
        if (
          response.headers.get('content-type')?.includes('application/json')
        ) {
          const clone = response.clone();
          const data = await clone.json();

          if (data.usage) {
            metadata.usage = data.usage;
            metadata.model = data.model;
          }
        }
        break;

      case 'supabase':
        // Extract operation type and row count estimates
        if (endpoint.startsWith('/')) {
          metadata.operationType = 'database';

          // Check for auth operations
          if (endpoint.includes('/auth/')) {
            metadata.operationType = 'auth';
          } else if (endpoint.includes('/storage/')) {
            metadata.operationType = 'storage';
          } else if (endpoint.includes('/realtime/')) {
            metadata.operationType = 'realtime';
          }

          // Estimate units from response
          if (
            response.headers.get('content-type')?.includes('application/json')
          ) {
            const clone = response.clone();
            const data = await clone.json();

            if (Array.isArray(data)) {
              metadata.units = Math.ceil(data.length / 1000); // Per 1K rows
            } else {
              metadata.units = 1;
            }
          }
        }
        break;

      case 'resend':
        // Count emails sent
        metadata.emailCount = 1;
        if (endpoint.includes('/batch')) {
          // Would need to parse request body to get accurate count
          metadata.emailCount = 10; // Estimate for batch
        }
        break;

      case 'twilio':
        // Determine message type and segments
        if (endpoint.includes('/Messages')) {
          metadata.messageType = 'sms';
          metadata.segments = 1; // Would need request body for accurate count
        } else if (endpoint.includes('/Calls')) {
          metadata.messageType = 'voice';
          metadata.segments = 1;
        }
        break;

      case 'vercel':
        // Determine operation type
        if (endpoint.includes('/deployments')) {
          metadata.operationType = 'function';
          metadata.units = 1;
        } else {
          metadata.operationType = 'bandwidth';
          metadata.units = Math.ceil(
            ((response.headers.get('content-length') || '0') as any) /
              (1024 * 1024),
          ); // MB
        }
        break;
    }
  } catch (error) {
    logger.error('Failed to extract metadata', {
      apiService,
      endpoint,
      error: error.message,
    });
  }

  return metadata;
}

/**
 * Calculate request size from fetch options
 */
function calculateRequestSize(init?: RequestInit): number {
  if (!init?.body) return 0;

  if (typeof init.body === 'string') {
    return init.body.length;
  }

  if (init.body instanceof ArrayBuffer) {
    return init.body.byteLength;
  }

  if (init.body instanceof Blob) {
    return init.body.size;
  }

  // FormData and other types - estimate
  return 1024; // 1KB estimate
}

/**
 * Calculate response size
 */
function calculateResponseSize(response: Response): number {
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    return parseInt(contentLength, 10);
  }

  // Estimate based on response type
  return 1024; // 1KB estimate
}

/**
 * Get error status code from error object
 */
function getErrorStatusCode(error: any): number {
  if (error.status || error.statusCode) {
    return error.status || error.statusCode;
  }

  if (error.message) {
    if (error.message.includes('rate limit') || error.message.includes('429'))
      return 429;
    if (error.message.includes('unauthorized') || error.message.includes('401'))
      return 401;
    if (error.message.includes('forbidden') || error.message.includes('403'))
      return 403;
    if (error.message.includes('not found') || error.message.includes('404'))
      return 404;
    if (error.message.includes('bad request') || error.message.includes('400'))
      return 400;
  }

  return 500; // Default to server error
}

/**
 * Singleton instance for global use
 */
let globalMiddleware: APIMonitoringMiddleware | null = null;

/**
 * Initialize global API monitoring middleware
 */
export function initializeAPIMonitoring(
  config: Partial<APIMonitoringConfig>,
): APIMonitoringMiddleware {
  if (globalMiddleware) {
    globalMiddleware.updateConfig(config);
    return globalMiddleware;
  }

  globalMiddleware = new APIMonitoringMiddleware(config);
  globalMiddleware.initialize();

  return globalMiddleware;
}

/**
 * Get current global middleware instance
 */
export function getAPIMonitoringMiddleware(): APIMonitoringMiddleware | null {
  return globalMiddleware;
}

/**
 * Cleanup global middleware
 */
export function cleanupAPIMonitoring(): void {
  if (globalMiddleware) {
    globalMiddleware.cleanup();
    globalMiddleware = null;
  }
}

/**
 * Context provider for request-scoped monitoring
 */
export class RequestScopedMonitoring {
  private middleware: APIMonitoringMiddleware;

  constructor(organizationId: string, userId?: string) {
    this.middleware = new APIMonitoringMiddleware({
      organizationId,
      userId,
      enabledServices: ['openai', 'supabase', 'resend', 'twilio', 'vercel'],
      trackingLevel: 'standard',
    });
  }

  /**
   * Execute function with monitoring context
   */
  async withMonitoring<T>(fn: () => Promise<T>): Promise<T> {
    this.middleware.initialize();

    try {
      return await fn();
    } finally {
      this.middleware.cleanup();
    }
  }
}

// Export types and utilities
export type { APIMonitoringConfig, RequestContext };
