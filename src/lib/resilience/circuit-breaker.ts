/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily blocking calls to failing services
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
  requestTimeout?: number;
  volumeThreshold?: number;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  totalRequests: number;
  errorRate: number;
  nextAttempt?: Date;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: Date;
  private nextAttempt?: Date;
  private requestCount = 0;
  private requestWindow: number[] = [];

  private readonly options: Required<CircuitBreakerOptions>;

  constructor(
    private readonly name: string,
    options: CircuitBreakerOptions = {},
  ) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeout: options.resetTimeout ?? 60000, // 1 minute
      monitoringPeriod: options.monitoringPeriod ?? 10000, // 10 seconds
      requestTimeout: options.requestTimeout ?? 5000, // 5 seconds
      volumeThreshold: options.volumeThreshold ?? 10, // Minimum requests before opening
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should be opened
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < (this.nextAttempt?.getTime() ?? 0)) {
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN for ${this.name}`,
          this.getMetrics(),
        );
      }
      // Try half-open state
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      // Add timeout to operation
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Operation timeout after ${this.options.requestTimeout}ms`,
              ),
            ),
          this.options.requestTimeout,
        ),
      ),
    ]);
  }

  private onSuccess(): void {
    this.failures = 0;
    this.successes++;
    this.requestCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      console.log(`Circuit breaker ${this.name} is now CLOSED`);
    }

    this.updateRequestWindow();
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();
    this.requestCount++;

    this.updateRequestWindow();

    // Check if we should open the circuit
    if (this.shouldOpen()) {
      this.open();
    }
  }

  private shouldOpen(): boolean {
    // Don't open if we haven't hit volume threshold
    if (this.requestCount < this.options.volumeThreshold) {
      return false;
    }

    // Open if we've hit failure threshold
    if (this.failures >= this.options.failureThreshold) {
      return true;
    }

    // Calculate error rate in monitoring period
    const errorRate = this.calculateErrorRate();
    return errorRate > 0.5; // Open if >50% error rate
  }

  private calculateErrorRate(): number {
    const now = Date.now();
    const recentRequests = this.requestWindow.filter(
      (time) => now - time < this.options.monitoringPeriod,
    );

    if (recentRequests.length === 0) return 0;

    const recentFailures = this.failures;
    return recentFailures / recentRequests.length;
  }

  private updateRequestWindow(): void {
    const now = Date.now();
    this.requestWindow.push(now);

    // Clean old entries
    this.requestWindow = this.requestWindow.filter(
      (time) => now - time < this.options.monitoringPeriod,
    );
  }

  private open(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = new Date(Date.now() + this.options.resetTimeout);

    console.error(
      `Circuit breaker ${this.name} is now OPEN. ` +
        `Failures: ${this.failures}, Next attempt: ${this.nextAttempt.toISOString()}`,
    );
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = undefined;
    this.nextAttempt = undefined;
    this.requestCount = 0;
    this.requestWindow = [];
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      totalRequests: this.requestCount,
      errorRate: this.calculateErrorRate(),
      nextAttempt: this.nextAttempt,
    };
  }
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly metrics: CircuitBreakerMetrics,
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

// Service-specific circuit breakers
export const circuitBreakers = {
  stripe: new CircuitBreaker('Stripe', {
    failureThreshold: 3,
    resetTimeout: 30000,
    requestTimeout: 10000,
  }),

  ocr: new CircuitBreaker('OCR', {
    failureThreshold: 5,
    resetTimeout: 60000,
    requestTimeout: 30000,
  }),

  email: new CircuitBreaker('Email', {
    failureThreshold: 10,
    resetTimeout: 120000,
    requestTimeout: 5000,
  }),

  database: new CircuitBreaker('Database', {
    failureThreshold: 5,
    resetTimeout: 10000,
    requestTimeout: 5000,
  }),
};
