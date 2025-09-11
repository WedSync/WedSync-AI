// CalDAV Circuit Breaker - WS-218 Team C Round 1
// Reliability and fault tolerance patterns for CalDAV operations

import {
  CircuitBreakerConfig,
  CircuitState,
  CircuitBreakerStats,
} from '../../types/apple-sync';

// Enhanced error types for CalDAV operations
interface CalDAVError extends Error {
  code?: string;
  statusCode?: number;
  retryable: boolean;
  serverType: 'icloud' | 'generic_caldav' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Metrics interface for circuit breaker monitoring
interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  circuitOpens: number;
  circuitCloses: number;
  halfOpenAttempts: number;
  averageResponseTime: number;
  lastResponseTime?: number;
  errorsByType: Record<string, number>;
}

// Health check interface for CalDAV servers
interface CalDAVHealthChecker {
  isServerHealthy(serverUrl: string): Promise<boolean>;
  getServerLatency(serverUrl: string): Promise<number>;
  checkAuthenticationHealth(
    serverUrl: string,
    credentials: any,
  ): Promise<boolean>;
}

// Notification interface for circuit breaker state changes
interface CircuitBreakerNotifier {
  onCircuitOpen(serverUrl: string, error: CalDAVError): Promise<void>;
  onCircuitClose(serverUrl: string): Promise<void>;
  onCircuitHalfOpen(serverUrl: string): Promise<void>;
  onHealthCheckFailed(serverUrl: string, error: CalDAVError): Promise<void>;
}

/**
 * CalDAV Circuit Breaker
 *
 * Implements the Circuit Breaker pattern for CalDAV operations with:
 * - Automatic failure detection and recovery
 * - Server-specific configuration and blacklisting
 * - Health monitoring and metrics collection
 * - Exponential backoff and rate limiting
 * - Apple iCloud specific handling
 */
export class CalDAVCircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextRetryTime?: Date;
  private halfOpenAttempts = 0;

  // Metrics tracking
  private metrics: CircuitBreakerMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    circuitOpens: 0,
    circuitCloses: 0,
    halfOpenAttempts: 0,
    averageResponseTime: 0,
    errorsByType: {},
  };

  // Server-specific blacklist
  private blacklistedServers: Map<string, { until: Date; reason: string }> =
    new Map();

  // Health monitoring
  private healthChecker?: CalDAVHealthChecker;
  private notifier?: CircuitBreakerNotifier;
  private healthCheckInterval?: NodeJS.Timeout;

  // Rate limiting for Apple iCloud
  private iCloudRequestTimes: Date[] = [];
  private readonly ICLOUD_RATE_LIMIT = 60; // requests per minute

  // Server type detection cache
  private serverTypeCache: Map<
    string,
    'icloud' | 'generic_caldav' | 'unknown'
  > = new Map();

  constructor(
    config: CircuitBreakerConfig,
    healthChecker?: CalDAVHealthChecker,
    notifier?: CircuitBreakerNotifier,
  ) {
    this.config = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 30000, // 30 seconds
      halfOpenMaxCalls: 3,
      blacklistDuration: 300000, // 5 minutes
      ...config,
    };

    this.healthChecker = healthChecker;
    this.notifier = notifier;

    // Start health monitoring if health checker is available
    if (this.healthChecker) {
      this.startHealthMonitoring();
    }

    console.log('CalDAV Circuit Breaker initialized with config:', this.config);
  }

  /**
   * Execute a CalDAV operation with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    serverUrl?: string,
    operationType?: string,
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    // Check if server is blacklisted
    if (serverUrl && this.isServerBlacklisted(serverUrl)) {
      const blacklistInfo = this.blacklistedServers.get(serverUrl);
      throw new Error(
        `Server blacklisted: ${blacklistInfo?.reason || 'Unknown reason'}`,
      );
    }

    // Check circuit state and handle accordingly
    switch (this.state) {
      case 'open':
        if (this.canAttemptReset()) {
          console.log(
            'Circuit breaker attempting reset (transitioning to half-open)',
          );
          this.state = 'half_open';
          this.halfOpenAttempts = 0;
          this.notifier?.onCircuitHalfOpen(serverUrl || 'unknown');
        } else {
          const error = new Error(
            'Circuit breaker is OPEN - operation rejected',
          ) as CalDAVError;
          error.retryable = true;
          error.serverType = this.detectServerType(serverUrl);
          error.severity = 'medium';
          throw error;
        }
        break;

      case 'half_open':
        if (this.halfOpenAttempts >= this.config.halfOpenMaxCalls) {
          const error = new Error(
            'Circuit breaker half-open limit exceeded',
          ) as CalDAVError;
          error.retryable = true;
          error.serverType = this.detectServerType(serverUrl);
          error.severity = 'medium';
          throw error;
        }
        this.halfOpenAttempts++;
        this.metrics.halfOpenAttempts++;
        break;

      case 'closed':
        // Apply Apple iCloud rate limiting
        if (serverUrl && this.isAppleICloud(serverUrl)) {
          await this.enforceICloudRateLimit();
        }
        break;
    }

    try {
      // Execute the operation
      const result = await this.executeWithTimeout(operation, serverUrl);

      // Record success
      this.onSuccess(Date.now() - startTime);

      return result;
    } catch (error) {
      // Record failure
      this.onFailure(error, serverUrl, operationType);
      throw error;
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextRetryTime: this.nextRetryTime,
    };
  }

  /**
   * Get detailed metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get blacklisted servers
   */
  getBlacklistedServers(): Array<{
    server: string;
    until: Date;
    reason: string;
  }> {
    return Array.from(this.blacklistedServers.entries()).map(
      ([server, info]) => ({
        server,
        until: info.until,
        reason: info.reason,
      }),
    );
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    console.log('Circuit breaker manually reset');

    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextRetryTime = undefined;
    this.halfOpenAttempts = 0;
  }

  /**
   * Force circuit breaker to open (for testing or emergency)
   */
  forceOpen(reason: string): void {
    console.log(`Circuit breaker forced open: ${reason}`);

    this.state = 'open';
    this.lastFailureTime = new Date();
    this.nextRetryTime = new Date(Date.now() + this.config.resetTimeout);
    this.metrics.circuitOpens++;
  }

  /**
   * Blacklist a server temporarily
   */
  blacklistServer(serverUrl: string, reason: string, duration?: number): void {
    const blacklistDuration =
      duration || this.config.blacklistDuration || 300000;
    const until = new Date(Date.now() + blacklistDuration);

    this.blacklistedServers.set(serverUrl, { until, reason });

    console.log(
      `Server blacklisted: ${serverUrl} until ${until.toISOString()} - ${reason}`,
    );
  }

  /**
   * Remove server from blacklist
   */
  unblacklistServer(serverUrl: string): void {
    if (this.blacklistedServers.delete(serverUrl)) {
      console.log(`Server removed from blacklist: ${serverUrl}`);
    }
  }

  /**
   * Check if circuit breaker is healthy
   */
  isHealthy(): boolean {
    if (this.state === 'open') return false;

    const recentErrorRate = this.calculateRecentErrorRate();
    return recentErrorRate < 0.5; // Less than 50% error rate
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.blacklistedServers.clear();
    this.serverTypeCache.clear();
    this.iCloudRequestTimes = [];

    console.log('Circuit breaker destroyed');
  }

  // Private methods

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    serverUrl?: string,
  ): Promise<T> {
    // Set appropriate timeout based on server type
    const serverType = this.detectServerType(serverUrl);
    const timeout = this.getTimeoutForServerType(serverType);

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const error = new Error(
          `Operation timeout after ${timeout}ms`,
        ) as CalDAVError;
        error.code = 'TIMEOUT';
        error.retryable = true;
        error.serverType = serverType;
        error.severity = 'medium';
        reject(error);
      }, timeout);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(this.enhanceError(error, serverType));
        });
    });
  }

  private onSuccess(responseTime: number): void {
    this.successCount++;
    this.metrics.successfulRequests++;
    this.lastSuccessTime = new Date();

    // Update average response time
    this.updateAverageResponseTime(responseTime);
    this.metrics.lastResponseTime = responseTime;

    // Handle state transitions on success
    if (this.state === 'half_open') {
      // Successful call in half-open state - consider closing circuit
      if (this.halfOpenAttempts >= Math.min(this.config.halfOpenMaxCalls, 2)) {
        console.log(
          'Circuit breaker closing after successful half-open attempts',
        );
        this.state = 'closed';
        this.failureCount = 0;
        this.metrics.circuitCloses++;
        this.notifier?.onCircuitClose('unknown');
      }
    } else if (this.state === 'closed') {
      // Reset failure count on successful calls
      if (this.failureCount > 0) {
        this.failureCount = Math.max(0, this.failureCount - 1);
      }
    }
  }

  private onFailure(
    error: any,
    serverUrl?: string,
    operationType?: string,
  ): void {
    this.failureCount++;
    this.metrics.failedRequests++;
    this.lastFailureTime = new Date();

    const enhancedError = this.enhanceError(
      error,
      this.detectServerType(serverUrl),
    );

    // Track error types
    const errorType = enhancedError.code || 'unknown';
    this.metrics.errorsByType[errorType] =
      (this.metrics.errorsByType[errorType] || 0) + 1;

    console.error(`CalDAV operation failed (${operationType}):`, {
      error: enhancedError.message,
      serverUrl,
      serverType: enhancedError.serverType,
      retryable: enhancedError.retryable,
      severity: enhancedError.severity,
    });

    // Handle severe errors immediately
    if (enhancedError.severity === 'critical') {
      if (serverUrl) {
        this.blacklistServer(
          serverUrl,
          `Critical error: ${enhancedError.message}`,
          600000,
        ); // 10 minutes
      }
    }

    // Check if we should open the circuit
    if (
      this.state === 'closed' &&
      this.failureCount >= this.config.failureThreshold
    ) {
      console.log(
        `Circuit breaker opening due to ${this.failureCount} failures`,
      );
      this.state = 'open';
      this.nextRetryTime = new Date(Date.now() + this.config.resetTimeout);
      this.metrics.circuitOpens++;
      this.notifier?.onCircuitOpen(serverUrl || 'unknown', enhancedError);
    } else if (this.state === 'half_open') {
      // Failure in half-open state - go back to open
      console.log(
        'Circuit breaker returning to open state after half-open failure',
      );
      this.state = 'open';
      this.nextRetryTime = new Date(Date.now() + this.config.resetTimeout);
      this.metrics.circuitOpens++;
    }
  }

  private canAttemptReset(): boolean {
    if (!this.nextRetryTime) return true;
    return Date.now() >= this.nextRetryTime.getTime();
  }

  private detectServerType(
    serverUrl?: string,
  ): 'icloud' | 'generic_caldav' | 'unknown' {
    if (!serverUrl) return 'unknown';

    // Check cache first
    const cached = this.serverTypeCache.get(serverUrl);
    if (cached) return cached;

    let serverType: 'icloud' | 'generic_caldav' | 'unknown' = 'unknown';

    if (
      serverUrl.includes('caldav.icloud.com') ||
      serverUrl.includes('p01-caldav.icloud.com')
    ) {
      serverType = 'icloud';
    } else if (
      serverUrl.includes('caldav') ||
      serverUrl.includes(':5232') ||
      serverUrl.includes('.ics')
    ) {
      serverType = 'generic_caldav';
    }

    // Cache the result
    this.serverTypeCache.set(serverUrl, serverType);

    return serverType;
  }

  private isAppleICloud(serverUrl: string): boolean {
    return this.detectServerType(serverUrl) === 'icloud';
  }

  private getTimeoutForServerType(
    serverType: 'icloud' | 'generic_caldav' | 'unknown',
  ): number {
    switch (serverType) {
      case 'icloud':
        return 15000; // 15 seconds for iCloud (can be slower)
      case 'generic_caldav':
        return 10000; // 10 seconds for generic CalDAV
      default:
        return 12000; // 12 seconds default
    }
  }

  private enhanceError(
    error: any,
    serverType: 'icloud' | 'generic_caldav' | 'unknown',
  ): CalDAVError {
    const enhancedError = error as CalDAVError;

    // Set server type
    enhancedError.serverType = serverType;

    // Determine if error is retryable
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      enhancedError.retryable = false;
      enhancedError.severity = 'critical';
    } else if (
      error.code === 'TIMEOUT' ||
      error.statusCode === 503 ||
      error.statusCode === 502
    ) {
      enhancedError.retryable = true;
      enhancedError.severity = 'medium';
    } else if (error.statusCode === 401 || error.statusCode === 403) {
      enhancedError.retryable = false;
      enhancedError.severity = 'high';
    } else if (error.statusCode === 429) {
      enhancedError.retryable = true;
      enhancedError.severity = 'low';
    } else {
      enhancedError.retryable = true;
      enhancedError.severity = 'medium';
    }

    // Set error code if not present
    if (!enhancedError.code) {
      if (error.statusCode) {
        enhancedError.code = `HTTP_${error.statusCode}`;
      } else {
        enhancedError.code = 'UNKNOWN_ERROR';
      }
    }

    return enhancedError;
  }

  private async enforceICloudRateLimit(): Promise<void> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    // Clean old requests
    this.iCloudRequestTimes = this.iCloudRequestTimes.filter(
      (time) => time > oneMinuteAgo,
    );

    // Check if we're at the limit
    if (this.iCloudRequestTimes.length >= this.ICLOUD_RATE_LIMIT) {
      const oldestRequest = this.iCloudRequestTimes[0];
      const waitTime = 60000 - (now.getTime() - oldestRequest.getTime()) + 1000; // Add 1 second buffer

      console.log(`iCloud rate limit reached, waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // Record this request
    this.iCloudRequestTimes.push(now);
  }

  private isServerBlacklisted(serverUrl: string): boolean {
    const blacklistEntry = this.blacklistedServers.get(serverUrl);

    if (!blacklistEntry) return false;

    // Check if blacklist has expired
    if (Date.now() >= blacklistEntry.until.getTime()) {
      this.blacklistedServers.delete(serverUrl);
      console.log(`Server removed from blacklist (expired): ${serverUrl}`);
      return false;
    }

    return true;
  }

  private calculateRecentErrorRate(): number {
    const recentRequests = Math.min(this.metrics.totalRequests, 100); // Last 100 requests
    if (recentRequests === 0) return 0;

    // Simple calculation - in production this would use a sliding window
    return this.metrics.failedRequests / this.metrics.totalRequests;
  }

  private updateAverageResponseTime(responseTime: number): void {
    const totalSuccessful = this.metrics.successfulRequests;
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (totalSuccessful - 1) +
        responseTime) /
      totalSuccessful;
  }

  private startHealthMonitoring(): void {
    if (!this.healthChecker) return;

    // Run health checks every 2 minutes
    this.healthCheckInterval = setInterval(async () => {
      // Check blacklisted servers for recovery
      for (const [serverUrl, blacklistInfo] of Array.from(
        this.blacklistedServers.entries(),
      )) {
        if (Date.now() >= blacklistInfo.until.getTime()) {
          try {
            const isHealthy =
              await this.healthChecker!.isServerHealthy(serverUrl);

            if (isHealthy) {
              this.unblacklistServer(serverUrl);
              console.log(`Server recovered from blacklist: ${serverUrl}`);
            } else {
              // Extend blacklist period
              blacklistInfo.until = new Date(
                Date.now() + this.config.blacklistDuration!,
              );
              console.log(
                `Server health check failed, extending blacklist: ${serverUrl}`,
              );
            }
          } catch (error) {
            console.error(`Health check failed for ${serverUrl}:`, error);
            this.notifier?.onHealthCheckFailed(serverUrl, error as CalDAVError);
          }
        }
      }

      // Clean up expired entries
      this.cleanupExpiredBlacklist();
    }, 120000); // 2 minutes
  }

  private cleanupExpiredBlacklist(): void {
    const now = Date.now();

    for (const [serverUrl, blacklistInfo] of Array.from(
      this.blacklistedServers.entries(),
    )) {
      if (now >= blacklistInfo.until.getTime()) {
        this.blacklistedServers.delete(serverUrl);
      }
    }
  }
}
