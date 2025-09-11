/**
 * WS-254: Circuit Breaker Pattern Implementation
 * Advanced circuit breaker for OpenAI service reliability
 * Team B Backend Implementation
 */

export enum CircuitBreakerState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failures detected, requests blocked
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening
  recoveryTimeout: number; // Time to wait before trying again (ms)
  monitoringPeriod: number; // Window for tracking failures (ms)
  successThreshold?: number; // Successes needed to close from half-open
  timeout?: number; // Request timeout (ms)
  name?: string; // Circuit breaker identifier
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  requests: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  stateChangedAt: number;
  uptime: number;
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

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private requests: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private stateChangedAt: number = Date.now();
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions) {
    this.options = {
      successThreshold: 3,
      timeout: 30000,
      name: 'CircuitBreaker',
      ...options,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      // Check if we should allow the request
      if (!this.shouldAllowRequest()) {
        reject(
          new CircuitBreakerError(
            `Circuit breaker is ${this.state}. Request blocked.`,
            this.state,
          ),
        );
        return;
      }

      this.requests++;
      const startTime = Date.now();
      let timeoutHandle: NodeJS.Timeout | null = null;

      try {
        // Set up timeout
        const timeoutPromise = new Promise<never>((_, timeoutReject) => {
          timeoutHandle = setTimeout(() => {
            timeoutReject(
              new Error(`Request timeout after ${this.options.timeout}ms`),
            );
          }, this.options.timeout);
        });

        // Race between the actual function and timeout
        const result = await Promise.race([fn(), timeoutPromise]);

        // Clear timeout on success
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        // Record success
        this.onSuccess(Date.now() - startTime);
        resolve(result);
      } catch (error) {
        // Clear timeout on error
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        // Record failure
        this.onFailure(error as Error, Date.now() - startTime);
        reject(error);
      }
    });
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      requests: this.requests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChangedAt: this.stateChangedAt,
      uptime: this.calculateUptime(),
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.requests = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.stateChangedAt = Date.now();

    console.log(`[${this.options.name}] Circuit breaker manually reset`);
  }

  /**
   * Force circuit breaker to open state
   */
  forceOpen(): void {
    this.changeState(CircuitBreakerState.OPEN);
    console.log(`[${this.options.name}] Circuit breaker forced to OPEN state`);
  }

  /**
   * Check if circuit breaker should allow the request
   */
  private shouldAllowRequest(): boolean {
    const now = Date.now();

    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return true;

      case CircuitBreakerState.OPEN:
        // Check if enough time has passed to try again
        if (
          this.lastFailureTime &&
          now - this.lastFailureTime >= this.options.recoveryTimeout
        ) {
          this.changeState(CircuitBreakerState.HALF_OPEN);
          return true;
        }
        return false;

      case CircuitBreakerState.HALF_OPEN:
        // Allow limited requests to test if service recovered
        return true;

      default:
        return false;
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(duration: number): void {
    this.successes++;
    this.lastSuccessTime = Date.now();

    // Reset failure count for monitoring period
    this.cleanupOldFailures();

    console.log(`[${this.options.name}] Success recorded (${duration}ms)`);

    switch (this.state) {
      case CircuitBreakerState.HALF_OPEN:
        // If we have enough successes, close the circuit
        if (this.successes >= this.options.successThreshold) {
          this.changeState(CircuitBreakerState.CLOSED);
          this.failures = 0; // Reset failure count
        }
        break;

      case CircuitBreakerState.CLOSED:
        // Stay closed, but reset failures if we're getting successes
        if (this.successes % 10 === 0) {
          // Every 10 successes
          this.failures = Math.max(0, this.failures - 1);
        }
        break;
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(error: Error, duration: number): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    console.error(
      `[${this.options.name}] Failure recorded (${duration}ms):`,
      error.message,
    );

    // Clean up old failures outside monitoring period
    this.cleanupOldFailures();

    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        if (this.failures >= this.options.failureThreshold) {
          this.changeState(CircuitBreakerState.OPEN);
        }
        break;

      case CircuitBreakerState.HALF_OPEN:
        // Any failure in half-open state should open the circuit
        this.changeState(CircuitBreakerState.OPEN);
        break;
    }
  }

  /**
   * Change circuit breaker state
   */
  private changeState(newState: CircuitBreakerState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;
    this.stateChangedAt = Date.now();

    console.log(
      `[${this.options.name}] State changed: ${oldState} -> ${newState}`,
    );

    // Reset counters when changing to half-open
    if (newState === CircuitBreakerState.HALF_OPEN) {
      this.successes = 0;
    }

    // Emit metrics or notifications here if needed
    this.emitStateChangeEvent(oldState, newState);
  }

  /**
   * Clean up failures outside the monitoring period
   */
  private cleanupOldFailures(): void {
    const now = Date.now();
    const cutoff = now - this.options.monitoringPeriod;

    // This is a simplified cleanup - in a production system,
    // you'd want to track individual failure timestamps
    if (this.lastFailureTime && this.lastFailureTime < cutoff) {
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  /**
   * Calculate uptime percentage
   */
  private calculateUptime(): number {
    if (this.requests === 0) return 100;

    const successRate = (this.requests - this.failures) / this.requests;
    return Math.round(successRate * 100 * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Emit state change event for monitoring
   */
  private emitStateChangeEvent(
    oldState: CircuitBreakerState,
    newState: CircuitBreakerState,
  ): void {
    // In a production system, this would emit events to monitoring systems
    const event = {
      circuitBreaker: this.options.name,
      oldState,
      newState,
      timestamp: Date.now(),
      stats: this.getStats(),
    };

    // Example: emit to monitoring service
    // monitoringService.emit('circuit-breaker-state-change', event)

    console.log(
      `[${this.options.name}] State change event:`,
      JSON.stringify(event, null, 2),
    );
  }
}

/**
 * Circuit Breaker Manager for managing multiple circuit breakers
 */
export class CircuitBreakerManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  getCircuitBreaker(
    name: string,
    options: CircuitBreakerOptions,
  ): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker({ ...options, name }));
    }
    return this.circuitBreakers.get(name)!;
  }

  /**
   * Get all circuit breaker stats
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};

    for (const [name, breaker] of this.circuitBreakers) {
      stats[name] = breaker.getStats();
    }

    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Get health status of all circuit breakers
   */
  getHealthStatus(): {
    healthy: number;
    degraded: number;
    unhealthy: number;
    total: number;
  } {
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;

    for (const breaker of this.circuitBreakers.values()) {
      const stats = breaker.getStats();

      switch (stats.state) {
        case CircuitBreakerState.CLOSED:
          if (stats.uptime >= 95) {
            healthy++;
          } else {
            degraded++;
          }
          break;
        case CircuitBreakerState.HALF_OPEN:
          degraded++;
          break;
        case CircuitBreakerState.OPEN:
          unhealthy++;
          break;
      }
    }

    return {
      healthy,
      degraded,
      unhealthy,
      total: this.circuitBreakers.size,
    };
  }
}

// Export singleton manager
export const circuitBreakerManager = new CircuitBreakerManager();

// Convenience function to create OpenAI circuit breaker
export function createOpenAICircuitBreaker(): CircuitBreaker {
  return circuitBreakerManager.getCircuitBreaker('OpenAI', {
    failureThreshold: 5, // Allow 5 failures
    recoveryTimeout: 60000, // Wait 1 minute before trying again
    monitoringPeriod: 300000, // Track failures over 5 minutes
    successThreshold: 3, // Need 3 successes to recover
    timeout: 30000, // 30 second timeout
    name: 'OpenAI Service',
  });
}
