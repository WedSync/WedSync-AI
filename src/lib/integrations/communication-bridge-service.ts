import { EventEmitter } from 'events';
import { z } from 'zod';

// Communication Bridge Types
export const CommunicationChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum([
    'email',
    'sms',
    'push',
    'in_app',
    'webhook',
    'slack',
    'whatsapp',
  ]),
  provider: z.string(),
  config: z.record(z.any()),
  enabled: z.boolean(),
  rateLimits: z.object({
    requestsPerMinute: z.number(),
    requestsPerHour: z.number(),
    requestsPerDay: z.number(),
  }),
  priority: z.enum(['low', 'medium', 'high', 'critical', 'emergency']),
  retryConfig: z.object({
    maxRetries: z.number(),
    backoffMultiplier: z.number(),
    maxBackoffSeconds: z.number(),
  }),
  healthStatus: z.enum(['healthy', 'degraded', 'down', 'unknown']),
  lastHealthCheck: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UnifiedMessageSchema = z.object({
  id: z.string(),
  weddingId: z.string(),
  threadId: z.string().optional(),
  senderType: z.enum(['couple', 'vendor', 'coordinator', 'system']),
  senderId: z.string(),
  senderName: z.string(),
  recipientType: z.enum([
    'couple',
    'vendor',
    'coordinator',
    'all_vendors',
    'specific_vendors',
  ]),
  recipientIds: z.array(z.string()),
  subject: z.string().optional(),
  content: z.string(),
  messageType: z.enum([
    'announcement',
    'question',
    'update',
    'reminder',
    'emergency',
    'payment',
    'timeline_change',
  ]),
  priority: z.enum(['low', 'medium', 'high', 'critical', 'emergency']),
  channels: z.array(z.string()), // Channel IDs to use
  templateId: z.string().optional(),
  templateVariables: z.record(z.any()).optional(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        type: z.string(),
        size: z.number(),
      }),
    )
    .optional(),
  metadata: z.object({
    isWeddingDay: z.boolean().optional(),
    urgencyDeadline: z.date().optional(),
    requiresResponse: z.boolean().optional(),
    responseDeadline: z.date().optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
  }),
  status: z.enum([
    'draft',
    'queued',
    'sending',
    'sent',
    'delivered',
    'failed',
    'cancelled',
  ]),
  deliveryReport: z.array(
    z.object({
      channelId: z.string(),
      recipientId: z.string(),
      status: z.enum(['pending', 'sent', 'delivered', 'failed', 'bounced']),
      timestamp: z.date(),
      error: z.string().optional(),
    }),
  ),
  createdAt: z.date(),
  sentAt: z.date().optional(),
  deliveredAt: z.date().optional(),
});

export const CommunicationThreadSchema = z.object({
  id: z.string(),
  weddingId: z.string(),
  title: z.string(),
  participants: z.array(
    z.object({
      userId: z.string(),
      userType: z.enum(['couple', 'vendor', 'coordinator']),
      name: z.string(),
      role: z.string(),
      joinedAt: z.date(),
      lastReadAt: z.date().optional(),
      muted: z.boolean(),
    }),
  ),
  messageCount: z.number(),
  lastMessageAt: z.date().optional(),
  isPinned: z.boolean(),
  tags: z.array(z.string()),
  status: z.enum(['active', 'archived', 'locked']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CommunicationChannel = z.infer<typeof CommunicationChannelSchema>;
export type UnifiedMessage = z.infer<typeof UnifiedMessageSchema>;
export type CommunicationThread = z.infer<typeof CommunicationThreadSchema>;

// Wedding Communication Templates
export const WeddingMessageTemplates = {
  // Vendor coordination templates
  VENDOR_ONBOARDING: {
    id: 'vendor_onboarding',
    name: 'Vendor Onboarding Welcome',
    subject: "Welcome to {{coupleName}}'s Wedding Team!",
    content: `Hi {{vendorName}},

Welcome to the wedding coordination platform for {{coupleName}}'s special day on {{weddingDate}}!

You now have access to:
- Real-time wedding timeline
- Guest information and headcount
- Direct communication with other vendors
- Payment and milestone tracking
- Emergency contact information

Next steps:
1. Complete your vendor profile
2. Review the wedding timeline
3. Connect with the couple and other vendors

Wedding Coordinator: {{coordinatorName}}
Emergency Contact: {{emergencyPhone}}

Looking forward to working together!
`,
    variables: [
      'coupleName',
      'vendorName',
      'weddingDate',
      'coordinatorName',
      'emergencyPhone',
    ],
    defaultChannel: 'email',
    priority: 'high',
  },

  TIMELINE_UPDATE: {
    id: 'timeline_update',
    name: 'Wedding Timeline Update',
    subject: "⏰ Timeline Update - {{coupleName}}'s Wedding",
    content: `Important timeline update for {{coupleName}}'s wedding on {{weddingDate}}:

{{updateDetails}}

Updated Timeline:
{{timelineItems}}

This affects the following vendors:
{{affectedVendors}}

If you have any concerns about these changes, please respond immediately.

Coordinator: {{coordinatorName}}
Phone: {{coordinatorPhone}}
`,
    variables: [
      'coupleName',
      'weddingDate',
      'updateDetails',
      'timelineItems',
      'affectedVendors',
      'coordinatorName',
      'coordinatorPhone',
    ],
    defaultChannel: 'email',
    priority: 'critical',
    requiresResponse: true,
  },

  EMERGENCY_ALERT: {
    id: 'emergency_alert',
    name: 'Wedding Day Emergency',
    subject: "🚨 URGENT - {{emergencyType}} - {{coupleName}}'s Wedding",
    content: `EMERGENCY ALERT for {{coupleName}}'s wedding TODAY:

Issue: {{emergencyDescription}}
Impact: {{impactDescription}}
Action Required: {{requiredAction}}

Immediate Contact:
- Coordinator: {{coordinatorPhone}}
- Venue: {{venuePhone}}
- Emergency: 999

Time sensitive - please respond ASAP.
`,
    variables: [
      'emergencyType',
      'coupleName',
      'emergencyDescription',
      'impactDescription',
      'requiredAction',
      'coordinatorPhone',
      'venuePhone',
    ],
    defaultChannel: 'sms',
    priority: 'emergency',
    isWeddingDay: true,
  },

  PAYMENT_NOTIFICATION: {
    id: 'payment_notification',
    name: 'Payment Milestone Reached',
    subject: "💰 Payment Released - {{coupleName}}'s Wedding",
    content: `Payment notification for {{coupleName}}'s wedding:

Milestone: {{milestoneName}}
Amount: £{{amount}}
Expected in account: {{expectedDate}}
Reference: {{paymentReference}}

Your invoice is marked as paid in the system.

Questions? Contact: {{coordinatorEmail}}
`,
    variables: [
      'coupleName',
      'milestoneName',
      'amount',
      'expectedDate',
      'paymentReference',
      'coordinatorEmail',
    ],
    defaultChannel: 'email',
    priority: 'high',
  },
};

export class CommunicationBridgeService extends EventEmitter {
  private channels: Map<string, CommunicationChannel> = new Map();
  private activeThreads: Map<string, CommunicationThread> = new Map();
  private messageQueue: UnifiedMessage[] = [];
  private rateLimiters: Map<string, { count: number; resetTime: number }> =
    new Map();
  private isProcessing: boolean = false;

  constructor() {
    super();
    this.initializeDefaultChannels();
    this.startMessageProcessor();
    this.setupEventHandlers();
  }

  /**
   * Sends a unified message across multiple communication channels
   */
  async sendUnifiedMessage(request: {
    weddingId: string;
    senderType: UnifiedMessage['senderType'];
    senderId: string;
    senderName: string;
    recipientType: UnifiedMessage['recipientType'];
    recipientIds: string[];
    subject?: string;
    content: string;
    messageType: UnifiedMessage['messageType'];
    priority?: UnifiedMessage['priority'];
    channels?: string[];
    templateId?: string;
    templateVariables?: Record<string, any>;
    requiresResponse?: boolean;
    responseDeadline?: Date;
  }): Promise<{
    success: boolean;
    messageId?: string;
    deliveryReport?: UnifiedMessage['deliveryReport'];
    error?: string;
  }> {
    try {
      // Determine appropriate channels based on message type and priority
      const selectedChannels =
        request.channels ||
        (await this.selectOptimalChannels(
          request.messageType,
          request.priority || 'medium',
        ));

      // Apply template if specified
      let finalContent = request.content;
      let finalSubject = request.subject || '';

      if (request.templateId && request.templateVariables) {
        const template = this.getMessageTemplate(request.templateId);
        if (template) {
          finalContent = this.applyTemplate(
            template.content,
            request.templateVariables,
          );
          finalSubject = this.applyTemplate(
            template.subject || '',
            request.templateVariables,
          );
        }
      }

      // Create unified message
      const message: UnifiedMessage = {
        id: this.generateId('msg'),
        weddingId: request.weddingId,
        senderType: request.senderType,
        senderId: request.senderId,
        senderName: request.senderName,
        recipientType: request.recipientType,
        recipientIds: request.recipientIds,
        subject: finalSubject,
        content: finalContent,
        messageType: request.messageType,
        priority: request.priority || 'medium',
        channels: selectedChannels,
        templateId: request.templateId,
        templateVariables: request.templateVariables,
        metadata: {
          isWeddingDay: await this.isWeddingDay(request.weddingId),
          requiresResponse: request.requiresResponse || false,
          responseDeadline: request.responseDeadline,
        },
        status: 'queued',
        deliveryReport: [],
        createdAt: new Date(),
      };

      // Validate message
      const validatedMessage = UnifiedMessageSchema.parse(message);

      // Add to processing queue
      this.messageQueue.push(validatedMessage);

      // Process immediately if high priority or emergency
      if (
        validatedMessage.priority === 'critical' ||
        validatedMessage.priority === 'emergency'
      ) {
        await this.processMessage(validatedMessage);
      }

      this.emit('message_queued', {
        messageId: validatedMessage.id,
        weddingId: request.weddingId,
        priority: validatedMessage.priority,
        recipientCount: request.recipientIds.length,
      });

      return { success: true, messageId: validatedMessage.id };
    } catch (error) {
      console.error('Unified message sending failed:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Message sending failed',
      };
    }
  }

  /**
   * Creates a communication thread for ongoing vendor coordination
   */
  async createCommunicationThread(request: {
    weddingId: string;
    title: string;
    participants: Array<{
      userId: string;
      userType: CommunicationThread['participants'][0]['userType'];
      name: string;
      role: string;
    }>;
    initialMessage?: string;
    tags?: string[];
    isPinned?: boolean;
  }): Promise<{ success: boolean; threadId?: string; error?: string }> {
    try {
      const thread: CommunicationThread = {
        id: this.generateId('thread'),
        weddingId: request.weddingId,
        title: request.title,
        participants: request.participants.map((p) => ({
          ...p,
          joinedAt: new Date(),
          muted: false,
        })),
        messageCount: 0,
        isPinned: request.isPinned || false,
        tags: request.tags || [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Validate thread
      const validatedThread = CommunicationThreadSchema.parse(thread);
      this.activeThreads.set(validatedThread.id, validatedThread);

      // Send initial message if provided
      if (request.initialMessage) {
        await this.sendUnifiedMessage({
          weddingId: request.weddingId,
          senderType: 'coordinator', // Assume coordinator creates threads
          senderId: 'system',
          senderName: 'Wedding Coordinator',
          recipientType: 'specific_vendors',
          recipientIds: request.participants.map((p) => p.userId),
          content: request.initialMessage,
          messageType: 'announcement',
          priority: 'medium',
          templateId: 'VENDOR_ONBOARDING',
        });

        validatedThread.messageCount = 1;
        validatedThread.lastMessageAt = new Date();
      }

      // Notify participants about new thread
      this.emit('thread_created', {
        threadId: validatedThread.id,
        weddingId: request.weddingId,
        participantCount: request.participants.length,
        title: request.title,
      });

      return { success: true, threadId: validatedThread.id };
    } catch (error) {
      console.error('Communication thread creation failed:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Thread creation failed',
      };
    }
  }

  /**
   * Handles wedding day emergency communications with priority routing
   */
  async broadcastEmergencyAlert(request: {
    weddingId: string;
    emergencyType:
      | 'vendor_no_show'
      | 'weather_issue'
      | 'venue_problem'
      | 'medical_emergency'
      | 'timeline_critical';
    description: string;
    impact: string;
    requiredAction: string;
    affectedVendors?: string[];
    coordinatorPhone: string;
    venuePhone?: string;
  }): Promise<{
    success: boolean;
    messagesSent?: number;
    failedDeliveries?: number;
    error?: string;
  }> {
    try {
      // Get all vendor IDs for the wedding
      const vendorIds =
        request.affectedVendors ||
        (await this.getWeddingVendorIds(request.weddingId));

      // Prepare emergency message using template
      const emergencyMessage = await this.sendUnifiedMessage({
        weddingId: request.weddingId,
        senderType: 'coordinator',
        senderId: 'emergency_system',
        senderName: 'Emergency Alert System',
        recipientType: 'specific_vendors',
        recipientIds: vendorIds,
        messageType: 'emergency',
        priority: 'emergency',
        channels: ['sms', 'push', 'email'], // Multi-channel for reliability
        templateId: 'EMERGENCY_ALERT',
        templateVariables: {
          emergencyType: request.emergencyType.replace('_', ' ').toUpperCase(),
          coupleName: await this.getCoupleName(request.weddingId),
          emergencyDescription: request.description,
          impactDescription: request.impact,
          requiredAction: request.requiredAction,
          coordinatorPhone: request.coordinatorPhone,
          venuePhone: request.venuePhone || 'N/A',
        },
        requiresResponse: true,
        responseDeadline: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      });

      if (emergencyMessage.success) {
        // Force immediate processing
        const message = this.messageQueue.find(
          (m) => m.id === emergencyMessage.messageId,
        );
        if (message) {
          await this.processMessage(message);
        }

        // Log emergency alert
        this.emit('emergency_alert_sent', {
          weddingId: request.weddingId,
          emergencyType: request.emergencyType,
          messageId: emergencyMessage.messageId,
          recipientCount: vendorIds.length,
        });

        return {
          success: true,
          messagesSent: vendorIds.length,
          failedDeliveries: 0, // Would be calculated from actual delivery report
        };
      } else {
        throw new Error(emergencyMessage.error);
      }
    } catch (error) {
      console.error('Emergency alert broadcast failed:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Emergency broadcast failed',
      };
    }
  }

  /**
   * Coordinates timeline change communications across all vendors
   */
  async coordinateTimelineUpdate(request: {
    weddingId: string;
    updateType:
      | 'time_change'
      | 'venue_change'
      | 'vendor_change'
      | 'activity_change';
    changes: Array<{
      eventId: string;
      eventName: string;
      oldTime?: Date;
      newTime?: Date;
      oldVenue?: string;
      newVenue?: string;
      description: string;
    }>;
    affectedVendorIds: string[];
    urgency: 'low' | 'medium' | 'high' | 'critical';
    requiresAcknowledgment: boolean;
    coordinatorName: string;
    coordinatorPhone: string;
  }): Promise<{
    success: boolean;
    notificationsSent?: number;
    error?: string;
  }> {
    try {
      // Format timeline changes for template
      const timelineItems = request.changes
        .map((change) => {
          let changeText = `• ${change.eventName}: ${change.description}`;
          if (change.oldTime && change.newTime) {
            changeText += `\n  Time: ${change.oldTime.toLocaleTimeString()} → ${change.newTime.toLocaleTimeString()}`;
          }
          if (change.oldVenue && change.newVenue) {
            changeText += `\n  Venue: ${change.oldVenue} → ${change.newVenue}`;
          }
          return changeText;
        })
        .join('\n\n');

      // Get vendor names for affected vendors list
      const affectedVendorNames = await this.getVendorNames(
        request.affectedVendorIds,
      );

      // Send timeline update notification
      const updateMessage = await this.sendUnifiedMessage({
        weddingId: request.weddingId,
        senderType: 'coordinator',
        senderId: 'timeline_system',
        senderName: request.coordinatorName,
        recipientType: 'specific_vendors',
        recipientIds: request.affectedVendorIds,
        messageType: 'timeline_change',
        priority: request.urgency === 'critical' ? 'critical' : 'high',
        channels:
          request.urgency === 'critical'
            ? ['sms', 'email', 'push']
            : ['email', 'push'],
        templateId: 'TIMELINE_UPDATE',
        templateVariables: {
          coupleName: await this.getCoupleName(request.weddingId),
          weddingDate: await this.getWeddingDate(request.weddingId),
          updateDetails: `${request.updateType.replace('_', ' ')} requiring vendor coordination`,
          timelineItems,
          affectedVendors: affectedVendorNames.join(', '),
          coordinatorName: request.coordinatorName,
          coordinatorPhone: request.coordinatorPhone,
        },
        requiresResponse: request.requiresAcknowledgment,
        responseDeadline: request.requiresAcknowledgment
          ? new Date(Date.now() + 2 * 60 * 60 * 1000)
          : undefined, // 2 hours
      });

      if (updateMessage.success) {
        // Create follow-up thread for discussion
        await this.createCommunicationThread({
          weddingId: request.weddingId,
          title: `Timeline Update Discussion - ${request.updateType.replace('_', ' ')}`,
          participants: request.affectedVendorIds.map((vendorId) => ({
            userId: vendorId,
            userType: 'vendor' as const,
            name: 'Vendor', // Would be fetched from database
            role: 'vendor',
          })),
          tags: ['timeline_update', request.updateType],
          isPinned: request.urgency === 'critical',
        });

        this.emit('timeline_update_coordinated', {
          weddingId: request.weddingId,
          updateType: request.updateType,
          affectedVendors: request.affectedVendorIds.length,
          urgency: request.urgency,
        });

        return {
          success: true,
          notificationsSent: request.affectedVendorIds.length,
        };
      } else {
        throw new Error(updateMessage.error);
      }
    } catch (error) {
      console.error('Timeline update coordination failed:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Timeline coordination failed',
      };
    }
  }

  // Private helper methods

  private async selectOptimalChannels(
    messageType: UnifiedMessage['messageType'],
    priority: UnifiedMessage['priority'],
  ): Promise<string[]> {
    const channels: string[] = [];

    // Emergency messages use all available channels
    if (priority === 'emergency') {
      channels.push('sms', 'push', 'email');
    } else if (priority === 'critical') {
      channels.push('email', 'push');
    } else {
      // Standard priority uses email as primary
      channels.push('email');

      // Add push notifications for time-sensitive messages
      if (messageType === 'reminder' || messageType === 'timeline_change') {
        channels.push('push');
      }
    }

    return channels.filter((channelId) => {
      const channel = this.channels.get(channelId);
      return channel && channel.enabled && channel.healthStatus === 'healthy';
    });
  }

  private async processMessage(message: UnifiedMessage): Promise<void> {
    try {
      message.status = 'sending';
      message.sentAt = new Date();

      // Process each channel
      for (const channelId of message.channels) {
        const channel = this.channels.get(channelId);
        if (channel && this.checkRateLimit(channelId)) {
          for (const recipientId of message.recipientIds) {
            try {
              await this.deliverMessage(channel, message, recipientId);

              message.deliveryReport.push({
                channelId,
                recipientId,
                status: 'delivered',
                timestamp: new Date(),
              });
            } catch (deliveryError) {
              message.deliveryReport.push({
                channelId,
                recipientId,
                status: 'failed',
                timestamp: new Date(),
                error:
                  deliveryError instanceof Error
                    ? deliveryError.message
                    : 'Delivery failed',
              });
            }
          }
        }
      }

      message.status = 'sent';
      message.deliveredAt = new Date();

      this.emit('message_delivered', {
        messageId: message.id,
        weddingId: message.weddingId,
        successfulDeliveries: message.deliveryReport.filter(
          (r) => r.status === 'delivered',
        ).length,
        totalRecipients: message.recipientIds.length * message.channels.length,
      });
    } catch (error) {
      message.status = 'failed';
      console.error(`Message processing failed for ${message.id}:`, error);
    }
  }

  private async deliverMessage(
    channel: CommunicationChannel,
    message: UnifiedMessage,
    recipientId: string,
  ): Promise<void> {
    // Implementation would vary by channel type
    switch (channel.type) {
      case 'email':
        await this.sendEmail(channel, message, recipientId);
        break;
      case 'sms':
        await this.sendSMS(channel, message, recipientId);
        break;
      case 'push':
        await this.sendPushNotification(channel, message, recipientId);
        break;
      default:
        console.log(
          `Delivering via ${channel.type} to ${recipientId}: ${message.content}`,
        );
    }
  }

  private async sendEmail(
    channel: CommunicationChannel,
    message: UnifiedMessage,
    recipientId: string,
  ): Promise<void> {
    // Email delivery implementation (would use Resend or similar)
    console.log(`Email sent to ${recipientId}: ${message.subject}`);
  }

  private async sendSMS(
    channel: CommunicationChannel,
    message: UnifiedMessage,
    recipientId: string,
  ): Promise<void> {
    // SMS delivery implementation (would use Twilio)
    console.log(
      `SMS sent to ${recipientId}: ${message.content.substring(0, 50)}...`,
    );
  }

  private async sendPushNotification(
    channel: CommunicationChannel,
    message: UnifiedMessage,
    recipientId: string,
  ): Promise<void> {
    // Push notification implementation
    console.log(
      `Push notification sent to ${recipientId}: ${message.subject || message.content.substring(0, 50)}`,
    );
  }

  private checkRateLimit(channelId: string): boolean {
    const now = Date.now();
    const limiter = this.rateLimiters.get(channelId);

    if (!limiter || now > limiter.resetTime) {
      this.rateLimiters.set(channelId, { count: 1, resetTime: now + 60000 }); // 1 minute window
      return true;
    }

    const channel = this.channels.get(channelId);
    if (channel && limiter.count < channel.rateLimits.requestsPerMinute) {
      limiter.count++;
      return true;
    }

    return false;
  }

  private getMessageTemplate(templateId: string): any {
    return (WeddingMessageTemplates as any)[templateId];
  }

  private applyTemplate(
    template: string,
    variables: Record<string, any>,
  ): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    });
    return result;
  }

  private async isWeddingDay(weddingId: string): Promise<boolean> {
    // Check if today is the wedding day
    const today = new Date();
    const weddingDate = await this.getWeddingDate(weddingId);
    return weddingDate.toDateString() === today.toDateString();
  }

  private async getWeddingVendorIds(weddingId: string): Promise<string[]> {
    // Fetch vendor IDs from database
    return ['vendor1', 'vendor2', 'vendor3']; // Mock data
  }

  private async getCoupleName(weddingId: string): Promise<string> {
    // Fetch couple name from database
    return 'Sarah & Mike'; // Mock data
  }

  private async getWeddingDate(weddingId: string): Promise<Date> {
    // Fetch wedding date from database
    return new Date('2025-06-15'); // Mock data
  }

  private async getVendorNames(vendorIds: string[]): Promise<string[]> {
    // Fetch vendor names from database
    return vendorIds.map((id) => `Vendor ${id}`); // Mock data
  }

  private startMessageProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.messageQueue.length === 0) return;

      this.isProcessing = true;

      try {
        // Process messages in priority order
        const sortedMessages = this.messageQueue.sort((a, b) => {
          const priorityOrder = {
            emergency: 4,
            critical: 3,
            high: 2,
            medium: 1,
            low: 0,
          };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        for (let i = 0; i < Math.min(5, sortedMessages.length); i++) {
          const message = sortedMessages[i];
          await this.processMessage(message);

          // Remove from queue
          const index = this.messageQueue.findIndex((m) => m.id === message.id);
          if (index !== -1) {
            this.messageQueue.splice(index, 1);
          }
        }
      } catch (error) {
        console.error('Message processor error:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 5000); // Process every 5 seconds
  }

  private initializeDefaultChannels(): void {
    // Email channel
    this.channels.set('email', {
      id: 'email',
      name: 'Email Notifications',
      type: 'email',
      provider: 'resend',
      config: { apiKey: process.env.RESEND_API_KEY },
      enabled: true,
      rateLimits: {
        requestsPerMinute: 50,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
      },
      priority: 'medium',
      retryConfig: {
        maxRetries: 3,
        backoffMultiplier: 2,
        maxBackoffSeconds: 300,
      },
      healthStatus: 'healthy',
      lastHealthCheck: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // SMS channel
    this.channels.set('sms', {
      id: 'sms',
      name: 'SMS Notifications',
      type: 'sms',
      provider: 'twilio',
      config: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
      },
      enabled: true,
      rateLimits: {
        requestsPerMinute: 10,
        requestsPerHour: 200,
        requestsPerDay: 1000,
      },
      priority: 'high',
      retryConfig: {
        maxRetries: 2,
        backoffMultiplier: 2,
        maxBackoffSeconds: 120,
      },
      healthStatus: 'healthy',
      lastHealthCheck: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Push notification channel
    this.channels.set('push', {
      id: 'push',
      name: 'Push Notifications',
      type: 'push',
      provider: 'firebase',
      config: { serverKey: process.env.FIREBASE_SERVER_KEY },
      enabled: true,
      rateLimits: {
        requestsPerMinute: 100,
        requestsPerHour: 2000,
        requestsPerDay: 20000,
      },
      priority: 'medium',
      retryConfig: {
        maxRetries: 3,
        backoffMultiplier: 1.5,
        maxBackoffSeconds: 180,
      },
      healthStatus: 'healthy',
      lastHealthCheck: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  private setupEventHandlers(): void {
    this.on('message_queued', (data) => {
      console.log(
        `Message queued for wedding ${data.weddingId}: ${data.priority} priority, ${data.recipientCount} recipients`,
      );
    });

    this.on('message_delivered', (data) => {
      console.log(
        `Message ${data.messageId} delivered: ${data.successfulDeliveries}/${data.totalRecipients} successful`,
      );
    });

    this.on('emergency_alert_sent', (data) => {
      console.log(
        `🚨 Emergency alert sent for wedding ${data.weddingId}: ${data.emergencyType}`,
      );
    });
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default CommunicationBridgeService;
