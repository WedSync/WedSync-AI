/**
 * WedSync Production Circuit Breaker System
 * Enterprise-grade fault tolerance with automatic failover
 *
 * @version 2.0.0
 * @author WedSync DevOps/SRE Team
 * @since 2025-01-20
 */

import { EventEmitter } from 'events';
import { getAPM } from '@/lib/monitoring/integration-apm';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CircuitBreakerConfig {
  id: string;
  timeout: number;
  errorThreshold: number;
  resetTimeout: number;
  halfOpenMaxCalls: number;
  slidingWindowSize: number;
  healthCheckUrl?: string;
  fallbackStrategy?: 'cache' | 'degraded' | 'offline';
}

export interface CircuitBreakerStats {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  requestCount: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
  uptime: number;
}

export interface HealthCheck {
  endpoint: string;
  interval: number;
  timeout: number;
  retries: number;
}

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

export class EnterpriseCircuitBreaker extends EventEmitter {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private requestCount = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;
  private slidingWindow: boolean[] = [];
  private halfOpenCallCount = 0;

  constructor(private config: CircuitBreakerConfig) {
    super();
    this.initializeCircuitBreaker();
  }

  private initializeCircuitBreaker(): void {
    this.emit('initialized', { id: this.config.id, state: this.state });
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.requestCount++;

    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.moveToHalfOpen();
      } else {
        throw new Error(`Circuit breaker OPEN for ${this.config.id}`);
      }
    }

    if (
      this.state === 'HALF_OPEN' &&
      this.halfOpenCallCount >= this.config.halfOpenMaxCalls
    ) {
      throw new Error(
        `Circuit breaker HALF_OPEN call limit exceeded for ${this.config.id}`,
      );
    }

    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      operation()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private onSuccess(): void {
    this.successCount++;
    this.addToSlidingWindow(true);

    if (this.state === 'HALF_OPEN') {
      this.halfOpenCallCount++;
      if (this.halfOpenCallCount >= this.config.halfOpenMaxCalls) {
        this.moveToClosed();
      }
    }
  }

  private onFailure(error: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.addToSlidingWindow(false);

    if (this.state === 'HALF_OPEN') {
      this.moveToOpen();
    } else if (this.state === 'CLOSED' && this.shouldOpenCircuit()) {
      this.moveToOpen();
    }

    this.emit('failure', { id: this.config.id, error, state: this.state });
  }

  private shouldOpenCircuit(): boolean {
    const windowSize = Math.min(
      this.slidingWindow.length,
      this.config.slidingWindowSize,
    );
    if (windowSize < this.config.errorThreshold) return false;

    const recentWindow = this.slidingWindow.slice(-windowSize);
    const failures = recentWindow.filter((success) => !success).length;
    const failureRate = failures / windowSize;

    return (
      failureRate >= this.config.errorThreshold / this.config.slidingWindowSize
    );
  }

  private shouldAttemptReset(): boolean {
    return !this.nextAttemptTime || Date.now() >= this.nextAttemptTime;
  }

  private moveToOpen(): void {
    this.state = 'OPEN';
    this.nextAttemptTime = Date.now() + this.config.resetTimeout;
    this.emit('open', {
      id: this.config.id,
      nextAttemptTime: this.nextAttemptTime,
    });
  }

  private moveToHalfOpen(): void {
    this.state = 'HALF_OPEN';
    this.halfOpenCallCount = 0;
    this.emit('halfOpen', { id: this.config.id });
  }

  private moveToClosed(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttemptTime = undefined;
    this.halfOpenCallCount = 0;
    this.emit('close', { id: this.config.id });
  }

  private addToSlidingWindow(success: boolean): void {
    this.slidingWindow.push(success);
    if (this.slidingWindow.length > this.config.slidingWindowSize) {
      this.slidingWindow.shift();
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      uptime: this.calculateUptime(),
    };
  }

  private calculateUptime(): number {
    if (this.requestCount === 0) return 1.0;
    return this.successCount / this.requestCount;
  }
}

// ============================================================================
// Circuit Breaker Manager
// ============================================================================

export class ProductionCircuitBreakerManager {
  private circuitBreakers = new Map<string, EnterpriseCircuitBreaker>();
  private healthChecks = new Map<string, HealthCheck>();
  private apm = getAPM();

  async initializeCircuitBreakers(
    integrations: CircuitBreakerConfig[],
  ): Promise<void> {
    for (const config of integrations) {
      const circuitBreaker = new EnterpriseCircuitBreaker(config);

      // Set up event listeners
      circuitBreaker.on('open', (data) => this.handleCircuitBreakerOpen(data));
      circuitBreaker.on('halfOpen', (data) =>
        this.handleCircuitBreakerHalfOpen(data),
      );
      circuitBreaker.on('close', (data) =>
        this.handleCircuitBreakerClose(data),
      );

      this.circuitBreakers.set(config.id, circuitBreaker);

      // Set up health check if configured
      if (config.healthCheckUrl) {
        const healthCheck: HealthCheck = {
          endpoint: config.healthCheckUrl,
          interval: 30000,
          timeout: 5000,
          retries: 3,
        };
        this.healthChecks.set(config.id, healthCheck);
        this.startHealthCheckMonitoring(config.id);
      }
    }
  }

  async executeWithCircuitBreaker<T>(
    integrationId: string,
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>,
  ): Promise<T> {
    const circuitBreaker = this.circuitBreakers.get(integrationId);
    if (!circuitBreaker) {
      throw new Error(`Circuit breaker not found: ${integrationId}`);
    }

    try {
      return await circuitBreaker.execute(operation);
    } catch (error) {
      if (fallbackOperation && circuitBreaker.getStats().state === 'OPEN') {
        console.warn(
          `Circuit breaker OPEN for ${integrationId}, executing fallback`,
        );
        return await fallbackOperation();
      }
      throw error;
    }
  }

  private async handleCircuitBreakerOpen(data: any): Promise<void> {
    console.error(`🔴 Circuit breaker OPEN: ${data.id}`);

    // Enable graceful degradation
    await this.enableGracefulDegradation(data.id);

    // Send alert
    await this.apm.recordSystemMetrics({
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkIn: 0,
      networkOut: 0,
      activeConnections: 0,
      queueDepth: 0,
      errorRate: 1.0, // 100% error rate for this service
      responseTimeP95: 9999,
      responseTimeP99: 9999,
    });
  }

  private async handleCircuitBreakerHalfOpen(data: any): Promise<void> {
    console.warn(`🟡 Circuit breaker HALF_OPEN: ${data.id}`);
  }

  private async handleCircuitBreakerClose(data: any): Promise<void> {
    console.log(`🟢 Circuit breaker CLOSED: ${data.id}`);
    await this.disableGracefulDegradation(data.id);
  }

  private async enableGracefulDegradation(
    integrationId: string,
  ): Promise<void> {
    // Implementation would depend on the specific integration
    console.log(`Enabling graceful degradation for ${integrationId}`);
  }

  private async disableGracefulDegradation(
    integrationId: string,
  ): Promise<void> {
    console.log(`Disabling graceful degradation for ${integrationId}`);
  }

  private startHealthCheckMonitoring(integrationId: string): void {
    const healthCheck = this.healthChecks.get(integrationId);
    if (!healthCheck) return;

    setInterval(async () => {
      await this.performHealthCheck(integrationId, healthCheck);
    }, healthCheck.interval);
  }

  private async performHealthCheck(
    integrationId: string,
    healthCheck: HealthCheck,
  ): Promise<void> {
    try {
      const response = await fetch(healthCheck.endpoint, {
        timeout: healthCheck.timeout,
        headers: { 'User-Agent': 'WedSync-CircuitBreaker/2.0' },
      });

      if (response.ok) {
        console.log(`✅ Health check passed for ${integrationId}`);
      } else {
        console.warn(
          `⚠️  Health check failed for ${integrationId}: ${response.status}`,
        );
      }
    } catch (error) {
      console.error(`❌ Health check error for ${integrationId}:`, error);
    }
  }

  getCircuitBreakerStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();
    for (const [id, circuitBreaker] of this.circuitBreakers.entries()) {
      stats.set(id, circuitBreaker.getStats());
    }
    return stats;
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down circuit breakers...');
    // Clean shutdown logic
  }
}

// ============================================================================
// Factory & Export
// ============================================================================

let circuitBreakerManagerInstance: ProductionCircuitBreakerManager | null =
  null;

export const getCircuitBreakerManager = (): ProductionCircuitBreakerManager => {
  if (!circuitBreakerManagerInstance) {
    circuitBreakerManagerInstance = new ProductionCircuitBreakerManager();
  }
  return circuitBreakerManagerInstance;
};

export default ProductionCircuitBreakerManager;
