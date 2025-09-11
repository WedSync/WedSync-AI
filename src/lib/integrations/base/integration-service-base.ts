/**
 * WS-245 Wedding Budget Optimizer - Base Integration Service
 * Enterprise-grade base class for all pricing integrations
 */

import { randomUUID } from 'crypto';
import { z } from 'zod';
import type {
  PricingServiceConfig,
  Result,
  ValidationResult,
} from '@/types/pricing';
import {
  PricingError,
  ValidationError,
  RateLimitError,
  ServiceUnavailableError,
} from '@/types/pricing';

// Rate Limiter Implementation
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private config: { requestsPerMinute: number; requestsPerHour: number },
  ) {}

  async acquire(identifier: string = 'default'): Promise<void> {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];

    // Clean old requests (beyond 1 hour)
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentRequests = requests.filter((time) => time > oneHourAgo);

    // Check hourly limit
    if (recentRequests.length >= this.config.requestsPerHour) {
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = oldestRequest + 60 * 60 * 1000 - now;
      throw new RateLimitError(`Hourly rate limit exceeded`, waitTime);
    }

    // Check per-minute limit
    const oneMinuteAgo = now - 60 * 1000;
    const recentMinuteRequests = recentRequests.filter(
      (time) => time > oneMinuteAgo,
    );

    if (recentMinuteRequests.length >= this.config.requestsPerMinute) {
      const oldestMinuteRequest = Math.min(...recentMinuteRequests);
      const waitTime = oldestMinuteRequest + 60 * 1000 - now;
      throw new RateLimitError(`Per-minute rate limit exceeded`, waitTime);
    }

    // Record this request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
  }
}

// Logger Interface
interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  child(meta: Record<string, unknown>): Logger;
}

// Simple logger implementation
class ConsoleLogger implements Logger {
  constructor(private context: Record<string, unknown> = {}) {}

  debug(message: string, meta: Record<string, unknown> = {}): void {
    console.debug(`[DEBUG] ${message}`, { ...this.context, ...meta });
  }

  info(message: string, meta: Record<string, unknown> = {}): void {
    console.info(`[INFO] ${message}`, { ...this.context, ...meta });
  }

  warn(message: string, meta: Record<string, unknown> = {}): void {
    console.warn(`[WARN] ${message}`, { ...this.context, ...meta });
  }

  error(message: string, meta: Record<string, unknown> = {}): void {
    console.error(`[ERROR] ${message}`, { ...this.context, ...meta });
  }

  child(meta: Record<string, unknown>): Logger {
    return new ConsoleLogger({ ...this.context, ...meta });
  }
}

// Circuit Breaker Implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeMs: number = 60000,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeMs) {
        this.state = 'half-open';
      } else {
        throw new ServiceUnavailableError(
          'circuit-breaker',
          'Circuit breaker is open',
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }
}

// Base Integration Service Class
export abstract class IntegrationServiceBase<TRequest, TResponse> {
  protected readonly logger: Logger;
  protected readonly rateLimiter: RateLimiter;
  protected readonly circuitBreaker: CircuitBreaker;

  constructor(
    protected readonly config: PricingServiceConfig,
    logger?: Logger,
  ) {
    this.logger = (logger || new ConsoleLogger()).child({
      service: this.constructor.name,
      baseUrl: config.baseUrl,
    });
    this.rateLimiter = new RateLimiter(config.rateLimit);
    this.circuitBreaker = new CircuitBreaker();
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract validateRequest(
    request: TRequest,
  ): ValidationResult<TRequest>;
  protected abstract makeRequest(
    request: TRequest,
    requestId: string,
  ): Promise<unknown>;
  protected abstract transformResponse(response: unknown): TResponse;

  /**
   * Execute the integration request with comprehensive error handling
   */
  public async execute(
    request: TRequest,
  ): Promise<Result<TResponse, PricingError>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Step 1: Validate request
      const validationResult = this.validateRequest(request);
      if (!validationResult.isValid) {
        this.logger.warn('Request validation failed', {
          requestId,
          errors: validationResult.errors,
        });
        return {
          success: false,
          error: new ValidationError(
            `Invalid request: ${validationResult.errors?.join(', ')}`,
          ),
        };
      }

      // Step 2: Rate limiting
      await this.rateLimiter.acquire(this.config.baseUrl);

      // Step 3: Execute request with circuit breaker and timeout
      const response = await this.circuitBreaker.execute(() =>
        Promise.race([
          this.makeRequest(validationResult.data!, requestId),
          this.createTimeoutPromise(),
        ]),
      );

      // Step 4: Transform and validate response
      const transformedResponse = this.transformResponse(response);

      // Step 5: Log success and return
      const duration = Date.now() - startTime;
      this.logger.info('Integration request completed successfully', {
        requestId,
        duration,
        service: this.constructor.name,
      });

      return {
        success: true,
        data: transformedResponse,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const mappedError = this.mapError(error);

      this.logger.error('Integration request failed', {
        requestId,
        duration,
        error: mappedError.message,
        errorCode: mappedError.code,
        retryable: mappedError.retryable,
      });

      return {
        success: false,
        error: mappedError,
      };
    }
  }

  /**
   * Execute with automatic retry for retryable errors
   */
  public async executeWithRetry(
    request: TRequest,
  ): Promise<Result<TResponse, PricingError>> {
    let lastError: PricingError | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      const result = await this.execute(request);

      if (result.success) {
        return result;
      }

      lastError = result.error;

      // Don't retry non-retryable errors
      if (!result.error.retryable) {
        break;
      }

      // Don't retry on last attempt
      if (attempt === this.config.retryAttempts) {
        break;
      }

      // Wait before retry with exponential backoff
      const delayMs = this.config.retryDelayMs * Math.pow(2, attempt - 1);
      await this.delay(delayMs);

      this.logger.info('Retrying request', {
        attempt: attempt + 1,
        delayMs,
        error: result.error.message,
      });
    }

    return {
      success: false,
      error:
        lastError ||
        new ServiceUnavailableError('unknown', 'All retry attempts failed'),
    };
  }

  /**
   * Generate unique request ID for tracing
   */
  protected generateRequestId(): string {
    return randomUUID();
  }

  /**
   * Create timeout promise that rejects after configured timeout
   */
  protected createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new ServiceUnavailableError(
            'timeout',
            `Request timed out after ${this.config.timeoutMs}ms`,
          ),
        );
      }, this.config.timeoutMs);
    });
  }

  /**
   * Map various error types to standardized PricingError
   */
  protected mapError(error: unknown): PricingError {
    if (error instanceof PricingError) {
      return error;
    }

    if (error instanceof Error) {
      // Handle common HTTP error patterns
      if (error.message.includes('timeout')) {
        return new ServiceUnavailableError('timeout', error.message);
      }

      if (
        error.message.includes('rate limit') ||
        error.message.includes('429')
      ) {
        const retryAfter = this.extractRetryAfter(error.message);
        return new RateLimitError(error.message, retryAfter);
      }

      if (
        error.message.includes('validation') ||
        error.message.includes('400')
      ) {
        return new ValidationError(error.message);
      }

      if (
        error.message.includes('network') ||
        error.message.includes('ENOTFOUND')
      ) {
        return new ServiceUnavailableError('network', error.message);
      }

      return new PricingError(error.message, 'UNKNOWN_ERROR', true);
    }

    return new PricingError('Unknown error occurred', 'UNKNOWN_ERROR', true);
  }

  /**
   * Extract retry-after value from error message (fallback to default)
   */
  protected extractRetryAfter(message: string): number {
    const match = message.match(/retry.*?(\d+)/i);
    return match ? parseInt(match[1]) * 1000 : 60000; // Default to 60 seconds
  }

  /**
   * Simple delay utility for retries
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate that response has expected structure
   */
  protected validateResponseStructure(
    response: unknown,
    schema: z.ZodSchema,
  ): ValidationResult<unknown> {
    try {
      const validated = schema.parse(response);
      return {
        isValid: true,
        data: validated,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        };
      }
      return {
        isValid: false,
        errors: ['Unknown validation error'],
      };
    }
  }

  /**
   * Create standard HTTP headers for API requests
   */
  protected createHeaders(requestId: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'WedSync/1.0 Budget-Optimizer',
      'X-Request-ID': requestId,
      Authorization: `Bearer ${this.config.apiKey}`,
    };
  }

  /**
   * Create fetch request with standard configuration
   */
  protected async createRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: unknown,
    requestId?: string,
  ): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = this.createHeaders(requestId || this.generateRequestId());

    const requestConfig: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeoutMs),
    };

    if (body && method !== 'GET') {
      requestConfig.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestConfig);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response;
  }

  /**
   * Parse JSON response with error handling
   */
  protected async parseJsonResponse(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch (error) {
      throw new ValidationError('Invalid JSON response from API');
    }
  }
}

export default IntegrationServiceBase;
