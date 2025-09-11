import { Twilio } from 'twilio';
import type {
  NotificationChannelProvider,
  ProcessedNotification,
  NotificationDeliveryResult,
  NotificationEvent,
} from '../../../types/notification-backend';

interface VoiceMessage {
  message: string;
  voice: 'alice' | 'man' | 'woman';
  language: string;
  speed: number;
  loop: number;
}

export class VoiceNotificationProvider implements NotificationChannelProvider {
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
      // Only use voice for emergency notifications or when specifically requested
      if (
        notification.priority !== 'emergency' &&
        !this.shouldUseVoice(notification)
      ) {
        return {
          success: false,
          channel: 'voice',
          providerId: 'twilio',
          recipientId: notification.recipientId,
          messageId: '',
          timestamp: new Date(),
          error:
            'Voice notifications are only available for emergency situations',
          latency: Date.now() - startTime,
        };
      }

      // Validate phone number format
      const normalizedPhone = this.normalizePhoneNumber(
        notification.recipientId,
      );
      if (!this.isValidPhoneNumber(normalizedPhone)) {
        return {
          success: false,
          channel: 'voice',
          providerId: 'twilio',
          recipientId: notification.recipientId,
          messageId: '',
          timestamp: new Date(),
          error: 'Invalid phone number format',
          latency: Date.now() - startTime,
        };
      }

      // Generate voice message content
      const voiceMessage = this.generateVoiceMessage(notification);

      // Create TwiML for the voice call
      const twiml = this.generateTwiML(voiceMessage, notification);

      // Make the voice call
      const call = await this.client.calls.create({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/voice?notification=${notification.id}`,
        to: normalizedPhone,
        from: this.fromNumber,
        method: 'POST',
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/call-status`,
        statusCallbackEvent: [
          'initiated',
          'ringing',
          'answered',
          'completed',
          'busy',
          'failed',
          'no-answer',
          'canceled',
        ],
        statusCallbackMethod: 'POST',
        timeout: this.getCallTimeout(notification.priority),
        machineDetection: 'Enable',
        machineDetectionTimeout: 5,
        record: notification.priority === 'emergency', // Record emergency calls for compliance
        recordingStatusCallback:
          notification.priority === 'emergency'
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/recording-status`
            : undefined,
      });

      return {
        success: true,
        channel: 'voice',
        providerId: 'twilio',
        recipientId: notification.recipientId,
        messageId: call.sid,
        timestamp: new Date(),
        latency: Date.now() - startTime,
        metadata: {
          status: call.status,
          direction: call.direction,
          callSid: call.sid,
          duration: call.duration,
          price: call.price,
          priceUnit: call.priceUnit,
        },
      };
    } catch (error: any) {
      // Handle Twilio-specific errors
      const errorMessage = this.handleTwilioError(error);

      return {
        success: false,
        channel: 'voice',
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
      // Check account balance and voice capabilities
      const account = await this.client.api.v2010
        .accounts(process.env.TWILIO_ACCOUNT_SID)
        .fetch();

      // Check if we have voice-enabled phone numbers
      const phoneNumbers = await this.client.incomingPhoneNumbers.list({
        voiceEnabled: true,
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

  private shouldUseVoice(notification: ProcessedNotification): boolean {
    // Check if voice is explicitly requested or if it's a critical wedding situation
    const criticalTypes = [
      'venue_emergency',
      'vendor_cancellation_emergency',
      'weather_emergency',
      'timeline_critical_change',
    ];

    return (
      criticalTypes.includes(notification.event.type) ||
      notification.event.context?.useVoice === true
    );
  }

  private generateVoiceMessage(
    notification: ProcessedNotification,
  ): VoiceMessage {
    const context = notification.event.context;
    const weddingTitle = context?.weddingTitle || 'Wedding';
    const weddingDate = context?.weddingDate || 'the scheduled date';

    let message = '';
    let voice: 'alice' | 'man' | 'woman' = 'alice';
    let speed = 0; // Normal speed
    let loop = 1;

    switch (notification.event.type) {
      case 'wedding_emergency':
      case 'emergency':
        message = this.generateEmergencyVoiceMessage(
          notification,
          weddingTitle,
          weddingDate,
        );
        voice = 'alice'; // Clear, professional voice for emergencies
        speed = -1; // Slightly slower for clarity
        loop = 2; // Repeat emergency messages
        break;

      case 'venue_emergency':
        message = `Urgent wedding venue emergency for ${weddingTitle} on ${weddingDate}. ${context?.emergencyType || 'Venue issue'}. ${notification.content} Please call back immediately at ${context?.emergencyContact || 'the venue'} for details.`;
        voice = 'alice';
        speed = -1;
        loop = 2;
        break;

      case 'vendor_cancellation_emergency':
        message = `Critical vendor cancellation for ${weddingTitle} on ${weddingDate}. ${context?.vendorType || 'A vendor'} has cancelled. ${notification.content} Immediate replacement needed. Please call back urgently.`;
        voice = 'alice';
        speed = -1;
        loop = 2;
        break;

      case 'weather_emergency':
        message = `Severe weather alert for ${weddingTitle} on ${weddingDate}. ${context?.alertType || 'Weather emergency'}. ${notification.content} Backup plans may need activation. Please call back immediately.`;
        voice = 'alice';
        speed = -1;
        loop = 2;
        break;

      case 'timeline_critical_change':
        message = `Critical timeline change for ${weddingTitle} on ${weddingDate}. ${context?.changeType || 'Schedule change'} affecting multiple vendors. ${notification.content} Coordination required immediately.`;
        voice = 'alice';
        speed = 0;
        loop = 1;
        break;

      default:
        message = `Important update for ${weddingTitle} on ${weddingDate}. ${notification.content} Please check your WedSync dashboard for full details.`;
        voice = 'alice';
        speed = 0;
        loop = 1;
    }

    return {
      message: this.sanitizeVoiceMessage(message),
      voice,
      language: 'en-US',
      speed,
      loop,
    };
  }

  private generateEmergencyVoiceMessage(
    notification: ProcessedNotification,
    weddingTitle: string,
    weddingDate: string,
  ): string {
    const context = notification.event.context;
    const emergencyType = context?.emergencyType || 'Wedding emergency';
    const actionRequired = context?.actionRequired || 'immediate response';
    const emergencyContact = context?.emergencyContact || '';

    let message = `Wedding emergency alert for ${weddingTitle} on ${weddingDate}. `;
    message += `${emergencyType}. ${notification.content} `;
    message += `${actionRequired} required. `;

    if (emergencyContact) {
      message += `Emergency contact: ${emergencyContact}. `;
    }

    message += 'Please call back immediately for coordination.';

    return message;
  }

  private sanitizeVoiceMessage(message: string): string {
    // Remove/replace characters that don't work well with text-to-speech
    return message
      .replace(/[🚨🌦️📋⏰💳🏛️📱]/g, '') // Remove emojis
      .replace(/&/g, 'and') // Replace ampersands
      .replace(/\@/g, 'at') // Replace @ symbols
      .replace(/\$/g, 'dollars') // Replace dollar signs
      .replace(/\%/g, 'percent') // Replace percent signs
      .replace(/\#/g, 'number') // Replace hash symbols
      .replace(/\+/g, 'plus') // Replace plus signs
      .replace(/\*/g, '') // Remove asterisks
      .replace(/\[|\]/g, '') // Remove square brackets
      .replace(/\{|\}/g, '') // Remove curly braces
      .replace(/\</g, 'less than') // Replace less than
      .replace(/\>/g, 'greater than') // Replace greater than
      .replace(/\|/g, ' or ') // Replace pipes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private generateTwiML(
    voiceMessage: VoiceMessage,
    notification: ProcessedNotification,
  ): string {
    const pauseBetweenLoops =
      voiceMessage.loop > 1 ? '<Pause length="2"/>' : '';
    const sayElement = `<Say voice="${voiceMessage.voice}" language="${voiceMessage.language}">${voiceMessage.message}</Say>`;

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    // Add machine detection pause if needed
    if (notification.priority === 'emergency') {
      twiml += '<Pause length="1"/>'; // Brief pause to detect answering machines
    }

    // Add the main message (looped if needed)
    for (let i = 0; i < voiceMessage.loop; i++) {
      if (i > 0) twiml += pauseBetweenLoops;
      twiml += sayElement;
    }

    // Add callback instructions for emergency calls
    if (notification.priority === 'emergency') {
      twiml += '<Pause length="2"/>';
      twiml +=
        '<Say voice="alice" language="en-US">Press any key to confirm you received this message, or hang up to receive a follow-up call.</Say>';
      twiml +=
        '<Gather numDigits="1" timeout="10" action="/api/webhooks/twilio/voice-response" method="POST">';
      twiml += '<Say voice="alice" language="en-US">Press any key now.</Say>';
      twiml += '</Gather>';
      twiml +=
        '<Say voice="alice" language="en-US">No response received. A follow-up call will be placed shortly.</Say>';
    }

    twiml += '</Response>';

    return twiml;
  }

  private getCallTimeout(priority: string): number {
    // Call timeout in seconds
    switch (priority) {
      case 'emergency':
        return 60; // 1 minute for emergency calls
      case 'high':
        return 45;
      default:
        return 30; // 30 seconds for normal calls
    }
  }

  private handleTwilioError(error: any): string {
    // Map Twilio error codes to user-friendly messages
    const errorMappings: Record<number, string> = {
      11200: 'HTTP retrieval failure',
      11205: 'HTTP connection failure',
      13201: 'Invalid phone number',
      13212: 'Invalid URL',
      13213: 'Invalid method',
      13214: 'Invalid status callback URL',
      13215: 'Invalid status callback method',
      13216: 'Invalid hangup callback URL',
      13217: 'Invalid hangup callback method',
      13218: 'Invalid heartbeat callback URL',
      13219: 'Invalid heartbeat callback method',
      13220: 'Invalid phone number format',
      13221: 'Invalid from phone number',
      13224: 'Invalid to phone number',
      13225: 'Invalid caller ID',
      13226: 'Invalid send digits',
      13227: 'Invalid timeout',
      21220: 'Invalid phone number',
      21401: 'Invalid phone number',
      21421: 'Phone number not verified',
      21450: 'Phone number not found',
      21452: 'Invalid caller ID',
      21453: 'Phone number not verified for outbound calling',
      21501: 'Resource not found',
      21502: 'Invalid application',
      21210: 'HTTP retrieval failure',
      30001: 'Queue overflow',
      30002: 'Account suspended',
      30003: 'Unreachable destination handset',
      30004: 'Message blocked',
      30005: 'Unknown destination handset',
      30006: 'Landline or unreachable carrier',
      30007: 'Carrier violation',
      30008: 'Unknown error',
      81000: 'Machine detection failed',
      81001: 'Machine detection timeout',
    };

    if (error.code && errorMappings[error.code]) {
      return errorMappings[error.code];
    }

    // Return generic error message for unmapped errors
    return error.message || 'Voice call failed';
  }
}
