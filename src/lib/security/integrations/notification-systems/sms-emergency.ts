/**
 * WS-190: SMS Emergency Notification System for WedSync Incident Response
 *
 * Integrates with Twilio SMS service for emergency text notifications during
 * critical security incidents, especially for wedding day emergencies.
 */

import { z } from 'zod';
import type { Incident } from '../incident-orchestrator';

// Mock Twilio interface for TypeScript compilation
// TODO: Replace with actual Twilio SDK when implementing
interface TwilioMessage {
  sid: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  price?: string;
}

interface TwilioMessages {
  create(options: {
    body: string;
    from: string;
    to: string;
  }): Promise<TwilioMessage>;
}

interface TwilioAccount {
  fetch(): Promise<{ status: string }>;
  balance: {
    fetch(): Promise<{ balance: string; currency: string }>;
  };
}

interface TwilioAPI {
  accounts: () => TwilioAccount;
}

interface Twilio {
  messages: TwilioMessages;
  api: TwilioAPI;
}

// Mock Twilio class for compilation
class MockTwilio implements Twilio {
  messages: TwilioMessages;
  api: TwilioAPI;

  constructor(accountSid: string, authToken: string) {
    this.messages = {
      create: async (options) =>
        ({
          sid: `mock-${Date.now()}`,
          status: 'queued',
          price: '0.05',
        }) as TwilioMessage,
    };

    this.api = {
      accounts: () => ({
        fetch: async () => ({ status: 'active' }),
        balance: {
          fetch: async () => ({ balance: '10.00', currency: 'USD' }),
        },
      }),
    };
  }
}

// Type alias for the constructor
const TwilioClient = MockTwilio;

// SMS configuration
const SMSConfigSchema = z.object({
  accountSid: z.string().min(1),
  authToken: z.string().min(1),
  fromNumber: z.string().regex(/^\+[1-9]\d{1,14}$/), // E.164 format
  timeoutMs: z.number().default(10000),
  maxRetries: z.number().default(3),
  rateLimitDelay: z.number().default(1000), // 1 second between messages
  maxMessageLength: z.number().default(160), // Standard SMS length
});

type SMSConfig = z.infer<typeof SMSConfigSchema>;

// SMS recipient information
interface SMSRecipient {
  phoneNumber: string; // E.164 format
  name?: string;
  role?:
    | 'user'
    | 'supplier'
    | 'venue'
    | 'coordinator'
    | 'security'
    | 'emergency';
  weddingId?: string;
  timezone?: string;
}

// SMS send result
interface SMSResult {
  sid: string;
  recipient: string;
  status: 'sent' | 'failed' | 'queued';
  error?: string;
  cost?: string;
}

// Batch SMS result
interface BatchSMSResult {
  sent: number;
  failed: number;
  queued: number;
  results: SMSResult[];
  duration: number;
  totalCost: number;
}

/**
 * SMS emergency notification system for critical wedding platform incidents
 * Provides immediate text message alerts for time-sensitive security events
 */
export class SMSEmergencyNotifier {
  private config: SMSConfig;
  private twilio: Twilio;

  // Emergency contact roles with priority levels
  private readonly rolePriority = {
    emergency: 1, // On-call emergency contacts
    security: 2, // Security team
    coordinator: 3, // Wedding coordinators
    venue: 4, // Venue managers
    supplier: 5, // Wedding suppliers
    user: 6, // End users
  };

  // SMS templates with character limits
  private readonly templates = {
    critical: {
      maxLength: 160,
      prefix: '🚨 CRITICAL',
    },
    emergency: {
      maxLength: 160,
      prefix: '⚠️ URGENT',
    },
    wedding_day: {
      maxLength: 160,
      prefix: '💒 WEDDING',
    },
    resolution: {
      maxLength: 160,
      prefix: '✅ RESOLVED',
    },
  };

  constructor() {
    // Load configuration from environment variables
    this.config = SMSConfigSchema.parse({
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.TWILIO_FROM_NUMBER || '',
      timeoutMs: parseInt(process.env.SMS_TIMEOUT_MS || '10000'),
      maxRetries: parseInt(process.env.SMS_MAX_RETRIES || '3'),
      rateLimitDelay: parseInt(process.env.SMS_RATE_LIMIT_DELAY || '1000'),
      maxMessageLength: parseInt(process.env.SMS_MAX_LENGTH || '160'),
    });

    // Initialize Twilio client (mock implementation for TypeScript compilation)
    this.twilio = new TwilioClient(
      this.config.accountSid,
      this.config.authToken,
    );
  }

  /**
   * Send emergency SMS for critical incidents - highest priority
   * Used for wedding day emergencies requiring immediate response
   */
  async sendEmergencyAlert(
    incident: Incident,
    recipients: SMSRecipient[],
  ): Promise<BatchSMSResult> {
    // Sort recipients by priority role
    const sortedRecipients = this.sortRecipientsByPriority(recipients);

    const message = this.createEmergencyMessage(incident);
    return this.sendBatchSMS(sortedRecipients, message);
  }

  /**
   * Send critical alert SMS for high-severity incidents
   */
  async sendCriticalAlert(
    incident: Incident,
    recipients: SMSRecipient[],
  ): Promise<BatchSMSResult> {
    const message = this.createCriticalMessage(incident);
    return this.sendBatchSMS(recipients, message);
  }

  /**
   * Send wedding day specific alerts to coordinators and couples
   */
  async sendWeddingDayAlert(
    incident: Incident,
    recipients: SMSRecipient[],
    weddingDate: string,
    coordinatorPhone?: string,
  ): Promise<BatchSMSResult> {
    const message = this.createWeddingDayMessage(incident, weddingDate);

    // Add coordinator as high-priority recipient if provided
    const enhancedRecipients = [...recipients];
    if (coordinatorPhone) {
      enhancedRecipients.unshift({
        phoneNumber: coordinatorPhone,
        name: 'Wedding Coordinator',
        role: 'coordinator',
        weddingId: incident.weddingId,
      });
    }

    return this.sendBatchSMS(enhancedRecipients, message);
  }

  /**
   * Send data breach SMS notification with minimal details for security
   */
  async sendDataBreachAlert(
    incident: Incident,
    recipients: SMSRecipient[],
  ): Promise<BatchSMSResult> {
    const message = this.createDataBreachMessage(incident);
    return this.sendBatchSMS(recipients, message);
  }

  /**
   * Send resolution SMS when incident is closed
   */
  async sendResolutionAlert(
    incident: Incident,
    recipients: SMSRecipient[],
    resolutionTime: number,
  ): Promise<BatchSMSResult> {
    const message = this.createResolutionMessage(incident, resolutionTime);
    return this.sendBatchSMS(recipients, message);
  }

  /**
   * Send test SMS to verify connectivity
   */
  async sendTestMessage(recipient: SMSRecipient): Promise<SMSResult> {
    const message = `🧪 WedSync Security Test - This is a test SMS from our security system. Reply STOP to opt out. Time: ${new Date().toLocaleTimeString()}`;

    try {
      const result = await this.sendSingleSMS(recipient, message);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        sid: '',
        recipient: recipient.phoneNumber,
        status: 'failed',
        error: errorMessage,
      };
    }
  }

  /**
   * Create emergency message for critical wedding day incidents
   */
  private createEmergencyMessage(incident: Incident): string {
    const incidentType = incident.type.replace('_', ' ').toUpperCase();
    const weddingContext = incident.weddingId
      ? ` (Wedding ${incident.weddingId.substring(0, 8)})`
      : '';

    let message = `🚨 EMERGENCY: ${incidentType} detected${weddingContext}. `;

    // Add concise description within character limit
    const remainingLength = this.config.maxMessageLength - message.length - 50; // Reserve space for URL and signature
    const shortDescription =
      incident.description.length > remainingLength
        ? incident.description.substring(0, remainingLength - 3) + '...'
        : incident.description;

    message += shortDescription;
    message += ` Details: wedsync.com/i/${incident.id.substring(0, 8)}`;
    message += ` Call +44 20 7946 0958 ASAP`;

    return message.substring(0, this.config.maxMessageLength);
  }

  /**
   * Create critical alert message
   */
  private createCriticalMessage(incident: Incident): string {
    const incidentType = incident.type.replace('_', ' ').toUpperCase();
    const weddingContext = incident.weddingId
      ? ` Wedding ${incident.weddingId.substring(0, 8)}`
      : '';

    let message = `🚨 CRITICAL: ${incidentType}${weddingContext}. `;

    const remainingLength = this.config.maxMessageLength - message.length - 40;
    const shortDescription =
      incident.description.length > remainingLength
        ? incident.description.substring(0, remainingLength - 3) + '...'
        : incident.description;

    message += shortDescription;
    message += ` Check: wedsync.com/i/${incident.id.substring(0, 8)}`;

    return message.substring(0, this.config.maxMessageLength);
  }

  /**
   * Create wedding day specific message
   */
  private createWeddingDayMessage(
    incident: Incident,
    weddingDate: string,
  ): string {
    const incidentType = incident.type.replace('_', ' ');

    let message = `💒 WEDDING DAY ALERT (${weddingDate}): ${incidentType} may affect your event. `;

    const remainingLength = this.config.maxMessageLength - message.length - 35;
    const shortDescription =
      incident.description.length > remainingLength
        ? incident.description.substring(0, remainingLength - 3) + '...'
        : incident.description;

    message += shortDescription;
    message += ` Info: wedsync.com/w/${incident.id.substring(0, 8)}`;

    return message.substring(0, this.config.maxMessageLength);
  }

  /**
   * Create data breach message with security focus
   */
  private createDataBreachMessage(incident: Incident): string {
    let message = `🔐 SECURITY: WedSync data incident detected. `;
    message += `Your account may be affected. `;
    message += `Please review: wedsync.com/security/${incident.id.substring(0, 8)} `;
    message += `Change password immediately if requested.`;

    return message.substring(0, this.config.maxMessageLength);
  }

  /**
   * Create resolution message
   */
  private createResolutionMessage(
    incident: Incident,
    resolutionTime: number,
  ): string {
    const durationMinutes = Math.round(resolutionTime / (1000 * 60));
    const incidentType = incident.type.replace('_', ' ');

    let message = `✅ RESOLVED: ${incidentType} incident fixed in ${durationMinutes}min. `;
    message += `All services restored. `;
    message += `Report: wedsync.com/r/${incident.id.substring(0, 8)}`;

    return message.substring(0, this.config.maxMessageLength);
  }

  /**
   * Send batch SMS with rate limiting and prioritization
   */
  private async sendBatchSMS(
    recipients: SMSRecipient[],
    message: string,
  ): Promise<BatchSMSResult> {
    const startTime = Date.now();
    const results: SMSResult[] = [];
    let sent = 0;
    let failed = 0;
    let queued = 0;
    let totalCost = 0;

    // Process recipients with rate limiting
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      try {
        const result = await this.sendSingleSMS(recipient, message);
        results.push(result);

        if (result.status === 'sent') {
          sent++;
        } else if (result.status === 'queued') {
          queued++;
        } else {
          failed++;
        }

        // Add estimated cost (typical SMS cost)
        if (result.status === 'sent' || result.status === 'queued') {
          totalCost += 0.05; // Estimated $0.05 per SMS
        }

        // Rate limiting delay between messages
        if (i < recipients.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.config.rateLimitDelay),
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        results.push({
          sid: '',
          recipient: recipient.phoneNumber,
          status: 'failed',
          error: errorMessage,
        });
        failed++;
      }
    }

    const duration = Date.now() - startTime;

    // Log batch results
    this.logBatchResults(
      sent,
      failed,
      queued,
      duration,
      recipients.length,
      totalCost,
    );

    return {
      sent,
      failed,
      queued,
      results,
      duration,
      totalCost,
    };
  }

  /**
   * Send individual SMS with retry logic
   */
  private async sendSingleSMS(
    recipient: SMSRecipient,
    message: string,
    retryCount = 0,
  ): Promise<SMSResult> {
    try {
      const messageData = await this.twilio.messages.create({
        body: message,
        from: this.config.fromNumber,
        to: recipient.phoneNumber,
      });

      // Log successful send
      this.logSMSAttempt('success', recipient.phoneNumber, message.length);

      return {
        sid: messageData.sid,
        recipient: recipient.phoneNumber,
        status: messageData.status === 'queued' ? 'queued' : 'sent',
        cost: messageData.price || '0.05',
      };
    } catch (error) {
      if (retryCount < this.config.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendSingleSMS(recipient, message, retryCount + 1);
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Log failed send
      this.logSMSAttempt(
        'failure',
        recipient.phoneNumber,
        message.length,
        errorMessage,
      );

      throw new Error(
        `Failed to send SMS to ${recipient.phoneNumber}: ${errorMessage}`,
      );
    }
  }

  /**
   * Sort recipients by role priority for emergency scenarios
   */
  private sortRecipientsByPriority(recipients: SMSRecipient[]): SMSRecipient[] {
    return recipients.sort((a, b) => {
      const aPriority = this.rolePriority[a.role || 'user'] || 10;
      const bPriority = this.rolePriority[b.role || 'user'] || 10;
      return aPriority - bPriority;
    });
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // E.164 format validation
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Format phone number to E.164 if possible
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');

    // Add + prefix if missing and appears to be international format
    if (!phoneNumber.startsWith('+') && digits.length > 10) {
      return `+${digits}`;
    }

    return phoneNumber;
  }

  /**
   * Test SMS connectivity and account status
   */
  async testConnection(): Promise<boolean> {
    try {
      // Get account info to verify credentials
      const account = await this.twilio.api.accounts().fetch();

      if (account.status !== 'active') {
        console.error('Twilio account not active:', account.status);
        return false;
      }

      return true;
    } catch (error) {
      console.error('SMS connection test failed:', error);
      return false;
    }
  }

  /**
   * Get SMS delivery status for a message
   */
  async getMessageStatus(messageSid: string): Promise<{
    status: string;
    errorCode?: number;
    errorMessage?: string;
    dateUpdated?: Date;
  }> {
    try {
      // Mock message status check
      const message = { status: 'delivered', sid: messageSid };

      return {
        status: message.status,
        errorCode: message.errorCode || undefined,
        errorMessage: message.errorMessage || undefined,
        dateUpdated: message.dateUpdated || undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get message status: ${errorMessage}`);
    }
  }

  /**
   * Get account balance and usage information
   */
  async getAccountInfo(): Promise<{
    balance: string;
    currency: string;
    status: string;
  }> {
    try {
      const account = await this.twilio.api.accounts().fetch();
      const balance = await this.twilio.api.accounts().balance.fetch();

      return {
        balance: balance.balance,
        currency: balance.currency,
        status: account.status,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get account info: ${errorMessage}`);
    }
  }

  /**
   * Log SMS attempt for monitoring and billing
   */
  private logSMSAttempt(
    status: string,
    recipient: string,
    messageLength: number,
    error?: string,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      integration: 'sms',
      status,
      recipient: recipient.substring(0, 8) + '****', // Partially mask phone number
      message_length: messageLength,
      error,
      estimated_cost: status === 'success' ? 0.05 : 0,
    };

    console.log('SMS attempt log:', JSON.stringify(logEntry));
  }

  /**
   * Log batch SMS results for monitoring
   */
  private logBatchResults(
    sent: number,
    failed: number,
    queued: number,
    duration: number,
    total: number,
    totalCost: number,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      integration: 'sms',
      sent,
      failed,
      queued,
      total,
      duration,
      success_rate: ((sent + queued) / total) * 100,
      total_cost: totalCost,
    };

    console.log('SMS batch results:', JSON.stringify(logEntry));
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<SMSConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update Twilio client if credentials changed
    if (newConfig.accountSid || newConfig.authToken) {
      this.twilio = new TwilioClient(
        newConfig.accountSid || this.config.accountSid,
        newConfig.authToken || this.config.authToken,
      );
    }
  }

  /**
   * Get current configuration (sanitized - no credentials)
   */
  getConfig(): Omit<SMSConfig, 'accountSid' | 'authToken'> {
    const { accountSid, authToken, ...sanitizedConfig } = this.config;
    return sanitizedConfig;
  }

  /**
   * Add recipients to SMS blacklist (opt-out management)
   */
  async addToBlacklist(
    phoneNumber: string,
    reason = 'user_request',
  ): Promise<boolean> {
    // In a real implementation, this would update a database or external service
    // For now, log the blacklist addition
    console.log(`SMS blacklist addition: ${phoneNumber} (reason: ${reason})`);
    return true;
  }

  /**
   * Check if phone number is blacklisted
   */
  async isBlacklisted(phoneNumber: string): Promise<boolean> {
    // In a real implementation, this would check against a database or external service
    // For now, return false (no blacklist checking)
    return false;
  }
}
