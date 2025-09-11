import { z } from 'zod';
import { secureStringSchema } from '../../validation/schemas';
import { ExportFileManager, FileMetadata } from './file-manager';

// Email delivery configuration
const emailConfig = {
  maxAttachmentSizeMB: 10,
  maxRecipientsPerEmail: 10,
  retryAttempts: 3,
  retryDelayMs: 2000,
  templateIds: {
    budget_export_success: 'budget_export_success_template',
    budget_export_failure: 'budget_export_failure_template',
    budget_export_large_file: 'budget_export_large_file_template',
  },
  fromEmail: 'exports@wedsync.com',
  replyToEmail: 'support@wedsync.com',
};

// Email recipient interface
export interface EmailRecipient {
  email: string;
  name: string;
  role: 'couple' | 'parent' | 'advisor' | 'vendor' | 'planner';
  permissions: string[];
}

// Export email request interface
export interface ExportEmailRequest {
  exportId: string;
  coupleId: string;
  coupleName: string;
  weddingDate: Date;
  exportType: string;
  recipients: EmailRecipient[];
  includeAttachment: boolean;
  personalMessage?: string;
  deliveryPreference: 'immediate' | 'scheduled' | 'digest';
  scheduledDate?: Date;
}

// Email delivery result
export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  deliveredTo: string[];
  failedDeliveries: string[];
  attachmentDelivered: boolean;
  fallbackLinksProvided: boolean;
  errorMessage?: string;
  deliveryStats: {
    totalRecipients: number;
    successCount: number;
    failureCount: number;
    attachmentSizeMB: number;
    processingTimeMs: number;
  };
}

// Stakeholder-specific email templates
interface EmailTemplate {
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

// Input validation schemas
const emailRecipientSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1).max(100),
  role: z.enum(['couple', 'parent', 'advisor', 'vendor', 'planner']),
  permissions: z.array(z.string()).optional().default([]),
});

const exportEmailRequestSchema = z.object({
  exportId: z.string().min(1).max(100),
  coupleId: z.string().min(1).max(100),
  coupleName: z.string().min(1).max(200),
  weddingDate: z.coerce.date(),
  exportType: z.string().min(1).max(100),
  recipients: z
    .array(emailRecipientSchema)
    .min(1)
    .max(emailConfig.maxRecipientsPerEmail),
  includeAttachment: z.boolean(),
  personalMessage: z.string().max(1000).optional(),
  deliveryPreference: z.enum(['immediate', 'scheduled', 'digest']),
  scheduledDate: z.coerce.date().optional(),
});

/**
 * ExportEmailService - Multi-stakeholder email delivery service
 * Handles budget export distribution with role-based customization
 */
export class ExportEmailService {
  /**
   * Send export email with file attachment or download link
   * @param request - Email delivery request with recipients and preferences
   * @returns Email delivery result with detailed statistics
   */
  static async sendExportEmail(
    request: ExportEmailRequest,
  ): Promise<EmailDeliveryResult> {
    const startTime = Date.now();

    try {
      // Input validation
      const validation = exportEmailRequestSchema.safeParse(request);
      if (!validation.success) {
        throw new Error(
          `Invalid email request: ${validation.error.issues.map((e) => e.message).join(', ')}`,
        );
      }

      const validatedRequest = validation.data;

      // Get file metadata
      const fileMetadata = await ExportFileManager.getFileMetadata(
        validatedRequest.exportId,
        validatedRequest.coupleId,
      );

      if (!fileMetadata) {
        throw new Error('Export file not found or expired');
      }

      // Determine delivery method based on file size and preferences
      const fileSizeMB = fileMetadata.fileSize / (1024 * 1024);
      const shouldAttach =
        validatedRequest.includeAttachment &&
        fileSizeMB <= emailConfig.maxAttachmentSizeMB;

      // Group recipients by role for customized messaging
      const groupedRecipients = this.groupRecipientsByRole(
        validatedRequest.recipients,
      );

      const deliveryResults: EmailDeliveryResult[] = [];

      // Send emails to each recipient group
      for (const [role, recipients] of Array.from(
        groupedRecipients.entries(),
      )) {
        const groupResult = await this.sendToRecipientGroup(
          role,
          recipients,
          validatedRequest,
          fileMetadata,
          shouldAttach,
        );
        deliveryResults.push(groupResult);
      }

      // Aggregate results
      const aggregatedResult = this.aggregateDeliveryResults(
        deliveryResults,
        Date.now() - startTime,
        fileSizeMB,
      );

      // Log delivery statistics
      await this.logEmailDelivery(
        validatedRequest,
        fileMetadata,
        aggregatedResult,
      );

      return aggregatedResult;
    } catch (error) {
      console.error('ExportEmailService.sendExportEmail error:', error);

      return {
        success: false,
        deliveredTo: [],
        failedDeliveries: request.recipients.map((r) => r.email),
        attachmentDelivered: false,
        fallbackLinksProvided: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        deliveryStats: {
          totalRecipients: request.recipients.length,
          successCount: 0,
          failureCount: request.recipients.length,
          attachmentSizeMB: 0,
          processingTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Send export failure notification to couple
   * @param coupleId - Couple identifier
   * @param exportId - Export identifier that failed
   * @param error - Error message or description
   * @returns Success status
   */
  static async sendExportFailureNotification(
    coupleId: string,
    exportId: string,
    error: string,
  ): Promise<boolean> {
    try {
      // Get couple information (this would typically come from a couples service)
      const coupleInfo = await this.getCoupleContactInfo(coupleId);

      if (!coupleInfo) {
        console.error('Couple information not found for failure notification');
        return false;
      }

      const failureTemplate = this.generateFailureEmailTemplate(
        coupleInfo.name,
        exportId,
        error,
      );

      // Send email using the email service
      const emailService = await this.getEmailService();

      const result = await emailService.send({
        from: emailConfig.fromEmail,
        to: coupleInfo.email,
        subject: failureTemplate.subject,
        html: failureTemplate.bodyHtml,
        text: failureTemplate.bodyText,
        replyTo: emailConfig.replyToEmail,
        metadata: {
          type: 'export_failure',
          coupleId,
          exportId,
        },
      });

      console.log(
        `Export failure notification sent to ${coupleInfo.email}: ${result.messageId}`,
      );
      return true;
    } catch (error) {
      console.error(
        'ExportEmailService.sendExportFailureNotification error:',
        error,
      );
      return false;
    }
  }

  /**
   * Send digest email with multiple export links (for digest delivery preference)
   * @param coupleId - Couple identifier
   * @param exports - List of exports to include in digest
   * @returns Success status
   */
  static async sendDigestEmail(
    coupleId: string,
    exports: Array<{
      exportId: string;
      fileName: string;
      createdAt: Date;
      downloadUrl: string;
      expiresAt: Date;
    }>,
  ): Promise<boolean> {
    try {
      if (exports.length === 0) {
        return true; // No exports to send
      }

      const coupleInfo = await this.getCoupleContactInfo(coupleId);
      if (!coupleInfo) {
        return false;
      }

      const digestTemplate = this.generateDigestEmailTemplate(
        coupleInfo.name,
        exports,
      );

      const emailService = await this.getEmailService();

      const result = await emailService.send({
        from: emailConfig.fromEmail,
        to: coupleInfo.email,
        subject: digestTemplate.subject,
        html: digestTemplate.bodyHtml,
        text: digestTemplate.bodyText,
        replyTo: emailConfig.replyToEmail,
        metadata: {
          type: 'export_digest',
          coupleId,
          exportCount: exports.length,
        },
      });

      console.log(
        `Export digest sent to ${coupleInfo.email}: ${result.messageId}`,
      );
      return true;
    } catch (error) {
      console.error('ExportEmailService.sendDigestEmail error:', error);
      return false;
    }
  }

  /**
   * Private method: Group recipients by role for customized messaging
   */
  private static groupRecipientsByRole(
    recipients: EmailRecipient[],
  ): Map<string, EmailRecipient[]> {
    const groups = new Map<string, EmailRecipient[]>();

    recipients.forEach((recipient) => {
      const role = recipient.role;
      if (!groups.has(role)) {
        groups.set(role, []);
      }
      groups.get(role)!.push(recipient);
    });

    return groups;
  }

  /**
   * Private method: Send email to specific recipient group with role-based customization
   */
  private static async sendToRecipientGroup(
    role: string,
    recipients: EmailRecipient[],
    request: ExportEmailRequest,
    fileMetadata: FileMetadata,
    shouldAttach: boolean,
  ): Promise<EmailDeliveryResult> {
    try {
      const emailService = await this.getEmailService();
      const template = this.generateRoleBasedTemplate(
        role,
        request,
        fileMetadata,
        shouldAttach,
      );

      const recipientEmails = recipients.map((r) => r.email);
      const attachment = shouldAttach
        ? await this.prepareAttachment(fileMetadata)
        : null;

      // Generate secure download URLs for each recipient (if not attaching file)
      let downloadLinks: Record<string, string> = {};
      if (!shouldAttach) {
        for (const recipient of recipients) {
          try {
            const downloadUrl =
              await ExportFileManager.generateSecureDownloadUrl(
                request.exportId,
                request.coupleId,
                72, // 72-hour expiration for email links
              );
            downloadLinks[recipient.email] = downloadUrl;
          } catch (error) {
            console.error(
              `Failed to generate download URL for ${recipient.email}:`,
              error,
            );
          }
        }
      }

      // Customize email content with download links if needed
      let finalTemplate = template;
      if (!shouldAttach && Object.keys(downloadLinks).length > 0) {
        const downloadUrl = Object.values(downloadLinks)[0]; // Use first URL as fallback
        finalTemplate = this.injectDownloadLink(template, downloadUrl);
      }

      const emailPayload = {
        from: emailConfig.fromEmail,
        to: recipientEmails,
        subject: finalTemplate.subject,
        html: finalTemplate.bodyHtml,
        text: finalTemplate.bodyText,
        replyTo: emailConfig.replyToEmail,
        attachments: attachment ? [attachment] : [],
        metadata: {
          type: 'budget_export',
          role,
          exportId: request.exportId,
          coupleId: request.coupleId,
          recipientCount: recipients.length,
        },
      };

      const result = await emailService.send(emailPayload);

      return {
        success: true,
        messageId: result.messageId,
        deliveredTo: recipientEmails,
        failedDeliveries: [],
        attachmentDelivered: shouldAttach,
        fallbackLinksProvided: !shouldAttach,
        deliveryStats: {
          totalRecipients: recipients.length,
          successCount: recipients.length,
          failureCount: 0,
          attachmentSizeMB: fileMetadata.fileSize / (1024 * 1024),
          processingTimeMs: 0, // Will be calculated in aggregation
        },
      };
    } catch (error) {
      console.error(`Error sending to ${role} group:`, error);

      return {
        success: false,
        deliveredTo: [],
        failedDeliveries: recipients.map((r) => r.email),
        attachmentDelivered: false,
        fallbackLinksProvided: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        deliveryStats: {
          totalRecipients: recipients.length,
          successCount: 0,
          failureCount: recipients.length,
          attachmentSizeMB: fileMetadata.fileSize / (1024 * 1024),
          processingTimeMs: 0,
        },
      };
    }
  }

  /**
   * Private method: Generate role-based email template
   */
  private static generateRoleBasedTemplate(
    role: string,
    request: ExportEmailRequest,
    fileMetadata: FileMetadata,
    includeAttachment: boolean,
  ): EmailTemplate {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const fileSizeMB =
      Math.round((fileMetadata.fileSize / (1024 * 1024)) * 100) / 100;
    const expirationDate = fileMetadata.expiresAt.toLocaleDateString();

    // Role-specific messaging
    const roleMessages = {
      couple: {
        greeting: `Dear ${request.coupleName}`,
        context: 'Your wedding budget export is ready for review.',
        action: includeAttachment
          ? 'Please find your budget report attached to this email.'
          : 'Please use the secure download link below to access your budget report.',
      },
      parent: {
        greeting: `Dear Family Member`,
        context: `${request.coupleName} has shared their wedding budget report with you.`,
        action: includeAttachment
          ? 'The budget summary is attached for your review.'
          : 'Please use the secure link below to download the budget report.',
      },
      advisor: {
        greeting: `Dear Financial Advisor`,
        context: `${request.coupleName} has requested to share their wedding budget report for professional review.`,
        action: includeAttachment
          ? 'The detailed financial report is attached for your analysis.'
          : 'Please use the secure download link below to access the comprehensive budget analysis.',
      },
      vendor: {
        greeting: `Dear Vendor Partner`,
        context: `${request.coupleName} has shared relevant budget information for your services.`,
        action: includeAttachment
          ? 'The budget documentation is attached for your reference.'
          : 'Please use the secure link below to download the required budget documentation.',
      },
      planner: {
        greeting: `Dear Wedding Planner`,
        context: `${request.coupleName} has shared their current budget status for planning coordination.`,
        action: includeAttachment
          ? 'The complete budget overview is attached for your planning reference.'
          : 'Please use the secure download link below to access the current budget status.',
      },
    };

    const message =
      roleMessages[role as keyof typeof roleMessages] || roleMessages.couple;

    const subject = includeAttachment
      ? `Wedding Budget Report - ${request.coupleName}`
      : `Secure Download: Wedding Budget Report - ${request.coupleName}`;

    const bodyHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 14px; color: #666; }
          .download-btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .file-info { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .security-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">WedSync Budget Export</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Professional Wedding Budget Management</p>
          </div>
          
          <div class="content">
            <p>${message.greeting},</p>
            
            <p>${message.context}</p>
            
            <p>${message.action}</p>
            
            ${
              request.personalMessage
                ? `
              <div style="background: #e8f4fd; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
                <strong>Personal Message:</strong><br>
                ${request.personalMessage}
              </div>
            `
                : ''
            }
            
            <div class="file-info">
              <strong>Export Details:</strong><br>
              <strong>Wedding:</strong> ${request.coupleName}<br>
              <strong>Date:</strong> ${request.weddingDate.toLocaleDateString()}<br>
              <strong>Report Type:</strong> ${request.exportType}<br>
              <strong>File Size:</strong> ${fileSizeMB} MB<br>
              <strong>Generated:</strong> ${fileMetadata.createdAt.toLocaleDateString()}
            </div>
            
            ${
              !includeAttachment
                ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{DOWNLOAD_LINK}}" class="download-btn">Download Budget Report</a>
              </div>
              
              <div class="security-notice">
                <strong>Security Notice:</strong> This download link is secure and will expire on ${expirationDate}. 
                Only authorized recipients can access this file.
              </div>
            `
                : ''
            }
            
            <p>If you have any questions about this budget report or need assistance, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>
            The WedSync Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent from WedSync Budget Export System.<br>
            For support, contact us at ${emailConfig.replyToEmail}</p>
            <p><a href="${baseUrl}">Visit WedSync Dashboard</a> | <a href="${baseUrl}/privacy">Privacy Policy</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const bodyText = `
      ${message.greeting},

      ${message.context}

      ${message.action}

      ${request.personalMessage ? `Personal Message: ${request.personalMessage}\n\n` : ''}

      Export Details:
      - Wedding: ${request.coupleName}
      - Date: ${request.weddingDate.toLocaleDateString()}
      - Report Type: ${request.exportType}
      - File Size: ${fileSizeMB} MB
      - Generated: ${fileMetadata.createdAt.toLocaleDateString()}

      ${
        !includeAttachment
          ? `
      Download Link: {{DOWNLOAD_LINK}}

      Security Notice: This download link is secure and will expire on ${expirationDate}. 
      Only authorized recipients can access this file.
      `
          : ''
      }

      If you have any questions about this budget report or need assistance, please contact us at ${emailConfig.replyToEmail}.

      Best regards,
      The WedSync Team

      Visit WedSync Dashboard: ${baseUrl}
      Privacy Policy: ${baseUrl}/privacy
    `;

    return {
      subject,
      bodyHtml,
      bodyText,
    };
  }

  /**
   * Private method: Inject download link into email template
   */
  private static injectDownloadLink(
    template: EmailTemplate,
    downloadUrl: string,
  ): EmailTemplate {
    return {
      subject: template.subject,
      bodyHtml: template.bodyHtml.replace(/{{DOWNLOAD_LINK}}/g, downloadUrl),
      bodyText: template.bodyText.replace(/{{DOWNLOAD_LINK}}/g, downloadUrl),
    };
  }

  /**
   * Private method: Prepare file attachment for email
   */
  private static async prepareAttachment(fileMetadata: FileMetadata): Promise<{
    filename: string;
    content: Buffer;
    contentType: string;
  } | null> {
    try {
      // Download file from storage
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      const { data, error } = await supabase.storage
        .from('budget-exports')
        .download(fileMetadata.storageUrl);

      if (error || !data) {
        console.error('Failed to download file for email attachment:', error);
        return null;
      }

      const buffer = Buffer.from(await data.arrayBuffer());

      return {
        filename: fileMetadata.fileName,
        content: buffer,
        contentType: fileMetadata.contentType,
      };
    } catch (error) {
      console.error('Error preparing email attachment:', error);
      return null;
    }
  }

  /**
   * Private method: Aggregate multiple delivery results
   */
  private static aggregateDeliveryResults(
    results: EmailDeliveryResult[],
    totalProcessingTime: number,
    fileSizeMB: number,
  ): EmailDeliveryResult {
    const allDeliveredTo = results.flatMap((r) => r.deliveredTo);
    const allFailedDeliveries = results.flatMap((r) => r.failedDeliveries);
    const overallSuccess = results.some((r) => r.success);
    const attachmentDelivered = results.some((r) => r.attachmentDelivered);
    const fallbackLinksProvided = results.some((r) => r.fallbackLinksProvided);

    return {
      success: overallSuccess,
      messageId: results.find((r) => r.messageId)?.messageId,
      deliveredTo: allDeliveredTo,
      failedDeliveries: allFailedDeliveries,
      attachmentDelivered,
      fallbackLinksProvided,
      errorMessage: results.find((r) => r.errorMessage)?.errorMessage,
      deliveryStats: {
        totalRecipients: allDeliveredTo.length + allFailedDeliveries.length,
        successCount: allDeliveredTo.length,
        failureCount: allFailedDeliveries.length,
        attachmentSizeMB: fileSizeMB,
        processingTimeMs: totalProcessingTime,
      },
    };
  }

  /**
   * Private method: Generate failure notification template
   */
  private static generateFailureEmailTemplate(
    coupleName: string,
    exportId: string,
    error: string,
  ): EmailTemplate {
    return {
      subject: `Budget Export Failed - ${coupleName}`,
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d73527;">Budget Export Failed</h2>
          <p>Dear ${coupleName},</p>
          <p>Unfortunately, your budget export (ID: ${exportId}) could not be completed due to a technical issue.</p>
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <strong>Error Details:</strong><br>${error}
          </div>
          <p>Our team has been notified and will investigate this issue. You can try generating the export again, or contact support if the problem persists.</p>
          <p>We apologize for any inconvenience.</p>
          <p>Best regards,<br>The WedSync Team</p>
        </div>
      `,
      bodyText: `
        Budget Export Failed

        Dear ${coupleName},

        Unfortunately, your budget export (ID: ${exportId}) could not be completed due to a technical issue.

        Error Details: ${error}

        Our team has been notified and will investigate this issue. You can try generating the export again, or contact support if the problem persists.

        We apologize for any inconvenience.

        Best regards,
        The WedSync Team
      `,
    };
  }

  /**
   * Private method: Generate digest email template
   */
  private static generateDigestEmailTemplate(
    coupleName: string,
    exports: Array<{
      exportId: string;
      fileName: string;
      createdAt: Date;
      downloadUrl: string;
      expiresAt: Date;
    }>,
  ): EmailTemplate {
    const exportList = exports
      .map(
        (exp) => `
      <div style="border: 1px solid #e0e0e0; padding: 15px; margin: 10px 0; border-radius: 4px;">
        <strong>${exp.fileName}</strong><br>
        Generated: ${exp.createdAt.toLocaleDateString()}<br>
        Expires: ${exp.expiresAt.toLocaleDateString()}<br>
        <a href="${exp.downloadUrl}" style="color: #667eea;">Download</a>
      </div>
    `,
      )
      .join('');

    return {
      subject: `Budget Export Digest - ${exports.length} Reports Available`,
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Budget Export Digest</h2>
          <p>Dear ${coupleName},</p>
          <p>You have ${exports.length} budget reports ready for download:</p>
          ${exportList}
          <p>Please download these reports before they expire.</p>
          <p>Best regards,<br>The WedSync Team</p>
        </div>
      `,
      bodyText: `Budget Export Digest\n\nDear ${coupleName},\n\nYou have ${exports.length} budget reports ready for download:\n\n${exports.map((exp) => `${exp.fileName} - ${exp.downloadUrl}`).join('\n\n')}\n\nBest regards,\nThe WedSync Team`,
    };
  }

  /**
   * Private method: Get email service instance (mock implementation)
   */
  private static async getEmailService(): Promise<any> {
    // In production, this would return the actual email service (SendGrid, SES, etc.)
    // For now, return a mock service
    return {
      send: async (payload: any) => ({
        messageId: `mock_${Date.now()}_${Math.random()}`,
        success: true,
      }),
    };
  }

  /**
   * Private method: Get couple contact information
   */
  private static async getCoupleContactInfo(coupleId: string): Promise<{
    email: string;
    name: string;
  } | null> {
    // Mock implementation - in production, this would fetch from database
    return {
      email: 'couple@example.com',
      name: 'John & Jane Doe',
    };
  }

  /**
   * Private method: Log email delivery for analytics
   */
  private static async logEmailDelivery(
    request: ExportEmailRequest,
    fileMetadata: FileMetadata,
    result: EmailDeliveryResult,
  ): Promise<void> {
    try {
      console.log('Email delivery logged:', {
        exportId: request.exportId,
        coupleId: request.coupleId,
        success: result.success,
        recipientCount: result.deliveryStats.totalRecipients,
        attachmentDelivered: result.attachmentDelivered,
      });
      // In production, this would log to analytics/audit system
    } catch (error) {
      console.error('Error logging email delivery:', error);
    }
  }
}
