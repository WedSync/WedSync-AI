/**
 * WS-178: Storage Health Monitoring Service
 * Continuous monitoring of backup storage provider health and performance
 */

import {
  IBackupStorageProvider,
  BackupConfig,
  BackupSecurityError,
} from './backup-storage-provider';

export interface ProviderHealthMetrics {
  providerId: string;
  isHealthy: boolean;
  responseTime: number;
  availabilityPercentage: number;
  errorRate: number;
  lastCheck: Date;
  consecutiveFailures: number;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  uptime: number;
  errorDetails?: string;
  performanceScore: number; // 0-100
}

export interface AlertConfig {
  enableAlerts: boolean;
  responseTimeThreshold: number; // milliseconds
  errorRateThreshold: number; // percentage
  consecutiveFailureThreshold: number;
  alertWebhookUrl?: string;
  alertEmailRecipients?: string[];
}

export interface HealthAlert {
  id: string;
  providerId: string;
  severity: 'warning' | 'critical' | 'resolved';
  message: string;
  timestamp: Date;
  metrics: ProviderHealthMetrics;
}

export class StorageHealthMonitor {
  private providers: Map<string, IBackupStorageProvider> = new Map();
  private metrics: Map<string, ProviderHealthMetrics> = new Map();
  private alertConfig: AlertConfig;
  private monitoringInterval?: NodeJS.Timeout;
  private alertHistory: HealthAlert[] = [];

  constructor(alertConfig: AlertConfig) {
    this.alertConfig = alertConfig;
  }

  /**
   * Register a provider for monitoring
   */
  public registerProvider(provider: IBackupStorageProvider): void {
    this.providers.set(provider.providerId, provider);

    // Initialize metrics
    this.metrics.set(provider.providerId, {
      providerId: provider.providerId,
      isHealthy: false,
      responseTime: 0,
      availabilityPercentage: 100,
      errorRate: 0,
      lastCheck: new Date(),
      consecutiveFailures: 0,
      status: 'offline',
      uptime: 0,
      performanceScore: 0,
    });

    console.log(`[HealthMonitor] Registered provider: ${provider.providerId}`);
  }

  /**
   * Start continuous health monitoring
   */
  public startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      await this.checkAllProviders();
    }, intervalMs);

    console.log(
      `[HealthMonitor] Started monitoring ${this.providers.size} providers (${intervalMs}ms interval)`,
    );

    // Perform initial check
    setTimeout(() => this.checkAllProviders(), 1000);
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    console.log('[HealthMonitor] Monitoring stopped');
  }

  /**
   * Check health of all registered providers
   */
  public async checkAllProviders(): Promise<void> {
    const checkPromises = Array.from(this.providers.entries()).map(
      async ([providerId, provider]) => {
        await this.checkProviderHealth(providerId, provider);
      },
    );

    await Promise.allSettled(checkPromises);

    // Process alerts
    if (this.alertConfig.enableAlerts) {
      await this.processAlerts();
    }
  }

  /**
   * Check health of a specific provider
   */
  public async checkProviderHealth(
    providerId: string,
    provider: IBackupStorageProvider,
  ): Promise<ProviderHealthMetrics> {
    const startTime = Date.now();
    const currentMetrics = this.metrics.get(providerId)!;

    try {
      // Perform health check
      const isHealthy = await Promise.race([
        provider.healthCheck(),
        new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(false), 30000),
        ), // 30s timeout
      ]);

      const responseTime = Date.now() - startTime;

      // Update metrics
      const updatedMetrics: ProviderHealthMetrics = {
        ...currentMetrics,
        isHealthy,
        responseTime,
        lastCheck: new Date(),
        consecutiveFailures: isHealthy
          ? 0
          : currentMetrics.consecutiveFailures + 1,
        status: this.determineStatus(
          isHealthy,
          responseTime,
          currentMetrics.consecutiveFailures,
        ),
        performanceScore: this.calculatePerformanceScore(
          isHealthy,
          responseTime,
          currentMetrics.errorRate,
        ),
        uptime: isHealthy ? currentMetrics.uptime + 1 : currentMetrics.uptime,
      };

      // Calculate availability percentage (rolling 24-hour window)
      updatedMetrics.availabilityPercentage =
        this.calculateAvailability(updatedMetrics);

      // Calculate error rate
      updatedMetrics.errorRate = this.calculateErrorRate(updatedMetrics);

      this.metrics.set(providerId, updatedMetrics);

      console.log(
        `[HealthMonitor] ${providerId}: ${updatedMetrics.status} (${responseTime}ms, ${updatedMetrics.availabilityPercentage}% available)`,
      );

      return updatedMetrics;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      const updatedMetrics: ProviderHealthMetrics = {
        ...currentMetrics,
        isHealthy: false,
        responseTime,
        lastCheck: new Date(),
        consecutiveFailures: currentMetrics.consecutiveFailures + 1,
        status: 'offline',
        errorDetails: errorMessage,
        performanceScore: 0,
      };

      updatedMetrics.availabilityPercentage =
        this.calculateAvailability(updatedMetrics);
      updatedMetrics.errorRate = this.calculateErrorRate(updatedMetrics);

      this.metrics.set(providerId, updatedMetrics);

      console.error(
        `[HealthMonitor] ${providerId}: Health check failed - ${errorMessage}`,
      );

      return updatedMetrics;
    }
  }

  /**
   * Get current metrics for a provider
   */
  public getProviderMetrics(
    providerId: string,
  ): ProviderHealthMetrics | undefined {
    return this.metrics.get(providerId);
  }

  /**
   * Get metrics for all providers
   */
  public getAllMetrics(): ProviderHealthMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get healthy providers
   */
  public getHealthyProviders(): string[] {
    return Array.from(this.metrics.entries())
      .filter(
        ([_, metrics]) => metrics.isHealthy && metrics.status === 'healthy',
      )
      .map(([providerId]) => providerId);
  }

  /**
   * Get alert history
   */
  public getAlertHistory(hoursBack: number = 24): HealthAlert[] {
    const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return this.alertHistory.filter((alert) => alert.timestamp >= cutoff);
  }

  /**
   * Get system health summary
   */
  public getHealthSummary(): {
    totalProviders: number;
    healthyProviders: number;
    degradedProviders: number;
    offlineProviders: number;
    averageResponseTime: number;
    overallHealthScore: number;
    activeAlerts: number;
  } {
    const allMetrics = this.getAllMetrics();
    const healthyCount = allMetrics.filter(
      (m) => m.status === 'healthy',
    ).length;
    const degradedCount = allMetrics.filter(
      (m) => m.status === 'degraded',
    ).length;
    const offlineCount = allMetrics.filter(
      (m) => m.status === 'offline',
    ).length;

    const avgResponseTime =
      allMetrics.length > 0
        ? allMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
          allMetrics.length
        : 0;

    const overallHealthScore =
      allMetrics.length > 0
        ? allMetrics.reduce((sum, m) => sum + m.performanceScore, 0) /
          allMetrics.length
        : 0;

    const activeAlerts = this.alertHistory.filter(
      (alert) =>
        alert.severity !== 'resolved' &&
        alert.timestamp > new Date(Date.now() - 60 * 60 * 1000), // Last hour
    ).length;

    return {
      totalProviders: allMetrics.length,
      healthyProviders: healthyCount,
      degradedProviders: degradedCount,
      offlineProviders: offlineCount,
      averageResponseTime: Math.round(avgResponseTime),
      overallHealthScore: Math.round(overallHealthScore),
      activeAlerts,
    };
  }

  // Private helper methods

  private determineStatus(
    isHealthy: boolean,
    responseTime: number,
    consecutiveFailures: number,
  ): 'healthy' | 'degraded' | 'unhealthy' | 'offline' {
    if (!isHealthy) {
      return consecutiveFailures >= 3 ? 'offline' : 'unhealthy';
    }

    if (responseTime > this.alertConfig.responseTimeThreshold) {
      return 'degraded';
    }

    return 'healthy';
  }

  private calculatePerformanceScore(
    isHealthy: boolean,
    responseTime: number,
    errorRate: number,
  ): number {
    if (!isHealthy) return 0;

    let score = 100;

    // Penalize slow response times
    if (responseTime > 1000) score -= 20;
    else if (responseTime > 500) score -= 10;

    // Penalize high error rates
    if (errorRate > 5) score -= 30;
    else if (errorRate > 1) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  private calculateAvailability(metrics: ProviderHealthMetrics): number {
    // Simplified calculation - in production, this would use historical data
    const failureRatio =
      metrics.consecutiveFailures /
      Math.max(metrics.uptime + metrics.consecutiveFailures, 1);
    return Math.max(0, Math.min(100, (1 - failureRatio) * 100));
  }

  private calculateErrorRate(metrics: ProviderHealthMetrics): number {
    // Simplified calculation - in production, this would use sliding window
    const totalChecks = metrics.uptime + metrics.consecutiveFailures;
    return totalChecks > 0
      ? (metrics.consecutiveFailures / totalChecks) * 100
      : 0;
  }

  private async processAlerts(): Promise<void> {
    const entries = Array.from(this.metrics.entries());
    for (const [providerId, metrics] of entries) {
      await this.checkForAlerts(providerId, metrics);
    }
  }

  private async checkForAlerts(
    providerId: string,
    metrics: ProviderHealthMetrics,
  ): Promise<void> {
    // Check response time alert
    if (metrics.responseTime > this.alertConfig.responseTimeThreshold) {
      await this.createAlert(
        providerId,
        'warning',
        `High response time: ${metrics.responseTime}ms`,
        metrics,
      );
    }

    // Check error rate alert
    if (metrics.errorRate > this.alertConfig.errorRateThreshold) {
      await this.createAlert(
        providerId,
        'warning',
        `High error rate: ${metrics.errorRate}%`,
        metrics,
      );
    }

    // Check consecutive failures alert
    if (
      metrics.consecutiveFailures >=
      this.alertConfig.consecutiveFailureThreshold
    ) {
      await this.createAlert(
        providerId,
        'critical',
        `Provider offline: ${metrics.consecutiveFailures} consecutive failures`,
        metrics,
      );
    }

    // Check for recovery
    if (metrics.isHealthy && metrics.consecutiveFailures === 0) {
      const recentCriticalAlerts = this.alertHistory.filter(
        (alert) =>
          alert.providerId === providerId &&
          alert.severity === 'critical' &&
          alert.timestamp > new Date(Date.now() - 60 * 60 * 1000),
      );

      if (recentCriticalAlerts.length > 0) {
        await this.createAlert(
          providerId,
          'resolved',
          'Provider recovered',
          metrics,
        );
      }
    }
  }

  private async createAlert(
    providerId: string,
    severity: 'warning' | 'critical' | 'resolved',
    message: string,
    metrics: ProviderHealthMetrics,
  ): Promise<void> {
    const alert: HealthAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      providerId,
      severity,
      message,
      timestamp: new Date(),
      metrics: { ...metrics },
    };

    this.alertHistory.push(alert);

    console.log(
      `[ALERT] ${severity.toUpperCase()} - ${providerId}: ${message}`,
    );

    // Send notifications
    if (this.alertConfig.alertWebhookUrl) {
      await this.sendWebhookAlert(alert);
    }

    // Keep only recent alerts (last 7 days)
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.alertHistory = this.alertHistory.filter((a) => a.timestamp >= cutoff);
  }

  private async sendWebhookAlert(alert: HealthAlert): Promise<void> {
    try {
      if (!this.alertConfig.alertWebhookUrl) return;

      const payload = {
        text: `🚨 Storage Provider Alert`,
        attachments: [
          {
            color:
              alert.severity === 'critical'
                ? 'danger'
                : alert.severity === 'warning'
                  ? 'warning'
                  : 'good',
            fields: [
              { title: 'Provider', value: alert.providerId, short: true },
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true,
              },
              { title: 'Message', value: alert.message, short: false },
              {
                title: 'Response Time',
                value: `${alert.metrics.responseTime}ms`,
                short: true,
              },
              { title: 'Status', value: alert.metrics.status, short: true },
            ],
            timestamp: alert.timestamp.toISOString(),
          },
        ],
      };

      const response = await fetch(this.alertConfig.alertWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(
          `[HealthMonitor] Failed to send webhook alert: ${response.status}`,
        );
      }
    } catch (error) {
      console.error(`[HealthMonitor] Error sending webhook alert:`, error);
    }
  }
}

// Factory for common configurations
export class HealthMonitorFactory {
  static createProductionMonitor(): StorageHealthMonitor {
    return new StorageHealthMonitor({
      enableAlerts: true,
      responseTimeThreshold: 5000, // 5 seconds
      errorRateThreshold: 5, // 5% error rate
      consecutiveFailureThreshold: 3,
      // Configure webhook URL and email recipients in production
    });
  }

  static createDevelopmentMonitor(): StorageHealthMonitor {
    return new StorageHealthMonitor({
      enableAlerts: false,
      responseTimeThreshold: 10000, // 10 seconds
      errorRateThreshold: 10, // 10% error rate
      consecutiveFailureThreshold: 5,
    });
  }
}
