import {
  IntegrationHealthMonitor,
  IntegrationType,
  HealthAlert,
  HealthMetrics,
} from './integrations/IntegrationHealthMonitor';
import { qrGeneratorService } from './qr-generator';
import { billingIntegrationService } from './billing-integration';
import { referralNotificationService } from './email/referral-notifications';
import { referralRealtimeService } from './realtime/referral-updates';

export interface ReferralIntegrationHealth {
  qrGeneration: {
    healthy: boolean;
    responseTime: number;
    successRate: number;
    qrCodesGenerated24h: number;
    storageUsed: number;
    error?: string;
  };
  billing: {
    healthy: boolean;
    responseTime: number;
    successRate: number;
    rewardsProcessed24h: number;
    totalCreditsIssued: number;
    stripeConnectivity: boolean;
    error?: string;
  };
  emailNotifications: {
    healthy: boolean;
    responseTime: number;
    successRate: number;
    emailsSent24h: number;
    queuedEmails: number;
    resendConnectivity: boolean;
    error?: string;
  };
  realtimeUpdates: {
    healthy: boolean;
    responseTime: number;
    activeChannels: number;
    messagesDelivered24h: number;
    leaderboardUpdates24h: number;
    supabaseRealtimeConnectivity: boolean;
    error?: string;
  };
}

export interface IntegrationHealthReport {
  overall: {
    healthy: boolean;
    score: number; // 0-100
    lastChecked: string;
  };
  services: ReferralIntegrationHealth;
  alerts: HealthAlert[];
  recommendations: string[];
  weddingDayReadiness: {
    ready: boolean;
    criticalIssues: string[];
    warnings: string[];
  };
}

export class ReferralIntegrationHealthService {
  private readonly baseMonitor: IntegrationHealthMonitor;
  private healthMetrics: HealthMetrics[] = [];
  private lastHealthCheck: Date = new Date();

  constructor() {
    // Initialize base monitor with referral-specific configuration
    this.baseMonitor = new IntegrationHealthMonitor({
      checkIntervalMs: 30000, // 30 seconds for referral services
      alertThresholds: {
        criticalResponseTime: 5000, // 5 seconds
        warningResponseTime: 2000, // 2 seconds
        maxConsecutiveFailures: 3,
        dataQualityThreshold: 95,
      },
      notifications: {
        enabled: true,
        email: {
          enabled: true,
          recipients: ['alerts@wedsync.com', 'dev-team@wedsync.com'],
        },
        slack: {
          enabled: true,
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: '#referral-alerts',
        },
        sms: {
          enabled: true,
          phoneNumbers: ['+44-7xxx-xxx-xxx'], // Emergency contact
        },
      },
      recovery: {
        autoRecoveryEnabled: true,
        maxRecoveryAttempts: 3,
        backoffMultiplier: 2,
        initialBackoffMs: 1000,
      },
    });

    this.setupReferralIntegrations();
  }

  private setupReferralIntegrations(): void {
    // Register QR Generation Service
    this.baseMonitor.registerIntegration({
      id: 'qr-generator',
      name: 'QR Code Generator',
      type: 'crm', // Closest match for customer engagement
      priority: 'high',
      connector: qrGeneratorService,
      consecutiveFailures: 0,
      isEnabled: true,
    });

    // Register Billing Integration Service
    this.baseMonitor.registerIntegration({
      id: 'billing-integration',
      name: 'Billing & Rewards',
      type: 'crm',
      priority: 'critical', // Financial operations are critical
      connector: billingIntegrationService,
      consecutiveFailures: 0,
      isEnabled: true,
    });

    // Register Email Notification Service
    this.baseMonitor.registerIntegration({
      id: 'referral-notifications',
      name: 'Referral Email Notifications',
      type: 'crm',
      priority: 'high',
      connector: referralNotificationService,
      consecutiveFailures: 0,
      isEnabled: true,
    });

    // Register Realtime Updates Service
    this.baseMonitor.registerIntegration({
      id: 'referral-realtime',
      name: 'Realtime Referral Updates',
      type: 'crm',
      priority: 'high',
      connector: referralRealtimeService,
      consecutiveFailures: 0,
      isEnabled: true,
    });
  }

  async checkAllIntegrations(): Promise<IntegrationHealthReport> {
    const startTime = Date.now();

    try {
      // Check each service individually with detailed health metrics
      const [qrHealth, billingHealth, emailHealth, realtimeHealth] =
        await Promise.allSettled([
          this.checkQRGenerationHealth(),
          this.checkBillingHealth(),
          this.checkEmailNotificationHealth(),
          this.checkRealtimeUpdatesHealth(),
        ]);

      const services: ReferralIntegrationHealth = {
        qrGeneration: this.extractHealthResult(qrHealth),
        billing: this.extractHealthResult(billingHealth),
        emailNotifications: this.extractHealthResult(emailHealth),
        realtimeUpdates: this.extractHealthResult(realtimeHealth),
      };

      // Calculate overall health score
      const healthScore = this.calculateHealthScore(services);
      const isHealthy = healthScore >= 80; // 80% threshold for overall health

      // Get recent alerts
      const alerts = this.baseMonitor.getRecentAlerts(24); // Last 24 hours

      // Generate recommendations
      const recommendations = this.generateRecommendations(services, alerts);

      // Check wedding day readiness
      const weddingDayReadiness = this.assessWeddingDayReadiness(
        services,
        alerts,
      );

      const report: IntegrationHealthReport = {
        overall: {
          healthy: isHealthy,
          score: healthScore,
          lastChecked: new Date().toISOString(),
        },
        services,
        alerts,
        recommendations,
        weddingDayReadiness,
      };

      // Store health check metrics
      await this.storeHealthMetrics(report, Date.now() - startTime);

      // Log health check completion
      console.log('[IntegrationHealth] Health check completed:', {
        healthy: isHealthy,
        score: healthScore,
        duration: Date.now() - startTime,
        alertCount: alerts.length,
        timestamp: new Date().toISOString(),
      });

      return report;
    } catch (error) {
      console.error('[IntegrationHealth] Health check failed:', error);

      // Return degraded health report
      return {
        overall: {
          healthy: false,
          score: 0,
          lastChecked: new Date().toISOString(),
        },
        services: this.getEmptyHealthReport(),
        alerts: [],
        recommendations: [
          'Health check system is experiencing issues - manual verification required',
        ],
        weddingDayReadiness: {
          ready: false,
          criticalIssues: ['Health monitoring system failure'],
          warnings: [],
        },
      };
    }
  }

  private async checkQRGenerationHealth(): Promise<any> {
    try {
      const health = await qrGeneratorService.getHealthStatus();
      const metrics = await this.getService24hMetrics('qr-generator');

      return {
        healthy: health.healthy,
        responseTime: health.responseTime,
        successRate: this.calculateSuccessRate(metrics),
        qrCodesGenerated24h: metrics.operations || 0,
        storageUsed: metrics.storageUsed || 0,
        error: health.error,
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: 0,
        successRate: 0,
        qrCodesGenerated24h: 0,
        storageUsed: 0,
        error: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  private async checkBillingHealth(): Promise<any> {
    try {
      const health = await billingIntegrationService.getHealthStatus();
      const metrics = await this.getService24hMetrics('billing-integration');

      return {
        healthy: health.healthy,
        responseTime: health.responseTime,
        successRate: this.calculateSuccessRate(metrics),
        rewardsProcessed24h: metrics.operations || 0,
        totalCreditsIssued: metrics.totalCredits || 0,
        stripeConnectivity:
          health.details?.stripe_available_balance !== undefined,
        error: health.error,
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: 0,
        successRate: 0,
        rewardsProcessed24h: 0,
        totalCreditsIssued: 0,
        stripeConnectivity: false,
        error: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  private async checkEmailNotificationHealth(): Promise<any> {
    try {
      const health = await referralNotificationService.getHealthStatus();
      const metrics = await this.getService24hMetrics('referral-notifications');

      return {
        healthy: health.healthy,
        responseTime: health.responseTime,
        successRate: this.calculateSuccessRate(metrics),
        emailsSent24h: metrics.operations || 0,
        queuedEmails: health.details?.queued_emails || 0,
        resendConnectivity: health.details?.resend_status === 'ok',
        error: health.error,
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: 0,
        successRate: 0,
        emailsSent24h: 0,
        queuedEmails: 0,
        resendConnectivity: false,
        error: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  private async checkRealtimeUpdatesHealth(): Promise<any> {
    try {
      const health = await referralRealtimeService.getHealthStatus();
      const metrics = await this.getService24hMetrics('referral-realtime');
      const channelInfo = await referralRealtimeService.getActiveChannelsInfo();

      return {
        healthy: health.healthy,
        responseTime: health.responseTime,
        activeChannels: channelInfo.totalChannels,
        messagesDelivered24h: metrics.operations || 0,
        leaderboardUpdates24h: metrics.leaderboardUpdates || 0,
        supabaseRealtimeConnectivity:
          health.details?.realtime_connected || false,
        error: health.error,
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: 0,
        activeChannels: 0,
        messagesDelivered24h: 0,
        leaderboardUpdates24h: 0,
        supabaseRealtimeConnectivity: false,
        error: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  private extractHealthResult(settledResult: PromiseSettledResult<any>): any {
    if (settledResult.status === 'fulfilled') {
      return settledResult.value;
    } else {
      return {
        healthy: false,
        responseTime: 0,
        error:
          settledResult.reason instanceof Error
            ? settledResult.reason.message
            : 'Unknown error',
      };
    }
  }

  private calculateHealthScore(services: ReferralIntegrationHealth): number {
    const weights = {
      qrGeneration: 0.15, // 15% - Nice to have but not critical
      billing: 0.4, // 40% - Critical for revenue
      emailNotifications: 0.25, // 25% - Important for user engagement
      realtimeUpdates: 0.2, // 20% - Important for UX but not critical
    };

    let score = 0;

    // QR Generation
    score += (services.qrGeneration.healthy ? 100 : 0) * weights.qrGeneration;

    // Billing (most critical)
    const billingScore = services.billing.healthy
      ? services.billing.stripeConnectivity
        ? 100
        : 80
      : 0;
    score += billingScore * weights.billing;

    // Email Notifications
    const emailScore = services.emailNotifications.healthy
      ? services.emailNotifications.resendConnectivity
        ? 100
        : 70
      : 0;
    score += emailScore * weights.emailNotifications;

    // Realtime Updates
    const realtimeScore = services.realtimeUpdates.healthy
      ? services.realtimeUpdates.supabaseRealtimeConnectivity
        ? 100
        : 60
      : 0;
    score += realtimeScore * weights.realtimeUpdates;

    return Math.round(score);
  }

  private generateRecommendations(
    services: ReferralIntegrationHealth,
    alerts: HealthAlert[],
  ): string[] {
    const recommendations: string[] = [];

    // QR Generation recommendations
    if (!services.qrGeneration.healthy) {
      recommendations.push(
        'QR code generation is failing - check Supabase storage connectivity',
      );
    } else if (services.qrGeneration.responseTime > 3000) {
      recommendations.push(
        'QR generation is slow - consider optimizing image processing or storage',
      );
    }

    // Billing recommendations
    if (!services.billing.healthy) {
      recommendations.push(
        'CRITICAL: Billing integration is down - referral rewards cannot be processed',
      );
    } else if (!services.billing.stripeConnectivity) {
      recommendations.push(
        'Stripe connectivity issues detected - verify API keys and webhook endpoints',
      );
    }

    // Email recommendations
    if (!services.emailNotifications.healthy) {
      recommendations.push(
        "Email notifications are failing - users won't receive reward confirmations",
      );
    } else if (services.emailNotifications.queuedEmails > 100) {
      recommendations.push(
        'High email queue volume detected - consider scaling email processing',
      );
    }

    // Realtime recommendations
    if (!services.realtimeUpdates.healthy) {
      recommendations.push(
        "Realtime updates are down - leaderboards won't update live",
      );
    } else if (services.realtimeUpdates.activeChannels > 1000) {
      recommendations.push(
        'High number of active realtime channels - monitor for resource usage',
      );
    }

    // Alert-based recommendations
    const criticalAlerts = alerts.filter(
      (a) => a.alertType === 'critical' && !a.resolved,
    );
    if (criticalAlerts.length > 0) {
      recommendations.push(
        `${criticalAlerts.length} unresolved critical alerts require immediate attention`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'All referral integration services are operating normally',
      );
    }

    return recommendations;
  }

  private assessWeddingDayReadiness(
    services: ReferralIntegrationHealth,
    alerts: HealthAlert[],
  ): { ready: boolean; criticalIssues: string[]; warnings: string[] } {
    const criticalIssues: string[] = [];
    const warnings: string[] = [];

    // Wedding day critical requirements
    if (!services.billing.healthy) {
      criticalIssues.push(
        'Billing system is down - referral rewards will fail',
      );
    }

    if (!services.emailNotifications.healthy) {
      criticalIssues.push(
        "Email notifications are down - users won't receive confirmations",
      );
    }

    // Wedding day warnings
    if (!services.qrGeneration.healthy) {
      warnings.push(
        "QR code generation is failing - new referral links won't work",
      );
    }

    if (!services.realtimeUpdates.healthy) {
      warnings.push(
        "Realtime updates are down - leaderboards won't update live",
      );
    }

    if (services.billing.responseTime > 2000) {
      warnings.push(
        'Billing system is slow - reward processing may be delayed',
      );
    }

    if (services.emailNotifications.queuedEmails > 50) {
      warnings.push('Email queue is backed up - notifications may be delayed');
    }

    // Check for unresolved critical alerts
    const unresolvedCritical = alerts.filter(
      (a) => a.alertType === 'critical' && !a.resolved,
    );
    unresolvedCritical.forEach((alert) => {
      criticalIssues.push(`Unresolved critical alert: ${alert.message}`);
    });

    return {
      ready: criticalIssues.length === 0,
      criticalIssues,
      warnings,
    };
  }

  private async getService24hMetrics(serviceId: string): Promise<any> {
    // In a real implementation, this would query a metrics database
    // For now, return mock metrics
    const baseMetrics = {
      operations: Math.floor(Math.random() * 1000),
      successRate: 95 + Math.random() * 5,
      avgResponseTime: 500 + Math.random() * 1500,
    };

    switch (serviceId) {
      case 'qr-generator':
        return {
          ...baseMetrics,
          storageUsed: Math.random() * 1024 * 1024 * 100,
        }; // MB
      case 'billing-integration':
        return {
          ...baseMetrics,
          totalCredits: Math.floor(Math.random() * 50000),
        }; // Pence
      case 'referral-realtime':
        return {
          ...baseMetrics,
          leaderboardUpdates: Math.floor(Math.random() * 500),
        };
      default:
        return baseMetrics;
    }
  }

  private calculateSuccessRate(metrics: any): number {
    return metrics?.successRate || 100;
  }

  private getEmptyHealthReport(): ReferralIntegrationHealth {
    return {
      qrGeneration: {
        healthy: false,
        responseTime: 0,
        successRate: 0,
        qrCodesGenerated24h: 0,
        storageUsed: 0,
      },
      billing: {
        healthy: false,
        responseTime: 0,
        successRate: 0,
        rewardsProcessed24h: 0,
        totalCreditsIssued: 0,
        stripeConnectivity: false,
      },
      emailNotifications: {
        healthy: false,
        responseTime: 0,
        successRate: 0,
        emailsSent24h: 0,
        queuedEmails: 0,
        resendConnectivity: false,
      },
      realtimeUpdates: {
        healthy: false,
        responseTime: 0,
        activeChannels: 0,
        messagesDelivered24h: 0,
        leaderboardUpdates24h: 0,
        supabaseRealtimeConnectivity: false,
      },
    };
  }

  private async storeHealthMetrics(
    report: IntegrationHealthReport,
    responseTime: number,
  ): Promise<void> {
    const metrics: HealthMetrics = {
      integrationId: 'referral-integration-suite',
      timestamp: new Date(),
      responseTimeMs: responseTime,
      isHealthy: report.overall.healthy,
      errorCount: report.alerts.filter((a) => !a.resolved).length,
      successRate: report.overall.score,
      dataQualityScore: report.overall.score,
      customMetrics: {
        qrGenerationHealth: report.services.qrGeneration.healthy ? 1 : 0,
        billingHealth: report.services.billing.healthy ? 1 : 0,
        emailHealth: report.services.emailNotifications.healthy ? 1 : 0,
        realtimeHealth: report.services.realtimeUpdates.healthy ? 1 : 0,
        weddingDayReady: report.weddingDayReadiness.ready ? 1 : 0,
      },
    };

    this.healthMetrics.push(metrics);

    // Keep only last 24 hours of metrics
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.healthMetrics = this.healthMetrics.filter(
      (m) => m.timestamp > twentyFourHoursAgo,
    );
  }

  // Public API methods
  async startMonitoring(): Promise<void> {
    await this.baseMonitor.startMonitoring();
    console.log('[IntegrationHealth] Referral integration monitoring started');
  }

  async stopMonitoring(): Promise<void> {
    await this.baseMonitor.stopMonitoring();
    console.log('[IntegrationHealth] Referral integration monitoring stopped');
  }

  getHealthMetrics(hours: number = 24): HealthMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.healthMetrics.filter((m) => m.timestamp > cutoff);
  }

  async triggerEmergencyHealthCheck(): Promise<IntegrationHealthReport> {
    console.log('[IntegrationHealth] Emergency health check triggered');
    return this.checkAllIntegrations();
  }
}

// Export singleton instance for use across the application
export const integrationHealthService = new ReferralIntegrationHealthService();
