import { Logger } from '@/lib/logging/Logger';
import { createClient } from '@/lib/supabase/server';
import { EventEmitter } from 'events';

export interface VerificationUpdate {
  workflowId: string;
  verificationType: string;
  status:
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'failed'
    | 'requires_action';
  message: string;
  actionRequired?: string;
  nextSteps?: string[];
  documents?: Array<{ name: string; url: string }>;
  estimatedCompletion?: Date;
}

export interface NotificationResult {
  messageId: string;
  channel: 'email' | 'sms' | 'in_app' | 'push';
  status: 'sent' | 'failed' | 'pending';
  deliveredAt?: Date;
  error?: string;
}

export interface ReminderSchedule {
  id: string;
  type:
    | 'initial_upload'
    | 'incomplete_documents'
    | 'expiry_warning'
    | 'renewal_required';
  scheduledFor: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: Array<'email' | 'sms' | 'in_app' | 'push'>;
  metadata: Record<string, any>;
}

export interface ScheduleResult {
  scheduledCount: number;
  failedSchedules: Array<{ reminder: ReminderSchedule; error: string }>;
  nextReminder?: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  bodyTemplate: string;
  channels: Array<'email' | 'sms' | 'in_app' | 'push'>;
  variables: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface VerificationContext {
  supplierId: string;
  supplierName: string;
  verificationType: string;
  currentStatus: string;
  completionPercentage: number;
  estimatedCompletion?: Date;
  businessType: string;
  language: string;
  timezone: string;
  preferences: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
}

export interface CustomizedNotification {
  subject: string;
  body: string;
  channel: string;
  priority: string;
  personalization: Record<string, any>;
  deliveryOptions: {
    immediateDelivery: boolean;
    scheduledFor?: Date;
    retryAttempts: number;
  };
}

export class VerificationNotifier extends EventEmitter {
  private logger: Logger;
  private supabase;
  private templates: Map<string, NotificationTemplate>;

  constructor() {
    super();
    this.logger = new Logger('VerificationNotifier');
    this.supabase = createClient();
    this.templates = new Map();
    this.initializeTemplates();
  }

  async sendVerificationUpdate(
    supplierId: string,
    update: VerificationUpdate,
  ): Promise<NotificationResult> {
    try {
      this.logger.info('Sending verification update', { supplierId, update });

      // Get supplier context
      const context = await this.getVerificationContext(supplierId, update);

      // Select appropriate template
      const template = this.selectTemplate(update.status, context);

      // Customize notification content
      const customized = await this.customizeNotificationContent(
        template,
        context,
      );

      // Determine delivery channel based on priority and preferences
      const channel = this.selectOptimalChannel(
        customized.priority,
        context.preferences,
      );

      // Send notification
      const result = await this.deliverNotification(
        channel,
        customized,
        context,
      );

      // Log notification result
      await this.logNotification(supplierId, update, result);

      this.emit('notification_sent', { supplierId, update, result });
      return result;
    } catch (error) {
      this.logger.error('Failed to send verification update', error);
      throw error;
    }
  }

  async scheduleVerificationReminders(
    supplierId: string,
    reminders: ReminderSchedule[],
  ): Promise<ScheduleResult> {
    try {
      this.logger.info('Scheduling verification reminders', {
        supplierId,
        reminders,
      });

      let scheduledCount = 0;
      const failedSchedules: Array<{
        reminder: ReminderSchedule;
        error: string;
      }> = [];
      let nextReminder: Date | undefined;

      for (const reminder of reminders) {
        try {
          await this.scheduleReminder(supplierId, reminder);
          scheduledCount++;

          // Track next upcoming reminder
          if (!nextReminder || reminder.scheduledFor < nextReminder) {
            nextReminder = reminder.scheduledFor;
          }
        } catch (error) {
          failedSchedules.push({
            reminder,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const result: ScheduleResult = {
        scheduledCount,
        failedSchedules,
        nextReminder,
      };

      this.emit('reminders_scheduled', { supplierId, result });
      return result;
    } catch (error) {
      this.logger.error('Failed to schedule verification reminders', error);
      throw error;
    }
  }

  private async customizeNotificationContent(
    template: NotificationTemplate,
    context: VerificationContext,
  ): Promise<CustomizedNotification> {
    try {
      // Replace template variables with context data
      let subject = template.subject;
      let body = template.bodyTemplate;

      const variables = {
        '{{supplier_name}}': context.supplierName,
        '{{verification_type}}': this.formatVerificationType(
          context.verificationType,
        ),
        '{{current_status}}': this.formatStatus(context.currentStatus),
        '{{completion_percentage}}': context.completionPercentage.toString(),
        '{{estimated_completion}}':
          context.estimatedCompletion?.toLocaleDateString(context.language) ||
          'TBD',
        '{{business_type}}': context.businessType,
        '{{support_email}}': 'support@wedsync.co.uk',
        '{{dashboard_url}}': `https://wedsync.co.uk/dashboard/verification/${context.supplierId}`,
      };

      // Replace variables in subject and body
      Object.entries(variables).forEach(([placeholder, value]) => {
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
        body = body.replace(new RegExp(placeholder, 'g'), value);
      });

      // Add personalization based on business type
      const personalization = this.generatePersonalization(context);

      // Determine delivery timing
      const deliveryOptions = {
        immediateDelivery: template.priority === 'urgent',
        scheduledFor: this.calculateOptimalDeliveryTime(context),
        retryAttempts: template.priority === 'urgent' ? 3 : 1,
      };

      return {
        subject,
        body,
        channel: template.channels[0], // Use primary channel
        priority: template.priority,
        personalization,
        deliveryOptions,
      };
    } catch (error) {
      this.logger.error('Failed to customize notification content', error);
      throw error;
    }
  }

  private async getVerificationContext(
    supplierId: string,
    update: VerificationUpdate,
  ): Promise<VerificationContext> {
    const { data: supplier, error } = await this.supabase
      .from('suppliers')
      .select(
        `
        name,
        business_type,
        language,
        timezone,
        notification_preferences
      `,
      )
      .eq('id', supplierId)
      .single();

    if (error || !supplier) {
      throw new Error('Supplier not found');
    }

    // Calculate completion percentage based on verification status
    let completionPercentage = 0;
    switch (update.status) {
      case 'pending':
        completionPercentage = 10;
        break;
      case 'in_progress':
        completionPercentage = 50;
        break;
      case 'completed':
        completionPercentage = 100;
        break;
      case 'failed':
        completionPercentage = 25;
        break;
      case 'requires_action':
        completionPercentage = 75;
        break;
    }

    return {
      supplierId,
      supplierName: supplier.name,
      verificationType: update.verificationType,
      currentStatus: update.status,
      completionPercentage,
      estimatedCompletion: update.estimatedCompletion,
      businessType: supplier.business_type || 'general',
      language: supplier.language || 'en',
      timezone: supplier.timezone || 'Europe/London',
      preferences: {
        emailEnabled: supplier.notification_preferences?.email !== false,
        smsEnabled: supplier.notification_preferences?.sms === true,
        pushEnabled: supplier.notification_preferences?.push === true,
        frequency: supplier.notification_preferences?.frequency || 'immediate',
      },
    };
  }

  private selectTemplate(
    status: string,
    context: VerificationContext,
  ): NotificationTemplate {
    const templateId = `verification_${status}_${context.businessType}`;
    return (
      this.templates.get(templateId) ||
      this.templates.get(`verification_${status}_general`)!
    );
  }

  private selectOptimalChannel(
    priority: string,
    preferences: VerificationContext['preferences'],
  ): 'email' | 'sms' | 'in_app' | 'push' {
    // For urgent notifications, use SMS if available
    if (priority === 'urgent' && preferences.smsEnabled) {
      return 'sms';
    }

    // For high priority, use push if available
    if (priority === 'high' && preferences.pushEnabled) {
      return 'push';
    }

    // Default to email if enabled
    if (preferences.emailEnabled) {
      return 'email';
    }

    // Fallback to in-app notification
    return 'in_app';
  }

  private async deliverNotification(
    channel: 'email' | 'sms' | 'in_app' | 'push',
    content: CustomizedNotification,
    context: VerificationContext,
  ): Promise<NotificationResult> {
    const messageId = crypto.randomUUID();

    try {
      switch (channel) {
        case 'email':
          await this.sendEmail(content, context, messageId);
          break;
        case 'sms':
          await this.sendSMS(content, context, messageId);
          break;
        case 'in_app':
          await this.sendInAppNotification(content, context, messageId);
          break;
        case 'push':
          await this.sendPushNotification(content, context, messageId);
          break;
      }

      return {
        messageId,
        channel,
        status: 'sent',
        deliveredAt: new Date(),
      };
    } catch (error) {
      return {
        messageId,
        channel,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async sendEmail(
    content: CustomizedNotification,
    context: VerificationContext,
    messageId: string,
  ): Promise<void> {
    // Get supplier email
    const { data: supplier } = await this.supabase
      .from('suppliers')
      .select('email')
      .eq('id', context.supplierId)
      .single();

    if (!supplier?.email) {
      throw new Error('Supplier email not found');
    }

    // Send email via email service
    const emailData = {
      to: supplier.email,
      subject: content.subject,
      html: content.body,
      messageId,
      tracking: {
        supplierId: context.supplierId,
        verificationType: context.verificationType,
        status: context.currentStatus,
      },
    };

    // This would integrate with actual email service (SendGrid, AWS SES, etc.)
    this.logger.info('Email would be sent', emailData);
  }

  private async sendSMS(
    content: CustomizedNotification,
    context: VerificationContext,
    messageId: string,
  ): Promise<void> {
    // Get supplier phone
    const { data: supplier } = await this.supabase
      .from('suppliers')
      .select('phone')
      .eq('id', context.supplierId)
      .single();

    if (!supplier?.phone) {
      throw new Error('Supplier phone not found');
    }

    // Send SMS via SMS service
    const smsData = {
      to: supplier.phone,
      message: this.createSMSVersion(content.body),
      messageId,
    };

    // This would integrate with actual SMS service (Twilio, AWS SNS, etc.)
    this.logger.info('SMS would be sent', smsData);
  }

  private async sendInAppNotification(
    content: CustomizedNotification,
    context: VerificationContext,
    messageId: string,
  ): Promise<void> {
    await this.supabase.from('notifications').insert({
      id: messageId,
      supplier_id: context.supplierId,
      type: 'verification_update',
      title: content.subject,
      message: content.body,
      read: false,
      created_at: new Date().toISOString(),
      metadata: {
        verificationType: context.verificationType,
        status: context.currentStatus,
      },
    });
  }

  private async sendPushNotification(
    content: CustomizedNotification,
    context: VerificationContext,
    messageId: string,
  ): Promise<void> {
    // This would integrate with push notification service (FCM, APNs, etc.)
    const pushData = {
      title: content.subject,
      body: this.createPushVersion(content.body),
      messageId,
      data: {
        supplierId: context.supplierId,
        verificationType: context.verificationType,
      },
    };

    this.logger.info('Push notification would be sent', pushData);
  }

  private async scheduleReminder(
    supplierId: string,
    reminder: ReminderSchedule,
  ): Promise<void> {
    await this.supabase.from('scheduled_reminders').insert({
      id: reminder.id,
      supplier_id: supplierId,
      type: reminder.type,
      scheduled_for: reminder.scheduledFor.toISOString(),
      priority: reminder.priority,
      channels: reminder.channels,
      metadata: reminder.metadata,
      status: 'scheduled',
      created_at: new Date().toISOString(),
    });
  }

  private async logNotification(
    supplierId: string,
    update: VerificationUpdate,
    result: NotificationResult,
  ): Promise<void> {
    await this.supabase.from('notification_logs').insert({
      id: crypto.randomUUID(),
      supplier_id: supplierId,
      message_id: result.messageId,
      channel: result.channel,
      status: result.status,
      verification_type: update.verificationType,
      verification_status: update.status,
      delivered_at: result.deliveredAt?.toISOString(),
      error: result.error,
      created_at: new Date().toISOString(),
    });
  }

  private formatVerificationType(type: string): string {
    const formats = {
      business_registration: 'Business Registration',
      insurance_policy: 'Insurance Policy',
      professional_license: 'Professional License',
      background_check: 'Background Check',
      document_authentication: 'Document Authentication',
    };
    return formats[type as keyof typeof formats] || type;
  }

  private formatStatus(status: string): string {
    const formats = {
      pending: 'Pending Review',
      in_progress: 'In Progress',
      completed: 'Completed Successfully',
      failed: 'Verification Failed',
      requires_action: 'Action Required',
    };
    return formats[status as keyof typeof formats] || status;
  }

  private generatePersonalization(
    context: VerificationContext,
  ): Record<string, any> {
    return {
      businessType: context.businessType,
      language: context.language,
      preferredContactTime: this.calculatePreferredContactTime(
        context.timezone,
      ),
      completionLevel:
        context.completionPercentage >= 75 ? 'almost_complete' : 'in_progress',
    };
  }

  private calculateOptimalDeliveryTime(
    context: VerificationContext,
  ): Date | undefined {
    if (context.preferences.frequency === 'immediate') {
      return undefined; // Send immediately
    }

    // Schedule for optimal time based on timezone
    const now = new Date();
    const optimal = new Date(now);
    optimal.setHours(10, 0, 0, 0); // 10 AM in supplier's timezone

    // If it's past optimal time today, schedule for tomorrow
    if (now.getHours() >= 10) {
      optimal.setDate(optimal.getDate() + 1);
    }

    return optimal;
  }

  private calculatePreferredContactTime(timezone: string): string {
    // Based on timezone, suggest optimal contact hours
    return '9 AM - 5 PM';
  }

  private createSMSVersion(htmlBody: string): string {
    // Convert HTML to plain text for SMS
    return htmlBody
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .substring(0, 160); // SMS character limit
  }

  private createPushVersion(htmlBody: string): string {
    // Convert HTML to plain text for push notifications
    return htmlBody
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .substring(0, 100); // Push notification character limit
  }

  private initializeTemplates(): void {
    // Initialize notification templates
    this.templates.set('verification_pending_general', {
      id: 'verification_pending_general',
      name: 'Verification Pending',
      subject: 'Your verification is being processed',
      bodyTemplate: `
        <p>Hello {{supplier_name}},</p>
        <p>Thank you for submitting your {{verification_type}} documents. We are currently reviewing your submission.</p>
        <p><strong>Current Status:</strong> {{current_status}}</p>
        <p><strong>Estimated Completion:</strong> {{estimated_completion}}</p>
        <p>We'll keep you updated on the progress.</p>
        <p>Best regards,<br>The WedSync Verification Team</p>
      `,
      channels: ['email', 'in_app'],
      variables: [
        'supplier_name',
        'verification_type',
        'current_status',
        'estimated_completion',
      ],
      priority: 'medium',
    });

    this.templates.set('verification_completed_general', {
      id: 'verification_completed_general',
      name: 'Verification Completed',
      subject: 'Congratulations! Your verification is complete',
      bodyTemplate: `
        <p>Hello {{supplier_name}},</p>
        <p>🎉 Great news! Your {{verification_type}} has been successfully verified.</p>
        <p>You now have access to all premium features on WedSync.</p>
        <p><a href="{{dashboard_url}}">View your verification badge</a></p>
        <p>Best regards,<br>The WedSync Team</p>
      `,
      channels: ['email', 'push', 'in_app'],
      variables: ['supplier_name', 'verification_type', 'dashboard_url'],
      priority: 'high',
    });

    // Add more templates as needed
  }
}
