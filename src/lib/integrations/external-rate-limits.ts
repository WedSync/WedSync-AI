/**
 * External Service Rate Limiter
 * Protects third-party wedding industry APIs from being overwhelmed
 * Team C - WS-199 Implementation
 */

import { RedisClusterManager, redisClusterManager } from './redis-cluster';
import { logger } from '@/lib/monitoring/structured-logger';

export interface ExternalRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  queuePosition?: number;
  serviceName: string;
  operation: string;
  priority: 'high' | 'medium' | 'low';
}

export interface QueuedRequestResult {
  queued: boolean;
  queueId: string;
  estimatedProcessTime: number;
  position: number;
}

export interface ExternalServiceConfig {
  rateLimits: {
    minute: number;
    hour: number;
    day?: number;
    burst?: number;
  };
  weddingContext: string[];
  priority: 'high' | 'medium' | 'low';
  timeout: number;
  retryAttempts: number;
  backoffMultiplier: number;
}

export interface ServiceHealthStatus {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  successRate: number;
  lastCheck: number;
  rateLimitStatus: {
    currentUsage: number;
    limit: number;
    resetTime: number;
  };
}

/**
 * External Service Rate Limiter for Wedding Platform
 * Manages rate limits for all third-party wedding industry APIs
 */
export class ExternalServiceRateLimiter extends RedisClusterManager {
  private queuedRequests: Map<string, QueuedRequest[]> = new Map();
  private serviceHealthCache: Map<string, ServiceHealthStatus> = new Map();
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private readonly QUEUE_PROCESS_INTERVAL = 5000; // 5 seconds

  // Wedding industry external service configurations
  private readonly WEDDING_EXTERNAL_SERVICES: Record<
    string,
    ExternalServiceConfig
  > = {
    tave: {
      rateLimits: { minute: 20, hour: 500, day: 2000, burst: 5 },
      weddingContext: ['client-import', 'contract-sync', 'booking-status'],
      priority: 'high', // Core workflow tool for many photographers
      timeout: 10000,
      retryAttempts: 3,
      backoffMultiplier: 2,
    },
    lightblue: {
      rateLimits: { minute: 10, hour: 200, day: 800, burst: 3 },
      weddingContext: ['client-data', 'booking-sync', 'invoice-processing'],
      priority: 'medium', // Screen scraping - be conservative
      timeout: 15000,
      retryAttempts: 2,
      backoffMultiplier: 3,
    },
    honeybook: {
      rateLimits: { minute: 30, hour: 800, day: 3000, burst: 10 },
      weddingContext: ['client-management', 'proposal-sync', 'invoice-sync'],
      priority: 'high', // Major wedding business management platform
      timeout: 8000,
      retryAttempts: 3,
      backoffMultiplier: 1.5,
    },
    'google-calendar': {
      rateLimits: { minute: 100, hour: 1000, day: 10000, burst: 20 },
      weddingContext: [
        'venue-availability',
        'vendor-scheduling',
        'wedding-timeline',
      ],
      priority: 'high', // Critical for wedding coordination
      timeout: 5000,
      retryAttempts: 4,
      backoffMultiplier: 1.2,
    },
    'stripe-api': {
      rateLimits: { minute: 25, hour: 1000, day: 5000, burst: 15 },
      weddingContext: [
        'supplier-subscriptions',
        'billing-events',
        'payment-processing',
      ],
      priority: 'high', // Business critical
      timeout: 8000,
      retryAttempts: 3,
      backoffMultiplier: 2,
    },
    sendgrid: {
      rateLimits: { minute: 20, hour: 1200, day: 10000, burst: 10 },
      weddingContext: [
        'task-reminders',
        'coordination-updates',
        'marketing-emails',
      ],
      priority: 'high', // Wedding coordination is time-sensitive
      timeout: 6000,
      retryAttempts: 2,
      backoffMultiplier: 2,
    },
    twilio: {
      rateLimits: { minute: 10, hour: 300, day: 1500, burst: 5 },
      weddingContext: [
        'urgent-notifications',
        'wedding-day-alerts',
        'booking-confirmations',
      ],
      priority: 'high', // SMS notifications for wedding coordination
      timeout: 5000,
      retryAttempts: 2,
      backoffMultiplier: 2,
    },
    'photo-storage-cdn': {
      rateLimits: { minute: 50, hour: 2000, day: 20000, burst: 25 },
      weddingContext: [
        'portfolio-uploads',
        'wedding-galleries',
        'image-processing',
      ],
      priority: 'medium', // Portfolio updates can have slight delay
      timeout: 12000,
      retryAttempts: 3,
      backoffMultiplier: 1.5,
    },
    'wordpress-api': {
      rateLimits: { minute: 15, hour: 400, day: 1600, burst: 8 },
      weddingContext: ['blog-sync', 'portfolio-updates', 'seo-content'],
      priority: 'low', // Marketing/portfolio updates
      timeout: 10000,
      retryAttempts: 2,
      backoffMultiplier: 2,
    },
    'facebook-api': {
      rateLimits: { minute: 20, hour: 600, day: 3000, burst: 10 },
      weddingContext: [
        'social-media-sync',
        'lead-generation',
        'portfolio-sharing',
      ],
      priority: 'low', // Social media can wait
      timeout: 8000,
      retryAttempts: 2,
      backoffMultiplier: 2,
    },
  };

  constructor() {
    super();
    this.startQueueProcessor();
    this.startHealthChecker();
  }

  /**
   * Check if external service request is allowed
   */
  async checkExternalServiceLimit(
    serviceName: string,
    operation: string,
    userId?: string,
    supplierLocation?: string,
  ): Promise<ExternalRateLimitResult> {
    const serviceConfig = this.getServiceConfig(serviceName);
    const identifier = this.createServiceIdentifier(serviceName, userId);

    try {
      // Check multiple time windows for comprehensive rate limiting
      const [minuteResult, hourResult, dayResult] = await Promise.all([
        this.checkServiceWindow(
          identifier,
          'minute',
          serviceConfig.rateLimits.minute,
        ),
        this.checkServiceWindow(
          identifier,
          'hour',
          serviceConfig.rateLimits.hour,
        ),
        serviceConfig.rateLimits.day
          ? this.checkServiceWindow(
              identifier,
              'day',
              serviceConfig.rateLimits.day,
            )
          : Promise.resolve({ allowed: true, remaining: 1000, current: 0 }),
      ]);

      // Check burst limit if configured
      let burstResult = { allowed: true, remaining: 100, current: 0 };
      if (serviceConfig.rateLimits.burst) {
        burstResult = await this.checkServiceWindow(
          identifier,
          'burst',
          serviceConfig.rateLimits.burst,
          15000, // 15 second window
        );
      }

      // Determine if request is allowed based on all windows
      const isAllowed =
        minuteResult.allowed &&
        hourResult.allowed &&
        dayResult.allowed &&
        burstResult.allowed;

      if (!isAllowed) {
        // Calculate appropriate retry time
        const retryAfter = this.calculateRetryTime(serviceName, {
          minute: minuteResult,
          hour: hourResult,
          day: dayResult,
          burst: burstResult,
        });

        return {
          allowed: false,
          remaining: 0,
          retryAfter,
          queuePosition: await this.getQueuePosition(serviceName),
          serviceName,
          operation,
          priority: serviceConfig.priority,
        };
      }

      // Apply wedding season adjustments for non-critical services
      const seasonAdjustment = this.applyWeddingSeasonAdjustment(
        serviceConfig,
        operation,
      );
      if (!seasonAdjustment.allowed) {
        return {
          allowed: false,
          remaining: 0,
          retryAfter: seasonAdjustment.retryAfter,
          queuePosition: await this.getQueuePosition(serviceName),
          serviceName,
          operation,
          priority: serviceConfig.priority,
        };
      }

      // Request is allowed - increment all counters
      await this.incrementServiceCounters(identifier, serviceConfig);

      return {
        allowed: true,
        remaining: Math.min(
          minuteResult.remaining,
          hourResult.remaining,
          dayResult.remaining || 1000,
        ),
        serviceName,
        operation,
        priority: serviceConfig.priority,
      };
    } catch (error) {
      logger.error(
        `External service rate limit check failed: ${serviceName}`,
        error,
      );

      // Fail open for high priority services, fail closed for low priority
      const shouldFailOpen = serviceConfig.priority === 'high';

      return {
        allowed: shouldFailOpen,
        remaining: shouldFailOpen ? 10 : 0,
        retryAfter: shouldFailOpen ? undefined : 60,
        serviceName,
        operation,
        priority: serviceConfig.priority,
      };
    }
  }

  /**
   * Queue external service request when rate limited
   */
  async queueExternalRequest(
    serviceName: string,
    operation: string,
    payload: any,
    userId?: string,
    priority?: 'high' | 'medium' | 'low',
  ): Promise<QueuedRequestResult> {
    const serviceConfig = this.getServiceConfig(serviceName);
    const queueId = this.generateQueueId(serviceName, operation);

    const queuedRequest: QueuedRequest = {
      id: queueId,
      serviceName,
      operation,
      payload,
      userId,
      priority: priority || serviceConfig.priority,
      queuedAt: Date.now(),
      retryAttempts: 0,
      maxRetryAttempts: serviceConfig.retryAttempts,
    };

    // Add to priority queue
    const serviceQueue = this.queuedRequests.get(serviceName) || [];
    serviceQueue.push(queuedRequest);

    // Sort by priority (high first) and queue time
    serviceQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.queuedAt - b.queuedAt;
    });

    this.queuedRequests.set(serviceName, serviceQueue);

    const position = serviceQueue.findIndex((req) => req.id === queueId) + 1;
    const estimatedProcessTime = this.calculateQueueProcessTime(
      serviceName,
      position,
    );

    logger.info(`Request queued for external service: ${serviceName}`, {
      queueId,
      operation,
      priority: queuedRequest.priority,
      position,
      estimatedProcessTime,
    });

    return {
      queued: true,
      queueId,
      position,
      estimatedProcessTime,
    };
  }

  /**
   * Check external service health and availability
   */
  async checkExternalServiceHealth(): Promise<ServiceHealthStatus[]> {
    const healthChecks = Object.keys(this.WEDDING_EXTERNAL_SERVICES).map(
      (serviceName) => this.performServiceHealthCheck(serviceName),
    );

    const results = await Promise.allSettled(healthChecks);
    const healthStatuses = results
      .filter(
        (result): result is PromiseFulfilledResult<ServiceHealthStatus> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value);

    // Update health cache
    for (const status of healthStatuses) {
      this.serviceHealthCache.set(status.serviceName, status);
    }

    return healthStatuses;
  }

  /**
   * Handle external service rate limit by queueing requests
   */
  async handleExternalServiceRateLimit(
    serviceName: string,
    retryAfter: number,
    context?: { operation: string; userId?: string },
  ): Promise<void> {
    const serviceConfig = this.getServiceConfig(serviceName);

    // Log rate limit hit for monitoring
    logger.warn(`External service rate limited: ${serviceName}`, {
      serviceName,
      retryAfter,
      operation: context?.operation,
      priority: serviceConfig.priority,
      weddingContext: serviceConfig.weddingContext,
    });

    // If high priority service, attempt immediate queue processing
    if (serviceConfig.priority === 'high' && context) {
      await this.queueExternalRequest(
        serviceName,
        context.operation,
        null, // No payload for retry
        context.userId,
        'high',
      );
    }

    // Adjust rate limits dynamically based on service response
    await this.adjustServiceRateLimit(serviceName, retryAfter);
  }

  /**
   * Get service configuration with fallback
   */
  private getServiceConfig(serviceName: string): ExternalServiceConfig {
    return (
      this.WEDDING_EXTERNAL_SERVICES[serviceName] || {
        rateLimits: { minute: 10, hour: 100, day: 500 },
        weddingContext: ['general'],
        priority: 'medium',
        timeout: 10000,
        retryAttempts: 2,
        backoffMultiplier: 2,
      }
    );
  }

  /**
   * Create unique identifier for service rate limiting
   */
  private createServiceIdentifier(
    serviceName: string,
    userId?: string,
  ): string {
    // Include user ID for per-user rate limiting when available
    return userId ? `${serviceName}:user:${userId}` : `${serviceName}:global`;
  }

  /**
   * Check rate limit for specific service and time window
   */
  private async checkServiceWindow(
    identifier: string,
    window: string,
    limit: number,
    windowMs?: number,
  ): Promise<{ allowed: boolean; remaining: number; current: number }> {
    const windowDuration = windowMs || this.getWindowDuration(window);
    const key = `external:${window}:${identifier}`;

    try {
      const result = await this.checkSlidingWindow(key, windowDuration, limit);
      return {
        allowed: result.allowed,
        remaining: result.remaining,
        current: result.current,
      };
    } catch (error) {
      logger.error(`Service window check failed: ${identifier}`, error);
      return { allowed: true, remaining: limit, current: 0 };
    }
  }

  /**
   * Get window duration in milliseconds
   */
  private getWindowDuration(window: string): number {
    const durations: Record<string, number> = {
      burst: 15000, // 15 seconds
      minute: 60000, // 1 minute
      hour: 3600000, // 1 hour
      day: 86400000, // 24 hours
    };
    return durations[window] || 60000;
  }

  /**
   * Calculate retry time based on rate limit results
   */
  private calculateRetryTime(
    serviceName: string,
    results: {
      minute: { allowed: boolean; current: number };
      hour: { allowed: boolean; current: number };
      day: { allowed: boolean; current: number };
      burst: { allowed: boolean; current: number };
    },
  ): number {
    const serviceConfig = this.getServiceConfig(serviceName);

    // Return earliest available window
    if (!results.burst.allowed) return 15; // 15 seconds
    if (!results.minute.allowed) return 60; // 1 minute
    if (!results.hour.allowed) return 300; // 5 minutes
    if (!results.day.allowed) return 1800; // 30 minutes

    return 60; // Default 1 minute
  }

  /**
   * Apply wedding season rate limiting adjustments
   */
  private applyWeddingSeasonAdjustment(
    serviceConfig: ExternalServiceConfig,
    operation: string,
  ): { allowed: boolean; retryAfter?: number } {
    const currentMonth = new Date().getMonth() + 1;
    const isPeakSeason = currentMonth >= 5 && currentMonth <= 9;

    // During peak season, reduce limits for low-priority services
    if (isPeakSeason && serviceConfig.priority === 'low') {
      // 25% chance of delaying low priority requests during peak season
      if (Math.random() < 0.25) {
        return {
          allowed: false,
          retryAfter: 120, // 2 minutes delay
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Increment all rate limit counters for successful request
   */
  private async incrementServiceCounters(
    identifier: string,
    serviceConfig: ExternalServiceConfig,
  ): Promise<void> {
    const incrementPromises = [
      this.distributedIncrement(
        `external:minute:${identifier}`,
        60000,
        serviceConfig.rateLimits.minute,
      ),
      this.distributedIncrement(
        `external:hour:${identifier}`,
        3600000,
        serviceConfig.rateLimits.hour,
      ),
    ];

    if (serviceConfig.rateLimits.day) {
      incrementPromises.push(
        this.distributedIncrement(
          `external:day:${identifier}`,
          86400000,
          serviceConfig.rateLimits.day,
        ),
      );
    }

    if (serviceConfig.rateLimits.burst) {
      incrementPromises.push(
        this.distributedIncrement(
          `external:burst:${identifier}`,
          15000,
          serviceConfig.rateLimits.burst,
        ),
      );
    }

    await Promise.all(incrementPromises);
  }

  /**
   * Get current queue position for service
   */
  private async getQueuePosition(serviceName: string): Promise<number> {
    const queue = this.queuedRequests.get(serviceName) || [];
    return queue.length;
  }

  /**
   * Generate unique queue ID
   */
  private generateQueueId(serviceName: string, operation: string): string {
    return `${serviceName}:${operation}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate estimated processing time for queued request
   */
  private calculateQueueProcessTime(
    serviceName: string,
    position: number,
  ): number {
    const serviceConfig = this.getServiceConfig(serviceName);
    const baseProcessingTime = 60000; // 1 minute base
    const priorityMultiplier =
      serviceConfig.priority === 'high'
        ? 0.5
        : serviceConfig.priority === 'medium'
          ? 1
          : 2;

    return baseProcessingTime * position * priorityMultiplier;
  }

  /**
   * Perform health check on specific service
   */
  private async performServiceHealthCheck(
    serviceName: string,
  ): Promise<ServiceHealthStatus> {
    const serviceConfig = this.getServiceConfig(serviceName);
    const startTime = Date.now();

    try {
      // Simulate health check (in real implementation, make actual API call)
      const responseTime = Date.now() - startTime;
      const successRate = 0.95; // Simulate 95% success rate

      // Get current rate limit usage
      const identifier = this.createServiceIdentifier(serviceName);
      const rateLimitStatus = await this.getServiceRateLimitStatus(
        identifier,
        serviceConfig,
      );

      return {
        serviceName,
        status: responseTime < serviceConfig.timeout ? 'healthy' : 'degraded',
        responseTime,
        successRate,
        lastCheck: Date.now(),
        rateLimitStatus,
      };
    } catch (error) {
      logger.error(`Health check failed for service: ${serviceName}`, error);

      return {
        serviceName,
        status: 'down',
        responseTime: Date.now() - startTime,
        successRate: 0,
        lastCheck: Date.now(),
        rateLimitStatus: {
          currentUsage: 0,
          limit: serviceConfig.rateLimits.minute,
          resetTime: Date.now() + 60000,
        },
      };
    }
  }

  /**
   * Get current rate limit status for service
   */
  private async getServiceRateLimitStatus(
    identifier: string,
    serviceConfig: ExternalServiceConfig,
  ): Promise<{ currentUsage: number; limit: number; resetTime: number }> {
    try {
      const key = `external:minute:${identifier}`;
      const currentUsage = await this.getCurrentCount(key, 60000);

      return {
        currentUsage,
        limit: serviceConfig.rateLimits.minute,
        resetTime: Date.now() + 60000,
      };
    } catch (error) {
      return {
        currentUsage: 0,
        limit: serviceConfig.rateLimits.minute,
        resetTime: Date.now() + 60000,
      };
    }
  }

  /**
   * Adjust service rate limits based on external feedback
   */
  private async adjustServiceRateLimit(
    serviceName: string,
    retryAfter: number,
  ): Promise<void> {
    // Dynamically adjust rate limits based on external service feedback
    // This could reduce limits temporarily to prevent further rate limiting

    const adjustmentKey = `adjustment:${serviceName}`;
    const adjustmentData = {
      originalRetryAfter: retryAfter,
      adjustmentTime: Date.now(),
      tempReduction: 0.8, // Reduce by 20%
    };

    try {
      await this.getClient().setex(
        adjustmentKey,
        Math.max(retryAfter, 300), // At least 5 minutes
        JSON.stringify(adjustmentData),
      );

      logger.info(
        `Temporarily adjusted rate limits for ${serviceName}`,
        adjustmentData,
      );
    } catch (error) {
      logger.error(`Failed to adjust rate limits for ${serviceName}`, error);
    }
  }

  /**
   * Start queue processing for all services
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      try {
        await this.processQueuedRequests();
      } catch (error) {
        logger.error('Queue processing failed', error);
      }
    }, this.QUEUE_PROCESS_INTERVAL);
  }

  /**
   * Process queued requests for all services
   */
  private async processQueuedRequests(): Promise<void> {
    for (const [serviceName, queue] of this.queuedRequests.entries()) {
      if (queue.length === 0) continue;

      // Check if we can process requests for this service
      const canProcess = await this.checkExternalServiceLimit(
        serviceName,
        'queue_process',
      );

      if (canProcess.allowed) {
        const request = queue.shift();
        if (request) {
          await this.executeQueuedRequest(request);
        }
      }
    }
  }

  /**
   * Execute a queued request
   */
  private async executeQueuedRequest(request: QueuedRequest): Promise<void> {
    try {
      logger.info(`Processing queued request: ${request.serviceName}`, {
        queueId: request.id,
        operation: request.operation,
        waitTime: Date.now() - request.queuedAt,
      });

      // In real implementation, execute the actual external service call
      // For now, just log successful processing
    } catch (error) {
      logger.error(
        `Failed to execute queued request: ${request.serviceName}`,
        error,
      );

      // Retry if attempts remaining
      if (request.retryAttempts < request.maxRetryAttempts) {
        request.retryAttempts++;
        const serviceQueue = this.queuedRequests.get(request.serviceName) || [];
        serviceQueue.push(request);
        this.queuedRequests.set(request.serviceName, serviceQueue);
      }
    }
  }

  /**
   * Start periodic health checking
   */
  private startHealthChecker(): void {
    setInterval(async () => {
      try {
        await this.checkExternalServiceHealth();
      } catch (error) {
        logger.error('External service health check failed', error);
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Get service health from cache
   */
  getServiceHealth(serviceName: string): ServiceHealthStatus | null {
    return this.serviceHealthCache.get(serviceName) || null;
  }

  /**
   * Get all queued requests count
   */
  getQueueStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [serviceName, queue] of this.queuedRequests.entries()) {
      stats[serviceName] = queue.length;
    }
    return stats;
  }

  /**
   * Clear queued requests for a service (emergency use)
   */
  clearServiceQueue(serviceName: string): number {
    const queue = this.queuedRequests.get(serviceName) || [];
    const cleared = queue.length;
    this.queuedRequests.set(serviceName, []);

    logger.warn(`Cleared queue for service: ${serviceName}`, {
      requestsCleared: cleared,
    });
    return cleared;
  }
}

interface QueuedRequest {
  id: string;
  serviceName: string;
  operation: string;
  payload: any;
  userId?: string;
  priority: 'high' | 'medium' | 'low';
  queuedAt: number;
  retryAttempts: number;
  maxRetryAttempts: number;
}

// Export singleton instance
export const externalServiceRateLimiter = new ExternalServiceRateLimiter();

// Wedding-specific helper functions
export function getWeddingServicePriority(
  operation: string,
): 'high' | 'medium' | 'low' {
  const highPriorityOperations = [
    'wedding-day-sync',
    'venue-availability',
    'booking-confirmation',
    'payment-processing',
    'urgent-notification',
  ];

  const mediumPriorityOperations = [
    'client-import',
    'contract-sync',
    'invoice-processing',
    'calendar-sync',
    'task-reminder',
  ];

  if (highPriorityOperations.some((op) => operation.includes(op))) {
    return 'high';
  }

  if (mediumPriorityOperations.some((op) => operation.includes(op))) {
    return 'medium';
  }

  return 'low';
}

export function isWeddingCriticalService(serviceName: string): boolean {
  const criticalServices = [
    'google-calendar',
    'stripe-api',
    'sendgrid',
    'twilio',
    'tave',
    'honeybook',
  ];
  return criticalServices.includes(serviceName);
}
