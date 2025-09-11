/**
 * PDF Analysis Notification Service - Team C Implementation
 * Comprehensive multi-channel notification system for PDF analysis events
 * Supports: Email, SMS, WebSocket, Mobile Push, Slack, and real-time updates
 */

import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import twilio from 'twilio';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

// Core notification types
interface NotificationMessage {
  id: string;
  title: string;
  body: string;
  actionUrl?: string;
  cta?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data: NotificationData;
  timestamp: Date;
  channels?: NotificationChannel[];
}

interface NotificationData {
  jobId: string;
  supplierId: string;
  type: NotificationEventType;
  metadata?: Record<string, any>;
}

type NotificationEventType =
  | 'analysis_started'
  | 'field_extraction'
  | 'analysis_progress'
  | 'analysis_completed'
  | 'analysis_failed'
  | 'form_generated'
  | 'integration_ready'
  | 'error_occurred';

type NotificationChannel =
  | 'email'
  | 'sms'
  | 'websocket'
  | 'mobile_push'
  | 'slack'
  | 'in_app';

interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  websocket: boolean;
  mobilePush: boolean;
  slack: boolean;
  inApp: boolean;
  progressUpdates: boolean;
  marketingEmails: boolean;
  urgentOnly: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;
  };
  channels: {
    [key in NotificationChannel]: {
      enabled: boolean;
      events: NotificationEventType[];
      frequency: 'immediate' | 'batched' | 'digest';
    };
  };
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  timezone: string;
  deviceTokens?: string[];
  slackWebhook?: string;
  brandColors?: {
    primary: string;
    secondary: string;
  };
  preferredLanguage: string;
  subscriptionTier:
    | 'free'
    | 'starter'
    | 'professional'
    | 'scale'
    | 'enterprise';
}

interface AnalysisCompletionData {
  filename: string;
  fieldsExtracted: number;
  confidence: number;
  processingTime: number;
  suggestedForm: {
    title: string;
    previewUrl: string;
    adminUrl: string;
  };
}

interface AnalysisError {
  code: string;
  message: string;
  userFriendlyMessage: string;
  supportTicketId?: string;
  retryable: boolean;
}

interface EmailService {
  send(options: EmailOptions): Promise<void>;
  renderTemplate(templateName: string, data: any): Promise<string>;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  tags?: string[];
  replyTo?: string;
}

interface SMSService {
  send(to: string, message: string): Promise<void>;
}

interface WebSocketService {
  sendToUser(userId: string, message: NotificationMessage): Promise<void>;
  sendToRoom(room: string, message: NotificationMessage): Promise<void>;
  broadcastToAll(message: NotificationMessage): Promise<void>;
}

interface SlackService {
  sendWebhook(webhookUrl: string, message: SlackMessage): Promise<void>;
  formatForSlack(notification: NotificationMessage): SlackMessage;
}

interface SlackMessage {
  text: string;
  blocks?: any[];
  attachments?: any[];
}

interface MobileNotificationService {
  sendToDevices(
    deviceTokens: string[],
    message: MobileNotification,
  ): Promise<void>;
  sendToUser(userId: string, message: MobileNotification): Promise<void>;
}

interface MobileNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: string;
  badge?: number;
  clickAction?: string;
}

// Main notification service
export class PDFAnalysisNotificationService {
  private readonly emailService: EmailService;
  private readonly smsService: SMSService;
  private readonly websocketService: WebSocketService;
  private readonly slackService: SlackService;
  private readonly mobileNotificationService: MobileNotificationService;
  private readonly supabase = createClient();

  constructor() {
    this.emailService = new ResendEmailService();
    this.smsService = new TwilioSMSService();
    this.websocketService = new RealtimeWebSocketService();
    this.slackService = new SlackNotificationService();
    this.mobileNotificationService = new FirebaseMobileService();
  }

  // Main notification entry points
  async sendAnalysisStarted(
    jobId: string,
    supplierId: string,
    filename: string,
  ): Promise<void> {
    const supplier = await this.getSupplierDetails(supplierId);
    const preferences = await this.getNotificationPreferences(supplierId);

    const message: NotificationMessage = {
      id: `analysis-started-${jobId}`,
      title: 'PDF Analysis Started',
      body: `Your form "${filename}" is being analyzed. We'll notify you when it's ready for review.`,
      priority: 'medium',
      data: {
        jobId,
        supplierId,
        type: 'analysis_started',
        metadata: { filename },
      },
      timestamp: new Date(),
      channels: this.getEnabledChannels(preferences, 'analysis_started'),
    };

    await this.sendViaEnabledChannels(supplier, preferences, message);
    await this.logNotification(message);
  }

  async sendFieldExtractionUpdate(
    jobId: string,
    supplierId: string,
    fieldsCount: number,
  ): Promise<void> {
    const supplier = await this.getSupplierDetails(supplierId);
    const preferences = await this.getNotificationPreferences(supplierId);

    // Only send if user has enabled progress notifications
    if (!preferences.progressUpdates) return;

    const message: NotificationMessage = {
      id: `field-extraction-${jobId}`,
      title: 'Fields Detected',
      body: `Found ${fieldsCount} form fields. Analysis in progress...`,
      priority: 'low',
      data: {
        jobId,
        supplierId,
        type: 'field_extraction',
        metadata: { fieldsCount },
      },
      timestamp: new Date(),
      channels: ['websocket', 'mobile_push'], // Only real-time channels for progress
    };

    // Send via real-time channels only
    if (preferences.websocket) {
      await this.websocketService.sendToUser(supplierId, message);
    }

    if (preferences.mobilePush && supplier.deviceTokens?.length) {
      await this.mobileNotificationService.sendToDevices(
        supplier.deviceTokens,
        {
          title: message.title,
          body: message.body,
          data: { jobId, fieldsCount: fieldsCount.toString() },
          sound: 'default',
        },
      );
    }

    await this.logNotification(message);
  }

  async sendAnalysisProgress(
    jobId: string,
    supplierId: string,
    progress: number,
    currentStep: string,
  ): Promise<void> {
    const supplier = await this.getSupplierDetails(supplierId);
    const preferences = await this.getNotificationPreferences(supplierId);

    if (!preferences.progressUpdates) return;

    const message: NotificationMessage = {
      id: `progress-${jobId}-${progress}`,
      title: 'Analysis Progress',
      body: `${currentStep} (${progress}% complete)`,
      priority: 'low',
      data: {
        jobId,
        supplierId,
        type: 'analysis_progress',
        metadata: { progress, currentStep },
      },
      timestamp: new Date(),
      channels: ['websocket'],
    };

    // WebSocket only for frequent progress updates
    if (preferences.websocket) {
      await this.websocketService.sendToUser(supplierId, message);
    }
  }

  async sendAnalysisCompleted(
    jobId: string,
    supplierId: string,
    result: AnalysisCompletionData,
  ): Promise<void> {
    const supplier = await this.getSupplierDetails(supplierId);
    const preferences = await this.getNotificationPreferences(supplierId);

    const message: NotificationMessage = {
      id: `analysis-completed-${jobId}`,
      title: '🎉 Form Analysis Complete!',
      body: `${result.fieldsExtracted} fields extracted from "${result.filename}". Your digital form is ready!`,
      actionUrl: result.suggestedForm.adminUrl,
      cta: 'View Digital Form',
      priority: 'high',
      data: { jobId, supplierId, type: 'analysis_completed', metadata: result },
      timestamp: new Date(),
      channels: this.getEnabledChannels(preferences, 'analysis_completed'),
    };

    // Send comprehensive notification for completion
    await this.sendViaAllEnabledChannels(supplier, preferences, message);

    // Send special wedding season notification if applicable
    if (this.isWeddingSeason()) {
      await this.sendWeddingSeasonMessage(supplier, message);
    }

    await this.logNotification(message);

    // Trigger celebration animation for premium users
    if (this.isPremiumUser(supplier)) {
      await this.triggerCelebrationEffects(supplierId, message);
    }
  }

  async sendAnalysisFailed(
    jobId: string,
    supplierId: string,
    error: AnalysisError,
  ): Promise<void> {
    const supplier = await this.getSupplierDetails(supplierId);
    const preferences = await this.getNotificationPreferences(supplierId);

    const message: NotificationMessage = {
      id: `analysis-failed-${jobId}`,
      title: '❌ Analysis Failed',
      body: `We couldn't analyze your form. ${error.userFriendlyMessage}`,
      actionUrl: `/dashboard/forms/pdf-import?retry=${jobId}`,
      cta: error.retryable ? 'Try Again' : 'Contact Support',
      priority: 'urgent',
      data: {
        jobId,
        supplierId,
        type: 'analysis_failed',
        metadata: { error: error.code },
      },
      timestamp: new Date(),
      channels: Object.keys(preferences.channels) as NotificationChannel[], // All channels for failures
    };

    // Always send failure notifications regardless of preferences
    await this.sendViaAllChannels(supplier, message);

    // Send to support team for manual review
    await this.notifySupport(jobId, error, supplier);

    await this.logNotification(message);
  }

  async sendFormGeneratedNotification(
    supplierId: string,
    formData: {
      formId: string;
      title: string;
      adminUrl: string;
      publicUrl: string;
      fieldsCount: number;
    },
  ): Promise<void> {
    const supplier = await this.getSupplierDetails(supplierId);
    const preferences = await this.getNotificationPreferences(supplierId);

    const message: NotificationMessage = {
      id: `form-generated-${formData.formId}`,
      title: '✨ Digital Form Ready!',
      body: `Your form "${formData.title}" is now live and ready to share with clients.`,
      actionUrl: formData.adminUrl,
      cta: 'View Form',
      priority: 'high',
      data: {
        jobId: formData.formId,
        supplierId,
        type: 'form_generated',
        metadata: formData,
      },
      timestamp: new Date(),
      channels: this.getEnabledChannels(preferences, 'form_generated'),
    };

    await this.sendViaEnabledChannels(supplier, preferences, message);

    // Send onboarding tips for new forms
    if (await this.isFirstGeneratedForm(supplierId)) {
      await this.sendFormOnboardingTips(supplier, formData);
    }

    // Send sharing suggestions
    await this.sendFormSharingTips(supplier, formData);

    await this.logNotification(message);
  }

  // Channel-specific sending methods
  private async sendViaEnabledChannels(
    supplier: Supplier,
    preferences: NotificationPreferences,
    message: NotificationMessage,
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    // Check quiet hours
    if (
      this.isQuietHours(preferences.quietHours, supplier.timezone) &&
      message.priority !== 'urgent'
    ) {
      await this.queueForLater(message, supplier);
      return;
    }

    const enabledChannels =
      message.channels ||
      (Object.keys(preferences.channels) as NotificationChannel[]);

    for (const channel of enabledChannels) {
      const channelConfig = preferences.channels[channel];
      if (
        !channelConfig.enabled ||
        !channelConfig.events.includes(message.data.type)
      ) {
        continue;
      }

      switch (channel) {
        case 'email':
          if (preferences.email) {
            promises.push(this.sendEmailNotification(supplier, message));
          }
          break;

        case 'sms':
          if (preferences.sms && supplier.phoneNumber) {
            promises.push(this.sendSMSNotification(supplier, message));
          }
          break;

        case 'websocket':
          if (preferences.websocket) {
            promises.push(
              this.websocketService.sendToUser(supplier.id, message),
            );
          }
          break;

        case 'slack':
          if (preferences.slack && supplier.slackWebhook) {
            promises.push(this.sendSlackNotification(supplier, message));
          }
          break;

        case 'mobile_push':
          if (preferences.mobilePush && supplier.deviceTokens?.length) {
            promises.push(this.sendMobilePushNotification(supplier, message));
          }
          break;

        case 'in_app':
          promises.push(this.saveInAppNotification(supplier, message));
          break;
      }
    }

    const results = await Promise.allSettled(promises);
    await this.logChannelResults(message.id, results);
  }

  private async sendViaAllEnabledChannels(
    supplier: Supplier,
    preferences: NotificationPreferences,
    message: NotificationMessage,
  ): Promise<void> {
    message.channels = Object.keys(
      preferences.channels,
    ) as NotificationChannel[];
    await this.sendViaEnabledChannels(supplier, preferences, message);
  }

  private async sendViaAllChannels(
    supplier: Supplier,
    message: NotificationMessage,
  ): Promise<void> {
    // Force send via all available channels (for critical messages)
    const promises: Promise<void>[] = [
      this.sendEmailNotification(supplier, message),
      this.websocketService.sendToUser(supplier.id, message),
      this.saveInAppNotification(supplier, message),
    ];

    if (supplier.phoneNumber) {
      promises.push(this.sendSMSNotification(supplier, message));
    }

    if (supplier.slackWebhook) {
      promises.push(this.sendSlackNotification(supplier, message));
    }

    if (supplier.deviceTokens?.length) {
      promises.push(this.sendMobilePushNotification(supplier, message));
    }

    await Promise.allSettled(promises);
  }

  private async sendEmailNotification(
    supplier: Supplier,
    message: NotificationMessage,
  ): Promise<void> {
    const emailTemplate = await this.generateEmailTemplate(message, supplier);

    await this.emailService.send({
      to: supplier.email,
      subject: this.generateEmailSubject(message, supplier),
      html: emailTemplate,
      trackOpens: true,
      trackClicks: true,
      tags: ['pdf-analysis', message.data.type, supplier.subscriptionTier],
      replyTo: 'support@wedsync.com',
    });
  }

  private async sendSMSNotification(
    supplier: Supplier,
    message: NotificationMessage,
  ): Promise<void> {
    const smsText = this.generateSMSText(message, supplier);
    await this.smsService.send(supplier.phoneNumber!, smsText);
  }

  private async sendSlackNotification(
    supplier: Supplier,
    message: NotificationMessage,
  ): Promise<void> {
    const slackMessage = this.slackService.formatForSlack(message);
    await this.slackService.sendWebhook(supplier.slackWebhook!, slackMessage);
  }

  private async sendMobilePushNotification(
    supplier: Supplier,
    message: NotificationMessage,
  ): Promise<void> {
    await this.mobileNotificationService.sendToDevices(supplier.deviceTokens!, {
      title: message.title,
      body: message.body,
      data: {
        jobId: message.data.jobId,
        type: message.data.type,
        actionUrl: message.actionUrl || '',
      },
      sound: message.priority === 'urgent' ? 'critical' : 'default',
      clickAction: message.actionUrl,
    });
  }

  private async saveInAppNotification(
    supplier: Supplier,
    message: NotificationMessage,
  ): Promise<void> {
    await this.supabase.from('notifications').insert({
      supplier_id: supplier.id,
      title: message.title,
      body: message.body,
      action_url: message.actionUrl,
      priority: message.priority,
      type: message.data.type,
      data: message.data,
      read: false,
      created_at: new Date().toISOString(),
    });
  }

  // Template generation methods
  private async generateEmailTemplate(
    message: NotificationMessage,
    supplier: Supplier,
  ): Promise<string> {
    const templateData = {
      supplierName: supplier.name,
      message: message,
      brandColors: supplier.brandColors || this.getDefaultWeddingColors(),
      ctaButton: message.actionUrl
        ? {
            text: message.cta || 'View Details',
            url: message.actionUrl,
          }
        : null,
      footerTips: await this.getRelevantWeddingTips(message.data.type),
      seasonalMessage: this.isWeddingSeason()
        ? this.getWeddingSeasonMessage()
        : null,
      unsubscribeUrl: `/settings/notifications?token=${await this.generateUnsubscribeToken(supplier.id)}`,
    };

    return this.emailService.renderTemplate(
      this.getEmailTemplateName(message.data.type),
      templateData,
    );
  }

  private generateEmailSubject(
    message: NotificationMessage,
    supplier: Supplier,
  ): string {
    const subjects = {
      analysis_started: `${supplier.name} - PDF Analysis Started`,
      analysis_completed: `🎉 ${supplier.name} - Your Form is Ready!`,
      analysis_failed: `❌ ${supplier.name} - Analysis Issue`,
      form_generated: `✨ ${supplier.name} - Digital Form Created`,
      field_extraction: `${supplier.name} - Form Processing Update`,
      analysis_progress: `${supplier.name} - Analysis Progress`,
    };

    return subjects[message.data.type] || `WedSync - ${message.title}`;
  }

  private generateSMSText(
    message: NotificationMessage,
    supplier: Supplier,
  ): string {
    const shortTexts = {
      analysis_started: `WedSync: PDF analysis started for ${message.data.metadata?.filename}`,
      analysis_completed: `WedSync: ✨ Your form is ready! ${message.data.metadata?.fieldsExtracted} fields extracted. View: ${message.actionUrl}`,
      analysis_failed: `WedSync: ❌ Analysis failed. ${message.body} View: ${message.actionUrl}`,
      form_generated: `WedSync: 🎉 Digital form created! Share with clients: ${message.actionUrl}`,
    };

    return shortTexts[message.data.type] || `WedSync: ${message.body}`;
  }

  // Utility methods
  private getEnabledChannels(
    preferences: NotificationPreferences,
    eventType: NotificationEventType,
  ): NotificationChannel[] {
    return Object.entries(preferences.channels)
      .filter(
        ([_, config]) => config.enabled && config.events.includes(eventType),
      )
      .map(([channel, _]) => channel as NotificationChannel);
  }

  private isQuietHours(
    quietHours: NotificationPreferences['quietHours'],
    timezone: string,
  ): boolean {
    if (!quietHours.enabled) return false;

    const now = new Date();
    const userTime = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

    const currentHour = parseInt(userTime.split(':')[0]);
    const startHour = parseInt(quietHours.start.split(':')[0]);
    const endHour = parseInt(quietHours.end.split(':')[0]);

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startHour > endHour) {
      return currentHour >= startHour || currentHour < endHour;
    }

    return currentHour >= startHour && currentHour < endHour;
  }

  private async queueForLater(
    message: NotificationMessage,
    supplier: Supplier,
  ): Promise<void> {
    await this.supabase.from('notification_queue').insert({
      supplier_id: supplier.id,
      message: message,
      scheduled_for: this.calculateNextSendTime(supplier),
      created_at: new Date().toISOString(),
    });
  }

  private calculateNextSendTime(supplier: Supplier): string {
    // Calculate next appropriate send time based on user's timezone and quiet hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9 AM next day
    return tomorrow.toISOString();
  }

  private isWeddingSeason(): boolean {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12

    // Wedding season is typically May through October
    return month >= 5 && month <= 10;
  }

  private isPremiumUser(supplier: Supplier): boolean {
    return ['professional', 'scale', 'enterprise'].includes(
      supplier.subscriptionTier,
    );
  }

  private async getSupplierDetails(supplierId: string): Promise<Supplier> {
    const { data, error } = await this.supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single();

    if (error) throw error;
    return data;
  }

  private async getNotificationPreferences(
    supplierId: string,
  ): Promise<NotificationPreferences> {
    const { data } = await this.supabase
      .from('notification_preferences')
      .select('*')
      .eq('supplier_id', supplierId)
      .single();

    return data || this.getDefaultNotificationPreferences();
  }

  private getDefaultNotificationPreferences(): NotificationPreferences {
    return {
      email: true,
      sms: false,
      websocket: true,
      mobilePush: true,
      slack: false,
      inApp: true,
      progressUpdates: true,
      marketingEmails: false,
      urgentOnly: false,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
      channels: {
        email: {
          enabled: true,
          events: ['analysis_completed', 'analysis_failed', 'form_generated'],
          frequency: 'immediate',
        },
        sms: {
          enabled: false,
          events: ['analysis_failed'],
          frequency: 'immediate',
        },
        websocket: {
          enabled: true,
          events: [
            'analysis_started',
            'analysis_progress',
            'analysis_completed',
          ],
          frequency: 'immediate',
        },
        mobile_push: {
          enabled: true,
          events: ['analysis_completed', 'form_generated'],
          frequency: 'immediate',
        },
        slack: {
          enabled: false,
          events: ['analysis_completed', 'analysis_failed'],
          frequency: 'immediate',
        },
        in_app: {
          enabled: true,
          events: [
            'analysis_started',
            'analysis_completed',
            'analysis_failed',
            'form_generated',
          ],
          frequency: 'immediate',
        },
      },
    };
  }

  private getDefaultWeddingColors() {
    return {
      primary: '#8B5CF6',
      secondary: '#EC4899',
    };
  }

  private getEmailTemplateName(type: NotificationEventType): string {
    const templates = {
      analysis_started: 'pdf-analysis-started',
      analysis_completed: 'pdf-analysis-completed',
      analysis_failed: 'pdf-analysis-failed',
      form_generated: 'form-generated',
      field_extraction: 'field-extraction-update',
      analysis_progress: 'analysis-progress',
    };
    return templates[type] || 'generic-notification';
  }

  private async getRelevantWeddingTips(
    type: NotificationEventType,
  ): Promise<string[]> {
    const tips = {
      analysis_completed: [
        'Share your digital form link directly with clients for faster bookings',
        'Set up automated email responses to impress couples instantly',
        'Use form analytics to see which services are most popular',
      ],
      form_generated: [
        'Add your digital form link to your email signature',
        'Share the form on social media to attract new clients',
        'Consider adding your form to your website footer',
      ],
    };

    return (
      tips[type] || [
        'Check out our wedding vendor success stories for inspiration',
        'Join our Facebook group for tips from other wedding professionals',
      ]
    );
  }

  private getWeddingSeasonMessage(): string {
    return "🌸 It's wedding season! Expect higher than usual form submissions. We're here to help you manage the busy season.";
  }

  private async sendWeddingSeasonMessage(
    supplier: Supplier,
    originalMessage: NotificationMessage,
  ): Promise<void> {
    // Send additional seasonal context message
    const seasonalMessage: NotificationMessage = {
      id: `seasonal-${originalMessage.id}`,
      title: '🌸 Wedding Season Boost',
      body: 'Your form is ready just in time for wedding season! Expect increased client activity.',
      priority: 'low',
      data: {
        jobId: originalMessage.data.jobId,
        supplierId: supplier.id,
        type: 'analysis_completed',
        metadata: { seasonal: true },
      },
      timestamp: new Date(),
      channels: ['in_app'],
    };

    await this.saveInAppNotification(supplier, seasonalMessage);
  }

  private async triggerCelebrationEffects(
    supplierId: string,
    message: NotificationMessage,
  ): Promise<void> {
    // Send special celebration effects for premium users
    await this.websocketService.sendToUser(supplierId, {
      ...message,
      data: {
        ...message.data,
        metadata: {
          ...message.data.metadata,
          celebration: {
            type: 'confetti',
            duration: 3000,
            colors: ['#8B5CF6', '#EC4899', '#10B981'],
          },
        },
      },
    });
  }

  private async notifySupport(
    jobId: string,
    error: AnalysisError,
    supplier: Supplier,
  ): Promise<void> {
    const supportMessage = {
      title: 'PDF Analysis Failed - Requires Manual Review',
      body: `Analysis failed for ${supplier.name} (${supplier.email}). Job ID: ${jobId}. Error: ${error.message}`,
      priority: 'high' as const,
      data: {
        jobId,
        supplierId: supplier.id,
        errorCode: error.code,
        customerTier: supplier.subscriptionTier,
      },
    };

    // Send to support team via multiple channels
    await Promise.all([
      this.emailService.send({
        to: 'support@wedsync.com',
        subject: `Analysis Failed - Manual Review Required (${jobId})`,
        html: await this.generateSupportEmailTemplate(
          supportMessage,
          supplier,
          error,
        ),
      }),
      this.slackService.sendWebhook(process.env.SUPPORT_SLACK_WEBHOOK!, {
        text: `🚨 PDF Analysis Failed`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Customer:* ${supplier.name} (${supplier.subscriptionTier})\n*Job ID:* ${jobId}\n*Error:* ${error.message}`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Review Job' },
                url: `${process.env.ADMIN_URL}/jobs/${jobId}`,
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Contact Customer' },
                url: `mailto:${supplier.email}`,
              },
            ],
          },
        ],
      }),
    ]);
  }

  private async isFirstGeneratedForm(supplierId: string): Promise<boolean> {
    const { count } = await this.supabase
      .from('forms')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplierId)
      .eq('status', 'active');

    return count === 1; // This is their first form
  }

  private async sendFormOnboardingTips(
    supplier: Supplier,
    formData: any,
  ): Promise<void> {
    const onboardingMessage: NotificationMessage = {
      id: `onboarding-${formData.formId}`,
      title: '🎉 Welcome to Digital Forms!',
      body: 'Here are some quick tips to get the most out of your new digital form.',
      actionUrl: '/dashboard/forms/onboarding',
      cta: 'View Tips',
      priority: 'medium',
      data: {
        jobId: formData.formId,
        supplierId: supplier.id,
        type: 'form_generated',
        metadata: { onboarding: true },
      },
      timestamp: new Date(),
      channels: ['email', 'in_app'],
    };

    // Delay onboarding tips by 5 minutes to not overwhelm
    setTimeout(
      async () => {
        const preferences = await this.getNotificationPreferences(supplier.id);
        await this.sendViaEnabledChannels(
          supplier,
          preferences,
          onboardingMessage,
        );
      },
      5 * 60 * 1000,
    );
  }

  private async sendFormSharingTips(
    supplier: Supplier,
    formData: any,
  ): Promise<void> {
    const sharingTips = [
      'Add your form link to your email signature',
      'Share on social media with a compelling caption',
      'Include the link in your website footer or contact page',
      'Send to past clients who might refer new couples',
    ];

    const tipMessage: NotificationMessage = {
      id: `sharing-tips-${formData.formId}`,
      title: '💡 Form Sharing Ideas',
      body: `Here are ways to share your new form: ${sharingTips.join(', ')}`,
      priority: 'low',
      data: {
        jobId: formData.formId,
        supplierId: supplier.id,
        type: 'form_generated',
        metadata: { sharingTips },
      },
      timestamp: new Date(),
      channels: ['in_app'],
    };

    await this.saveInAppNotification(supplier, tipMessage);
  }

  private async generateSupportEmailTemplate(
    message: any,
    supplier: Supplier,
    error: AnalysisError,
  ): Promise<string> {
    return `
      <h2>PDF Analysis Failed - Manual Review Required</h2>
      
      <h3>Customer Details:</h3>
      <ul>
        <li><strong>Name:</strong> ${supplier.name}</li>
        <li><strong>Email:</strong> ${supplier.email}</li>
        <li><strong>Subscription:</strong> ${supplier.subscriptionTier}</li>
        <li><strong>Phone:</strong> ${supplier.phoneNumber || 'Not provided'}</li>
      </ul>
      
      <h3>Error Details:</h3>
      <ul>
        <li><strong>Job ID:</strong> ${message.data.jobId}</li>
        <li><strong>Error Code:</strong> ${error.code}</li>
        <li><strong>Error Message:</strong> ${error.message}</li>
        <li><strong>Retryable:</strong> ${error.retryable ? 'Yes' : 'No'}</li>
        <li><strong>Time:</strong> ${new Date().toISOString()}</li>
      </ul>
      
      <h3>Recommended Actions:</h3>
      <ul>
        <li>Review the uploaded PDF file</li>
        <li>Check if manual processing is possible</li>
        <li>Contact customer with update if needed</li>
        <li>Update error handling if this is a new error pattern</li>
      </ul>
      
      <p><a href="${process.env.ADMIN_URL}/jobs/${message.data.jobId}">Review Job in Admin Panel</a></p>
    `;
  }

  private async generateUnsubscribeToken(supplierId: string): Promise<string> {
    // Generate secure unsubscribe token
    const token = Buffer.from(`${supplierId}-${Date.now()}`).toString('base64');

    // Store token with expiry
    await this.supabase.from('unsubscribe_tokens').insert({
      supplier_id: supplierId,
      token,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    });

    return token;
  }

  private async logNotification(message: NotificationMessage): Promise<void> {
    await this.supabase.from('notification_logs').insert({
      message_id: message.id,
      supplier_id: message.data.supplierId,
      type: message.data.type,
      title: message.title,
      channels: message.channels,
      priority: message.priority,
      sent_at: new Date().toISOString(),
    });
  }

  private async logChannelResults(
    messageId: string,
    results: PromiseSettledResult<void>[],
  ): Promise<void> {
    const channelResults = results.map((result, index) => ({
      message_id: messageId,
      channel_index: index,
      status: result.status,
      error: result.status === 'rejected' ? result.reason.message : null,
      sent_at: new Date().toISOString(),
    }));

    await this.supabase
      .from('notification_channel_results')
      .insert(channelResults);
  }
}

// Service implementations
class ResendEmailService implements EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async send(options: EmailOptions): Promise<void> {
    await this.resend.emails.send({
      from: 'WedSync <notifications@wedsync.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      reply_to: options.replyTo || 'support@wedsync.com',
      tags: options.tags?.map((tag) => ({ name: 'category', value: tag })),
    });
  }

  async renderTemplate(templateName: string, data: any): Promise<string> {
    // Implement template rendering - could use a template engine like Handlebars
    // For now, return a basic HTML template
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${data.brandColors?.primary || '#8B5CF6'}, ${data.brandColors?.secondary || '#EC4899'}); padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
          .cta-button { display: inline-block; background: ${data.brandColors?.primary || '#8B5CF6'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; font-size: 12px; color: #666; text-align: center; border-radius: 0 0 8px 8px; }
          .tips { background: #f8f9ff; padding: 15px; border-left: 4px solid ${data.brandColors?.primary || '#8B5CF6'}; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>WedSync</h1>
            <h2>${data.message.title}</h2>
          </div>
          <div class="content">
            <p>Hi ${data.supplierName},</p>
            <p>${data.message.body}</p>
            
            ${data.ctaButton ? `<a href="${data.ctaButton.url}" class="cta-button">${data.ctaButton.text}</a>` : ''}
            
            ${data.seasonalMessage ? `<div class="tips"><strong>${data.seasonalMessage}</strong></div>` : ''}
            
            ${
              data.footerTips?.length
                ? `
              <div class="tips">
                <h4>💡 Pro Tips:</h4>
                <ul>
                  ${data.footerTips.map((tip: string) => `<li>${tip}</li>`).join('')}
                </ul>
              </div>
            `
                : ''
            }
            
            <p>Best regards,<br>The WedSync Team</p>
          </div>
          <div class="footer">
            <p>WedSync - Streamlining Wedding Supplier Workflows</p>
            <p><a href="${data.unsubscribeUrl}">Manage notification preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

class TwilioSMSService implements SMSService {
  private client: twilio.Twilio;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  async send(to: string, message: string): Promise<void> {
    await this.client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });
  }
}

class RealtimeWebSocketService implements WebSocketService {
  private supabase = createClient();

  async sendToUser(
    userId: string,
    message: NotificationMessage,
  ): Promise<void> {
    // Use Supabase Realtime to send message to specific user
    await this.supabase.channel(`user:${userId}`).send({
      type: 'broadcast',
      event: 'notification',
      payload: message,
    });
  }

  async sendToRoom(room: string, message: NotificationMessage): Promise<void> {
    await this.supabase.channel(room).send({
      type: 'broadcast',
      event: 'notification',
      payload: message,
    });
  }

  async broadcastToAll(message: NotificationMessage): Promise<void> {
    await this.supabase.channel('global').send({
      type: 'broadcast',
      event: 'notification',
      payload: message,
    });
  }
}

class SlackNotificationService implements SlackService {
  async sendWebhook(webhookUrl: string, message: SlackMessage): Promise<void> {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }
  }

  formatForSlack(notification: NotificationMessage): SlackMessage {
    const emoji =
      {
        analysis_started: '🔄',
        analysis_completed: '✅',
        analysis_failed: '❌',
        form_generated: '✨',
        field_extraction: '🔍',
        analysis_progress: '⏳',
      }[notification.data.type] || '📋';

    return {
      text: `${emoji} ${notification.title}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${notification.title}*\n${notification.body}`,
          },
        },
        ...(notification.actionUrl
          ? [
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: notification.cta || 'View',
                    },
                    url: notification.actionUrl,
                  },
                ],
              },
            ]
          : []),
      ],
    };
  }
}

class FirebaseMobileService implements MobileNotificationService {
  async sendToDevices(
    deviceTokens: string[],
    message: MobileNotification,
  ): Promise<void> {
    // Implementation would use Firebase Admin SDK
    // For now, simulate the call
    console.log(
      `Sending push notification to ${deviceTokens.length} devices:`,
      message,
    );
  }

  async sendToUser(userId: string, message: MobileNotification): Promise<void> {
    const supabase = createClient();
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('device_tokens')
      .eq('id', userId)
      .single();

    if (supplier?.device_tokens?.length) {
      await this.sendToDevices(supplier.device_tokens, message);
    }
  }
}

export default PDFAnalysisNotificationService;
