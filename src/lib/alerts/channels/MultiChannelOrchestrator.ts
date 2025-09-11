/**
 * WS-101 Multi-Channel Alert Orchestrator
 * Central system for coordinating alerts across all notification channels
 * with wedding-critical reliability and sub-100ms failover
 */

import { Alert, AlertSeverity, AlertType } from '../Alert';
import { WeddingContext } from '../../types/wedding-day';

export interface ChannelConfig {
  id: string;
  name: string;
  type: 'slack' | 'sms' | 'email' | 'push' | 'webhook';
  priority: number; // 1 = highest priority
  enabled: boolean;
  healthStatus: 'healthy' | 'degraded' | 'failed';
  rateLimit: {
    messagesPerMinute: number;
    burstLimit: number;
  };
  weddingDayCapacity: number; // Enhanced capacity for wedding day
  failoverChannels: string[]; // Backup channel IDs
  messageFormats: string[]; // Supported message formats
}

export interface RoutingRule {
  id: string;
  name: string;
  conditions: {
    alertTypes?: AlertType[];
    severities?: AlertSeverity[];
    weddingDay?: boolean;
    timeOfDay?: { start: number; end: number };
  };
  channels: string[]; // Channel IDs in priority order
  enabled: boolean;
}

export interface DeliveryResult {
  channelId: string;
  success: boolean;
  latency: number;
  error?: string;
  fallbackUsed: boolean;
  timestamp: number;
}

export class MultiChannelOrchestrator {
  private channels: Map<string, ChannelConfig> = new Map();
  private routingRules: RoutingRule[] = [];
  private channelInstances: Map<string, any> = new Map();
  private healthMonitor: NodeJS.Timeout | null = null;
  private deliveryMetrics: Map<string, DeliveryMetric[]> = new Map();

  constructor() {
    this.initializeDefaultRouting();
    this.startHealthMonitoring();
  }

  /**
   * Register a notification channel with the orchestrator
   */
  registerChannel(config: ChannelConfig, instance: any): void {
    this.channels.set(config.id, config);
    this.channelInstances.set(config.id, instance);
    this.deliveryMetrics.set(config.id, []);

    console.log(`📡 Registered channel: ${config.name} (${config.type})`);
  }

  /**
   * Send alert through optimal channels with automatic failover
   */
  async sendAlert(
    alert: Alert,
    context?: WeddingContext,
  ): Promise<DeliveryResult[]> {
    const startTime = Date.now();
    const results: DeliveryResult[] = [];

    try {
      // Determine optimal channels for this alert
      const targetChannels = this.selectChannels(alert, context);

      if (targetChannels.length === 0) {
        throw new Error('No suitable channels found for alert');
      }

      // Send through primary channels first
      const primaryResults = await this.sendThroughChannels(
        targetChannels.slice(0, 2), // Top 2 channels
        alert,
        context,
      );

      results.push(...primaryResults);

      // Check if we need failover
      const successfulDeliveries = primaryResults.filter((r) => r.success);
      const isWeddingCritical = this.isWeddingCriticalAlert(alert, context);

      // For wedding-critical alerts, ensure at least 2 successful deliveries
      if (isWeddingCritical && successfulDeliveries.length < 2) {
        const failoverResults = await this.executeFailover(
          targetChannels,
          primaryResults,
          alert,
          context,
        );
        results.push(...failoverResults);
      }

      // Update delivery metrics
      this.updateDeliveryMetrics(results);

      return results;
    } catch (error) {
      console.error('Multi-channel alert delivery failed:', error);

      // Emergency fallback for critical alerts
      if (this.isWeddingCriticalAlert(alert, context)) {
        const emergencyResults = await this.emergencyFallback(alert, context);
        results.push(...emergencyResults);
      }

      return results;
    }
  }

  /**
   * Select optimal channels based on alert properties and routing rules
   */
  private selectChannels(
    alert: Alert,
    context?: WeddingContext,
  ): ChannelConfig[] {
    const isWeddingDay = context?.isWeddingDay || false;
    const currentHour = new Date().getHours();

    // Find matching routing rules
    const matchingRules = this.routingRules.filter((rule) => {
      if (!rule.enabled) return false;

      // Check alert type
      if (
        rule.conditions.alertTypes &&
        !rule.conditions.alertTypes.includes(alert.type)
      ) {
        return false;
      }

      // Check severity
      if (
        rule.conditions.severities &&
        !rule.conditions.severities.includes(alert.severity)
      ) {
        return false;
      }

      // Check wedding day condition
      if (
        rule.conditions.weddingDay !== undefined &&
        rule.conditions.weddingDay !== isWeddingDay
      ) {
        return false;
      }

      // Check time of day
      if (rule.conditions.timeOfDay) {
        const { start, end } = rule.conditions.timeOfDay;
        if (currentHour < start || currentHour > end) {
          return false;
        }
      }

      return true;
    });

    // Get channels from matching rules
    const ruleChannels = matchingRules.flatMap((rule) => rule.channels);

    // Get healthy channels
    const availableChannels = Array.from(this.channels.values())
      .filter(
        (channel) =>
          channel.enabled &&
          channel.healthStatus !== 'failed' &&
          (ruleChannels.length === 0 || ruleChannels.includes(channel.id)),
      )
      .sort((a, b) => {
        // Priority sort: wedding day capacity, then priority, then health
        if (isWeddingDay) {
          return b.weddingDayCapacity - a.weddingDayCapacity;
        }

        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }

        // Prefer healthy channels over degraded ones
        if (a.healthStatus !== b.healthStatus) {
          return a.healthStatus === 'healthy' ? -1 : 1;
        }

        return 0;
      });

    return availableChannels;
  }

  /**
   * Send alert through specified channels
   */
  private async sendThroughChannels(
    channels: ChannelConfig[],
    alert: Alert,
    context?: WeddingContext,
  ): Promise<DeliveryResult[]> {
    const results: Promise<DeliveryResult>[] = [];

    for (const channel of channels) {
      const channelInstance = this.channelInstances.get(channel.id);
      if (!channelInstance) continue;

      const deliveryPromise = this.sendThroughSingleChannel(
        channel,
        channelInstance,
        alert,
        context,
      );

      results.push(deliveryPromise);
    }

    return Promise.all(results);
  }

  /**
   * Send alert through a single channel with error handling
   */
  private async sendThroughSingleChannel(
    channel: ChannelConfig,
    instance: any,
    alert: Alert,
    context?: WeddingContext,
  ): Promise<DeliveryResult> {
    const startTime = Date.now();

    try {
      // Format message for this channel type
      const formattedAlert = this.formatAlertForChannel(
        alert,
        channel,
        context,
      );

      // Send through channel instance
      await instance.send(formattedAlert, context);

      const latency = Date.now() - startTime;

      return {
        channelId: channel.id,
        success: true,
        latency,
        fallbackUsed: false,
        timestamp: Date.now(),
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      return {
        channelId: channel.id,
        success: false,
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: false,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Execute failover to backup channels
   */
  private async executeFailover(
    allChannels: ChannelConfig[],
    primaryResults: DeliveryResult[],
    alert: Alert,
    context?: WeddingContext,
  ): Promise<DeliveryResult[]> {
    console.log('🔄 Executing alert delivery failover');

    const failedChannelIds = primaryResults
      .filter((r) => !r.success)
      .map((r) => r.channelId);

    const failoverChannels = allChannels
      .filter(
        (channel) =>
          !primaryResults.some((r) => r.channelId === channel.id) && // Not already tried
          channel.enabled &&
          channel.healthStatus !== 'failed',
      )
      .slice(0, 3); // Maximum 3 failover channels

    const failoverResults = await this.sendThroughChannels(
      failoverChannels,
      alert,
      context,
    );

    // Mark as failover
    failoverResults.forEach((result) => {
      result.fallbackUsed = true;
    });

    return failoverResults;
  }

  /**
   * Emergency fallback for critical alerts
   */
  private async emergencyFallback(
    alert: Alert,
    context?: WeddingContext,
  ): Promise<DeliveryResult[]> {
    console.log('🚨 Executing emergency fallback for critical alert');

    // Try to send through ANY available channel
    const emergencyChannels = Array.from(this.channels.values())
      .filter((channel) => channel.enabled)
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5); // Try up to 5 channels

    const results: DeliveryResult[] = [];

    for (const channel of emergencyChannels) {
      try {
        const instance = this.channelInstances.get(channel.id);
        if (!instance) continue;

        const result = await this.sendThroughSingleChannel(
          channel,
          instance,
          alert,
          context,
        );

        result.fallbackUsed = true;
        results.push(result);

        // If we get one success, that's enough for emergency fallback
        if (result.success) {
          break;
        }
      } catch (error) {
        console.error(
          `Emergency fallback failed for channel ${channel.id}:`,
          error,
        );
      }
    }

    return results;
  }

  /**
   * Format alert message for specific channel requirements
   */
  private formatAlertForChannel(
    alert: Alert,
    channel: ChannelConfig,
    context?: WeddingContext,
  ): Alert {
    const formattedAlert = { ...alert };

    switch (channel.type) {
      case 'sms':
        // SMS requires short messages
        formattedAlert.title = this.truncateText(alert.title, 50);
        formattedAlert.message = this.truncateText(alert.message, 140);
        break;

      case 'slack':
        // Slack supports rich formatting
        if (context?.isWeddingDay) {
          formattedAlert.title = `🎊 WEDDING DAY: ${alert.title}`;
        }
        break;

      case 'email':
        // Email can include full details
        if (context) {
          formattedAlert.message += `\n\nWedding Details:\n`;
          formattedAlert.message += `- Couple: ${context.coupleName}\n`;
          formattedAlert.message += `- Date: ${context.weddingDate?.toLocaleDateString()}\n`;
          formattedAlert.message += `- Venue: ${context.venue}\n`;
        }
        break;

      case 'push':
        // Push notifications need concise titles
        formattedAlert.title = this.truncateText(alert.title, 65);
        formattedAlert.message = this.truncateText(alert.message, 240);
        break;
    }

    return formattedAlert;
  }

  /**
   * Initialize default routing rules
   */
  private initializeDefaultRouting(): void {
    this.routingRules = [
      {
        id: 'wedding_emergency',
        name: 'Wedding Emergency Alerts',
        conditions: {
          severities: [
            AlertSeverity.WEDDING_EMERGENCY,
            AlertSeverity.VENDOR_CRITICAL,
            AlertSeverity.TIMELINE_CRITICAL,
          ],
          weddingDay: true,
        },
        channels: ['slack', 'sms', 'push'], // All high-speed channels
        enabled: true,
      },
      {
        id: 'critical_alerts',
        name: 'Critical System Alerts',
        conditions: {
          severities: [AlertSeverity.CRITICAL, AlertSeverity.SYSTEM_DOWN],
        },
        channels: ['slack', 'sms', 'email'],
        enabled: true,
      },
      {
        id: 'vendor_alerts',
        name: 'Vendor-Related Alerts',
        conditions: {
          alertTypes: [AlertType.VENDOR_ALERT],
        },
        channels: ['slack', 'sms'],
        enabled: true,
      },
      {
        id: 'business_hours',
        name: 'Business Hours Routing',
        conditions: {
          timeOfDay: { start: 9, end: 17 },
        },
        channels: ['slack', 'email'],
        enabled: true,
      },
      {
        id: 'after_hours',
        name: 'After Hours Routing',
        conditions: {
          timeOfDay: { start: 17, end: 9 },
        },
        channels: ['sms', 'push', 'email'],
        enabled: true,
      },
    ];
  }

  /**
   * Health monitoring for all channels
   */
  private startHealthMonitoring(): void {
    this.healthMonitor = setInterval(async () => {
      await this.performHealthChecks();
    }, 30000); // Every 30 seconds
  }

  private async performHealthChecks(): Promise<void> {
    for (const [channelId, channel] of this.channels) {
      try {
        const instance = this.channelInstances.get(channelId);
        if (!instance) continue;

        const isHealthy = await this.checkChannelHealth(instance, channel);

        // Update health status
        const previousStatus = channel.healthStatus;
        channel.healthStatus = isHealthy ? 'healthy' : 'degraded';

        // Log status changes
        if (previousStatus !== channel.healthStatus) {
          console.log(
            `📡 Channel ${channel.name} status: ${previousStatus} → ${channel.healthStatus}`,
          );
        }
      } catch (error) {
        channel.healthStatus = 'failed';
        console.error(`❌ Channel ${channel.name} health check failed:`, error);
      }
    }
  }

  private async checkChannelHealth(
    instance: any,
    channel: ChannelConfig,
  ): Promise<boolean> {
    try {
      // Try to call health check method if available
      if (typeof instance.isHealthy === 'function') {
        return await instance.isHealthy();
      }

      // Fallback: try to send a test message
      const testAlert = {
        id: `health_check_${Date.now()}`,
        title: 'Health Check',
        message: 'Channel health verification',
        type: AlertType.SYSTEM,
        severity: AlertSeverity.LOW,
        timestamp: new Date(),
        metadata: { healthCheck: true, silent: true },
      };

      await instance.send(testAlert);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Utility methods
   */
  private isWeddingCriticalAlert(
    alert: Alert,
    context?: WeddingContext,
  ): boolean {
    const weddingCriticalSeverities = [
      AlertSeverity.WEDDING_EMERGENCY,
      AlertSeverity.VENDOR_CRITICAL,
      AlertSeverity.TIMELINE_CRITICAL,
    ];

    const weddingCriticalTypes = [
      AlertType.WEDDING_CRITICAL,
      AlertType.VENDOR_ALERT,
      AlertType.PAYMENT_URGENT,
    ];

    return (
      context?.isWeddingDay === true ||
      weddingCriticalSeverities.includes(alert.severity) ||
      weddingCriticalTypes.includes(alert.type)
    );
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private updateDeliveryMetrics(results: DeliveryResult[]): void {
    for (const result of results) {
      const metrics = this.deliveryMetrics.get(result.channelId);
      if (metrics) {
        metrics.push({
          timestamp: result.timestamp,
          success: result.success,
          latency: result.latency,
          fallbackUsed: result.fallbackUsed,
        });

        // Keep only last 1000 metrics
        if (metrics.length > 1000) {
          metrics.shift();
        }
      }
    }
  }

  /**
   * Public API methods for monitoring and management
   */
  getChannelStatus(): Map<string, ChannelConfig> {
    return new Map(this.channels);
  }

  getDeliveryMetrics(channelId: string): DeliveryMetric[] {
    return this.deliveryMetrics.get(channelId) || [];
  }

  updateRoutingRule(rule: RoutingRule): void {
    const index = this.routingRules.findIndex((r) => r.id === rule.id);
    if (index >= 0) {
      this.routingRules[index] = rule;
    } else {
      this.routingRules.push(rule);
    }
  }

  enableWeddingDayMode(weddingId: string): void {
    console.log(`🎊 Enabling wedding day mode for ${weddingId}`);

    // Increase capacity for all channels
    for (const channel of this.channels.values()) {
      channel.rateLimit.messagesPerMinute *= 2;
      channel.rateLimit.burstLimit *= 2;
    }

    // Enable wedding-specific routing rules
    const weddingRules = this.routingRules.filter(
      (r) => r.conditions.weddingDay === true,
    );
    weddingRules.forEach((rule) => (rule.enabled = true));
  }

  disableWeddingDayMode(weddingId: string): void {
    console.log(`📋 Disabling wedding day mode for ${weddingId}`);

    // Reset capacity limits
    for (const channel of this.channels.values()) {
      channel.rateLimit.messagesPerMinute /= 2;
      channel.rateLimit.burstLimit /= 2;
    }
  }

  shutdown(): void {
    if (this.healthMonitor) {
      clearInterval(this.healthMonitor);
      this.healthMonitor = null;
    }
  }
}

interface DeliveryMetric {
  timestamp: number;
  success: boolean;
  latency: number;
  fallbackUsed: boolean;
}

export default MultiChannelOrchestrator;
