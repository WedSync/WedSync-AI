/**
 * Retry Policy with Exponential Backoff
 * Automatically retries failed operations with increasing delays
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error, nextDelay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

export class RetryPolicy {
  private readonly options: Required<
    Omit<RetryOptions, 'retryableErrors' | 'onRetry'>
  >;
  private readonly retryableErrors: (error: Error) => boolean;
  private readonly onRetry?: (
    attempt: number,
    error: Error,
    nextDelay: number,
  ) => void;

  constructor(options: RetryOptions = {}) {
    this.options = {
      maxAttempts: options.maxAttempts ?? 3,
      initialDelay: options.initialDelay ?? 1000,
      maxDelay: options.maxDelay ?? 30000,
      backoffMultiplier: options.backoffMultiplier ?? 2,
    };

    this.retryableErrors =
      options.retryableErrors ?? this.defaultRetryableErrors;
    this.onRetry = options.onRetry;
  }

  async execute<T>(
    operation: () => Promise<T>,
    context?: string,
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return {
          success: true,
          result,
          attempts: attempt,
          totalTime: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!this.retryableErrors(lastError)) {
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalTime: Date.now() - startTime,
          };
        }

        // Don't retry on last attempt
        if (attempt === this.options.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);

        // Call retry callback
        if (this.onRetry) {
          this.onRetry(attempt, lastError, delay);
        }

        // Log retry attempt
        console.warn(
          `Retry attempt ${attempt}/${this.options.maxAttempts} for ${context || 'operation'}. ` +
            `Error: ${lastError.message}. Retrying in ${delay}ms...`,
        );

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: this.options.maxAttempts,
      totalTime: Date.now() - startTime,
    };
  }

  private calculateDelay(attempt: number): number {
    const exponentialDelay =
      this.options.initialDelay *
      Math.pow(this.options.backoffMultiplier, attempt - 1);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay;

    return Math.min(exponentialDelay + jitter, this.options.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private defaultRetryableErrors(error: Error): boolean {
    // Network errors
    if (error.message.includes('fetch')) return true;
    if (error.message.includes('network')) return true;
    if (error.message.includes('ECONNREFUSED')) return true;
    if (error.message.includes('ETIMEDOUT')) return true;
    if (error.message.includes('ENOTFOUND')) return true;

    // HTTP errors that are retryable
    if (error.message.includes('429')) return true; // Too Many Requests
    if (error.message.includes('502')) return true; // Bad Gateway
    if (error.message.includes('503')) return true; // Service Unavailable
    if (error.message.includes('504')) return true; // Gateway Timeout

    // Database errors
    if (error.message.includes('connection')) return true;
    if (error.message.includes('timeout')) return true;

    // Don't retry on client errors
    if (error.message.includes('400')) return false; // Bad Request
    if (error.message.includes('401')) return false; // Unauthorized
    if (error.message.includes('403')) return false; // Forbidden
    if (error.message.includes('404')) return false; // Not Found

    return false;
  }
}

// Pre-configured retry policies for different services
export const retryPolicies = {
  // Aggressive retry for critical operations
  critical: new RetryPolicy({
    maxAttempts: 5,
    initialDelay: 500,
    maxDelay: 10000,
    backoffMultiplier: 2,
  }),

  // Standard retry for most operations
  standard: new RetryPolicy({
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
  }),

  // Quick retry for fast operations
  quick: new RetryPolicy({
    maxAttempts: 2,
    initialDelay: 200,
    maxDelay: 1000,
    backoffMultiplier: 2,
  }),

  // Slow retry for expensive operations
  slow: new RetryPolicy({
    maxAttempts: 3,
    initialDelay: 5000,
    maxDelay: 30000,
    backoffMultiplier: 3,
  }),
};

/**
 * Decorator for adding retry logic to class methods
 */
export function Retry(policy: RetryPolicy = retryPolicies.standard) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = `${target.constructor.name}.${propertyKey}`;
      const result = await policy.execute(
        () => originalMethod.apply(this, args),
        context,
      );

      if (!result.success) {
        throw result.error;
      }

      return result.result;
    };

    return descriptor;
  };
}
