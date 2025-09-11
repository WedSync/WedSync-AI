/**
 * WS-233 API Usage Monitoring - Twilio Wrapper
 * Team C Integration: Monitored wrapper for Twilio SMS service
 * Integrates usage tracking with existing TwilioSMSService
 */

import { TwilioSMSService, smsService } from '@/lib/sms/twilio';
import {
  trackTwilioUsage,
  apiUsageTracker,
} from '@/lib/monitoring/api-usage-tracker';
import { logger } from '@/lib/monitoring/edge-logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Monitored Twilio SMS Service Wrapper
 * Adds usage tracking, cost monitoring, and rate limiting to Twilio SMS calls
 */
export class MonitoredTwilioService {
  private organizationId: string;
  private userId?: string;
  private baseService: TwilioSMSService;

  constructor(organizationId: string, userId?: string) {
    this.organizationId = organizationId;
    this.userId = userId;
    this.baseService = smsService;
  }

  /**
   * Monitored SMS sending with usage tracking
   */
  async sendSMS(params: Parameters<TwilioSMSService['sendSMS']>[0]) {
    const requestId = uuidv4();
    const startTime = Date.now();
    const endpoint = '/Messages';
    const method = 'POST';

    try {
      // Pre-flight checks - estimate cost based on template and segments
      const estimatedSegments = this.estimateSegments(
        params.templateType,
        params.variables,
      );
      const estimatedCost = this.estimateSmsCost(estimatedSegments, params.to);

      const limitCheck = await apiUsageTracker.checkUsageLimits(
        this.organizationId,
        'twilio',
        endpoint,
        estimatedCost,
      );

      if (!limitCheck.allowed) {
        const error = new Error(
          `Twilio usage blocked: ${limitCheck.warnings.join(', ')}`,
        );
        await this.trackFailedRequest(
          endpoint,
          method,
          requestId,
          startTime,
          429,
          error.message,
        );
        throw error;
      }

      // Log warnings
      if (limitCheck.warnings.length > 0) {
        logger.warn('Twilio SMS usage warnings', {
          organizationId: this.organizationId,
          userId: this.userId,
          warnings: limitCheck.warnings,
          requestId,
          to: this.maskPhoneNumber(params.to),
          template: params.templateType,
        });
      }

      // Execute the actual SMS sending
      const result = await this.baseService.sendSMS({
        ...params,
        organizationId: this.organizationId, // Ensure our org ID is used
      });

      const duration = Date.now() - startTime;

      // Track successful usage
      await trackTwilioUsage(
        this.organizationId,
        endpoint,
        requestId,
        duration,
        result.status === 'sent' ? 200 : 202, // 200 for sent, 202 for scheduled
        'sms',
        result.segments,
        this.userId,
      );

      logger.info('Twilio SMS sent successfully', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        messageId: result.messageId,
        to: this.maskPhoneNumber(params.to),
        template: params.templateType,
        segments: result.segments,
        cost: result.cost,
        duration,
        status: result.status,
        priority: params.priority,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const statusCode = this.getErrorStatusCode(error);

      await this.trackFailedRequest(
        endpoint,
        method,
        requestId,
        startTime,
        statusCode,
        error.message,
      );

      logger.error('Twilio SMS sending failed', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        to: this.maskPhoneNumber(params.to),
        template: params.templateType,
        duration,
        error: error.message,
        statusCode,
        priority: params.priority,
      });

      throw error;
    }
  }

  /**
   * Monitored webhook handling with usage tracking
   */
  async handleWebhook(
    payload: Parameters<TwilioSMSService['handleWebhook']>[0],
  ) {
    const requestId = uuidv4();
    const startTime = Date.now();
    const endpoint = '/webhooks/status';
    const method = 'POST';

    try {
      // Execute webhook handling
      await this.baseService.handleWebhook(payload);
      const duration = Date.now() - startTime;

      // Track webhook processing
      await trackTwilioUsage(
        this.organizationId,
        endpoint,
        requestId,
        duration,
        200,
        'sms', // Webhook is SMS-related
        1, // One webhook event
        this.userId,
      );

      logger.info('Twilio webhook processed', {
        organizationId: this.organizationId,
        requestId,
        messageId: payload.MessageSid,
        status: payload.MessageStatus,
        duration,
        errorCode: payload.ErrorCode || null,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      await this.trackFailedRequest(
        endpoint,
        method,
        requestId,
        startTime,
        500,
        error.message,
      );

      logger.error('Twilio webhook handling failed', {
        organizationId: this.organizationId,
        requestId,
        messageId: payload.MessageSid,
        duration,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Monitored inbound SMS handling
   */
  async handleInboundSMS(
    payload: Parameters<TwilioSMSService['handleInboundSMS']>[0],
  ) {
    const requestId = uuidv4();
    const startTime = Date.now();
    const endpoint = '/webhooks/inbound';
    const method = 'POST';

    try {
      // Execute inbound SMS handling
      await this.baseService.handleInboundSMS(payload);
      const duration = Date.now() - startTime;

      // Track inbound processing
      await trackTwilioUsage(
        this.organizationId,
        endpoint,
        requestId,
        duration,
        200,
        'sms',
        1, // One inbound message
        this.userId,
      );

      logger.info('Twilio inbound SMS processed', {
        organizationId: this.organizationId,
        requestId,
        from: this.maskPhoneNumber(payload.From),
        message: payload.Body?.toLowerCase().substring(0, 20), // First 20 chars for logging
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      await this.trackFailedRequest(
        endpoint,
        method,
        requestId,
        startTime,
        500,
        error.message,
      );

      logger.error('Twilio inbound SMS handling failed', {
        organizationId: this.organizationId,
        requestId,
        from: this.maskPhoneNumber(payload.From),
        duration,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Get SMS analytics with usage tracking integration
   */
  getAnalytics(dateRange?: { start: Date; end: Date }) {
    // Get base analytics from Twilio service
    const baseAnalytics = this.baseService.getAnalytics(
      this.organizationId,
      dateRange,
    );

    // Enhance with our usage tracking data
    return {
      ...baseAnalytics,
      organizationId: this.organizationId,
      dateRange,
      timestamp: new Date(),
    };
  }

  /**
   * Get usage analytics for this organization's Twilio usage
   */
  async getUsageAnalytics(dateRange: { start: Date; end: Date }) {
    return apiUsageTracker.getUsageAnalytics(
      this.organizationId,
      dateRange,
      'twilio',
    );
  }

  /**
   * Get current budget status
   */
  async getBudgetStatus() {
    const budgets = await apiUsageTracker.getBudgetStatus(
      this.organizationId,
      'twilio',
    );
    return budgets[0] || null;
  }

  /**
   * Get current usage for organization
   */
  getUsage() {
    return this.baseService.getUsage(this.organizationId);
  }

  // Private helper methods

  private estimateSegments(
    templateType: any,
    variables: Record<string, string>,
  ): number {
    // Get template from base service
    const SMS_TEMPLATES = {
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
    };

    let message =
      SMS_TEMPLATES[templateType as keyof typeof SMS_TEMPLATES] || '';

    // Replace variables to estimate final length
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    // Calculate segments (160 chars per segment)
    return Math.ceil(message.length / 160);
  }

  private estimateSmsCost(segments: number, phoneNumber: string): number {
    // Simplified cost estimation - real implementation would check country
    const isInternational = !phoneNumber.startsWith('+1'); // Non-US/Canada
    const baseCost = isInternational ? 0.05 : 0.0075; // USD per segment

    return segments * baseCost;
  }

  private getErrorStatusCode(error: any): number {
    if (error.status) return error.status;
    if (error.code === 20003) return 401; // Authentication error
    if (error.code === 20429) return 429; // Rate limit
    if (error.code === 21211) return 400; // Invalid phone number
    if (error.code === 21610) return 400; // Opt-out violation
    return 500;
  }

  private maskPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || phoneNumber.length < 4) return '****';
    // Show last 4 digits only: +1234567890 -> +******7890
    return (
      phoneNumber.substring(0, phoneNumber.length - 4).replace(/\d/g, '*') +
      phoneNumber.substring(phoneNumber.length - 4)
    );
  }

  private async trackFailedRequest(
    endpoint: string,
    method: string,
    requestId: string,
    startTime: number,
    statusCode: number,
    errorMessage: string,
  ): Promise<void> {
    const duration = Date.now() - startTime;

    try {
      await trackTwilioUsage(
        this.organizationId,
        endpoint,
        requestId,
        duration,
        statusCode,
        'sms',
        0, // No segments for failed requests
        this.userId,
      );
    } catch (trackingError) {
      logger.error('Failed to track Twilio error', {
        organizationId: this.organizationId,
        requestId,
        trackingError: trackingError.message,
        originalError: errorMessage,
      });
    }
  }
}

/**
 * Factory function to create monitored Twilio service instances
 */
export function createMonitoredTwilioService(
  organizationId: string,
  userId?: string,
): MonitoredTwilioService {
  return new MonitoredTwilioService(organizationId, userId);
}

/**
 * Convenience wrapper that creates monitored versions of common SMS functions
 */
export function wrapTwilioServiceWithMonitoring(
  organizationId: string,
  userId?: string,
) {
  const monitoredService = new MonitoredTwilioService(organizationId, userId);

  return {
    // Pass through all original methods but with monitoring
    sendSMS: monitoredService.sendSMS.bind(monitoredService),
    handleWebhook: monitoredService.handleWebhook.bind(monitoredService),
    handleInboundSMS: monitoredService.handleInboundSMS.bind(monitoredService),
    getAnalytics: monitoredService.getAnalytics.bind(monitoredService),
    getUsage: monitoredService.getUsage.bind(monitoredService),

    // Additional monitoring methods
    getUsageAnalytics:
      monitoredService.getUsageAnalytics.bind(monitoredService),
    getBudgetStatus: monitoredService.getBudgetStatus.bind(monitoredService),
  };
}

/**
 * Monitored convenience functions for common SMS types
 */
export function createMonitoredSMSHelpers(
  organizationId: string,
  userId?: string,
) {
  const monitoredService = new MonitoredTwilioService(organizationId, userId);

  return {
    sendFormReminderSMS: async (
      to: string,
      firstName: string,
      vendorName: string,
      dueDate: string,
      shortLink: string,
      tier: any,
      priority: 'high' | 'normal' | 'low' = 'normal',
    ) =>
      monitoredService.sendSMS({
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
        priority,
      }),

    sendPaymentDueSMS: async (
      to: string,
      vendorName: string,
      serviceType: string,
      dueDate: string,
      paymentLink: string,
      tier: any,
    ) =>
      monitoredService.sendSMS({
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
      }),

    sendWeddingCountdownSMS: async (
      to: string,
      days: string,
      vendorName: string,
      link: string,
      tier: any,
    ) =>
      monitoredService.sendSMS({
        to,
        templateType: 'wedding_countdown',
        variables: { days, vendor_name: vendorName, link },
        organizationId,
        organizationTier: tier,
        priority: 'normal',
      }),

    sendAppointmentReminderSMS: async (
      to: string,
      appointmentType: string,
      vendorName: string,
      date: string,
      time: string,
      location: string,
      tier: any,
    ) =>
      monitoredService.sendSMS({
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
      }),

    sendUrgentUpdateSMS: async (
      to: string,
      vendorName: string,
      link: string,
      tier: any,
    ) =>
      monitoredService.sendSMS({
        to,
        templateType: 'urgent_update',
        variables: { vendor_name: vendorName, link },
        organizationId,
        organizationTier: tier,
        priority: 'high',
      }),

    sendThankYouSMS: async (
      to: string,
      vendorName: string,
      reviewLink: string,
      tier: any,
    ) =>
      monitoredService.sendSMS({
        to,
        templateType: 'thank_you',
        variables: { vendor_name: vendorName, review_link: reviewLink },
        organizationId,
        organizationTier: tier,
        priority: 'low',
      }),
  };
}

// Export for backward compatibility with existing imports
export { smsService as baseTwilioService };
