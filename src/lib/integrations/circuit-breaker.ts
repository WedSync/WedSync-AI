/**
 * Circuit Breaker Implementation for External Service Integration
 * Provides resilient error handling and fallback mechanisms for AI and external APIs
 */

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  fallbackResponse?: () => any;
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitBreakerState;
  failure_count: number;
  success_count: number;
  last_failure_time: number | null;
  last_success_time: number | null;
  next_attempt_time: number | null;
  total_requests: number;
}

/**
 * Circuit Breaker pattern implementation for resilient service integration
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failures exceeded threshold, requests fail fast with fallback
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */
export class CircuitBreaker {
  public readonly name: string;
  private readonly failureThreshold: number;
  private readonly recoveryTimeout: number;
  private readonly monitoringPeriod: number;
  private readonly fallbackFn?: () => any;

  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttemptTime: number | null = null;
  private totalRequests: number = 0;

  constructor(config: CircuitBreakerConfig) {
    this.name = config.name;
    this.failureThreshold = config.failureThreshold;
    this.recoveryTimeout = config.recoveryTimeout;
    this.monitoringPeriod = config.monitoringPeriod;
    this.fallbackFn = config.fallbackResponse;

    // Reset failure count periodically
    setInterval(() => {
      if (this.state === CircuitBreakerState.CLOSED) {
        this.failureCount = 0;
        this.successCount = 0;
      }
    }, this.monitoringPeriod);
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is OPEN
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        console.log(
          `Circuit breaker ${this.name}: Moving to HALF_OPEN state for testing`,
        );
      } else {
        // Circuit is still open, return fallback or throw
        return this.handleOpenCircuit();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Service is recovered, close the circuit
      console.log(
        `Circuit breaker ${this.name}: Service recovered, moving to CLOSED state`,
      );
      this.state = CircuitBreakerState.CLOSED;
      this.failureCount = 0;
      this.nextAttemptTime = null;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    console.log(
      `Circuit breaker ${this.name}: Failure ${this.failureCount}/${this.failureThreshold}`,
    );

    if (this.failureCount >= this.failureThreshold) {
      this.openCircuit();
    }
  }

  /**
   * Open the circuit due to failures
   */
  private openCircuit(): void {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttemptTime = Date.now() + this.recoveryTimeout;

    console.log(
      `Circuit breaker ${this.name}: OPENED due to ${this.failureCount} failures. ` +
        `Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`,
    );
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    return this.nextAttemptTime !== null && Date.now() >= this.nextAttemptTime;
  }

  /**
   * Handle requests when circuit is open
   */
  private handleOpenCircuit(): any {
    if (this.fallbackFn) {
      console.log(`Circuit breaker ${this.name}: Executing fallback function`);
      return this.fallbackFn();
    }

    const error = new Error(
      `Circuit breaker ${this.name} is OPEN. Service is currently unavailable. ` +
        `Next retry at ${this.nextAttemptTime ? new Date(this.nextAttemptTime).toISOString() : 'unknown'}`,
    );
    error.name = 'CircuitBreakerOpenError';
    throw error;
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Get success count
   */
  getSuccessCount(): number {
    return this.successCount;
  }

  /**
   * Get last failure time
   */
  getLastFailureTime(): number | null {
    return this.lastFailureTime;
  }

  /**
   * Get next attempt time
   */
  getNextAttemptTime(): number | null {
    return this.nextAttemptTime;
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitBreakerState.OPEN;
  }

  /**
   * Check if circuit is closed
   */
  isClosed(): boolean {
    return this.state === CircuitBreakerState.CLOSED;
  }

  /**
   * Check if circuit is half-open
   */
  isHalfOpen(): boolean {
    return this.state === CircuitBreakerState.HALF_OPEN;
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    console.log(`Circuit breaker ${this.name}: Manual reset requested`);
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = null;
  }

  /**
   * Force open the circuit breaker (for testing)
   */
  forceOpen(): void {
    console.log(`Circuit breaker ${this.name}: Forced OPEN for testing`);
    this.state = CircuitBreakerState.OPEN;
    this.nextAttemptTime = Date.now() + this.recoveryTimeout;
  }

  /**
   * Get comprehensive statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      name: this.name,
      state: this.state,
      failure_count: this.failureCount,
      success_count: this.successCount,
      last_failure_time: this.lastFailureTime,
      last_success_time: this.lastSuccessTime,
      next_attempt_time: this.nextAttemptTime,
      total_requests: this.totalRequests,
    };
  }

  /**
   * Get health status for monitoring
   */
  getHealth(): {
    healthy: boolean;
    state: CircuitBreakerState;
    failure_rate: number;
    availability: number;
  } {
    const failureRate =
      this.totalRequests > 0
        ? (this.failureCount / this.totalRequests) * 100
        : 0;

    const successRate =
      this.totalRequests > 0
        ? (this.successCount / this.totalRequests) * 100
        : 100;

    return {
      healthy: this.state === CircuitBreakerState.CLOSED && failureRate < 10,
      state: this.state,
      failure_rate: Math.round(failureRate * 100) / 100,
      availability: Math.round(successRate * 100) / 100,
    };
  }
}

/**
 * Circuit Breaker Manager for handling multiple circuit breakers
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {}

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  /**
   * Create or get a circuit breaker
   */
  getCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
    if (!this.circuitBreakers.has(config.name)) {
      this.circuitBreakers.set(config.name, new CircuitBreaker(config));
    }
    return this.circuitBreakers.get(config.name)!;
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): CircuitBreakerStats[] {
    return Array.from(this.circuitBreakers.values()).map((cb) => cb.getStats());
  }

  /**
   * Get health status of all circuit breakers
   */
  getSystemHealth(): {
    overall_healthy: boolean;
    circuit_breakers: Array<{ name: string; healthy: boolean; state: string }>;
  } {
    const stats = Array.from(this.circuitBreakers.values()).map((cb) => {
      const health = cb.getHealth();
      return {
        name: cb.name,
        healthy: health.healthy,
        state: health.state,
      };
    });

    const overallHealthy =
      stats.length === 0 || stats.every((stat) => stat.healthy);

    return {
      overall_healthy: overallHealthy,
      circuit_breakers: stats,
    };
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    console.log('Resetting all circuit breakers');
    this.circuitBreakers.forEach((cb) => cb.reset());
  }

  /**
   * Remove a circuit breaker
   */
  removeCircuitBreaker(name: string): boolean {
    return this.circuitBreakers.delete(name);
  }
}

// Export default instance
export const circuitBreakerManager = CircuitBreakerManager.getInstance();
