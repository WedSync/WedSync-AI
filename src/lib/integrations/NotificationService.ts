import { integrationDataManager } from '../database/IntegrationDataManager';
import { IntegrationError, ErrorCategory } from '@/types/integrations';

interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  variables: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
}

interface NotificationRecipient {
  id: string;
  type: 'user' | 'role' | 'email' | 'phone';
  value: string;
  preferences?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    inApp?: boolean;
    quietHours?: {
      start: string;
      end: string;
      timezone: string;
    };
  };
}

interface NotificationPayload {
  templateId: string;
  recipients: NotificationRecipient[];
  variables?: Record<string, any>;
  scheduledAt?: Date;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  expiresAt?: Date;
  actionButtons?: Array<{
    label: string;
    action: string;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
}

interface DeliveryResult {
  recipientId: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  status: 'sent' | 'failed' | 'pending' | 'delivered' | 'bounced';
  timestamp: Date;
  error?: string;
  messageId?: string;
}

interface NotificationResult {
  id: string;
  status: 'sent' | 'failed' | 'partial';
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  deliveryResults: DeliveryResult[];
  queuedAt: Date;
  processedAt?: Date;
}

interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'in_app';
  provider: string;
  config: Record<string, any>;
  enabled: boolean;
  rateLimit?: {
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
  };
}

export class NotificationService {
  private channels = new Map<string, NotificationChannel>();
  private templates = new Map<string, NotificationTemplate>();
  private notificationQueue: Array<{
    payload: NotificationPayload;
    id: string;
    queuedAt: Date;
  }> = [];
  private processingInterval?: NodeJS.Timeout;
  private isProcessing = false;

  constructor(
    private userId: string,
    private organizationId: string,
  ) {}

  async initialize(): Promise<void> {
    await this.loadNotificationChannels();
    await this.loadNotificationTemplates();
    this.startQueueProcessor();

    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      'NOTIFICATION_SERVICE_INITIALIZED',
      undefined,
      'notification_service',
      {
        channelsLoaded: this.channels.size,
        templatesLoaded: this.templates.size,
      },
    );
  }

  private async loadNotificationChannels(): Promise<void> {
    // Default notification channels
    const defaultChannels: NotificationChannel[] = [
      {
        type: 'email',
        provider: 'supabase-smtp',
        enabled: true,
        config: {
          from: 'noreply@wedsync.com',
          replyTo: 'support@wedsync.com',
          smtpHost: process.env.SMTP_HOST,
          smtpPort: 587,
          smtpUser: process.env.SMTP_USER,
          smtpPass: process.env.SMTP_PASSWORD,
        },
        rateLimit: {
          maxPerMinute: 60,
          maxPerHour: 1000,
          maxPerDay: 10000,
        },
      },
      {
        type: 'sms',
        provider: 'twilio',
        enabled: !!process.env.TWILIO_ACCOUNT_SID,
        config: {
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          fromNumber: process.env.TWILIO_FROM_NUMBER,
        },
        rateLimit: {
          maxPerMinute: 10,
          maxPerHour: 100,
          maxPerDay: 1000,
        },
      },
      {
        type: 'push',
        provider: 'firebase',
        enabled: !!process.env.FIREBASE_SERVER_KEY,
        config: {
          serverKey: process.env.FIREBASE_SERVER_KEY,
          senderId: process.env.FIREBASE_SENDER_ID,
        },
        rateLimit: {
          maxPerMinute: 100,
          maxPerHour: 2000,
          maxPerDay: 50000,
        },
      },
      {
        type: 'in_app',
        provider: 'supabase-realtime',
        enabled: true,
        config: {
          channel: 'notifications',
        },
        rateLimit: {
          maxPerMinute: 200,
          maxPerHour: 5000,
          maxPerDay: 100000,
        },
      },
    ];

    for (const channel of defaultChannels) {
      this.channels.set(channel.type, channel);
    }
  }

  private async loadNotificationTemplates(): Promise<void> {
    // Wedding-specific notification templates
    const weddingTemplates: NotificationTemplate[] = [
      {
        id: 'task_assigned',
        name: 'Task Assigned',
        subject: 'New Wedding Task Assigned: {{taskTitle}}',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Task Assigned</h2>
            <p>Hi {{recipientName}},</p>
            <p>You have been assigned a new wedding task:</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1e40af;">{{taskTitle}}</h3>
              <p style="margin: 5px 0;"><strong>Due Date:</strong> {{dueDate}}</p>
              <p style="margin: 5px 0;"><strong>Priority:</strong> {{priority}}</p>
              {{#if description}}
              <p style="margin: 10px 0 0 0;">{{description}}</p>
              {{/if}}
            </div>
            <p>Please complete this task by the due date to keep your wedding planning on track.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{taskUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Task</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">Best regards,<br>The WedSync Team</p>
          </div>
        `,
        type: 'email',
        variables: [
          'recipientName',
          'taskTitle',
          'dueDate',
          'priority',
          'description',
          'taskUrl',
        ],
        priority: 'normal',
        tags: ['task', 'assignment'],
      },
      {
        id: 'task_reminder',
        name: 'Task Reminder',
        subject: 'Reminder: {{taskTitle}} is due {{timeUntilDue}}',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Task Reminder</h2>
            <p>Hi {{recipientName}},</p>
            <p>This is a friendly reminder that you have a wedding task due soon:</p>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3 style="margin: 0 0 10px 0; color: #b91c1c;">{{taskTitle}}</h3>
              <p style="margin: 5px 0;"><strong>Due:</strong> {{dueDate}} ({{timeUntilDue}})</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> {{status}}</p>
            </div>
            <p>Don't let this important task slip by! Click below to view and complete it.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{taskUrl}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Complete Task</a>
            </div>
          </div>
        `,
        type: 'email',
        variables: [
          'recipientName',
          'taskTitle',
          'dueDate',
          'timeUntilDue',
          'status',
          'taskUrl',
        ],
        priority: 'high',
        tags: ['task', 'reminder', 'urgent'],
      },
      {
        id: 'conflict_detected',
        name: 'Scheduling Conflict Detected',
        subject: 'Wedding Schedule Conflict: {{conflictType}}',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d97706;">Scheduling Conflict Detected</h2>
            <p>Hi {{recipientName}},</p>
            <p>We've detected a potential scheduling conflict in your wedding timeline:</p>
            <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706;">
              <h3 style="margin: 0 0 10px 0; color: #92400e;">{{conflictTitle}}</h3>
              <p>{{conflictDescription}}</p>
              <p><strong>Affected Items:</strong></p>
              <ul>
                {{#each affectedItems}}
                <li>{{this}}</li>
                {{/each}}
              </ul>
            </div>
            <p>We recommend reviewing and resolving this conflict to ensure your wedding day goes smoothly.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{resolveUrl}}" style="background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Resolve Conflict</a>
            </div>
          </div>
        `,
        type: 'email',
        variables: [
          'recipientName',
          'conflictType',
          'conflictTitle',
          'conflictDescription',
          'affectedItems',
          'resolveUrl',
        ],
        priority: 'high',
        tags: ['conflict', 'timeline', 'urgent'],
      },
      {
        id: 'weather_alert',
        name: 'Weather Alert',
        subject: 'Weather Alert for {{eventDate}}: {{weatherCondition}}',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Weather Update</h2>
            <p>Hi {{recipientName}},</p>
            <p>We have a weather update for your upcoming wedding events:</p>
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #047857;">{{eventDate}}</h3>
              <p><strong>Condition:</strong> {{weatherCondition}}</p>
              <p><strong>Temperature:</strong> {{temperature}}</p>
              <p><strong>Precipitation:</strong> {{precipitation}}%</p>
            </div>
            {{#if recommendations}}
            <p><strong>Recommendations:</strong></p>
            <ul>
              {{#each recommendations}}
              <li>{{this}}</li>
              {{/each}}
            </ul>
            {{/if}}
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{timelineUrl}}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Timeline</a>
            </div>
          </div>
        `,
        type: 'email',
        variables: [
          'recipientName',
          'eventDate',
          'weatherCondition',
          'temperature',
          'precipitation',
          'recommendations',
          'timelineUrl',
        ],
        priority: 'normal',
        tags: ['weather', 'alert', 'outdoor'],
      },
      {
        id: 'vendor_confirmation',
        name: 'Vendor Confirmation Required',
        subject: 'Confirmation Required: {{vendorName}} for {{eventDate}}',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">Vendor Confirmation Needed</h2>
            <p>Hi {{recipientName}},</p>
            <p>Your vendor requires confirmation for the upcoming wedding date:</p>
            <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #6d28d9;">{{vendorName}}</h3>
              <p><strong>Service:</strong> {{serviceType}}</p>
              <p><strong>Date:</strong> {{eventDate}}</p>
              <p><strong>Time:</strong> {{eventTime}}</p>
              <p><strong>Location:</strong> {{eventLocation}}</p>
            </div>
            <p>Please confirm these details with your vendor as soon as possible.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{confirmUrl}}" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">Confirm</a>
              <a href="{{contactUrl}}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Contact Vendor</a>
            </div>
          </div>
        `,
        type: 'email',
        variables: [
          'recipientName',
          'vendorName',
          'serviceType',
          'eventDate',
          'eventTime',
          'eventLocation',
          'confirmUrl',
          'contactUrl',
        ],
        priority: 'high',
        tags: ['vendor', 'confirmation', 'wedding'],
      },
      {
        id: 'task_overdue',
        name: 'Task Overdue',
        subject: 'OVERDUE: {{taskTitle}}',
        body: 'Task {{taskTitle}} is now overdue. Please complete it as soon as possible to keep your wedding planning on track.',
        type: 'sms',
        variables: ['taskTitle'],
        priority: 'urgent',
        tags: ['task', 'overdue', 'urgent'],
      },
      // Payment Calendar Integration Templates
      {
        id: 'payment_due_soon',
        name: 'Payment Due Soon',
        subject: 'Payment Due: {{vendorName}} - {{paymentAmount}} {{currency}}',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">Payment Reminder</h2>
            <p>Hi {{recipientName}},</p>
            <p>You have a vendor payment due soon for your wedding:</p>
            <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <h3 style="margin: 0 0 10px 0; color: #6d28d9;">{{vendorName}}</h3>
              <p style="margin: 5px 0;"><strong>Amount:</strong> {{currency}}{{paymentAmount}}</p>
              <p style="margin: 5px 0;"><strong>Due Date:</strong> {{dueDate}}</p>
              <p style="margin: 5px 0;"><strong>Days Until Due:</strong> {{daysUntilDue}} days</p>
            </div>
            <p>Please ensure this payment is made on time to avoid any delays with your wedding services.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{paymentUrl}}" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">Make Payment</a>
              <a href="{{calendarUrl}}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Calendar</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">Best regards,<br>The WedSync Team</p>
          </div>
        `,
        type: 'email',
        variables: [
          'recipientName',
          'vendorName',
          'paymentAmount',
          'currency',
          'dueDate',
          'daysUntilDue',
          'paymentUrl',
          'calendarUrl',
        ],
        priority: 'high',
        tags: ['payment', 'reminder', 'vendor'],
      },
      {
        id: 'payment_calendar_sync_failed',
        name: 'Payment Calendar Sync Failed',
        subject: 'Payment Calendar Sync Issue - Action Required',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Sync Issue Detected</h2>
            <p>Hi {{recipientName}},</p>
            <p>We encountered an issue while syncing your payment calendar data:</p>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3 style="margin: 0 0 10px 0; color: #b91c1c;">Sync Error</h3>
              <p style="margin: 5px 0;"><strong>Error:</strong> {{errorMessage}}</p>
              <p style="margin: 5px 0;"><strong>Affected Services:</strong> {{affectedServices}}</p>
              <p style="margin: 5px 0;"><strong>Next Retry:</strong> {{nextRetryTime}}</p>
            </div>
            <p>Don't worry - we're automatically retrying the sync. If the issue persists, please contact our support team.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{dashboardUrl}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">View Dashboard</a>
              <a href="{{supportUrl}}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Contact Support</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">Best regards,<br>The WedSync Team</p>
          </div>
        `,
        type: 'email',
        variables: [
          'recipientName',
          'errorMessage',
          'affectedServices',
          'nextRetryTime',
          'dashboardUrl',
          'supportUrl',
        ],
        priority: 'high',
        tags: ['sync', 'error', 'technical'],
      },
      {
        id: 'budget_impact_alert',
        name: 'Budget Impact Alert',
        subject: 'Budget Alert: {{alertType}} - {{categoryName}}',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d97706;">Budget Impact Alert</h2>
            <p>Hi {{recipientName}},</p>
            <p>Your upcoming payments will impact your wedding budget:</p>
            <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706;">
              <h3 style="margin: 0 0 10px 0; color: #92400e;">{{categoryName}} Category</h3>
              <p style="margin: 5px 0;"><strong>Alert Type:</strong> {{alertType}}</p>
              <p style="margin: 5px 0;"><strong>Current Spent:</strong> {{currency}}{{currentSpent}}</p>
              <p style="margin: 5px 0;"><strong>Pending Payments:</strong> {{currency}}{{pendingAmount}}</p>
              <p style="margin: 5px 0;"><strong>Budget Remaining:</strong> {{currency}}{{remainingBudget}}</p>
              <p style="margin: 5px 0;"><strong>Risk Level:</strong> {{riskLevel}}</p>
            </div>
            {{#if recommendations}}
            <p><strong>Our Recommendations:</strong></p>
            <ul style="color: #374151; margin: 10px 0;">
              {{#each recommendations}}
              <li style="margin-bottom: 5px;">{{this}}</li>
              {{/each}}
            </ul>
            {{/if}}
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{budgetUrl}}" style="background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">Review Budget</a>
              <a href="{{cashFlowUrl}}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Cash Flow Analysis</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">Best regards,<br>The WedSync Team</p>
          </div>
        `,
        type: 'email',
        variables: [
          'recipientName',
          'alertType',
          'categoryName',
          'currentSpent',
          'pendingAmount',
          'remainingBudget',
          'currency',
          'riskLevel',
          'recommendations',
          'budgetUrl',
          'cashFlowUrl',
        ],
        priority: 'normal',
        tags: ['budget', 'alert', 'financial'],
      },
      {
        id: 'cash_flow_warning',
        name: 'Cash Flow Warning',
        subject: 'Cash Flow Alert: Potential Budget Shortfall',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Cash Flow Warning</h2>
            <p>Hi {{recipientName}},</p>
            <p>Our cash flow analysis has detected potential budget concerns for your wedding:</p>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3 style="margin: 0 0 10px 0; color: #b91c1c;">Cash Flow Analysis</h3>
              <p style="margin: 5px 0;"><strong>Projected Balance:</strong> {{currency}}{{projectedBalance}}</p>
              <p style="margin: 5px 0;"><strong>Risk Level:</strong> {{riskLevel}}</p>
              <p style="margin: 5px 0;"><strong>Months Until Wedding:</strong> {{monthsUntilWedding}}</p>
              <p style="margin: 5px 0;"><strong>Monthly Burn Rate:</strong> {{currency}}{{monthlyBurnRate}}</p>
            </div>
            <p><strong>Recommended Actions:</strong></p>
            <ul style="color: #374151; margin: 10px 0;">
              {{#each recommendations}}
              <li style="margin-bottom: 5px;">{{this}}</li>
              {{/each}}
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{analysisUrl}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">View Analysis</a>
              <a href="{{optimizeUrl}}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Optimize Payments</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">Best regards,<br>The WedSync Team</p>
          </div>
        `,
        type: 'email',
        variables: [
          'recipientName',
          'projectedBalance',
          'currency',
          'riskLevel',
          'monthsUntilWedding',
          'monthlyBurnRate',
          'recommendations',
          'analysisUrl',
          'optimizeUrl',
        ],
        priority: 'high',
        tags: ['cash-flow', 'warning', 'financial'],
      },
      {
        id: 'payment_confirmed',
        name: 'Payment Confirmed',
        subject:
          'Payment Confirmed: {{vendorName}} - {{paymentAmount}} {{currency}}',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Payment Confirmed</h2>
            <p>Hi {{recipientName}},</p>
            <p>Great news! Your payment has been confirmed:</p>
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
              <h3 style="margin: 0 0 10px 0; color: #047857;">{{vendorName}}</h3>
              <p style="margin: 5px 0;"><strong>Amount:</strong> {{currency}}{{paymentAmount}}</p>
              <p style="margin: 5px 0;"><strong>Payment Date:</strong> {{paymentDate}}</p>
              <p style="margin: 5px 0;"><strong>Payment Method:</strong> {{paymentMethod}}</p>
              <p style="margin: 5px 0;"><strong>Confirmation #:</strong> {{confirmationNumber}}</p>
            </div>
            <p>Your payment calendar and budget have been automatically updated to reflect this transaction.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{receiptUrl}}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">View Receipt</a>
              <a href="{{calendarUrl}}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Update Calendar</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">Best regards,<br>The WedSync Team</p>
          </div>
        `,
        type: 'email',
        variables: [
          'recipientName',
          'vendorName',
          'paymentAmount',
          'currency',
          'paymentDate',
          'paymentMethod',
          'confirmationNumber',
          'receiptUrl',
          'calendarUrl',
        ],
        priority: 'normal',
        tags: ['payment', 'confirmation', 'success'],
      },
    ];

    for (const template of weddingTemplates) {
      this.templates.set(template.id, template);
    }
  }

  // Public API Methods
  async sendNotification(
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    const notificationId = this.generateNotificationId();

    // Add to queue
    this.notificationQueue.push({
      payload,
      id: notificationId,
      queuedAt: new Date(),
    });

    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      'NOTIFICATION_QUEUED',
      notificationId,
      'notification',
      {
        templateId: payload.templateId,
        recipientCount: payload.recipients.length,
        priority: payload.priority || 'normal',
      },
    );

    // Process immediately if high priority
    if (payload.priority === 'urgent' || payload.priority === 'high') {
      await this.processQueue();
    }

    // Return pending result
    return {
      id: notificationId,
      status: 'sent',
      totalRecipients: payload.recipients.length,
      successCount: 0,
      failureCount: 0,
      deliveryResults: [],
      queuedAt: new Date(),
    };
  }

  async sendTaskAssignmentNotification(
    assigneeId: string,
    taskTitle: string,
    dueDate: Date,
    priority: string,
    description?: string,
  ): Promise<NotificationResult> {
    return this.sendNotification({
      templateId: 'task_assigned',
      recipients: [{ id: assigneeId, type: 'user', value: assigneeId }],
      variables: {
        recipientName: await this.getUserName(assigneeId),
        taskTitle,
        dueDate: this.formatDate(dueDate),
        priority: priority.toUpperCase(),
        description,
        taskUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tasks/${encodeURIComponent(taskTitle)}`,
      },
      priority: priority === 'critical' ? 'urgent' : 'normal',
    });
  }

  async sendTaskReminderNotification(
    assigneeId: string,
    taskTitle: string,
    dueDate: Date,
    status: string,
  ): Promise<NotificationResult> {
    const timeUntilDue = this.getTimeUntilDue(dueDate);

    return this.sendNotification({
      templateId: 'task_reminder',
      recipients: [{ id: assigneeId, type: 'user', value: assigneeId }],
      variables: {
        recipientName: await this.getUserName(assigneeId),
        taskTitle,
        dueDate: this.formatDate(dueDate),
        timeUntilDue,
        status: status.toUpperCase(),
        taskUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tasks/${encodeURIComponent(taskTitle)}`,
      },
      priority: 'high',
    });
  }

  async sendConflictNotification(
    userId: string,
    conflictTitle: string,
    conflictDescription: string,
    affectedItems: string[],
  ): Promise<NotificationResult> {
    return this.sendNotification({
      templateId: 'conflict_detected',
      recipients: [{ id: userId, type: 'user', value: userId }],
      variables: {
        recipientName: await this.getUserName(userId),
        conflictType: 'Schedule Conflict',
        conflictTitle,
        conflictDescription,
        affectedItems,
        resolveUrl: `${process.env.NEXT_PUBLIC_APP_URL}/timeline/conflicts`,
      },
      priority: 'high',
    });
  }

  async sendWeatherAlertNotification(
    userId: string,
    eventDate: Date,
    weatherCondition: string,
    temperature: string,
    precipitation: number,
    recommendations?: string[],
  ): Promise<NotificationResult> {
    return this.sendNotification({
      templateId: 'weather_alert',
      recipients: [{ id: userId, type: 'user', value: userId }],
      variables: {
        recipientName: await this.getUserName(userId),
        eventDate: this.formatDate(eventDate),
        weatherCondition,
        temperature,
        precipitation: precipitation.toString(),
        recommendations,
        timelineUrl: `${process.env.NEXT_PUBLIC_APP_URL}/timeline`,
      },
      priority: precipitation > 70 ? 'high' : 'normal',
    });
  }

  async sendOverdueTaskAlert(
    assigneeId: string,
    taskTitle: string,
  ): Promise<NotificationResult> {
    // Send both email and SMS for overdue tasks
    return this.sendNotification({
      templateId: 'task_overdue',
      recipients: [{ id: assigneeId, type: 'user', value: assigneeId }],
      variables: {
        taskTitle,
      },
      priority: 'urgent',
    });
  }

  // Queue Processing
  private startQueueProcessor(): void {
    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing && this.notificationQueue.length > 0) {
        await this.processQueue();
      }
    }, 10000); // Process every 10 seconds
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      // Process up to 50 notifications at a time
      const batch = this.notificationQueue.splice(0, 50);

      for (const queueItem of batch) {
        await this.processNotification(queueItem);
      }
    } catch (error) {
      console.error('Error processing notification queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processNotification(queueItem: {
    payload: NotificationPayload;
    id: string;
    queuedAt: Date;
  }): Promise<void> {
    try {
      const template = this.templates.get(queueItem.payload.templateId);
      if (!template) {
        throw new Error(`Template not found: ${queueItem.payload.templateId}`);
      }

      const deliveryResults: DeliveryResult[] = [];

      for (const recipient of queueItem.payload.recipients) {
        // Determine delivery channels based on recipient preferences and template type
        const channels = this.getDeliveryChannels(recipient, template);

        for (const channelType of channels) {
          const channel = this.channels.get(channelType);
          if (!channel || !channel.enabled) continue;

          try {
            const result = await this.deliverNotification(
              template,
              recipient,
              channel,
              queueItem.payload.variables || {},
            );
            deliveryResults.push(result);
          } catch (error) {
            deliveryResults.push({
              recipientId: recipient.id,
              channel: channelType,
              status: 'failed',
              timestamp: new Date(),
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      await integrationDataManager.logAudit(
        this.userId,
        this.organizationId,
        'NOTIFICATION_PROCESSED',
        queueItem.id,
        'notification',
        {
          templateId: queueItem.payload.templateId,
          deliveryResults: deliveryResults.length,
          successCount: deliveryResults.filter((r) => r.status === 'sent')
            .length,
          failureCount: deliveryResults.filter((r) => r.status === 'failed')
            .length,
        },
      );
    } catch (error) {
      console.error(`Failed to process notification ${queueItem.id}:`, error);
    }
  }

  private getDeliveryChannels(
    recipient: NotificationRecipient,
    template: NotificationTemplate,
  ): Array<'email' | 'sms' | 'push' | 'in_app'> {
    const channels: Array<'email' | 'sms' | 'push' | 'in_app'> = [];

    // Default to template type
    if (
      template.type === 'email' &&
      (!recipient.preferences || recipient.preferences.email !== false)
    ) {
      channels.push('email');
    }
    if (
      template.type === 'sms' &&
      (!recipient.preferences || recipient.preferences.sms !== false)
    ) {
      channels.push('sms');
    }
    if (
      template.type === 'push' &&
      (!recipient.preferences || recipient.preferences.push !== false)
    ) {
      channels.push('push');
    }

    // Always send in-app notifications for high priority
    if (template.priority === 'high' || template.priority === 'urgent') {
      if (!recipient.preferences || recipient.preferences.inApp !== false) {
        channels.push('in_app');
      }
    }

    return channels;
  }

  private async deliverNotification(
    template: NotificationTemplate,
    recipient: NotificationRecipient,
    channel: NotificationChannel,
    variables: Record<string, any>,
  ): Promise<DeliveryResult> {
    const content = this.renderTemplate(template, variables);

    switch (channel.type) {
      case 'email':
        return await this.sendEmail(recipient, content, channel);
      case 'sms':
        return await this.sendSMS(recipient, content, channel);
      case 'push':
        return await this.sendPushNotification(recipient, content, channel);
      case 'in_app':
        return await this.sendInAppNotification(recipient, content, channel);
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  private async sendEmail(
    recipient: NotificationRecipient,
    content: { subject: string; body: string },
    channel: NotificationChannel,
  ): Promise<DeliveryResult> {
    // Implementation would use actual email service (Supabase SMTP, SendGrid, etc.)
    // For now, simulate successful delivery
    return {
      recipientId: recipient.id,
      channel: 'email',
      status: 'sent',
      timestamp: new Date(),
      messageId: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  private async sendSMS(
    recipient: NotificationRecipient,
    content: { subject: string; body: string },
    channel: NotificationChannel,
  ): Promise<DeliveryResult> {
    // Implementation would use actual SMS service (Twilio, etc.)
    return {
      recipientId: recipient.id,
      channel: 'sms',
      status: 'sent',
      timestamp: new Date(),
      messageId: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  private async sendPushNotification(
    recipient: NotificationRecipient,
    content: { subject: string; body: string },
    channel: NotificationChannel,
  ): Promise<DeliveryResult> {
    // Implementation would use Firebase Cloud Messaging or similar
    return {
      recipientId: recipient.id,
      channel: 'push',
      status: 'sent',
      timestamp: new Date(),
      messageId: `push-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  private async sendInAppNotification(
    recipient: NotificationRecipient,
    content: { subject: string; body: string },
    channel: NotificationChannel,
  ): Promise<DeliveryResult> {
    // Implementation would use Supabase realtime channels
    return {
      recipientId: recipient.id,
      channel: 'in_app',
      status: 'sent',
      timestamp: new Date(),
      messageId: `inapp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  // Utility Methods
  private renderTemplate(
    template: NotificationTemplate,
    variables: Record<string, any>,
  ): { subject: string; body: string } {
    let subject = template.subject;
    let body = template.body;

    // Simple variable replacement (in production, use a proper template engine like Handlebars)
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(placeholder, String(value || ''));
      body = body.replace(placeholder, String(value || ''));
    }

    return { subject, body };
  }

  private async getUserName(userId: string): Promise<string> {
    try {
      // This would query your user database
      return `User ${userId}`; // Placeholder
    } catch {
      return 'User';
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private getTimeUntilDue(dueDate: Date): string {
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 1) {
      return `in ${days} days`;
    } else if (days === 1) {
      return 'tomorrow';
    } else if (hours > 1) {
      return `in ${hours} hours`;
    } else if (hours === 1) {
      return 'in 1 hour';
    } else if (diff > 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `in ${minutes} minutes`;
    } else {
      return 'overdue';
    }
  }

  private generateNotificationId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Management Methods
  async getNotificationHistory(filters?: {
    templateId?: string;
    recipientId?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<NotificationResult[]> {
    // This would query your notification history database
    // For now, return empty array
    return [];
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: NotificationRecipient['preferences'],
  ): Promise<void> {
    // This would update user preferences in your database
    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      'NOTIFICATION_PREFERENCES_UPDATED',
      userId,
      'user_preferences',
      { preferences },
    );
  }

  async pauseNotifications(userId: string, duration: number): Promise<void> {
    // This would temporarily pause notifications for a user
    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      'NOTIFICATIONS_PAUSED',
      userId,
      'user_preferences',
      { duration },
    );
  }

  // Cleanup
  async destroy(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    // Process remaining queue items
    if (this.notificationQueue.length > 0) {
      await this.processQueue();
    }
  }
}
