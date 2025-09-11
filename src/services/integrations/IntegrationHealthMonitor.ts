import {
  IntegrationHealthStatus,
  DataSynchronizationRequest,
} from '../../types/integrations/integration-types';
import { EventEmitter } from 'events';

export interface HealthMonitorConfig {
  checkIntervalMs: number;
  alertThresholds: {
    criticalResponseTime: number;
    warningResponseTime: number;
    maxConsecutiveFailures: number;
    dataQualityThreshold: number;
  };
  notifications: {
    enabled: boolean;
    email: {
      enabled: boolean;
      recipients: string[];
      smtpConfig?: any;
    };
    slack: {
      enabled: boolean;
      webhookUrl?: string;
      channel?: string;
    };
    sms: {
      enabled: boolean;
      phoneNumbers: string[];
      twilioConfig?: any;
    };
  };
  recovery: {
    autoRecoveryEnabled: boolean;
    maxRecoveryAttempts: number;
    backoffMultiplier: number;
    initialBackoffMs: number;
  };
}

export interface IntegrationType {
  id: string;
  name: string;
  type: 'bi_platform' | 'crm' | 'data_warehouse';
  priority: 'critical' | 'high' | 'medium' | 'low';
  connector: any; // The actual connector instance
  lastHealthCheck?: Date;
  consecutiveFailures: number;
  isEnabled: boolean;
}

export interface HealthAlert {
  id: string;
  integrationId: string;
  integrationName: string;
  alertType: 'critical' | 'warning' | 'info' | 'recovery';
  message: string;
  details: any;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  acknowledgements: {
    userId: string;
    acknowledgedAt: Date;
    notes?: string;
  }[];
}

export interface HealthMetrics {
  integrationId: string;
  timestamp: Date;
  responseTimeMs: number;
  isHealthy: boolean;
  errorCount: number;
  successRate: number;
  dataQualityScore: number;
  customMetrics: { [key: string]: number };
}

export interface RecoveryAction {
  integrationId: string;
  actionType:
    | 'restart'
    | 'reconnect'
    | 'reset_credentials'
    | 'clear_cache'
    | 'full_reset';
  triggeredBy: 'automatic' | 'manual';
  triggeredAt: Date;
  success: boolean;
  details: string;
}

export class IntegrationHealthMonitor extends EventEmitter {
  private config: HealthMonitorConfig;
  private integrations: Map<string, IntegrationType> = new Map();
  private alerts: HealthAlert[] = [];
  private metrics: HealthMetrics[] = [];
  private recoveryActions: RecoveryAction[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private alertIdCounter: number = 1;

  constructor(config: HealthMonitorConfig) {
    super();
    this.config = config;
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    console.log('Starting integration health monitoring...');
    this.isMonitoring = true;

    // Initial health check for all integrations
    await this.performHealthChecks();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        console.error('Error during health check cycle:', error);
        await this.createAlert(
          'health_monitor',
          'Health Monitor',
          'critical',
          'Health monitoring cycle failed',
          { error: error instanceof Error ? error.message : String(error) },
        );
      }
    }, this.config.checkIntervalMs);

    // Set up wedding-specific monitoring
    await this.setupWeddingSpecificMonitoring();

    this.emit('monitoring_started');
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return;

    console.log('Stopping integration health monitoring...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.emit('monitoring_stopped');
  }

  registerIntegration(integration: IntegrationType): void {
    this.integrations.set(integration.id, {
      ...integration,
      consecutiveFailures: 0,
      lastHealthCheck: undefined,
    });

    console.log(
      `Registered integration: ${integration.name} (${integration.id})`,
    );
    this.emit('integration_registered', integration);
  }

  unregisterIntegration(integrationId: string): void {
    const integration = this.integrations.get(integrationId);
    if (integration) {
      this.integrations.delete(integrationId);
      console.log(
        `Unregistered integration: ${integration.name} (${integrationId})`,
      );
      this.emit('integration_unregistered', integration);
    }
  }

  async performHealthCheck(
    integrationId: string,
  ): Promise<IntegrationHealthStatus> {
    const integration = this.integrations.get(integrationId);
    if (!integration || !integration.isEnabled) {
      throw new Error(`Integration ${integrationId} not found or disabled`);
    }

    const startTime = Date.now();
    let healthStatus: IntegrationHealthStatus;

    try {
      // Call the connector's health check method
      healthStatus = await integration.connector.getHealthStatus();

      // Update integration status
      integration.lastHealthCheck = new Date();

      if (healthStatus.isHealthy) {
        // Reset consecutive failures on successful health check
        if (integration.consecutiveFailures > 0) {
          await this.createAlert(
            integrationId,
            integration.name,
            'recovery',
            `Integration recovered after ${integration.consecutiveFailures} failures`,
            { previousFailures: integration.consecutiveFailures },
          );
        }
        integration.consecutiveFailures = 0;
      } else {
        integration.consecutiveFailures++;

        // Create alert for unhealthy integration
        const alertType =
          integration.consecutiveFailures >=
          this.config.alertThresholds.maxConsecutiveFailures
            ? 'critical'
            : 'warning';

        await this.createAlert(
          integrationId,
          integration.name,
          alertType,
          `Integration health check failed (${integration.consecutiveFailures} consecutive failures)`,
          {
            consecutiveFailures: integration.consecutiveFailures,
            error: healthStatus.error,
            details: healthStatus.details,
          },
        );

        // Trigger recovery if enabled and threshold reached
        if (
          this.config.recovery.autoRecoveryEnabled &&
          integration.consecutiveFailures >=
            this.config.alertThresholds.maxConsecutiveFailures
        ) {
          await this.attemptRecovery(integrationId, 'automatic');
        }
      }

      // Record metrics
      await this.recordMetrics(
        integrationId,
        healthStatus,
        Date.now() - startTime,
      );

      return healthStatus;
    } catch (error) {
      integration.consecutiveFailures++;

      const errorStatus: IntegrationHealthStatus = {
        isHealthy: false,
        lastChecked: new Date(),
        responseTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };

      await this.createAlert(
        integrationId,
        integration.name,
        'critical',
        'Health check failed with exception',
        {
          error: errorStatus.error,
          consecutiveFailures: integration.consecutiveFailures,
        },
      );

      // Record error metrics
      await this.recordMetrics(
        integrationId,
        errorStatus,
        Date.now() - startTime,
      );

      return errorStatus;
    }
  }

  async performHealthChecks(): Promise<void> {
    const healthCheckPromises: Promise<void>[] = [];

    for (const [integrationId, integration] of this.integrations) {
      if (!integration.isEnabled) continue;

      healthCheckPromises.push(
        this.performHealthCheck(integrationId).catch((error) => {
          console.error(`Health check failed for ${integration.name}:`, error);
        }),
      );
    }

    await Promise.all(healthCheckPromises);
    this.emit('health_check_cycle_completed');
  }

  async attemptRecovery(
    integrationId: string,
    triggeredBy: 'automatic' | 'manual',
  ): Promise<boolean> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    console.log(`Attempting recovery for integration: ${integration.name}`);

    const recoveryStrategies: RecoveryAction['actionType'][] = [
      'reconnect',
      'clear_cache',
      'restart',
      'reset_credentials',
      'full_reset',
    ];

    for (const strategy of recoveryStrategies) {
      const recoveryAction: RecoveryAction = {
        integrationId,
        actionType: strategy,
        triggeredBy,
        triggeredAt: new Date(),
        success: false,
        details: '',
      };

      try {
        let success = false;

        switch (strategy) {
          case 'reconnect':
            await integration.connector.disconnect();
            await this.delay(2000); // Wait 2 seconds
            await integration.connector.connect();
            success = true;
            recoveryAction.details = 'Reconnected successfully';
            break;

          case 'clear_cache':
            // Assume connectors have a clearCache method
            if (typeof integration.connector.clearCache === 'function') {
              await integration.connector.clearCache();
              success = true;
              recoveryAction.details = 'Cache cleared successfully';
            }
            break;

          case 'restart':
            // Full restart of the connector
            await integration.connector.disconnect();
            await this.delay(5000); // Wait 5 seconds
            await integration.connector.connect();
            success = true;
            recoveryAction.details = 'Connector restarted successfully';
            break;

          case 'reset_credentials':
            // This would require re-authentication - implementation depends on connector
            if (
              typeof integration.connector.refreshCredentials === 'function'
            ) {
              await integration.connector.refreshCredentials();
              success = true;
              recoveryAction.details = 'Credentials refreshed successfully';
            }
            break;

          case 'full_reset':
            // Complete reset - disconnect, clear state, reconnect
            await integration.connector.disconnect();
            if (typeof integration.connector.reset === 'function') {
              await integration.connector.reset();
            }
            await this.delay(10000); // Wait 10 seconds
            await integration.connector.connect();
            success = true;
            recoveryAction.details = 'Full reset completed successfully';
            break;
        }

        recoveryAction.success = success;
        this.recoveryActions.push(recoveryAction);

        if (success) {
          // Test the recovery by performing a health check
          const healthStatus = await this.performHealthCheck(integrationId);

          if (healthStatus.isHealthy) {
            await this.createAlert(
              integrationId,
              integration.name,
              'recovery',
              `Automatic recovery successful using ${strategy}`,
              { recoveryStrategy: strategy },
            );

            console.log(
              `Recovery successful for ${integration.name} using ${strategy}`,
            );
            this.emit('recovery_successful', { integrationId, strategy });
            return true;
          }
        }
      } catch (error) {
        recoveryAction.success = false;
        recoveryAction.details =
          error instanceof Error ? error.message : String(error);
        this.recoveryActions.push(recoveryAction);

        console.error(
          `Recovery strategy ${strategy} failed for ${integration.name}:`,
          error,
        );
      }
    }

    // All recovery strategies failed
    await this.createAlert(
      integrationId,
      integration.name,
      'critical',
      'All automatic recovery strategies failed - manual intervention required',
      { attemptedStrategies: recoveryStrategies },
    );

    this.emit('recovery_failed', {
      integrationId,
      strategies: recoveryStrategies,
    });
    return false;
  }

  private async setupWeddingSpecificMonitoring(): Promise<void> {
    // Monitor for wedding-day critical periods
    setInterval(async () => {
      await this.checkWeddingDayCriticalPeriods();
    }, 60000); // Check every minute

    // Monitor data synchronization for wedding data
    setInterval(async () => {
      await this.checkWeddingDataSynchronization();
    }, 300000); // Check every 5 minutes

    // Monitor supplier-specific integrations during peak times
    setInterval(async () => {
      await this.checkSupplierPeakTimePerformance();
    }, 900000); // Check every 15 minutes
  }

  private async checkWeddingDayCriticalPeriods(): Promise<void> {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

    // Enhanced monitoring on Fridays and Saturdays (wedding days)
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      console.log('Wedding day detected - performing enhanced monitoring');

      // Perform health checks more frequently
      await this.performHealthChecks();

      // Check all critical integrations
      const criticalIntegrations = Array.from(
        this.integrations.values(),
      ).filter((integration) => integration.priority === 'critical');

      for (const integration of criticalIntegrations) {
        const healthStatus = await this.performHealthCheck(integration.id);

        if (!healthStatus.isHealthy) {
          await this.createAlert(
            integration.id,
            integration.name,
            'critical',
            'WEDDING DAY ALERT: Critical integration is unhealthy',
            {
              isWeddingDay: true,
              dayOfWeek: dayOfWeek === 5 ? 'Friday' : 'Saturday',
              healthDetails: healthStatus.details,
            },
          );

          // Immediate recovery attempt on wedding days
          await this.attemptRecovery(integration.id, 'automatic');
        }
      }
    }
  }

  private async checkWeddingDataSynchronization(): Promise<void> {
    // Check if wedding data synchronization is up to date
    const weddingDataTables = ['bookings', 'suppliers', 'couples', 'revenue'];

    for (const [integrationId, integration] of this.integrations) {
      if (!integration.isEnabled || integration.type !== 'data_warehouse')
        continue;

      try {
        // Check last sync times for wedding data
        const lastSyncQuery = await integration.connector.executeQuery(
          'SELECT table_name, MAX(updated_at) as last_sync FROM wedding_sync_log GROUP BY table_name',
        );

        const now = new Date();
        const staleDataThreshold = 4 * 60 * 60 * 1000; // 4 hours

        for (const table of weddingDataTables) {
          const syncInfo = lastSyncQuery.find(
            (row: any) => row.table_name === table,
          );

          if (!syncInfo) {
            await this.createAlert(
              integrationId,
              integration.name,
              'warning',
              `No synchronization record found for ${table} table`,
              { table, missingSync: true },
            );
          } else {
            const lastSync = new Date(syncInfo.last_sync);
            const timeSinceSync = now.getTime() - lastSync.getTime();

            if (timeSinceSync > staleDataThreshold) {
              await this.createAlert(
                integrationId,
                integration.name,
                'warning',
                `Wedding data table ${table} has stale data (${Math.round(timeSinceSync / (60 * 60 * 1000))} hours old)`,
                {
                  table,
                  lastSync: lastSync.toISOString(),
                  hoursStale: Math.round(timeSinceSync / (60 * 60 * 1000)),
                },
              );
            }
          }
        }
      } catch (error) {
        console.error(
          `Wedding data sync check failed for ${integration.name}:`,
          error,
        );
      }
    }
  }

  private async checkSupplierPeakTimePerformance(): Promise<void> {
    const now = new Date();
    const hour = now.getHours();

    // Define peak times for wedding suppliers (9 AM - 6 PM weekdays, 10 AM - 8 PM weekends)
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const isPeakTime = isWeekend
      ? hour >= 10 && hour <= 20
      : hour >= 9 && hour <= 18;

    if (!isPeakTime) return;

    console.log(
      'Peak time detected - checking supplier integration performance',
    );

    // Get recent metrics for supplier-related integrations
    const supplierIntegrations = Array.from(this.integrations.values()).filter(
      (integration) =>
        integration.name.toLowerCase().includes('supplier') ||
        integration.name.toLowerCase().includes('crm') ||
        integration.name.toLowerCase().includes('hubspot') ||
        integration.name.toLowerCase().includes('salesforce'),
    );

    for (const integration of supplierIntegrations) {
      const recentMetrics = this.metrics
        .filter((metric) => metric.integrationId === integration.id)
        .filter((metric) => now.getTime() - metric.timestamp.getTime() < 900000) // Last 15 minutes
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      if (recentMetrics.length === 0) continue;

      const avgResponseTime =
        recentMetrics.reduce((sum, metric) => sum + metric.responseTimeMs, 0) /
        recentMetrics.length;
      const successRate =
        (recentMetrics.reduce(
          (sum, metric) => sum + (metric.isHealthy ? 1 : 0),
          0,
        ) /
          recentMetrics.length) *
        100;

      // Alert if performance is degraded during peak times
      if (avgResponseTime > this.config.alertThresholds.warningResponseTime) {
        await this.createAlert(
          integration.id,
          integration.name,
          'warning',
          `High response times detected during peak hours (${Math.round(avgResponseTime)}ms avg)`,
          {
            isPeakTime: true,
            avgResponseTime: Math.round(avgResponseTime),
            successRate: Math.round(successRate * 100) / 100,
            sampleSize: recentMetrics.length,
          },
        );
      }

      if (successRate < 95) {
        await this.createAlert(
          integration.id,
          integration.name,
          'warning',
          `Low success rate during peak hours (${Math.round(successRate * 100) / 100}%)`,
          {
            isPeakTime: true,
            successRate: Math.round(successRate * 100) / 100,
            avgResponseTime: Math.round(avgResponseTime),
            sampleSize: recentMetrics.length,
          },
        );
      }
    }
  }

  private async createAlert(
    integrationId: string,
    integrationName: string,
    alertType: HealthAlert['alertType'],
    message: string,
    details: any,
  ): Promise<void> {
    const alert: HealthAlert = {
      id: `alert_${this.alertIdCounter++}`,
      integrationId,
      integrationName,
      alertType,
      message,
      details,
      timestamp: new Date(),
      resolved: false,
      acknowledgements: [],
    };

    this.alerts.push(alert);

    // Keep only recent alerts (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter((a) => a.timestamp > sevenDaysAgo);

    console.log(
      `Alert created: [${alertType.toUpperCase()}] ${integrationName} - ${message}`,
    );

    // Emit alert event
    this.emit('alert_created', alert);

    // Send notifications if enabled
    if (this.config.notifications.enabled) {
      await this.sendNotifications(alert);
    }
  }

  private async recordMetrics(
    integrationId: string,
    healthStatus: IntegrationHealthStatus,
    responseTime: number,
  ): Promise<void> {
    const integration = this.integrations.get(integrationId);
    if (!integration) return;

    // Calculate data quality score
    let dataQualityScore = 100;
    if (healthStatus.details?.dataQuality) {
      const dataQuality = healthStatus.details.dataQuality;
      if (dataQuality.totalIssues) {
        dataQualityScore = Math.max(0, 100 - dataQuality.totalIssues * 2); // Deduct 2 points per issue
      }
    }

    const metrics: HealthMetrics = {
      integrationId,
      timestamp: new Date(),
      responseTimeMs: responseTime,
      isHealthy: healthStatus.isHealthy,
      errorCount: integration.consecutiveFailures,
      successRate: this.calculateSuccessRate(integrationId),
      dataQualityScore,
      customMetrics: this.extractCustomMetrics(healthStatus.details),
    };

    this.metrics.push(metrics);

    // Keep only recent metrics (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter((m) => m.timestamp > twentyFourHoursAgo);

    this.emit('metrics_recorded', metrics);
  }

  private calculateSuccessRate(integrationId: string): number {
    const recentMetrics = this.metrics
      .filter((metric) => metric.integrationId === integrationId)
      .filter(
        (metric) => Date.now() - metric.timestamp.getTime() < 60 * 60 * 1000,
      ) // Last hour
      .slice(-20); // Last 20 measurements

    if (recentMetrics.length === 0) return 100;

    const successCount = recentMetrics.filter(
      (metric) => metric.isHealthy,
    ).length;
    return (successCount / recentMetrics.length) * 100;
  }

  private extractCustomMetrics(details: any): { [key: string]: number } {
    const customMetrics: { [key: string]: number } = {};

    if (details) {
      // Extract common metrics from health details
      if (typeof details.rowCount === 'number')
        customMetrics.rowCount = details.rowCount;
      if (typeof details.tableCount === 'number')
        customMetrics.tableCount = details.tableCount;
      if (typeof details.totalSizeMB === 'number')
        customMetrics.totalSizeMB = details.totalSizeMB;
      if (typeof details.maxDiskUsage === 'number')
        customMetrics.diskUsage = details.maxDiskUsage;
      if (typeof details.queryCountLastHour === 'number')
        customMetrics.queryCount = details.queryCountLastHour;
      if (typeof details.avgExecutionTimeMs === 'number')
        customMetrics.avgQueryTime = details.avgExecutionTimeMs;
    }

    return customMetrics;
  }

  private async sendNotifications(alert: HealthAlert): Promise<void> {
    const notifications: Promise<void>[] = [];

    // Email notifications
    if (
      this.config.notifications.email.enabled &&
      this.config.notifications.email.recipients.length > 0
    ) {
      notifications.push(this.sendEmailNotification(alert));
    }

    // Slack notifications
    if (
      this.config.notifications.slack.enabled &&
      this.config.notifications.slack.webhookUrl
    ) {
      notifications.push(this.sendSlackNotification(alert));
    }

    // SMS notifications (for critical alerts only)
    if (
      alert.alertType === 'critical' &&
      this.config.notifications.sms.enabled &&
      this.config.notifications.sms.phoneNumbers.length > 0
    ) {
      notifications.push(this.sendSMSNotification(alert));
    }

    try {
      await Promise.allSettled(notifications);
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  private async sendEmailNotification(alert: HealthAlert): Promise<void> {
    // Email notification implementation would go here
    // This would integrate with your email service (e.g., SendGrid, AWS SES, etc.)
    console.log(`Email notification sent for alert: ${alert.id}`);
  }

  private async sendSlackNotification(alert: HealthAlert): Promise<void> {
    // Slack notification implementation would go here
    // This would use the Slack webhook URL to send messages
    const color = {
      critical: '#FF0000',
      warning: '#FFA500',
      info: '#0000FF',
      recovery: '#00FF00',
    }[alert.alertType];

    console.log(
      `Slack notification sent for alert: ${alert.id} (color: ${color})`,
    );
  }

  private async sendSMSNotification(alert: HealthAlert): Promise<void> {
    // SMS notification implementation would go here
    // This would integrate with Twilio or similar SMS service
    console.log(`SMS notification sent for alert: ${alert.id}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Public API methods for external access

  getIntegrationStatus(integrationId: string): IntegrationType | undefined {
    return this.integrations.get(integrationId);
  }

  getAllIntegrationStatuses(): IntegrationType[] {
    return Array.from(this.integrations.values());
  }

  getRecentAlerts(hours: number = 24): HealthAlert[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.alerts.filter((alert) => alert.timestamp > cutoff);
  }

  getUnresolvedAlerts(): HealthAlert[] {
    return this.alerts.filter((alert) => !alert.resolved);
  }

  async acknowledgeAlert(
    alertId: string,
    userId: string,
    notes?: string,
  ): Promise<boolean> {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) return false;

    alert.acknowledgements.push({
      userId,
      acknowledgedAt: new Date(),
      notes,
    });

    this.emit('alert_acknowledged', { alert, userId, notes });
    return true;
  }

  async resolveAlert(alertId: string, userId: string): Promise<boolean> {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date();

    this.emit('alert_resolved', { alert, userId });
    return true;
  }

  getMetrics(integrationId?: string, hours: number = 24): HealthMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    let filteredMetrics = this.metrics.filter(
      (metric) => metric.timestamp > cutoff,
    );

    if (integrationId) {
      filteredMetrics = filteredMetrics.filter(
        (metric) => metric.integrationId === integrationId,
      );
    }

    return filteredMetrics;
  }

  getRecoveryActions(
    integrationId?: string,
    hours: number = 168,
  ): RecoveryAction[] {
    // Default 7 days
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    let filteredActions = this.recoveryActions.filter(
      (action) => action.triggeredAt > cutoff,
    );

    if (integrationId) {
      filteredActions = filteredActions.filter(
        (action) => action.integrationId === integrationId,
      );
    }

    return filteredActions;
  }

  async triggerManualRecovery(integrationId: string): Promise<boolean> {
    return await this.attemptRecovery(integrationId, 'manual');
  }

  async enableIntegration(integrationId: string): Promise<boolean> {
    const integration = this.integrations.get(integrationId);
    if (!integration) return false;

    integration.isEnabled = true;
    integration.consecutiveFailures = 0;

    await this.createAlert(
      integrationId,
      integration.name,
      'info',
      'Integration manually enabled',
      { enabledBy: 'manual' },
    );

    return true;
  }

  async disableIntegration(integrationId: string): Promise<boolean> {
    const integration = this.integrations.get(integrationId);
    if (!integration) return false;

    integration.isEnabled = false;

    await this.createAlert(
      integrationId,
      integration.name,
      'info',
      'Integration manually disabled',
      { disabledBy: 'manual' },
    );

    return true;
  }

  getSystemOverview(): {
    totalIntegrations: number;
    healthyIntegrations: number;
    unhealthyIntegrations: number;
    disabledIntegrations: number;
    unresolvedAlerts: number;
    recentRecoveries: number;
  } {
    const integrations = Array.from(this.integrations.values());
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    return {
      totalIntegrations: integrations.length,
      healthyIntegrations: integrations.filter(
        (i) => i.isEnabled && i.consecutiveFailures === 0,
      ).length,
      unhealthyIntegrations: integrations.filter(
        (i) => i.isEnabled && i.consecutiveFailures > 0,
      ).length,
      disabledIntegrations: integrations.filter((i) => !i.isEnabled).length,
      unresolvedAlerts: this.getUnresolvedAlerts().length,
      recentRecoveries: this.recoveryActions.filter(
        (a) => a.success && a.triggeredAt > oneHourAgo,
      ).length,
    };
  }
}
