/**
 * WS-101 SMS Channel Handler
 * Handles alert delivery through SMS with Twilio
 */

import { Alert, AlertSeverity } from '../Alert';
import twilio from 'twilio';

export interface SmsChannelConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  defaultRecipients: string[];
  emergencyRecipients?: string[];
  weddingDayRecipients?: string[];
  messagingServiceSid?: string;
  enableShortLinks?: boolean;
  maxMessageLength?: number;
  enableBatching?: boolean;
  rateLimitPerMinute?: number;
}

interface SmsQueueItem {
  alert: Alert;
  recipients: string[];
  retryCount: number;
  scheduledTime?: Date;
}

export class SmsChannel {
  private client: twilio.Twilio;
  private config: SmsChannelConfig;
  private isHealthy: boolean = true;
  private lastHealthCheck: Date = new Date();
  private smsQueue: SmsQueueItem[] = [];
  private processing: boolean = false;
  private sentMessages: Map<string, Date> = new Map(); // Track sent messages for rate limiting
  private shortLinkCache: Map<string, string> = new Map(); // Cache short links

  constructor(config: SmsChannelConfig) {
    this.config = {
      ...config,
      maxMessageLength: config.maxMessageLength || 160,
      rateLimitPerMinute: config.rateLimitPerMinute || 60,
    };
    this.validateConfig();
    this.client = twilio(config.accountSid, config.authToken);
    this.startQueueProcessor();
  }

  /**
   * Send alert via SMS
   */
  public async send(alert: Alert, context?: any): Promise<void> {
    try {
      const recipients = this.selectRecipients(alert, context);

      if (recipients.length === 0) {
        console.warn('No SMS recipients configured for alert');
        return;
      }

      // Format message for SMS
      const message = await this.formatMessage(alert, context);

      // Check rate limits
      await this.enforceRateLimit(recipients.length);

      // Send to each recipient
      const sendPromises = recipients.map((recipient) =>
        this.sendSms(recipient, message, alert),
      );

      // Wait for all sends with timeout
      await Promise.race([
        Promise.all(sendPromises),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SMS send timeout')), 10000),
        ),
      ]);

      this.isHealthy = true;
      this.lastHealthCheck = new Date();
    } catch (error) {
      console.error('Failed to send SMS alert:', error);
      this.isHealthy = false;

      // Queue for retry if critical
      if (this.isCriticalAlert(alert)) {
        this.queueForRetry(alert, this.selectRecipients(alert, context));
      }

      throw error;
    }
  }

  /**
   * Check if channel is healthy
   */
  public async isHealthy(): Promise<boolean> {
    try {
      // Skip if checked recently
      const now = new Date();
      if (now.getTime() - this.lastHealthCheck.getTime() < 30000) {
        return this.isHealthy;
      }

      // Check Twilio account status
      const account = await this.client.api
        .accounts(this.config.accountSid)
        .fetch();

      if (account.status !== 'active') {
        console.error(`Twilio account status: ${account.status}`);
        this.isHealthy = false;
        return false;
      }

      // Check phone number status
      const phoneNumbers = await this.client.incomingPhoneNumbers.list({
        limit: 1,
      });

      if (phoneNumbers.length === 0 && !this.config.messagingServiceSid) {
        console.error('No Twilio phone numbers available');
        this.isHealthy = false;
        return false;
      }

      this.isHealthy = true;
      this.lastHealthCheck = now;

      // Process any queued messages
      if (this.smsQueue.length > 0 && !this.processing) {
        this.processQueue();
      }

      return true;
    } catch (error) {
      console.error('SMS health check failed:', error);
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Format message for SMS
   */
  private async formatMessage(alert: Alert, context?: any): Promise<string> {
    let message = '';

    // Add severity indicator
    const severityIndicator = this.getSeverityIndicator(alert.severity);
    message += `${severityIndicator} `;

    // Add wedding day indicator if applicable
    if (context?.isWeddingDay) {
      message += '🎊WEDDING ';
    }

    // Add alert title (truncated)
    const titleLength = Math.min(
      50,
      this.config.maxMessageLength! - message.length - 100,
    );
    message += this.truncateText(alert.title, titleLength) + '\n';

    // Add alert message (truncated)
    const remainingLength = this.config.maxMessageLength! - message.length - 50;
    message += this.truncateText(alert.message, remainingLength);

    // Add link if enabled and space available
    if (
      this.config.enableShortLinks &&
      message.length < this.config.maxMessageLength! - 30
    ) {
      const link = await this.getShortLink(alert);
      message += `\n${link}`;
    }

    // Ensure message doesn't exceed max length
    if (message.length > this.config.maxMessageLength!) {
      message = message.substring(0, this.config.maxMessageLength! - 3) + '...';
    }

    return message;
  }

  /**
   * Send SMS to single recipient
   */
  private async sendSms(
    recipient: string,
    message: string,
    alert: Alert,
  ): Promise<void> {
    try {
      const messageOptions: any = {
        body: message,
        to: recipient,
      };

      // Use messaging service if configured
      if (this.config.messagingServiceSid) {
        messageOptions.messagingServiceSid = this.config.messagingServiceSid;
      } else {
        messageOptions.from = this.config.fromNumber;
      }

      // Add webhook for delivery status if critical
      if (this.isCriticalAlert(alert)) {
        messageOptions.statusCallback = `${process.env.NEXT_PUBLIC_APP_URL}/api/alerts/sms-status`;
      }

      const result = await this.client.messages.create(messageOptions);

      // Track sent message
      this.sentMessages.set(result.sid, new Date());

      // Clean up old tracking entries
      this.cleanupSentMessages();
    } catch (error: any) {
      console.error(`Failed to send SMS to ${recipient}:`, error);

      // Handle specific Twilio errors
      if (error.code === 21211) {
        // Invalid phone number
        console.error(`Invalid phone number: ${recipient}`);
        return; // Don't retry invalid numbers
      }

      if (error.code === 20429) {
        // Rate limit exceeded
        await this.handleRateLimit();
        // Retry once
        await this.sendSms(recipient, message, alert);
        return;
      }

      throw error;
    }
  }

  /**
   * Select recipients based on alert properties
   */
  private selectRecipients(alert: Alert, context?: any): string[] {
    const recipients = new Set<string>();

    // For health checks, don't send to anyone
    if (alert.metadata?.healthCheck) {
      return [];
    }

    // Add default recipients for high severity
    if (alert.severity !== AlertSeverity.LOW) {
      this.config.defaultRecipients.forEach((r) => recipients.add(r));
    }

    // Add emergency recipients for critical alerts
    if (this.isCriticalAlert(alert) && this.config.emergencyRecipients) {
      this.config.emergencyRecipients.forEach((r) => recipients.add(r));
    }

    // Add wedding day recipients
    if (context?.isWeddingDay && this.config.weddingDayRecipients) {
      this.config.weddingDayRecipients.forEach((r) => recipients.add(r));
    }

    // Add recipients from alert metadata
    if (alert.metadata?.smsRecipients) {
      const additionalRecipients = Array.isArray(alert.metadata.smsRecipients)
        ? alert.metadata.smsRecipients
        : [alert.metadata.smsRecipients];
      additionalRecipients.forEach((r) => recipients.add(r));
    }

    // Validate and normalize phone numbers
    return Array.from(recipients)
      .map((r) => this.normalizePhoneNumber(r))
      .filter((r) => r !== null) as string[];
  }

  /**
   * Normalize phone number format
   */
  private normalizePhoneNumber(phone: string): string | null {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // Add country code if missing (assuming US)
    if (cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }

    // Validate length
    if (cleaned.length < 10 || cleaned.length > 15) {
      console.warn(`Invalid phone number: ${phone}`);
      return null;
    }

    // Add + prefix
    return '+' + cleaned;
  }

  /**
   * Queue message for retry
   */
  private queueForRetry(alert: Alert, recipients: string[]): void {
    this.smsQueue.push({
      alert,
      recipients,
      retryCount: 0,
      scheduledTime: new Date(Date.now() + 30000), // Retry in 30 seconds
    });
  }

  /**
   * Process queued messages
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.smsQueue.length === 0) return;

    this.processing = true;

    while (this.smsQueue.length > 0) {
      const item = this.smsQueue[0];

      // Check if it's time to process
      if (item.scheduledTime && item.scheduledTime > new Date()) {
        break;
      }

      this.smsQueue.shift();

      try {
        // Check health first
        if (await this.isHealthy()) {
          await this.send(item.alert);
          console.log(
            `Successfully sent queued SMS for alert ${item.alert.id}`,
          );
        } else {
          // Re-queue if still unhealthy
          item.retryCount++;
          if (item.retryCount < 3) {
            item.scheduledTime = new Date(Date.now() + 60000 * item.retryCount);
            this.smsQueue.push(item);
          } else {
            console.error(
              `Failed to send SMS after 3 retries for alert ${item.alert.id}`,
            );
          }
        }
      } catch (error) {
        console.error('Failed to process queued SMS:', error);

        // Re-queue with backoff
        item.retryCount++;
        if (item.retryCount < 3) {
          item.scheduledTime = new Date(Date.now() + 60000 * item.retryCount);
          this.smsQueue.push(item);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.processing && this.smsQueue.length > 0) {
        this.processQueue();
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(messageCount: number): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Count messages sent in last minute
    const recentMessages = Array.from(this.sentMessages.values()).filter(
      (time) => time.getTime() > oneMinuteAgo,
    ).length;

    const remainingCapacity = this.config.rateLimitPerMinute! - recentMessages;

    if (messageCount > remainingCapacity) {
      // Calculate wait time
      const oldestMessage = Math.min(
        ...Array.from(this.sentMessages.values())
          .filter((time) => time.getTime() > oneMinuteAgo)
          .map((time) => time.getTime()),
      );

      const waitTime = 60000 - (now - oldestMessage) + 1000; // Add 1 second buffer

      console.log(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Handle rate limiting from Twilio
   */
  private async handleRateLimit(): Promise<void> {
    console.warn('Twilio rate limit hit, waiting before retry');
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
  }

  /**
   * Get short link for alert
   */
  private async getShortLink(alert: Alert): Promise<string> {
    const fullUrl = `${process.env.NEXT_PUBLIC_APP_URL}/alerts/${alert.id}`;

    // Check cache
    if (this.shortLinkCache.has(fullUrl)) {
      return this.shortLinkCache.get(fullUrl)!;
    }

    try {
      // Use a URL shortener service (implement based on your preference)
      // For now, return a truncated version
      const shortUrl = `${process.env.NEXT_PUBLIC_APP_URL}/a/${alert.id.substring(0, 8)}`;

      this.shortLinkCache.set(fullUrl, shortUrl);

      // Clean up old cache entries
      if (this.shortLinkCache.size > 100) {
        const firstKey = this.shortLinkCache.keys().next().value;
        this.shortLinkCache.delete(firstKey);
      }

      return shortUrl;
    } catch (error) {
      console.error('Failed to create short link:', error);
      return fullUrl;
    }
  }

  /**
   * Clean up old sent message tracking
   */
  private cleanupSentMessages(): void {
    const fiveMinutesAgo = Date.now() - 300000;

    for (const [sid, time] of this.sentMessages.entries()) {
      if (time.getTime() < fiveMinutesAgo) {
        this.sentMessages.delete(sid);
      }
    }
  }

  /**
   * Utility methods
   */
  private getSeverityIndicator(severity: AlertSeverity): string {
    const indicators = {
      [AlertSeverity.LOW]: 'ℹ️',
      [AlertSeverity.MEDIUM]: '⚠️',
      [AlertSeverity.HIGH]: '🔶',
      [AlertSeverity.CRITICAL]: '🔴',
      [AlertSeverity.SYSTEM_DOWN]: '💀',
      [AlertSeverity.WEDDING_EMERGENCY]: '🚨',
      [AlertSeverity.VENDOR_CRITICAL]: '❗',
      [AlertSeverity.TIMELINE_CRITICAL]: '⏰',
    };

    return indicators[severity] || '📢';
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private isCriticalAlert(alert: Alert): boolean {
    const criticalSeverities = [
      AlertSeverity.CRITICAL,
      AlertSeverity.SYSTEM_DOWN,
      AlertSeverity.WEDDING_EMERGENCY,
      AlertSeverity.VENDOR_CRITICAL,
      AlertSeverity.TIMELINE_CRITICAL,
    ];

    return criticalSeverities.includes(alert.severity);
  }

  private validateConfig(): void {
    if (!this.config.accountSid) {
      throw new Error('Twilio account SID is required');
    }

    if (!this.config.authToken) {
      throw new Error('Twilio auth token is required');
    }

    if (!this.config.fromNumber && !this.config.messagingServiceSid) {
      throw new Error('Either fromNumber or messagingServiceSid is required');
    }

    if (
      !this.config.defaultRecipients ||
      this.config.defaultRecipients.length === 0
    ) {
      console.warn('No default SMS recipients configured');
    }

    // Validate phone number format
    if (this.config.fromNumber && !this.config.fromNumber.startsWith('+')) {
      this.config.fromNumber = '+' + this.config.fromNumber;
    }
  }
}

export default SmsChannel;
