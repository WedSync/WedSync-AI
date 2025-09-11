import { EmailServiceConnector } from './email-connector';
import { SMSService } from './sms-service';
import { WhatsAppService } from './whatsapp-service';
import { createClient } from '@/lib/supabase/server';
import type { EmailDeliveryOptions } from './email-connector';
import type { SMSSendConfig } from '@/types/sms';
import type { WhatsAppSendConfig } from '@/types/whatsapp';

export type CommunicationChannel = 'email' | 'sms' | 'whatsapp';

export interface UnifiedMessageConfig {
  channels: CommunicationChannel[];
  recipient: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    name?: string;
  };
  content: {
    subject?: string; // For email
    message: string;
    templateId?: string;
    variables?: Record<string, any>;
  };
  media?: {
    url: string;
    type: 'image' | 'video' | 'document' | 'audio';
    caption?: string;
  };
  scheduling?: {
    sendAt?: Date;
    timezone?: string;
  };
  tracking?: {
    trackOpens?: boolean;
    trackClicks?: boolean;
    webhookUrl?: string;
  };
  compliance?: {
    verifyOptIn?: boolean;
    requireTemplate?: boolean;
  };
}

export interface ChannelResult {
  channel: CommunicationChannel;
  status: 'sent' | 'failed' | 'scheduled' | 'skipped';
  messageId?: string;
  error?: string;
  metrics?: {
    cost?: number;
    segments?: number;
    deliveryTime?: number;
  };
}

export interface UnifiedMessageResult {
  id: string;
  timestamp: string;
  results: ChannelResult[];
  totalCost: number;
  successCount: number;
  failureCount: number;
}

export interface ChannelPreference {
  primary: CommunicationChannel;
  fallback?: CommunicationChannel[];
  excludeChannels?: CommunicationChannel[];
}

export interface CommunicationTemplate {
  id: string;
  name: string;
  channels: {
    email?: {
      subject: string;
      htmlTemplate: string;
      textTemplate?: string;
    };
    sms?: {
      template: string;
      includeOptOut?: boolean;
    };
    whatsapp?: {
      templateName: string;
      language: string;
      mediaType?: string;
    };
  };
  variables: string[];
  category: 'marketing' | 'transactional' | 'notification';
  isActive: boolean;
}

export class UnifiedCommunicationService {
  private emailService: EmailServiceConnector;
  private smsService?: SMSService;
  private whatsappService?: WhatsAppService;
  private userId?: string;
  private organizationId?: string;

  constructor(userId?: string, organizationId?: string) {
    this.userId = userId;
    this.organizationId = organizationId;
    this.emailService = EmailServiceConnector.getInstance();
  }

  /**
   * Initialize services with user configurations
   */
  async initialize(): Promise<void> {
    if (!this.userId) return;

    // Initialize SMS service with user config
    this.smsService = await SMSService.createWithUserConfig(this.userId);

    // Initialize WhatsApp service with user config
    this.whatsappService = await WhatsAppService.createWithUserConfig(
      this.userId,
    );
  }

  /**
   * Send message across multiple channels
   */
  async sendUnifiedMessage(
    config: UnifiedMessageConfig,
  ): Promise<UnifiedMessageResult> {
    const results: ChannelResult[] = [];
    let totalCost = 0;

    // Ensure services are initialized
    await this.initialize();

    // Get recipient preferences if available
    const preferences = await this.getRecipientPreferences(config.recipient);

    // Determine which channels to use
    const channelsToUse = this.determineChannels(config.channels, preferences);

    // Send to each channel
    for (const channel of channelsToUse) {
      const result = await this.sendToChannel(channel, config);
      results.push(result);
      totalCost += result.metrics?.cost || 0;
    }

    // Log unified message
    const unifiedResult: UnifiedMessageResult = {
      id: `unified-${Date.now()}`,
      timestamp: new Date().toISOString(),
      results,
      totalCost,
      successCount: results.filter((r) => r.status === 'sent').length,
      failureCount: results.filter((r) => r.status === 'failed').length,
    };

    await this.logUnifiedMessage(unifiedResult, config);

    return unifiedResult;
  }

  /**
   * Send to specific channel
   */
  private async sendToChannel(
    channel: CommunicationChannel,
    config: UnifiedMessageConfig,
  ): Promise<ChannelResult> {
    try {
      switch (channel) {
        case 'email':
          return await this.sendEmail(config);
        case 'sms':
          return await this.sendSMS(config);
        case 'whatsapp':
          return await this.sendWhatsApp(config);
        default:
          return {
            channel,
            status: 'skipped',
            error: 'Unknown channel',
          };
      }
    } catch (error) {
      return {
        channel,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email
   */
  private async sendEmail(
    config: UnifiedMessageConfig,
  ): Promise<ChannelResult> {
    if (!config.recipient.email) {
      return {
        channel: 'email',
        status: 'skipped',
        error: 'No email address provided',
      };
    }

    const emailOptions: EmailDeliveryOptions = {
      template_id: config.content.templateId || 'default',
      recipient: {
        email: config.recipient.email,
        name: config.recipient.name,
      },
      variables: config.content.variables || {},
      priority: 'normal',
      track_opens: config.tracking?.trackOpens,
      track_clicks: config.tracking?.trackClicks,
    };

    if (config.scheduling?.sendAt) {
      emailOptions.delivery_time = config.scheduling.sendAt.toISOString();
    }

    const result = await this.emailService.sendEmail(emailOptions);

    return {
      channel: 'email',
      status: result.status === 'sent' ? 'sent' : 'failed',
      messageId: result.message_id,
      error: result.error_message,
      metrics: {
        cost: 0.001, // Typical email cost
        deliveryTime: 0,
      },
    };
  }

  /**
   * Send SMS
   */
  private async sendSMS(config: UnifiedMessageConfig): Promise<ChannelResult> {
    if (!this.smsService || !config.recipient.phone) {
      return {
        channel: 'sms',
        status: 'skipped',
        error: 'SMS service not configured or no phone number provided',
      };
    }

    const smsConfig: SMSSendConfig = {
      to: config.recipient.phone,
      content: config.content.message,
      templateId: config.content.templateId,
      variables: config.content.variables,
      webhook_url: config.tracking?.webhookUrl,
      consent_verified: !config.compliance?.verifyOptIn,
    };

    if (config.scheduling?.sendAt) {
      smsConfig.scheduled_for = config.scheduling.sendAt.toISOString();
    }

    const result = await this.smsService.sendTemplateMessage(smsConfig);

    return {
      channel: 'sms',
      status: result.status,
      messageId: result.messageId,
      error: result.error,
      metrics: {
        cost: result.metrics?.estimated_cost,
        segments: result.metrics?.segment_count,
      },
    };
  }

  /**
   * Send WhatsApp message
   */
  private async sendWhatsApp(
    config: UnifiedMessageConfig,
  ): Promise<ChannelResult> {
    if (!this.whatsappService || !config.recipient.whatsapp) {
      return {
        channel: 'whatsapp',
        status: 'skipped',
        error: 'WhatsApp service not configured or no WhatsApp number provided',
      };
    }

    const whatsappConfig: WhatsAppSendConfig = {
      to: config.recipient.whatsapp,
      templateId: config.content.templateId,
      variables: config.content.variables,
      media: config.media
        ? {
            type: config.media.type,
            url: config.media.url,
            caption: config.media.caption,
          }
        : undefined,
      webhook_url: config.tracking?.webhookUrl,
      bypass_session_check: config.compliance?.requireTemplate,
    };

    if (config.scheduling?.sendAt) {
      whatsappConfig.scheduled_for = config.scheduling.sendAt.toISOString();
    }

    const result =
      await this.whatsappService.sendTemplateMessage(whatsappConfig);

    return {
      channel: 'whatsapp',
      status: result.status,
      messageId: result.messageId,
      error: result.error,
      metrics: {
        cost: result.metrics?.estimated_cost,
      },
    };
  }

  /**
   * Get recipient channel preferences
   */
  private async getRecipientPreferences(
    recipient: any,
  ): Promise<ChannelPreference | null> {
    if (!recipient.email && !recipient.phone) return null;

    const supabase = await createClient();

    const query = recipient.email
      ? supabase
          .from('clients')
          .select('communication_preferences')
          .eq('email', recipient.email)
      : supabase
          .from('clients')
          .select('communication_preferences')
          .eq('phone', recipient.phone);

    const { data, error } = await query.single();

    if (error || !data?.communication_preferences) {
      return null;
    }

    return data.communication_preferences as ChannelPreference;
  }

  /**
   * Determine which channels to use based on config and preferences
   */
  private determineChannels(
    requestedChannels: CommunicationChannel[],
    preferences: ChannelPreference | null,
  ): CommunicationChannel[] {
    if (!preferences) {
      return requestedChannels;
    }

    // Filter out excluded channels
    let channels = requestedChannels.filter(
      (ch) => !preferences.excludeChannels?.includes(ch),
    );

    // Prioritize based on preferences
    if (preferences.primary && channels.includes(preferences.primary)) {
      // Move primary to front
      channels = [
        preferences.primary,
        ...channels.filter((ch) => ch !== preferences.primary),
      ];
    }

    return channels;
  }

  /**
   * Create unified template for all channels
   */
  async createUnifiedTemplate(
    template: CommunicationTemplate,
  ): Promise<string> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('unified_templates')
      .insert({
        name: template.name,
        channels: template.channels,
        variables: template.variables,
        category: template.category,
        is_active: template.isActive,
        user_id: this.userId,
        organization_id: this.organizationId,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Get unified templates
   */
  async getUnifiedTemplates(
    category?: string,
  ): Promise<CommunicationTemplate[]> {
    const supabase = await createClient();

    let query = supabase
      .from('unified_templates')
      .select('*')
      .eq('is_active', true);

    if (this.organizationId) {
      query = query.eq('organization_id', this.organizationId);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }

    return data as CommunicationTemplate[];
  }

  /**
   * Test unified message across channels
   */
  async testUnifiedMessage(config: UnifiedMessageConfig): Promise<
    {
      channel: CommunicationChannel;
      preview: string;
      variables: string[];
      cost: number;
    }[]
  > {
    const previews = [];

    for (const channel of config.channels) {
      let preview = '';
      let cost = 0;

      switch (channel) {
        case 'email':
          preview = `Subject: ${config.content.subject || 'No subject'}\n\n${config.content.message}`;
          cost = 0.001;
          break;
        case 'sms':
          const smsMetrics = this.smsService?.calculateSMSMetrics(
            config.content.message,
          );
          preview = config.content.message;
          cost = smsMetrics?.estimated_cost || 0.0075;
          break;
        case 'whatsapp':
          preview = config.content.message;
          cost = 0.005;
          if (config.media) {
            preview += `\n[${config.media.type.toUpperCase()}: ${config.media.caption || 'No caption'}]`;
            cost *= 2;
          }
          break;
      }

      // Replace variables in preview
      if (config.content.variables) {
        Object.entries(config.content.variables).forEach(([key, value]) => {
          preview = preview.replace(
            new RegExp(`{{${key}}}`, 'g'),
            String(value),
          );
        });
      }

      previews.push({
        channel,
        preview,
        variables: Object.keys(config.content.variables || {}),
        cost,
      });
    }

    return previews;
  }

  /**
   * Get analytics for unified communications
   */
  async getUnifiedAnalytics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    byChannel: Record<CommunicationChannel, any>;
    total: {
      messages_sent: number;
      total_cost: number;
      success_rate: number;
      average_cost: number;
    };
  }> {
    const analytics = {
      byChannel: {} as Record<CommunicationChannel, any>,
      total: {
        messages_sent: 0,
        total_cost: 0,
        success_rate: 0,
        average_cost: 0,
      },
    };

    if (!this.userId) return analytics;

    // Get email analytics
    try {
      const emailAnalytics = await this.emailService.getDeliveryAnalytics({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
      analytics.byChannel.email = emailAnalytics;
      analytics.total.messages_sent += emailAnalytics.total_sent;
    } catch (error) {
      console.error('Failed to get email analytics:', error);
    }

    // Get SMS analytics
    if (this.smsService) {
      try {
        const smsAnalytics = await this.smsService.getAnalytics(
          this.userId,
          startDate,
          endDate,
        );
        analytics.byChannel.sms = smsAnalytics.metrics;
        analytics.total.messages_sent += smsAnalytics.metrics.messages_sent;
        analytics.total.total_cost += smsAnalytics.metrics.total_cost;
      } catch (error) {
        console.error('Failed to get SMS analytics:', error);
      }
    }

    // Get WhatsApp analytics
    if (this.whatsappService) {
      try {
        const whatsappAnalytics = await this.whatsappService.getAnalytics(
          this.userId,
          startDate,
          endDate,
        );
        analytics.byChannel.whatsapp = whatsappAnalytics.metrics;
        analytics.total.messages_sent +=
          whatsappAnalytics.metrics.messages_sent;
        analytics.total.total_cost += whatsappAnalytics.metrics.total_cost;
      } catch (error) {
        console.error('Failed to get WhatsApp analytics:', error);
      }
    }

    // Calculate totals
    if (analytics.total.messages_sent > 0) {
      analytics.total.average_cost =
        analytics.total.total_cost / analytics.total.messages_sent;

      // Calculate success rate (simplified)
      const successfulMessages =
        (analytics.byChannel.email?.total_delivered || 0) +
        (analytics.byChannel.sms?.messages_delivered || 0) +
        (analytics.byChannel.whatsapp?.messages_delivered || 0);

      analytics.total.success_rate =
        successfulMessages / analytics.total.messages_sent;
    }

    return analytics;
  }

  /**
   * Log unified message
   */
  private async logUnifiedMessage(
    result: UnifiedMessageResult,
    config: UnifiedMessageConfig,
  ): Promise<void> {
    const supabase = await createClient();

    try {
      await supabase.from('unified_messages').insert({
        id: result.id,
        user_id: this.userId,
        organization_id: this.organizationId,
        channels_used: config.channels,
        recipient: config.recipient,
        content: config.content,
        results: result.results,
        total_cost: result.totalCost,
        success_count: result.successCount,
        failure_count: result.failureCount,
        sent_at: result.timestamp,
      });
    } catch (error) {
      console.error('Failed to log unified message:', error);
    }
  }
}
