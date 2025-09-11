/**
 * Calendar Export Service - WS-160
 * Handles Google Calendar, Outlook, and Apple Calendar integrations
 */

import { TimelineEvent, WeddingTimeline } from '@/types/timeline';

interface CalendarEvent {
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  location?: string;
  attendees?: string[];
  recurrence?: string;
  reminders?: { method: string; minutes: number }[];
}

interface CalendarExportOptions {
  includeVendorDetails: boolean;
  includeInternalNotes: boolean;
  timezone: string;
  reminderMinutes?: number[];
}

export class CalendarExportService {
  private googleCalendarApi: GoogleCalendarAPI;
  private outlookCalendarApi: OutlookCalendarAPI;

  constructor() {
    this.googleCalendarApi = new GoogleCalendarAPI();
    this.outlookCalendarApi = new OutlookCalendarAPI();
  }

  /**
   * Export timeline to Google Calendar
   */
  async exportToGoogleCalendar(
    timeline: WeddingTimeline,
    events: TimelineEvent[],
    accessToken: string,
    options: CalendarExportOptions,
  ): Promise<{ success: boolean; calendarId?: string; error?: string }> {
    try {
      // Create wedding calendar
      const calendar = await this.googleCalendarApi.createCalendar(
        {
          summary: `${timeline.name} - Wedding Timeline`,
          description: `Wedding timeline for ${timeline.wedding_date}`,
          timeZone: options.timezone,
        },
        accessToken,
      );

      if (!calendar.success) {
        return { success: false, error: calendar.error };
      }

      const calendarId = calendar.data.id;

      // Convert and create events
      const calendarEvents = this.convertToCalendarEvents(events, options);

      for (const event of calendarEvents) {
        await this.googleCalendarApi.createEvent(
          calendarId,
          event,
          accessToken,
        );
      }

      // Set up sharing permissions
      await this.googleCalendarApi.shareCalendar(calendarId, accessToken);

      return { success: true, calendarId };
    } catch (error) {
      console.error('Google Calendar export failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Export timeline to Outlook Calendar
   */
  async exportToOutlookCalendar(
    timeline: WeddingTimeline,
    events: TimelineEvent[],
    accessToken: string,
    options: CalendarExportOptions,
  ): Promise<{ success: boolean; calendarId?: string; error?: string }> {
    try {
      // Create calendar group for wedding
      const calendarGroup = await this.outlookCalendarApi.createCalendarGroup(
        {
          name: `${timeline.name} - Wedding`,
          changeKey: '',
          classId: '',
          id: '',
        },
        accessToken,
      );

      if (!calendarGroup.success) {
        return { success: false, error: calendarGroup.error };
      }

      // Create calendar in the group
      const calendar = await this.outlookCalendarApi.createCalendar(
        {
          name: timeline.name,
          color: 'auto',
        },
        accessToken,
        calendarGroup.data.id,
      );

      if (!calendar.success) {
        return { success: false, error: calendar.error };
      }

      const calendarId = calendar.data.id;

      // Convert and create events
      const calendarEvents = this.convertToCalendarEvents(events, options);

      for (const event of calendarEvents) {
        await this.outlookCalendarApi.createEvent(
          calendarId,
          event,
          accessToken,
        );
      }

      return { success: true, calendarId };
    } catch (error) {
      console.error('Outlook Calendar export failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Generate Apple Calendar (.ics) file
   */
  async generateAppleCalendarFile(
    timeline: WeddingTimeline,
    events: TimelineEvent[],
    options: CalendarExportOptions,
  ): Promise<{ success: boolean; icsContent?: string; error?: string }> {
    try {
      const icsContent = this.generateICSContent(timeline, events, options);
      return { success: true, icsContent };
    } catch (error) {
      console.error('Apple Calendar generation failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Sync timeline changes to existing calendars
   */
  async syncTimelineChanges(
    timelineId: string,
    changes: {
      added: TimelineEvent[];
      updated: TimelineEvent[];
      deleted: string[];
    },
    calendarMappings: {
      provider: string;
      calendarId: string;
      accessToken: string;
    }[],
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const mapping of calendarMappings) {
      try {
        switch (mapping.provider) {
          case 'google':
            await this.syncGoogleCalendarChanges(mapping, changes);
            break;
          case 'outlook':
            await this.syncOutlookCalendarChanges(mapping, changes);
            break;
        }
      } catch (error) {
        errors.push(`${mapping.provider}: ${(error as Error).message}`);
      }
    }

    return { success: errors.length === 0, errors };
  }

  /**
   * Convert timeline events to calendar events
   */
  private convertToCalendarEvents(
    events: TimelineEvent[],
    options: CalendarExportOptions,
  ): CalendarEvent[] {
    return events.map((event) => {
      let description = event.description || '';

      if (options.includeVendorDetails && event.vendors?.length) {
        description += '\n\nVendors:\n';
        event.vendors.forEach((vendor) => {
          description += `- ${vendor.vendor?.business_name} (${vendor.role})\n`;
          if (vendor.responsibilities) {
            description += `  ${vendor.responsibilities}\n`;
          }
        });
      }

      if (options.includeInternalNotes && event.internal_notes) {
        description += `\n\nInternal Notes:\n${event.internal_notes}`;
      }

      const reminders = options.reminderMinutes?.map((minutes) => ({
        method: 'popup',
        minutes,
      })) || [{ method: 'popup', minutes: 15 }];

      return {
        title: event.title,
        description: description.trim(),
        startTime: event.start_time,
        endTime: event.end_time,
        location: event.location,
        attendees:
          event.vendors?.map((v) => v.vendor?.email).filter(Boolean) || [],
        reminders,
      };
    });
  }

  /**
   * Generate ICS content for Apple Calendar
   */
  private generateICSContent(
    timeline: WeddingTimeline,
    events: TimelineEvent[],
    options: CalendarExportOptions,
  ): string {
    const lines: string[] = [];

    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//WedSync//Timeline Export//EN');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');
    lines.push(`X-WR-CALNAME:${timeline.name}`);
    lines.push(`X-WR-TIMEZONE:${options.timezone}`);

    events.forEach((event) => {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${event.id}@wedsync.com`);
      lines.push(`DTSTART:${this.formatICSDateTime(event.start_time)}`);
      lines.push(`DTEND:${this.formatICSDateTime(event.end_time)}`);
      lines.push(`SUMMARY:${this.escapeICSText(event.title)}`);

      if (event.description) {
        lines.push(`DESCRIPTION:${this.escapeICSText(event.description)}`);
      }

      if (event.location) {
        lines.push(`LOCATION:${this.escapeICSText(event.location)}`);
      }

      lines.push(`PRIORITY:${this.getICSPriority(event.priority)}`);
      lines.push(`STATUS:${this.getICSStatus(event.status)}`);
      lines.push(`CREATED:${this.formatICSDateTime(event.created_at)}`);
      lines.push(`LAST-MODIFIED:${this.formatICSDateTime(event.updated_at)}`);

      // Add reminders
      if (options.reminderMinutes) {
        options.reminderMinutes.forEach((minutes) => {
          lines.push('BEGIN:VALARM');
          lines.push('ACTION:DISPLAY');
          lines.push(`TRIGGER:-PT${minutes}M`);
          lines.push(`DESCRIPTION:${event.title} reminder`);
          lines.push('END:VALARM');
        });
      }

      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /**
   * Format datetime for ICS
   */
  private formatICSDateTime(dateTime: string): string {
    return new Date(dateTime)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  }

  /**
   * Escape text for ICS format
   */
  private escapeICSText(text: string): string {
    return text.replace(/[\\;,\n]/g, (match) => {
      switch (match) {
        case '\\':
          return '\\\\';
        case ';':
          return '\\;';
        case ',':
          return '\\,';
        case '\n':
          return '\\n';
        default:
          return match;
      }
    });
  }

  /**
   * Get ICS priority from timeline priority
   */
  private getICSPriority(priority: string): string {
    switch (priority) {
      case 'critical':
        return '1';
      case 'high':
        return '3';
      case 'medium':
        return '5';
      case 'low':
        return '7';
      default:
        return '5';
    }
  }

  /**
   * Get ICS status from timeline status
   */
  private getICSStatus(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'CONFIRMED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return 'TENTATIVE';
    }
  }

  /**
   * Sync changes to Google Calendar
   */
  private async syncGoogleCalendarChanges(
    mapping: { calendarId: string; accessToken: string },
    changes: {
      added: TimelineEvent[];
      updated: TimelineEvent[];
      deleted: string[];
    },
  ): Promise<void> {
    // Add new events
    for (const event of changes.added) {
      const calendarEvent = this.convertToCalendarEvents([event], {
        includeVendorDetails: true,
        includeInternalNotes: false,
        timezone: 'UTC',
      })[0];

      await this.googleCalendarApi.createEvent(
        mapping.calendarId,
        calendarEvent,
        mapping.accessToken,
      );
    }

    // Update existing events
    for (const event of changes.updated) {
      const calendarEvent = this.convertToCalendarEvents([event], {
        includeVendorDetails: true,
        includeInternalNotes: false,
        timezone: 'UTC',
      })[0];

      await this.googleCalendarApi.updateEvent(
        mapping.calendarId,
        event.id,
        calendarEvent,
        mapping.accessToken,
      );
    }

    // Delete events
    for (const eventId of changes.deleted) {
      await this.googleCalendarApi.deleteEvent(
        mapping.calendarId,
        eventId,
        mapping.accessToken,
      );
    }
  }

  /**
   * Sync changes to Outlook Calendar
   */
  private async syncOutlookCalendarChanges(
    mapping: { calendarId: string; accessToken: string },
    changes: {
      added: TimelineEvent[];
      updated: TimelineEvent[];
      deleted: string[];
    },
  ): Promise<void> {
    // Similar implementation for Outlook
    // Add new events
    for (const event of changes.added) {
      const calendarEvent = this.convertToCalendarEvents([event], {
        includeVendorDetails: true,
        includeInternalNotes: false,
        timezone: 'UTC',
      })[0];

      await this.outlookCalendarApi.createEvent(
        mapping.calendarId,
        calendarEvent,
        mapping.accessToken,
      );
    }

    // Update and delete operations...
  }
}

/**
 * Google Calendar API wrapper
 */
class GoogleCalendarAPI {
  private baseUrl = 'https://www.googleapis.com/calendar/v3';

  async createCalendar(
    calendarData: { summary: string; description: string; timeZone: string },
    accessToken: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/calendars`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarData),
      });

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async createEvent(
    calendarId: string,
    event: CalendarEvent,
    accessToken: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const googleEvent = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.startTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.endTime,
          timeZone: 'UTC',
        },
        location: event.location,
        attendees: event.attendees?.map((email) => ({ email })),
        reminders: {
          useDefault: false,
          overrides: event.reminders?.map((reminder) => ({
            method: reminder.method,
            minutes: reminder.minutes,
          })),
        },
      };

      const response = await fetch(
        `${this.baseUrl}/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent),
        },
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    event: CalendarEvent,
    accessToken: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Similar to createEvent but with PUT method
    try {
      const googleEvent = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.startTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.endTime,
          timeZone: 'UTC',
        },
        location: event.location,
      };

      const response = await fetch(
        `${this.baseUrl}/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent),
        },
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async deleteEvent(
    calendarId: string,
    eventId: string,
    accessToken: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async shareCalendar(calendarId: string, accessToken: string): Promise<void> {
    // Make calendar public or share with specific users
    const aclRule = {
      role: 'reader',
      scope: {
        type: 'default',
      },
    };

    await fetch(`${this.baseUrl}/calendars/${calendarId}/acl`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(aclRule),
    });
  }
}

/**
 * Outlook Calendar API wrapper
 */
class OutlookCalendarAPI {
  private baseUrl = 'https://graph.microsoft.com/v1.0';

  async createCalendarGroup(
    groupData: { name: string; changeKey: string; classId: string; id: string },
    accessToken: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/me/calendarGroups`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: groupData.name }),
      });

      if (!response.ok) {
        throw new Error(`Outlook API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async createCalendar(
    calendarData: { name: string; color: string },
    accessToken: string,
    calendarGroupId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/me/calendarGroups/${calendarGroupId}/calendars`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(calendarData),
        },
      );

      if (!response.ok) {
        throw new Error(`Outlook API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async createEvent(
    calendarId: string,
    event: CalendarEvent,
    accessToken: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const outlookEvent = {
        subject: event.title,
        body: {
          contentType: 'Text',
          content: event.description,
        },
        start: {
          dateTime: event.startTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.endTime,
          timeZone: 'UTC',
        },
        location: {
          displayName: event.location,
        },
        attendees: event.attendees?.map((email) => ({
          emailAddress: {
            address: email,
            name: email,
          },
        })),
      };

      const response = await fetch(
        `${this.baseUrl}/me/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(outlookEvent),
        },
      );

      if (!response.ok) {
        throw new Error(`Outlook API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

export default CalendarExportService;
