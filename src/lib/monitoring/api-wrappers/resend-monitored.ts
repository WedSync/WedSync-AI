/**
 * WS-233 API Usage Monitoring - Resend Wrapper
 * Team C Integration: Monitored wrapper for Resend email service
 * Integrates usage tracking with Resend email operations
 */

import { Resend } from 'resend';
import {
  trackResendUsage,
  apiUsageTracker,
} from '@/lib/monitoring/api-usage-tracker';
import { logger } from '@/lib/monitoring/edge-logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Monitored Resend Service Wrapper
 * Adds usage tracking, cost monitoring, and rate limiting to Resend email operations
 */
export class MonitoredResendService {
  private resend: Resend;
  private organizationId: string;
  private userId?: string;

  constructor(organizationId: string, userId?: string, apiKey?: string) {
    this.organizationId = organizationId;
    this.userId = userId;
    this.resend = new Resend(apiKey || process.env.RESEND_API_KEY);
  }

  /**
   * Monitored email sending with usage tracking
   */
  async sendEmail(emailData: {
    from: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    cc?: string | string[];
    bcc?: string | string[];
    reply_to?: string;
    attachments?: Array<{
      filename: string;
      content: string | Buffer;
      content_type?: string;
    }>;
    headers?: Record<string, string>;
    tags?: Array<{ name: string; value: string }>;
  }) {
    const requestId = uuidv4();
    const startTime = Date.now();
    const endpoint = '/emails';
    const method = 'POST';

    try {
      // Calculate email count for billing
      const emailCount = this.calculateEmailCount(
        emailData.to,
        emailData.cc,
        emailData.bcc,
      );
      const estimatedCost = emailCount * 0.0004; // $0.40 per 1K emails

      // Pre-flight checks
      const limitCheck = await apiUsageTracker.checkUsageLimits(
        this.organizationId,
        'resend',
        endpoint,
        estimatedCost,
      );

      if (!limitCheck.allowed) {
        const error = new Error(
          `Resend usage blocked: ${limitCheck.warnings.join(', ')}`,
        );
        await this.trackFailedRequest(
          endpoint,
          method,
          requestId,
          startTime,
          429,
          error.message,
          emailCount,
        );
        throw error;
      }

      // Log warnings
      if (limitCheck.warnings.length > 0) {
        logger.warn('Resend email usage warnings', {
          organizationId: this.organizationId,
          userId: this.userId,
          warnings: limitCheck.warnings,
          requestId,
          emailCount,
          subject: emailData.subject,
        });
      }

      // Execute the actual email sending
      const result = await this.resend.emails.send({
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        cc: emailData.cc,
        bcc: emailData.bcc,
        reply_to: emailData.reply_to,
        attachments: emailData.attachments,
        headers: emailData.headers,
        tags: emailData.tags,
      });

      const duration = Date.now() - startTime;

      // Track successful usage
      await trackResendUsage(
        this.organizationId,
        endpoint,
        requestId,
        duration,
        200, // Resend returns 200 for successful sends
        emailCount,
        this.userId,
      );

      logger.info('Resend email sent successfully', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        emailId: result.data?.id,
        subject: emailData.subject,
        to: this.maskEmailAddresses(emailData.to),
        cc: emailData.cc ? this.maskEmailAddresses(emailData.cc) : undefined,
        bcc: emailData.bcc ? this.maskEmailAddresses(emailData.bcc) : undefined,
        emailCount,
        duration,
        hasAttachments: !!(
          emailData.attachments && emailData.attachments.length > 0
        ),
        attachmentCount: emailData.attachments?.length || 0,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const statusCode = this.getErrorStatusCode(error);
      const emailCount = this.calculateEmailCount(
        emailData.to,
        emailData.cc,
        emailData.bcc,
      );

      await this.trackFailedRequest(
        endpoint,
        method,
        requestId,
        startTime,
        statusCode,
        error.message,
        emailCount,
      );

      logger.error('Resend email sending failed', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        subject: emailData.subject,
        to: this.maskEmailAddresses(emailData.to),
        duration,
        error: error.message,
        statusCode,
        emailCount,
      });

      throw error;
    }
  }

  /**
   * Monitored batch email sending
   */
  async sendBatchEmails(
    emails: Array<{
      from: string;
      to: string | string[];
      subject: string;
      html?: string;
      text?: string;
      cc?: string | string[];
      bcc?: string | string[];
      reply_to?: string;
      attachments?: Array<{
        filename: string;
        content: string | Buffer;
        content_type?: string;
      }>;
      headers?: Record<string, string>;
      tags?: Array<{ name: string; value: string }>;
    }>,
  ) {
    const requestId = uuidv4();
    const startTime = Date.now();
    const endpoint = '/emails/batch';
    const method = 'POST';

    try {
      // Calculate total email count for billing
      const totalEmailCount = emails.reduce((total, email) => {
        return total + this.calculateEmailCount(email.to, email.cc, email.bcc);
      }, 0);
      const estimatedCost = totalEmailCount * 0.0004; // $0.40 per 1K emails

      // Pre-flight checks
      const limitCheck = await apiUsageTracker.checkUsageLimits(
        this.organizationId,
        'resend',
        endpoint,
        estimatedCost,
      );

      if (!limitCheck.allowed) {
        const error = new Error(
          `Resend batch usage blocked: ${limitCheck.warnings.join(', ')}`,
        );
        await this.trackFailedRequest(
          endpoint,
          method,
          requestId,
          startTime,
          429,
          error.message,
          totalEmailCount,
        );
        throw error;
      }

      // Execute the actual batch email sending
      const result = await this.resend.batch.send(emails);
      const duration = Date.now() - startTime;

      // Track successful usage
      await trackResendUsage(
        this.organizationId,
        endpoint,
        requestId,
        duration,
        200,
        totalEmailCount,
        this.userId,
      );

      logger.info('Resend batch emails sent successfully', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        batchSize: emails.length,
        totalEmailCount,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const statusCode = this.getErrorStatusCode(error);
      const totalEmailCount = emails.reduce((total, email) => {
        return total + this.calculateEmailCount(email.to, email.cc, email.bcc);
      }, 0);

      await this.trackFailedRequest(
        endpoint,
        method,
        requestId,
        startTime,
        statusCode,
        error.message,
        totalEmailCount,
      );

      logger.error('Resend batch email sending failed', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        batchSize: emails.length,
        totalEmailCount,
        duration,
        error: error.message,
        statusCode,
      });

      throw error;
    }
  }

  /**
   * Monitored email retrieval/status check
   */
  async getEmail(emailId: string) {
    const requestId = uuidv4();
    const startTime = Date.now();
    const endpoint = `/emails/${emailId}`;
    const method = 'GET';

    try {
      const result = await this.resend.emails.get(emailId);
      const duration = Date.now() - startTime;

      // Track the API call (no cost for retrieval)
      await trackResendUsage(
        this.organizationId,
        endpoint,
        requestId,
        duration,
        200,
        0, // No email cost for retrieval
        this.userId,
      );

      logger.info('Resend email retrieved', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        emailId,
        duration,
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
        0,
      );

      logger.error('Resend email retrieval failed', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        emailId,
        duration,
        error: error.message,
        statusCode,
      });

      throw error;
    }
  }

  /**
   * Monitored webhook handling
   */
  async handleWebhook(payload: {
    type:
      | 'email.sent'
      | 'email.delivered'
      | 'email.delivery_delayed'
      | 'email.complained'
      | 'email.bounced'
      | 'email.opened'
      | 'email.clicked';
    created_at: string;
    data: {
      id: string;
      to: string[];
      from: string;
      subject: string;
      [key: string]: any;
    };
  }) {
    const requestId = uuidv4();
    const startTime = Date.now();
    const endpoint = '/webhooks';
    const method = 'POST';

    try {
      // Process webhook (this would be custom business logic)
      await this.processWebhookEvent(payload);
      const duration = Date.now() - startTime;

      // Track webhook processing
      await trackResendUsage(
        this.organizationId,
        endpoint,
        requestId,
        duration,
        200,
        0, // No cost for webhook processing
        this.userId,
      );

      logger.info('Resend webhook processed', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        emailId: payload.data.id,
        eventType: payload.type,
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
        0,
      );

      logger.error('Resend webhook processing failed', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        emailId: payload.data.id,
        eventType: payload.type,
        duration,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Get usage analytics for this organization's Resend usage
   */
  async getUsageAnalytics(dateRange: { start: Date; end: Date }) {
    return apiUsageTracker.getUsageAnalytics(
      this.organizationId,
      dateRange,
      'resend',
    );
  }

  /**
   * Get current budget status
   */
  async getBudgetStatus() {
    const budgets = await apiUsageTracker.getBudgetStatus(
      this.organizationId,
      'resend',
    );
    return budgets[0] || null;
  }

  // Private helper methods

  private calculateEmailCount(
    to: string | string[],
    cc?: string | string[],
    bcc?: string | string[],
  ): number {
    let count = 0;

    // Count TO recipients
    if (Array.isArray(to)) {
      count += to.length;
    } else {
      count += 1;
    }

    // Count CC recipients
    if (cc) {
      if (Array.isArray(cc)) {
        count += cc.length;
      } else {
        count += 1;
      }
    }

    // Count BCC recipients
    if (bcc) {
      if (Array.isArray(bcc)) {
        count += bcc.length;
      } else {
        count += 1;
      }
    }

    return count;
  }

  private maskEmailAddresses(addresses: string | string[]): string | string[] {
    const maskEmail = (email: string): string => {
      const [localPart, domain] = email.split('@');
      if (!localPart || !domain) return '****@****.***';

      const maskedLocal =
        localPart.length > 2
          ? localPart[0] +
            '*'.repeat(localPart.length - 2) +
            localPart[localPart.length - 1]
          : '**';

      const [domainName, tld] = domain.split('.');
      const maskedDomain =
        domainName.length > 2
          ? domainName[0] +
            '*'.repeat(domainName.length - 2) +
            domainName[domainName.length - 1]
          : '**';

      return `${maskedLocal}@${maskedDomain}.${tld}`;
    };

    if (Array.isArray(addresses)) {
      return addresses.map(maskEmail);
    } else {
      return maskEmail(addresses);
    }
  }

  private getErrorStatusCode(error: any): number {
    if (error.status || error.statusCode)
      return error.status || error.statusCode;
    if (error.message?.includes('rate limit')) return 429;
    if (
      error.message?.includes('forbidden') ||
      error.message?.includes('unauthorized')
    )
      return 403;
    if (error.message?.includes('not found')) return 404;
    if (error.message?.includes('invalid')) return 400;
    return 500;
  }

  private async processWebhookEvent(payload: any): Promise<void> {
    // This would contain custom business logic for processing different webhook events
    // For now, this is a placeholder that could be extended based on business needs

    switch (payload.type) {
      case 'email.sent':
        // Handle email sent event
        break;
      case 'email.delivered':
        // Handle email delivered event
        break;
      case 'email.bounced':
        // Handle email bounced event
        break;
      case 'email.complained':
        // Handle spam complaint event
        break;
      case 'email.opened':
        // Handle email opened event
        break;
      case 'email.clicked':
        // Handle email clicked event
        break;
      default:
        logger.warn('Unknown webhook event type', {
          organizationId: this.organizationId,
          eventType: payload.type,
        });
    }
  }

  private async trackFailedRequest(
    endpoint: string,
    method: string,
    requestId: string,
    startTime: number,
    statusCode: number,
    errorMessage: string,
    emailCount: number = 0,
  ): Promise<void> {
    const duration = Date.now() - startTime;

    try {
      await trackResendUsage(
        this.organizationId,
        endpoint,
        requestId,
        duration,
        statusCode,
        emailCount,
        this.userId,
      );
    } catch (trackingError) {
      logger.error('Failed to track Resend error', {
        organizationId: this.organizationId,
        requestId,
        trackingError: trackingError.message,
        originalError: errorMessage,
      });
    }
  }
}

/**
 * Factory function to create monitored Resend service instances
 */
export function createMonitoredResendService(
  organizationId: string,
  userId?: string,
  apiKey?: string,
): MonitoredResendService {
  return new MonitoredResendService(organizationId, userId, apiKey);
}

/**
 * Convenience wrapper for common email operations with monitoring
 */
export function wrapResendServiceWithMonitoring(
  organizationId: string,
  userId?: string,
  apiKey?: string,
) {
  const monitoredService = new MonitoredResendService(
    organizationId,
    userId,
    apiKey,
  );

  return {
    // Email operations
    sendEmail: monitoredService.sendEmail.bind(monitoredService),
    sendBatchEmails: monitoredService.sendBatchEmails.bind(monitoredService),
    getEmail: monitoredService.getEmail.bind(monitoredService),
    handleWebhook: monitoredService.handleWebhook.bind(monitoredService),

    // Analytics and monitoring
    getUsageAnalytics:
      monitoredService.getUsageAnalytics.bind(monitoredService),
    getBudgetStatus: monitoredService.getBudgetStatus.bind(monitoredService),
  };
}

/**
 * Helper functions for common email scenarios in wedding business
 */
export function createWeddingEmailHelpers(
  organizationId: string,
  userId?: string,
) {
  const service = new MonitoredResendService(organizationId, userId);

  return {
    sendWelcomeEmail: async (to: string, vendorName: string) =>
      service.sendEmail({
        from: 'noreply@wedsync.com',
        to,
        subject: `Welcome to ${vendorName}!`,
        html: `<h1>Welcome!</h1><p>Thank you for choosing ${vendorName} for your special day.</p>`,
      }),

    sendFormReminderEmail: async (
      to: string,
      vendorName: string,
      formName: string,
      dueDate: string,
      formUrl: string,
    ) =>
      service.sendEmail({
        from: 'noreply@wedsync.com',
        to,
        subject: `Form Reminder: ${formName}`,
        html: `<h1>Form Reminder</h1><p>${vendorName} needs you to complete the ${formName} form by ${dueDate}.</p><p><a href="${formUrl}">Complete Form</a></p>`,
      }),

    sendPaymentReminderEmail: async (
      to: string,
      vendorName: string,
      amount: string,
      dueDate: string,
      paymentUrl: string,
    ) =>
      service.sendEmail({
        from: 'noreply@wedsync.com',
        to,
        subject: `Payment Reminder: ${amount} due ${dueDate}`,
        html: `<h1>Payment Reminder</h1><p>${vendorName} has a payment of ${amount} due on ${dueDate}.</p><p><a href="${paymentUrl}">Pay Now</a></p>`,
      }),

    sendWeddingCountdownEmail: async (
      to: string,
      vendorName: string,
      daysUntil: number,
      checklistUrl: string,
    ) =>
      service.sendEmail({
        from: 'noreply@wedsync.com',
        to,
        subject: `${daysUntil} days until your wedding!`,
        html: `<h1>Wedding Countdown</h1><p>Only ${daysUntil} days until your special day! ${vendorName} wants to ensure everything is perfect.</p><p><a href="${checklistUrl}">View Checklist</a></p>`,
      }),

    sendThankYouEmail: async (
      to: string,
      vendorName: string,
      reviewUrl?: string,
    ) =>
      service.sendEmail({
        from: 'noreply@wedsync.com',
        to,
        subject: `Thank you from ${vendorName}!`,
        html: `<h1>Thank You!</h1><p>Thank you for choosing ${vendorName}! We hope your wedding day was magical.</p>${reviewUrl ? `<p><a href="${reviewUrl}">Leave us a review</a></p>` : ''}`,
      }),
  };
}

// Export base Resend for compatibility
export { Resend as BaseResend };
