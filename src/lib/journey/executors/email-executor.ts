import { BaseNodeExecutor } from './base';
import { NodeExecutorContext, NodeExecutorResult } from './types';
import { EmailService } from '@/lib/services/email-service';
import { createClient } from '@/lib/supabase/server';

interface EmailNodeConfig {
  templateId?: string;
  subject?: string;
  body?: string;
  recipient?: string;
  recipientType?: 'client' | 'vendor' | 'custom';
  trackOpens?: boolean;
  trackClicks?: boolean;
  sendAt?: string; // ISO date string for scheduled sending
  attachments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>;
}

export class EmailNodeExecutor extends BaseNodeExecutor {
  private emailService = new EmailService();
  private supabase = createClient();

  async execute(
    context: NodeExecutorContext,
    config: EmailNodeConfig,
  ): Promise<NodeExecutorResult> {
    try {
      // Determine recipient
      const recipient = this.getRecipient(context, config);
      if (!recipient) {
        throw new Error('No email recipient could be determined');
      }

      // Prepare email data
      const emailData = {
        to: recipient,
        subject: this.interpolateTemplate(
          config.subject || 'Wedding Update',
          context.variables,
        ),
        template_id: config.templateId,
        template_data: {
          ...context.variables,
          client_name: context.clientData?.name,
          vendor_name: context.vendorData?.name,
          wedding_date: context.clientData?.weddingDate,
        },
        html_content: config.body
          ? this.interpolateTemplate(config.body, context.variables)
          : undefined,
      };

      // Check if this should be scheduled
      if (config.sendAt && new Date(config.sendAt) > new Date()) {
        await this.scheduleEmail(context, emailData, new Date(config.sendAt));
        return {
          success: true,
          output: {
            scheduled: true,
            sendAt: config.sendAt,
            recipient,
          },
          pauseExecution: true,
          scheduleNextAt: new Date(config.sendAt),
        };
      }

      // Send email immediately
      const messageId = await this.emailService.sendEmail(emailData);

      // Track email sending
      await this.trackEmailSent(context, messageId, recipient, config);

      this.logger.info('Email sent successfully', {
        executionId: context.executionId,
        stepId: context.stepId,
        messageId,
        recipient,
      });

      return {
        success: true,
        output: {
          messageId,
          recipient,
          sentAt: new Date().toISOString(),
          subject: emailData.subject,
        },
      };
    } catch (error) {
      this.logger.error('Email node execution failed', {
        executionId: context.executionId,
        stepId: context.stepId,
        error,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email sending failed',
      };
    }
  }

  private getRecipient(
    context: NodeExecutorContext,
    config: EmailNodeConfig,
  ): string | null {
    if (config.recipient) {
      return config.recipient;
    }

    switch (config.recipientType) {
      case 'client':
        return context.clientData?.email || null;
      case 'vendor':
        return context.vendorData?.email || null;
      default:
        return context.clientData?.email || null;
    }
  }

  private async scheduleEmail(
    context: NodeExecutorContext,
    emailData: any,
    sendAt: Date,
  ): Promise<void> {
    const { error } = await this.supabase.from('scheduled_emails').insert({
      journey_execution_id: context.executionId,
      step_id: context.stepId,
      email_data: emailData,
      scheduled_for: sendAt.toISOString(),
      status: 'scheduled',
    });

    if (error) {
      throw new Error(`Failed to schedule email: ${error.message}`);
    }
  }

  private async trackEmailSent(
    context: NodeExecutorContext,
    messageId: string,
    recipient: string,
    config: EmailNodeConfig,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('journey_email_tracking')
      .insert({
        execution_id: context.executionId,
        step_id: context.stepId,
        message_id: messageId,
        recipient,
        subject: config.subject,
        template_id: config.templateId,
        track_opens: config.trackOpens || false,
        track_clicks: config.trackClicks || false,
        sent_at: new Date().toISOString(),
      });

    if (error) {
      this.logger.warn('Failed to track email sending', {
        executionId: context.executionId,
        error,
      });
    }
  }
}
