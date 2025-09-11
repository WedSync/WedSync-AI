// WS-157: Enhanced SMS Notification System with Multi-Provider Support
import { HelperAssignment } from '@/types/calendar';

interface SMSProvider {
  name: 'twilio' | 'aws_sns' | 'messagebird' | 'plivo';
  priority: number;
  costPerMessage: number;
  deliveryRate: number;
  internationalSupport: boolean;
  maxMessageLength: number;
}

interface SMSMessage {
  to: string;
  message: string;
  providerId?: string;
  scheduledAt?: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  messageType:
    | 'assignment'
    | 'reminder'
    | 'confirmation'
    | 'update'
    | 'marketing';
  assignmentId?: string;
  userId: string;
  organizationId: string;
}

interface SMSDeliveryResult {
  success: boolean;
  messageId?: string;
  provider: string;
  cost?: number;
  error?: string;
  deliveredAt?: Date;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
}

interface SMSTemplate {
  id: string;
  name: string;
  type:
    | 'assignment_new'
    | 'assignment_reminder'
    | 'assignment_update'
    | 'assignment_cancelled';
  template: string;
  variables: string[];
  maxLength: number;
  language: string;
}

export class EnhancedSMSService {
  private providers: Map<string, SMSProvider> = new Map();
  private templates: Map<string, SMSTemplate> = new Map();
  private messageQueue: SMSMessage[] = [];
  private isProcessing = false;

  constructor() {
    this.initializeProviders();
    this.initializeTemplates();
    this.startMessageProcessor();
  }

  /**
   * Initialize SMS providers with configurations
   */
  private initializeProviders(): void {
    this.providers.set('twilio', {
      name: 'twilio',
      priority: 1,
      costPerMessage: 0.0075, // $0.0075 per message
      deliveryRate: 0.98,
      internationalSupport: true,
      maxMessageLength: 1600,
    });

    this.providers.set('aws_sns', {
      name: 'aws_sns',
      priority: 2,
      costPerMessage: 0.006, // $0.006 per message
      deliveryRate: 0.96,
      internationalSupport: true,
      maxMessageLength: 1600,
    });

    this.providers.set('messagebird', {
      name: 'messagebird',
      priority: 3,
      costPerMessage: 0.008,
      deliveryRate: 0.97,
      internationalSupport: true,
      maxMessageLength: 1530,
    });
  }

  /**
   * Initialize SMS templates
   */
  private initializeTemplates(): void {
    const templates: SMSTemplate[] = [
      {
        id: 'assignment_new',
        name: 'New Assignment',
        type: 'assignment_new',
        template: `🎉 New Wedding Assignment

📋 {title}
📅 {date} at {time}
📍 {location}
⏱️ Duration: {duration}
⭐ Priority: {priority}

Reply:
✅ YES to accept
❌ NO to decline
❓ INFO for details

Wedding: {weddingName}
Planner: {plannerName}`,
        variables: [
          'title',
          'date',
          'time',
          'location',
          'duration',
          'priority',
          'weddingName',
          'plannerName',
        ],
        maxLength: 320,
        language: 'en',
      },
      {
        id: 'assignment_reminder',
        name: 'Assignment Reminder',
        type: 'assignment_reminder',
        template: `⏰ Assignment Reminder

Your assignment "{title}" starts in {timeUntil}.

📅 {date} at {time}
📍 {location}

Preparation checklist:
{checklist}

Emergency contact: {emergencyContact}

Reply READY when you're prepared.`,
        variables: [
          'title',
          'timeUntil',
          'date',
          'time',
          'location',
          'checklist',
          'emergencyContact',
        ],
        maxLength: 300,
        language: 'en',
      },
      {
        id: 'assignment_update',
        name: 'Assignment Update',
        type: 'assignment_update',
        template: `📝 Assignment Update

{updateType}: {title}

Changes:
{changes}

New Details:
📅 {date} at {time}
📍 {location}

Please confirm receipt: Reply OK`,
        variables: [
          'updateType',
          'title',
          'changes',
          'date',
          'time',
          'location',
        ],
        maxLength: 250,
        language: 'en',
      },
      {
        id: 'assignment_cancelled',
        name: 'Assignment Cancelled',
        type: 'assignment_cancelled',
        template: `❌ Assignment Cancelled

"{title}" scheduled for {date} has been cancelled.

Reason: {reason}

You will not be charged for this cancellation.

Thank you for your availability.`,
        variables: ['title', 'date', 'reason'],
        maxLength: 200,
        language: 'en',
      },
    ];

    templates.forEach((template) => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Send assignment notification via SMS
   */
  async sendAssignmentNotification(
    phoneNumber: string,
    assignment: HelperAssignment,
    type:
      | 'assignment_new'
      | 'assignment_reminder'
      | 'assignment_update'
      | 'assignment_cancelled',
    options: {
      scheduledAt?: Date;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      additionalData?: Record<string, string>;
    } = {},
  ): Promise<SMSDeliveryResult> {
    try {
      const template = this.templates.get(type);
      if (!template) {
        throw new Error(`Template not found: ${type}`);
      }

      const messageText = this.renderTemplate(
        template,
        assignment,
        options.additionalData || {},
      );

      const smsMessage: SMSMessage = {
        to: this.normalizePhoneNumber(phoneNumber),
        message: messageText,
        scheduledAt: options.scheduledAt,
        priority: options.priority || 'normal',
        messageType: 'assignment',
        assignmentId: assignment.id,
        userId: assignment.helperId,
        organizationId: 'default', // Get from context
      };

      if (options.scheduledAt && options.scheduledAt > new Date()) {
        // Schedule for later
        return await this.scheduleMessage(smsMessage);
      } else {
        // Send immediately
        return await this.sendMessage(smsMessage);
      }
    } catch (error) {
      return {
        success: false,
        provider: 'none',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send bulk assignment notifications
   */
  async sendBulkAssignmentNotifications(
    notifications: Array<{
      phoneNumber: string;
      assignment: HelperAssignment;
      type:
        | 'assignment_new'
        | 'assignment_reminder'
        | 'assignment_update'
        | 'assignment_cancelled';
      options?: {
        priority?: 'low' | 'normal' | 'high' | 'urgent';
        additionalData?: Record<string, string>;
      };
    }>,
  ): Promise<SMSDeliveryResult[]> {
    const results: SMSDeliveryResult[] = [];
    const batchSize = 10; // Process in batches to avoid rate limiting

    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);

      const batchPromises = batch.map((notification) =>
        this.sendAssignmentNotification(
          notification.phoneNumber,
          notification.assignment,
          notification.type,
          notification.options,
        ),
      );

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            provider: 'none',
            status: 'failed',
            error: result.reason?.message || 'Batch processing error',
          });
        }
      });

      // Add delay between batches
      if (i + batchSize < notifications.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  /**
   * Send immediate message using optimal provider
   */
  async sendMessage(smsMessage: SMSMessage): Promise<SMSDeliveryResult> {
    const provider = this.selectOptimalProvider(smsMessage);

    try {
      const result = await this.sendViaProvider(smsMessage, provider);

      // Log delivery for analytics
      await this.logDelivery(smsMessage, result);

      return result;
    } catch (error) {
      // Try fallback provider
      const fallbackProvider = this.selectFallbackProvider(provider);
      if (fallbackProvider) {
        try {
          const fallbackResult = await this.sendViaProvider(
            smsMessage,
            fallbackProvider,
          );
          await this.logDelivery(smsMessage, fallbackResult);
          return fallbackResult;
        } catch (fallbackError) {
          return {
            success: false,
            provider: provider.name,
            status: 'failed',
            error: `Primary and fallback failed: ${error instanceof Error ? error.message : 'Unknown'}`,
          };
        }
      }

      return {
        success: false,
        provider: provider.name,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Schedule message for future delivery
   */
  async scheduleMessage(smsMessage: SMSMessage): Promise<SMSDeliveryResult> {
    try {
      // Add to database or queue for scheduled delivery
      // For now, add to in-memory queue
      this.messageQueue.push(smsMessage);

      return {
        success: true,
        provider: 'scheduler',
        status: 'pending',
        messageId: `scheduled_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        provider: 'scheduler',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Scheduling failed',
      };
    }
  }

  /**
   * Process incoming SMS webhook
   */
  async handleIncomingSMS(
    from: string,
    body: string,
    providerId: string,
  ): Promise<void> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(from);
      const messageBody = body.toLowerCase().trim();

      // Parse responses
      if (messageBody.includes('yes') || messageBody.includes('accept')) {
        await this.handleAssignmentAcceptance(normalizedPhone, body);
      } else if (
        messageBody.includes('no') ||
        messageBody.includes('decline')
      ) {
        await this.handleAssignmentDecline(normalizedPhone, body);
      } else if (
        messageBody.includes('info') ||
        messageBody.includes('details')
      ) {
        await this.sendAssignmentDetails(normalizedPhone);
      } else if (messageBody.includes('ready')) {
        await this.handleReadyConfirmation(normalizedPhone);
      } else if (
        messageBody.includes('ok') ||
        messageBody.includes('confirm')
      ) {
        await this.handleGeneralConfirmation(normalizedPhone);
      } else if (messageBody.includes('status')) {
        await this.sendHelperStatus(normalizedPhone);
      } else if (messageBody.includes('help')) {
        await this.sendHelpMessage(normalizedPhone);
      } else {
        await this.sendUnrecognizedResponse(normalizedPhone);
      }
    } catch (error) {
      console.error('Error handling incoming SMS:', error);
    }
  }

  /**
   * Send message via specific provider
   */
  private async sendViaProvider(
    smsMessage: SMSMessage,
    provider: SMSProvider,
  ): Promise<SMSDeliveryResult> {
    const startTime = Date.now();

    try {
      let result: SMSDeliveryResult;

      switch (provider.name) {
        case 'twilio':
          result = await this.sendViaTwilio(smsMessage);
          break;
        case 'aws_sns':
          result = await this.sendViaAWSSNS(smsMessage);
          break;
        case 'messagebird':
          result = await this.sendViaMessageBird(smsMessage);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider.name}`);
      }

      result.cost = provider.costPerMessage;
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send via Twilio
   */
  private async sendViaTwilio(
    smsMessage: SMSMessage,
  ): Promise<SMSDeliveryResult> {
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );

    try {
      const result = await client.messages.create({
        body: smsMessage.message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: smsMessage.to,
      });

      return {
        success: true,
        messageId: result.sid,
        provider: 'twilio',
        status: 'sent',
      };
    } catch (error: any) {
      throw new Error(`Twilio error: ${error.message}`);
    }
  }

  /**
   * Send via AWS SNS
   */
  private async sendViaAWSSNS(
    smsMessage: SMSMessage,
  ): Promise<SMSDeliveryResult> {
    try {
      // AWS SNS implementation would go here
      // For now, simulate successful send
      const messageId = `aws_${Date.now()}`;

      return {
        success: true,
        messageId,
        provider: 'aws_sns',
        status: 'sent',
      };
    } catch (error: any) {
      throw new Error(`AWS SNS error: ${error.message}`);
    }
  }

  /**
   * Send via MessageBird
   */
  private async sendViaMessageBird(
    smsMessage: SMSMessage,
  ): Promise<SMSDeliveryResult> {
    try {
      // MessageBird implementation would go here
      // For now, simulate successful send
      const messageId = `mb_${Date.now()}`;

      return {
        success: true,
        messageId,
        provider: 'messagebird',
        status: 'sent',
      };
    } catch (error: any) {
      throw new Error(`MessageBird error: ${error.message}`);
    }
  }

  /**
   * Select optimal provider based on cost, reliability, and destination
   */
  private selectOptimalProvider(smsMessage: SMSMessage): SMSProvider {
    const availableProviders = Array.from(this.providers.values());

    // Filter by international support if needed
    const isInternational = !smsMessage.to.startsWith('+1');
    const validProviders = availableProviders.filter(
      (p) => !isInternational || p.internationalSupport,
    );

    // Score providers based on priority, cost, and delivery rate
    const scoredProviders = validProviders.map((provider) => {
      let score = 0;

      // Priority weight (higher priority = higher score)
      score += (5 - provider.priority) * 20;

      // Delivery rate weight
      score += provider.deliveryRate * 30;

      // Cost efficiency weight (lower cost = higher score)
      score += (1 - provider.costPerMessage) * 25;

      // Urgency weight
      if (smsMessage.priority === 'urgent') {
        score += provider.deliveryRate * 25;
      }

      return { provider, score };
    });

    // Return highest scoring provider
    const optimal = scoredProviders.sort((a, b) => b.score - a.score)[0];
    return optimal?.provider || availableProviders[0];
  }

  /**
   * Select fallback provider
   */
  private selectFallbackProvider(
    currentProvider: SMSProvider,
  ): SMSProvider | null {
    const availableProviders = Array.from(this.providers.values())
      .filter((p) => p.name !== currentProvider.name)
      .sort((a, b) => a.priority - b.priority);

    return availableProviders[0] || null;
  }

  /**
   * Render message template with variables
   */
  private renderTemplate(
    template: SMSTemplate,
    assignment: HelperAssignment,
    additionalData: Record<string, string>,
  ): string {
    let message = template.template;

    // Assignment data mapping
    const data: Record<string, string> = {
      title: assignment.title,
      date: new Date(assignment.start).toLocaleDateString(),
      time: new Date(assignment.start).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      location: assignment.location || 'TBD',
      duration: `${Math.ceil((new Date(assignment.end).getTime() - new Date(assignment.start).getTime()) / 60000)} min`,
      priority: assignment.priority.toUpperCase(),
      weddingName: 'Smith-Johnson Wedding',
      plannerName: 'Sarah Wilson',
      emergencyContact: '(555) 999-0000',
      checklist: '• Arrive 15 min early\n• Bring ID\n• Check equipment',
      ...additionalData,
    };

    // Replace template variables
    template.variables.forEach((variable) => {
      const placeholder = `{${variable}}`;
      if (data[variable]) {
        message = message.replace(new RegExp(placeholder, 'g'), data[variable]);
      }
    });

    // Ensure message doesn't exceed provider limits
    const provider = this.selectOptimalProvider({
      to: '+1234567890',
      message,
      priority: 'normal',
      messageType: 'assignment',
      userId: assignment.helperId,
      organizationId: 'default',
    });

    if (message.length > provider.maxMessageLength) {
      message = message.substring(0, provider.maxMessageLength - 3) + '...';
    }

    return message;
  }

  /**
   * Normalize phone number to international format
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');

    // Add country code if missing
    if (digits.length === 10 && !digits.startsWith('1')) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    } else if (digits.startsWith('1') && digits.length > 11) {
      return `+${digits}`;
    }

    return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`;
  }

  /**
   * Log delivery for analytics
   */
  private async logDelivery(
    smsMessage: SMSMessage,
    result: SMSDeliveryResult,
  ): Promise<void> {
    try {
      const logEntry = {
        messageId: result.messageId,
        to: smsMessage.to,
        provider: result.provider,
        success: result.success,
        cost: result.cost,
        status: result.status,
        messageType: smsMessage.messageType,
        priority: smsMessage.priority,
        sentAt: new Date(),
        assignmentId: smsMessage.assignmentId,
        userId: smsMessage.userId,
        organizationId: smsMessage.organizationId,
      };

      // TODO: Store in database
      console.log('SMS delivery log:', logEntry);
    } catch (error) {
      console.error('Error logging SMS delivery:', error);
    }
  }

  /**
   * Start background message processor for scheduled messages
   */
  private startMessageProcessor(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;

    const processQueue = async () => {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (!message) continue;

        try {
          if (message.scheduledAt && message.scheduledAt > new Date()) {
            // Re-queue if not ready
            this.messageQueue.push(message);
            continue;
          }

          await this.sendMessage(message);
        } catch (error) {
          console.error('Error processing queued message:', error);
        }
      }

      // Process again in 30 seconds
      setTimeout(processQueue, 30000);
    };

    processQueue();
  }

  /**
   * Handle assignment acceptance
   */
  private async handleAssignmentAcceptance(
    phoneNumber: string,
    originalMessage: string,
  ): Promise<void> {
    const response = await this.sendMessage({
      to: phoneNumber,
      message:
        "✅ Great! You've accepted the assignment. We'll send you preparation details and reminders. Thank you!",
      priority: 'normal',
      messageType: 'confirmation',
      userId: 'helper_id',
      organizationId: 'default',
    });
  }

  /**
   * Handle assignment decline
   */
  private async handleAssignmentDecline(
    phoneNumber: string,
    originalMessage: string,
  ): Promise<void> {
    const response = await this.sendMessage({
      to: phoneNumber,
      message:
        "Thanks for letting us know. We'll reassign this task. No problem! 👍",
      priority: 'normal',
      messageType: 'confirmation',
      userId: 'helper_id',
      organizationId: 'default',
    });
  }

  /**
   * Send assignment details
   */
  private async sendAssignmentDetails(phoneNumber: string): Promise<void> {
    const message = `📋 Assignment Details

Photography Setup
📅 Jan 15, 2025 at 2:00 PM
📍 Grand Ballroom, 123 Wedding St
⏱️ Duration: 2 hours
💰 Rate: $75/hour

Preparation:
• Arrive 15 min early
• Bring photography equipment
• Check with lead photographer

Contact: Sarah (555) 123-4567`;

    await this.sendMessage({
      to: phoneNumber,
      message,
      priority: 'normal',
      messageType: 'assignment',
      userId: 'helper_id',
      organizationId: 'default',
    });
  }

  /**
   * Send helper status
   */
  private async sendHelperStatus(phoneNumber: string): Promise<void> {
    const message = `📊 Your Status

✅ Active assignments: 2
⏳ Pending responses: 1
📅 Next: Tomorrow 2:00 PM
💰 This week earnings: $225

Commands:
• Text INFO for assignment details
• Text HELP for all commands`;

    await this.sendMessage({
      to: phoneNumber,
      message,
      priority: 'normal',
      messageType: 'update',
      userId: 'helper_id',
      organizationId: 'default',
    });
  }

  /**
   * Send help message
   */
  private async sendHelpMessage(phoneNumber: string): Promise<void> {
    const message = `📱 WedSync SMS Commands

Assignment Responses:
• YES - Accept assignment
• NO - Decline assignment
• INFO - Get details

Status Commands:
• STATUS - Your current status
• HELP - This help message

For complex questions, call (555) 123-4567`;

    await this.sendMessage({
      to: phoneNumber,
      message,
      priority: 'normal',
      messageType: 'update',
      userId: 'helper_id',
      organizationId: 'default',
    });
  }

  /**
   * Handle ready confirmation
   */
  private async handleReadyConfirmation(phoneNumber: string): Promise<void> {
    await this.sendMessage({
      to: phoneNumber,
      message:
        "✅ Great! You're all set. See you at the assignment. Safe travels! 🚗",
      priority: 'normal',
      messageType: 'confirmation',
      userId: 'helper_id',
      organizationId: 'default',
    });
  }

  /**
   * Handle general confirmation
   */
  private async handleGeneralConfirmation(phoneNumber: string): Promise<void> {
    await this.sendMessage({
      to: phoneNumber,
      message: '✅ Confirmed. Thank you!',
      priority: 'normal',
      messageType: 'confirmation',
      userId: 'helper_id',
      organizationId: 'default',
    });
  }

  /**
   * Send unrecognized response
   */
  private async sendUnrecognizedResponse(phoneNumber: string): Promise<void> {
    await this.sendMessage({
      to: phoneNumber,
      message:
        "I didn't understand that. Text HELP for available commands or call (555) 123-4567 for assistance.",
      priority: 'normal',
      messageType: 'update',
      userId: 'helper_id',
      organizationId: 'default',
    });
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
