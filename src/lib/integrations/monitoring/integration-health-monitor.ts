/**
 * WS-342 Real-Time Wedding Collaboration - Integration Health Monitor
 * Team C: Integration & System Architecture
 */

import { createSupabaseClient } from '@/lib/supabase';
import { vendorIntegrationManager } from '../vendor-integration-manager';

export interface IntegrationHealthStatus {
  systemId: string;
  systemType: string;
  healthScore: number; // 0-100
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  metrics: IntegrationMetrics;
  issues: HealthIssue[];
  lastChecked: Date;
}

export interface IntegrationMetrics {
  uptime: number; // percentage
  averageLatency: number; // milliseconds
  successRate: number; // percentage
  errorCount: number;
  totalRequests: number;
  lastSyncTime: Date | null;
}

export interface HealthIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  detectedAt: Date;
  resolved: boolean;
}

export class IntegrationHealthMonitor {
  private supabase = createSupabaseClient();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertThresholds = {
    uptimeWarning: 95,
    uptimeCritical: 90,
    latencyWarning: 2000, // 2 seconds
    latencyCritical: 5000, // 5 seconds
    successRateWarning: 95,
    successRateCritical: 90,
  };

  constructor() {
    this.startMonitoring();
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(): void {
    // Run health check every 5 minutes
    this.monitoringInterval = setInterval(
      () => {
        this.performHealthCheck();
      },
      5 * 60 * 1000,
    );

    // Initial health check
    this.performHealthCheck();
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Perform comprehensive health check on all integrations
   */
  async performHealthCheck(): Promise<IntegrationHealthStatus[]> {
    console.log('🏥 Starting integration health check...');

    try {
      // Get all active integrations
      const { data: integrations } = await this.supabase
        .from('vendor_integrations')
        .select('*')
        .eq('status', 'active');

      if (!integrations?.length) {
        console.log('ℹ️ No active integrations to monitor');
        return [];
      }

      const healthStatuses: IntegrationHealthStatus[] = [];

      // Check health of each integration
      for (const integration of integrations) {
        try {
          const healthStatus = await this.checkIntegrationHealth(integration);
          healthStatuses.push(healthStatus);

          // Store health status in database
          await this.storeHealthStatus(healthStatus);

          // Check for alerts
          await this.checkForAlerts(healthStatus);
        } catch (error) {
          console.error(
            `❌ Failed to check health for ${integration.id}:`,
            error,
          );
        }
      }

      console.log(
        `✅ Health check completed for ${healthStatuses.length} integrations`,
      );
      return healthStatuses;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return [];
    }
  }

  /**
   * Check health of a specific integration
   */
  async checkIntegrationHealth(
    integration: any,
  ): Promise<IntegrationHealthStatus> {
    const systemId = integration.id;
    const systemType = integration.system_type;

    // Get integration metrics
    const metrics = await this.calculateIntegrationMetrics(systemId);

    // Calculate health score
    const healthScore = this.calculateHealthScore(metrics);

    // Determine status
    const status = this.determineHealthStatus(healthScore, metrics);

    // Identify issues
    const issues = await this.identifyHealthIssues(systemId, metrics);

    return {
      systemId,
      systemType,
      healthScore,
      status,
      metrics,
      issues,
      lastChecked: new Date(),
    };
  }

  /**
   * Calculate integration metrics from historical data
   */
  private async calculateIntegrationMetrics(
    systemId: string,
  ): Promise<IntegrationMetrics> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get sync log data for last 24 hours
    const { data: syncLogs } = await this.supabase
      .from('integration_sync_log')
      .select('*')
      .eq('systems_synced', [systemId])
      .gte('synced_at', twentyFourHoursAgo.toISOString());

    // Get webhook log data for last 24 hours
    const { data: webhookLogs } = await this.supabase
      .from('webhook_log')
      .select('*')
      .eq('source_system', systemId)
      .gte('received_at', twentyFourHoursAgo.toISOString());

    const totalSyncs = syncLogs?.length || 0;
    const successfulSyncs = syncLogs?.filter((log) => log.success).length || 0;
    const totalWebhooks = webhookLogs?.length || 0;
    const successfulWebhooks =
      webhookLogs?.filter((log) => log.success).length || 0;

    const totalRequests = totalSyncs + totalWebhooks;
    const successfulRequests = successfulSyncs + successfulWebhooks;

    // Calculate metrics
    const uptime =
      totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;
    const successRate =
      totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;

    // Calculate average latency from sync logs
    const syncDurations =
      syncLogs?.map((log) => log.duration_ms).filter(Boolean) || [];
    const webhookDurations =
      webhookLogs?.map((log) => log.processing_duration_ms).filter(Boolean) ||
      [];
    const allDurations = [...syncDurations, ...webhookDurations];
    const averageLatency =
      allDurations.length > 0
        ? allDurations.reduce((sum, duration) => sum + duration, 0) /
          allDurations.length
        : 0;

    // Get last sync time
    const lastSyncTime =
      syncLogs && syncLogs.length > 0
        ? new Date(
            Math.max(
              ...syncLogs.map((log) => new Date(log.synced_at).getTime()),
            ),
          )
        : null;

    // Count errors
    const errorCount = totalRequests - successfulRequests;

    return {
      uptime,
      averageLatency,
      successRate,
      errorCount,
      totalRequests,
      lastSyncTime,
    };
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(metrics: IntegrationMetrics): number {
    // Weighted scoring system
    const weights = {
      uptime: 0.4,
      latency: 0.3,
      successRate: 0.3,
    };

    // Uptime score (0-100)
    const uptimeScore = Math.max(0, Math.min(100, metrics.uptime));

    // Latency score (100 for <1s, decreasing to 0 for >10s)
    const latencyScore = Math.max(
      0,
      Math.min(100, 100 - (metrics.averageLatency - 1000) * 0.01),
    );

    // Success rate score
    const successScore = Math.max(0, Math.min(100, metrics.successRate));

    // Calculate weighted score
    const totalScore =
      uptimeScore * weights.uptime +
      latencyScore * weights.latency +
      successScore * weights.successRate;

    return Math.round(totalScore);
  }

  /**
   * Determine health status from score and metrics
   */
  private determineHealthStatus(
    healthScore: number,
    metrics: IntegrationMetrics,
  ): 'healthy' | 'warning' | 'critical' | 'offline' {
    // Check if system is offline
    if (metrics.totalRequests === 0 || metrics.uptime === 0) {
      return 'offline';
    }

    // Check critical thresholds
    if (
      healthScore < 50 ||
      metrics.uptime < this.alertThresholds.uptimeCritical ||
      metrics.successRate < this.alertThresholds.successRateCritical ||
      metrics.averageLatency > this.alertThresholds.latencyCritical
    ) {
      return 'critical';
    }

    // Check warning thresholds
    if (
      healthScore < 75 ||
      metrics.uptime < this.alertThresholds.uptimeWarning ||
      metrics.successRate < this.alertThresholds.successRateWarning ||
      metrics.averageLatency > this.alertThresholds.latencyWarning
    ) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Identify specific health issues
   */
  private async identifyHealthIssues(
    systemId: string,
    metrics: IntegrationMetrics,
  ): Promise<HealthIssue[]> {
    const issues: HealthIssue[] = [];
    const now = new Date();

    // Check uptime issues
    if (metrics.uptime < this.alertThresholds.uptimeCritical) {
      issues.push({
        severity: 'critical',
        type: 'uptime',
        message: `Uptime is critically low: ${metrics.uptime.toFixed(1)}%`,
        detectedAt: now,
        resolved: false,
      });
    } else if (metrics.uptime < this.alertThresholds.uptimeWarning) {
      issues.push({
        severity: 'medium',
        type: 'uptime',
        message: `Uptime is below threshold: ${metrics.uptime.toFixed(1)}%`,
        detectedAt: now,
        resolved: false,
      });
    }

    // Check latency issues
    if (metrics.averageLatency > this.alertThresholds.latencyCritical) {
      issues.push({
        severity: 'critical',
        type: 'latency',
        message: `Average latency is critically high: ${metrics.averageLatency}ms`,
        detectedAt: now,
        resolved: false,
      });
    } else if (metrics.averageLatency > this.alertThresholds.latencyWarning) {
      issues.push({
        severity: 'medium',
        type: 'latency',
        message: `Average latency is high: ${metrics.averageLatency}ms`,
        detectedAt: now,
        resolved: false,
      });
    }

    // Check success rate issues
    if (metrics.successRate < this.alertThresholds.successRateCritical) {
      issues.push({
        severity: 'critical',
        type: 'success_rate',
        message: `Success rate is critically low: ${metrics.successRate.toFixed(1)}%`,
        detectedAt: now,
        resolved: false,
      });
    } else if (metrics.successRate < this.alertThresholds.successRateWarning) {
      issues.push({
        severity: 'medium',
        type: 'success_rate',
        message: `Success rate is below threshold: ${metrics.successRate.toFixed(1)}%`,
        detectedAt: now,
        resolved: false,
      });
    }

    // Check if last sync was too long ago (more than 1 hour)
    if (metrics.lastSyncTime) {
      const hoursSinceLastSync =
        (now.getTime() - metrics.lastSyncTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastSync > 1) {
        issues.push({
          severity: 'medium',
          type: 'sync_delay',
          message: `Last sync was ${hoursSinceLastSync.toFixed(1)} hours ago`,
          detectedAt: now,
          resolved: false,
        });
      }
    } else {
      issues.push({
        severity: 'high',
        type: 'no_sync',
        message: 'No successful syncs recorded',
        detectedAt: now,
        resolved: false,
      });
    }

    // Check error rate
    if (metrics.errorCount > 10) {
      issues.push({
        severity: 'high',
        type: 'error_rate',
        message: `High error count: ${metrics.errorCount} errors in last 24 hours`,
        detectedAt: now,
        resolved: false,
      });
    }

    return issues;
  }

  /**
   * Store health status in database
   */
  private async storeHealthStatus(
    healthStatus: IntegrationHealthStatus,
  ): Promise<void> {
    try {
      await this.supabase.from('integration_health_status').upsert(
        {
          system_id: healthStatus.systemId,
          system_type: healthStatus.systemType,
          health_score: healthStatus.healthScore,
          status: healthStatus.status,
          metrics: healthStatus.metrics,
          issues: healthStatus.issues,
          checked_at: healthStatus.lastChecked,
        },
        { onConflict: 'system_id' },
      );
    } catch (error) {
      console.error('Failed to store health status:', error);
    }
  }

  /**
   * Check for alerts and send notifications
   */
  private async checkForAlerts(
    healthStatus: IntegrationHealthStatus,
  ): Promise<void> {
    // Only alert on critical or warning status
    if (!['critical', 'warning'].includes(healthStatus.status)) {
      return;
    }

    const criticalIssues = healthStatus.issues.filter(
      (issue) => issue.severity === 'critical' || issue.severity === 'high',
    );

    if (criticalIssues.length > 0) {
      await this.sendHealthAlert(healthStatus, criticalIssues);
    }
  }

  /**
   * Send health alert notification
   */
  private async sendHealthAlert(
    healthStatus: IntegrationHealthStatus,
    issues: HealthIssue[],
  ): Promise<void> {
    try {
      // Store alert in database
      await this.supabase.from('integration_alerts').insert({
        system_id: healthStatus.systemId,
        system_type: healthStatus.systemType,
        alert_type: 'health_check',
        severity: healthStatus.status === 'critical' ? 'critical' : 'warning',
        message: `Integration health issues detected for ${healthStatus.systemType}`,
        details: {
          healthScore: healthStatus.healthScore,
          issues: issues,
        },
        created_at: new Date(),
      });

      // TODO: Send actual notifications (email, Slack, etc.)
      console.warn(
        `🚨 Health Alert: ${healthStatus.systemId} (${healthStatus.systemType}) - Status: ${healthStatus.status}`,
      );
      issues.forEach((issue) => {
        console.warn(`  - ${issue.severity.toUpperCase()}: ${issue.message}`);
      });
    } catch (error) {
      console.error('Failed to send health alert:', error);
    }
  }

  /**
   * Get current health status for all integrations
   */
  async getCurrentHealthStatus(): Promise<IntegrationHealthStatus[]> {
    const { data: healthStatuses } = await this.supabase
      .from('integration_health_status')
      .select('*')
      .order('checked_at', { ascending: false });

    return (
      healthStatuses?.map((status) => ({
        systemId: status.system_id,
        systemType: status.system_type,
        healthScore: status.health_score,
        status: status.status,
        metrics: status.metrics,
        issues: status.issues,
        lastChecked: new Date(status.checked_at),
      })) || []
    );
  }

  /**
   * Get health status for a specific integration
   */
  async getIntegrationHealth(
    systemId: string,
  ): Promise<IntegrationHealthStatus | null> {
    const { data: healthStatus } = await this.supabase
      .from('integration_health_status')
      .select('*')
      .eq('system_id', systemId)
      .single();

    if (!healthStatus) return null;

    return {
      systemId: healthStatus.system_id,
      systemType: healthStatus.system_type,
      healthScore: healthStatus.health_score,
      status: healthStatus.status,
      metrics: healthStatus.metrics,
      issues: healthStatus.issues,
      lastChecked: new Date(healthStatus.checked_at),
    };
  }
}

// Singleton instance
export const integrationHealthMonitor = new IntegrationHealthMonitor();
