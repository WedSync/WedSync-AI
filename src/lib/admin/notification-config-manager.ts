import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  AlertPriority,
  NotificationChannel,
  NotificationConfig,
} from './alert-notification-service';

// Validation schemas
const NotificationConfigSchema = z.object({
  adminUserId: z.string().uuid(),
  channel: z.nativeEnum(NotificationChannel),
  priority: z.array(z.nativeEnum(AlertPriority)),
  alertTypes: z.array(z.string()),
  enabled: z.boolean().default(true),
  settings: z.record(z.any()),
  quietHours: z
    .object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      timezone: z.string(),
    })
    .optional(),
});

const UpdateConfigSchema = NotificationConfigSchema.partial().omit([
  'adminUserId',
]);

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  timezone: string;
  isActive: boolean;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  emailAddress: string;
  slackEnabled: boolean;
  slackUserId?: string;
  slackChannel?: string;
  slackWebhookUrl?: string;
  smsEnabled: boolean;
  smsNumber?: string;
  pushEnabled: boolean;
  webhookEnabled: boolean;
  webhookUrl?: string;
}

export interface AlertTypeConfig {
  type: string;
  name: string;
  description: string;
  defaultPriority: AlertPriority;
  category: string;
  isUserConfigurable: boolean;
}

export class NotificationConfigManager {
  private supabase = createClient();

  constructor() {}

  /**
   * Get all notification configurations for an admin user
   */
  async getUserConfigurations(
    adminUserId: string,
  ): Promise<NotificationConfig[]> {
    const { data, error } = await this.supabase
      .from('admin_notification_configs')
      .select('*')
      .eq('admin_user_id', adminUserId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch notification configurations: ${error.message}`,
      );
    }

    return data || [];
  }

  /**
   * Create or update notification configuration
   */
  async upsertConfiguration(
    adminUserId: string,
    channel: NotificationChannel,
    configData: Partial<NotificationConfig>,
  ): Promise<NotificationConfig> {
    const validated = NotificationConfigSchema.parse({
      adminUserId,
      channel,
      ...configData,
    });

    // Check if configuration already exists
    const { data: existing } = await this.supabase
      .from('admin_notification_configs')
      .select('id')
      .eq('admin_user_id', adminUserId)
      .eq('channel', channel)
      .single();

    let result;

    if (existing) {
      // Update existing configuration
      const { data, error } = await this.supabase
        .from('admin_notification_configs')
        .update({
          priority: validated.priority,
          alert_types: validated.alertTypes,
          enabled: validated.enabled,
          settings: validated.settings,
          quiet_hours: validated.quietHours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(
          `Failed to update notification configuration: ${error.message}`,
        );
      }
      result = data;
    } else {
      // Create new configuration
      const { data, error } = await this.supabase
        .from('admin_notification_configs')
        .insert({
          id: crypto.randomUUID(),
          admin_user_id: validated.adminUserId,
          channel: validated.channel,
          priority: validated.priority,
          alert_types: validated.alertTypes,
          enabled: validated.enabled,
          settings: validated.settings,
          quiet_hours: validated.quietHours,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(
          `Failed to create notification configuration: ${error.message}`,
        );
      }
      result = data;
    }

    // Log configuration change
    await this.logConfigurationChange(
      adminUserId,
      channel,
      existing ? 'updated' : 'created',
      {
        enabled: validated.enabled,
        priority: validated.priority,
        alertTypes: validated.alertTypes,
      },
    );

    return result;
  }

  /**
   * Delete notification configuration
   */
  async deleteConfiguration(
    adminUserId: string,
    configId: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('admin_notification_configs')
      .delete()
      .eq('id', configId)
      .eq('admin_user_id', adminUserId);

    if (error) {
      throw new Error(
        `Failed to delete notification configuration: ${error.message}`,
      );
    }

    await this.logConfigurationChange(adminUserId, 'deleted', 'deleted', {
      configId,
    });
  }

  /**
   * Set default configurations for new admin user
   */
  async setupDefaultConfigurations(
    adminUser: AdminUser,
  ): Promise<NotificationConfig[]> {
    const defaultConfigs = this.getDefaultConfigurations(adminUser);
    const results: NotificationConfig[] = [];

    for (const config of defaultConfigs) {
      try {
        const result = await this.upsertConfiguration(
          adminUser.id,
          config.channel,
          config,
        );
        results.push(result);
      } catch (error) {
        console.error(
          `Failed to create default config for ${config.channel}:`,
          error,
        );
      }
    }

    return results;
  }

  /**
   * Get default configurations for new user
   */
  private getDefaultConfigurations(
    adminUser: AdminUser,
  ): Partial<NotificationConfig>[] {
    return [
      // Email - All priorities except info
      {
        channel: NotificationChannel.EMAIL,
        priority: [
          AlertPriority.CRITICAL,
          AlertPriority.HIGH,
          AlertPriority.MEDIUM,
          AlertPriority.LOW,
        ],
        alertTypes: [
          'system_health',
          'business_metrics',
          'security',
          'performance',
        ],
        enabled: true,
        settings: {
          emailAddress: adminUser.email,
          emailEnabled: true,
          digestEnabled: true,
          immediateForCritical: true,
        },
        quietHours: {
          start: '22:00',
          end: '07:00',
          timezone: adminUser.timezone || 'Europe/London',
        },
      },

      // Slack - Critical and High priority only
      {
        channel: NotificationChannel.SLACK,
        priority: [AlertPriority.CRITICAL, AlertPriority.HIGH],
        alertTypes: ['system_health', 'security', 'payment_failures'],
        enabled: false, // Disabled by default until user configures Slack
        settings: {
          slackEnabled: false,
          slackChannel: '#alerts',
          slackNonUrgent: false,
        },
      },

      // SMS - Critical only
      {
        channel: NotificationChannel.SMS,
        priority: [AlertPriority.CRITICAL],
        alertTypes: ['system_health', 'security'],
        enabled: false, // Disabled by default until user configures SMS
        settings: {
          smsEnabled: false,
          smsNumber: '',
          onlyBusinessHours: false,
        },
      },
    ];
  }

  /**
   * Update user preferences (convenience method)
   */
  async updateUserPreferences(
    adminUserId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<void> {
    const configs = await this.getUserConfigurations(adminUserId);

    // Update email configuration
    if (preferences.emailEnabled !== undefined || preferences.emailAddress) {
      const emailConfig = configs.find(
        (c) => c.channel === NotificationChannel.EMAIL,
      );
      const emailSettings = {
        ...emailConfig?.settings,
        emailEnabled:
          preferences.emailEnabled ??
          emailConfig?.settings.emailEnabled ??
          true,
        emailAddress:
          preferences.emailAddress ?? emailConfig?.settings.emailAddress,
      };

      await this.upsertConfiguration(adminUserId, NotificationChannel.EMAIL, {
        enabled: preferences.emailEnabled ?? true,
        settings: emailSettings,
      });
    }

    // Update Slack configuration
    if (
      preferences.slackEnabled !== undefined ||
      preferences.slackUserId ||
      preferences.slackChannel ||
      preferences.slackWebhookUrl
    ) {
      const slackConfig = configs.find(
        (c) => c.channel === NotificationChannel.SLACK,
      );
      const slackSettings = {
        ...slackConfig?.settings,
        slackEnabled:
          preferences.slackEnabled ??
          slackConfig?.settings.slackEnabled ??
          false,
        slackUserId:
          preferences.slackUserId ?? slackConfig?.settings.slackUserId,
        slackChannel:
          preferences.slackChannel ?? slackConfig?.settings.slackChannel,
        slackWebhookUrl:
          preferences.slackWebhookUrl ?? slackConfig?.settings.slackWebhookUrl,
      };

      await this.upsertConfiguration(adminUserId, NotificationChannel.SLACK, {
        enabled: preferences.slackEnabled ?? false,
        settings: slackSettings,
      });
    }

    // Update SMS configuration
    if (preferences.smsEnabled !== undefined || preferences.smsNumber) {
      const smsConfig = configs.find(
        (c) => c.channel === NotificationChannel.SMS,
      );
      const smsSettings = {
        ...smsConfig?.settings,
        smsEnabled:
          preferences.smsEnabled ?? smsConfig?.settings.smsEnabled ?? false,
        smsNumber: preferences.smsNumber ?? smsConfig?.settings.smsNumber,
      };

      await this.upsertConfiguration(adminUserId, NotificationChannel.SMS, {
        enabled: preferences.smsEnabled ?? false,
        settings: smsSettings,
      });
    }

    // Update webhook configuration
    if (preferences.webhookEnabled !== undefined || preferences.webhookUrl) {
      const webhookConfig = configs.find(
        (c) => c.channel === NotificationChannel.WEBHOOK,
      );
      const webhookSettings = {
        ...webhookConfig?.settings,
        webhookEnabled:
          preferences.webhookEnabled ??
          webhookConfig?.settings.webhookEnabled ??
          false,
        webhookUrl:
          preferences.webhookUrl ?? webhookConfig?.settings.webhookUrl,
      };

      await this.upsertConfiguration(adminUserId, NotificationChannel.WEBHOOK, {
        enabled: preferences.webhookEnabled ?? false,
        settings: webhookSettings,
      });
    }
  }

  /**
   * Test notification configuration
   */
  async testNotificationConfiguration(
    adminUserId: string,
    channel: NotificationChannel,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const config = await this.getChannelConfiguration(adminUserId, channel);

      if (!config || !config.enabled) {
        return {
          success: false,
          message: 'Notification channel is not configured or disabled',
        };
      }

      // Create a test alert
      const testAlert = {
        id: crypto.randomUUID(),
        type: 'test',
        priority: AlertPriority.LOW,
        title: 'Test Notification',
        message:
          'This is a test notification to verify your configuration is working correctly.',
        metadata: { test: true, adminUserId },
        timestamp: new Date(),
        acknowledged: false,
      };

      // Send test notification
      const { AlertNotificationService } = await import(
        './alert-notification-service'
      );
      const notificationService = new AlertNotificationService();

      await notificationService.sendAlertNotification(testAlert, [adminUserId]);

      return { success: true, message: 'Test notification sent successfully' };
    } catch (error) {
      console.error('Test notification failed:', error);
      return {
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get configuration for specific channel
   */
  async getChannelConfiguration(
    adminUserId: string,
    channel: NotificationChannel,
  ): Promise<NotificationConfig | null> {
    const { data, error } = await this.supabase
      .from('admin_notification_configs')
      .select('*')
      .eq('admin_user_id', adminUserId)
      .eq('channel', channel)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found"
      throw new Error(
        `Failed to fetch channel configuration: ${error.message}`,
      );
    }

    return data;
  }

  /**
   * Get all available alert types
   */
  async getAlertTypes(): Promise<AlertTypeConfig[]> {
    const { data, error } = await this.supabase
      .from('alert_types')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch alert types: ${error.message}`);
    }

    // If no data from database, return default alert types
    if (!data || data.length === 0) {
      return this.getDefaultAlertTypes();
    }

    return data;
  }

  /**
   * Default alert types if none configured in database
   */
  private getDefaultAlertTypes(): AlertTypeConfig[] {
    return [
      // System Health
      {
        type: 'system_health',
        name: 'System Health',
        description: 'API response times, error rates, database connections',
        defaultPriority: AlertPriority.HIGH,
        category: 'System',
        isUserConfigurable: true,
      },
      {
        type: 'performance',
        name: 'Performance Issues',
        description: 'Slow queries, high memory usage, timeout errors',
        defaultPriority: AlertPriority.MEDIUM,
        category: 'System',
        isUserConfigurable: true,
      },

      // Business Metrics
      {
        type: 'business_metrics',
        name: 'Business Metrics',
        description:
          'Unusual churn rates, activation patterns, revenue changes',
        defaultPriority: AlertPriority.MEDIUM,
        category: 'Business',
        isUserConfigurable: true,
      },
      {
        type: 'payment_failures',
        name: 'Payment Failures',
        description: 'Failed payments, subscription downgrades, billing issues',
        defaultPriority: AlertPriority.HIGH,
        category: 'Business',
        isUserConfigurable: true,
      },

      // Security
      {
        type: 'security',
        name: 'Security Alerts',
        description: 'Suspicious login attempts, unusual access patterns',
        defaultPriority: AlertPriority.HIGH,
        category: 'Security',
        isUserConfigurable: false,
      },
      {
        type: 'data_breach',
        name: 'Data Breach Detection',
        description: 'Potential data breaches or unauthorized access',
        defaultPriority: AlertPriority.CRITICAL,
        category: 'Security',
        isUserConfigurable: false,
      },

      // Wedding Day Specific
      {
        type: 'wedding_day_issues',
        name: 'Wedding Day Issues',
        description: 'Critical issues during active weddings',
        defaultPriority: AlertPriority.CRITICAL,
        category: 'Wedding',
        isUserConfigurable: false,
      },
      {
        type: 'vendor_conflicts',
        name: 'Vendor Conflicts',
        description: 'Double bookings, vendor disputes, timeline conflicts',
        defaultPriority: AlertPriority.HIGH,
        category: 'Wedding',
        isUserConfigurable: true,
      },

      // Infrastructure
      {
        type: 'infrastructure',
        name: 'Infrastructure',
        description: 'Server outages, DNS issues, CDN problems',
        defaultPriority: AlertPriority.CRITICAL,
        category: 'Infrastructure',
        isUserConfigurable: true,
      },
      {
        type: 'backup_failures',
        name: 'Backup Failures',
        description: 'Failed backups, sync issues, data integrity problems',
        defaultPriority: AlertPriority.HIGH,
        category: 'Infrastructure',
        isUserConfigurable: true,
      },
    ];
  }

  /**
   * Log configuration changes
   */
  private async logConfigurationChange(
    adminUserId: string,
    channel: NotificationChannel | string,
    action: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.supabase.from('admin_config_logs').insert({
        id: crypto.randomUUID(),
        admin_user_id: adminUserId,
        action,
        resource: 'notification_config',
        resource_id: channel,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log configuration change:', error);
      // Don't throw - logging failures shouldn't break configuration updates
    }
  }

  /**
   * Validate notification settings for a channel
   */
  async validateChannelSettings(
    channel: NotificationChannel,
    settings: Record<string, any>,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    switch (channel) {
      case NotificationChannel.EMAIL:
        if (
          !settings.emailAddress ||
          !this.isValidEmail(settings.emailAddress)
        ) {
          errors.push('Valid email address is required');
        }
        break;

      case NotificationChannel.SLACK:
        if (!settings.slackWebhookUrl && !settings.slackChannel) {
          errors.push('Either Slack webhook URL or channel is required');
        }
        if (
          settings.slackWebhookUrl &&
          !this.isValidUrl(settings.slackWebhookUrl)
        ) {
          errors.push('Valid Slack webhook URL is required');
        }
        break;

      case NotificationChannel.SMS:
        if (
          !settings.smsNumber ||
          !this.isValidPhoneNumber(settings.smsNumber)
        ) {
          errors.push('Valid phone number is required for SMS notifications');
        }
        break;

      case NotificationChannel.WEBHOOK:
        if (!settings.webhookUrl || !this.isValidUrl(settings.webhookUrl)) {
          errors.push('Valid webhook URL is required');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Utility validation methods
   */
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic phone number validation (E.164 format)
    return /^\+[1-9]\d{1,14}$/.test(phone.replace(/\s/g, ''));
  }

  /**
   * Get notification configuration summary
   */
  async getConfigurationSummary(adminUserId: string): Promise<{
    totalConfigs: number;
    enabledChannels: NotificationChannel[];
    alertTypeCoverage: Record<string, NotificationChannel[]>;
    lastUpdated: string | null;
  }> {
    const configs = await this.getUserConfigurations(adminUserId);
    const enabledConfigs = configs.filter((c) => c.enabled);

    const alertTypeCoverage: Record<string, NotificationChannel[]> = {};

    enabledConfigs.forEach((config) => {
      config.alertTypes.forEach((alertType) => {
        if (!alertTypeCoverage[alertType]) {
          alertTypeCoverage[alertType] = [];
        }
        alertTypeCoverage[alertType].push(config.channel);
      });
    });

    const lastUpdated = configs.reduce((latest, config) => {
      const configUpdated = new Date(
        config.updatedAt || config.createdAt,
      ).getTime();
      return configUpdated > latest ? configUpdated : latest;
    }, 0);

    return {
      totalConfigs: configs.length,
      enabledChannels: enabledConfigs.map((c) => c.channel),
      alertTypeCoverage,
      lastUpdated: lastUpdated > 0 ? new Date(lastUpdated).toISOString() : null,
    };
  }
}
