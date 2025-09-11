import { BaseNodeExecutor } from './base';
import { NodeExecutorContext, NodeExecutorResult } from './types';
import { SMSService } from '@/lib/services/sms-service';
import { createClient } from '@/lib/supabase/server';

interface SMSNodeConfig {
  message: string;
  recipient?: string;
  recipientType?: 'client' | 'vendor' | 'custom';
  mediaUrl?: string;
  sendAt?: string; // ISO date string for scheduled sending
  maxLength?: number; // Maximum message length
}

export class SMSNodeExecutor extends BaseNodeExecutor {
  private smsService = new SMSService();
  private supabase = createClient();

  async execute(
    context: NodeExecutorContext,
    config: SMSNodeConfig,
  ): Promise<NodeExecutorResult> {
    try {
      // Validate configuration
      this.validateConfig(config, ['message']);

      // Determine recipient
      const recipient = this.getRecipient(context, config);
      if (!recipient) {
        throw new Error('No SMS recipient could be determined');
      }

      // Validate phone number
      if (!this.smsService.validatePhoneNumber(recipient)) {
        throw new Error(`Invalid phone number format: ${recipient}`);
      }

      // Interpolate message
      let message = this.interpolateTemplate(config.message, context.variables);

      // Truncate message if needed
      if (config.maxLength && message.length > config.maxLength) {
        message = message.substring(0, config.maxLength - 3) + '...';
      }

      // Check if this should be scheduled
      if (config.sendAt && new Date(config.sendAt) > new Date()) {
        await this.scheduleSMS(
          context,
          { to: recipient, message, mediaUrl: config.mediaUrl },
          new Date(config.sendAt),
        );
        return {
          success: true,
          output: {
            scheduled: true,
            sendAt: config.sendAt,
            recipient,
            messageLength: message.length,
          },
          pauseExecution: true,
          scheduleNextAt: new Date(config.sendAt),
        };
      }

      // Send SMS immediately
      const messageSid = await this.smsService.sendSMS({
        to: recipient,
        message,
        mediaUrl: config.mediaUrl,
      });

      // Track SMS sending
      await this.trackSMSSent(context, messageSid, recipient, message);

      this.logger.info('SMS sent successfully', {
        executionId: context.executionId,
        stepId: context.stepId,
        messageSid,
        recipient,
        messageLength: message.length,
      });

      return {
        success: true,
        output: {
          messageSid,
          recipient,
          sentAt: new Date().toISOString(),
          messageLength: message.length,
        },
      };
    } catch (error) {
      this.logger.error('SMS node execution failed', {
        executionId: context.executionId,
        stepId: context.stepId,
        error,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS sending failed',
      };
    }
  }

  private getRecipient(
    context: NodeExecutorContext,
    config: SMSNodeConfig,
  ): string | null {
    if (config.recipient) {
      return config.recipient;
    }

    switch (config.recipientType) {
      case 'client':
        return context.clientData?.phone || null;
      case 'vendor':
        // Vendor phone might be stored differently
        return context.variables.vendorPhone || null;
      default:
        return context.clientData?.phone || null;
    }
  }

  private async scheduleSMS(
    context: NodeExecutorContext,
    smsData: any,
    sendAt: Date,
  ): Promise<void> {
    const { error } = await this.supabase.from('scheduled_sms').insert({
      journey_execution_id: context.executionId,
      step_id: context.stepId,
      sms_data: smsData,
      scheduled_for: sendAt.toISOString(),
      status: 'scheduled',
    });

    if (error) {
      throw new Error(`Failed to schedule SMS: ${error.message}`);
    }
  }

  private async trackSMSSent(
    context: NodeExecutorContext,
    messageSid: string,
    recipient: string,
    message: string,
  ): Promise<void> {
    const { error } = await this.supabase.from('journey_sms_tracking').insert({
      execution_id: context.executionId,
      step_id: context.stepId,
      message_sid: messageSid,
      recipient,
      message_preview: message.substring(0, 100),
      message_length: message.length,
      sent_at: new Date().toISOString(),
    });

    if (error) {
      this.logger.warn('Failed to track SMS sending', {
        executionId: context.executionId,
        error,
      });
    }
  }
}
