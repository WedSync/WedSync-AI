import { Twilio } from 'twilio';
import type {
  NotificationChannelProvider,
  ProcessedNotification,
  NotificationDeliveryResult,
  NotificationEvent,
} from '../../../types/notification-backend';

export class SMSNotificationProvider implements NotificationChannelProvider {
  private client: Twilio;
  private fromNumber: string;

  constructor() {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error(
        'TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables are required',
      );
    }

    if (!process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('TWILIO_PHONE_NUMBER environment variable is required');
    }

    this.client = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  async send(
    notification: ProcessedNotification,
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();

    try {
      // Validate phone number format
      const normalizedPhone = this.normalizePhoneNumber(
        notification.recipientId,
      );
      if (!this.isValidPhoneNumber(normalizedPhone)) {
        return {
          success: false,
          channel: 'sms',
          providerId: 'twilio',
          recipientId: notification.recipientId,
          messageId: '',
          timestamp: new Date(),
          error: 'Invalid phone number format',
          latency: Date.now() - startTime,
        };
      }

      // Generate SMS content based on notification type and priority
      const smsContent = this.generateSMSContent(notification);

      // Determine messaging service SID based on priority
      const messagingServiceSid = this.getMessagingServiceSid(
        notification.priority,
      );

      // Send SMS via Twilio
      const message = await this.client.messages.create({
        body: smsContent,
        from: messagingServiceSid || this.fromNumber,
        to: normalizedPhone,
        ...(messagingServiceSid && { messagingServiceSid }),
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`,
        maxPrice: this.getMaxPrice(notification.priority),
        validityPeriod: this.getValidityPeriod(notification.priority),
      });

      return {
        success: true,
        channel: 'sms',
        providerId: 'twilio',
        recipientId: notification.recipientId,
        messageId: message.sid,
        timestamp: new Date(),
        latency: Date.now() - startTime,
        metadata: {
          status: message.status,
          direction: message.direction,
          price: message.price,
          priceUnit: message.priceUnit,
        },
      };
    } catch (error: any) {
      // Handle Twilio-specific errors
      const errorMessage = this.handleTwilioError(error);

      return {
        success: false,
        channel: 'sms',
        providerId: 'twilio',
        recipientId: notification.recipientId,
        messageId: '',
        timestamp: new Date(),
        error: errorMessage,
        latency: Date.now() - startTime,
        metadata: {
          errorCode: error.code,
          moreInfo: error.moreInfo,
        },
      };
    }
  }

  async getProviderStatus(): Promise<{
    healthy: boolean;
    latency: number;
    errorRate: number;
  }> {
    const startTime = Date.now();

    try {
      // Check account balance and status
      const account = await this.client.api.v2010
        .accounts(process.env.TWILIO_ACCOUNT_SID)
        .fetch();

      // Check if we have a valid phone number
      const phoneNumbers = await this.client.incomingPhoneNumbers.list({
        limit: 1,
      });

      return {
        healthy: account.status === 'active' && phoneNumbers.length > 0,
        latency: Date.now() - startTime,
        errorRate: 0, // Would be calculated from historical data
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        errorRate: 1,
      };
    }
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // Add country code if missing (assume US/CA for now)
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }

    return `+${cleaned}`;
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  private generateSMSContent(notification: ProcessedNotification): string {
    const weddingTitle = notification.event.context?.weddingTitle || 'Wedding';
    const weddingDate = notification.event.context?.weddingDate || '';

    switch (notification.event.type) {
      case 'wedding_emergency':
      case 'emergency':
        return this.generateEmergencySMS(notification);

      case 'weather_alert':
        return this.generateWeatherSMS(notification);

      case 'vendor_update':
      case 'vendor_message':
        return this.generateVendorSMS(notification);

      case 'timeline_change':
      case 'schedule_update':
        return this.generateTimelineSMS(notification);

      case 'payment_reminder':
        return this.generatePaymentSMS(notification);

      case 'venue_confirmation':
        return this.generateVenueConfirmationSMS(notification);

      default:
        return this.generateDefaultSMS(notification);
    }
  }

  private generateEmergencySMS(notification: ProcessedNotification): string {
    const context = notification.event.context;
    const emergencyType = context?.emergencyType || 'Emergency';
    const weddingTitle = context?.weddingTitle || 'Wedding';
    const actionRequired = context?.actionRequired || 'Please respond ASAP';
    const emergencyContact = context?.emergencyContact || '';

    return `🚨 WEDDING EMERGENCY: ${emergencyType} for ${weddingTitle}. ${notification.content} ${actionRequired}${emergencyContact ? ` Call: ${emergencyContact}` : ''}`;
  }

  private generateWeatherSMS(notification: ProcessedNotification): string {
    const context = notification.event.context;
    const alertType = context?.alertType || 'Weather Alert';
    const weddingTitle = context?.weddingTitle || 'Wedding';
    const recommendations = context?.recommendations || '';

    return `🌦️ ${alertType} for ${weddingTitle}: ${notification.content}${recommendations ? ` ${recommendations}` : ''} Check app for updates.`;
  }

  private generateVendorSMS(notification: ProcessedNotification): string {
    const context = notification.event.context;
    const vendorName = context?.vendorName || 'Vendor';
    const vendorType = context?.vendorType || '';
    const weddingTitle = context?.weddingTitle || 'Wedding';

    return `📋 ${vendorName}${vendorType ? ` (${vendorType})` : ''} update for ${weddingTitle}: ${notification.content} View full details in app.`;
  }

  private generateTimelineSMS(notification: ProcessedNotification): string {
    const context = notification.event.context;
    const changeType = context?.changeType || 'Timeline change';
    const weddingTitle = context?.weddingTitle || 'Wedding';
    const newTime = context?.newTime || '';

    return `⏰ ${changeType} for ${weddingTitle}${newTime ? `: Now at ${newTime}` : ''}. ${notification.content} Check timeline in app.`;
  }

  private generatePaymentSMS(notification: ProcessedNotification): string {
    const context = notification.event.context;
    const weddingTitle = context?.weddingTitle || 'Wedding';
    const amount = context?.amount || '';
    const dueDate = context?.dueDate || '';

    return `💳 Payment reminder for ${weddingTitle}${amount ? `: ${amount}` : ''}${dueDate ? ` due ${dueDate}` : ''}. ${notification.content} Pay in app.`;
  }

  private generateVenueConfirmationSMS(
    notification: ProcessedNotification,
  ): string {
    const context = notification.event.context;
    const venueName = context?.venueName || 'Venue';
    const weddingTitle = context?.weddingTitle || 'Wedding';
    const confirmationCode = context?.confirmationCode || '';

    return `🏛️ ${venueName} confirmation for ${weddingTitle}${confirmationCode ? ` (Code: ${confirmationCode})` : ''}. ${notification.content}`;
  }

  private generateDefaultSMS(notification: ProcessedNotification): string {
    const weddingTitle = notification.event.context?.weddingTitle || 'Wedding';
    return `📱 ${weddingTitle} update: ${notification.content} Check WedSync app for details.`;
  }

  private getMessagingServiceSid(priority: string): string | undefined {
    // Use different messaging services based on priority
    switch (priority) {
      case 'emergency':
        return process.env.TWILIO_EMERGENCY_MESSAGING_SERVICE_SID;
      case 'high':
        return process.env.TWILIO_HIGH_PRIORITY_MESSAGING_SERVICE_SID;
      default:
        return undefined; // Use default phone number
    }
  }

  private getMaxPrice(priority: string): string {
    // Set maximum price per message based on priority
    switch (priority) {
      case 'emergency':
        return '1.00'; // Allow higher cost for emergency messages
      case 'high':
        return '0.50';
      default:
        return '0.10'; // Standard SMS price limit
    }
  }

  private getValidityPeriod(priority: string): number {
    // Set message validity period in seconds
    switch (priority) {
      case 'emergency':
        return 3600; // 1 hour for emergency messages
      case 'high':
        return 14400; // 4 hours for high priority
      default:
        return 86400; // 24 hours for normal messages
    }
  }

  private handleTwilioError(error: any): string {
    // Map Twilio error codes to user-friendly messages
    const errorMappings: Record<number, string> = {
      21211: 'Invalid phone number',
      21214: 'Invalid phone number format',
      21408: 'Permission denied for this phone number',
      21610: 'Message blocked by carrier',
      21614: 'Invalid message body',
      30001: 'Message delivery failed - invalid destination',
      30002: 'Message delivery failed - unknown destination',
      30003: 'Message delivery failed - unreachable destination',
      30004: 'Message blocked by carrier',
      30005: 'Message delivery failed - unknown error',
      30006: 'Message delivery failed - landline not supported',
      21606: 'Message contains spam content',
      63016: 'Message failed fraud check',
    };

    if (error.code && errorMappings[error.code]) {
      return errorMappings[error.code];
    }

    // Return generic error message for unmapped errors
    return error.message || 'SMS delivery failed';
  }
}
