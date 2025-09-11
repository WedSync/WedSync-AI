// WS-161: Supplier Calendar Invite Generation Service
import { SupplierScheduleEvent } from '../email/supplier-schedule-service';
import { createClient } from '@/lib/supabase/server';

export interface CalendarInviteData {
  icsContent: string;
  googleCalendarUrl: string;
  outlookCalendarUrl: string;
  appleCalendarUrl: string;
  yahooCalendarUrl: string;
  downloadUrl: string;
}

export interface CalendarEventDetails {
  title: string;
  description: string;
  startDateTime: Date;
  endDateTime: Date;
  location?: string;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name: string;
    email: string;
    role?: string;
  }>;
  reminders?: number[]; // Minutes before event
  categories?: string[];
  url?: string;
  timezone?: string;
}

export class SupplierCalendarInviteService {
  private static readonly TIMEZONE = 'America/New_York'; // TODO: Make configurable

  /**
   * Generate complete calendar invite data for a supplier schedule event
   */
  static async generateSupplierCalendarInvite(
    scheduleEvent: SupplierScheduleEvent,
    organizationId: string,
    supplierId?: string,
  ): Promise<CalendarInviteData> {
    const eventDetails = this.convertToCalendarEventDetails(scheduleEvent);

    // Generate ICS content
    const icsContent = this.generateICSContent(eventDetails);

    // Generate provider-specific URLs
    const googleUrl = this.generateGoogleCalendarUrl(eventDetails);
    const outlookUrl = this.generateOutlookCalendarUrl(eventDetails);
    const appleUrl = this.generateAppleCalendarUrl(eventDetails);
    const yahooUrl = this.generateYahooCalendarUrl(eventDetails);

    // Generate download URL
    const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/suppliers/schedule/${scheduleEvent.id}/calendar.ics`;

    // Store invite data for tracking
    await this.storeCalendarInviteData(
      scheduleEvent.id,
      organizationId,
      supplierId,
      {
        icsContent,
        googleCalendarUrl: googleUrl,
        outlookCalendarUrl: outlookUrl,
        appleCalendarUrl: appleUrl,
        yahooCalendarUrl: yahooUrl,
        downloadUrl,
      },
    );

    return {
      icsContent,
      googleCalendarUrl: googleUrl,
      outlookCalendarUrl: outlookUrl,
      appleCalendarUrl: appleUrl,
      yahooCalendarUrl: yahooUrl,
      downloadUrl,
    };
  }

  /**
   * Convert SupplierScheduleEvent to CalendarEventDetails
   */
  private static convertToCalendarEventDetails(
    scheduleEvent: SupplierScheduleEvent,
  ): CalendarEventDetails {
    const description = this.buildEventDescription(scheduleEvent);

    return {
      title: `${scheduleEvent.couple_names} Wedding - ${scheduleEvent.title}`,
      description,
      startDateTime: scheduleEvent.start_time,
      endDateTime: scheduleEvent.end_time,
      location: scheduleEvent.venue_address || scheduleEvent.location,
      organizer: {
        name: scheduleEvent.planner_name || scheduleEvent.contact_person,
        email: scheduleEvent.planner_email || scheduleEvent.contact_email,
      },
      attendees: [
        {
          name: scheduleEvent.contact_person,
          email: scheduleEvent.contact_email,
          role: 'Wedding Coordinator',
        },
      ],
      reminders: [60, 24 * 60], // 1 hour and 1 day before
      categories: ['Wedding', 'Work', scheduleEvent.supplier_role],
      url: `${process.env.NEXT_PUBLIC_APP_URL}/supplier/schedule/${scheduleEvent.id}`,
      timezone: this.TIMEZONE,
    };
  }

  /**
   * Build detailed event description
   */
  private static buildEventDescription(
    scheduleEvent: SupplierScheduleEvent,
  ): string {
    const lines = [
      `Wedding: ${scheduleEvent.couple_names}`,
      `Date: ${scheduleEvent.wedding_date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      `Role: ${scheduleEvent.supplier_role}`,
      '',
      `Event Details:`,
      `• Start Time: ${scheduleEvent.start_time.toLocaleString()}`,
      `• End Time: ${scheduleEvent.end_time.toLocaleString()}`,
    ];

    if (scheduleEvent.setup_time) {
      lines.push(`• Setup Time: ${scheduleEvent.setup_time.toLocaleString()}`);
    }

    if (scheduleEvent.breakdown_time) {
      lines.push(
        `• Breakdown Time: ${scheduleEvent.breakdown_time.toLocaleString()}`,
      );
    }

    lines.push('');

    if (scheduleEvent.location) {
      lines.push(`Location: ${scheduleEvent.location}`);
    }

    if (scheduleEvent.venue_address) {
      lines.push(`Address: ${scheduleEvent.venue_address}`);
    }

    if (scheduleEvent.special_instructions) {
      lines.push('');
      lines.push('Special Instructions:');
      lines.push(scheduleEvent.special_instructions);
    }

    lines.push('');
    lines.push(`Contact Information:`);
    lines.push(
      `• ${scheduleEvent.contact_person}: ${scheduleEvent.contact_phone}`,
    );
    lines.push(`• Email: ${scheduleEvent.contact_email}`);

    if (scheduleEvent.description) {
      lines.push('');
      lines.push('Additional Details:');
      lines.push(scheduleEvent.description);
    }

    lines.push('');
    lines.push(`Event ID: ${scheduleEvent.id}`);
    lines.push(`Status: ${scheduleEvent.status.toUpperCase()}`);
    lines.push(`Priority: ${scheduleEvent.priority.toUpperCase()}`);

    return lines.join('\n');
  }

  /**
   * Generate ICS (iCalendar) file content
   */
  private static generateICSContent(
    eventDetails: CalendarEventDetails,
  ): string {
    const formatDateTime = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeText = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
    };

    const now = new Date();
    const uid = `${formatDateTime(eventDetails.startDateTime)}-${Math.random().toString(36).substring(7)}@wedsync.com`;

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WedSync//Wedding Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatDateTime(now)}`,
      `DTSTART:${formatDateTime(eventDetails.startDateTime)}`,
      `DTEND:${formatDateTime(eventDetails.endDateTime)}`,
      `SUMMARY:${escapeText(eventDetails.title)}`,
      `DESCRIPTION:${escapeText(eventDetails.description)}`,
    ];

    if (eventDetails.location) {
      icsContent.push(`LOCATION:${escapeText(eventDetails.location)}`);
    }

    if (eventDetails.organizer) {
      icsContent.push(
        `ORGANIZER;CN=${escapeText(eventDetails.organizer.name)}:MAILTO:${eventDetails.organizer.email}`,
      );
    }

    if (eventDetails.attendees && eventDetails.attendees.length > 0) {
      eventDetails.attendees.forEach((attendee) => {
        const role = attendee.role || 'Attendee';
        icsContent.push(
          `ATTENDEE;CN=${escapeText(attendee.name)};ROLE=REQ-PARTICIPANT;RSVP=TRUE:MAILTO:${attendee.email}`,
        );
      });
    }

    if (eventDetails.categories && eventDetails.categories.length > 0) {
      icsContent.push(
        `CATEGORIES:${eventDetails.categories.map(escapeText).join(',')}`,
      );
    }

    if (eventDetails.url) {
      icsContent.push(`URL:${eventDetails.url}`);
    }

    // Add reminders
    if (eventDetails.reminders && eventDetails.reminders.length > 0) {
      eventDetails.reminders.forEach((minutes) => {
        icsContent.push('BEGIN:VALARM');
        icsContent.push('ACTION:DISPLAY');
        icsContent.push(
          `DESCRIPTION:Reminder: ${escapeText(eventDetails.title)}`,
        );
        icsContent.push(`TRIGGER:-PT${minutes}M`);
        icsContent.push('END:VALARM');
      });
    }

    icsContent.push('STATUS:CONFIRMED');
    icsContent.push('TRANSP:OPAQUE');
    icsContent.push('END:VEVENT');
    icsContent.push('END:VCALENDAR');

    return icsContent.join('\r\n');
  }

  /**
   * Generate Google Calendar URL
   */
  private static generateGoogleCalendarUrl(
    eventDetails: CalendarEventDetails,
  ): string {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: eventDetails.title,
      dates: `${this.formatGoogleDateTime(eventDetails.startDateTime)}/${this.formatGoogleDateTime(eventDetails.endDateTime)}`,
      details: eventDetails.description,
      location: eventDetails.location || '',
      trp: 'false',
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  /**
   * Generate Outlook Calendar URL
   */
  private static generateOutlookCalendarUrl(
    eventDetails: CalendarEventDetails,
  ): string {
    const params = new URLSearchParams({
      subject: eventDetails.title,
      startdt: eventDetails.startDateTime.toISOString(),
      enddt: eventDetails.endDateTime.toISOString(),
      body: eventDetails.description,
      location: eventDetails.location || '',
      allday: 'false',
    });

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  }

  /**
   * Generate Apple Calendar URL (webcal)
   */
  private static generateAppleCalendarUrl(
    eventDetails: CalendarEventDetails,
  ): string {
    // Apple Calendar typically uses ICS files via webcal protocol
    return `webcal://${process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '')}/api/suppliers/calendar/ics/${encodeURIComponent(eventDetails.title)}.ics`;
  }

  /**
   * Generate Yahoo Calendar URL
   */
  private static generateYahooCalendarUrl(
    eventDetails: CalendarEventDetails,
  ): string {
    const duration = Math.floor(
      (eventDetails.endDateTime.getTime() -
        eventDetails.startDateTime.getTime()) /
        (1000 * 60 * 60),
    );

    const params = new URLSearchParams({
      v: '60',
      title: eventDetails.title,
      st: this.formatYahooDateTime(eventDetails.startDateTime),
      dur: duration.toString().padStart(2, '0') + '00', // Format as HHMM
      desc: eventDetails.description,
      in_loc: eventDetails.location || '',
    });

    return `https://calendar.yahoo.com/?${params.toString()}`;
  }

  /**
   * Format date for Google Calendar
   */
  private static formatGoogleDateTime(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  /**
   * Format date for Yahoo Calendar
   */
  private static formatYahooDateTime(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  /**
   * Store calendar invite data for tracking
   */
  private static async storeCalendarInviteData(
    eventId: string,
    organizationId: string,
    supplierId: string | undefined,
    inviteData: CalendarInviteData,
  ): Promise<void> {
    try {
      const supabase = await createClient();

      await supabase.from('supplier_calendar_invites').upsert({
        event_id: eventId,
        organization_id: organizationId,
        supplier_id: supplierId,
        ics_content: inviteData.icsContent,
        google_url: inviteData.googleCalendarUrl,
        outlook_url: inviteData.outlookCalendarUrl,
        apple_url: inviteData.appleCalendarUrl,
        yahoo_url: inviteData.yahooCalendarUrl,
        download_url: inviteData.downloadUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to store calendar invite data:', error);
    }
  }

  /**
   * Generate calendar invites for multiple suppliers
   */
  static async generateBulkSupplierCalendarInvites(
    scheduleEvent: SupplierScheduleEvent,
    supplierIds: string[],
    organizationId: string,
  ): Promise<{
    successful: number;
    failed: number;
    errors: string[];
    invites: CalendarInviteData[];
  }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
      invites: [] as CalendarInviteData[],
    };

    for (const supplierId of supplierIds) {
      try {
        const inviteData = await this.generateSupplierCalendarInvite(
          scheduleEvent,
          organizationId,
          supplierId,
        );
        results.invites.push(inviteData);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Supplier ${supplierId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return results;
  }

  /**
   * Update calendar invite when schedule changes
   */
  static async updateSupplierCalendarInvite(
    eventId: string,
    organizationId: string,
    supplierId: string,
    updatedEvent: SupplierScheduleEvent,
  ): Promise<CalendarInviteData> {
    try {
      // Generate new invite data
      const inviteData = await this.generateSupplierCalendarInvite(
        updatedEvent,
        organizationId,
        supplierId,
      );

      // Log the update
      const supabase = await createClient();
      await supabase.from('supplier_calendar_invite_updates').insert({
        event_id: eventId,
        organization_id: organizationId,
        supplier_id: supplierId,
        update_type: 'schedule_change',
        old_ics_content: '', // TODO: Get previous content
        new_ics_content: inviteData.icsContent,
        created_at: new Date().toISOString(),
      });

      return inviteData;
    } catch (error) {
      console.error('Failed to update calendar invite:', error);
      throw error;
    }
  }

  /**
   * Cancel calendar invite
   */
  static async cancelSupplierCalendarInvite(
    eventId: string,
    organizationId: string,
    supplierId: string,
    cancellationReason: string,
  ): Promise<CalendarInviteData> {
    try {
      const supabase = await createClient();

      // Get original event details for cancellation
      const { data: scheduleEvent } = await supabase
        .from('supplier_schedule_events')
        .select(
          `
          *,
          wedding:weddings!inner(
            id,
            couple_names,
            wedding_date,
            planner_name,
            planner_email
          )
        `,
        )
        .eq('id', eventId)
        .single();

      if (!scheduleEvent) {
        throw new Error('Schedule event not found for cancellation');
      }

      // Convert to SupplierScheduleEvent format
      const supplierScheduleEvent = {
        id: scheduleEvent.id,
        title: `CANCELLED: ${scheduleEvent.title}`,
        description: `${scheduleEvent.description}\n\nCANCELLATION REASON: ${cancellationReason}`,
        start_time: new Date(scheduleEvent.start_time),
        end_time: new Date(scheduleEvent.end_time),
        location: scheduleEvent.location,
        venue_name: scheduleEvent.venue_name,
        venue_address: scheduleEvent.venue_address,
        setup_time: scheduleEvent.setup_time
          ? new Date(scheduleEvent.setup_time)
          : undefined,
        breakdown_time: scheduleEvent.breakdown_time
          ? new Date(scheduleEvent.breakdown_time)
          : undefined,
        supplier_role: scheduleEvent.supplier_role,
        special_instructions: `CANCELLED - ${cancellationReason}`,
        contact_person: scheduleEvent.contact_person,
        contact_phone: scheduleEvent.contact_phone,
        contact_email: scheduleEvent.contact_email,
        wedding_date: new Date(scheduleEvent.wedding.wedding_date),
        couple_names: scheduleEvent.wedding.couple_names,
        planner_name: scheduleEvent.wedding.planner_name,
        planner_email: scheduleEvent.wedding.planner_email,
        priority: scheduleEvent.priority as
          | 'low'
          | 'medium'
          | 'high'
          | 'critical',
        status: 'cancelled' as const,
        created_at: new Date(scheduleEvent.created_at),
        updated_at: new Date(),
      };

      // Generate cancellation invite
      const inviteData = await this.generateSupplierCalendarInvite(
        supplierScheduleEvent,
        organizationId,
        supplierId,
      );

      // Log the cancellation
      await supabase.from('supplier_calendar_invite_updates').insert({
        event_id: eventId,
        organization_id: organizationId,
        supplier_id: supplierId,
        update_type: 'cancellation',
        old_ics_content: '', // TODO: Get previous content
        new_ics_content: inviteData.icsContent,
        notes: cancellationReason,
        created_at: new Date().toISOString(),
      });

      return inviteData;
    } catch (error) {
      console.error('Failed to cancel calendar invite:', error);
      throw error;
    }
  }

  /**
   * Get calendar invite statistics
   */
  static async getCalendarInviteStats(
    organizationId: string,
    timeRange?: { from: Date; to: Date },
  ) {
    try {
      const supabase = await createClient();

      let query = supabase
        .from('supplier_calendar_invites')
        .select('event_id, supplier_id, created_at')
        .eq('organization_id', organizationId);

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.from.toISOString())
          .lte('created_at', timeRange.to.toISOString());
      }

      const { data: invites, error } = await query;

      if (error) throw error;

      // Get update statistics
      let updateQuery = supabase
        .from('supplier_calendar_invite_updates')
        .select('update_type, created_at')
        .eq('organization_id', organizationId);

      if (timeRange) {
        updateQuery = updateQuery
          .gte('created_at', timeRange.from.toISOString())
          .lte('created_at', timeRange.to.toISOString());
      }

      const { data: updates, error: updateError } = await updateQuery;

      if (updateError) throw updateError;

      return {
        total_invites: invites?.length || 0,
        total_updates: updates?.length || 0,
        updates_by_type: updates?.reduce((acc: any, update) => {
          acc[update.update_type] = (acc[update.update_type] || 0) + 1;
          return acc;
        }, {}),
        unique_events: new Set(invites?.map((inv) => inv.event_id)).size,
        unique_suppliers: new Set(invites?.map((inv) => inv.supplier_id)).size,
      };
    } catch (error) {
      console.error('Failed to get calendar invite stats:', error);
      throw error;
    }
  }

  /**
   * Validate ICS content
   */
  static validateICSContent(icsContent: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!icsContent.includes('BEGIN:VCALENDAR')) {
      errors.push('Missing VCALENDAR begin tag');
    }

    if (!icsContent.includes('END:VCALENDAR')) {
      errors.push('Missing VCALENDAR end tag');
    }

    if (!icsContent.includes('BEGIN:VEVENT')) {
      errors.push('Missing VEVENT begin tag');
    }

    if (!icsContent.includes('END:VEVENT')) {
      errors.push('Missing VEVENT end tag');
    }

    if (!icsContent.includes('DTSTART:')) {
      errors.push('Missing start date');
    }

    if (!icsContent.includes('DTEND:')) {
      errors.push('Missing end date');
    }

    if (!icsContent.includes('SUMMARY:')) {
      errors.push('Missing event title');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
