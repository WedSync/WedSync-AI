import { NotificationService } from './NotificationService';
import { integrationDataManager } from '../database/IntegrationDataManager';
import {
  IntegrationError,
  ErrorCategory,
  WebhookFailureDetails,
} from '@/types/integrations';
import { createHmac, randomBytes } from 'crypto';

interface DeliveryMetrics {
  responseTime: number;
  statusCode: number;
  payloadSize: number;
  retryCount: number;
  deliveredAt: Date;
  webhookId: string;
}

interface EndpointHealth {
  endpointUrl: string;
  isHealthy: boolean;
  responseTime: number;
  consecutiveFailures: number;
  lastCheckedAt: Date;
  errorDetails?: string;
}

interface WebhookConfig {
  endpointUrl: string;
  secretKey: string;
  eventTypes: string[];
  isActive: boolean;
  retryConfig: {
    maxRetries: number;
    backoffStrategy: 'exponential' | 'linear';
    initialDelayMs: number;
  };
  headers?: Record<string, string>;
}

interface TestResults {
  endpointUrl: string;
  testPayload: any;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  errorMessage?: string;
  testedAt: Date;
}

interface MigrationInfo {
  fromVersion: string;
  toVersion: string;
  breakingChanges: string[];
  migrationSteps: string[];
  estimatedDowntime: string;
  rollbackPlan: string;
}

interface CriticalAlert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  webhookId?: string;
  endpointUrl?: string;
  affectedOrganizations?: string[];
  actionRequired: boolean;
  escalationLevel: number;
}

interface SystemHealthSummary {
  totalWebhooks: number;
  activeEndpoints: number;
  unhealthyEndpoints: number;
  avgResponseTime: number;
  successRate: number;
  criticalIssues: number;
  generatedAt: Date;
}

/**
 * WebhookNotificationService - Handles multi-channel notifications for webhook events
 *
 * This service extends the base NotificationService to provide webhook-specific
 * notification capabilities including failure alerts, health monitoring notifications,
 * and integration with external communication channels.
 *
 * Features:
 * - Multi-channel webhook failure notifications (email + SMS + Slack)
 * - Real-time webhook health monitoring alerts
 * - Dead letter queue notifications for failed deliveries
 * - Wedding industry-specific webhook notification templates
 * - Integration with external alerting systems (Slack, Teams)
 */
export class WebhookNotificationService extends NotificationService {
  private readonly webhookSecretKey: string;
  private readonly maxRetryAttempts = 5;
  private readonly circuitBreakerThreshold = 10;

  constructor(userId: string, organizationId: string) {
    super(userId, organizationId);
    this.webhookSecretKey =
      process.env.WEBHOOK_SECRET_KEY || crypto.randomBytes(32).toString('hex');
  }

  /**
   * Sends multi-channel notification when webhook delivery fails
   * Critical for wedding vendors who depend on real-time data synchronization
   */
  async sendWebhookFailureNotification(
    supplierId: string,
    failureDetails: WebhookFailureDetails,
  ): Promise<void> {
    try {
      const isWeddingWeekend = this.isWeddingWeekend(new Date());
      const priority =
        isWeddingWeekend || failureDetails.attemptCount >= 3
          ? 'urgent'
          : 'high';

      // Email notification with detailed failure information
      await this.sendNotification({
        templateId: 'webhook_failure_alert',
        recipients: [{ id: supplierId, type: 'user', value: supplierId }],
        variables: {
          recipientName: await this.getUserName(supplierId),
          endpointUrl: this.maskSensitiveUrl(failureDetails.endpointUrl),
          errorMessage: failureDetails.errorMessage,
          errorCode: failureDetails.errorCode.toString(),
          attemptCount: failureDetails.attemptCount.toString(),
          nextRetryTime:
            failureDetails.nextRetryAt?.toLocaleTimeString() ||
            'Manual retry required',
          eventType: failureDetails.eventType,
          troubleshootingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/integrations/troubleshoot`,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/integrations/webhooks`,
        },
        priority,
      });

      // SMS alert for critical failures (Professional+ tiers only)
      if (
        failureDetails.attemptCount >= 3 &&
        (await this.isPremiumTier(supplierId))
      ) {
        await this.sendNotification({
          templateId: 'webhook_failure_sms',
          recipients: [{ id: supplierId, type: 'user', value: supplierId }],
          variables: {
            eventType: failureDetails.eventType,
            endpointName: this.extractEndpointName(failureDetails.endpointUrl),
            attemptCount: failureDetails.attemptCount.toString(),
          },
          priority: 'urgent',
        });
      }

      await integrationDataManager.logAudit(
        this.userId,
        this.organizationId,
        'WEBHOOK_FAILURE_NOTIFIED',
        failureDetails.webhookId,
        'webhook_notification',
        {
          endpointUrl: this.maskSensitiveUrl(failureDetails.endpointUrl),
          errorCode: failureDetails.errorCode,
          attemptCount: failureDetails.attemptCount,
          notificationChannels:
            failureDetails.attemptCount >= 3 ? ['email', 'sms'] : ['email'],
        },
      );
    } catch (error) {
      console.error('Failed to send webhook failure notification:', error);
      throw new IntegrationError(
        'Failed to send webhook failure notification',
        ErrorCategory.NOTIFICATION_ERROR,
        error,
      );
    }
  }

  /**
   * Sends success notification with delivery metrics for webhook monitoring
   */
  async sendWebhookSuccessAlert(
    supplierId: string,
    deliveryMetrics: DeliveryMetrics,
  ): Promise<void> {
    try {
      // Only send success notifications for slow or recovered deliveries
      if (
        deliveryMetrics.responseTime > 5000 ||
        deliveryMetrics.retryCount > 0
      ) {
        await this.sendNotification({
          templateId: 'webhook_success_recovery',
          recipients: [{ id: supplierId, type: 'user', value: supplierId }],
          variables: {
            recipientName: await this.getUserName(supplierId),
            eventType: deliveryMetrics.webhookId.split('-')[0] || 'webhook',
            responseTime: `${deliveryMetrics.responseTime}ms`,
            retryCount: deliveryMetrics.retryCount.toString(),
            deliveredAt: deliveryMetrics.deliveredAt.toLocaleTimeString(),
            statusCode: deliveryMetrics.statusCode.toString(),
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/integrations/webhooks`,
          },
          priority: 'normal',
        });
      }
    } catch (error) {
      console.error('Failed to send webhook success alert:', error);
    }
  }

  /**
   * Sends endpoint health status notifications
   */
  async sendEndpointHealthAlert(
    supplierId: string,
    healthStatus: EndpointHealth,
  ): Promise<void> {
    try {
      const severity = this.calculateHealthSeverity(healthStatus);

      await this.sendNotification({
        templateId: 'endpoint_health_alert',
        recipients: [{ id: supplierId, type: 'user', value: supplierId }],
        variables: {
          recipientName: await this.getUserName(supplierId),
          endpointUrl: this.maskSensitiveUrl(healthStatus.endpointUrl),
          healthStatus: healthStatus.isHealthy ? 'Healthy' : 'Unhealthy',
          responseTime: `${healthStatus.responseTime}ms`,
          consecutiveFailures: healthStatus.consecutiveFailures.toString(),
          lastChecked: healthStatus.lastCheckedAt.toLocaleString(),
          errorDetails: healthStatus.errorDetails || 'No errors',
          recommendedAction: this.getHealthRecommendation(healthStatus),
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/integrations/health`,
        },
        priority: severity === 'critical' ? 'urgent' : 'high',
      });
    } catch (error) {
      console.error('Failed to send endpoint health alert:', error);
    }
  }

  /**
   * Sends dead letter queue alert when webhook failures accumulate
   */
  async sendDeadLetterQueueAlert(
    supplierId: string,
    queueSize: number,
  ): Promise<void> {
    try {
      const isWeddingWeekend = this.isWeddingWeekend(new Date());
      const priority = isWeddingWeekend || queueSize > 100 ? 'urgent' : 'high';

      await this.sendNotification({
        templateId: 'dead_letter_queue_alert',
        recipients: [{ id: supplierId, type: 'user', value: supplierId }],
        variables: {
          recipientName: await this.getUserName(supplierId),
          queueSize: queueSize.toString(),
          riskLevel: this.calculateQueueRisk(queueSize),
          estimatedDataLoss: this.estimateDataLoss(queueSize),
          actionRequired: queueSize > 50 ? 'Immediate' : 'Within 24 hours',
          manualProcessUrl: `${process.env.NEXT_PUBLIC_APP_URL}/integrations/dead-letter-queue`,
          supportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/support/urgent`,
        },
        priority,
      });
    } catch (error) {
      console.error('Failed to send dead letter queue alert:', error);
    }
  }

  /**
   * Email integration for webhook configuration notifications
   */
  async sendWebhookConfigurationEmail(
    supplierEmail: string,
    webhookConfig: WebhookConfig,
  ): Promise<void> {
    try {
      await this.sendNotification({
        templateId: 'webhook_configuration_guide',
        recipients: [{ id: 'email', type: 'email', value: supplierEmail }],
        variables: {
          recipientEmail: supplierEmail,
          endpointUrl: webhookConfig.endpointUrl,
          eventTypes: webhookConfig.eventTypes.join(', '),
          maxRetries: webhookConfig.retryConfig.maxRetries.toString(),
          backoffStrategy: webhookConfig.retryConfig.backoffStrategy,
          testUrl: `${process.env.NEXT_PUBLIC_APP_URL}/integrations/test-webhook`,
          documentationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/docs/webhooks`,
          securityGuideUrl: `${process.env.NEXT_PUBLIC_APP_URL}/docs/webhook-security`,
        },
        priority: 'normal',
      });
    } catch (error) {
      console.error('Failed to send webhook configuration email:', error);
    }
  }

  /**
   * Sends webhook test results via email
   */
  async sendWebhookTestResultEmail(
    supplierEmail: string,
    testResults: TestResults,
  ): Promise<void> {
    try {
      await this.sendNotification({
        templateId: 'webhook_test_results',
        recipients: [{ id: 'email', type: 'email', value: supplierEmail }],
        variables: {
          recipientEmail: supplierEmail,
          endpointUrl: this.maskSensitiveUrl(testResults.endpointUrl),
          testResult: testResults.success ? 'PASSED' : 'FAILED',
          responseTime: `${testResults.responseTime}ms`,
          statusCode: testResults.statusCode?.toString() || 'No response',
          errorMessage:
            testResults.errorMessage || 'Test completed successfully',
          testedAt: testResults.testedAt.toLocaleString(),
          nextSteps: testResults.success
            ? 'Your webhook endpoint is ready to receive events'
            : 'Please review the error and retry the test',
          troubleshootingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/docs/webhook-troubleshooting`,
        },
        priority: testResults.success ? 'normal' : 'high',
      });
    } catch (error) {
      console.error('Failed to send webhook test result email:', error);
    }
  }

  /**
   * Sends webhook migration guide via email
   */
  async sendWebhookMigrationGuide(
    supplierEmail: string,
    migrationInfo: MigrationInfo,
  ): Promise<void> {
    try {
      await this.sendNotification({
        templateId: 'webhook_migration_guide',
        recipients: [{ id: 'email', type: 'email', value: supplierEmail }],
        variables: {
          recipientEmail: supplierEmail,
          fromVersion: migrationInfo.fromVersion,
          toVersion: migrationInfo.toVersion,
          breakingChanges: migrationInfo.breakingChanges.join('\n• '),
          migrationSteps: migrationInfo.migrationSteps.join('\n'),
          estimatedDowntime: migrationInfo.estimatedDowntime,
          rollbackPlan: migrationInfo.rollbackPlan,
          migrationGuideUrl: `${process.env.NEXT_PUBLIC_APP_URL}/docs/migration/${migrationInfo.toVersion}`,
          supportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/support/migration`,
        },
        priority: 'high',
      });
    } catch (error) {
      console.error('Failed to send webhook migration guide:', error);
    }
  }

  /**
   * Slack/Teams integration for critical webhook alerts
   */
  async sendCriticalWebhookAlert(alertData: CriticalAlert): Promise<void> {
    try {
      // This would integrate with Slack/Teams via their webhook APIs
      // For now, we'll send to system administrators via email
      const adminEmails = await this.getSystemAdminEmails();

      for (const email of adminEmails) {
        await this.sendNotification({
          templateId: 'critical_webhook_system_alert',
          recipients: [{ id: 'admin', type: 'email', value: email }],
          variables: {
            alertTitle: alertData.title,
            alertMessage: alertData.message,
            severity: alertData.severity.toUpperCase(),
            webhookId: alertData.webhookId || 'N/A',
            endpointUrl: alertData.endpointUrl
              ? this.maskSensitiveUrl(alertData.endpointUrl)
              : 'N/A',
            affectedOrganizations:
              alertData.affectedOrganizations?.length.toString() || '0',
            actionRequired: alertData.actionRequired ? 'YES' : 'NO',
            escalationLevel: alertData.escalationLevel.toString(),
            adminDashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/webhooks`,
            incidentResponseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/incidents`,
          },
          priority: 'urgent',
        });
      }

      await integrationDataManager.logAudit(
        'system',
        'system',
        'CRITICAL_WEBHOOK_ALERT_SENT',
        alertData.webhookId || 'system-wide',
        'system_alert',
        {
          severity: alertData.severity,
          actionRequired: alertData.actionRequired,
          escalationLevel: alertData.escalationLevel,
          notifiedAdmins: adminEmails.length,
        },
      );
    } catch (error) {
      console.error('Failed to send critical webhook alert:', error);
    }
  }

  /**
   * Sends system health summary to administrators
   */
  async sendSystemHealthSummary(
    healthSummary: SystemHealthSummary,
  ): Promise<void> {
    try {
      const adminEmails = await this.getSystemAdminEmails();

      for (const email of adminEmails) {
        await this.sendNotification({
          templateId: 'system_health_summary',
          recipients: [{ id: 'admin', type: 'email', value: email }],
          variables: {
            totalWebhooks: healthSummary.totalWebhooks.toString(),
            activeEndpoints: healthSummary.activeEndpoints.toString(),
            unhealthyEndpoints: healthSummary.unhealthyEndpoints.toString(),
            avgResponseTime: `${healthSummary.avgResponseTime}ms`,
            successRate: `${healthSummary.successRate}%`,
            criticalIssues: healthSummary.criticalIssues.toString(),
            generatedAt: healthSummary.generatedAt.toLocaleString(),
            healthStatus:
              healthSummary.criticalIssues === 0
                ? 'All Systems Operational'
                : 'Issues Detected',
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/health`,
            detailedReportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/reports/webhook-health`,
          },
          priority: healthSummary.criticalIssues > 0 ? 'high' : 'normal',
        });
      }
    } catch (error) {
      console.error('Failed to send system health summary:', error);
    }
  }

  // Private utility methods

  private maskSensitiveUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      // Mask query parameters and sensitive path segments
      return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname.replace(/\/[^\/]*key[^\/]*/gi, '/***').replace(/\/[^\/]*secret[^\/]*/gi, '/***')}`;
    } catch {
      return 'Invalid URL';
    }
  }

  private extractEndpointName(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
    } catch {
      return 'Unknown Endpoint';
    }
  }

  private async isPremiumTier(userId: string): Promise<boolean> {
    // This would check the user's subscription tier
    // For now, return true for demonstration
    return true;
  }

  private isWeddingWeekend(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0; // Friday, Saturday, Sunday
  }

  private calculateHealthSeverity(
    health: EndpointHealth,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (!health.isHealthy) {
      if (health.consecutiveFailures >= 10) return 'critical';
      if (health.consecutiveFailures >= 5) return 'high';
      if (health.consecutiveFailures >= 3) return 'medium';
    }

    if (health.responseTime > 10000) return 'high';
    if (health.responseTime > 5000) return 'medium';

    return 'low';
  }

  private getHealthRecommendation(health: EndpointHealth): string {
    if (!health.isHealthy) {
      if (health.consecutiveFailures >= 5) {
        return 'Consider disabling this endpoint temporarily and contact the service provider';
      }
      return 'Check your endpoint configuration and server status';
    }

    if (health.responseTime > 5000) {
      return 'Monitor endpoint performance - response time is slower than recommended';
    }

    return 'Endpoint is performing well';
  }

  private calculateQueueRisk(queueSize: number): string {
    if (queueSize > 500) return 'CRITICAL';
    if (queueSize > 200) return 'HIGH';
    if (queueSize > 50) return 'MEDIUM';
    return 'LOW';
  }

  private estimateDataLoss(queueSize: number): string {
    const estimatedEvents = queueSize * 1.2; // Estimate accounting for batching
    return `Approximately ${Math.round(estimatedEvents)} webhook events may be lost if not processed`;
  }

  private async getSystemAdminEmails(): Promise<string[]> {
    // This would query the admin users from the database
    // For now, return environment variable or default
    const adminEmails = process.env.SYSTEM_ADMIN_EMAILS?.split(',') || [];
    return adminEmails.length > 0 ? adminEmails : ['admin@wedsync.com'];
  }

  // Override parent method to add webhook-specific templates
  protected async loadNotificationTemplates(): Promise<void> {
    await super.loadNotificationTemplates();

    // Add webhook-specific templates
    const webhookTemplates = [
      {
        id: 'webhook_failure_alert',
        name: 'Webhook Failure Alert',
        subject:
          'Webhook Delivery Failed: {{eventType}} - {{attemptCount}} attempts',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Webhook Delivery Failed</h2>
            <p>Hi {{recipientName}},</p>
            <p>We encountered an issue delivering a webhook to your endpoint:</p>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3 style="margin: 0 0 10px 0; color: #b91c1c;">{{eventType}} Event</h3>
              <p style="margin: 5px 0;"><strong>Endpoint:</strong> {{endpointUrl}}</p>
              <p style="margin: 5px 0;"><strong>Error:</strong> {{errorMessage}}</p>
              <p style="margin: 5px 0;"><strong>Status Code:</strong> {{errorCode}}</p>
              <p style="margin: 5px 0;"><strong>Attempt:</strong> {{attemptCount}} of 5</p>
              <p style="margin: 5px 0;"><strong>Next Retry:</strong> {{nextRetryTime}}</p>
            </div>
            <p><strong>What this means:</strong> Your external system may not be receiving real-time updates about wedding events. This could affect client data synchronization and workflow automation.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{troubleshootingUrl}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">Troubleshoot</a>
              <a href="{{dashboardUrl}}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Dashboard</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">Best regards,<br>The WedSync Team</p>
          </div>
        `,
        type: 'email' as const,
        variables: [
          'recipientName',
          'endpointUrl',
          'errorMessage',
          'errorCode',
          'attemptCount',
          'nextRetryTime',
          'eventType',
          'troubleshootingUrl',
          'dashboardUrl',
        ],
        priority: 'high' as const,
        tags: ['webhook', 'failure', 'urgent'],
      },
    ];

    // Add templates to the parent's template map
    for (const template of webhookTemplates) {
      this.templates.set(template.id, template);
    }
  }
}
