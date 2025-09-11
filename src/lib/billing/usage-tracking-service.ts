// WS-131: Usage Tracking Service with Smart Alerting
// Advanced usage tracking with real-time limits and alert system

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export interface UsageRecord {
  id: string;
  subscription_id: string;
  organization_id: string;
  metric_name: string;
  quantity: number;
  recorded_at: string;
  period_start: string;
  period_end: string;
  metadata: Record<string, any>;
}

export interface UsageSummary {
  feature: string;
  current: number;
  limit: number;
  percentage: number;
  resetDate: string;
  alertThresholds: number[];
}

export interface UsageAlert {
  id: string;
  subscription_id: string;
  metric_name: string;
  threshold_percentage: number;
  alert_email: boolean;
  alert_webhook: boolean;
  alert_in_app: boolean;
  last_triggered_at?: string;
}

export class UsageTrackingService {
  private supabase;

  constructor() {
    this.supabase = createServerComponentClient<Database>({ cookies });
  }

  async recordUsage(
    subscriptionId: string,
    organizationId: string,
    metricName: string,
    quantity = 1,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    try {
      // Get subscription to determine current billing period
      const { data: subscription } = await this.supabase
        .from('user_subscriptions')
        .select(
          'current_period_start, current_period_end, plan:subscription_plans(limits)',
        )
        .eq('id', subscriptionId)
        .single();

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Check if usage would exceed limits
      const currentUsage = await this.getCurrentUsage(
        subscriptionId,
        metricName,
        subscription.current_period_start,
        subscription.current_period_end,
      );

      const limit = subscription.plan?.limits?.[metricName];
      if (limit && limit !== -1 && currentUsage.quantity + quantity > limit) {
        throw new Error(
          `Usage limit exceeded for ${metricName}. Current: ${currentUsage.quantity}, Limit: ${limit}`,
        );
      }

      // Record usage
      const { error: insertError } = await this.supabase
        .from('usage_records')
        .insert({
          subscription_id: subscriptionId,
          organization_id: organizationId,
          metric_name: metricName,
          quantity,
          period_start: subscription.current_period_start,
          period_end: subscription.current_period_end,
          metadata,
        });

      if (insertError) {
        throw new Error(`Failed to record usage: ${insertError.message}`);
      }

      // Check and trigger alerts
      await this.checkAndTriggerAlerts(subscriptionId, metricName);
    } catch (error) {
      console.error('Error recording usage:', error);
      throw error;
    }
  }

  async getCurrentUsage(
    subscriptionId: string,
    metricName: string,
    periodStart: string,
    periodEnd: string,
  ) {
    const { data: usage, error } = await this.supabase
      .from('usage_records')
      .select('quantity')
      .eq('subscription_id', subscriptionId)
      .eq('metric_name', metricName)
      .gte('recorded_at', periodStart)
      .lte('recorded_at', periodEnd);

    if (error) {
      throw new Error(`Failed to get current usage: ${error.message}`);
    }

    const totalQuantity =
      usage?.reduce((sum, record) => sum + record.quantity, 0) || 0;

    return {
      metric_name: metricName,
      quantity: totalQuantity,
      period_start: periodStart,
      period_end: periodEnd,
    };
  }

  async getUsageSummary(subscriptionId: string): Promise<UsageSummary[]> {
    try {
      // Get subscription with plan limits
      const { data: subscription } = await this.supabase
        .from('user_subscriptions')
        .select(
          `
          current_period_start,
          current_period_end,
          plan:subscription_plans(limits)
        `,
        )
        .eq('id', subscriptionId)
        .single();

      if (!subscription?.plan?.limits) {
        return [];
      }

      const limits = subscription.plan.limits;
      const usageSummary: UsageSummary[] = [];

      // Get alert thresholds for this subscription
      const { data: alerts } = await this.supabase
        .from('usage_alerts')
        .select('metric_name, threshold_percentage')
        .eq('subscription_id', subscriptionId);

      const alertMap =
        alerts?.reduce(
          (acc, alert) => {
            if (!acc[alert.metric_name]) acc[alert.metric_name] = [];
            acc[alert.metric_name].push(alert.threshold_percentage);
            return acc;
          },
          {} as Record<string, number[]>,
        ) || {};

      for (const [feature, limit] of Object.entries(limits)) {
        const currentUsage = await this.getCurrentUsage(
          subscriptionId,
          feature,
          subscription.current_period_start,
          subscription.current_period_end,
        );

        const limitValue = limit as number;
        const percentage =
          limitValue === -1 ? 0 : (currentUsage.quantity / limitValue) * 100;

        usageSummary.push({
          feature,
          current: currentUsage.quantity,
          limit: limitValue,
          percentage: Math.round(percentage * 100) / 100,
          resetDate: subscription.current_period_end,
          alertThresholds: alertMap[feature]?.sort((a, b) => a - b) || [],
        });
      }

      return usageSummary;
    } catch (error) {
      console.error('Error getting usage summary:', error);
      throw error;
    }
  }

  async setupUsageAlert({
    subscriptionId,
    metricName,
    thresholdPercentage,
    alertEmail = true,
    alertWebhook = false,
    alertInApp = true,
  }: {
    subscriptionId: string;
    metricName: string;
    thresholdPercentage: number;
    alertEmail?: boolean;
    alertWebhook?: boolean;
    alertInApp?: boolean;
  }): Promise<UsageAlert> {
    try {
      const { data: alert, error } = await this.supabase
        .from('usage_alerts')
        .upsert({
          subscription_id: subscriptionId,
          metric_name: metricName,
          threshold_percentage: thresholdPercentage,
          alert_email: alertEmail,
          alert_webhook: alertWebhook,
          alert_in_app: alertInApp,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to setup usage alert: ${error.message}`);
      }

      return alert;
    } catch (error) {
      console.error('Error setting up usage alert:', error);
      throw error;
    }
  }

  private async checkAndTriggerAlerts(
    subscriptionId: string,
    metricName: string,
  ): Promise<void> {
    try {
      // Get subscription with plan limits
      const { data: subscription } = await this.supabase
        .from('user_subscriptions')
        .select(
          `
          user_id,
          current_period_start,
          current_period_end,
          plan:subscription_plans(limits)
        `,
        )
        .eq('id', subscriptionId)
        .single();

      if (!subscription?.plan?.limits) return;

      const limit = subscription.plan.limits[metricName];
      if (!limit || limit === -1) return;

      // Get current usage
      const currentUsage = await this.getCurrentUsage(
        subscriptionId,
        metricName,
        subscription.current_period_start,
        subscription.current_period_end,
      );

      const usagePercentage = (currentUsage.quantity / limit) * 100;

      // Get alerts that should trigger
      const { data: alerts } = await this.supabase
        .from('usage_alerts')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .eq('metric_name', metricName)
        .lte('threshold_percentage', usagePercentage);

      if (!alerts?.length) return;

      // Filter alerts that haven't been triggered recently (within last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const alertsToTrigger = alerts.filter(
        (alert) =>
          !alert.last_triggered_at || alert.last_triggered_at < oneHourAgo,
      );

      for (const alert of alertsToTrigger) {
        await this.triggerAlert(alert, subscription.user_id, {
          metric_name: metricName,
          current_usage: currentUsage.quantity,
          limit,
          percentage: usagePercentage,
        });

        // Update last triggered timestamp
        await this.supabase
          .from('usage_alerts')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', alert.id);
      }
    } catch (error) {
      console.error('Error checking and triggering alerts:', error);
    }
  }

  private async triggerAlert(
    alert: UsageAlert,
    userId: string,
    usageData: {
      metric_name: string;
      current_usage: number;
      limit: number;
      percentage: number;
    },
  ): Promise<void> {
    try {
      const alertData = {
        alert_id: alert.id,
        user_id: userId,
        metric_name: usageData.metric_name,
        threshold: alert.threshold_percentage,
        current_usage: usageData.current_usage,
        limit: usageData.limit,
        percentage: Math.round(usageData.percentage * 100) / 100,
        timestamp: new Date().toISOString(),
      };

      // Send email alert
      if (alert.alert_email) {
        await this.sendEmailAlert(alertData);
      }

      // Create in-app notification
      if (alert.alert_in_app) {
        await this.createInAppNotification(alertData);
      }

      // Send webhook
      if (alert.alert_webhook) {
        await this.sendWebhookAlert(alertData);
      }

      console.log(
        `Usage alert triggered: ${usageData.metric_name} at ${alertData.percentage}%`,
      );
    } catch (error) {
      console.error('Error triggering alert:', error);
    }
  }

  private async sendEmailAlert(alertData: any): Promise<void> {
    // This would integrate with your email service
    // For now, we'll log the alert
    console.log('EMAIL ALERT:', {
      subject: `Usage Alert: ${alertData.metric_name} at ${alertData.percentage}%`,
      message: `Your ${alertData.metric_name} usage is at ${alertData.current_usage}/${alertData.limit} (${alertData.percentage}%)`,
      user_id: alertData.user_id,
    });

    // In a real implementation, you would:
    // 1. Get user email from database
    // 2. Send email via SendGrid, AWS SES, or similar
    // 3. Log the email send for tracking
  }

  private async createInAppNotification(alertData: any): Promise<void> {
    // This would create a notification in your notifications system
    console.log('IN-APP NOTIFICATION:', {
      title: 'Usage Limit Alert',
      message: `Your ${alertData.metric_name} usage is at ${alertData.percentage}%`,
      type: 'warning',
      user_id: alertData.user_id,
      metadata: alertData,
    });

    // In a real implementation, you would:
    // 1. Insert into notifications table
    // 2. Send real-time update via websocket
    // 3. Show toast/banner in UI
  }

  private async sendWebhookAlert(alertData: any): Promise<void> {
    // This would send webhook to configured URL
    console.log('WEBHOOK ALERT:', {
      event: 'usage.alert.triggered',
      data: alertData,
    });

    // In a real implementation, you would:
    // 1. Get webhook URL from user/org settings
    // 2. Send POST request to webhook URL
    // 3. Handle retries and failures
    // 4. Log webhook delivery status
  }

  async getUsageAnalytics(
    subscriptionId: string,
    startDate: string,
    endDate: string,
    metricName?: string,
  ) {
    let query = this.supabase
      .from('usage_records')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .gte('recorded_at', startDate)
      .lte('recorded_at', endDate)
      .order('recorded_at', { ascending: true });

    if (metricName) {
      query = query.eq('metric_name', metricName);
    }

    const { data: usage, error } = await query;

    if (error) {
      throw new Error(`Failed to get usage analytics: ${error.message}`);
    }

    // Group by metric and date for charting
    const analytics = usage?.reduce(
      (acc, record) => {
        const date = record.recorded_at.split('T')[0];
        const key = `${record.metric_name}-${date}`;

        if (!acc[key]) {
          acc[key] = {
            metric_name: record.metric_name,
            date,
            quantity: 0,
          };
        }

        acc[key].quantity += record.quantity;
        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(analytics || {});
  }

  async deleteUsageAlert(alertId: string): Promise<void> {
    const { error } = await this.supabase
      .from('usage_alerts')
      .delete()
      .eq('id', alertId);

    if (error) {
      throw new Error(`Failed to delete usage alert: ${error.message}`);
    }
  }
}
