/**
 * MessagingIntegration - WS-209 Content Personalization Engine
 *
 * Handles personalized messaging across SMS, push notifications, in-app messages, and WhatsApp.
 * Integrates with messaging providers and CRM platforms for unified communication experience.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import PersonalizationOrchestrator from './personalization-orchestrator';

interface MessagingChannel {
  type: 'sms' | 'push' | 'in_app' | 'whatsapp' | 'slack';
  provider: string;
  credentials: Record<string, string>;
  enabled: boolean;
  rateLimits: RateLimit;
}

interface RateLimit {
  messagesPerMinute: number;
  messagesPerHour: number;
  messagesPerDay: number;
  burstAllowance: number;
}

interface PersonalizedMessage {
  messageId: string;
  recipientId: string;
  channel: MessagingChannel['type'];
  personalizedContent: string;
  deliveryTime: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  personalizationScore: number;
  fallbackContent?: string;
  metadata: MessageMetadata;
}

interface MessageMetadata {
  campaignId?: string;
  triggerEvent?: string;
  userSegment?: string;
  AB_testGroup?: string;
  retryCount: number;
  maxRetries: number;
  trackingId: string;
}

interface MessagingRequest {
  recipientId: string;
  organizationId: string;
  messageType: 'transactional' | 'marketing' | 'reminder' | 'alert';
  templateId: string;
  channel: MessagingChannel['type'];
  priority: PersonalizedMessage['priority'];
  variables: Record<string, any>;
  scheduledTime?: string;
}

interface DeliveryResult {
  messageId: string;
  success: boolean;
  providerId?: string;
  errorCode?: string;
  errorMessage?: string;
  deliveredAt?: string;
  cost?: number;
}

interface MessagingMetrics {
  totalSent: number;
  deliveryRate: number;
  engagementRate: number;
  optOutRate: number;
  avgPersonalizationScore: number;
  channelPerformance: Record<string, ChannelMetrics>;
}

interface ChannelMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  cost: number;
}

export class MessagingIntegration {
  private supabase;
  private personalizationOrchestrator: PersonalizationOrchestrator;
  private messagingProviders: Map<string, MessagingChannel>;
  private deliveryQueue: Map<string, PersonalizedMessage[]>;
  private rateLimiters: Map<string, RateLimiter>;

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        (() => {
          throw new Error(
            'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
          );
        })(),
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (() => {
          throw new Error(
            'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
          );
        })(),
    );
    this.personalizationOrchestrator = new PersonalizationOrchestrator();
    this.messagingProviders = new Map();
    this.deliveryQueue = new Map();
    this.rateLimiters = new Map();

    // Initialize messaging providers
    this.initializeMessagingProviders();
  }

  /**
   * Initialize supported messaging providers
   */
  private initializeMessagingProviders() {
    // Twilio SMS/WhatsApp
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.messagingProviders.set('twilio_sms', {
        type: 'sms',
        provider: 'twilio',
        credentials: {
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          phoneNumber:
            process.env.TWILIO_PHONE_NUMBER ||
            (() => {
              throw new Error(
                'Missing environment variable: TWILIO_PHONE_NUMBER',
              );
            })(),
        },
        enabled: true,
        rateLimits: {
          messagesPerMinute: 60,
          messagesPerHour: 3600,
          messagesPerDay: 50000,
          burstAllowance: 10,
        },
      });

      this.messagingProviders.set('twilio_whatsapp', {
        type: 'whatsapp',
        provider: 'twilio',
        credentials: {
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          whatsappNumber:
            process.env.TWILIO_WHATSAPP_NUMBER ||
            (() => {
              throw new Error(
                'Missing environment variable: TWILIO_WHATSAPP_NUMBER',
              );
            })(),
        },
        enabled: true,
        rateLimits: {
          messagesPerMinute: 80,
          messagesPerHour: 4800,
          messagesPerDay: 100000,
          burstAllowance: 20,
        },
      });
    }

    // Firebase Push Notifications
    if (process.env.FIREBASE_SERVER_KEY) {
      this.messagingProviders.set('firebase_push', {
        type: 'push',
        provider: 'firebase',
        credentials: {
          serverKey: process.env.FIREBASE_SERVER_KEY,
          projectId:
            process.env.FIREBASE_PROJECT_ID ||
            (() => {
              throw new Error(
                'Missing environment variable: FIREBASE_PROJECT_ID',
              );
            })(),
        },
        enabled: true,
        rateLimits: {
          messagesPerMinute: 600,
          messagesPerHour: 36000,
          messagesPerDay: 1000000,
          burstAllowance: 100,
        },
      });
    }

    // In-app messaging (WebSocket)
    this.messagingProviders.set('websocket_inapp', {
      type: 'in_app',
      provider: 'supabase_realtime',
      credentials: {
        url:
          process.env.NEXT_PUBLIC_SUPABASE_URL ||
          (() => {
            throw new Error(
              'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
            );
          })(),
        key:
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          (() => {
            throw new Error(
              'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
            );
          })(),
      },
      enabled: true,
      rateLimits: {
        messagesPerMinute: 1000,
        messagesPerHour: 60000,
        messagesPerDay: 1000000,
        burstAllowance: 200,
      },
    });

    // Initialize rate limiters for each provider
    this.messagingProviders.forEach((config, providerId) => {
      this.rateLimiters.set(providerId, new RateLimiter(config.rateLimits));
    });
  }

  /**
   * Send personalized message across channels
   */
  async sendPersonalizedMessage(
    request: MessagingRequest,
  ): Promise<DeliveryResult> {
    try {
      // Validate request
      await this.validateMessagingRequest(request);

      // Get recipient preferences and opt-in status
      const recipientPrefs = await this.getRecipientMessagingPreferences(
        request.recipientId,
      );

      // Check if recipient has opted in for this channel
      if (!this.isOptedInForChannel(recipientPrefs, request.channel)) {
        return {
          messageId: '',
          success: false,
          errorCode: 'OPT_OUT',
          errorMessage: 'Recipient has opted out of this messaging channel',
        };
      }

      // Build personalization context
      const context = await this.buildMessagingContext(request, recipientPrefs);

      // Get personalized content
      const personalizedContent =
        await this.personalizationOrchestrator.personalizeContent({
          userId: request.recipientId,
          organizationId: request.organizationId,
          contentType: request.channel,
          templateId: request.templateId,
          context,
          deliveryChannel: request.channel,
        });

      // Create personalized message
      const personalizedMessage = await this.createPersonalizedMessage(
        request,
        personalizedContent,
        recipientPrefs,
      );

      // Check rate limits
      const rateLimiter = this.rateLimiters.get(
        `${this.getProviderForChannel(request.channel)}_${request.channel}`,
      );
      if (rateLimiter && !rateLimiter.canSend()) {
        // Queue for later delivery
        await this.queueMessage(personalizedMessage);
        return {
          messageId: personalizedMessage.messageId,
          success: true,
          errorMessage: 'Queued due to rate limits',
        };
      }

      // Send message
      const deliveryResult = await this.deliverMessage(
        personalizedMessage,
        recipientPrefs,
      );

      // Log message event
      await this.logMessagingEvent(personalizedMessage, deliveryResult);

      return deliveryResult;
    } catch (error) {
      console.error('Error sending personalized message:', error);
      return {
        messageId: '',
        success: false,
        errorCode: 'SYSTEM_ERROR',
        errorMessage: error.message,
      };
    }
  }

  /**
   * Send bulk personalized messages
   */
  async sendBulkPersonalizedMessages(
    requests: MessagingRequest[],
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];
    const batchSize = 50; // Process in batches to avoid overwhelming providers

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);

      // Process batch in parallel
      const batchPromises = batch.map((request) =>
        this.sendPersonalizedMessage(request).catch((error) => ({
          messageId: '',
          success: false,
          errorCode: 'BATCH_ERROR',
          errorMessage: error.message,
        })),
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < requests.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Build messaging context for personalization
   */
  private async buildMessagingContext(
    request: MessagingRequest,
    recipientPrefs: any,
  ) {
    // Get user profile and behavioral data
    const userProfile = await this.getUserProfile(request.recipientId);

    // Get messaging engagement history
    const messagingHistory = await this.getMessagingHistory(
      request.recipientId,
    );

    // Get wedding context
    const weddingContext = await this.getWeddingContext(request.recipientId);

    return {
      weddingId: weddingContext?.id,
      vendorType: userProfile?.organization?.vendor_type,
      weddingStage: this.determineWeddingStage(weddingContext),
      userPreferences: recipientPrefs,
      behaviorData: {
        lastActive: userProfile?.last_active,
        engagementScore:
          this.calculateMessagingEngagementScore(messagingHistory),
        preferredCommunicationTime: recipientPrefs?.preferred_time,
        clickThroughHistory: messagingHistory
          ?.filter((h) => h.clicked)
          .map((h) => h.link_clicked),
        contentInteractions: messagingHistory?.map((h) => ({
          contentId: h.message_id,
          interaction: h.opened ? 'click' : 'view',
          timestamp: h.sent_at,
          duration: h.engagement_duration,
        })),
      },
      demographicData: {
        location: userProfile?.location,
        timezone: userProfile?.timezone,
        language: userProfile?.preferred_language || 'en',
        budgetRange: weddingContext?.budget_range,
        weddingSize: weddingContext?.guest_count > 100 ? 'large' : 'intimate',
      },
    };
  }

  /**
   * Create personalized message object
   */
  private async createPersonalizedMessage(
    request: MessagingRequest,
    personalizedContent: any,
    recipientPrefs: any,
  ): Promise<PersonalizedMessage> {
    const messageId = `${request.channel}-${request.recipientId}-${Date.now()}`;

    // Optimize delivery time based on recipient preferences
    const optimizedDeliveryTime = this.optimizeDeliveryTime(
      request.scheduledTime || new Date().toISOString(),
      recipientPrefs,
      request.channel,
    );

    return {
      messageId,
      recipientId: request.recipientId,
      channel: request.channel,
      personalizedContent: personalizedContent.personalizedText,
      deliveryTime: optimizedDeliveryTime,
      priority: request.priority,
      personalizationScore: personalizedContent.personalizationScore,
      fallbackContent: await this.getFallbackContent(request.templateId),
      metadata: {
        campaignId: request.variables.campaignId,
        triggerEvent: request.variables.triggerEvent,
        userSegment: request.variables.userSegment,
        AB_testGroup: request.variables.AB_testGroup,
        retryCount: 0,
        maxRetries: this.getMaxRetriesForChannel(request.channel),
        trackingId: `track-${messageId}`,
      },
    };
  }

  /**
   * Deliver message via appropriate provider
   */
  private async deliverMessage(
    message: PersonalizedMessage,
    recipientPrefs: any,
  ): Promise<DeliveryResult> {
    const providerId = `${this.getProviderForChannel(message.channel)}_${message.channel}`;
    const provider = this.messagingProviders.get(providerId);

    if (!provider) {
      return {
        messageId: message.messageId,
        success: false,
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        errorMessage: `No provider configured for channel: ${message.channel}`,
      };
    }

    try {
      switch (message.channel) {
        case 'sms':
          return await this.deliverSMS(message, provider, recipientPrefs);
        case 'whatsapp':
          return await this.deliverWhatsApp(message, provider, recipientPrefs);
        case 'push':
          return await this.deliverPushNotification(
            message,
            provider,
            recipientPrefs,
          );
        case 'in_app':
          return await this.deliverInAppMessage(
            message,
            provider,
            recipientPrefs,
          );
        default:
          throw new Error(`Unsupported channel: ${message.channel}`);
      }
    } catch (error) {
      return {
        messageId: message.messageId,
        success: false,
        errorCode: 'DELIVERY_ERROR',
        errorMessage: error.message,
      };
    }
  }

  /**
   * Deliver SMS via Twilio
   */
  private async deliverSMS(
    message: PersonalizedMessage,
    provider: MessagingChannel,
    recipientPrefs: any,
  ): Promise<DeliveryResult> {
    const twilioClient = require('twilio')(
      provider.credentials.accountSid,
      provider.credentials.authToken,
    );

    try {
      const result = await twilioClient.messages.create({
        body: message.personalizedContent,
        from: provider.credentials.phoneNumber,
        to: recipientPrefs.phone_number,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/messaging/twilio/status`,
        messagingServiceSid: provider.credentials.messagingServiceSid,
      });

      return {
        messageId: message.messageId,
        success: true,
        providerId: result.sid,
        deliveredAt: new Date().toISOString(),
        cost: this.calculateSMSCost(message.personalizedContent.length),
      };
    } catch (error) {
      return {
        messageId: message.messageId,
        success: false,
        errorCode: error.code,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Deliver WhatsApp message via Twilio
   */
  private async deliverWhatsApp(
    message: PersonalizedMessage,
    provider: MessagingChannel,
    recipientPrefs: any,
  ): Promise<DeliveryResult> {
    const twilioClient = require('twilio')(
      provider.credentials.accountSid,
      provider.credentials.authToken,
    );

    try {
      const result = await twilioClient.messages.create({
        body: message.personalizedContent,
        from: `whatsapp:${provider.credentials.whatsappNumber}`,
        to: `whatsapp:${recipientPrefs.whatsapp_number || recipientPrefs.phone_number}`,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/messaging/twilio/whatsapp/status`,
      });

      return {
        messageId: message.messageId,
        success: true,
        providerId: result.sid,
        deliveredAt: new Date().toISOString(),
        cost: this.calculateWhatsAppCost(),
      };
    } catch (error) {
      return {
        messageId: message.messageId,
        success: false,
        errorCode: error.code,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Deliver push notification via Firebase
   */
  private async deliverPushNotification(
    message: PersonalizedMessage,
    provider: MessagingChannel,
    recipientPrefs: any,
  ): Promise<DeliveryResult> {
    try {
      // Get user's FCM tokens
      const fcmTokens = await this.getFCMTokens(message.recipientId);

      if (!fcmTokens?.length) {
        return {
          messageId: message.messageId,
          success: false,
          errorCode: 'NO_FCM_TOKENS',
          errorMessage: 'User has no registered devices for push notifications',
        };
      }

      const payload = {
        notification: {
          title: this.extractTitleFromContent(message.personalizedContent),
          body: message.personalizedContent,
          icon: '/icon-192x192.png',
          badge: '/badge-icon.png',
          click_action: this.generateClickAction(message.metadata),
        },
        data: {
          messageId: message.messageId,
          trackingId: message.metadata.trackingId,
          campaignId: message.metadata.campaignId || '',
        },
      };

      // Send to all user devices
      const results = await Promise.all(
        fcmTokens.map((token) =>
          fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              Authorization: `key=${provider.credentials.serverKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: token,
              ...payload,
            }),
          }).then((res) => res.json()),
        ),
      );

      const successCount = results.filter((r) => r.success).length;

      return {
        messageId: message.messageId,
        success: successCount > 0,
        providerId: results[0]?.multicast_id?.toString(),
        deliveredAt: new Date().toISOString(),
        cost: 0, // Firebase push notifications are free
      };
    } catch (error) {
      return {
        messageId: message.messageId,
        success: false,
        errorCode: 'PUSH_ERROR',
        errorMessage: error.message,
      };
    }
  }

  /**
   * Deliver in-app message via Supabase Realtime
   */
  private async deliverInAppMessage(
    message: PersonalizedMessage,
    provider: MessagingChannel,
    recipientPrefs: any,
  ): Promise<DeliveryResult> {
    try {
      // Send via Supabase Realtime channel
      const channel = this.supabase
        .channel(`user:${message.recipientId}`)
        .send({
          type: 'broadcast',
          event: 'personalized_message',
          payload: {
            messageId: message.messageId,
            content: message.personalizedContent,
            priority: message.priority,
            metadata: message.metadata,
            timestamp: new Date().toISOString(),
          },
        });

      // Also store in database for offline users
      await this.supabase.from('in_app_messages').insert({
        message_id: message.messageId,
        recipient_id: message.recipientId,
        content: message.personalizedContent,
        priority: message.priority,
        read: false,
        created_at: new Date().toISOString(),
      });

      return {
        messageId: message.messageId,
        success: true,
        deliveredAt: new Date().toISOString(),
        cost: 0,
      };
    } catch (error) {
      return {
        messageId: message.messageId,
        success: false,
        errorCode: 'INAPP_ERROR',
        errorMessage: error.message,
      };
    }
  }

  /**
   * Process messaging delivery queue
   */
  async processMessagingQueue(): Promise<void> {
    // Process queued messages when rate limits allow
    for (const [queueId, messages] of this.deliveryQueue.entries()) {
      const rateLimiter = this.rateLimiters.get(queueId);

      if (!rateLimiter) continue;

      const messagesToSend = [];

      // Get messages we can send within rate limits
      for (const message of messages) {
        if (rateLimiter.canSend()) {
          messagesToSend.push(message);
          rateLimiter.recordSent();
        } else {
          break;
        }
      }

      // Send the messages
      for (const message of messagesToSend) {
        try {
          const recipientPrefs = await this.getRecipientMessagingPreferences(
            message.recipientId,
          );
          const result = await this.deliverMessage(message, recipientPrefs);
          await this.logMessagingEvent(message, result);

          // Remove from queue
          const queueIndex = messages.indexOf(message);
          if (queueIndex > -1) {
            messages.splice(queueIndex, 1);
          }
        } catch (error) {
          console.error('Error processing queued message:', error);
        }
      }

      // Update queue
      if (messages.length === 0) {
        this.deliveryQueue.delete(queueId);
      } else {
        this.deliveryQueue.set(queueId, messages);
      }
    }
  }

  /**
   * Get messaging analytics
   */
  async getMessagingAnalytics(
    organizationId: string,
    timeRange: string = '30d',
  ): Promise<MessagingMetrics> {
    const startDate = new Date();
    startDate.setDate(
      startDate.getDate() - parseInt(timeRange.replace('d', '')),
    );

    const { data: messages } = await this.supabase
      .from('messaging_events')
      .select(
        `
        channel,
        status,
        personalization_score,
        cost,
        message_tracking!inner(opened, clicked, replied)
      `,
      )
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString());

    if (!messages?.length) {
      return {
        totalSent: 0,
        deliveryRate: 0,
        engagementRate: 0,
        optOutRate: 0,
        avgPersonalizationScore: 0,
        channelPerformance: {},
      };
    }

    const totalSent = messages.length;
    const delivered = messages.filter((m) => m.status === 'delivered').length;
    const engaged = messages.filter(
      (m) =>
        m.message_tracking?.opened ||
        m.message_tracking?.clicked ||
        m.message_tracking?.replied,
    ).length;

    // Calculate channel-specific metrics
    const channelPerformance: Record<string, ChannelMetrics> = {};
    const channels = [...new Set(messages.map((m) => m.channel))];

    channels.forEach((channel) => {
      const channelMessages = messages.filter((m) => m.channel === channel);
      channelPerformance[channel] = {
        sent: channelMessages.length,
        delivered: channelMessages.filter((m) => m.status === 'delivered')
          .length,
        opened: channelMessages.filter((m) => m.message_tracking?.opened)
          .length,
        clicked: channelMessages.filter((m) => m.message_tracking?.clicked)
          .length,
        replied: channelMessages.filter((m) => m.message_tracking?.replied)
          .length,
        cost: channelMessages.reduce((sum, m) => sum + (m.cost || 0), 0),
      };
    });

    return {
      totalSent,
      deliveryRate: delivered / totalSent,
      engagementRate: engaged / totalSent,
      optOutRate: await this.calculateOptOutRate(organizationId, startDate),
      avgPersonalizationScore:
        messages.reduce((sum, m) => sum + m.personalization_score, 0) /
        totalSent,
      channelPerformance,
    };
  }

  /**
   * Helper methods
   */
  private async validateMessagingRequest(
    request: MessagingRequest,
  ): Promise<void> {
    if (
      !request.recipientId ||
      !request.organizationId ||
      !request.templateId
    ) {
      throw new Error('Missing required fields in messaging request');
    }

    // Validate channel is supported
    if (
      !this.messagingProviders.has(
        `${this.getProviderForChannel(request.channel)}_${request.channel}`,
      )
    ) {
      throw new Error(`Channel not supported: ${request.channel}`);
    }
  }

  private async getRecipientMessagingPreferences(recipientId: string) {
    const { data: prefs } = await this.supabase
      .from('user_messaging_preferences')
      .select('*')
      .eq('user_id', recipientId)
      .single();

    return prefs;
  }

  private isOptedInForChannel(prefs: any, channel: string): boolean {
    if (!prefs) return false;
    return prefs[`${channel}_opt_in`] === true;
  }

  private getProviderForChannel(channel: string): string {
    const providerMap: Record<string, string> = {
      sms: 'twilio',
      whatsapp: 'twilio',
      push: 'firebase',
      in_app: 'supabase_realtime',
    };
    return providerMap[channel] || 'unknown';
  }

  private optimizeDeliveryTime(
    scheduledTime: string,
    prefs: any,
    channel: string,
  ): string {
    // Logic to optimize delivery time based on user preferences and channel
    if (prefs?.preferred_time && channel !== 'push') {
      const preferredTime = new Date(scheduledTime);
      const [hours, minutes] = prefs.preferred_time.split(':');
      preferredTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return preferredTime.toISOString();
    }
    return scheduledTime;
  }

  private getMaxRetriesForChannel(channel: string): number {
    const retryMap: Record<string, number> = {
      sms: 3,
      whatsapp: 2,
      push: 1,
      in_app: 5,
    };
    return retryMap[channel] || 1;
  }

  private async getFallbackContent(templateId: string): Promise<string> {
    const { data: template } = await this.supabase
      .from('message_templates')
      .select('fallback_content')
      .eq('id', templateId)
      .single();

    return template?.fallback_content || 'Default message content';
  }

  private calculateSMSCost(messageLength: number): number {
    // Basic SMS cost calculation (adjust based on provider rates)
    const segments = Math.ceil(messageLength / 160);
    return segments * 0.05; // $0.05 per segment
  }

  private calculateWhatsAppCost(): number {
    return 0.005; // $0.005 per WhatsApp message
  }

  private async getFCMTokens(userId: string): Promise<string[]> {
    const { data: tokens } = await this.supabase
      .from('user_fcm_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('active', true);

    return tokens?.map((t) => t.token) || [];
  }

  private extractTitleFromContent(content: string): string {
    // Extract first line or first 50 characters as title
    const firstLine = content.split('\n')[0];
    return firstLine.length > 50
      ? firstLine.substring(0, 47) + '...'
      : firstLine;
  }

  private generateClickAction(metadata: any): string {
    if (metadata.campaignId) {
      return `${process.env.NEXT_PUBLIC_APP_URL}/campaigns/${metadata.campaignId}`;
    }
    return `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
  }

  private async queueMessage(message: PersonalizedMessage): Promise<void> {
    const queueId = `${this.getProviderForChannel(message.channel)}_${message.channel}`;

    if (!this.deliveryQueue.has(queueId)) {
      this.deliveryQueue.set(queueId, []);
    }

    this.deliveryQueue.get(queueId)!.push(message);
  }

  private async logMessagingEvent(
    message: PersonalizedMessage,
    result: DeliveryResult,
  ): Promise<void> {
    try {
      await this.supabase.from('messaging_events').insert({
        message_id: message.messageId,
        recipient_id: message.recipientId,
        channel: message.channel,
        status: result.success ? 'delivered' : 'failed',
        provider_id: result.providerId,
        error_code: result.errorCode,
        error_message: result.errorMessage,
        personalization_score: message.personalizationScore,
        cost: result.cost || 0,
        delivered_at: result.deliveredAt,
        metadata: message.metadata,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging messaging event:', error);
    }
  }

  private async getUserProfile(userId: string) {
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select(
        `
        *,
        organizations!inner(vendor_type)
      `,
      )
      .eq('id', userId)
      .single();

    return profile;
  }

  private async getMessagingHistory(userId: string) {
    const { data: history } = await this.supabase
      .from('messaging_events')
      .select(
        `
        *,
        message_tracking(opened, clicked, replied, link_clicked, engagement_duration)
      `,
      )
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    return history;
  }

  private async getWeddingContext(userId: string) {
    const { data: wedding } = await this.supabase
      .from('weddings')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return wedding;
  }

  private determineWeddingStage(weddingData: any): string {
    if (!weddingData?.wedding_date) return 'planning';

    const weddingDate = new Date(weddingData.wedding_date);
    const now = new Date();
    const daysUntilWedding = Math.ceil(
      (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilWedding < 0) return 'post_wedding';
    if (daysUntilWedding <= 7) return 'day_of';
    if (daysUntilWedding <= 30) return 'upcoming';
    return 'planning';
  }

  private calculateMessagingEngagementScore(history: any[]): number {
    if (!history?.length) return 0.5;

    const totalMessages = history.length;
    const openedMessages = history.filter(
      (h) => h.message_tracking?.opened,
    ).length;
    const clickedMessages = history.filter(
      (h) => h.message_tracking?.clicked,
    ).length;
    const repliedMessages = history.filter(
      (h) => h.message_tracking?.replied,
    ).length;

    const openRate = openedMessages / totalMessages;
    const clickRate = clickedMessages / totalMessages;
    const replyRate = repliedMessages / totalMessages;

    return openRate * 0.4 + clickRate * 0.4 + replyRate * 0.2;
  }

  private async calculateOptOutRate(
    organizationId: string,
    startDate: Date,
  ): Promise<number> {
    const { data: optOuts } = await this.supabase
      .from('messaging_opt_outs')
      .select('id')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString());

    const { data: totalUsers } = await this.supabase
      .from('user_profiles')
      .select('id')
      .eq('organization_id', organizationId);

    return (optOuts?.length || 0) / (totalUsers?.length || 1);
  }
}

/**
 * Rate limiter class for messaging providers
 */
class RateLimiter {
  private limits: RateLimit;
  private counters: {
    minute: { count: number; resetTime: number };
    hour: { count: number; resetTime: number };
    day: { count: number; resetTime: number };
  };

  constructor(limits: RateLimit) {
    this.limits = limits;
    this.counters = {
      minute: { count: 0, resetTime: Date.now() + 60000 },
      hour: { count: 0, resetTime: Date.now() + 3600000 },
      day: { count: 0, resetTime: Date.now() + 86400000 },
    };
  }

  canSend(): boolean {
    this.resetCountersIfNeeded();

    return (
      this.counters.minute.count < this.limits.messagesPerMinute &&
      this.counters.hour.count < this.limits.messagesPerHour &&
      this.counters.day.count < this.limits.messagesPerDay
    );
  }

  recordSent(): void {
    this.resetCountersIfNeeded();
    this.counters.minute.count++;
    this.counters.hour.count++;
    this.counters.day.count++;
  }

  private resetCountersIfNeeded(): void {
    const now = Date.now();

    if (now > this.counters.minute.resetTime) {
      this.counters.minute.count = 0;
      this.counters.minute.resetTime = now + 60000;
    }

    if (now > this.counters.hour.resetTime) {
      this.counters.hour.count = 0;
      this.counters.hour.resetTime = now + 3600000;
    }

    if (now > this.counters.day.resetTime) {
      this.counters.day.count = 0;
      this.counters.day.resetTime = now + 86400000;
    }
  }
}

export default MessagingIntegration;
