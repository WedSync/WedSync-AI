/**
 * Circuit Breaker Integration for Rate Limiting System
 * Prevents cascading failures and provides resilience patterns
 * Team C - WS-199 Implementation
 */

import { RedisClusterManager, redisClusterManager } from './redis-cluster';
import { RateLimitResult } from '@/lib/middleware/rate-limiting';
import { logger } from '@/lib/monitoring/structured-logger';

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  nextAttemptTime: number | null;
  totalRequests: number;
  consecutiveFailures: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
  halfOpenMaxCalls: number;
  weddingProtectionMode: boolean;
  minimumThroughput: number;
  errorRateThreshold: number;
}

export interface CircuitBreakerResult<T> {
  success: boolean;
  result?: T;
  fallbackUsed: boolean;
  circuitState: 'closed' | 'open' | 'half-open';
  error?: Error;
  executionTime: number;
}

export interface FallbackStrategy {
  type: 'static' | 'cached' | 'degraded' | 'queue';
  value?: any;
  ttl?: number;
  degradedFunction?: () => Promise<any>;
}

/**
 * Circuit Breaker Integration for Wedding Platform
 * Provides resilience and fallback strategies for rate limiting components
 */
export class RateLimitCircuitBreakerIntegration extends RedisClusterManager {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private fallbackCache: Map<string, { value: any; expiry: number }> =
    new Map();
  private readonly STATE_SYNC_INTERVAL = 10000; // 10 seconds

  // Wedding-specific circuit breaker configurations
  private readonly DEFAULT_CONFIGS: Record<string, CircuitBreakerConfig> = {
    'redis-rate-limiting': {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringWindow: 300000, // 5 minutes
      halfOpenMaxCalls: 3,
      weddingProtectionMode: true,
      minimumThroughput: 10,
      errorRateThreshold: 50, // 50%
    },
    'external-api-calls': {
      failureThreshold: 3,
      recoveryTimeout: 30000, // 30 seconds
      monitoringWindow: 120000, // 2 minutes
      halfOpenMaxCalls: 2,
      weddingProtectionMode: true,
      minimumThroughput: 5,
      errorRateThreshold: 40, // 40%
    },
    'webhook-processing': {
      failureThreshold: 8,
      recoveryTimeout: 45000, // 45 seconds
      monitoringWindow: 180000, // 3 minutes
      halfOpenMaxCalls: 5,
      weddingProtectionMode: false, // Webhooks can tolerate some delays
      minimumThroughput: 20,
      errorRateThreshold: 60, // 60%
    },
    'database-operations': {
      failureThreshold: 3,
      recoveryTimeout: 20000, // 20 seconds
      monitoringWindow: 60000, // 1 minute
      halfOpenMaxCalls: 2,
      weddingProtectionMode: true, // Database is critical
      minimumThroughput: 15,
      errorRateThreshold: 30, // 30%
    },
    'monitoring-systems': {
      failureThreshold: 10,
      recoveryTimeout: 90000, // 1.5 minutes
      monitoringWindow: 300000, // 5 minutes
      halfOpenMaxCalls: 3,
      weddingProtectionMode: false, // Monitoring failures shouldn't block operations
      minimumThroughput: 5,
      errorRateThreshold: 70, // 70%
    },
  };

  constructor() {
    super();
    this.startStateSynchronization();
  }

  /**
   * Execute function with circuit breaker protection
   */
  async executeWithCircuitBreaker<T>(
    operationName: string,
    fn: () => Promise<T>,
    fallbackStrategy: FallbackStrategy,
  ): Promise<CircuitBreakerResult<T>> {
    const startTime = Date.now();
    const config = this.getCircuitBreakerConfig(operationName);
    const breaker = this.getOrCreateCircuitBreaker(operationName, config);

    try {
      // Check circuit breaker state
      const canExecute = this.canExecuteRequest(breaker, config);

      if (!canExecute.allowed) {
        logger.warn(`Circuit breaker is OPEN for ${operationName}`, {
          state: breaker.state,
          failureCount: breaker.failureCount,
          nextAttemptTime: breaker.nextAttemptTime,
        });

        // Use fallback strategy
        const fallbackResult = await this.executeFallback(
          operationName,
          fallbackStrategy,
        );

        return {
          success: false,
          result: fallbackResult,
          fallbackUsed: true,
          circuitState: breaker.state,
          error: new Error(`Circuit breaker is ${breaker.state}`),
          executionTime: Date.now() - startTime,
        };
      }

      // Execute the protected function
      const result = await fn();

      // Record success
      await this.recordSuccess(operationName, breaker, config);

      logger.debug(`Circuit breaker execution succeeded: ${operationName}`, {
        executionTime: Date.now() - startTime,
        circuitState: breaker.state,
      });

      return {
        success: true,
        result,
        fallbackUsed: false,
        circuitState: breaker.state,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      // Record failure
      await this.recordFailure(operationName, breaker, config, error as Error);

      logger.error(`Circuit breaker execution failed: ${operationName}`, error);

      // Apply wedding protection mode
      if (config.weddingProtectionMode && this.isWeddingCriticalTime()) {
        const fallbackResult = await this.executeFallback(
          operationName,
          fallbackStrategy,
        );

        return {
          success: false,
          result: fallbackResult,
          fallbackUsed: true,
          circuitState: breaker.state,
          error: error as Error,
          executionTime: Date.now() - startTime,
        };
      }

      // Normal error handling
      throw error;
    }
  }

  /**
   * Get rate limiting fallback when circuit breaker is open
   */
  getRateLimitFallback(): RateLimitResult {
    const fallbackStrategy = this.determineFallbackStrategy();

    logger.info('Using rate limiting fallback due to circuit breaker', {
      strategy: fallbackStrategy,
      isWeddingCritical: this.isWeddingCriticalTime(),
    });

    switch (fallbackStrategy) {
      case 'fail_open':
        // Allow requests to continue (high availability)
        return {
          allowed: true,
          remaining: 100, // Conservative estimate
          limit: 1000,
          resetTime: Date.now() + 3600000, // 1 hour
          reason: 'Circuit breaker fallback - failing open',
          fallbackMode: true,
        };

      case 'fail_closed':
        // Block requests (high security)
        return {
          allowed: false,
          remaining: 0,
          limit: 1000,
          resetTime: Date.now() + 300000, // 5 minutes
          retryAfterMinutes: 5,
          reason: 'Circuit breaker fallback - failing closed',
          fallbackMode: true,
        };

      case 'cached_limits':
        // Use cached rate limit information
        const cachedLimits = this.getCachedRateLimits();
        return {
          allowed: cachedLimits.allowed,
          remaining: cachedLimits.remaining,
          limit: cachedLimits.limit,
          resetTime: Date.now() + 300000,
          reason: 'Circuit breaker fallback - using cached limits',
          fallbackMode: true,
        };

      default:
        // Conservative fallback
        return {
          allowed: true,
          remaining: 50,
          limit: 500,
          resetTime: Date.now() + 1800000, // 30 minutes
          reason: 'Circuit breaker fallback - conservative limits',
          fallbackMode: true,
        };
    }
  }

  /**
   * Execute health check with circuit breaker protection
   */
  async executeHealthCheck(
    serviceName: string,
    healthCheckFn: () => Promise<boolean>,
  ): Promise<CircuitBreakerResult<boolean>> {
    return await this.executeWithCircuitBreaker(
      `health-check-${serviceName}`,
      healthCheckFn,
      {
        type: 'static',
        value: false, // Assume unhealthy if circuit is open
      },
    );
  }

  /**
   * Execute external API call with circuit breaker protection
   */
  async executeExternalApiCall<T>(
    apiName: string,
    apiCallFn: () => Promise<T>,
    cachedFallback?: T,
  ): Promise<CircuitBreakerResult<T>> {
    return await this.executeWithCircuitBreaker(
      `external-api-${apiName}`,
      apiCallFn,
      {
        type: cachedFallback ? 'cached' : 'static',
        value: cachedFallback,
        ttl: 300000, // 5 minutes
      },
    );
  }

  /**
   * Execute database operation with circuit breaker protection
   */
  async executeDatabaseOperation<T>(
    operationName: string,
    dbOperationFn: () => Promise<T>,
    fallbackValue?: T,
  ): Promise<CircuitBreakerResult<T>> {
    return await this.executeWithCircuitBreaker(
      `database-${operationName}`,
      dbOperationFn,
      {
        type: 'static',
        value: fallbackValue,
      },
    );
  }

  /**
   * Check if request can be executed based on circuit breaker state
   */
  private canExecuteRequest(
    breaker: CircuitBreakerState,
    config: CircuitBreakerConfig,
  ): { allowed: boolean; reason?: string } {
    const now = Date.now();

    switch (breaker.state) {
      case 'closed':
        return { allowed: true };

      case 'open':
        if (breaker.nextAttemptTime && now >= breaker.nextAttemptTime) {
          // Transition to half-open
          breaker.state = 'half-open';
          breaker.successCount = 0;
          breaker.totalRequests = 0;

          logger.info('Circuit breaker transitioning to HALF-OPEN', {
            breaker: breaker,
            config: config,
          });

          return { allowed: true };
        }
        return {
          allowed: false,
          reason: `Circuit is open until ${new Date(breaker.nextAttemptTime || 0).toISOString()}`,
        };

      case 'half-open':
        if (breaker.totalRequests >= config.halfOpenMaxCalls) {
          return {
            allowed: false,
            reason: `Half-open call limit reached (${config.halfOpenMaxCalls})`,
          };
        }
        return { allowed: true };

      default:
        return { allowed: true };
    }
  }

  /**
   * Record successful execution
   */
  private async recordSuccess(
    operationName: string,
    breaker: CircuitBreakerState,
    config: CircuitBreakerConfig,
  ): Promise<void> {
    breaker.successCount++;
    breaker.totalRequests++;
    breaker.consecutiveFailures = 0;

    if (breaker.state === 'half-open') {
      if (breaker.successCount >= config.halfOpenMaxCalls) {
        // Transition back to closed
        breaker.state = 'closed';
        breaker.failureCount = 0;
        breaker.lastFailureTime = null;
        breaker.nextAttemptTime = null;

        logger.info('Circuit breaker transitioning to CLOSED', {
          operationName,
          successCount: breaker.successCount,
        });
      }
    }

    // Persist state changes
    await this.persistCircuitBreakerState(operationName, breaker);
  }

  /**
   * Record failed execution
   */
  private async recordFailure(
    operationName: string,
    breaker: CircuitBreakerState,
    config: CircuitBreakerConfig,
    error: Error,
  ): Promise<void> {
    breaker.failureCount++;
    breaker.consecutiveFailures++;
    breaker.totalRequests++;
    breaker.lastFailureTime = Date.now();

    // Calculate error rate over monitoring window
    const errorRate = this.calculateErrorRate(breaker, config);

    // Check if circuit should open
    const shouldOpen =
      breaker.consecutiveFailures >= config.failureThreshold ||
      (breaker.totalRequests >= config.minimumThroughput &&
        errorRate >= config.errorRateThreshold);

    if (shouldOpen && breaker.state !== 'open') {
      // Transition to open
      breaker.state = 'open';
      breaker.nextAttemptTime = Date.now() + config.recoveryTimeout;

      logger.error('Circuit breaker transitioning to OPEN', {
        operationName,
        failureCount: breaker.failureCount,
        consecutiveFailures: breaker.consecutiveFailures,
        errorRate,
        error: error.message,
        nextAttemptTime: new Date(breaker.nextAttemptTime).toISOString(),
      });

      // Send alert for wedding-critical operations
      if (config.weddingProtectionMode) {
        await this.sendWeddingCriticalAlert(operationName, breaker, error);
      }
    }

    // Persist state changes
    await this.persistCircuitBreakerState(operationName, breaker);
  }

  /**
   * Calculate error rate over monitoring window
   */
  private calculateErrorRate(
    breaker: CircuitBreakerState,
    config: CircuitBreakerConfig,
  ): number {
    if (breaker.totalRequests === 0) return 0;

    // Simplified calculation - in production, use sliding window
    return (breaker.failureCount / breaker.totalRequests) * 100;
  }

  /**
   * Execute fallback strategy
   */
  private async executeFallback(
    operationName: string,
    strategy: FallbackStrategy,
  ): Promise<any> {
    switch (strategy.type) {
      case 'static':
        return strategy.value;

      case 'cached':
        const cached = this.fallbackCache.get(operationName);
        if (cached && cached.expiry > Date.now()) {
          return cached.value;
        }
        return strategy.value; // Fallback to static if cache expired

      case 'degraded':
        if (strategy.degradedFunction) {
          try {
            return await strategy.degradedFunction();
          } catch (error) {
            logger.warn(`Degraded function failed for ${operationName}`, error);
            return strategy.value;
          }
        }
        return strategy.value;

      case 'queue':
        // Queue the operation for later execution
        await this.queueFailedOperation(operationName, strategy.value);
        return { queued: true, operationName };

      default:
        return null;
    }
  }

  /**
   * Get or create circuit breaker for operation
   */
  private getOrCreateCircuitBreaker(
    operationName: string,
    config: CircuitBreakerConfig,
  ): CircuitBreakerState {
    let breaker = this.circuitBreakers.get(operationName);

    if (!breaker) {
      breaker = {
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: null,
        nextAttemptTime: null,
        totalRequests: 0,
        consecutiveFailures: 0,
      };

      this.circuitBreakers.set(operationName, breaker);
    }

    return breaker;
  }

  /**
   * Get circuit breaker configuration
   */
  private getCircuitBreakerConfig(operationName: string): CircuitBreakerConfig {
    // Determine config based on operation name
    for (const [pattern, config] of Object.entries(this.DEFAULT_CONFIGS)) {
      if (
        operationName.includes(pattern) ||
        operationName.startsWith(pattern)
      ) {
        return { ...config }; // Return copy to avoid mutations
      }
    }

    // Default configuration
    return { ...this.DEFAULT_CONFIGS['redis-rate-limiting'] };
  }

  /**
   * Determine fallback strategy based on current conditions
   */
  private determineFallbackStrategy():
    | 'fail_open'
    | 'fail_closed'
    | 'cached_limits' {
    const isWeddingCritical = this.isWeddingCriticalTime();
    const hasRecentCache = this.hasRecentCachedLimits();

    if (isWeddingCritical) {
      // During wedding-critical times, prefer availability with cached limits
      return hasRecentCache ? 'cached_limits' : 'fail_open';
    }

    // During normal times, balance security and availability
    return hasRecentCache ? 'cached_limits' : 'fail_open';
  }

  /**
   * Check if it's a wedding-critical time
   */
  private isWeddingCriticalTime(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const month = now.getMonth() + 1;

    // Saturday weddings (ceremony time: 12pm-8pm)
    const isSaturdayWeddingTime = dayOfWeek === 6 && hour >= 12 && hour <= 20;

    // Wedding season peak (May-September)
    const isWeddingSeason = month >= 5 && month <= 9;

    // Wedding planning peak times (weekday evenings)
    const isPlanningTime =
      dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 18 && hour <= 21;

    return isSaturdayWeddingTime || (isWeddingSeason && isPlanningTime);
  }

  /**
   * Get cached rate limits
   */
  private getCachedRateLimits(): {
    allowed: boolean;
    remaining: number;
    limit: number;
  } {
    const cached = this.fallbackCache.get('rate-limits');

    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    // Default conservative limits
    return {
      allowed: true,
      remaining: 50,
      limit: 200,
    };
  }

  /**
   * Check if recent cached limits are available
   */
  private hasRecentCachedLimits(): boolean {
    const cached = this.fallbackCache.get('rate-limits');
    return cached ? cached.expiry > Date.now() : false;
  }

  /**
   * Cache rate limit results for fallback
   */
  cacheLimitResult(result: RateLimitResult): void {
    this.fallbackCache.set('rate-limits', {
      value: {
        allowed: result.allowed,
        remaining: result.remaining,
        limit: result.limit,
      },
      expiry: Date.now() + 300000, // 5 minutes
    });
  }

  /**
   * Send wedding-critical alert
   */
  private async sendWeddingCriticalAlert(
    operationName: string,
    breaker: CircuitBreakerState,
    error: Error,
  ): Promise<void> {
    try {
      // In production, integrate with actual notification system
      logger.error('WEDDING CRITICAL: Circuit breaker opened', {
        operationName,
        failureCount: breaker.failureCount,
        errorMessage: error.message,
        isWeddingCritical: this.isWeddingCriticalTime(),
        nextAttemptTime: breaker.nextAttemptTime,
      });

      // Send immediate alert to on-call team
      // await this.notificationService.sendCriticalAlert({
      //   title: 'Wedding Critical System Failure',
      //   message: `Circuit breaker opened for ${operationName}`,
      //   severity: 'critical'
      // });
    } catch (alertError) {
      logger.error('Failed to send wedding critical alert', alertError);
    }
  }

  /**
   * Queue failed operation for later retry
   */
  private async queueFailedOperation(
    operationName: string,
    operationData: any,
  ): Promise<void> {
    try {
      const queueKey = `circuit-breaker:queue:${operationName}`;
      const queueData = {
        operationName,
        data: operationData,
        queuedAt: Date.now(),
        retryCount: 0,
      };

      await this.getClient().lpush(queueKey, JSON.stringify(queueData));
      await this.getClient().expire(queueKey, 3600); // 1 hour expiry

      logger.info(`Queued failed operation: ${operationName}`, { queueData });
    } catch (error) {
      logger.error(`Failed to queue operation: ${operationName}`, error);
    }
  }

  /**
   * Persist circuit breaker state to Redis
   */
  private async persistCircuitBreakerState(
    operationName: string,
    breaker: CircuitBreakerState,
  ): Promise<void> {
    try {
      const stateKey = `circuit-breaker:state:${operationName}`;
      await this.getClient().setex(
        stateKey,
        3600, // 1 hour expiry
        JSON.stringify(breaker),
      );
    } catch (error) {
      logger.warn(
        `Failed to persist circuit breaker state: ${operationName}`,
        error,
      );
    }
  }

  /**
   * Load circuit breaker state from Redis
   */
  private async loadCircuitBreakerState(
    operationName: string,
  ): Promise<CircuitBreakerState | null> {
    try {
      const stateKey = `circuit-breaker:state:${operationName}`;
      const stateData = await this.getClient().get(stateKey);

      if (stateData) {
        return JSON.parse(stateData);
      }

      return null;
    } catch (error) {
      logger.warn(
        `Failed to load circuit breaker state: ${operationName}`,
        error,
      );
      return null;
    }
  }

  /**
   * Start state synchronization across instances
   */
  private startStateSynchronization(): void {
    setInterval(async () => {
      try {
        await this.synchronizeCircuitBreakerStates();
      } catch (error) {
        logger.error('Circuit breaker state synchronization failed', error);
      }
    }, this.STATE_SYNC_INTERVAL);
  }

  /**
   * Synchronize circuit breaker states across distributed instances
   */
  private async synchronizeCircuitBreakerStates(): Promise<void> {
    // Load states from Redis and update local cache
    for (const operationName of this.circuitBreakers.keys()) {
      const persistedState = await this.loadCircuitBreakerState(operationName);
      if (persistedState) {
        this.circuitBreakers.set(operationName, persistedState);
      }
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats(): Record<
    string,
    {
      state: string;
      failureCount: number;
      successCount: number;
      errorRate: number;
      lastFailure: string | null;
    }
  > {
    const stats: Record<string, any> = {};

    for (const [operationName, breaker] of this.circuitBreakers.entries()) {
      const config = this.getCircuitBreakerConfig(operationName);
      stats[operationName] = {
        state: breaker.state,
        failureCount: breaker.failureCount,
        successCount: breaker.successCount,
        errorRate: this.calculateErrorRate(breaker, config),
        lastFailure: breaker.lastFailureTime
          ? new Date(breaker.lastFailureTime).toISOString()
          : null,
      };
    }

    return stats;
  }

  /**
   * Manually reset circuit breaker (emergency use)
   */
  async resetCircuitBreaker(operationName: string): Promise<boolean> {
    try {
      const breaker = this.circuitBreakers.get(operationName);
      if (breaker) {
        breaker.state = 'closed';
        breaker.failureCount = 0;
        breaker.successCount = 0;
        breaker.consecutiveFailures = 0;
        breaker.lastFailureTime = null;
        breaker.nextAttemptTime = null;
        breaker.totalRequests = 0;

        await this.persistCircuitBreakerState(operationName, breaker);

        logger.info(`Circuit breaker manually reset: ${operationName}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to reset circuit breaker: ${operationName}`, error);
      return false;
    }
  }

  /**
   * Force circuit breaker to open (emergency use)
   */
  async forceCircuitBreakerOpen(
    operationName: string,
    durationMs: number = 300000,
  ): Promise<boolean> {
    try {
      const config = this.getCircuitBreakerConfig(operationName);
      const breaker = this.getOrCreateCircuitBreaker(operationName, config);

      breaker.state = 'open';
      breaker.nextAttemptTime = Date.now() + durationMs;

      await this.persistCircuitBreakerState(operationName, breaker);

      logger.warn(`Circuit breaker manually opened: ${operationName}`, {
        duration: durationMs,
        nextAttemptTime: new Date(breaker.nextAttemptTime).toISOString(),
      });

      return true;
    } catch (error) {
      logger.error(
        `Failed to force circuit breaker open: ${operationName}`,
        error,
      );
      return false;
    }
  }
}

// Export singleton instance
export const rateLimitCircuitBreakerIntegration =
  new RateLimitCircuitBreakerIntegration();

// Wedding-specific circuit breaker helpers
export function isWeddingCriticalOperation(operationName: string): boolean {
  const criticalOperations = [
    'redis-rate-limiting',
    'database-operations',
    'payment-processing',
    'booking-system',
    'calendar-sync',
    'venue-availability',
  ];

  return criticalOperations.some((critical) =>
    operationName.includes(critical),
  );
}

export function getWeddingSeasonConfig(
  baseConfig: CircuitBreakerConfig,
): CircuitBreakerConfig {
  const month = new Date().getMonth() + 1;
  const isWeddingSeason = month >= 5 && month <= 9;

  if (isWeddingSeason) {
    // During wedding season, be more tolerant of failures but recover faster
    return {
      ...baseConfig,
      failureThreshold: baseConfig.failureThreshold + 2,
      recoveryTimeout: Math.max(baseConfig.recoveryTimeout * 0.7, 15000), // 30% faster recovery, min 15s
      weddingProtectionMode: true,
    };
  }

  return baseConfig;
}
