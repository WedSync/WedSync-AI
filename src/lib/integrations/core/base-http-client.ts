import { z } from 'zod';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
  expectedFailureRate: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitterMax: number;
  retryableStatuses: number[];
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  burstSize: number;
  windowSize: number;
}

export interface BaseHttpClientConfig {
  baseURL: string;
  timeout: number;
  circuitBreaker: CircuitBreakerConfig;
  retry: RetryConfig;
  rateLimit: RateLimitConfig;
  headers?: Record<string, string>;
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public state: CircuitBreakerState,
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  private requestCount: number = 0;
  private windowStart: number = Date.now();

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.shouldReject()) {
      throw new CircuitBreakerError(
        'Circuit breaker is OPEN - service is temporarily unavailable',
        this.state,
      );
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

  private shouldReject(): boolean {
    const now = Date.now();

    // Reset monitoring window if needed
    if (now - this.windowStart > this.config.monitoringWindow) {
      this.resetWindow();
    }

    switch (this.state) {
      case CircuitBreakerState.OPEN:
        if (now - this.lastFailureTime > this.config.resetTimeout) {
          this.state = CircuitBreakerState.HALF_OPEN;
          this.successCount = 0;
          return false;
        }
        return true;

      case CircuitBreakerState.HALF_OPEN:
        return false;

      case CircuitBreakerState.CLOSED:
        return false;

      default:
        return false;
    }
  }

  private onSuccess(): void {
    this.requestCount++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) {
        // Require 3 successes to close
        this.state = CircuitBreakerState.CLOSED;
        this.failures = 0;
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  private onFailure(): void {
    this.requestCount++;
    this.failures++;
    this.lastFailureTime = Date.now();

    const failureRate = this.failures / this.requestCount;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
    } else if (
      this.state === CircuitBreakerState.CLOSED &&
      (this.failures >= this.config.failureThreshold ||
        failureRate > this.config.expectedFailureRate)
    ) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  private resetWindow(): void {
    this.windowStart = Date.now();
    this.failures = 0;
    this.requestCount = 0;
    this.successCount = 0;
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getMetrics() {
    return {
      state: this.state,
      failures: this.failures,
      successCount: this.successCount,
      requestCount: this.requestCount,
      failureRate:
        this.requestCount > 0 ? this.failures / this.requestCount : 0,
    };
  }
}

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private requests: number[] = [];

  constructor(private config: RateLimitConfig) {
    this.tokens = config.burstSize;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    this.refillTokens(now);
    this.cleanupOldRequests(now);

    // Check rate limit
    if (this.requests.length >= this.config.requestsPerSecond) {
      const oldestRequest = this.requests[0];
      const waitTime = 1000 - (now - oldestRequest);
      if (waitTime > 0) {
        throw new RateLimitError(
          `Rate limit exceeded. Wait ${waitTime}ms`,
          Math.ceil(waitTime / 1000),
        );
      }
    }

    // Check burst capacity
    if (this.tokens <= 0) {
      const waitTime = 1000 / this.config.requestsPerSecond;
      throw new RateLimitError(
        `Burst capacity exceeded. Wait ${waitTime}ms`,
        Math.ceil(waitTime / 1000),
      );
    }

    this.tokens--;
    this.requests.push(now);
  }

  private refillTokens(now: number): void {
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor(
      (timePassed * this.config.requestsPerSecond) / 1000,
    );

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.config.burstSize, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  private cleanupOldRequests(now: number): void {
    const windowStart = now - this.config.windowSize;
    this.requests = this.requests.filter((time) => time > windowStart);
  }
}

export class BaseHttpClient {
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;
  private requestQueue: Array<() => Promise<any>> = [];
  private processing = false;

  constructor(private config: BaseHttpClientConfig) {
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
    this.rateLimiter = new RateLimiter(config.rateLimit);
  }

  async request<T>(
    path: string,
    options: RequestInit = {},
    schema?: z.ZodSchema<T>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(() =>
        this.executeRequest(path, options, schema, resolve, reject),
      );
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.requestQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await this.rateLimiter.acquire();
          await request();
        } catch (error) {
          // Request will handle its own errors
        }

        // Small delay between requests to prevent overwhelming the service
        await this.sleep(100);
      }
    }

    this.processing = false;
  }

  private async executeRequest<T>(
    path: string,
    options: RequestInit,
    schema: z.ZodSchema<T> | undefined,
    resolve: (value: T) => void,
    reject: (reason: any) => void,
  ): Promise<void> {
    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await this.executeHttpRequest(path, options, schema);
      });
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }

  private async executeHttpRequest<T>(
    path: string,
    options: RequestInit,
    schema?: z.ZodSchema<T>,
  ): Promise<T> {
    const url = `${this.config.baseURL}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await this.retryOperation(async () => {
        return await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers,
            ...options.headers,
          },
          signal: controller.signal,
        });
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const data = await response.json();

      if (schema) {
        return schema.parse(data);
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableError('Request timeout');
      }

      throw error;
    }
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.retry.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.config.retry.maxRetries) {
          break;
        }

        // Don't retry non-retryable errors
        if (error instanceof Response) {
          if (!this.config.retry.retryableStatuses.includes(error.status)) {
            throw error;
          }
        } else if (error instanceof RateLimitError) {
          // For rate limits, wait the specified time
          await this.sleep((error.retryAfter || 1) * 1000);
          continue;
        }

        const delay = this.calculateBackoffDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.config.retry.baseDelay * Math.pow(2, attempt);
    const cappedDelay = Math.min(exponentialDelay, this.config.retry.maxDelay);
    const jitter = Math.random() * this.config.retry.jitterMax;
    return cappedDelay + jitter;
  }

  private async handleHttpError(response: Response): Promise<never> {
    const status = response.status;
    let errorMessage = `HTTP ${status}: ${response.statusText}`;

    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Ignore JSON parsing errors
    }

    switch (status) {
      case 429:
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError(
          errorMessage,
          retryAfter ? parseInt(retryAfter, 10) : undefined,
        );

      case 500:
      case 502:
      case 503:
      case 504:
        throw new ServiceUnavailableError(errorMessage, status);

      default:
        throw new Error(errorMessage);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getMetrics() {
    return {
      circuitBreaker: this.circuitBreaker.getMetrics(),
      queueSize: this.requestQueue.length,
      processing: this.processing,
    };
  }
}
