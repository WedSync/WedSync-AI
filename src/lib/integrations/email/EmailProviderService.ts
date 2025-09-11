/**
 * Email Provider Service
 * Handles email sending through various providers (SendGrid, AWS SES, etc.)
 */

export interface EmailMessage {
  to: string | string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  templateId?: string;
  templateData?: Record<string, any>;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
  isConfigured(): boolean;
}

export interface RetentionEmailConfig {
  templateId: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  delayDays: number;
  conditions?: {
    userType?: string[];
    subscriptionTier?: string[];
    lastActivityDays?: number;
  };
}

class SendGridProvider implements EmailProvider {
  name = 'SendGrid';

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      // TODO: Implement actual SendGrid integration
      // This would use @sendgrid/mail package

      console.log(`SendGrid: Sending email to ${message.to}`);

      // Simulate successful send
      return {
        success: true,
        messageId: `sg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  isConfigured(): boolean {
    return !!process.env.SENDGRID_API_KEY;
  }
}

class AWSProvider implements EmailProvider {
  name = 'AWS SES';

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      // TODO: Implement actual AWS SES integration
      // This would use AWS SDK

      console.log(`AWS SES: Sending email to ${message.to}`);

      // Simulate successful send
      return {
        success: true,
        messageId: `aws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  isConfigured(): boolean {
    return !!(
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    );
  }
}

class SMTPProvider implements EmailProvider {
  name = 'SMTP';

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      // TODO: Implement actual SMTP integration
      // This would use nodemailer

      console.log(`SMTP: Sending email to ${message.to}`);

      // Simulate successful send
      return {
        success: true,
        messageId: `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  isConfigured(): boolean {
    return !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );
  }
}

export class EmailProviderService {
  private providers: EmailProvider[] = [];
  private primaryProvider: EmailProvider | null = null;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const providers = [
      new SendGridProvider(),
      new AWSProvider(),
      new SMTPProvider(),
    ];

    // Add configured providers
    this.providers = providers.filter((provider) => provider.isConfigured());

    // Set primary provider (first configured one)
    this.primaryProvider = this.providers[0] || null;

    console.log(
      `Email providers initialized: ${this.providers.map((p) => p.name).join(', ')}`,
    );
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.primaryProvider) {
      return {
        success: false,
        error: 'No email provider configured',
        provider: 'none',
      };
    }

    try {
      const result = await this.primaryProvider.send(message);

      // If primary provider fails, try fallback providers
      if (!result.success && this.providers.length > 1) {
        console.warn(
          `Primary provider ${this.primaryProvider.name} failed, trying fallback`,
        );

        for (let i = 1; i < this.providers.length; i++) {
          const fallbackResult = await this.providers[i].send(message);
          if (fallbackResult.success) {
            return fallbackResult;
          }
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.primaryProvider.name,
      };
    }
  }

  async sendRetentionEmail(
    userEmail: string,
    userName: string,
    config: RetentionEmailConfig,
  ): Promise<EmailSendResult> {
    const message: EmailMessage = {
      to: userEmail,
      from: `${config.fromName} <${config.fromEmail}>`,
      subject: config.subject,
      templateId: config.templateId,
      templateData: {
        userName,
        unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe`,
        supportEmail: config.fromEmail,
      },
    };

    return this.sendEmail(message);
  }

  async sendBulkEmails(messages: EmailMessage[]): Promise<EmailSendResult[]> {
    const results: EmailSendResult[] = [];

    // Send emails in batches to avoid rate limiting
    const batchSize = 10;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchPromises = batch.map((message) => this.sendEmail(message));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches
      if (i + batchSize < messages.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  getAvailableProviders(): string[] {
    return this.providers.map((provider) => provider.name);
  }

  getPrimaryProvider(): string | null {
    return this.primaryProvider?.name || null;
  }

  isConfigured(): boolean {
    return this.providers.length > 0;
  }

  // Template helpers
  async sendWelcomeEmail(
    userEmail: string,
    userName: string,
  ): Promise<EmailSendResult> {
    return this.sendEmail({
      to: userEmail,
      from: `WedSync <noreply@wedsync.com>`,
      subject: 'Welcome to WedSync!',
      templateId: 'welcome',
      templateData: {
        userName,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      },
    });
  }

  async sendPasswordResetEmail(
    userEmail: string,
    resetToken: string,
  ): Promise<EmailSendResult> {
    return this.sendEmail({
      to: userEmail,
      from: `WedSync Security <security@wedsync.com>`,
      subject: 'Reset Your Password',
      templateId: 'password-reset',
      templateData: {
        resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`,
        expiryHours: 24,
      },
    });
  }

  async sendInvitationEmail(
    userEmail: string,
    inviterName: string,
    weddingName: string,
    inviteToken: string,
  ): Promise<EmailSendResult> {
    return this.sendEmail({
      to: userEmail,
      from: `WedSync <invites@wedsync.com>`,
      subject: `You're invited to collaborate on ${weddingName}`,
      templateId: 'wedding-invitation',
      templateData: {
        inviterName,
        weddingName,
        acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept?token=${inviteToken}`,
      },
    });
  }
}

export const emailProviderService = new EmailProviderService();
