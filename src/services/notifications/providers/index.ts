// Notification Channel Providers
// Central export point for all notification delivery providers

export { EmailNotificationProvider } from './EmailProvider';
export { SMSNotificationProvider } from './SMSProvider';
export { PushNotificationProvider } from './PushProvider';
export { VoiceNotificationProvider } from './VoiceProvider';
export { WebhookNotificationProvider } from './WebhookProvider';
export { InAppNotificationProvider } from './InAppProvider';

// Provider factory for creating instances
import type { NotificationChannelProvider } from '../../../types/notification-backend';

export type ProviderType =
  | 'email'
  | 'sms'
  | 'push'
  | 'voice'
  | 'webhook'
  | 'in_app';

export class NotificationProviderFactory {
  private static providers = new Map<
    ProviderType,
    NotificationChannelProvider
  >();

  static getProvider(type: ProviderType): NotificationChannelProvider {
    if (!this.providers.has(type)) {
      this.providers.set(type, this.createProvider(type));
    }
    return this.providers.get(type)!;
  }

  private static createProvider(
    type: ProviderType,
  ): NotificationChannelProvider {
    switch (type) {
      case 'email':
        return new (require('./EmailProvider').EmailNotificationProvider)();
      case 'sms':
        return new (require('./SMSProvider').SMSNotificationProvider)();
      case 'push':
        return new (require('./PushProvider').PushNotificationProvider)();
      case 'voice':
        return new (require('./VoiceProvider').VoiceNotificationProvider)();
      case 'webhook':
        return new (require('./WebhookProvider').WebhookNotificationProvider)();
      case 'in_app':
        return new (require('./InAppProvider').InAppNotificationProvider)();
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  // Health check for all providers
  static async healthCheck(): Promise<
    Record<
      ProviderType,
      { healthy: boolean; latency: number; errorRate: number }
    >
  > {
    const results: Record<string, any> = {};
    const providerTypes: ProviderType[] = [
      'email',
      'sms',
      'push',
      'voice',
      'webhook',
      'in_app',
    ];

    await Promise.allSettled(
      providerTypes.map(async (type) => {
        try {
          const provider = this.getProvider(type);
          const status = await provider.getProviderStatus();
          results[type] = status;
        } catch (error) {
          results[type] = {
            healthy: false,
            latency: 0,
            errorRate: 1,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }),
    );

    return results as Record<
      ProviderType,
      { healthy: boolean; latency: number; errorRate: number }
    >;
  }

  // Clear cached providers (useful for testing)
  static clearCache(): void {
    this.providers.clear();
  }
}

// Wedding-specific provider recommendations based on event type and priority
export class WeddingProviderRecommendations {
  static getRecommendedChannels(
    eventType: string,
    priority: string,
    userPreferences?: {
      emergencyChannels?: ProviderType[];
      highPriorityChannels?: ProviderType[];
      defaultChannels?: ProviderType[];
    },
  ): ProviderType[] {
    const prefs = userPreferences || {};

    switch (priority) {
      case 'emergency':
        return (
          prefs.emergencyChannels || ['voice', 'sms', 'push', 'in_app', 'email']
        );

      case 'high':
        return prefs.highPriorityChannels || ['sms', 'push', 'in_app', 'email'];

      case 'medium':
        return prefs.defaultChannels || ['push', 'in_app', 'email'];

      default: // low
        return prefs.defaultChannels || ['in_app', 'email'];
    }
  }

  static getWeddingDayChannels(): ProviderType[] {
    // On wedding day, use all available channels for maximum reliability
    return ['voice', 'sms', 'push', 'in_app', 'email'];
  }

  static getVendorCommunicationChannels(): ProviderType[] {
    // For vendor-to-vendor communication
    return ['sms', 'push', 'in_app', 'email', 'webhook'];
  }

  static getCoupleCommunicationChannels(): ProviderType[] {
    // For communicating with couples (gentler approach)
    return ['push', 'in_app', 'email'];
  }
}

// Export types for external use
export type {
  NotificationChannelProvider,
  ProcessedNotification,
  NotificationDeliveryResult,
  NotificationEvent,
} from '../../../types/notification-backend';
