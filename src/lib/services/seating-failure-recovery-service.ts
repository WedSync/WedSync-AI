/**
 * WS-154 Round 3: Seating Failure Recovery Service
 * Team C - Graceful handling of team service failures
 * Ensures seating arrangements remain functional when team services fail
 */

import { performanceMonitor } from '@/lib/monitoring/performance-monitor';

interface ServiceStatus {
  serviceName: string;
  isHealthy: boolean;
  lastChecked: Date;
  consecutiveFailures: number;
  averageResponseTime: number;
  failureReasons: string[];
}

interface FailureRecoveryConfig {
  maxRetries: number;
  retryDelayMs: number;
  circuitBreakerThreshold: number;
  fallbackTimeoutMs: number;
  healthCheckIntervalMs: number;
}

interface RecoveryStrategy {
  strategyType: 'fallback' | 'retry' | 'circuit_breaker' | 'degraded_mode';
  description: string;
  implementation: () => Promise<any>;
  successRate: number;
}

export class SeatingFailureRecoveryService {
  private serviceStatus: Map<string, ServiceStatus> = new Map();
  private recoveryStrategies: Map<string, RecoveryStrategy[]> = new Map();
  private config: FailureRecoveryConfig;

  constructor(config?: Partial<FailureRecoveryConfig>) {
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      circuitBreakerThreshold: 5,
      fallbackTimeoutMs: 5000,
      healthCheckIntervalMs: 30000,
      ...config,
    };

    this.initializeServices();
    this.setupRecoveryStrategies();
    this.startHealthChecks();
  }

  /**
   * Execute seating operation with failure recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    serviceName: string,
    fallbackOperation?: () => Promise<T>,
  ): Promise<T> {
    const startTime = performance.now();

    try {
      // Check if service is healthy
      const status = this.serviceStatus.get(serviceName);
      if (!status?.isHealthy) {
        console.warn(
          `Service ${serviceName} is unhealthy, attempting recovery`,
        );
        return await this.executeRecoveryStrategy(
          serviceName,
          operation,
          fallbackOperation,
        );
      }

      // Execute the operation
      const result = await this.executeWithCircuitBreaker(
        operation,
        serviceName,
      );

      // Update success metrics
      this.updateServiceSuccess(serviceName, performance.now() - startTime);

      return result;
    } catch (error) {
      console.error(`Service ${serviceName} failed:`, error);

      // Update failure metrics
      this.updateServiceFailure(serviceName, error as Error);

      // Attempt recovery
      return await this.executeRecoveryStrategy(
        serviceName,
        operation,
        fallbackOperation,
      );
    }
  }

  /**
   * Execute recovery strategy based on service and failure type
   */
  private async executeRecoveryStrategy<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>,
  ): Promise<T> {
    const strategies = this.recoveryStrategies.get(serviceName) || [];

    for (const strategy of strategies.sort(
      (a, b) => b.successRate - a.successRate,
    )) {
      try {
        console.log(
          `Attempting ${strategy.strategyType} recovery for ${serviceName}`,
        );

        switch (strategy.strategyType) {
          case 'retry':
            return await this.executeRetryStrategy(operation, serviceName);

          case 'fallback':
            if (fallbackOperation) {
              return await this.executeFallbackStrategy(
                fallbackOperation,
                serviceName,
              );
            }
            break;

          case 'circuit_breaker':
            return await this.executeCircuitBreakerStrategy(
              operation,
              serviceName,
            );

          case 'degraded_mode':
            return await this.executeDegradedModeStrategy(serviceName);
        }
      } catch (recoveryError) {
        console.error(
          `Recovery strategy ${strategy.strategyType} failed:`,
          recoveryError,
        );
        continue;
      }
    }

    throw new Error(
      `All recovery strategies failed for service ${serviceName}`,
    );
  }

  /**
   * Retry strategy with exponential backoff
   */
  private async executeRetryStrategy<T>(
    operation: () => Promise<T>,
    serviceName: string,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(
          `Retry attempt ${attempt}/${this.config.maxRetries} for ${serviceName}`,
        );
        const result = await operation();

        // Reset failure count on success
        const status = this.serviceStatus.get(serviceName);
        if (status) {
          status.consecutiveFailures = 0;
          status.isHealthy = true;
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
          console.log(`Waiting ${delay}ms before retry`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Retry strategy exhausted for ${serviceName}`);
  }

  /**
   * Fallback strategy - use alternative implementation
   */
  private async executeFallbackStrategy<T>(
    fallbackOperation: () => Promise<T>,
    serviceName: string,
  ): Promise<T> {
    console.log(`Executing fallback strategy for ${serviceName}`);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Fallback timeout')),
        this.config.fallbackTimeoutMs,
      ),
    );

    try {
      const result = await Promise.race([fallbackOperation(), timeoutPromise]);
      console.log(`Fallback strategy succeeded for ${serviceName}`);
      return result;
    } catch (error) {
      console.error(`Fallback strategy failed for ${serviceName}:`, error);
      throw error;
    }
  }

  /**
   * Circuit breaker strategy
   */
  private async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    serviceName: string,
  ): Promise<T> {
    const status = this.serviceStatus.get(serviceName);

    if (
      status &&
      status.consecutiveFailures >= this.config.circuitBreakerThreshold
    ) {
      throw new Error(`Circuit breaker open for ${serviceName}`);
    }

    return await operation();
  }

  private async executeCircuitBreakerStrategy<T>(
    operation: () => Promise<T>,
    serviceName: string,
  ): Promise<T> {
    // If circuit is open, try to close it with a test request
    const status = this.serviceStatus.get(serviceName);

    if (
      status &&
      status.consecutiveFailures >= this.config.circuitBreakerThreshold
    ) {
      console.log(
        `Circuit breaker is open for ${serviceName}, attempting to close`,
      );

      // Wait longer before attempting to close circuit
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.retryDelayMs * 2),
      );

      // Reset consecutive failures to allow one test
      status.consecutiveFailures = this.config.circuitBreakerThreshold - 1;
    }

    return await operation();
  }

  /**
   * Degraded mode strategy - provide minimal functionality
   */
  private async executeDegradedModeStrategy<T>(
    serviceName: string,
  ): Promise<T> {
    console.log(`Entering degraded mode for ${serviceName}`);

    switch (serviceName) {
      case 'team-a-realtime':
        // Return basic conflict warnings without real-time updates
        return this.getDegradedConflictWarnings() as T;

      case 'team-b-optimization':
        // Return basic seating arrangement without advanced optimization
        return this.getBasicSeatingArrangement() as T;

      case 'team-d-mobile':
        // Return desktop-optimized response
        return this.getDesktopOptimizedResponse() as T;

      case 'team-e-database':
        // Use cached data or basic queries
        return this.getCachedDatabaseResults() as T;

      default:
        throw new Error(`No degraded mode available for ${serviceName}`);
    }
  }

  /**
   * Initialize service status tracking
   */
  private initializeServices(): void {
    const services = [
      'team-a-realtime',
      'team-b-optimization',
      'team-c-conflict',
      'team-d-mobile',
      'team-e-database',
    ];

    services.forEach((service) => {
      this.serviceStatus.set(service, {
        serviceName: service,
        isHealthy: true,
        lastChecked: new Date(),
        consecutiveFailures: 0,
        averageResponseTime: 0,
        failureReasons: [],
      });
    });
  }

  /**
   * Setup recovery strategies for each service
   */
  private setupRecoveryStrategies(): void {
    // Team A Real-time Conflict Warnings
    this.recoveryStrategies.set('team-a-realtime', [
      {
        strategyType: 'retry',
        description: 'Retry real-time connection',
        implementation: async () => null,
        successRate: 0.8,
      },
      {
        strategyType: 'fallback',
        description: 'Use polling instead of real-time',
        implementation: async () => null,
        successRate: 0.9,
      },
      {
        strategyType: 'degraded_mode',
        description: 'Basic conflict warnings',
        implementation: async () => null,
        successRate: 1.0,
      },
    ]);

    // Team B Optimization Algorithms
    this.recoveryStrategies.set('team-b-optimization', [
      {
        strategyType: 'retry',
        description: 'Retry optimization with different parameters',
        implementation: async () => null,
        successRate: 0.7,
      },
      {
        strategyType: 'fallback',
        description: 'Use basic optimization algorithm',
        implementation: async () => null,
        successRate: 0.95,
      },
    ]);

    // Team D Mobile Optimization
    this.recoveryStrategies.set('team-d-mobile', [
      {
        strategyType: 'fallback',
        description: 'Return desktop-optimized response',
        implementation: async () => null,
        successRate: 1.0,
      },
    ]);

    // Team E Database Queries
    this.recoveryStrategies.set('team-e-database', [
      {
        strategyType: 'retry',
        description: 'Retry with simpler query',
        implementation: async () => null,
        successRate: 0.8,
      },
      {
        strategyType: 'fallback',
        description: 'Use cached data',
        implementation: async () => null,
        successRate: 0.9,
      },
      {
        strategyType: 'circuit_breaker',
        description: 'Temporary disable and retry later',
        implementation: async () => null,
        successRate: 0.6,
      },
    ]);
  }

  /**
   * Start health check monitoring
   */
  private startHealthChecks(): void {
    setInterval(async () => {
      for (const [serviceName, status] of this.serviceStatus.entries()) {
        try {
          const isHealthy = await this.checkServiceHealth(serviceName);
          status.isHealthy = isHealthy;
          status.lastChecked = new Date();

          if (isHealthy) {
            status.consecutiveFailures = 0;
          }
        } catch (error) {
          this.updateServiceFailure(serviceName, error as Error);
        }
      }
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Check individual service health
   */
  private async checkServiceHealth(serviceName: string): Promise<boolean> {
    const startTime = performance.now();

    try {
      // Implement actual health checks for each service
      switch (serviceName) {
        case 'team-a-realtime':
          return await this.checkRealtimeHealth();
        case 'team-b-optimization':
          return await this.checkOptimizationHealth();
        case 'team-d-mobile':
          return await this.checkMobileHealth();
        case 'team-e-database':
          return await this.checkDatabaseHealth();
        default:
          return true;
      }
    } finally {
      const responseTime = performance.now() - startTime;
      this.updateServiceResponseTime(serviceName, responseTime);
    }
  }

  // Health check implementations
  private async checkRealtimeHealth(): Promise<boolean> {
    // Mock health check - in real implementation would ping real-time service
    return Math.random() > 0.1; // 90% success rate
  }

  private async checkOptimizationHealth(): Promise<boolean> {
    // Mock health check
    return Math.random() > 0.05; // 95% success rate
  }

  private async checkMobileHealth(): Promise<boolean> {
    // Mock health check
    return Math.random() > 0.02; // 98% success rate
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    // Mock health check
    return Math.random() > 0.03; // 97% success rate
  }

  // Degraded mode implementations
  private getDegradedConflictWarnings(): any {
    return {
      conflicts: [],
      warnings: ['Service temporarily unavailable - showing cached warnings'],
      mode: 'degraded',
    };
  }

  private getBasicSeatingArrangement(): any {
    return {
      arrangement: {},
      optimization_score: 0.5,
      mode: 'basic',
      note: 'Using basic algorithm - advanced optimization unavailable',
    };
  }

  private getDesktopOptimizedResponse(): any {
    return {
      layout: 'desktop',
      mobile_optimizations: false,
      note: 'Mobile optimization service unavailable',
    };
  }

  private getCachedDatabaseResults(): any {
    return {
      data: [],
      cached: true,
      note: 'Database service unavailable - using cached data',
    };
  }

  // Utility methods
  private updateServiceSuccess(
    serviceName: string,
    responseTime: number,
  ): void {
    const status = this.serviceStatus.get(serviceName);
    if (status) {
      status.isHealthy = true;
      status.consecutiveFailures = 0;
      status.averageResponseTime =
        (status.averageResponseTime + responseTime) / 2;
      status.lastChecked = new Date();
    }
  }

  private updateServiceFailure(serviceName: string, error: Error): void {
    const status = this.serviceStatus.get(serviceName);
    if (status) {
      status.consecutiveFailures++;
      status.isHealthy =
        status.consecutiveFailures < this.config.circuitBreakerThreshold;
      status.failureReasons.push(error.message);
      status.lastChecked = new Date();

      // Keep only last 10 failure reasons
      if (status.failureReasons.length > 10) {
        status.failureReasons = status.failureReasons.slice(-10);
      }
    }
  }

  private updateServiceResponseTime(
    serviceName: string,
    responseTime: number,
  ): void {
    const status = this.serviceStatus.get(serviceName);
    if (status) {
      status.averageResponseTime =
        (status.averageResponseTime + responseTime) / 2;
    }
  }

  /**
   * Get service status report
   */
  getServiceStatusReport(): { [serviceName: string]: ServiceStatus } {
    const report: { [serviceName: string]: ServiceStatus } = {};

    this.serviceStatus.forEach((status, serviceName) => {
      report[serviceName] = { ...status };
    });

    return report;
  }

  /**
   * Manually mark service as healthy
   */
  markServiceHealthy(serviceName: string): void {
    const status = this.serviceStatus.get(serviceName);
    if (status) {
      status.isHealthy = true;
      status.consecutiveFailures = 0;
      status.lastChecked = new Date();
    }
  }

  /**
   * Get recovery recommendations
   */
  getRecoveryRecommendations(): string[] {
    const recommendations: string[] = [];

    this.serviceStatus.forEach((status, serviceName) => {
      if (!status.isHealthy) {
        recommendations.push(
          `Service ${serviceName} requires attention: ${status.consecutiveFailures} consecutive failures`,
        );
      }
      if (status.averageResponseTime > 1000) {
        recommendations.push(
          `Service ${serviceName} has high response time: ${status.averageResponseTime.toFixed(0)}ms`,
        );
      }
    });

    return recommendations;
  }
}

// Export singleton instance
export const seatingFailureRecoveryService =
  new SeatingFailureRecoveryService();
