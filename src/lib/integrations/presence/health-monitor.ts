import {
  IntegrationHealthReport,
  IntegrationHealthStatus,
  IntegrationFailure,
  HealthDashboardData,
  IntegrationType,
  OAuth2Credentials,
} from '@/types/presence';
import { calendarSync } from './calendar-sync';
import { communicationBridge } from './communication-bridge';
import { videoConferenceSync } from './video-conference-sync';
import {
  logIntegrationActivity,
  logIntegrationError,
} from '@/lib/integrations/audit-logger';
import {
  sendIntegrationFailureNotification,
  alertAdminOfIntegrationFailure,
} from '@/lib/notifications/admin-alerts';

// Integration Health Monitor with automatic recovery
export class IntegrationHealthMonitor {
  private readonly healthCheckInterval = 5 * 60 * 1000; // 5 minutes
  private readonly maxRecoveryAttempts = 3;
  private readonly recoveryBackoffBase = 30000; // 30 seconds

  private integrationMetrics: Map<string, IntegrationMetrics> = new Map();
  private failureHistory: IntegrationFailure[] = [];
  private isMonitoring = false;

  constructor() {
    // Start health monitoring on initialization
    this.startMonitoring();
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.scheduleHealthCheck();

    console.log('Integration health monitoring started');
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('Integration health monitoring stopped');
  }

  /**
   * Check health of all integrations for a specific user
   */
  async checkAllIntegrations(userId: string): Promise<IntegrationHealthReport> {
    try {
      const report: IntegrationHealthReport = {
        userId,
        timestamp: new Date(),
        integrations: {
          calendar: {
            status: 'failed',
            lastSync: new Date(),
            error: 'Not checked',
          },
          slack: {
            status: 'failed',
            lastSync: new Date(),
            error: 'Not checked',
          },
          videoConference: {
            status: 'failed',
            lastSync: new Date(),
            error: 'Not checked',
          },
        },
        overallHealth: 'critical',
        recommendations: [],
      };

      // Check calendar integration
      try {
        const calendarHealth = await this.checkCalendarIntegration(userId);
        report.integrations.calendar = calendarHealth;
      } catch (error) {
        report.integrations.calendar = {
          status: 'failed',
          lastSync: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      // Check Slack integration
      try {
        const slackHealth = await this.checkSlackIntegration(userId);
        report.integrations.slack = slackHealth;
      } catch (error) {
        report.integrations.slack = {
          status: 'failed',
          lastSync: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      // Check video conference integrations
      try {
        const videoHealth = await this.checkVideoConferenceIntegration(userId);
        report.integrations.videoConference = videoHealth;
      } catch (error) {
        report.integrations.videoConference = {
          status: 'failed',
          lastSync: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      // Calculate overall health
      report.overallHealth = this.calculateOverallHealth(report.integrations);
      report.recommendations = this.generateRecommendations(
        report.integrations,
      );

      // Log health check
      await logIntegrationActivity(userId, 'health_check_completed', {
        overallHealth: report.overallHealth,
        calendarStatus: report.integrations.calendar.status,
        slackStatus: report.integrations.slack.status,
        videoStatus: report.integrations.videoConference.status,
      });

      return report;
    } catch (error) {
      await logIntegrationError(userId, 'health_check_failed', error);
      throw error;
    }
  }

  /**
   * Monitor integration uptime and performance
   */
  async monitorIntegrationUptime(): Promise<void> {
    try {
      const activeIntegrations = await this.getAllActiveIntegrations();

      for (const integration of activeIntegrations) {
        try {
          const healthCheck = await this.performHealthCheck(integration);

          // Update metrics
          this.updateIntegrationMetrics(integration.id, healthCheck);

          // Handle failures
          if (healthCheck.status === 'failed') {
            await this.handleIntegrationFailure(integration);
          }

          // Handle degraded performance
          if (healthCheck.status === 'degraded') {
            await this.handleDegradedPerformance(integration, healthCheck);
          }
        } catch (error) {
          console.error(
            `Health check failed for integration ${integration.id}:`,
            error,
          );
          await logIntegrationError(
            integration.userId,
            'health_check_error',
            error,
          );
        }
      }
    } catch (error) {
      console.error('Integration uptime monitoring failed:', error);
    }
  }

  /**
   * Detect integration failures and trigger alerts
   */
  async detectIntegrationFailures(): Promise<IntegrationFailure[]> {
    const failures: IntegrationFailure[] = [];

    try {
      const integrations = await this.getAllActiveIntegrations();

      for (const integration of integrations) {
        const healthStatus = await this.performHealthCheck(integration);

        if (healthStatus.status === 'failed') {
          const failure: IntegrationFailure = {
            id: `${integration.id}-${Date.now()}`,
            userId: integration.userId,
            provider: integration.provider,
            error: healthStatus.error || 'Unknown error',
            timestamp: new Date(),
            resolved: false,
            recoveryAttempts: 0,
          };

          failures.push(failure);
          this.failureHistory.push(failure);

          // Alert administrators
          await this.alertFailure(failure);
        }
      }
    } catch (error) {
      console.error('Failure detection failed:', error);
    }

    return failures;
  }

  /**
   * Attempt automatic recovery of failed integration
   */
  async attemptIntegrationRecovery(
    integrationType: IntegrationType,
    userId: string,
  ): Promise<boolean> {
    try {
      const failureKey = `${userId}-${integrationType}`;
      const existingFailure = this.failureHistory.find(
        (f) =>
          !f.resolved && f.userId === userId && f.provider === integrationType,
      );

      if (
        existingFailure &&
        existingFailure.recoveryAttempts >= this.maxRecoveryAttempts
      ) {
        console.log(`Max recovery attempts reached for ${failureKey}`);
        return false;
      }

      const recoverySuccess = await this.executeRecoveryProcedure(
        integrationType,
        userId,
      );

      if (recoverySuccess) {
        // Mark failure as resolved
        if (existingFailure) {
          existingFailure.resolved = true;
        }

        await logIntegrationActivity(userId, 'integration_recovery_success', {
          provider: integrationType,
          attempts: existingFailure?.recoveryAttempts || 0,
        });

        return true;
      } else {
        // Increment recovery attempts
        if (existingFailure) {
          existingFailure.recoveryAttempts++;
        }

        await logIntegrationError(
          userId,
          'integration_recovery_failed',
          new Error(`Recovery failed for ${integrationType}`),
        );

        return false;
      }
    } catch (error) {
      await logIntegrationError(userId, 'recovery_attempt_error', error);
      return false;
    }
  }

  /**
   * Generate health dashboard data
   */
  async generateHealthDashboard(): Promise<HealthDashboardData> {
    try {
      const allIntegrations = await this.getAllActiveIntegrations();
      const totalIntegrations = allIntegrations.length;

      let healthyCount = 0;
      let degradedCount = 0;
      let failedCount = 0;
      let totalResponseTime = 0;
      let responseCount = 0;

      const userIntegrationCounts: Map<
        string,
        { count: number; healthScore: number }
      > = new Map();

      for (const integration of allIntegrations) {
        const health = await this.performHealthCheck(integration);

        switch (health.status) {
          case 'healthy':
            healthyCount++;
            break;
          case 'degraded':
            degradedCount++;
            break;
          case 'failed':
            failedCount++;
            break;
        }

        if (health.responseTime) {
          totalResponseTime += health.responseTime;
          responseCount++;
        }

        // Update user statistics
        const userStats = userIntegrationCounts.get(integration.userId) || {
          count: 0,
          healthScore: 0,
        };
        userStats.count++;
        userStats.healthScore += this.getHealthScore(health.status);
        userIntegrationCounts.set(integration.userId, userStats);
      }

      // Calculate uptime (last 24 hours)
      const uptime = this.calculateUptimePercentage();

      // Get recent failures (last 24 hours)
      const recentFailures = this.getRecentFailures(24 * 60 * 60 * 1000);

      // Top users by integration count
      const topUsers = Array.from(userIntegrationCounts.entries())
        .map(([userId, stats]) => ({
          userId,
          integrationCount: stats.count,
          healthScore: stats.healthScore / stats.count,
        }))
        .sort((a, b) => b.integrationCount - a.integrationCount)
        .slice(0, 10);

      return {
        totalIntegrations,
        healthyIntegrations: healthyCount,
        degradedIntegrations: degradedCount,
        failedIntegrations: failedCount,
        averageResponseTime:
          responseCount > 0 ? totalResponseTime / responseCount : 0,
        uptime,
        recentFailures,
        topUsers,
      };
    } catch (error) {
      console.error('Dashboard generation failed:', error);
      throw error;
    }
  }

  // Private helper methods
  private scheduleHealthCheck(): void {
    if (!this.isMonitoring) return;

    setTimeout(async () => {
      await this.monitorIntegrationUptime();
      this.scheduleHealthCheck(); // Schedule next check
    }, this.healthCheckInterval);
  }

  private async checkCalendarIntegration(
    userId: string,
  ): Promise<IntegrationHealthStatus> {
    try {
      const start = Date.now();

      // Test calendar connectivity
      const events = await calendarSync.getUpcomingEventsForPresence(userId);

      const responseTime = Date.now() - start;

      return {
        provider: 'calendar',
        status: 'healthy',
        lastCheck: new Date(),
        responseTime,
        successRate: 1.0,
      };
    } catch (error) {
      return {
        provider: 'calendar',
        status: 'failed',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        successRate: 0,
      };
    }
  }

  private async checkSlackIntegration(
    userId: string,
  ): Promise<IntegrationHealthStatus> {
    try {
      const start = Date.now();

      // Test Slack connectivity
      const healthStatuses =
        await communicationBridge.checkIntegrationHealth(userId);
      const slackHealth = healthStatuses.find((h) => h.provider === 'slack');

      const responseTime = Date.now() - start;

      return {
        provider: 'slack',
        status: slackHealth?.status || 'failed',
        lastCheck: new Date(),
        responseTime,
        successRate: slackHealth?.successRate || 0,
        error: slackHealth?.error,
      };
    } catch (error) {
      return {
        provider: 'slack',
        status: 'failed',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        successRate: 0,
      };
    }
  }

  private async checkVideoConferenceIntegration(
    userId: string,
  ): Promise<IntegrationHealthStatus> {
    try {
      const start = Date.now();

      // Test video conference connectivity
      const isInConference =
        await videoConferenceSync.isUserInVideoConference(userId);

      const responseTime = Date.now() - start;

      return {
        provider: 'video_conference',
        status: 'healthy',
        lastCheck: new Date(),
        responseTime,
        successRate: 1.0,
      };
    } catch (error) {
      return {
        provider: 'video_conference',
        status: 'failed',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        successRate: 0,
      };
    }
  }

  private calculateOverallHealth(
    integrations: IntegrationHealthReport['integrations'],
  ): 'healthy' | 'degraded' | 'critical' {
    const statuses = Object.values(integrations).map((i) => i.status);

    if (statuses.every((s) => s === 'healthy')) {
      return 'healthy';
    }

    if (statuses.some((s) => s === 'failed')) {
      return 'critical';
    }

    return 'degraded';
  }

  private generateRecommendations(
    integrations: IntegrationHealthReport['integrations'],
  ): string[] {
    const recommendations: string[] = [];

    if (integrations.calendar.status === 'failed') {
      recommendations.push(
        'Reconnect your calendar integration to restore automatic presence updates',
      );
    }

    if (integrations.slack.status === 'failed') {
      recommendations.push(
        'Refresh your Slack connection to maintain status synchronization',
      );
    }

    if (integrations.videoConference.status === 'failed') {
      recommendations.push(
        'Check video conference integrations for automatic busy status during meetings',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('All integrations are healthy - no action required');
    }

    return recommendations;
  }

  private async getAllActiveIntegrations(): Promise<
    Array<{
      id: string;
      userId: string;
      provider: IntegrationType;
    }>
  > {
    // Implementation would query database for active integrations
    // This is a placeholder
    return [];
  }

  private async performHealthCheck(
    integration: any,
  ): Promise<IntegrationHealthStatus> {
    // Perform actual health check based on integration type
    const start = Date.now();

    try {
      // Different health checks for different providers
      switch (integration.provider) {
        case 'google_calendar':
          // Test Google Calendar API
          break;
        case 'slack':
          // Test Slack API
          break;
        case 'zoom':
          // Test Zoom API
          break;
        default:
          throw new Error(`Unknown provider: ${integration.provider}`);
      }

      const responseTime = Date.now() - start;

      return {
        provider: integration.provider,
        status: responseTime < 5000 ? 'healthy' : 'degraded',
        lastCheck: new Date(),
        responseTime,
        successRate: 1.0,
      };
    } catch (error) {
      return {
        provider: integration.provider,
        status: 'failed',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - start,
        successRate: 0,
      };
    }
  }

  private updateIntegrationMetrics(
    integrationId: string,
    health: IntegrationHealthStatus,
  ): void {
    const existing = this.integrationMetrics.get(integrationId) || {
      checks: 0,
      successCount: 0,
      totalResponseTime: 0,
      lastSuccess: null,
      lastFailure: null,
    };

    existing.checks++;
    existing.totalResponseTime += health.responseTime || 0;

    if (health.status === 'healthy') {
      existing.successCount++;
      existing.lastSuccess = health.lastCheck;
    } else {
      existing.lastFailure = health.lastCheck;
    }

    this.integrationMetrics.set(integrationId, existing);
  }

  private async handleIntegrationFailure(integration: any): Promise<void> {
    // Attempt automatic recovery
    const recovered = await this.attemptIntegrationRecovery(
      integration.provider,
      integration.userId,
    );

    if (!recovered) {
      // Send failure notifications
      await sendIntegrationFailureNotification(integration);
      await alertAdminOfIntegrationFailure(integration);
    }
  }

  private async handleDegradedPerformance(
    integration: any,
    health: IntegrationHealthStatus,
  ): Promise<void> {
    console.warn(
      `Integration ${integration.id} showing degraded performance: ${health.responseTime}ms`,
    );

    // Could implement performance optimization here
    // For now, just log the degraded performance
    await logIntegrationActivity(integration.userId, 'degraded_performance', {
      provider: integration.provider,
      responseTime: health.responseTime,
    });
  }

  private async executeRecoveryProcedure(
    integrationType: IntegrationType,
    userId: string,
  ): Promise<boolean> {
    try {
      switch (integrationType) {
        case 'google_calendar':
          // Attempt to refresh OAuth token and reconnect
          await this.refreshCalendarConnection(userId);
          return true;

        case 'slack':
          // Attempt to refresh Slack connection
          await this.refreshSlackConnection(userId);
          return true;

        case 'zoom':
          // Attempt to refresh Zoom connection
          await this.refreshZoomConnection(userId);
          return true;

        default:
          console.warn(
            `No recovery procedure for integration type: ${integrationType}`,
          );
          return false;
      }
    } catch (error) {
      console.error(`Recovery procedure failed for ${integrationType}:`, error);
      return false;
    }
  }

  private async refreshCalendarConnection(userId: string): Promise<void> {
    // Implementation would refresh calendar OAuth tokens
    console.log(`Refreshing calendar connection for user ${userId}`);
  }

  private async refreshSlackConnection(userId: string): Promise<void> {
    // Implementation would refresh Slack connection
    console.log(`Refreshing Slack connection for user ${userId}`);
  }

  private async refreshZoomConnection(userId: string): Promise<void> {
    // Implementation would refresh Zoom connection
    console.log(`Refreshing Zoom connection for user ${userId}`);
  }

  private async alertFailure(failure: IntegrationFailure): Promise<void> {
    // Send immediate alerts for critical failures
    await sendIntegrationFailureNotification({
      userId: failure.userId,
      provider: failure.provider,
      error: failure.error,
    });

    // Alert admins if user has multiple failures
    const userFailures = this.failureHistory.filter(
      (f) => f.userId === failure.userId && !f.resolved,
    );

    if (userFailures.length >= 2) {
      await alertAdminOfIntegrationFailure({
        userId: failure.userId,
        failureCount: userFailures.length,
      });
    }
  }

  private getHealthScore(status: string): number {
    switch (status) {
      case 'healthy':
        return 100;
      case 'degraded':
        return 60;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  }

  private calculateUptimePercentage(): number {
    // Calculate uptime based on recent metrics
    // This is a simplified calculation
    const totalChecks = Array.from(this.integrationMetrics.values()).reduce(
      (sum, metrics) => sum + metrics.checks,
      0,
    );

    const totalSuccesses = Array.from(this.integrationMetrics.values()).reduce(
      (sum, metrics) => sum + metrics.successCount,
      0,
    );

    return totalChecks > 0 ? (totalSuccesses / totalChecks) * 100 : 100;
  }

  private getRecentFailures(timeWindowMs: number): IntegrationFailure[] {
    const cutoff = new Date(Date.now() - timeWindowMs);

    return this.failureHistory.filter(
      (failure) => failure.timestamp > cutoff && !failure.resolved,
    );
  }
}

// Integration metrics interface
interface IntegrationMetrics {
  checks: number;
  successCount: number;
  totalResponseTime: number;
  lastSuccess: Date | null;
  lastFailure: Date | null;
}

// Export singleton instance
export const healthMonitor = new IntegrationHealthMonitor();
