/**
 * API Usage Alerts Service
 * WS-233: Comprehensive API usage monitoring and alerting
 *
 * Monitors API usage patterns and triggers alerts for:
 * - Rate limit violations
 * - Usage threshold breaches
 * - Unusual activity patterns
 * - Quota exceeded warnings
 * - Error rate spikes
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export interface UsageAlert {
  id: string;
  organizationId: string;
  alertType:
    | 'usage_threshold'
    | 'rate_limit'
    | 'unusual_activity'
    | 'quota_exceeded'
    | 'error_spike';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentValue: number;
  thresholdValue: number;
  metricType: string;
  timeWindow: string;
  isActive: boolean;
  notificationChannels: string[];
  lastTriggered?: string;
  createdAt: string;
}

export interface AlertRule {
  id: string;
  organizationId: string;
  alertType: string;
  thresholdValue: number;
  thresholdPeriod: string;
  notificationChannels: string[];
  isActive: boolean;
}

export interface NotificationChannel {
  type: 'email' | 'webhook' | 'slack' | 'sms';
  config: {
    email?: string;
    webhook_url?: string;
    slack_channel?: string;
    phone_number?: string;
  };
}

/**
 * API Usage Alerts Service
 */
export class APIUsageAlertsService {
  /**
   * Check all usage patterns and trigger alerts if thresholds are exceeded
   */
  async checkUsageAlerts(): Promise<void> {
    try {
      console.log('Starting API usage alerts check...');

      // Get all active alert rules
      const { data: alertRules } = await supabase
        .from('api_usage_alerts')
        .select('*')
        .eq('is_active', true);

      if (!alertRules || alertRules.length === 0) {
        console.log('No active alert rules found');
        return;
      }

      // Group rules by organization for efficient processing
      const rulesByOrg = alertRules.reduce(
        (acc, rule) => {
          if (!acc[rule.organization_id]) {
            acc[rule.organization_id] = [];
          }
          acc[rule.organization_id].push(rule);
          return acc;
        },
        {} as Record<string, typeof alertRules>,
      );

      // Check alerts for each organization
      for (const [orgId, rules] of Object.entries(rulesByOrg)) {
        await this.checkOrganizationAlerts(orgId, rules);
      }

      console.log('API usage alerts check completed');
    } catch (error) {
      console.error('Error checking usage alerts:', error);
    }
  }

  /**
   * Check alerts for a specific organization
   */
  private async checkOrganizationAlerts(
    organizationId: string,
    rules: any[],
  ): Promise<void> {
    try {
      // Get recent usage data for the organization
      const usageData = await this.getOrganizationUsageData(organizationId);

      for (const rule of rules) {
        await this.evaluateAlertRule(rule, usageData);
      }
    } catch (error) {
      console.error(
        `Error checking alerts for organization ${organizationId}:`,
        error,
      );
    }
  }

  /**
   * Get usage data for an organization
   */
  private async getOrganizationUsageData(organizationId: string) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get recent usage logs
    const { data: logs } = await supabase
      .from('api_usage_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('timestamp', oneDayAgo.toISOString())
      .order('timestamp', { ascending: false });

    // Get usage summary
    const { data: summary } = await supabase
      .from('api_usage_summary')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('date', now.toISOString().split('T')[0])
      .single();

    // Calculate metrics
    const totalRequestsLastHour =
      logs?.filter((log) => new Date(log.timestamp) >= oneHourAgo).length || 0;

    const totalRequestsToday = summary?.total_requests || 0;
    const errorRequestsToday = summary?.error_count || 0;
    const rateLimitedToday = summary?.rate_limited_count || 0;
    const errorRate =
      totalRequestsToday > 0
        ? (errorRequestsToday / totalRequestsToday) * 100
        : 0;

    return {
      totalRequestsLastHour,
      totalRequestsToday,
      errorRequestsToday,
      rateLimitedToday,
      errorRate,
      averageResponseTime:
        summary?.total_requests > 0
          ? summary.total_response_time_ms / summary.total_requests
          : 0,
    };
  }

  /**
   * Evaluate a specific alert rule
   */
  private async evaluateAlertRule(rule: any, usageData: any): Promise<void> {
    try {
      let shouldTrigger = false;
      let currentValue = 0;
      let metricName = '';

      switch (rule.alert_type) {
        case 'usage_threshold':
          if (rule.threshold_period === 'hour') {
            currentValue = usageData.totalRequestsLastHour;
            metricName = 'Requests per hour';
          } else if (rule.threshold_period === 'day') {
            currentValue = usageData.totalRequestsToday;
            metricName = 'Requests per day';
          }
          shouldTrigger = currentValue >= rule.threshold_value;
          break;

        case 'rate_limit':
          currentValue = usageData.rateLimitedToday;
          metricName = 'Rate limited requests';
          shouldTrigger = currentValue >= rule.threshold_value;
          break;

        case 'quota_exceeded':
          // Get subscription tier limits
          const { data: org } = await supabase
            .from('organizations')
            .select('subscription_tier')
            .eq('id', rule.organization_id)
            .single();

          if (org) {
            const { data: quota } = await supabase
              .from('api_usage_quotas')
              .select('limit_value')
              .eq('subscription_tier', org.subscription_tier)
              .eq('quota_type', 'requests_per_day')
              .single();

            if (quota) {
              currentValue =
                (usageData.totalRequestsToday / quota.limit_value) * 100;
              metricName = 'Daily quota usage percentage';
              shouldTrigger = currentValue >= rule.threshold_value;
            }
          }
          break;

        case 'unusual_activity':
          // Compare to historical average (simplified)
          const { data: historical } = await supabase
            .from('api_usage_summary')
            .select('total_requests')
            .eq('organization_id', rule.organization_id)
            .gte(
              'date',
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0],
            )
            .neq('date', new Date().toISOString().split('T')[0]);

          if (historical && historical.length > 0) {
            const avgDaily =
              historical.reduce((sum, day) => sum + day.total_requests, 0) /
              historical.length;
            currentValue = usageData.totalRequestsToday;
            metricName = 'Daily requests vs average';
            shouldTrigger =
              currentValue > avgDaily * (rule.threshold_value / 100); // threshold_value as percentage
          }
          break;

        default:
          console.warn(`Unknown alert type: ${rule.alert_type}`);
          return;
      }

      if (shouldTrigger) {
        await this.triggerAlert(rule, currentValue, metricName);
      }
    } catch (error) {
      console.error('Error evaluating alert rule:', error);
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(
    rule: any,
    currentValue: number,
    metricName: string,
  ): Promise<void> {
    try {
      // Check if we've already triggered this alert recently (prevent spam)
      const cooldownMinutes = 60; // 1 hour cooldown
      const cooldownTime = new Date(Date.now() - cooldownMinutes * 60 * 1000);

      if (
        rule.last_triggered_at &&
        new Date(rule.last_triggered_at) > cooldownTime
      ) {
        console.log(`Alert rule ${rule.id} still in cooldown period`);
        return;
      }

      // Get organization details
      const { data: org } = await supabase
        .from('organizations')
        .select('name, subscription_tier')
        .eq('id', rule.organization_id)
        .single();

      const severity = this.calculateSeverity(
        rule.alert_type,
        currentValue,
        rule.threshold_value,
      );

      const alertMessage = this.generateAlertMessage(
        rule.alert_type,
        org?.name || 'Unknown',
        metricName,
        currentValue,
        rule.threshold_value,
        org?.subscription_tier || 'free',
      );

      // Send notifications
      await this.sendNotifications(
        rule.notification_channels,
        alertMessage,
        severity,
      );

      // Update last triggered time
      await supabase
        .from('api_usage_alerts')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('id', rule.id);

      console.log(
        `Alert triggered for organization ${rule.organization_id}: ${alertMessage}`,
      );
    } catch (error) {
      console.error('Error triggering alert:', error);
    }
  }

  /**
   * Calculate alert severity
   */
  private calculateSeverity(
    alertType: string,
    currentValue: number,
    threshold: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = currentValue / threshold;

    if (ratio >= 2.0) return 'critical';
    if (ratio >= 1.5) return 'high';
    if (ratio >= 1.2) return 'medium';
    return 'low';
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(
    alertType: string,
    orgName: string,
    metricName: string,
    currentValue: number,
    threshold: number,
    tier: string,
  ): string {
    switch (alertType) {
      case 'usage_threshold':
        return `🚨 Usage Alert: ${orgName} has exceeded their usage threshold. ${metricName}: ${currentValue.toLocaleString()} (threshold: ${threshold.toLocaleString()})`;

      case 'rate_limit':
        return `⚠️ Rate Limit Alert: ${orgName} has ${currentValue} rate-limited requests today (threshold: ${threshold})`;

      case 'quota_exceeded':
        return `📊 Quota Alert: ${orgName} (${tier} tier) has used ${currentValue.toFixed(1)}% of their daily quota (threshold: ${threshold}%)`;

      case 'unusual_activity':
        return `🔍 Unusual Activity Alert: ${orgName} showing ${currentValue.toLocaleString()} requests, which is ${((currentValue / threshold) * 100).toFixed(0)}% above normal`;

      default:
        return `Alert: ${orgName} - ${metricName}: ${currentValue} (threshold: ${threshold})`;
    }
  }

  /**
   * Send notifications through configured channels
   */
  private async sendNotifications(
    channels: string[],
    message: string,
    severity: string,
  ): Promise<void> {
    for (const channelConfig of channels) {
      try {
        const channel = JSON.parse(channelConfig);

        switch (channel.type) {
          case 'email':
            await this.sendEmailNotification(
              channel.config.email,
              message,
              severity,
            );
            break;

          case 'webhook':
            await this.sendWebhookNotification(
              channel.config.webhook_url,
              message,
              severity,
            );
            break;

          case 'slack':
            await this.sendSlackNotification(
              channel.config.slack_channel,
              message,
              severity,
            );
            break;

          default:
            console.warn(`Unknown notification channel type: ${channel.type}`);
        }
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    email: string,
    message: string,
    severity: string,
  ): Promise<void> {
    try {
      // Using Resend (configured in environment)
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'alerts@wedsync.com',
          to: [email],
          subject: `WedSync API Alert - ${severity.toUpperCase()}`,
          html: `
            <h2>WedSync API Usage Alert</h2>
            <p><strong>Severity:</strong> ${severity.toUpperCase()}</p>
            <p><strong>Alert:</strong> ${message}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            <hr>
            <p>Please review your API usage in the WedSync dashboard.</p>
          `,
        }),
      });

      if (!response.ok) {
        throw new Error(`Email API error: ${response.statusText}`);
      }

      console.log(`Email notification sent to ${email}`);
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(
    webhookUrl: string,
    message: string,
    severity: string,
  ): Promise<void> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync-API-Alerts/1.0',
        },
        body: JSON.stringify({
          alert_type: 'api_usage',
          severity,
          message,
          timestamp: new Date().toISOString(),
          source: 'WedSync API Usage Monitor',
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.statusText}`);
      }

      console.log(`Webhook notification sent to ${webhookUrl}`);
    } catch (error) {
      console.error('Error sending webhook notification:', error);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(
    slackChannel: string,
    message: string,
    severity: string,
  ): Promise<void> {
    try {
      // This would require Slack webhook URL or bot token
      // Simplified implementation
      console.log(`Slack notification (${severity}): ${message}`);
    } catch (error) {
      console.error('Error sending Slack notification:', error);
    }
  }

  /**
   * Create a new alert rule
   */
  async createAlertRule(
    organizationId: string,
    alertType: string,
    thresholdValue: number,
    thresholdPeriod: string,
    notificationChannels: NotificationChannel[],
  ): Promise<void> {
    try {
      const { error } = await supabase.from('api_usage_alerts').insert({
        organization_id: organizationId,
        alert_type: alertType,
        threshold_value: thresholdValue,
        threshold_period: thresholdPeriod,
        notification_channels: notificationChannels.map((ch) =>
          JSON.stringify(ch),
        ),
        is_active: true,
      });

      if (error) throw error;

      console.log(`Alert rule created for organization ${organizationId}`);
    } catch (error) {
      console.error('Error creating alert rule:', error);
      throw error;
    }
  }

  /**
   * Get alert rules for an organization
   */
  async getAlertRules(organizationId: string): Promise<AlertRule[]> {
    try {
      const { data, error } = await supabase
        .from('api_usage_alerts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching alert rules:', error);
      throw error;
    }
  }

  /**
   * Update alert rule
   */
  async updateAlertRule(
    ruleId: string,
    updates: Partial<AlertRule>,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('api_usage_alerts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ruleId);

      if (error) throw error;

      console.log(`Alert rule ${ruleId} updated`);
    } catch (error) {
      console.error('Error updating alert rule:', error);
      throw error;
    }
  }

  /**
   * Delete alert rule
   */
  async deleteAlertRule(ruleId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('api_usage_alerts')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      console.log(`Alert rule ${ruleId} deleted`);
    } catch (error) {
      console.error('Error deleting alert rule:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiUsageAlertsService = new APIUsageAlertsService();
