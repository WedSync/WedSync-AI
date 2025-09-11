/**
 * Calendar Integration Health Monitor
 * Monitors API connectivity, webhook status, sync performance, and system health
 */

import {
  CalendarProvider,
  CalendarConnection,
  WebhookSubscription,
  IntegrationError,
  HealthStatus,
  HealthCheck,
  PerformanceMetrics,
  AlertLevel,
  SystemAlert,
} from './types';
import { GoogleCalendarService } from './providers/google-calendar-service';
import { OutlookCalendarService } from './providers/outlook-calendar-service';
import { AppleCalendarService } from './providers/apple-calendar-service';
import { CalendarSyncEngine } from './sync-engine';

export interface HealthMonitorConfig {
  checkIntervalMs: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    syncFailureRate: number;
    webhookDelay: number;
  };
  retentionPeriod: number;
  enableWeddingDayAlerts: boolean;
}

export interface ProviderHealthStatus {
  provider: CalendarProvider;
  isHealthy: boolean;
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  syncSuccess: number;
  syncFailures: number;
  webhookStatus: 'active' | 'inactive' | 'expired' | 'error';
  issues: string[];
  uptime: number;
}

export interface IntegrationHealthReport {
  overall: 'healthy' | 'degraded' | 'critical';
  timestamp: Date;
  providers: ProviderHealthStatus[];
  metrics: {
    totalConnections: number;
    activeWebhooks: number;
    recentSyncs: number;
    avgSyncTime: number;
    errorRate: number;
  };
  alerts: SystemAlert[];
  weddingDayMode: boolean;
  recommendations: string[];
}

export class CalendarIntegrationHealthMonitor {
  private config: HealthMonitorConfig;
  private services: Map<CalendarProvider, any>;
  private syncEngine: CalendarSyncEngine;
  private healthData: Map<CalendarProvider, ProviderHealthStatus>;
  private alerts: SystemAlert[];
  private monitoringInterval?: NodeJS.Timeout;
  private isWeddingDay: boolean;

  constructor(
    syncEngine: CalendarSyncEngine,
    config: Partial<HealthMonitorConfig> = {},
  ) {
    this.config = {
      checkIntervalMs: 60000, // 1 minute
      alertThresholds: {
        responseTime: 2000, // 2 seconds
        errorRate: 0.05, // 5%
        syncFailureRate: 0.1, // 10%
        webhookDelay: 300000, // 5 minutes
      },
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      enableWeddingDayAlerts: true,
      ...config,
    };

    this.syncEngine = syncEngine;
    this.services = new Map([
      ['google', new GoogleCalendarService()],
      ['outlook', new OutlookCalendarService()],
      ['apple', new AppleCalendarService()],
    ]);

    this.healthData = new Map();
    this.alerts = [];
    this.isWeddingDay = false;

    this.initializeHealthData();
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.monitoringInterval) {
      console.warn('Health monitor is already running');
      return;
    }

    console.log('Starting calendar integration health monitor...');

    // Run initial health check
    this.performHealthCheck();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkIntervalMs);

    // Clean up old data periodically
    setInterval(
      () => {
        this.cleanupOldData();
      },
      60 * 60 * 1000,
    ); // Every hour
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      console.log('Calendar integration health monitor stopped');
    }
  }

  /**
   * Enable wedding day mode for enhanced monitoring
   */
  enableWeddingDayMode(): void {
    this.isWeddingDay = true;
    this.config.checkIntervalMs = 30000; // Check every 30 seconds on wedding day
    this.config.alertThresholds.responseTime = 1000; // Stricter response time
    this.config.alertThresholds.errorRate = 0.01; // Stricter error rate

    console.log('Wedding day mode enabled - enhanced monitoring active');

    // Restart monitoring with new interval
    this.stop();
    this.start();
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<IntegrationHealthReport> {
    const checkStartTime = Date.now();

    try {
      // Check each provider's health
      const providerChecks = Array.from(this.services.keys()).map((provider) =>
        this.checkProviderHealth(provider),
      );

      const providerResults = await Promise.allSettled(providerChecks);

      // Update health data
      providerResults.forEach((result, index) => {
        const provider = Array.from(this.services.keys())[index];

        if (result.status === 'fulfilled') {
          this.healthData.set(provider, result.value);
        } else {
          // Mark provider as unhealthy
          const currentHealth =
            this.healthData.get(provider) ||
            this.createDefaultHealthStatus(provider);
          currentHealth.isHealthy = false;
          currentHealth.issues.push(`Health check failed: ${result.reason}`);
          currentHealth.lastCheck = new Date();
          this.healthData.set(provider, currentHealth);
        }
      });

      // Check webhook subscriptions
      await this.checkWebhookHealth();

      // Analyze sync performance
      await this.analyzeSyncPerformance();

      // Generate alerts based on thresholds
      await this.generateAlerts();

      // Create comprehensive health report
      const report = await this.generateHealthReport();

      // Log critical issues immediately
      if (report.overall === 'critical') {
        console.error(
          'CRITICAL: Calendar integration health issues detected:',
          report.alerts,
        );

        if (this.isWeddingDay) {
          await this.sendWeddingDayAlert(report);
        }
      }

      return report;
    } catch (error) {
      console.error('Health check failed:', error);
      throw new IntegrationError(
        'HEALTH_CHECK_FAILED',
        `Health monitoring failed: ${error.message}`,
        { error: error.message },
      );
    }
  }

  /**
   * Check individual provider health
   */
  private async checkProviderHealth(
    provider: CalendarProvider,
  ): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    const service = this.services.get(provider);
    const currentHealth =
      this.healthData.get(provider) || this.createDefaultHealthStatus(provider);

    try {
      // Test basic connectivity
      const connectivityTest = await this.testProviderConnectivity(
        provider,
        service,
      );

      // Check authentication status
      const authTest = await this.testProviderAuthentication(provider);

      // Test API rate limits
      const rateLimitTest = await this.checkRateLimits(provider);

      // Calculate response time
      const responseTime = Date.now() - startTime;

      // Update health status
      const updatedHealth: ProviderHealthStatus = {
        ...currentHealth,
        isHealthy: connectivityTest.success && authTest.success,
        lastCheck: new Date(),
        responseTime,
        issues: [
          ...(!connectivityTest.success
            ? [`Connectivity: ${connectivityTest.error}`]
            : []),
          ...(!authTest.success ? [`Authentication: ${authTest.error}`] : []),
          ...(!rateLimitTest.withinLimits
            ? [`Rate limit: ${rateLimitTest.message}`]
            : []),
        ],
      };

      // Update performance metrics
      this.updatePerformanceMetrics(
        provider,
        responseTime,
        updatedHealth.isHealthy,
      );

      return updatedHealth;
    } catch (error) {
      return {
        ...currentHealth,
        isHealthy: false,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        issues: [`Health check error: ${error.message}`],
      };
    }
  }

  /**
   * Test provider connectivity
   */
  private async testProviderConnectivity(
    provider: CalendarProvider,
    service: any,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      switch (provider) {
        case 'google':
          // Test Google Calendar API connectivity
          const response = await fetch(
            'https://www.googleapis.com/calendar/v3/colors',
            {
              method: 'GET',
              headers: {
                'User-Agent': 'WedSync-Health-Monitor/1.0',
              },
            },
          );
          return { success: response.status !== 500 };

        case 'outlook':
          // Test Microsoft Graph connectivity
          const graphResponse = await fetch(
            'https://graph.microsoft.com/v1.0/$metadata',
            {
              method: 'GET',
              headers: {
                'User-Agent': 'WedSync-Health-Monitor/1.0',
              },
            },
          );
          return { success: graphResponse.status !== 500 };

        case 'apple':
          // Test iCloud CalDAV connectivity
          const caldavResponse = await fetch(
            'https://caldav.icloud.com/.well-known/caldav',
            {
              method: 'GET',
              headers: {
                'User-Agent': 'WedSync-Health-Monitor/1.0',
              },
            },
          );
          return { success: caldavResponse.status !== 500 };

        default:
          return { success: false, error: 'Unknown provider' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test provider authentication
   */
  private async testProviderAuthentication(
    provider: CalendarProvider,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get a sample connection for this provider
      const testConnection = await this.getTestConnection(provider);

      if (!testConnection) {
        return { success: true }; // No connections to test
      }

      // Test authentication by making a simple API call
      const service = this.services.get(provider);
      await service.listCalendars(testConnection);

      return { success: true };
    } catch (error) {
      if (
        error.message.includes('401') ||
        error.message.includes('unauthorized')
      ) {
        return {
          success: false,
          error: 'Authentication failed - token may be expired',
        };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Check rate limits for each provider
   */
  private async checkRateLimits(
    provider: CalendarProvider,
  ): Promise<{ withinLimits: boolean; message?: string }> {
    try {
      // Get current usage metrics for this provider
      const metrics = this.syncEngine.getSyncMetrics();
      const providerStats = metrics.providerStats[provider];

      if (!providerStats) {
        return { withinLimits: true };
      }

      // Check provider-specific rate limits
      switch (provider) {
        case 'google':
          // Google Calendar: 250 queries per user per 100 seconds
          const googleRate = providerStats.events / 100; // Simplified calculation
          if (googleRate > 200) {
            // 80% of limit
            return {
              withinLimits: false,
              message: `Approaching Google rate limit: ${googleRate}/250 per 100s`,
            };
          }
          break;

        case 'outlook':
          // Microsoft Graph: 10,000 requests per app per 10 minutes
          const outlookRate = providerStats.events / 600; // Simplified calculation
          if (outlookRate > 8000) {
            // 80% of limit
            return {
              withinLimits: false,
              message: `Approaching Outlook rate limit: ${outlookRate}/10000 per 10min`,
            };
          }
          break;

        case 'apple':
          // Apple CalDAV: Conservative estimate of 100 requests per minute
          const appleRate = providerStats.events / 60; // Simplified calculation
          if (appleRate > 80) {
            // 80% of estimated limit
            return {
              withinLimits: false,
              message: `Approaching Apple rate limit: ${appleRate}/100 per min`,
            };
          }
          break;
      }

      return { withinLimits: true };
    } catch (error) {
      return { withinLimits: true }; // Default to true if we can't check
    }
  }

  /**
   * Check webhook subscription health
   */
  private async checkWebhookHealth(): Promise<void> {
    try {
      // Get all active webhook subscriptions
      const subscriptions = await this.getActiveWebhookSubscriptions();

      for (const subscription of subscriptions) {
        const health = this.healthData.get(subscription.provider);
        if (!health) continue;

        // Check if subscription is expired or expiring soon
        const now = new Date();
        const expirationTime = subscription.expiresAt;
        const hoursUntilExpiration =
          (expirationTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilExpiration < 0) {
          health.webhookStatus = 'expired';
          health.issues.push(
            `Webhook subscription expired at ${expirationTime.toISOString()}`,
          );
        } else if (hoursUntilExpiration < 24) {
          health.webhookStatus = 'active';
          health.issues.push(
            `Webhook subscription expires in ${Math.round(hoursUntilExpiration)} hours`,
          );
        } else {
          health.webhookStatus = 'active';
        }

        // Check webhook delivery health (simplified)
        const recentDeliveries = await this.getRecentWebhookDeliveries(
          subscription.id,
        );
        const failedDeliveries = recentDeliveries.filter(
          (d) => !d.successful,
        ).length;
        const failureRate =
          failedDeliveries / Math.max(recentDeliveries.length, 1);

        if (failureRate > this.config.alertThresholds.syncFailureRate) {
          health.webhookStatus = 'error';
          health.issues.push(
            `High webhook failure rate: ${Math.round(failureRate * 100)}%`,
          );
        }
      }
    } catch (error) {
      console.error('Webhook health check failed:', error);
    }
  }

  /**
   * Analyze sync performance metrics
   */
  private async analyzeSyncPerformance(): Promise<void> {
    try {
      const metrics = this.syncEngine.getSyncMetrics();
      const activeSyncs = this.syncEngine.getActiveSyncs();

      // Update provider sync statistics
      for (const [provider, health] of this.healthData.entries()) {
        const stats = metrics.providerStats[provider];

        health.syncSuccess = stats.successes;
        health.syncFailures = stats.failures;

        // Calculate error rate
        const totalSyncs = stats.successes + stats.failures;
        health.errorRate = totalSyncs > 0 ? stats.failures / totalSyncs : 0;

        // Check if error rate exceeds threshold
        if (health.errorRate > this.config.alertThresholds.errorRate) {
          health.issues.push(
            `High sync error rate: ${Math.round(health.errorRate * 100)}%`,
          );
        }

        // Check for stuck syncs
        const stuckSyncs = activeSyncs.filter(
          (sync) =>
            Date.now() - sync.startTime.getTime() > 300000 && // 5 minutes
            sync.connections.some(
              (connId) => this.getConnectionProvider(connId) === provider,
            ),
        );

        if (stuckSyncs.length > 0) {
          health.issues.push(
            `${stuckSyncs.length} sync operations appear stuck`,
          );
        }
      }
    } catch (error) {
      console.error('Sync performance analysis failed:', error);
    }
  }

  /**
   * Generate system alerts based on health data
   */
  private async generateAlerts(): Promise<void> {
    const newAlerts: SystemAlert[] = [];
    const now = new Date();

    // Check overall system health
    const unhealthyProviders = Array.from(this.healthData.values()).filter(
      (h) => !h.isHealthy,
    );

    if (unhealthyProviders.length > 0) {
      newAlerts.push({
        id: `system-health-${Date.now()}`,
        level: unhealthyProviders.length >= 2 ? 'critical' : 'warning',
        title: 'Calendar Integration Health Issues',
        message: `${unhealthyProviders.length} provider(s) experiencing issues: ${unhealthyProviders.map((p) => p.provider).join(', ')}`,
        timestamp: now,
        source: 'health-monitor',
        resolved: false,
        weddingImpact: this.isWeddingDay,
      });
    }

    // Check for high response times
    for (const [provider, health] of this.healthData.entries()) {
      if (health.responseTime > this.config.alertThresholds.responseTime) {
        newAlerts.push({
          id: `response-time-${provider}-${Date.now()}`,
          level: 'warning',
          title: `Slow ${provider} Response Time`,
          message: `${provider} API responding in ${health.responseTime}ms (threshold: ${this.config.alertThresholds.responseTime}ms)`,
          timestamp: now,
          source: 'health-monitor',
          resolved: false,
          weddingImpact: this.isWeddingDay,
        });
      }
    }

    // Add wedding day specific alerts
    if (this.isWeddingDay && this.config.enableWeddingDayAlerts) {
      const criticalIssues = Array.from(this.healthData.values()).filter(
        (h) => !h.isHealthy || h.errorRate > 0.01,
      );

      if (criticalIssues.length > 0) {
        newAlerts.push({
          id: `wedding-day-alert-${Date.now()}`,
          level: 'critical',
          title: 'WEDDING DAY: Calendar Integration Issues',
          message: `Critical issues detected on wedding day affecting ${criticalIssues.length} provider(s)`,
          timestamp: now,
          source: 'wedding-day-monitor',
          resolved: false,
          weddingImpact: true,
        });
      }
    }

    // Add new alerts to the list
    this.alerts.push(...newAlerts);

    // Remove resolved alerts
    this.alerts = this.alerts.filter((alert) => !alert.resolved);
  }

  /**
   * Generate comprehensive health report
   */
  private async generateHealthReport(): Promise<IntegrationHealthReport> {
    const healthyProviders = Array.from(this.healthData.values()).filter(
      (h) => h.isHealthy,
    );
    const totalProviders = this.healthData.size;

    let overallStatus: 'healthy' | 'degraded' | 'critical';

    if (healthyProviders.length === totalProviders) {
      overallStatus = 'healthy';
    } else if (healthyProviders.length >= totalProviders / 2) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'critical';
    }

    const metrics = this.syncEngine.getSyncMetrics();
    const connections = await this.getTotalConnections();
    const activeWebhooks = await this.getActiveWebhookCount();

    return {
      overall: overallStatus,
      timestamp: new Date(),
      providers: Array.from(this.healthData.values()),
      metrics: {
        totalConnections: connections,
        activeWebhooks,
        recentSyncs: metrics.totalEvents,
        avgSyncTime: metrics.averageSyncTime,
        errorRate: metrics.failedSyncs / Math.max(metrics.totalEvents, 1),
      },
      alerts: [...this.alerts],
      weddingDayMode: this.isWeddingDay,
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check for expired tokens
    const authIssues = Array.from(this.healthData.values()).filter((h) =>
      h.issues.some((issue) => issue.includes('Authentication')),
    );

    if (authIssues.length > 0) {
      recommendations.push(
        'Refresh expired authentication tokens for affected providers',
      );
    }

    // Check for high error rates
    const highErrorProviders = Array.from(this.healthData.values()).filter(
      (h) => h.errorRate > 0.1,
    );
    if (highErrorProviders.length > 0) {
      recommendations.push(
        'Investigate high error rates and implement retry mechanisms',
      );
    }

    // Check webhook expiration
    const expiredWebhooks = Array.from(this.healthData.values()).filter(
      (h) => h.webhookStatus === 'expired',
    );
    if (expiredWebhooks.length > 0) {
      recommendations.push(
        'Renew expired webhook subscriptions to maintain real-time sync',
      );
    }

    if (this.isWeddingDay) {
      recommendations.push(
        'Enable manual backup procedures for critical wedding events',
      );
      recommendations.push(
        'Monitor all sync operations closely during wedding day',
      );
    }

    return recommendations;
  }

  // Helper methods
  private initializeHealthData(): void {
    for (const provider of this.services.keys()) {
      this.healthData.set(provider, this.createDefaultHealthStatus(provider));
    }
  }

  private createDefaultHealthStatus(
    provider: CalendarProvider,
  ): ProviderHealthStatus {
    return {
      provider,
      isHealthy: true,
      lastCheck: new Date(),
      responseTime: 0,
      errorRate: 0,
      syncSuccess: 0,
      syncFailures: 0,
      webhookStatus: 'inactive',
      issues: [],
      uptime: 1.0,
    };
  }

  private updatePerformanceMetrics(
    provider: CalendarProvider,
    responseTime: number,
    success: boolean,
  ): void {
    // Update performance tracking (simplified)
    const health = this.healthData.get(provider);
    if (health) {
      // Exponential moving average for response time
      health.responseTime = health.responseTime * 0.7 + responseTime * 0.3;

      // Update uptime calculation
      health.uptime = success
        ? Math.min(health.uptime + 0.01, 1.0)
        : Math.max(health.uptime - 0.1, 0.0);
    }
  }

  private async sendWeddingDayAlert(
    report: IntegrationHealthReport,
  ): Promise<void> {
    // Implementation would send urgent alerts via SMS, email, Slack, etc.
    console.error('WEDDING DAY ALERT:', report);
  }

  private cleanupOldData(): void {
    const cutoffTime = Date.now() - this.config.retentionPeriod;

    // Remove old alerts
    this.alerts = this.alerts.filter(
      (alert) => alert.timestamp.getTime() > cutoffTime || !alert.resolved,
    );
  }

  // Simplified helper methods (would connect to actual database in production)
  private async getActiveWebhookSubscriptions(): Promise<
    WebhookSubscription[]
  > {
    return [];
  }
  private async getRecentWebhookDeliveries(
    subscriptionId: string,
  ): Promise<any[]> {
    return [];
  }
  private async getTotalConnections(): Promise<number> {
    return 0;
  }
  private async getActiveWebhookCount(): Promise<number> {
    return 0;
  }
  private async getTestConnection(
    provider: CalendarProvider,
  ): Promise<CalendarConnection | null> {
    return null;
  }
  private getConnectionProvider(connectionId: string): CalendarProvider {
    return 'google';
  }
}
