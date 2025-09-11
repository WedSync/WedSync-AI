// WS-161: Supplier Schedule SMS Notification Service
import { EnhancedSMSService, SMSTemplate } from './enhanced-sms-service';
import {
  SupplierScheduleEvent,
  SupplierContactInfo,
  ScheduleChangeDetails,
} from '../email/supplier-schedule-service';

interface SupplierSMSTemplate extends SMSTemplate {
  type:
    | 'supplier_schedule_urgent'
    | 'supplier_schedule_reminder'
    | 'supplier_schedule_update'
    | 'supplier_schedule_cancelled'
    | 'supplier_schedule_conflict';
}

export class SupplierScheduleSMSService extends EnhancedSMSService {
  private static supplierTemplates: Map<string, SupplierSMSTemplate> =
    new Map();

  static {
    SupplierScheduleSMSService.initializeSupplierTemplates();
  }

  /**
   * Initialize supplier-specific SMS templates
   */
  private static initializeSupplierTemplates(): void {
    const templates: SupplierSMSTemplate[] = [
      {
        id: 'supplier_schedule_urgent',
        name: 'Urgent Schedule Change',
        type: 'supplier_schedule_urgent',
        template: `🚨 URGENT - {coupleNames} Wedding
        
{changeType}: {eventTitle}
OLD: {originalTime}
NEW: {newTime}

Location: {location}
Contact: {contactPhone}

RESPOND ASAP:
✅ Text YES to confirm
❌ Text NO if unable
❓ Text INFO for details

Wedding: {weddingDate}
Reason: {reason}`,
        variables: [
          'coupleNames',
          'changeType',
          'eventTitle',
          'originalTime',
          'newTime',
          'location',
          'contactPhone',
          'weddingDate',
          'reason',
        ],
        maxLength: 320,
        language: 'en',
      },
      {
        id: 'supplier_schedule_reminder',
        name: 'Schedule Reminder',
        type: 'supplier_schedule_reminder',
        template: `⏰ {reminderType} Reminder
{coupleNames} Wedding - {eventTitle}

📅 {weddingDate}
🕒 {startTime} - {endTime}
📍 {location}

{specialNote}

Contact: {contactPhone}
Emergency: {emergencyPhone}

Reply READY when prepared`,
        variables: [
          'reminderType',
          'coupleNames',
          'eventTitle',
          'weddingDate',
          'startTime',
          'endTime',
          'location',
          'specialNote',
          'contactPhone',
          'emergencyPhone',
        ],
        maxLength: 300,
        language: 'en',
      },
      {
        id: 'supplier_schedule_update',
        name: 'Schedule Update',
        type: 'supplier_schedule_update',
        template: `📝 Schedule Update
{coupleNames} Wedding - {eventTitle}

{changeType}:
FROM: {originalDetails}
TO: {newDetails}

Reason: {reason}

Contact: {contactPhone}
Reply OK to confirm receipt`,
        variables: [
          'coupleNames',
          'eventTitle',
          'changeType',
          'originalDetails',
          'newDetails',
          'reason',
          'contactPhone',
        ],
        maxLength: 280,
        language: 'en',
      },
      {
        id: 'supplier_schedule_cancelled',
        name: 'Schedule Cancelled',
        type: 'supplier_schedule_cancelled',
        template: `❌ CANCELLED
{coupleNames} Wedding - {eventTitle}

Date: {weddingDate}
Time: {scheduledTime}
Location: {location}

Reason: {cancellationReason}

{compensationNote}

Support: {supportPhone}`,
        variables: [
          'coupleNames',
          'eventTitle',
          'weddingDate',
          'scheduledTime',
          'location',
          'cancellationReason',
          'compensationNote',
          'supportPhone',
        ],
        maxLength: 280,
        language: 'en',
      },
      {
        id: 'supplier_schedule_conflict',
        name: 'Schedule Conflict Alert',
        type: 'supplier_schedule_conflict',
        template: `⚠️ CONFLICT DETECTED
{coupleNames} Wedding - {eventTitle}

Requested: {requestedTime}
Conflicts with: {conflictingEvent}

Alternative options:
{alternatives}

URGENT: Reply with preferred time
Contact: {contactPhone}`,
        variables: [
          'coupleNames',
          'eventTitle',
          'requestedTime',
          'conflictingEvent',
          'alternatives',
          'contactPhone',
        ],
        maxLength: 320,
        language: 'en',
      },
    ];

    templates.forEach((template) => {
      SupplierScheduleSMSService.supplierTemplates.set(template.id, template);
    });
  }

  /**
   * Send urgent schedule change notification via SMS
   */
  static async sendUrgentScheduleChangeNotification(
    supplier: SupplierContactInfo,
    scheduleEvent: SupplierScheduleEvent,
    changeDetails: ScheduleChangeDetails,
  ): Promise<any> {
    if (!supplier.preferences.sms_notifications) {
      throw new Error('SMS notifications disabled for supplier');
    }

    if (!supplier.phone) {
      throw new Error('No phone number available for supplier');
    }

    const template = this.supplierTemplates.get('supplier_schedule_urgent');
    if (!template) {
      throw new Error('Urgent SMS template not found');
    }

    const templateData = {
      coupleNames: scheduleEvent.couple_names,
      changeType: this.formatChangeType(changeDetails.change_type),
      eventTitle: scheduleEvent.title,
      originalTime: changeDetails.original_values?.start_time
        ? `${changeDetails.original_values.start_time.toLocaleDateString()} ${changeDetails.original_values.start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'TBD',
      newTime: `${scheduleEvent.start_time.toLocaleDateString()} ${scheduleEvent.start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      location: scheduleEvent.location || 'TBD',
      contactPhone: scheduleEvent.contact_phone,
      weddingDate: scheduleEvent.wedding_date.toLocaleDateString(),
      reason: changeDetails.reason || 'Schedule optimization',
    };

    const messageText = this.renderSupplierTemplate(template, templateData);

    const result = await this.sendMessage({
      to: supplier.phone,
      message: messageText,
      priority: 'urgent',
      messageType: 'assignment',
      userId: supplier.id,
      organizationId: 'default', // TODO: Get from context
    });

    // Log urgent notification for tracking
    await this.logUrgentNotification(
      supplier.id,
      scheduleEvent.id,
      'sms_urgent_change',
      result,
    );

    return result;
  }

  /**
   * Send schedule reminder via SMS
   */
  static async sendScheduleReminderSMS(
    supplier: SupplierContactInfo,
    scheduleEvent: SupplierScheduleEvent,
    reminderType: 'day' | 'hour' | '30min' | '15min',
  ): Promise<any> {
    if (!supplier.preferences.sms_notifications) {
      throw new Error('SMS notifications disabled for supplier');
    }

    if (!supplier.phone) {
      throw new Error('No phone number available for supplier');
    }

    const template = this.supplierTemplates.get('supplier_schedule_reminder');
    if (!template) {
      throw new Error('Reminder SMS template not found');
    }

    const reminderTypeMap = {
      day: 'Tomorrow',
      hour: '1 Hour',
      '30min': '30 Minutes',
      '15min': '15 Minutes',
    };

    const specialNotes = {
      day: 'Please prepare equipment & confirm logistics',
      hour: 'Final preparations - departure time approaching',
      '30min': 'Departing soon - check traffic & parking',
      '15min': 'Event starting soon - safe travels!',
    };

    const templateData = {
      reminderType: reminderTypeMap[reminderType],
      coupleNames: scheduleEvent.couple_names,
      eventTitle: scheduleEvent.title,
      weddingDate: scheduleEvent.wedding_date.toLocaleDateString(),
      startTime: scheduleEvent.start_time.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      endTime: scheduleEvent.end_time.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      location: scheduleEvent.location || 'TBD',
      specialNote: specialNotes[reminderType],
      contactPhone: scheduleEvent.contact_phone,
      emergencyPhone: scheduleEvent.planner_email || 'Support: (555) 999-0000',
    };

    const messageText = this.renderSupplierTemplate(template, templateData);

    const priority =
      reminderType === '15min' || reminderType === '30min'
        ? 'urgent'
        : reminderType === 'hour'
          ? 'high'
          : 'normal';

    return await this.sendMessage({
      to: supplier.phone,
      message: messageText,
      priority: priority as any,
      messageType: 'reminder',
      userId: supplier.id,
      organizationId: 'default', // TODO: Get from context
    });
  }

  /**
   * Send schedule update notification via SMS
   */
  static async sendScheduleUpdateSMS(
    supplier: SupplierContactInfo,
    scheduleEvent: SupplierScheduleEvent,
    changeDetails: ScheduleChangeDetails,
  ): Promise<any> {
    if (!supplier.preferences.sms_notifications && !changeDetails.urgent) {
      throw new Error('SMS notifications disabled for supplier');
    }

    if (!supplier.phone) {
      throw new Error('No phone number available for supplier');
    }

    // Use urgent template for urgent updates, regular template for non-urgent
    const templateId = changeDetails.urgent
      ? 'supplier_schedule_urgent'
      : 'supplier_schedule_update';
    const template = this.supplierTemplates.get(templateId);

    if (!template) {
      throw new Error(`SMS template ${templateId} not found`);
    }

    if (changeDetails.urgent) {
      // Use the urgent notification method for urgent updates
      return await this.sendUrgentScheduleChangeNotification(
        supplier,
        scheduleEvent,
        changeDetails,
      );
    }

    const templateData = {
      coupleNames: scheduleEvent.couple_names,
      eventTitle: scheduleEvent.title,
      changeType: this.formatChangeType(changeDetails.change_type),
      originalDetails: this.formatScheduleDetails(
        changeDetails.original_values,
      ),
      newDetails: this.formatScheduleDetails({
        start_time: scheduleEvent.start_time,
        end_time: scheduleEvent.end_time,
        location: scheduleEvent.location,
      }),
      reason: changeDetails.reason || 'Schedule optimization',
      contactPhone: scheduleEvent.contact_phone,
    };

    const messageText = this.renderSupplierTemplate(template, templateData);

    return await this.sendMessage({
      to: supplier.phone,
      message: messageText,
      priority: 'normal',
      messageType: 'update',
      userId: supplier.id,
      organizationId: 'default', // TODO: Get from context
    });
  }

  /**
   * Send cancellation notification via SMS
   */
  static async sendScheduleCancellationSMS(
    supplier: SupplierContactInfo,
    scheduleEvent: SupplierScheduleEvent,
    cancellationReason: string,
    compensation?: { amount: number; currency: string; method: string },
  ): Promise<any> {
    if (!supplier.preferences.sms_notifications) {
      throw new Error('SMS notifications disabled for supplier');
    }

    if (!supplier.phone) {
      throw new Error('No phone number available for supplier');
    }

    const template = this.supplierTemplates.get('supplier_schedule_cancelled');
    if (!template) {
      throw new Error('Cancellation SMS template not found');
    }

    const compensationNote = compensation
      ? `Compensation: ${compensation.currency} ${compensation.amount} via ${compensation.method}`
      : 'No cancellation fees will be charged';

    const templateData = {
      coupleNames: scheduleEvent.couple_names,
      eventTitle: scheduleEvent.title,
      weddingDate: scheduleEvent.wedding_date.toLocaleDateString(),
      scheduledTime: `${scheduleEvent.start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${scheduleEvent.end_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      location: scheduleEvent.location || 'TBD',
      cancellationReason,
      compensationNote,
      supportPhone: '(555) 123-4567', // TODO: Get from config
    };

    const messageText = this.renderSupplierTemplate(template, templateData);

    return await this.sendMessage({
      to: supplier.phone,
      message: messageText,
      priority: 'high',
      messageType: 'assignment',
      userId: supplier.id,
      organizationId: 'default', // TODO: Get from context
    });
  }

  /**
   * Send conflict alert notification via SMS
   */
  static async sendConflictAlertSMS(
    supplier: SupplierContactInfo,
    scheduleEvent: SupplierScheduleEvent,
    conflictDetails: {
      conflictingEvent: string;
      conflictTime: string;
      suggestionOptions: Array<{
        startTime: string;
        endTime: string;
        reason: string;
      }>;
    },
  ): Promise<any> {
    if (!supplier.preferences.sms_notifications) {
      throw new Error('SMS notifications disabled for supplier');
    }

    if (!supplier.phone) {
      throw new Error('No phone number available for supplier');
    }

    const template = this.supplierTemplates.get('supplier_schedule_conflict');
    if (!template) {
      throw new Error('Conflict SMS template not found');
    }

    // Format alternatives for SMS (max 2 options to fit length limits)
    const alternatives = conflictDetails.suggestionOptions
      .slice(0, 2)
      .map(
        (option, index) =>
          `${index + 1}. ${option.startTime}-${option.endTime}`,
      )
      .join('\n');

    const templateData = {
      coupleNames: scheduleEvent.couple_names,
      eventTitle: scheduleEvent.title,
      requestedTime: `${scheduleEvent.start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${scheduleEvent.end_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      conflictingEvent: conflictDetails.conflictingEvent,
      alternatives,
      contactPhone: scheduleEvent.contact_phone,
    };

    const messageText = this.renderSupplierTemplate(template, templateData);

    return await this.sendMessage({
      to: supplier.phone,
      message: messageText,
      priority: 'high',
      messageType: 'assignment',
      userId: supplier.id,
      organizationId: 'default', // TODO: Get from context
    });
  }

  /**
   * Send bulk SMS notifications to multiple suppliers
   */
  static async sendBulkSupplierSMS(
    suppliers: SupplierContactInfo[],
    scheduleEvent: SupplierScheduleEvent,
    notificationType:
      | 'urgent_update'
      | 'reminder'
      | 'update'
      | 'cancellation'
      | 'conflict',
    additionalData?: any,
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    const results = { successful: 0, failed: 0, errors: [] as string[] };

    // Filter suppliers who have SMS enabled and have phone numbers
    const smsEnabledSuppliers = suppliers.filter(
      (supplier) => supplier.preferences.sms_notifications && supplier.phone,
    );

    if (smsEnabledSuppliers.length === 0) {
      throw new Error(
        'No suppliers have SMS notifications enabled or phone numbers available',
      );
    }

    // Process in smaller batches for SMS to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < smsEnabledSuppliers.length; i += batchSize) {
      const batch = smsEnabledSuppliers.slice(i, i + batchSize);

      const batchPromises = batch.map(async (supplier) => {
        try {
          switch (notificationType) {
            case 'urgent_update':
              if (additionalData?.changeDetails) {
                await this.sendUrgentScheduleChangeNotification(
                  supplier,
                  scheduleEvent,
                  additionalData.changeDetails,
                );
              }
              break;

            case 'reminder':
              await this.sendScheduleReminderSMS(
                supplier,
                scheduleEvent,
                additionalData?.reminderType || 'day',
              );
              break;

            case 'update':
              if (additionalData?.changeDetails) {
                await this.sendScheduleUpdateSMS(
                  supplier,
                  scheduleEvent,
                  additionalData.changeDetails,
                );
              }
              break;

            case 'cancellation':
              await this.sendScheduleCancellationSMS(
                supplier,
                scheduleEvent,
                additionalData?.reason || 'Schedule change',
                additionalData?.compensation,
              );
              break;

            case 'conflict':
              if (additionalData?.conflictDetails) {
                await this.sendConflictAlertSMS(
                  supplier,
                  scheduleEvent,
                  additionalData.conflictDetails,
                );
              }
              break;
          }

          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push(
            `${supplier.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      });

      await Promise.allSettled(batchPromises);

      // Add longer delay between batches for SMS
      if (i + batchSize < smsEnabledSuppliers.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  /**
   * Handle incoming SMS responses from suppliers
   */
  static async handleSupplierSMSResponse(
    from: string,
    body: string,
    providerId: string,
  ): Promise<void> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(from);
      const messageBody = body.toLowerCase().trim();

      // Enhanced response parsing for supplier interactions
      if (
        messageBody.includes('yes') ||
        messageBody.includes('confirm') ||
        messageBody.includes('accept')
      ) {
        await this.handleSupplierConfirmation(normalizedPhone, body);
      } else if (
        messageBody.includes('no') ||
        messageBody.includes('decline') ||
        messageBody.includes('cannot')
      ) {
        await this.handleSupplierDecline(normalizedPhone, body);
      } else if (
        messageBody.includes('info') ||
        messageBody.includes('details')
      ) {
        await this.sendSupplierDetails(normalizedPhone);
      } else if (messageBody.includes('ready')) {
        await this.handleSupplierReady(normalizedPhone);
      } else if (
        messageBody.includes('conflict') ||
        messageBody.includes('busy')
      ) {
        await this.handleSupplierConflict(normalizedPhone, body);
      } else if (messageBody.includes('reschedule')) {
        await this.handleSupplierRescheduleRequest(normalizedPhone, body);
      } else if (messageBody.includes('help')) {
        await this.sendSupplierHelp(normalizedPhone);
      } else if (messageBody.match(/\d+/)) {
        // Number response - might be selecting an alternative time option
        await this.handleSupplierAlternativeSelection(normalizedPhone, body);
      } else {
        await this.sendSupplierUnrecognizedResponse(normalizedPhone);
      }
    } catch (error) {
      console.error('Error handling supplier SMS response:', error);
    }
  }

  /**
   * Render supplier template with data
   */
  private static renderSupplierTemplate(
    template: SupplierSMSTemplate,
    data: Record<string, string>,
  ): string {
    let message = template.template;

    // Replace template variables
    template.variables.forEach((variable) => {
      const placeholder = `{${variable}}`;
      if (data[variable]) {
        message = message.replace(new RegExp(placeholder, 'g'), data[variable]);
      } else {
        // Remove unfilled placeholders
        message = message.replace(new RegExp(placeholder, 'g'), '');
      }
    });

    // Clean up extra whitespace and newlines
    message = message.replace(/\n\s*\n/g, '\n').trim();

    // Ensure message doesn't exceed provider limits
    const provider = this.selectOptimalProvider({
      to: '+1234567890',
      message,
      priority: 'normal',
      messageType: 'assignment',
      userId: 'test',
      organizationId: 'default',
    });

    if (message.length > provider.maxMessageLength) {
      message = message.substring(0, provider.maxMessageLength - 3) + '...';
    }

    return message;
  }

  /**
   * Format change type for display
   */
  private static formatChangeType(changeType: string): string {
    const typeMap = {
      time_update: 'TIME CHANGE',
      location_update: 'LOCATION CHANGE',
      details_update: 'DETAILS UPDATE',
      cancellation: 'CANCELLED',
      new_booking: 'NEW BOOKING',
    };

    return (
      typeMap[changeType as keyof typeof typeMap] || changeType.toUpperCase()
    );
  }

  /**
   * Format schedule details for SMS
   */
  private static formatScheduleDetails(details: any): string {
    if (!details) return 'TBD';

    const parts = [];

    if (details.start_time) {
      const startTime = new Date(details.start_time);
      parts.push(
        `${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      );
    }

    if (details.location) {
      parts.push(`at ${details.location}`);
    }

    return parts.join(' ');
  }

  /**
   * Handle supplier confirmation response
   */
  private static async handleSupplierConfirmation(
    phoneNumber: string,
    originalMessage: string,
  ): Promise<void> {
    await this.sendMessage({
      to: phoneNumber,
      message:
        "✅ Thank you for confirming! We'll send you final details and reminders. Safe travels on the wedding day!",
      priority: 'normal',
      messageType: 'confirmation',
      userId: 'supplier',
      organizationId: 'default',
    });

    // TODO: Update database with supplier confirmation
  }

  /**
   * Handle supplier decline response
   */
  private static async handleSupplierDecline(
    phoneNumber: string,
    originalMessage: string,
  ): Promise<void> {
    await this.sendMessage({
      to: phoneNumber,
      message:
        "We understand. We'll find alternative arrangements. Thank you for letting us know promptly. Contact us if anything changes: (555) 123-4567",
      priority: 'normal',
      messageType: 'confirmation',
      userId: 'supplier',
      organizationId: 'default',
    });

    // TODO: Update database with supplier decline and trigger alternative arrangements
  }

  /**
   * Handle supplier ready confirmation
   */
  private static async handleSupplierReady(phoneNumber: string): Promise<void> {
    await this.sendMessage({
      to: phoneNumber,
      message:
        "✅ Excellent! You're all set. See you at the venue. Emergency contact: (555) 999-0000. Thank you for your professionalism!",
      priority: 'normal',
      messageType: 'confirmation',
      userId: 'supplier',
      organizationId: 'default',
    });
  }

  /**
   * Handle supplier conflict notification
   */
  private static async handleSupplierConflict(
    phoneNumber: string,
    originalMessage: string,
  ): Promise<void> {
    await this.sendMessage({
      to: phoneNumber,
      message:
        "⚠️ We'll help resolve this conflict. Please call us immediately at (555) 123-4567 so we can discuss alternatives. This is urgent.",
      priority: 'urgent',
      messageType: 'assignment',
      userId: 'supplier',
      organizationId: 'default',
    });

    // TODO: Alert wedding planner about supplier conflict
  }

  /**
   * Handle supplier reschedule request
   */
  private static async handleSupplierRescheduleRequest(
    phoneNumber: string,
    originalMessage: string,
  ): Promise<void> {
    await this.sendMessage({
      to: phoneNumber,
      message:
        "📞 Please call us at (555) 123-4567 to discuss rescheduling options. We'll work together to find a solution that works for everyone.",
      priority: 'high',
      messageType: 'assignment',
      userId: 'supplier',
      organizationId: 'default',
    });
  }

  /**
   * Handle supplier alternative selection
   */
  private static async handleSupplierAlternativeSelection(
    phoneNumber: string,
    originalMessage: string,
  ): Promise<void> {
    const optionNumber = originalMessage.match(/\d+/)?.[0];

    await this.sendMessage({
      to: phoneNumber,
      message: `✅ You selected option ${optionNumber}. We're processing your preference and will confirm the new schedule shortly. Thank you!`,
      priority: 'normal',
      messageType: 'confirmation',
      userId: 'supplier',
      organizationId: 'default',
    });

    // TODO: Process selected alternative and update schedule
  }

  /**
   * Send supplier help information
   */
  private static async sendSupplierHelp(phoneNumber: string): Promise<void> {
    await this.sendMessage({
      to: phoneNumber,
      message: `📱 Supplier SMS Commands:

✅ YES - Confirm availability
❌ NO - Decline/Cannot attend  
❓ INFO - Get event details
🚀 READY - Confirm preparation
⚠️ CONFLICT - Report scheduling issue

Call (555) 123-4567 for urgent matters`,
      priority: 'normal',
      messageType: 'update',
      userId: 'supplier',
      organizationId: 'default',
    });
  }

  /**
   * Send supplier details
   */
  private static async sendSupplierDetails(phoneNumber: string): Promise<void> {
    await this.sendMessage({
      to: phoneNumber,
      message: `📋 Event Details will be sent via email. For immediate info, call (555) 123-4567. 

Emergency contact on wedding day: (555) 999-0000

Check your email for complete schedule, location, and contact information.`,
      priority: 'normal',
      messageType: 'update',
      userId: 'supplier',
      organizationId: 'default',
    });
  }

  /**
   * Send unrecognized response message
   */
  private static async sendSupplierUnrecognizedResponse(
    phoneNumber: string,
  ): Promise<void> {
    await this.sendMessage({
      to: phoneNumber,
      message: `I didn't understand that response. 

Quick replies:
✅ YES ❌ NO ❓ INFO 🆘 HELP

Or call (555) 123-4567 to speak with our team directly.`,
      priority: 'normal',
      messageType: 'update',
      userId: 'supplier',
      organizationId: 'default',
    });
  }

  /**
   * Log urgent notification for tracking
   */
  private static async logUrgentNotification(
    supplierId: string,
    eventId: string,
    notificationType: string,
    result: any,
  ): Promise<void> {
    try {
      // TODO: Log to database
      console.log('Urgent supplier notification sent:', {
        supplierId,
        eventId,
        notificationType,
        success: result.success,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log urgent notification:', error);
    }
  }

  /**
   * Get supplier SMS preferences and validate phone number
   */
  static async validateSupplierForSMS(supplierId: string): Promise<{
    canSendSMS: boolean;
    phone?: string;
    preferences?: any;
    reason?: string;
  }> {
    try {
      // TODO: Get from database
      const supplier = {
        id: supplierId,
        phone: '+1234567890', // Mock data
        preferences: {
          sms_notifications: true,
          preferred_contact_method: 'sms',
        },
      };

      if (!supplier.phone) {
        return { canSendSMS: false, reason: 'No phone number on file' };
      }

      if (!supplier.preferences.sms_notifications) {
        return {
          canSendSMS: false,
          reason: 'SMS notifications disabled by supplier',
        };
      }

      return {
        canSendSMS: true,
        phone: supplier.phone,
        preferences: supplier.preferences,
      };
    } catch (error) {
      return {
        canSendSMS: false,
        reason: 'Failed to validate supplier SMS settings',
      };
    }
  }
}
