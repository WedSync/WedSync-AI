import twilio from 'twilio';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  console.warn('Twilio credentials not configured');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

// SMS Credit tiers
export const SMS_CREDITS = {
  FREE: 0,
  PROFESSIONAL: 100,
  SCALE: 500,
  ENTERPRISE: -1, // Unlimited
} as const;

// SMS Templates (160 character limit)
export const SMS_TEMPLATES = {
  form_reminder:
    'Hi {{first_name}}! Reminder: {{vendor_name}} form due {{due_date}}. Complete here: {{short_link}}',
  payment_due:
    '{{vendor_name}}: Payment reminder for {{service_type}}. Due {{due_date}}. Pay: {{payment_link}}',
  wedding_countdown:
    '{{days}} days until your wedding! {{vendor_name}} needs final details: {{link}}',
  appointment_reminder:
    'Reminder: {{appointment_type}} with {{vendor_name}} {{date}} at {{time}}. {{location}}',
  urgent_update:
    '{{vendor_name}}: Important wedding update. Please check your portal: {{link}}',
  thank_you:
    'Thank you for choosing {{vendor_name}}! Your wedding was beautiful. Please review us: {{review_link}}',
} as const;

interface SMSDeliveryStatus {
  messageId: string;
  status:
    | 'queued'
    | 'sending'
    | 'sent'
    | 'failed'
    | 'delivered'
    | 'undelivered';
  to: string;
  errorCode?: string;
  errorMessage?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  cost?: number;
  segments?: number;
}

interface SMSUsage {
  organizationId: string;
  month: string; // YYYY-MM format
  creditsUsed: number;
  creditsAllowed: number;
  overageUsed: number;
  tier: keyof typeof SMS_CREDITS;
}

interface OptInStatus {
  phoneNumber: string;
  status: 'opted_in' | 'opted_out' | 'pending';
  optedAt?: Date;
  source?: string;
}

class TwilioSMSService {
  private deliveryStatus = new Map<string, SMSDeliveryStatus>();
  private usageTracking = new Map<string, SMSUsage>();
  private optInStatus = new Map<string, OptInStatus>();

  constructor() {
    this.loadOptInStatus();
  }

  /**
   * Send SMS with template
   */
  async sendSMS({
    to,
    templateType,
    variables,
    organizationId,
    organizationTier,
    priority = 'normal',
    scheduleTime,
  }: {
    to: string;
    templateType: keyof typeof SMS_TEMPLATES;
    variables: Record<string, string>;
    organizationId: string;
    organizationTier: keyof typeof SMS_CREDITS;
    priority?: 'high' | 'normal' | 'low';
    scheduleTime?: Date;
  }): Promise<{
    messageId: string;
    status: string;
    segments: number;
    cost: number;
  }> {
    try {
      // Validate and format phone number
      const formattedNumber = this.formatPhoneNumber(to);
      if (!formattedNumber) {
        throw new Error('Invalid phone number format');
      }

      // Check opt-in status
      if (!this.isOptedIn(formattedNumber)) {
        throw new Error('Recipient has not opted in to SMS');
      }

      // Check quiet hours
      if (!this.isWithinAllowedHours(formattedNumber)) {
        if (scheduleTime) {
          // Already scheduled, don't reschedule
          throw new Error(
            'Cannot send SMS during quiet hours and no schedule time provided',
          );
        }
        // Schedule for next allowed time
        scheduleTime = this.getNextAllowedTime(formattedNumber);
      }

      // Generate message from template
      const message = this.renderTemplate(templateType, variables);

      // Calculate segments and cost
      const segments = this.calculateSegments(message);
      const cost = this.calculateCost(segments, formattedNumber);

      // Check credit limits
      const canSend = await this.checkCreditLimits(
        organizationId,
        organizationTier,
        segments,
      );
      if (!canSend.allowed) {
        throw new Error(canSend.reason || 'Credit limit exceeded');
      }

      // If scheduled for later, store and return
      if (scheduleTime && scheduleTime > new Date()) {
        const messageId = this.generateMessageId();
        // In a real implementation, store this in a queue/database
        return { messageId, status: 'scheduled', segments, cost };
      }

      // Send SMS via Twilio
      if (!client) {
        console.log(
          'Twilio not configured, SMS would be sent to:',
          formattedNumber,
        );
        console.log('Message:', message);
        const mockId = this.generateMessageId();
        return { messageId: mockId, status: 'simulated', segments, cost };
      }

      const twilioMessage = await client.messages.create({
        body: message,
        from: fromNumber,
        to: formattedNumber,
      });

      // Track delivery status
      this.trackDelivery({
        messageId: twilioMessage.sid,
        status: 'sent',
        to: formattedNumber,
        sentAt: new Date(),
        cost,
        segments,
      });

      // Update usage tracking
      await this.updateUsage(organizationId, organizationTier, segments);

      return {
        messageId: twilioMessage.sid,
        status: 'sent',
        segments,
        cost,
      };
    } catch (error) {
      console.error('SMS sending failed:', error);
      throw error;
    }
  }

  /**
   * Handle Twilio webhook for delivery status
   */
  async handleWebhook(payload: any): Promise<void> {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = payload;

    const status = this.deliveryStatus.get(MessageSid);
    if (!status) return;

    status.status = MessageStatus;
    if (ErrorCode) {
      status.errorCode = ErrorCode;
      status.errorMessage = ErrorMessage;
    }
    if (MessageStatus === 'delivered') {
      status.deliveredAt = new Date();
    }

    this.deliveryStatus.set(MessageSid, status);
  }

  /**
   * Handle opt-in/opt-out keywords
   */
  async handleInboundSMS(payload: any): Promise<void> {
    const { From, Body } = payload;
    const message = Body.toLowerCase().trim();
    const phoneNumber = this.formatPhoneNumber(From);

    if (!phoneNumber) return;

    if (
      ['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit'].includes(
        message,
      )
    ) {
      this.setOptStatus(phoneNumber, 'opted_out');

      // Send confirmation
      if (client) {
        await client.messages.create({
          body: 'You have been unsubscribed from SMS messages. Reply START to opt back in.',
          from: fromNumber,
          to: phoneNumber,
        });
      }
    } else if (['start', 'yes', 'unstop'].includes(message)) {
      this.setOptStatus(phoneNumber, 'opted_in');

      // Send confirmation
      if (client) {
        await client.messages.create({
          body: 'You have been subscribed to SMS messages. Reply STOP to opt out.',
          from: fromNumber,
          to: phoneNumber,
        });
      }
    }
  }

  /**
   * Get SMS analytics
   */
  getAnalytics(organizationId: string, dateRange?: { start: Date; end: Date }) {
    // Use forEach for downlevelIteration compatibility
    const deliveries: any[] = [];
    this.deliveryStatus.forEach((delivery) => {
      deliveries.push(delivery);
    });

    const filtered = dateRange
      ? deliveries.filter(
          (d) =>
            d.sentAt &&
            d.sentAt >= dateRange.start &&
            d.sentAt <= dateRange.end,
        )
      : deliveries;

    const stats = {
      total: filtered.length,
      sent: filtered.filter((d) => d.status === 'sent').length,
      delivered: filtered.filter((d) => d.status === 'delivered').length,
      failed: filtered.filter((d) => d.status === 'failed').length,
      pending: filtered.filter((d) => ['queued', 'sending'].includes(d.status))
        .length,
    };

    return {
      ...stats,
      deliveryRate: stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0,
      failureRate: stats.total > 0 ? (stats.failed / stats.total) * 100 : 0,
      totalCost: filtered.reduce((sum, d) => sum + (d.cost || 0), 0),
      totalSegments: filtered.reduce((sum, d) => sum + (d.segments || 1), 0),
    };
  }

  /**
   * Get usage for organization
   */
  getUsage(organizationId: string): SMSUsage | null {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    return this.usageTracking.get(`${organizationId}_${currentMonth}`) || null;
  }

  /**
   * Check if number is within allowed sending hours
   */
  private isWithinAllowedHours(phoneNumber: string): boolean {
    const parsed = parsePhoneNumber(phoneNumber);
    if (!parsed) return false;

    // Get timezone for the phone number's country
    const now = new Date();
    const hour = now.getHours(); // This is a simplification - real implementation would use timezone

    // Don't send between 9 PM and 8 AM
    return hour >= 8 && hour < 21;
  }

  /**
   * Get next allowed sending time
   */
  private getNextAllowedTime(phoneNumber: string): Date {
    const now = new Date();
    const tomorrow8AM = new Date(now);
    tomorrow8AM.setDate(tomorrow8AM.getDate() + 1);
    tomorrow8AM.setHours(8, 0, 0, 0);

    const today8AM = new Date(now);
    today8AM.setHours(8, 0, 0, 0);

    // If it's before 8 AM today, schedule for 8 AM today, otherwise tomorrow
    return now < today8AM ? today8AM : tomorrow8AM;
  }

  /**
   * Format and validate phone number
   */
  private formatPhoneNumber(phoneNumber: string): string | null {
    try {
      if (!isValidPhoneNumber(phoneNumber)) {
        return null;
      }

      const parsed = parsePhoneNumber(phoneNumber);
      return parsed ? parsed.format('E.164') : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if number is opted in
   */
  private isOptedIn(phoneNumber: string): boolean {
    const status = this.optInStatus.get(phoneNumber);
    return status?.status === 'opted_in';
  }

  /**
   * Set opt-in status
   */
  private setOptStatus(
    phoneNumber: string,
    status: OptInStatus['status'],
  ): void {
    this.optInStatus.set(phoneNumber, {
      phoneNumber,
      status,
      optedAt: new Date(),
      source: 'sms_keyword',
    });
  }

  /**
   * Render SMS template with variables
   */
  private renderTemplate(
    templateType: keyof typeof SMS_TEMPLATES,
    variables: Record<string, string>,
  ): string {
    let message = SMS_TEMPLATES[templateType];

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    // Remove any unreplaced variables
    message = message.replace(/{{[^}]+}}/g, '');

    // Trim to 160 characters if needed
    if (message.length > 160) {
      message = message.substring(0, 157) + '...';
    }

    return message;
  }

  /**
   * Calculate SMS segments (160 chars per segment)
   */
  private calculateSegments(message: string): number {
    return Math.ceil(message.length / 160);
  }

  /**
   * Calculate SMS cost
   */
  private calculateCost(segments: number, phoneNumber: string): number {
    const parsed = parsePhoneNumber(phoneNumber);
    const country = parsed?.country || 'US';

    // Simplified pricing - real implementation would use Twilio pricing API
    const baseCost = country === 'US' ? 0.0075 : 0.05; // USD per segment
    return segments * baseCost;
  }

  /**
   * Check credit limits
   */
  private async checkCreditLimits(
    organizationId: string,
    tier: keyof typeof SMS_CREDITS,
    segments: number,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usageKey = `${organizationId}_${currentMonth}`;
    const usage = this.usageTracking.get(usageKey);

    const creditsAllowed = SMS_CREDITS[tier];

    // Unlimited tier
    if (creditsAllowed === -1) {
      return { allowed: true };
    }

    // Free tier - no SMS allowed
    if (creditsAllowed === 0) {
      return {
        allowed: false,
        reason:
          'SMS not available on free tier. Upgrade to Professional or higher.',
      };
    }

    const currentUsage = usage?.creditsUsed || 0;

    // Check if would exceed limit
    if (currentUsage + segments > creditsAllowed) {
      return {
        allowed: false,
        reason: `Would exceed monthly SMS limit (${currentUsage + segments}/${creditsAllowed}). Upgrade to Scale tier for more credits.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Update usage tracking
   */
  private async updateUsage(
    organizationId: string,
    tier: keyof typeof SMS_CREDITS,
    segments: number,
  ): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usageKey = `${organizationId}_${currentMonth}`;

    const existing = this.usageTracking.get(usageKey) || {
      organizationId,
      month: currentMonth,
      creditsUsed: 0,
      creditsAllowed: SMS_CREDITS[tier],
      overageUsed: 0,
      tier,
    };

    existing.creditsUsed += segments;

    // Calculate overage for paid tiers
    if (
      existing.creditsAllowed > 0 &&
      existing.creditsUsed > existing.creditsAllowed
    ) {
      existing.overageUsed = existing.creditsUsed - existing.creditsAllowed;
    }

    this.usageTracking.set(usageKey, existing);
  }

  /**
   * Track delivery status
   */
  private trackDelivery(status: SMSDeliveryStatus): void {
    this.deliveryStatus.set(status.messageId, status);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load opt-in status from storage
   */
  private async loadOptInStatus(): Promise<void> {
    // In real implementation, load from database
    // For now, this is a placeholder
  }
}

// Export singleton instance
export const smsService = new TwilioSMSService();

// Convenience functions for common SMS types
export const sendFormReminderSMS = (
  to: string,
  firstName: string,
  vendorName: string,
  dueDate: string,
  shortLink: string,
  organizationId: string,
  tier: keyof typeof SMS_CREDITS,
) =>
  smsService.sendSMS({
    to,
    templateType: 'form_reminder',
    variables: {
      first_name: firstName,
      vendor_name: vendorName,
      due_date: dueDate,
      short_link: shortLink,
    },
    organizationId,
    organizationTier: tier,
    priority: 'normal',
  });

export const sendPaymentDueSMS = (
  to: string,
  vendorName: string,
  serviceType: string,
  dueDate: string,
  paymentLink: string,
  organizationId: string,
  tier: keyof typeof SMS_CREDITS,
) =>
  smsService.sendSMS({
    to,
    templateType: 'payment_due',
    variables: {
      vendor_name: vendorName,
      service_type: serviceType,
      due_date: dueDate,
      payment_link: paymentLink,
    },
    organizationId,
    organizationTier: tier,
    priority: 'high',
  });

export const sendWeddingCountdownSMS = (
  to: string,
  days: string,
  vendorName: string,
  link: string,
  organizationId: string,
  tier: keyof typeof SMS_CREDITS,
) =>
  smsService.sendSMS({
    to,
    templateType: 'wedding_countdown',
    variables: { days, vendor_name: vendorName, link },
    organizationId,
    organizationTier: tier,
    priority: 'normal',
  });

export const sendAppointmentReminderSMS = (
  to: string,
  appointmentType: string,
  vendorName: string,
  date: string,
  time: string,
  location: string,
  organizationId: string,
  tier: keyof typeof SMS_CREDITS,
) =>
  smsService.sendSMS({
    to,
    templateType: 'appointment_reminder',
    variables: {
      appointment_type: appointmentType,
      vendor_name: vendorName,
      date,
      time,
      location,
    },
    organizationId,
    organizationTier: tier,
    priority: 'high',
  });

export const sendUrgentUpdateSMS = (
  to: string,
  vendorName: string,
  link: string,
  organizationId: string,
  tier: keyof typeof SMS_CREDITS,
) =>
  smsService.sendSMS({
    to,
    templateType: 'urgent_update',
    variables: { vendor_name: vendorName, link },
    organizationId,
    organizationTier: tier,
    priority: 'high',
  });

export const sendThankYouSMS = (
  to: string,
  vendorName: string,
  reviewLink: string,
  organizationId: string,
  tier: keyof typeof SMS_CREDITS,
) =>
  smsService.sendSMS({
    to,
    templateType: 'thank_you',
    variables: { vendor_name: vendorName, review_link: reviewLink },
    organizationId,
    organizationTier: tier,
    priority: 'low',
  });

export default smsService;
