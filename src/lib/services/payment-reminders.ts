import { addDays, isBefore, isAfter, differenceInDays, format } from 'date-fns';
import { EmailConnectorService } from './email-connector';
import { SMSConnectorService } from './sms-connector';

export interface PaymentReminder {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'sent' | 'paid' | 'overdue';
  reminderDates: Date[];
  notificationChannels: ('email' | 'sms' | 'in-app')[];
  customMessage?: string;
  contractReference?: string;
  paymentMethod?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderSchedule {
  daysBefore: number[];
  onDueDate: boolean;
  daysAfter: number[]; // For overdue reminders
}

export interface ReminderTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[]; // Available template variables
}

export interface ReminderNotification {
  id: string;
  reminderId: string;
  sentAt: Date;
  channel: 'email' | 'sms' | 'in-app';
  status: 'sent' | 'failed' | 'delivered';
  errorMessage?: string;
}

export class PaymentRemindersService {
  private reminders: PaymentReminder[] = [];
  private notifications: ReminderNotification[] = [];
  private defaultSchedule: ReminderSchedule = {
    daysBefore: [30, 14, 7, 3, 1],
    onDueDate: true,
    daysAfter: [1, 3, 7],
  };
  private templates: ReminderTemplate[] = [];
  private emailService: EmailConnectorService;
  private smsService: SMSConnectorService;

  constructor() {
    this.emailService = new EmailConnectorService();
    this.smsService = new SMSConnectorService();
    this.initializeTemplates();
  }

  private initializeTemplates() {
    this.templates = [
      {
        id: 'standard',
        name: 'Standard Payment Reminder',
        subject: 'Payment Reminder: {{vendorName}} - Due {{dueDate}}',
        body: `
Dear {{clientName}},

This is a friendly reminder that your payment of {{amount}} to {{vendorName}} is due on {{dueDate}}.

Contract Reference: {{contractReference}}
Payment Method: {{paymentMethod}}

{{customMessage}}

Please ensure timely payment to avoid any service disruptions.

Best regards,
Your Wedding Planning Team
        `.trim(),
        variables: [
          'clientName',
          'vendorName',
          'amount',
          'dueDate',
          'contractReference',
          'paymentMethod',
          'customMessage',
        ],
      },
      {
        id: 'urgent',
        name: 'Urgent Payment Reminder',
        subject: 'URGENT: Payment Due Tomorrow - {{vendorName}}',
        body: `
Dear {{clientName}},

URGENT: Your payment of {{amount}} to {{vendorName}} is due TOMORROW ({{dueDate}}).

This is a final reminder. Please make the payment immediately to ensure your wedding services are not affected.

Contract Reference: {{contractReference}}

If you have already made this payment, please disregard this message.

Urgent assistance: Reply to this message or call us immediately if you need help.

Best regards,
Your Wedding Planning Team
        `.trim(),
        variables: [
          'clientName',
          'vendorName',
          'amount',
          'dueDate',
          'contractReference',
        ],
      },
      {
        id: 'overdue',
        name: 'Overdue Payment Notice',
        subject: 'OVERDUE: Payment Past Due - {{vendorName}}',
        body: `
Dear {{clientName}},

Your payment of {{amount}} to {{vendorName}} was due on {{dueDate}} and is now {{daysOverdue}} days overdue.

Immediate action is required to avoid:
- Service cancellation
- Late fees
- Impact on your wedding arrangements

Please make this payment immediately or contact us to discuss payment arrangements.

Contract Reference: {{contractReference}}

Sincerely,
Your Wedding Planning Team
        `.trim(),
        variables: [
          'clientName',
          'vendorName',
          'amount',
          'dueDate',
          'daysOverdue',
          'contractReference',
        ],
      },
      {
        id: 'friendly',
        name: 'Friendly Payment Reminder',
        subject: 'Gentle Reminder: {{vendorName}} Payment Coming Up',
        body: `
Hi {{clientName}}!

Just a quick heads up that you have a payment coming up:

💰 Amount: {{amount}}
🏢 Vendor: {{vendorName}}
📅 Due Date: {{dueDate}}

{{customMessage}}

Let us know if you have any questions!

Cheers,
Your Wedding Planning Team
        `.trim(),
        variables: [
          'clientName',
          'vendorName',
          'amount',
          'dueDate',
          'customMessage',
        ],
      },
    ];
  }

  // Create a new payment reminder
  createReminder(
    reminder: Omit<PaymentReminder, 'id' | 'createdAt' | 'updatedAt'>,
  ): PaymentReminder {
    const newReminder: PaymentReminder = {
      ...reminder,
      id: `reminder-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.reminders.push(newReminder);
    this.scheduleReminders(newReminder);

    return newReminder;
  }

  // Schedule reminders based on due date
  private scheduleReminders(
    reminder: PaymentReminder,
    schedule?: ReminderSchedule,
  ) {
    const reminderSchedule = schedule || this.defaultSchedule;
    const reminderDates: Date[] = [];

    // Schedule before due date
    reminderSchedule.daysBefore.forEach((days) => {
      const reminderDate = addDays(reminder.dueDate, -days);
      if (isAfter(reminderDate, new Date())) {
        reminderDates.push(reminderDate);
      }
    });

    // Schedule on due date
    if (reminderSchedule.onDueDate && isAfter(reminder.dueDate, new Date())) {
      reminderDates.push(reminder.dueDate);
    }

    // Schedule after due date (overdue)
    reminderSchedule.daysAfter.forEach((days) => {
      reminderDates.push(addDays(reminder.dueDate, days));
    });

    reminder.reminderDates = reminderDates;
    reminder.updatedAt = new Date();
  }

  // Process due reminders
  async processDueReminders(): Promise<ReminderNotification[]> {
    const now = new Date();
    const dueReminders: PaymentReminder[] = [];
    const sentNotifications: ReminderNotification[] = [];

    for (const reminder of this.reminders) {
      if (reminder.status === 'paid') continue;

      // Check if reminder is overdue
      if (isBefore(reminder.dueDate, now) && reminder.status !== 'overdue') {
        reminder.status = 'overdue';
        reminder.updatedAt = new Date();
      }

      // Find due reminder dates
      for (const reminderDate of reminder.reminderDates) {
        const diff = Math.abs(differenceInDays(reminderDate, now));
        if (diff === 0) {
          // Check if we've already sent a reminder today
          const todayNotification = this.notifications.find(
            (n) =>
              n.reminderId === reminder.id &&
              differenceInDays(n.sentAt, now) === 0,
          );

          if (!todayNotification) {
            dueReminders.push(reminder);
          }
        }
      }
    }

    // Send reminders
    for (const reminder of dueReminders) {
      const notifications = await this.sendReminder(reminder);
      sentNotifications.push(...notifications);
    }

    return sentNotifications;
  }

  // Send reminder through configured channels
  private async sendReminder(
    reminder: PaymentReminder,
  ): Promise<ReminderNotification[]> {
    const notifications: ReminderNotification[] = [];
    const template = this.selectTemplate(reminder);

    for (const channel of reminder.notificationChannels) {
      const notification: ReminderNotification = {
        id: `notif-${Date.now()}-${channel}`,
        reminderId: reminder.id,
        sentAt: new Date(),
        channel,
        status: 'sent',
      };

      try {
        switch (channel) {
          case 'email':
            await this.sendEmailReminder(reminder, template);
            notification.status = 'delivered';
            break;
          case 'sms':
            await this.sendSMSReminder(reminder);
            notification.status = 'delivered';
            break;
          case 'in-app':
            // In-app notification would be handled by the app
            notification.status = 'delivered';
            break;
        }
      } catch (error) {
        notification.status = 'failed';
        notification.errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
      }

      notifications.push(notification);
      this.notifications.push(notification);
    }

    // Update reminder status
    reminder.status = 'sent';
    reminder.updatedAt = new Date();

    return notifications;
  }

  // Select appropriate template based on reminder status
  private selectTemplate(reminder: PaymentReminder): ReminderTemplate {
    const daysUntilDue = differenceInDays(reminder.dueDate, new Date());

    if (daysUntilDue < 0) {
      return this.templates.find((t) => t.id === 'overdue')!;
    } else if (daysUntilDue <= 1) {
      return this.templates.find((t) => t.id === 'urgent')!;
    } else if (daysUntilDue <= 7) {
      return this.templates.find((t) => t.id === 'standard')!;
    } else {
      return this.templates.find((t) => t.id === 'friendly')!;
    }
  }

  // Send email reminder
  private async sendEmailReminder(
    reminder: PaymentReminder,
    template: ReminderTemplate,
  ): Promise<void> {
    const variables = {
      clientName: 'Client', // Would be fetched from client data
      vendorName: reminder.vendorName,
      amount: this.formatCurrency(reminder.amount),
      dueDate: format(reminder.dueDate, 'MMMM d, yyyy'),
      contractReference: reminder.contractReference || 'N/A',
      paymentMethod: reminder.paymentMethod || 'As per contract',
      customMessage: reminder.customMessage || '',
      daysOverdue: Math.abs(
        differenceInDays(new Date(), reminder.dueDate),
      ).toString(),
    };

    const subject = this.replaceVariables(template.subject, variables);
    const body = this.replaceVariables(template.body, variables);

    await this.emailService.sendEmail({
      to: 'client@example.com', // Would be fetched from client data
      subject,
      body,
      isHtml: false,
    });
  }

  // Send SMS reminder
  private async sendSMSReminder(reminder: PaymentReminder): Promise<void> {
    const daysUntilDue = differenceInDays(reminder.dueDate, new Date());
    let message: string;

    if (daysUntilDue < 0) {
      message = `OVERDUE: Payment of ${this.formatCurrency(reminder.amount)} to ${reminder.vendorName} was due ${Math.abs(daysUntilDue)} days ago. Please pay immediately.`;
    } else if (daysUntilDue === 0) {
      message = `Payment reminder: ${this.formatCurrency(reminder.amount)} due TODAY to ${reminder.vendorName}. Don't forget!`;
    } else {
      message = `Reminder: Payment of ${this.formatCurrency(reminder.amount)} to ${reminder.vendorName} due in ${daysUntilDue} days (${format(reminder.dueDate, 'MMM d')}).`;
    }

    await this.smsService.sendSMS({
      to: '+1234567890', // Would be fetched from client data
      message,
    });
  }

  // Replace template variables
  private replaceVariables(
    text: string,
    variables: Record<string, string>,
  ): string {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    });
    return result;
  }

  // Format currency
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Update reminder status
  updateReminderStatus(
    reminderId: string,
    status: 'pending' | 'sent' | 'paid' | 'overdue',
  ): boolean {
    const reminder = this.reminders.find((r) => r.id === reminderId);
    if (reminder) {
      reminder.status = status;
      reminder.updatedAt = new Date();
      return true;
    }
    return false;
  }

  // Mark payment as completed
  markAsPaid(reminderId: string): boolean {
    return this.updateReminderStatus(reminderId, 'paid');
  }

  // Get upcoming reminders
  getUpcomingReminders(days: number = 7): PaymentReminder[] {
    const futureDate = addDays(new Date(), days);
    return this.reminders
      .filter((r) => r.status !== 'paid' && isBefore(r.dueDate, futureDate))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  // Get overdue reminders
  getOverdueReminders(): PaymentReminder[] {
    const now = new Date();
    return this.reminders.filter(
      (r) => r.status !== 'paid' && isBefore(r.dueDate, now),
    );
  }

  // Get reminder statistics
  getReminderStatistics(): {
    total: number;
    pending: number;
    sent: number;
    paid: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    overdueAmount: number;
  } {
    const stats = {
      total: this.reminders.length,
      pending: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
      totalAmount: 0,
      paidAmount: 0,
      overdueAmount: 0,
    };

    this.reminders.forEach((r) => {
      stats.totalAmount += r.amount;

      switch (r.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'sent':
          stats.sent++;
          break;
        case 'paid':
          stats.paid++;
          stats.paidAmount += r.amount;
          break;
        case 'overdue':
          stats.overdue++;
          stats.overdueAmount += r.amount;
          break;
      }
    });

    return stats;
  }

  // Update reminder schedule
  updateReminderSchedule(
    reminderId: string,
    schedule: ReminderSchedule,
  ): boolean {
    const reminder = this.reminders.find((r) => r.id === reminderId);
    if (reminder) {
      this.scheduleReminders(reminder, schedule);
      return true;
    }
    return false;
  }

  // Delete reminder
  deleteReminder(reminderId: string): boolean {
    const index = this.reminders.findIndex((r) => r.id === reminderId);
    if (index !== -1) {
      this.reminders.splice(index, 1);
      return true;
    }
    return false;
  }

  // Get all reminders
  getReminders(): PaymentReminder[] {
    return this.reminders;
  }

  // Get notification history
  getNotificationHistory(reminderId?: string): ReminderNotification[] {
    if (reminderId) {
      return this.notifications.filter((n) => n.reminderId === reminderId);
    }
    return this.notifications;
  }

  // Bulk create reminders from vendor contracts
  createRemindersFromContracts(
    contracts: Array<{
      vendorId: string;
      vendorName: string;
      paymentSchedule: Array<{
        amount: number;
        dueDate: Date;
        description?: string;
      }>;
    }>,
  ): PaymentReminder[] {
    const createdReminders: PaymentReminder[] = [];

    contracts.forEach((contract) => {
      contract.paymentSchedule.forEach((payment) => {
        const reminder = this.createReminder({
          vendorId: contract.vendorId,
          vendorName: contract.vendorName,
          amount: payment.amount,
          dueDate: payment.dueDate,
          status: 'pending',
          reminderDates: [],
          notificationChannels: ['email', 'in-app'],
          customMessage: payment.description,
        });
        createdReminders.push(reminder);
      });
    });

    return createdReminders;
  }
}
