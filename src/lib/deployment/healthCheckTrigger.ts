// WS-098 Health Check Trigger - Automated Rollback Based on Health
// Monitors system health and triggers rollback when thresholds are breached
// Uses dependency injection to avoid circular dependencies

import {
  HealthEndpoint,
  HealthMetrics,
  EndpointHealth,
  RollbackManagerInterface,
  HealthMonitorInterface,
} from './types';

export class HealthCheckMonitor implements HealthMonitorInterface {
  private static readonly HEALTH_THRESHOLD = 50; // Rollback if health drops below 50%
  private static readonly CRITICAL_FAILURE_THRESHOLD = 2; // Rollback if 2+ critical endpoints fail
  private static readonly CHECK_INTERVAL = 30000; // Check every 30 seconds
  private static readonly MAX_RESPONSE_TIME = 5000; // 5 seconds max response time

  private monitoring = false;
  private intervalId?: NodeJS.Timeout;
  private rollbackManager?: RollbackManagerInterface;
  private consecutiveFailures = 0;
  private lastHealthCheck?: HealthMetrics;

  constructor(rollbackManager?: RollbackManagerInterface) {
    this.rollbackManager = rollbackManager;
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(
    environment: 'production' | 'staging' | 'development' = 'production',
  ): void {
    if (this.monitoring) {
      console.log('Health monitoring already active');
      return;
    }

    console.log('🏥 Starting health check monitoring...');
    this.monitoring = true;

    // Initial check
    this.performHealthCheck(environment);

    // Set up interval for continuous monitoring
    this.intervalId = setInterval(() => {
      this.performHealthCheck(environment);
    }, HealthCheckMonitor.CHECK_INTERVAL);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (!this.monitoring) {
      return;
    }

    console.log('🛑 Stopping health check monitoring');
    this.monitoring = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.consecutiveFailures = 0;
  }

  /**
   * Perform a single health check
   */
  async performHealthCheck(environment: string): Promise<void> {
    try {
      const metrics = await this.checkSystemHealth(environment);
      this.lastHealthCheck = metrics;

      // Log health status
      console.log(`Health Check: ${metrics.overallHealth}% healthy`);

      // Check if rollback should be triggered (only if rollback manager is available)
      if (
        metrics.triggerRollback &&
        !metrics.weddingProtection &&
        this.rollbackManager
      ) {
        this.consecutiveFailures++;

        // Require 2 consecutive failures to avoid false positives
        if (this.consecutiveFailures >= 2) {
          console.error(
            '🚨 Health threshold breached - triggering automatic rollback',
          );
          await this.triggerAutomaticRollback(environment, metrics);
        } else {
          console.warn(
            '⚠️ Health degraded - monitoring for consecutive failure',
          );
        }
      } else {
        // Reset consecutive failures on successful check
        this.consecutiveFailures = 0;
      }
    } catch (error) {
      console.error('Health check failed:', error);
      this.consecutiveFailures++;
    }
  }

  /**
   * Check system health across all endpoints
   */
  async checkSystemHealth(environment: string): Promise<HealthMetrics> {
    const baseUrl = this.getBaseUrl(environment);
    const endpoints = this.getHealthEndpoints(baseUrl);
    const endpointResults: EndpointHealth[] = [];

    // Check wedding protection first
    const weddingProtection = await this.checkWeddingProtection();

    // Check each endpoint
    for (const endpoint of endpoints) {
      const health = await this.checkEndpoint(endpoint);
      endpointResults.push(health);
    }

    // Calculate overall health
    const healthyEndpoints = endpointResults.filter(
      (e) => e.status === 'healthy',
    ).length;
    const degradedEndpoints = endpointResults.filter(
      (e) => e.status === 'degraded',
    ).length;
    const failedEndpoints = endpointResults.filter(
      (e) => e.status === 'failed',
    ).length;
    const criticalFailures = endpoints.filter(
      (e, i) => e.critical && endpointResults[i].status === 'failed',
    ).length;

    const overallHealth = Math.round(
      (healthyEndpoints * 100 + degradedEndpoints * 50) / endpoints.length,
    );

    // Determine if rollback should be triggered
    const triggerRollback =
      overallHealth < HealthCheckMonitor.HEALTH_THRESHOLD ||
      criticalFailures >= HealthCheckMonitor.CRITICAL_FAILURE_THRESHOLD;

    return {
      timestamp: new Date(),
      overallHealth,
      endpoints: endpointResults,
      triggerRollback,
      weddingProtection,
    };
  }

  /**
   * Check a single endpoint health
   */
  private async checkEndpoint(
    endpoint: HealthEndpoint,
  ): Promise<EndpointHealth> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        HealthCheckMonitor.MAX_RESPONSE_TIME,
      );

      const response = await fetch(endpoint.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'X-Health-Check': 'true',
        },
      });

      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;

      // Determine health status
      let status: 'healthy' | 'degraded' | 'failed' = 'healthy';

      if (!response.ok) {
        status = 'failed';
      } else if (responseTime > (endpoint.maxResponseTime || 3000)) {
        status = 'degraded';
      }

      return {
        name: endpoint.name,
        status,
        responseTime,
        statusCode: response.status,
      };
    } catch (error) {
      return {
        name: endpoint.name,
        status: 'failed',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check for wedding protection
   */
  async checkWeddingProtection(): Promise<boolean> {
    try {
      const response = await fetch('/api/weddings/today');
      if (response.ok) {
        const data = await response.json();
        return data.hasActiveWeddings || false;
      }
    } catch (error) {
      console.error('Failed to check wedding protection:', error);
    }
    return false;
  }

  /**
   * Trigger automatic rollback based on health failures
   */
  private async triggerAutomaticRollback(
    environment: string,
    metrics: HealthMetrics,
  ): Promise<void> {
    if (!this.rollbackManager) {
      console.error(
        'Rollback manager not available - cannot trigger automatic rollback',
      );
      return;
    }

    try {
      // Get the last known good deployment
      const targetCommit = await this.getLastStableDeployment();

      if (!targetCommit) {
        console.error('Cannot determine rollback target');
        return;
      }

      // Initiate rollback
      const result = await this.rollbackManager.initiateRollback({
        targetCommit,
        reason: 'health',
        environment: environment as 'production' | 'staging' | 'development',
        disableWeddingProtection: false,
        skipHealthChecks: false,
        dryRun: false,
      });

      if (result.status === 'success') {
        console.log('✅ Automatic rollback completed successfully');
        this.consecutiveFailures = 0;
      } else if (result.status === 'blocked') {
        console.log('🚨 Automatic rollback blocked due to wedding protection');
      } else {
        console.error('❌ Automatic rollback failed:', result.errorMessage);
      }
    } catch (error) {
      console.error('Failed to trigger automatic rollback:', error);
    }
  }

  /**
   * Get the last stable deployment commit
   */
  private async getLastStableDeployment(): Promise<string | null> {
    try {
      // This would typically query deployment history
      // For now, return a placeholder
      return process.env.LAST_STABLE_COMMIT || null;
    } catch (error) {
      console.error('Failed to get last stable deployment:', error);
      return null;
    }
  }

  /**
   * Get base URL for environment
   */
  private getBaseUrl(environment: string): string {
    switch (environment) {
      case 'production':
        return 'https://wedsync.com';
      case 'staging':
        return 'https://staging-wedsync.vercel.app';
      case 'development':
        return 'http://localhost:3000';
      default:
        return 'https://wedsync.com';
    }
  }

  /**
   * Get health check endpoints
   */
  private getHealthEndpoints(baseUrl: string): HealthEndpoint[] {
    return [
      {
        name: 'Main Health',
        url: `${baseUrl}/api/health`,
        critical: true,
        maxResponseTime: 2000,
      },
      {
        name: 'Auth Service',
        url: `${baseUrl}/api/auth/health`,
        critical: true,
        maxResponseTime: 3000,
      },
      {
        name: 'Client Service',
        url: `${baseUrl}/api/clients/health`,
        critical: true,
        maxResponseTime: 3000,
      },
      {
        name: 'Vendor Service',
        url: `${baseUrl}/api/vendors/health`,
        critical: true,
        maxResponseTime: 3000,
      },
      {
        name: 'Journey Engine',
        url: `${baseUrl}/api/journey-engine/health`,
        critical: false,
        maxResponseTime: 5000,
      },
      {
        name: 'Payment Service',
        url: `${baseUrl}/api/payments/health`,
        critical: false,
        maxResponseTime: 4000,
      },
      {
        name: 'Notification Service',
        url: `${baseUrl}/api/notifications/health`,
        critical: false,
        maxResponseTime: 3000,
      },
      {
        name: 'Database',
        url: `${baseUrl}/api/health/database`,
        critical: true,
        maxResponseTime: 5000,
      },
    ];
  }

  /**
   * Get current health status
   */
  getCurrentHealth(): HealthMetrics | undefined {
    return this.lastHealthCheck;
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean {
    return this.monitoring;
  }
}

// Export factory function for creating monitor with dependencies
export function createHealthCheckMonitor(
  rollbackManager?: RollbackManagerInterface,
): HealthCheckMonitor {
  return new HealthCheckMonitor(rollbackManager);
}

// Export singleton for global access (lazy-loaded dependencies)
export const healthCheckMonitor = createHealthCheckMonitor();
