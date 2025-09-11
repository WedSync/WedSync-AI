// WS-161: Supplier Schedule Email Notification Service
import { EmailService } from './service';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import {
  SupplierScheduleUpdateEmail,
  SupplierScheduleCancellationEmail,
  SupplierScheduleReminderEmail,
  SupplierScheduleInviteEmail,
  SupplierConflictAlertEmail,
} from './templates/supplier-schedule-templates';

type EmailNotificationInsert =
  Database['public']['Tables']['email_notifications']['Insert'];

export interface SupplierScheduleEvent {
  id: string;
  title: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  location?: string;
  venue_name?: string;
  venue_address?: string;
  setup_time?: Date;
  breakdown_time?: Date;
  supplier_role: string;
  special_instructions?: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  wedding_date: Date;
  couple_names: string;
  planner_name?: string;
  planner_email?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'confirmed' | 'updated' | 'cancelled';
  created_at?: Date;
  updated_at?: Date;
}

export interface SupplierContactInfo {
  id: string;
  email: string;
  name: string;
  company_name: string;
  phone?: string;
  role: string;
  preferences: {
    email_notifications: boolean;
    sms_notifications: boolean;
    whatsapp_notifications: boolean;
    reminder_hours: number[];
    preferred_contact_method: 'email' | 'sms' | 'whatsapp' | 'phone';
  };
}

export interface ScheduleChangeDetails {
  change_type:
    | 'time_update'
    | 'location_update'
    | 'details_update'
    | 'cancellation'
    | 'new_booking';
  original_values?: Partial<SupplierScheduleEvent>;
  new_values?: Partial<SupplierScheduleEvent>;
  reason?: string;
  requested_by: string;
  urgent: boolean;
}

export class SupplierScheduleEmailService extends EmailService {
  private static supabase = createClient();

  /**
   * Send schedule update notification to supplier
   */
  static async sendScheduleUpdateNotification(
    supplier: SupplierContactInfo,
    scheduleEvent: SupplierScheduleEvent,
    changeDetails: ScheduleChangeDetails,
    organizationId: string,
  ) {
    const template = SupplierScheduleUpdateEmail({
      supplierName: supplier.name,
      companyName: supplier.company_name,
      coupleNames: scheduleEvent.couple_names,
      weddingDate: scheduleEvent.wedding_date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      eventTitle: scheduleEvent.title,
      changeType: changeDetails.change_type,
      originalStartTime:
        changeDetails.original_values?.start_time?.toLocaleString() || '',
      newStartTime: scheduleEvent.start_time.toLocaleString(),
      originalEndTime:
        changeDetails.original_values?.end_time?.toLocaleString() || '',
      newEndTime: scheduleEvent.end_time.toLocaleString(),
      originalLocation: changeDetails.original_values?.location || '',
      newLocation: scheduleEvent.location || 'TBD',
      reason: changeDetails.reason || 'Schedule optimization',
      urgentFlag: changeDetails.urgent,
      contactPerson: scheduleEvent.contact_person,
      contactPhone: scheduleEvent.contact_phone,
      specialInstructions: scheduleEvent.special_instructions || '',
      setupTime: scheduleEvent.setup_time?.toLocaleString() || '',
      breakdownTime: scheduleEvent.breakdown_time?.toLocaleString() || '',
      venueAddress: scheduleEvent.venue_address || '',
      confirmationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/supplier/schedule/${scheduleEvent.id}/confirm`,
      feedbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/supplier/schedule/${scheduleEvent.id}/feedback`,
    });

    const subject = changeDetails.urgent
      ? `🚨 URGENT: Schedule Change - ${scheduleEvent.couple_names} Wedding`
      : `📅 Schedule Update - ${scheduleEvent.couple_names} Wedding - ${scheduleEvent.wedding_date.toLocaleDateString()}`;

    const priority = changeDetails.urgent
      ? 'urgent'
      : changeDetails.change_type === 'cancellation'
        ? 'high'
        : scheduleEvent.priority === 'critical'
          ? 'high'
          : 'normal';

    await this.sendEmail({
      to: supplier.email,
      subject,
      template,
      organizationId,
      recipientId: supplier.id,
      recipientType: 'vendor',
      templateType: 'supplier_schedule_update',
      priority: priority as any,
      variables: {
        supplierName: supplier.name,
        eventTitle: scheduleEvent.title,
        coupleNames: scheduleEvent.couple_names,
        changeType: changeDetails.change_type,
        urgent: changeDetails.urgent,
      },
    });

    // Log schedule change for audit trail
    await this.logScheduleChange(
      scheduleEvent.id,
      supplier.id,
      changeDetails,
      organizationId,
    );
  }

  /**
   * Send schedule cancellation notification
   */
  static async sendScheduleCancellationNotification(
    supplier: SupplierContactInfo,
    scheduleEvent: SupplierScheduleEvent,
    cancellationReason: string,
    organizationId: string,
    compensation?: { amount: number; currency: string; method: string },
  ) {
    const template = SupplierScheduleCancellationEmail({
      supplierName: supplier.name,
      companyName: supplier.company_name,
      coupleNames: scheduleEvent.couple_names,
      weddingDate: scheduleEvent.wedding_date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      eventTitle: scheduleEvent.title,
      originalStartTime: scheduleEvent.start_time.toLocaleString(),
      originalEndTime: scheduleEvent.end_time.toLocaleString(),
      location: scheduleEvent.location || 'TBD',
      cancellationReason,
      contactPerson: scheduleEvent.contact_person,
      contactPhone: scheduleEvent.contact_phone,
      compensationAmount: compensation
        ? `${compensation.currency} ${compensation.amount}`
        : '',
      compensationMethod: compensation?.method || '',
      supportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/supplier/support`,
      rebookingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/supplier/schedule/rebook`,
    });

    await this.sendEmail({
      to: supplier.email,
      subject: `❌ Booking Cancelled - ${scheduleEvent.couple_names} Wedding - ${scheduleEvent.wedding_date.toLocaleDateString()}`,
      template,
      organizationId,
      recipientId: supplier.id,
      recipientType: 'vendor',
      templateType: 'supplier_schedule_cancellation',
      priority: 'high',
      variables: {
        supplierName: supplier.name,
        eventTitle: scheduleEvent.title,
        coupleNames: scheduleEvent.couple_names,
        cancellationReason,
      },
    });

    // Update event status
    await this.updateEventStatus(scheduleEvent.id, 'cancelled', organizationId);
  }

  /**
   * Send schedule reminder notification
   */
  static async sendScheduleReminderNotification(
    supplier: SupplierContactInfo,
    scheduleEvent: SupplierScheduleEvent,
    reminderType: 'week' | 'day' | 'hour' | 'custom',
    organizationId: string,
    customHours?: number,
  ) {
    const hoursUntil = Math.floor(
      (scheduleEvent.start_time.getTime() - new Date().getTime()) /
        (1000 * 60 * 60),
    );

    const template = SupplierScheduleReminderEmail({
      supplierName: supplier.name,
      companyName: supplier.company_name,
      coupleNames: scheduleEvent.couple_names,
      weddingDate: scheduleEvent.wedding_date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      eventTitle: scheduleEvent.title,
      startTime: scheduleEvent.start_time.toLocaleString(),
      endTime: scheduleEvent.end_time.toLocaleString(),
      location: scheduleEvent.location || 'TBD',
      venueAddress: scheduleEvent.venue_address || '',
      setupTime: scheduleEvent.setup_time?.toLocaleString() || '',
      breakdownTime: scheduleEvent.breakdown_time?.toLocaleString() || '',
      reminderType,
      hoursUntil,
      specialInstructions: scheduleEvent.special_instructions || '',
      contactPerson: scheduleEvent.contact_person,
      contactPhone: scheduleEvent.contact_phone,
      emergencyContact:
        scheduleEvent.planner_email || scheduleEvent.contact_email,
      checklistItems: this.generatePreparationChecklist(
        scheduleEvent,
        supplier.role,
      ),
      weatherUrl: scheduleEvent.venue_address
        ? `https://weather.com/weather/today/l/${encodeURIComponent(scheduleEvent.venue_address)}`
        : '',
      directionsUrl: scheduleEvent.venue_address
        ? `https://maps.google.com/maps?daddr=${encodeURIComponent(scheduleEvent.venue_address)}`
        : '',
      confirmationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/supplier/schedule/${scheduleEvent.id}/confirm-arrival`,
    });

    const reminderSubjects = {
      week: `📅 One Week Reminder`,
      day: `⏰ Tomorrow's Event`,
      hour: `🚨 Starting Soon`,
      custom: `⏰ ${customHours} Hour Reminder`,
    };

    const subject = `${reminderSubjects[reminderType]} - ${scheduleEvent.couple_names} Wedding - ${scheduleEvent.title}`;

    const priority =
      reminderType === 'hour'
        ? 'urgent'
        : reminderType === 'day'
          ? 'high'
          : 'normal';

    await this.sendEmail({
      to: supplier.email,
      subject,
      template,
      organizationId,
      recipientId: supplier.id,
      recipientType: 'vendor',
      templateType: 'supplier_schedule_reminder',
      priority: priority as any,
      variables: {
        supplierName: supplier.name,
        eventTitle: scheduleEvent.title,
        coupleNames: scheduleEvent.couple_names,
        reminderType,
        hoursUntil,
      },
    });
  }

  /**
   * Send calendar invite for supplier schedule
   */
  static async sendScheduleInviteNotification(
    supplier: SupplierContactInfo,
    scheduleEvent: SupplierScheduleEvent,
    organizationId: string,
    calendarInviteData: {
      icsContent: string;
      googleCalendarUrl: string;
      outlookCalendarUrl: string;
      appleCalendarUrl: string;
    },
  ) {
    const template = SupplierScheduleInviteEmail({
      supplierName: supplier.name,
      companyName: supplier.company_name,
      coupleNames: scheduleEvent.couple_names,
      weddingDate: scheduleEvent.wedding_date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      eventTitle: scheduleEvent.title,
      startTime: scheduleEvent.start_time.toLocaleString(),
      endTime: scheduleEvent.end_time.toLocaleString(),
      location: scheduleEvent.location || 'TBD',
      venueAddress: scheduleEvent.venue_address || '',
      description: scheduleEvent.description || '',
      setupTime: scheduleEvent.setup_time?.toLocaleString() || '',
      breakdownTime: scheduleEvent.breakdown_time?.toLocaleString() || '',
      specialInstructions: scheduleEvent.special_instructions || '',
      contactPerson: scheduleEvent.contact_person,
      contactPhone: scheduleEvent.contact_phone,
      googleCalendarUrl: calendarInviteData.googleCalendarUrl,
      outlookCalendarUrl: calendarInviteData.outlookCalendarUrl,
      appleCalendarUrl: calendarInviteData.appleCalendarUrl,
      downloadIcsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/supplier/schedule/${scheduleEvent.id}/calendar.ics`,
      responseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/supplier/schedule/${scheduleEvent.id}/response`,
    });

    await this.sendEmail({
      to: supplier.email,
      subject: `📅 Calendar Invite - ${scheduleEvent.couple_names} Wedding - ${scheduleEvent.title}`,
      template,
      organizationId,
      recipientId: supplier.id,
      recipientType: 'vendor',
      templateType: 'supplier_schedule_invite',
      priority: 'normal',
      variables: {
        supplierName: supplier.name,
        eventTitle: scheduleEvent.title,
        coupleNames: scheduleEvent.couple_names,
        weddingDate: scheduleEvent.wedding_date.toLocaleDateString(),
      },
    });

    // TODO: Attach ICS file to email
    // This would require extending the base email service to support attachments
  }

  /**
   * Send conflict alert notification
   */
  static async sendConflictAlertNotification(
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
    organizationId: string,
  ) {
    const template = SupplierConflictAlertEmail({
      supplierName: supplier.name,
      companyName: supplier.company_name,
      coupleNames: scheduleEvent.couple_names,
      weddingDate: scheduleEvent.wedding_date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      eventTitle: scheduleEvent.title,
      requestedStartTime: scheduleEvent.start_time.toLocaleString(),
      requestedEndTime: scheduleEvent.end_time.toLocaleString(),
      conflictingEvent: conflictDetails.conflictingEvent,
      conflictTime: conflictDetails.conflictTime,
      alternativeOptions: conflictDetails.suggestionOptions,
      contactPerson: scheduleEvent.contact_person,
      contactPhone: scheduleEvent.contact_phone,
      responseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/supplier/schedule/${scheduleEvent.id}/conflict-response`,
      calendarUrl: `${process.env.NEXT_PUBLIC_APP_URL}/supplier/calendar/${supplier.id}`,
    });

    await this.sendEmail({
      to: supplier.email,
      subject: `⚠️ Schedule Conflict Detected - ${scheduleEvent.couple_names} Wedding`,
      template,
      organizationId,
      recipientId: supplier.id,
      recipientType: 'vendor',
      templateType: 'supplier_schedule_conflict',
      priority: 'high',
      variables: {
        supplierName: supplier.name,
        eventTitle: scheduleEvent.title,
        coupleNames: scheduleEvent.couple_names,
        conflictingEvent: conflictDetails.conflictingEvent,
      },
    });
  }

  /**
   * Send bulk schedule notifications to multiple suppliers
   */
  static async sendBulkScheduleNotifications(
    suppliers: SupplierContactInfo[],
    scheduleEvent: SupplierScheduleEvent,
    notificationType: 'update' | 'reminder' | 'invite' | 'cancellation',
    organizationId: string,
    additionalData?: any,
  ) {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < suppliers.length; i += batchSize) {
      const batch = suppliers.slice(i, i + batchSize);

      const batchPromises = batch.map(async (supplier) => {
        try {
          switch (notificationType) {
            case 'update':
              if (additionalData?.changeDetails) {
                await this.sendScheduleUpdateNotification(
                  supplier,
                  scheduleEvent,
                  additionalData.changeDetails,
                  organizationId,
                );
              }
              break;

            case 'reminder':
              await this.sendScheduleReminderNotification(
                supplier,
                scheduleEvent,
                additionalData?.reminderType || 'day',
                organizationId,
                additionalData?.customHours,
              );
              break;

            case 'invite':
              if (additionalData?.calendarInviteData) {
                await this.sendScheduleInviteNotification(
                  supplier,
                  scheduleEvent,
                  organizationId,
                  additionalData.calendarInviteData,
                );
              }
              break;

            case 'cancellation':
              await this.sendScheduleCancellationNotification(
                supplier,
                scheduleEvent,
                additionalData?.reason || 'Schedule change',
                organizationId,
                additionalData?.compensation,
              );
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

      // Add delay between batches to respect rate limits
      if (i + batchSize < suppliers.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Log bulk operation
    await this.logBulkOperation(
      scheduleEvent.id,
      notificationType,
      results,
      organizationId,
    );

    return results;
  }

  /**
   * Generate preparation checklist based on supplier role
   */
  private static generatePreparationChecklist(
    event: SupplierScheduleEvent,
    supplierRole: string,
  ): string[] {
    const baseChecklist = [
      'Confirm arrival time and location',
      'Check traffic and parking information',
      'Prepare contact information for emergency',
      'Review weather forecast for outdoor elements',
    ];

    const roleSpecificItems = {
      photographer: [
        'Charge camera batteries',
        'Format memory cards',
        'Pack backup equipment',
        'Review shot list with couple',
        'Scout location if unfamiliar',
      ],
      caterer: [
        'Confirm final guest count',
        'Prepare ingredients and supplies',
        'Coordinate with venue kitchen',
        'Review dietary restrictions',
        'Pack serving equipment',
      ],
      florist: [
        'Prepare floral arrangements',
        'Pack installation tools',
        'Coordinate delivery timing',
        'Prepare backup flowers',
        'Review venue decoration plan',
      ],
      musician: [
        'Test all equipment',
        'Prepare backup instruments',
        'Review playlist with couple',
        'Check venue acoustics',
        'Coordinate with sound technician',
      ],
      venue: [
        'Set up ceremony space',
        'Prepare reception area',
        'Test lighting and sound systems',
        'Coordinate with all vendors',
        'Review emergency procedures',
      ],
      default: [
        'Review service requirements',
        'Prepare necessary equipment',
        'Coordinate with other suppliers',
        'Review contract terms',
        'Prepare for contingencies',
      ],
    };

    const roleItems =
      roleSpecificItems[
        supplierRole.toLowerCase() as keyof typeof roleSpecificItems
      ] || roleSpecificItems.default;

    return [...baseChecklist, ...roleItems];
  }

  /**
   * Log schedule change for audit trail
   */
  private static async logScheduleChange(
    eventId: string,
    supplierId: string,
    changeDetails: ScheduleChangeDetails,
    organizationId: string,
  ) {
    try {
      const supabase = await createClient();

      await supabase.from('supplier_schedule_audit_log').insert({
        event_id: eventId,
        supplier_id: supplierId,
        organization_id: organizationId,
        change_type: changeDetails.change_type,
        change_details: changeDetails,
        requested_by: changeDetails.requested_by,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log schedule change:', error);
    }
  }

  /**
   * Update event status in database
   */
  private static async updateEventStatus(
    eventId: string,
    status: string,
    organizationId: string,
  ) {
    try {
      const supabase = await createClient();

      await supabase
        .from('supplier_schedule_events')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId)
        .eq('organization_id', organizationId);
    } catch (error) {
      console.error('Failed to update event status:', error);
    }
  }

  /**
   * Log bulk operation results
   */
  private static async logBulkOperation(
    eventId: string,
    operationType: string,
    results: { successful: number; failed: number; errors: string[] },
    organizationId: string,
  ) {
    try {
      const supabase = await createClient();

      await supabase.from('supplier_bulk_operations_log').insert({
        event_id: eventId,
        organization_id: organizationId,
        operation_type: operationType,
        successful_count: results.successful,
        failed_count: results.failed,
        errors: results.errors,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log bulk operation:', error);
    }
  }

  /**
   * Get supplier notification preferences
   */
  static async getSupplierNotificationPreferences(
    supplierId: string,
  ): Promise<SupplierContactInfo | null> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('suppliers')
        .select(
          `
          id,
          email,
          name,
          company_name,
          phone,
          role,
          notification_preferences
        `,
        )
        .eq('id', supplierId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        company_name: data.company_name,
        phone: data.phone,
        role: data.role,
        preferences: data.notification_preferences || {
          email_notifications: true,
          sms_notifications: false,
          whatsapp_notifications: false,
          reminder_hours: [24, 2],
          preferred_contact_method: 'email',
        },
      };
    } catch (error) {
      console.error('Failed to get supplier preferences:', error);
      return null;
    }
  }

  /**
   * Schedule automatic reminders for an event
   */
  static async scheduleAutomaticReminders(
    supplierId: string,
    eventId: string,
    organizationId: string,
  ) {
    try {
      const supplier =
        await this.getSupplierNotificationPreferences(supplierId);
      if (!supplier) return;

      const reminderHours = supplier.preferences.reminder_hours || [24, 2];

      // Schedule reminders based on supplier preferences
      for (const hours of reminderHours) {
        const reminderTime = new Date();
        reminderTime.setHours(reminderTime.getHours() + hours);

        // Use a job queue or cron job to schedule these
        // For now, we'll log the intent
        console.log(
          `Scheduled ${hours}h reminder for supplier ${supplierId} event ${eventId} at ${reminderTime}`,
        );
      }
    } catch (error) {
      console.error('Failed to schedule automatic reminders:', error);
    }
  }
}
