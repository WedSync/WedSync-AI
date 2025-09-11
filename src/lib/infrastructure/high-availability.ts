import { createClient } from '@supabase/supabase-js';

export interface FailoverEvent {
  id: string;
  trigger_type: 'health_check' | 'performance' | 'manual' | 'incident';
  service_name: string;
  primary_endpoint: string;
  failover_endpoint: string;
  timestamp: Date;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed' | 'reverted';
  trigger_reason: string;
  affected_venues?: string[];
  estimated_recovery_time?: number;
  metadata: Record<string, any>;
}

export interface ServiceHealth {
  service_name: string;
  endpoint: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  response_time: number;
  last_check: Date;
  consecutive_failures: number;
  uptime_percentage: number;
  error_rate: number;
  is_primary: boolean;
}

export interface HealthCheckConfig {
  service_name: string;
  primary_endpoint: string;
  fallback_endpoints: string[];
  check_interval: number; // seconds
  timeout: number; // milliseconds
  failure_threshold: number; // consecutive failures before failover
  success_threshold: number; // consecutive successes before recovery
  health_check_path: string;
  expected_status_codes: number[];
  custom_checks?: Array<{
    name: string;
    check: (response: Response) => Promise<boolean>;
  }>;
}

export class HighAvailabilityManager {
  private supabase;
  private healthChecks: Map<string, HealthCheckConfig> = new Map();
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private activeFailovers: Map<string, FailoverEvent> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initializeDefaultConfigs();
    this.startHealthChecking();
  }

  private initializeDefaultConfigs() {
    // Critical wedding platform services
    const configs: HealthCheckConfig[] = [
      {
        service_name: 'user_authentication',
        primary_endpoint: 'https://api.wedsync.com',
        fallback_endpoints: [
          'https://api-backup.wedsync.com',
          'https://api-emergency.wedsync.com',
        ],
        check_interval: 30, // 30 seconds
        timeout: 5000, // 5 seconds
        failure_threshold: 3,
        success_threshold: 2,
        health_check_path: '/health/auth',
        expected_status_codes: [200, 204],
      },
      {
        service_name: 'photo_storage',
        primary_endpoint: 'https://storage.wedsync.com',
        fallback_endpoints: [
          'https://storage-backup.wedsync.com',
          'https://cdn-emergency.wedsync.com',
        ],
        check_interval: 60, // 1 minute
        timeout: 10000, // 10 seconds
        failure_threshold: 2,
        success_threshold: 3,
        health_check_path: '/health/storage',
        expected_status_codes: [200],
      },
      {
        service_name: 'payment_processing',
        primary_endpoint: 'https://payments.wedsync.com',
        fallback_endpoints: ['https://payments-backup.wedsync.com'],
        check_interval: 15, // 15 seconds (critical for payments)
        timeout: 3000, // 3 seconds
        failure_threshold: 2,
        success_threshold: 3,
        health_check_path: '/health/payments',
        expected_status_codes: [200],
      },
      {
        service_name: 'notification_service',
        primary_endpoint: 'https://notifications.wedsync.com',
        fallback_endpoints: ['https://notifications-backup.wedsync.com'],
        check_interval: 45, // 45 seconds
        timeout: 5000,
        failure_threshold: 3,
        success_threshold: 2,
        health_check_path: '/health/notifications',
        expected_status_codes: [200],
      },
      {
        service_name: 'database_primary',
        primary_endpoint: 'https://db.wedsync.com',
        fallback_endpoints: [
          'https://db-read-replica-1.wedsync.com',
          'https://db-read-replica-2.wedsync.com',
        ],
        check_interval: 20, // 20 seconds
        timeout: 2000, // 2 seconds
        failure_threshold: 2,
        success_threshold: 3,
        health_check_path: '/health/db',
        expected_status_codes: [200],
      },
    ];

    configs.forEach((config) => {
      this.healthChecks.set(config.service_name, config);
      this.circuitBreakers.set(config.service_name, new CircuitBreaker(config));

      // Initialize health status
      this.serviceHealth.set(config.service_name, {
        service_name: config.service_name,
        endpoint: config.primary_endpoint,
        status: 'unknown',
        response_time: 0,
        last_check: new Date(),
        consecutive_failures: 0,
        uptime_percentage: 100,
        error_rate: 0,
        is_primary: true,
      });
    });
  }

  /**
   * Start continuous health monitoring
   */
  private startHealthChecking(): void {
    for (const [serviceName, config] of this.healthChecks) {
      this.startServiceHealthCheck(serviceName, config);
    }
  }

  private startServiceHealthCheck(
    serviceName: string,
    config: HealthCheckConfig,
  ): void {
    // Clear any existing interval
    const existingInterval = this.healthCheckIntervals.get(serviceName);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Start new health check interval
    const interval = setInterval(async () => {
      await this.performHealthCheck(serviceName, config);
    }, config.check_interval * 1000);

    this.healthCheckIntervals.set(serviceName, interval);

    // Perform initial health check
    this.performHealthCheck(serviceName, config);
  }

  /**
   * Perform health check for a service
   */
  private async performHealthCheck(
    serviceName: string,
    config: HealthCheckConfig,
  ): Promise<void> {
    const currentHealth = this.serviceHealth.get(serviceName)!;
    const startTime = Date.now();

    try {
      const currentEndpoint = currentHealth.endpoint;
      const response = await fetch(
        `${currentEndpoint}${config.health_check_path}`,
        {
          method: 'GET',
          timeout: config.timeout,
          headers: {
            'User-Agent': 'WedSync-HealthChecker/1.0',
            'X-Health-Check': 'true',
          },
        },
      );

      const responseTime = Date.now() - startTime;
      const isHealthy = this.evaluateHealthResponse(response, config);

      if (isHealthy) {
        await this.handleHealthyResponse(
          serviceName,
          currentHealth,
          responseTime,
        );
      } else {
        await this.handleUnhealthyResponse(
          serviceName,
          currentHealth,
          responseTime,
          `HTTP ${response.status}`,
        );
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.handleUnhealthyResponse(
        serviceName,
        currentHealth,
        responseTime,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private evaluateHealthResponse(
    response: Response,
    config: HealthCheckConfig,
  ): boolean {
    // Check status code
    if (!config.expected_status_codes.includes(response.status)) {
      return false;
    }

    // Additional custom checks would be performed here
    // For now, just check basic response validity
    return (
      response.ok || config.expected_status_codes.includes(response.status)
    );
  }

  private async handleHealthyResponse(
    serviceName: string,
    currentHealth: ServiceHealth,
    responseTime: number,
  ): Promise<void> {
    currentHealth.status = 'healthy';
    currentHealth.response_time = responseTime;
    currentHealth.last_check = new Date();
    currentHealth.consecutive_failures = 0;

    // Update circuit breaker
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.recordSuccess();
    }

    // If we're currently failed over and have enough consecutive successes, consider recovery
    const activeFailover = this.getActiveFailover(serviceName);
    if (activeFailover && this.shouldRecover(serviceName)) {
      await this.recoverFromFailover(serviceName, activeFailover);
    }

    console.log(`✅ Health check passed for ${serviceName}: ${responseTime}ms`);
  }

  private async handleUnhealthyResponse(
    serviceName: string,
    currentHealth: ServiceHealth,
    responseTime: number,
    error: string,
  ): Promise<void> {
    currentHealth.consecutive_failures++;
    currentHealth.response_time = responseTime;
    currentHealth.last_check = new Date();
    currentHealth.status =
      currentHealth.consecutive_failures >= 3 ? 'unhealthy' : 'degraded';

    // Update circuit breaker
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.recordFailure();
    }

    console.warn(
      `⚠️ Health check failed for ${serviceName}: ${error} (${currentHealth.consecutive_failures} consecutive failures)`,
    );

    // Check if we should trigger failover
    const config = this.healthChecks.get(serviceName)!;
    if (
      currentHealth.consecutive_failures >= config.failure_threshold &&
      currentHealth.is_primary
    ) {
      await this.triggerFailover(
        serviceName,
        `Health check failures: ${error}`,
      );
    }
  }

  /**
   * Trigger automatic failover to backup endpoint
   */
  private async triggerFailover(
    serviceName: string,
    reason: string,
  ): Promise<void> {
    const config = this.healthChecks.get(serviceName);
    const currentHealth = this.serviceHealth.get(serviceName);

    if (!config || !currentHealth || config.fallback_endpoints.length === 0) {
      console.error(
        `Cannot failover ${serviceName}: No fallback endpoints configured`,
      );
      return;
    }

    // Check if failover is already in progress
    if (this.getActiveFailover(serviceName)) {
      console.log(`Failover already in progress for ${serviceName}`);
      return;
    }

    // Find healthy fallback endpoint
    const healthyFallback = await this.findHealthyFallback(config);
    if (!healthyFallback) {
      console.error(
        `No healthy fallback endpoints available for ${serviceName}`,
      );
      await this.alertCriticalFailure(serviceName, reason);
      return;
    }

    const failoverEvent: FailoverEvent = {
      id: `failover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trigger_type: 'health_check',
      service_name: serviceName,
      primary_endpoint: currentHealth.endpoint,
      failover_endpoint: healthyFallback,
      timestamp: new Date(),
      status: 'initiated',
      trigger_reason: reason,
      affected_venues: await this.getAffectedVenues(serviceName),
      estimated_recovery_time: this.estimateRecoveryTime(serviceName),
      metadata: {
        consecutive_failures: currentHealth.consecutive_failures,
        last_response_time: currentHealth.response_time,
      },
    };

    this.activeFailovers.set(serviceName, failoverEvent);

    try {
      failoverEvent.status = 'in_progress';

      // Update service endpoint
      currentHealth.endpoint = healthyFallback;
      currentHealth.is_primary = false;
      currentHealth.consecutive_failures = 0;

      // Notify relevant systems
      await this.notifyFailover(failoverEvent);

      // Update DNS/load balancer (simulation)
      await this.updateServiceRouting(serviceName, healthyFallback);

      failoverEvent.status = 'completed';
      console.log(
        `✅ Failover completed for ${serviceName}: ${currentHealth.primary_endpoint} → ${healthyFallback}`,
      );
    } catch (error) {
      failoverEvent.status = 'failed';
      console.error(`❌ Failover failed for ${serviceName}:`, error);
      await this.alertCriticalFailure(serviceName, `Failover failed: ${error}`);
    }
  }

  /**
   * Find a healthy fallback endpoint
   */
  private async findHealthyFallback(
    config: HealthCheckConfig,
  ): Promise<string | null> {
    for (const endpoint of config.fallback_endpoints) {
      try {
        const response = await fetch(`${endpoint}${config.health_check_path}`, {
          method: 'GET',
          timeout: config.timeout,
          headers: { 'X-Health-Check': 'true' },
        });

        if (this.evaluateHealthResponse(response, config)) {
          return endpoint;
        }
      } catch (error) {
        console.warn(`Fallback endpoint ${endpoint} is also unhealthy:`, error);
      }
    }
    return null;
  }

  /**
   * Check if service should recover to primary
   */
  private shouldRecover(serviceName: string): boolean {
    const config = this.healthChecks.get(serviceName);
    const health = this.serviceHealth.get(serviceName);

    if (!config || !health || health.is_primary) return false;

    // Check if we have enough consecutive successes
    const successCount = this.getConsecutiveSuccesses(serviceName);
    return successCount >= config.success_threshold;
  }

  private getConsecutiveSuccesses(serviceName: string): number {
    // In a real implementation, this would track success history
    // For now, return inverse of failure count when status is healthy
    const health = this.serviceHealth.get(serviceName);
    return health?.status === 'healthy' ? 3 : 0;
  }

  /**
   * Recover from failover back to primary
   */
  private async recoverFromFailover(
    serviceName: string,
    failoverEvent: FailoverEvent,
  ): Promise<void> {
    try {
      console.log(
        `🔄 Attempting recovery for ${serviceName} back to primary endpoint`,
      );

      const health = this.serviceHealth.get(serviceName)!;
      const config = this.healthChecks.get(serviceName)!;

      // Test primary endpoint one more time
      const response = await fetch(
        `${config.primary_endpoint}${config.health_check_path}`,
        {
          method: 'GET',
          timeout: config.timeout,
        },
      );

      if (!this.evaluateHealthResponse(response, config)) {
        console.log(`Primary endpoint still unhealthy, staying on fallback`);
        return;
      }

      // Recovery successful - switch back to primary
      health.endpoint = config.primary_endpoint;
      health.is_primary = true;

      await this.updateServiceRouting(serviceName, config.primary_endpoint);

      failoverEvent.status = 'reverted';
      this.activeFailovers.delete(serviceName);

      await this.notifyRecovery(serviceName, failoverEvent);

      console.log(
        `✅ Recovery completed for ${serviceName}: back to primary endpoint`,
      );
    } catch (error) {
      console.error(`❌ Recovery failed for ${serviceName}:`, error);
    }
  }

  /**
   * Manual failover trigger (for emergencies)
   */
  async triggerManualFailover(
    serviceName: string,
    targetEndpoint: string,
    reason: string,
    triggeredBy: string,
  ): Promise<FailoverEvent | null> {
    const config = this.healthChecks.get(serviceName);
    const currentHealth = this.serviceHealth.get(serviceName);

    if (!config || !currentHealth) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    const failoverEvent: FailoverEvent = {
      id: `manual_failover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trigger_type: 'manual',
      service_name: serviceName,
      primary_endpoint: currentHealth.endpoint,
      failover_endpoint: targetEndpoint,
      timestamp: new Date(),
      status: 'initiated',
      trigger_reason: reason,
      affected_venues: await this.getAffectedVenues(serviceName),
      metadata: {
        triggered_by: triggeredBy,
        manual_override: true,
      },
    };

    try {
      this.activeFailovers.set(serviceName, failoverEvent);

      failoverEvent.status = 'in_progress';
      currentHealth.endpoint = targetEndpoint;
      currentHealth.is_primary = false;

      await this.updateServiceRouting(serviceName, targetEndpoint);
      await this.notifyFailover(failoverEvent);

      failoverEvent.status = 'completed';
      return failoverEvent;
    } catch (error) {
      failoverEvent.status = 'failed';
      throw error;
    }
  }

  /**
   * Get affected venues for a service failure
   */
  private async getAffectedVenues(serviceName: string): Promise<string[]> {
    // In production, this would query which venues depend on this service
    // For now, return mock data based on service criticality
    switch (serviceName) {
      case 'user_authentication':
        return ['all']; // Auth affects everyone
      case 'photo_storage':
        return await this.getActiveWeddingVenues();
      case 'payment_processing':
        return await this.getPaymentActiveVenues();
      default:
        return [];
    }
  }

  private async getActiveWeddingVenues(): Promise<string[]> {
    // Mock data - in production, query active weddings
    return ['venue_001', 'venue_002', 'venue_003'];
  }

  private async getPaymentActiveVenues(): Promise<string[]> {
    // Mock data - in production, query venues with active payment flows
    return ['venue_001', 'venue_004'];
  }

  private estimateRecoveryTime(serviceName: string): number {
    // Estimate recovery time based on service type (in seconds)
    switch (serviceName) {
      case 'user_authentication':
        return 60;
      case 'photo_storage':
        return 180;
      case 'payment_processing':
        return 30;
      case 'database_primary':
        return 300;
      default:
        return 120;
    }
  }

  /**
   * Update service routing (DNS/Load balancer)
   */
  private async updateServiceRouting(
    serviceName: string,
    newEndpoint: string,
  ): Promise<void> {
    // Simulate DNS/load balancer update
    console.log(`📡 Updating routing for ${serviceName} to ${newEndpoint}`);
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
  }

  /**
   * Send failover notifications
   */
  private async notifyFailover(failoverEvent: FailoverEvent): Promise<void> {
    const message = `🚨 FAILOVER ALERT: ${failoverEvent.service_name} failed over from ${failoverEvent.primary_endpoint} to ${failoverEvent.failover_endpoint}. Reason: ${failoverEvent.trigger_reason}`;

    // Notify operations team
    await this.sendOperationsAlert(message, 'critical');

    // Notify affected venues if it's a wedding day
    if (failoverEvent.affected_venues && (await this.isWeddingDay())) {
      await this.notifyVenueManagers(failoverEvent, message);
    }

    console.log(
      `📢 Failover notifications sent for ${failoverEvent.service_name}`,
    );
  }

  private async notifyRecovery(
    serviceName: string,
    failoverEvent: FailoverEvent,
  ): Promise<void> {
    const message = `✅ RECOVERY: ${serviceName} has been recovered to primary endpoint ${failoverEvent.primary_endpoint}`;
    await this.sendOperationsAlert(message, 'info');
    console.log(`📢 Recovery notifications sent for ${serviceName}`);
  }

  private async alertCriticalFailure(
    serviceName: string,
    reason: string,
  ): Promise<void> {
    const message = `🔥 CRITICAL: All endpoints for ${serviceName} are unhealthy. Reason: ${reason}. Manual intervention required.`;
    await this.sendOperationsAlert(message, 'critical');

    // Escalate to on-call engineer
    await this.escalateToOnCall(serviceName, message);
  }

  private async sendOperationsAlert(
    message: string,
    severity: string,
  ): Promise<void> {
    console.log(`🚨 [${severity.toUpperCase()}] ${message}`);
    // In production: send to Slack, PagerDuty, email, SMS
  }

  private async notifyVenueManagers(
    failoverEvent: FailoverEvent,
    message: string,
  ): Promise<void> {
    console.log(`📧 Notifying venue managers about failover: ${message}`);
    // In production: send targeted notifications to venue managers
  }

  private async escalateToOnCall(
    serviceName: string,
    message: string,
  ): Promise<void> {
    console.log(
      `📞 Escalating to on-call engineer: ${serviceName} - ${message}`,
    );
    // In production: trigger PagerDuty, call on-call rotation
  }

  private async isWeddingDay(): Promise<boolean> {
    const today = new Date();
    return today.getDay() === 6; // Saturday
  }

  /**
   * Get current failover for a service
   */
  private getActiveFailover(serviceName: string): FailoverEvent | undefined {
    return this.activeFailovers.get(serviceName);
  }

  /**
   * Get overall system health status
   */
  getSystemHealthStatus(): {
    overall_status: 'healthy' | 'degraded' | 'critical';
    services: ServiceHealth[];
    active_failovers: FailoverEvent[];
    total_uptime_percentage: number;
  } {
    const services = Array.from(this.serviceHealth.values());
    const activeFailovers = Array.from(this.activeFailovers.values());

    const healthyCount = services.filter((s) => s.status === 'healthy').length;
    const degradedCount = services.filter(
      (s) => s.status === 'degraded',
    ).length;
    const unhealthyCount = services.filter(
      (s) => s.status === 'unhealthy',
    ).length;

    let overallStatus: 'healthy' | 'degraded' | 'critical';
    if (unhealthyCount > 0 || activeFailovers.length > 2) {
      overallStatus = 'critical';
    } else if (degradedCount > 0 || activeFailovers.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const totalUptime =
      services.reduce((sum, s) => sum + s.uptime_percentage, 0) /
      services.length;

    return {
      overall_status: overallStatus,
      services,
      active_failovers: activeFailovers,
      total_uptime_percentage: totalUptime,
    };
  }

  /**
   * Shutdown gracefully
   */
  shutdown(): void {
    // Clear all health check intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();
    console.log('High Availability Manager shut down');
  }
}

/**
 * Circuit breaker implementation for additional resilience
 */
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: Date;
  private config: HealthCheckConfig;

  constructor(config: HealthCheckConfig) {
    this.config = config;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (
      this.failures >= this.config.failure_threshold &&
      this.state === 'closed'
    ) {
      this.state = 'open';
      console.log(`🔴 Circuit breaker opened for ${this.config.service_name}`);
    }
  }

  recordSuccess(): void {
    this.successes++;

    if (
      this.state === 'half-open' &&
      this.successes >= this.config.success_threshold
    ) {
      this.state = 'closed';
      this.failures = 0;
      console.log(`🟢 Circuit breaker closed for ${this.config.service_name}`);
    } else if (this.state === 'open' && this.shouldAttemptReset()) {
      this.state = 'half-open';
      this.successes = 0;
      console.log(
        `🟡 Circuit breaker half-open for ${this.config.service_name}`,
      );
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;

    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    const resetTimeout = this.config.check_interval * 3 * 1000; // 3x check interval

    return timeSinceLastFailure > resetTimeout;
  }

  canExecute(): boolean {
    return this.state !== 'open';
  }

  getState(): string {
    return this.state;
  }
}

// Factory function
export function createHighAvailabilityManager(): HighAvailabilityManager {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return new HighAvailabilityManager(supabaseUrl, supabaseKey);
}

// Global instance
let globalHAManager: HighAvailabilityManager | null = null;

export function getHighAvailabilityManager(): HighAvailabilityManager {
  if (!globalHAManager) {
    globalHAManager = createHighAvailabilityManager();
  }
  return globalHAManager;
}
