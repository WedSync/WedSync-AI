/**
 * WS-217 Webhook Subscription Manager
 *
 * Microsoft Graph webhook subscription lifecycle management
 * Handles subscription creation, renewal, and health monitoring
 *
 * Wedding Industry Focus:
 * - Automatic subscription renewal to prevent missed wedding events
 * - Health monitoring for business-critical calendar synchronization
 * - Failure recovery and notification systems
 * - Priority handling for wedding season peaks
 *
 * @author WS-217-team-c
 * @version 1.0.0
 * @created 2025-01-22
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SubscriptionConfig {
  organizationId: string;
  accessToken: string;
  resource: string;
  changeTypes: string[];
  notificationUrl: string;
  expirationDateTime: Date;
  clientState?: string;
}

export interface SubscriptionStatus {
  id: string;
  subscriptionId: string;
  organizationId: string;
  status: 'active' | 'expired' | 'failed' | 'renewing';
  expiresAt: Date;
  lastRenewalAt?: Date;
  failureCount: number;
  healthScore: number;
}

export interface RenewalResult {
  renewedCount: number;
  failedRenewals: Array<{
    subscriptionId: string;
    error: string;
    organizationId: string;
  }>;
}

export class WebhookSubscriptionManager {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Create new Microsoft Graph webhook subscription
   * Sets up 3-day subscription with auto-renewal scheduling
   */
  async createSubscription(config: SubscriptionConfig): Promise<{
    success: boolean;
    subscriptionId?: string;
    expirationDateTime?: Date;
    error?: string;
  }> {
    try {
      // 1. Validate configuration
      const validationResult = await this.validateSubscriptionConfig(config);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Invalid configuration: ${validationResult.errors.join(', ')}`,
        };
      }

      // 2. Create Microsoft Graph subscription
      const graphSubscription = await this.createGraphSubscription(config);

      // 3. Store subscription in database
      const { data: subscription, error } = await this.supabase
        .from('outlook_subscriptions')
        .insert({
          organization_id: config.organizationId,
          subscription_id: graphSubscription.id,
          resource: config.resource,
          change_types: config.changeTypes,
          notification_url: config.notificationUrl,
          expires_at: graphSubscription.expirationDateTime,
          client_state: config.clientState,
          access_token_encrypted: await this.encryptToken(config.accessToken),
          status: 'active',
          created_at: new Date().toISOString(),
          health_score: 100,
          failure_count: 0,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store subscription: ${error.message}`);
      }

      // 4. Schedule automatic renewal (12 hours before expiration)
      await this.scheduleRenewal(
        subscription.id,
        new Date(graphSubscription.expirationDateTime),
      );

      // 5. Set up health monitoring
      await this.setupHealthMonitoring(subscription.id);

      console.log(
        `✅ Created Outlook webhook subscription ${graphSubscription.id} for org ${config.organizationId}`,
      );

      return {
        success: true,
        subscriptionId: graphSubscription.id,
        expirationDateTime: new Date(graphSubscription.expirationDateTime),
      };
    } catch (error) {
      console.error('Failed to create webhook subscription:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown subscription creation error',
      };
    }
  }

  /**
   * Renew expiring subscriptions
   * Runs automatically every hour to check for subscriptions expiring within 12 hours
   */
  async renewExpiringSubscriptions(): Promise<RenewalResult> {
    const result: RenewalResult = {
      renewedCount: 0,
      failedRenewals: [],
    };

    try {
      // Get subscriptions expiring within 12 hours
      const expirationThreshold = new Date(Date.now() + 12 * 60 * 60 * 1000);

      const { data: expiringSubscriptions, error } = await this.supabase
        .from('outlook_subscriptions')
        .select('*')
        .eq('status', 'active')
        .lt('expires_at', expirationThreshold.toISOString());

      if (error) {
        throw new Error(
          `Failed to fetch expiring subscriptions: ${error.message}`,
        );
      }

      if (!expiringSubscriptions?.length) {
        console.log('No subscriptions need renewal');
        return result;
      }

      console.log(
        `🔄 Renewing ${expiringSubscriptions.length} expiring subscriptions`,
      );

      // Process each expiring subscription
      for (const subscription of expiringSubscriptions) {
        try {
          await this.renewSingleSubscription(subscription);
          result.renewedCount++;

          console.log(
            `✅ Renewed subscription ${subscription.subscription_id}`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown renewal error';

          result.failedRenewals.push({
            subscriptionId: subscription.subscription_id,
            error: errorMessage,
            organizationId: subscription.organization_id,
          });

          // Update failure count and status
          await this.recordRenewalFailure(subscription.id, errorMessage);

          console.error(
            `❌ Failed to renew subscription ${subscription.subscription_id}:`,
            errorMessage,
          );
        }
      }

      // Send notifications for failed renewals
      if (result.failedRenewals.length > 0) {
        await this.notifyRenewalFailures(result.failedRenewals);
      }

      return result;
    } catch (error) {
      console.error('Subscription renewal process failed:', error);
      return result;
    }
  }

  /**
   * Get subscription health status
   */
  async getSubscriptionStatus(
    subscriptionId: string,
  ): Promise<SubscriptionStatus | null> {
    try {
      const { data: subscription, error } = await this.supabase
        .from('outlook_subscriptions')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .single();

      if (error || !subscription) {
        return null;
      }

      return {
        id: subscription.id,
        subscriptionId: subscription.subscription_id,
        organizationId: subscription.organization_id,
        status: subscription.status,
        expiresAt: new Date(subscription.expires_at),
        lastRenewalAt: subscription.last_renewal_at
          ? new Date(subscription.last_renewal_at)
          : undefined,
        failureCount: subscription.failure_count || 0,
        healthScore: subscription.health_score || 100,
      };
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      return null;
    }
  }

  /**
   * Delete subscription (cleanup)
   */
  async deleteSubscription(
    subscriptionId: string,
    organizationId: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // 1. Delete from Microsoft Graph
      await this.deleteGraphSubscription(subscriptionId);

      // 2. Remove from database
      const { error } = await this.supabase
        .from('outlook_subscriptions')
        .delete()
        .eq('subscription_id', subscriptionId)
        .eq('organization_id', organizationId);

      if (error) {
        throw new Error(
          `Failed to delete subscription from database: ${error.message}`,
        );
      }

      console.log(
        `🗑️ Deleted subscription ${subscriptionId} for org ${organizationId}`,
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to delete subscription:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown deletion error',
      };
    }
  }

  /**
   * Monitor subscription health
   */
  async monitorSubscriptionHealth(): Promise<{
    totalSubscriptions: number;
    healthySubscriptions: number;
    unhealthySubscriptions: number;
    criticalSubscriptions: number;
  }> {
    const { data: subscriptions } = await this.supabase
      .from('outlook_subscriptions')
      .select('health_score, failure_count, status');

    if (!subscriptions) {
      return {
        totalSubscriptions: 0,
        healthySubscriptions: 0,
        unhealthySubscriptions: 0,
        criticalSubscriptions: 0,
      };
    }

    const healthy = subscriptions.filter(
      (s) => s.health_score >= 80 && s.failure_count < 3,
    );
    const unhealthy = subscriptions.filter(
      (s) => s.health_score < 80 && s.health_score >= 50,
    );
    const critical = subscriptions.filter(
      (s) => s.health_score < 50 || s.failure_count >= 5,
    );

    return {
      totalSubscriptions: subscriptions.length,
      healthySubscriptions: healthy.length,
      unhealthySubscriptions: unhealthy.length,
      criticalSubscriptions: critical.length,
    };
  }

  /**
   * Private helper methods
   */
  private async validateSubscriptionConfig(
    config: SubscriptionConfig,
  ): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!config.organizationId) errors.push('Organization ID required');
    if (!config.accessToken) errors.push('Access token required');
    if (!config.resource) errors.push('Resource required');
    if (!config.changeTypes?.length) errors.push('Change types required');
    if (!config.notificationUrl) errors.push('Notification URL required');

    // Validate URL format
    if (
      config.notificationUrl &&
      !config.notificationUrl.startsWith('https://')
    ) {
      errors.push('Notification URL must use HTTPS');
    }

    // Validate resource format
    if (config.resource && !config.resource.startsWith('/')) {
      errors.push('Resource must start with /');
    }

    // Validate change types
    const validChangeTypes = ['created', 'updated', 'deleted'];
    const invalidTypes = config.changeTypes?.filter(
      (type) => !validChangeTypes.includes(type),
    );
    if (invalidTypes?.length) {
      errors.push(`Invalid change types: ${invalidTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private async createGraphSubscription(config: SubscriptionConfig): Promise<{
    id: string;
    expirationDateTime: string;
  }> {
    const subscriptionData = {
      changeType: config.changeTypes.join(','),
      notificationUrl: config.notificationUrl,
      resource: config.resource,
      expirationDateTime: config.expirationDateTime.toISOString(),
      clientState: config.clientState || this.generateClientState(),
    };

    // Mock Microsoft Graph API call for testing
    // In production, this would make an actual HTTP request to:
    // POST https://graph.microsoft.com/v1.0/subscriptions
    return {
      id:
        'subscription-' +
        Date.now() +
        '-' +
        Math.random().toString(36).substr(2, 9),
      expirationDateTime: subscriptionData.expirationDateTime,
    };
  }

  private async renewSingleSubscription(subscription: any): Promise<void> {
    try {
      // 1. Mark as renewing
      await this.supabase
        .from('outlook_subscriptions')
        .update({ status: 'renewing' })
        .eq('id', subscription.id);

      // 2. Decrypt access token
      const accessToken = await this.decryptToken(
        subscription.access_token_encrypted,
      );

      // 3. Calculate new expiration (3 days from now)
      const newExpirationDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      // 4. Renew in Microsoft Graph
      await this.updateGraphSubscription(subscription.subscription_id, {
        expirationDateTime: newExpirationDate.toISOString(),
      });

      // 5. Update database
      await this.supabase
        .from('outlook_subscriptions')
        .update({
          expires_at: newExpirationDate.toISOString(),
          last_renewal_at: new Date().toISOString(),
          status: 'active',
          failure_count: 0, // Reset failure count on successful renewal
          health_score: Math.min(100, (subscription.health_score || 80) + 10), // Boost health score
        })
        .eq('id', subscription.id);

      // 6. Schedule next renewal
      await this.scheduleRenewal(subscription.id, newExpirationDate);
    } catch (error) {
      // Mark as failed
      await this.supabase
        .from('outlook_subscriptions')
        .update({ status: 'failed' })
        .eq('id', subscription.id);

      throw error;
    }
  }

  private async updateGraphSubscription(
    subscriptionId: string,
    updates: any,
  ): Promise<void> {
    // Mock Microsoft Graph API call for testing
    // In production, this would make an actual HTTP request to:
    // PATCH https://graph.microsoft.com/v1.0/subscriptions/{subscriptionId}
    console.log(`Updating Graph subscription ${subscriptionId}:`, updates);
  }

  private async deleteGraphSubscription(subscriptionId: string): Promise<void> {
    // Mock Microsoft Graph API call for testing
    // In production, this would make an actual HTTP request to:
    // DELETE https://graph.microsoft.com/v1.0/subscriptions/{subscriptionId}
    console.log(`Deleting Graph subscription ${subscriptionId}`);
  }

  private async recordRenewalFailure(
    subscriptionId: string,
    error: string,
  ): Promise<void> {
    const { data: subscription } = await this.supabase
      .from('outlook_subscriptions')
      .select('failure_count, health_score')
      .eq('id', subscriptionId)
      .single();

    const newFailureCount = (subscription?.failure_count || 0) + 1;
    const newHealthScore = Math.max(
      0,
      (subscription?.health_score || 100) - 20,
    );

    await this.supabase
      .from('outlook_subscriptions')
      .update({
        failure_count: newFailureCount,
        health_score: newHealthScore,
        status: newFailureCount >= 5 ? 'failed' : 'active',
        last_error: error,
        last_error_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);
  }

  private async scheduleRenewal(
    subscriptionId: string,
    expirationDate: Date,
  ): Promise<void> {
    // Calculate renewal time (12 hours before expiration)
    const renewalTime = new Date(
      expirationDate.getTime() - 12 * 60 * 60 * 1000,
    );

    await this.supabase.from('subscription_renewal_schedule').upsert(
      {
        subscription_id: subscriptionId,
        renewal_scheduled_for: renewalTime.toISOString(),
        status: 'scheduled',
      },
      {
        onConflict: 'subscription_id',
      },
    );

    console.log(
      `📅 Scheduled renewal for subscription ${subscriptionId} at ${renewalTime.toISOString()}`,
    );
  }

  private async setupHealthMonitoring(subscriptionId: string): Promise<void> {
    // Initialize health monitoring record
    await this.supabase.from('subscription_health_log').insert({
      subscription_id: subscriptionId,
      health_check_at: new Date().toISOString(),
      status: 'healthy',
      response_time_ms: 0,
      error_count: 0,
    });
  }

  private async notifyRenewalFailures(failures: Array<any>): Promise<void> {
    // In production, this would send notifications to admins/users
    console.error('🚨 Subscription renewal failures:', failures);

    // Log to system alert table
    for (const failure of failures) {
      await this.supabase.from('system_alerts').insert({
        alert_type: 'subscription_renewal_failure',
        severity: 'high',
        organization_id: failure.organizationId,
        message: `Failed to renew Outlook calendar subscription: ${failure.error}`,
        metadata: { subscriptionId: failure.subscriptionId },
        created_at: new Date().toISOString(),
      });
    }
  }

  private generateClientState(): string {
    return (
      'wedsync-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    );
  }

  private async encryptToken(token: string): Promise<string> {
    // In production, this would use proper encryption (AES-256-GCM)
    return Buffer.from(token).toString('base64');
  }

  private async decryptToken(encryptedToken: string): Promise<string> {
    // In production, this would decrypt the token
    return Buffer.from(encryptedToken, 'base64').toString('utf-8');
  }
}
