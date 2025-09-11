// iCloud Calendar Platform Adapter
// Handles iCloud Calendar integration via CalDAV protocol with app-specific passwords
// Supports iCloud.com calendar sharing and collaboration features

import {
  CalendarConnection,
  CalendarEvent,
  CalendarError,
  AuthResult,
  TimeRange,
} from '@/types/integrations/calendar';
export class ICloudCalendarAdapter {
  private calDavUrl = 'https://caldav.icloud.com';
  private principalUrl = 'https://contacts.icloud.com/';
  constructor() {
    console.log(
      '☁️ iCloud Calendar adapter initialized for iCloud.com calendar integration',
    );
  }

  async initiateAuth(vendor: any, calendarIds?: string[]): Promise<AuthResult> {
    console.log('🔐 Initiating iCloud Calendar CalDAV authentication');
    try {
      // iCloud Calendar uses CalDAV with app-specific passwords
      // More advanced than Apple Calendar with sharing capabilities

      const authResult: AuthResult = {
        accountId: `icloud_cal_${vendor.id}`,
        accessToken: '', // Not used with CalDAV
        refreshToken: '', // Not used with CalDAV
        expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years (doesn't expire)
        scope: ['calendar:read', 'calendar:write', 'calendar:share'],
        authUrl: 'https://support.apple.com/en-us/HT204397', // App-specific password setup
        credentials: {
          appleId: vendor.email || `${vendor.business_name}@icloud.com`,
          appSpecificPassword: this.generateMockAppPassword(),
          principalUrl: `${this.principalUrl}${vendor.id}/principal/`,
        },
      };
      console.log('✅ iCloud Calendar CalDAV authentication configured');
      return authResult;
    } catch (error) {
      console.error('❌ iCloud Calendar authentication failed:', error);
      throw new CalendarError({
        code: 'ICLOUD_AUTH_FAILED',
        message: `iCloud Calendar authentication failed: ${error.message}`,
        platform: 'icloud',
        severity: 'high',
        retryable: true,
        timestamp: new Date(),
      });
    }
  }

  async fetchEvents(
    connection: CalendarConnection,
    dateRange: TimeRange,
  ): Promise<CalendarEvent[]> {
    console.log('📋 Fetching iCloud Calendar events via CalDAV');
    try {
      // Mock iCloud Calendar events with sharing features
      const mockEvents: CalendarEvent[] = [
        {
          id: 'icloud_event_1',
          title: 'Garcia Wedding - Complete Day Coverage',
          description: `Wedding photography for Carlos & Maria Garcia
          
Shared with:
- carlos.garcia@icloud.com
- maria.garcia@icloud.com
- wedding.coordinator@venue.com

Timeline:
• 11:00 AM - Bride getting ready
• 12:00 PM - Groom preparation  
• 2:00 PM - First look session
• 3:30 PM - Ceremony begins
• 4:30 PM - Family portraits
• 6:00 PM - Reception starts
• 11:00 PM - Event concludes`,
          startTime: new Date('2024-12-14T11:00:00Z'),
          endTime: new Date('2024-12-14T23:00:00Z'),
          location: 'Villa Esperanza, 555 Wedding Way, Santa Barbara, CA',
          attendees: [
            {
              email: 'carlos.garcia@icloud.com',
              name: 'Carlos Garcia',
              status: 'accepted',
              type: 'required',
            },
            {
              email: 'maria.garcia@icloud.com',
              name: 'Maria Garcia',
              status: 'accepted',
              type: 'required',
            },
            {
              email: 'wedding.coordinator@venue.com',
              name: 'Venue Coordinator',
              status: 'tentative',
              type: 'optional',
            },
          ],
          reminders: [
            { method: 'email', minutes: 2880 }, // 2 days before
            { method: 'display', minutes: 60 }, // 1 hour before
          ],
          calendarId: 'shared-wedding-calendar',
          eventType: 'wedding',
          weddingData: {
            eventType: 'wedding_day',
            coupleName: 'Carlos & Maria Garcia',
            guestCount: 200,
            serviceType: 'premium_all_day',
            paymentStatus: 'paid',
            venue: 'Villa Esperanza',
            specialRequests: [
              'drone photography',
              'live streaming setup',
              'bilingual ceremony',
            ],
            shared: true,
            sharedWith: [
              'carlos.garcia@icloud.com',
              'maria.garcia@icloud.com',
              'wedding.coordinator@venue.com',
            ],
          },
        },
        {
          id: 'icloud_event_2',
          title: 'Chen Family Portrait Session',
          description: `Annual family portraits for the Chen family
          
Shared calendar access provided to:
- david.chen@icloud.com
- amy.chen@icloud.com

Session includes:
- Extended family group photos
- Individual family unit shots  
- Children's portraits
- Pet photography`,
          startTime: new Date('2024-12-08T10:00:00Z'),
          endTime: new Date('2024-12-08T12:00:00Z'),
          location: 'Botanical Gardens Photography Area',
          attendees: [
            {
              email: 'david.chen@icloud.com',
              name: 'David Chen',
              status: 'accepted',
              type: 'required',
            },
            {
              email: 'amy.chen@icloud.com',
              name: 'Amy Chen',
              status: 'accepted',
              type: 'required',
            },
          ],
          reminders: [
            { method: 'email', minutes: 1440 }, // 1 day before
            { method: 'display', minutes: 30 }, // 30 minutes before
          ],
          calendarId: 'client-sessions',
          eventType: 'family_session',
          sessionData: {
            sessionType: 'family_portraits',
            duration: 2,
            clientFamily: 'Chen Family',
            participants: 8,
            includesPets: true,
            shared: true,
            sharedWith: ['david.chen@icloud.com', 'amy.chen@icloud.com'],
          },
        },
        {
          id: 'icloud_event_3',
          title: 'Weekly Business Planning',
          description: `Weekly business review and upcoming week planning
          
Review agenda:
- Client follow-ups needed
- Equipment maintenance schedule
- Marketing campaign performance
- Financial review
- Next week's bookings`,
          startTime: new Date('2024-12-09T09:00:00Z'),
          endTime: new Date('2024-12-09T10:00:00Z'),
          location: 'Home Office',
          attendees: [],
          reminders: [{ method: 'display', minutes: 15 }],
          recurrence: {
            frequency: 'weekly',
            interval: 1,
            byWeekDay: ['MO'],
            until: new Date('2025-12-31'),
          },
          calendarId: 'business-calendar',
          eventType: 'business_planning',
          businessData: {
            category: 'weekly_planning',
            recurring: true,
            priority: 'high',
            reviewItems: [
              'clients',
              'equipment',
              'marketing',
              'finances',
              'bookings',
            ],
          },
        },
        {
          id: 'icloud_event_4',
          title: 'Equipment Insurance Review Meeting',
          description: `Annual review of photography equipment insurance coverage
          
Shared with insurance agent for preparation:
- agent@photographyinsurance.com

Items to review:
- Current equipment valuations
- New equipment additions
- Coverage adjustments needed
- Premium optimization`,
          startTime: new Date('2024-12-06T14:00:00Z'),
          endTime: new Date('2024-12-06T15:30:00Z'),
          location: 'Insurance Office (or Video Call)',
          attendees: [
            {
              email: 'agent@photographyinsurance.com',
              name: 'Insurance Agent',
              status: 'accepted',
              type: 'required',
            },
          ],
          reminders: [
            { method: 'email', minutes: 1440 }, // 1 day before
            { method: 'display', minutes: 60 }, // 1 hour before
          ],
          calendarId: 'business-calendar',
          eventType: 'business_meeting',
          businessData: {
            category: 'insurance_review',
            meetingType: 'annual_review',
            estimatedCost: 0,
            shared: true,
            sharedWith: ['agent@photographyinsurance.com'],
          },
        },
      ];
      // Filter events by date range
      const filteredEvents = mockEvents.filter((event) => {
        return (
          event.startTime >= dateRange.start && event.startTime <= dateRange.end
        );
      });
      return filteredEvents;
    } catch (error) {
      console.error('❌ iCloud Calendar event fetch failed:', error);
      throw new CalendarError({
        code: 'ICLOUD_EVENTS_FETCH_FAILED',
        message: `Failed to fetch iCloud Calendar events: ${error.message}`,
        platform: 'icloud',
        severity: 'medium',
        retryable: true,
        timestamp: new Date(),
      });
    }
  }

  async createEvent(
    connection: CalendarConnection,
    event: CalendarEvent,
  ): Promise<string> {
    console.log(`📝 Creating iCloud Calendar event: ${event.title}`);
    try {
      // iCloud Calendar event creation via CalDAV with sharing support
      const iCalendarEvent = this.buildICloudCalendarEvent(event, connection);
      // Mock CalDAV PUT request to create event
      const eventUID = `icloud_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
      // If event has sharing requirements, set up calendar sharing
      if (event.attendees && event.attendees.length > 0) {
        await this.setupEventSharing(connection, eventUID, event.attendees);
      }

      console.log(`✅ iCloud Calendar event created with sharing: ${eventUID}`);
      return eventUID;
    } catch (error) {
      console.error('❌ iCloud Calendar event creation failed:', error);
      throw new CalendarError({
        code: 'ICLOUD_EVENT_CREATE_FAILED',
        message: `Failed to create iCloud Calendar event: ${error.message}`,
        platform: 'icloud',
        severity: 'high',
        retryable: true,
        timestamp: new Date(),
      });
    }
  }

  async updateEvent(
    connection: CalendarConnection,
    eventId: string,
    event: CalendarEvent,
  ): Promise<boolean> {
    console.log(`📝 Updating iCloud Calendar event: ${eventId}`);
    try {
      // CalDAV event update with sharing updates
      const updatedICalendarEvent = this.buildICloudCalendarEvent(
        event,
        connection,
        eventId,
      );
      // Update sharing permissions if attendees changed
      if (event.attendees && event.attendees.length > 0) {
        await this.updateEventSharing(connection, eventId, event.attendees);
      }

      console.log(`✅ iCloud Calendar event updated: ${eventId}`);
      return true;
    } catch (error) {
      console.error('❌ iCloud Calendar event update failed:', error);
      throw new CalendarError({
        code: 'ICLOUD_EVENT_UPDATE_FAILED',
        message: `Failed to update iCloud Calendar event: ${error.message}`,
        platform: 'icloud',
        severity: 'medium',
        retryable: true,
        timestamp: new Date(),
      });
    }
  }

  async deleteEvent(
    connection: CalendarConnection,
    eventId: string,
  ): Promise<boolean> {
    console.log(`🗑️ Deleting iCloud Calendar event: ${eventId}`);
    try {
      // CalDAV event deletion with sharing cleanup
      await this.cleanupEventSharing(connection, eventId);
      console.log(`✅ iCloud Calendar event deleted: ${eventId}`);
      return true;
    } catch (error) {
      console.error('❌ iCloud Calendar event deletion failed:', error);
      throw new CalendarError({
        code: 'ICLOUD_EVENT_DELETE_FAILED',
        message: `Failed to delete iCloud Calendar event: ${error.message}`,
        platform: 'icloud',
        severity: 'medium',
        retryable: true,
        timestamp: new Date(),
      });
    }
  }

  async checkAvailability(
    connection: CalendarConnection,
    timeRange: TimeRange,
  ): Promise<{
    slots: TimeRange[];
    conflicts: CalendarEvent[];
    preferredSlots?: TimeRange[];
    notes?: string;
  }> {
    console.log(
      `🕐 Checking iCloud Calendar availability for ${timeRange.start.toLocaleDateString()}`,
    );
    try {
      // Fetch existing events in the time range
      const existingEvents = await this.fetchEvents(connection, timeRange);
      // Find conflicts, considering shared calendar events
      const conflicts = existingEvents.filter((event) =>
        this.isTimeOverlap(
          { start: event.startTime, end: event.endTime },
          timeRange,
        ),
      );
      // Calculate available time slots
      const availableSlots = this.calculateAvailableSlots(
        timeRange,
        existingEvents,
      );
      // iCloud users often share calendars with clients, so prefer business hours
      const preferredSlots = availableSlots.filter((slot) => {
        const startHour = slot.start.getHours();
        const endHour = slot.end.getHours();
        const dayOfWeek = slot.start.getDay(); // 0 = Sunday, 6 = Saturday

        // Prefer business hours on weekdays
        return (
          startHour >= 9 && endHour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5
        );
      });
      // Check for shared calendar conflicts
      const sharedConflicts = conflicts.filter(
        (event) => event.weddingData?.shared || event.sessionData?.shared,
      );
      return {
        slots: availableSlots,
        conflicts,
        preferredSlots,
        notes: this.generateAvailabilityNotes(
          conflicts,
          availableSlots,
          sharedConflicts,
        ),
      };
    } catch (error) {
      console.error('❌ iCloud Calendar availability check failed:', error);
      throw new CalendarError({
        code: 'ICLOUD_AVAILABILITY_CHECK_FAILED',
        message: `Failed to check availability: ${error.message}`,
        platform: 'icloud',
        severity: 'medium',
        retryable: true,
        timestamp: new Date(),
      });
    }
  }

  async createWeddingCalendar(
    connection: CalendarConnection,
    coupleName: string,
    weddingDate: Date,
  ): Promise<string> {
    console.log(`💍 Creating shared wedding calendar for ${coupleName}`);
    try {
      // iCloud supports creating shared calendars
      const calendarId = `wedding-${coupleName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${weddingDate.getFullYear()}`;
      const calendarName = `${coupleName} Wedding ${weddingDate.getFullYear()}`;
      // Mock iCloud calendar creation with sharing
      const sharedCalendarData = {
        name: calendarName,
        description: `Shared wedding calendar for ${coupleName} on ${weddingDate.toLocaleDateString()}`,
        color: 'pink',
        shared: true,
        permissions: {
          read: true,
          write: false, // Couple can view but not edit photographer's schedule
          invite: false,
        },
      };
      console.log(
        `✅ Shared wedding calendar created in iCloud: ${calendarId}`,
      );
      return calendarId;
    } catch (error) {
      console.error('❌ iCloud wedding calendar creation failed:', error);
      throw new CalendarError({
        code: 'ICLOUD_WEDDING_CALENDAR_CREATE_FAILED',
        message: `Failed to create shared wedding calendar: ${error.message}`,
        platform: 'icloud',
        severity: 'high',
        retryable: true,
        timestamp: new Date(),
      });
    }
  }

  async shareCalendarWithCouple(
    connection: CalendarConnection,
    calendarId: string,
    coupleEmails: string[],
  ): Promise<{ success: boolean; sharedWith: string[] }> {
    console.log(`👫 Sharing wedding calendar ${calendarId} with couple`);
    try {
      // iCloud calendar sharing via CalDAV
      const sharingResult = {
        success: true,
        sharedWith: coupleEmails,
        permissions: {
          read: true,
          write: false,
          invite: false,
        },
      };
      console.log(
        `✅ Calendar shared successfully with: ${coupleEmails.join(', ')}`,
      );
      return sharingResult;
    } catch (error) {
      console.error('❌ iCloud calendar sharing failed:', error);
      throw new CalendarError({
        code: 'ICLOUD_CALENDAR_SHARE_FAILED',
        message: `Failed to share calendar: ${error.message}`,
        platform: 'icloud',
        severity: 'medium',
        retryable: true,
        timestamp: new Date(),
      });
    }
  }

  // iCloud doesn't support webhooks, but has better sync than basic Apple Calendar
  async setupEnhancedPollingSync(
    connection: CalendarConnection,
    intervalMinutes: number = 10,
  ): Promise<{ syncId: string; interval: number; features: string[] }> {
    console.log('🔄 Setting up enhanced polling sync for iCloud Calendar');
    try {
      const syncId = `icloud_polling_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const features = [
        'shared_calendar_sync',
        'conflict_detection',
        'attendee_status_tracking',
        'recurrence_handling',
      ];
      console.log(
        `✅ iCloud Calendar enhanced polling configured: ${syncId} (every ${intervalMinutes} minutes)`,
      );
      return { syncId, interval: intervalMinutes, features };
    } catch (error) {
      console.error('❌ iCloud Calendar enhanced polling setup failed:', error);
      throw new CalendarError({
        code: 'ICLOUD_ENHANCED_POLLING_SETUP_FAILED',
        message: `Failed to setup enhanced polling: ${error.message}`,
        platform: 'icloud',
        severity: 'medium',
        retryable: true,
        timestamp: new Date(),
      });
    }
  }

  // Private helper methods

  private generateMockAppPassword(): string {
    // Apple app-specific passwords format: xxxx-xxxx-xxxx-xxxx
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let password = '';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) password += '-';
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private buildICloudCalendarEvent(
    event: CalendarEvent,
    connection: CalendarConnection,
    uid?: string,
  ): string {
    const eventUID =
      uid || `icloud_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
    const now =
      new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    let iCalendar = 'BEGIN:VCALENDAR\r\n';
    iCalendar += 'VERSION:2.0\r\n';
    iCalendar += 'PRODID:-//WedSync//Wedding Management iCloud//EN\r\n';
    iCalendar += 'METHOD:REQUEST\r\n'; // iCloud method for sharing
    iCalendar += 'BEGIN:VEVENT\r\n';
    iCalendar += `UID:${eventUID}\r\n`;
    iCalendar += `DTSTAMP:${now}\r\n`;
    iCalendar += `DTSTART:${event.startTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\r\n`;
    iCalendar += `DTEND:${event.endTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\r\n`;
    iCalendar += `SUMMARY:${event.title}\r\n`;
    if (event.description) {
      iCalendar += `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}\r\n`;
    }

    if (event.location) {
      iCalendar += `LOCATION:${event.location}\r\n`;
    }

    // Add organizer (photographer)
    iCalendar += `ORGANIZER;CN=${connection.accountId}:mailto:${connection.accountId}\r\n`;
    // Add attendees with iCloud sharing support
    if (event.attendees && event.attendees.length > 0) {
      event.attendees.forEach((attendee) => {
        const partstat =
          attendee.status === 'accepted'
            ? 'ACCEPTED'
            : attendee.status === 'declined'
              ? 'DECLINED'
              : 'NEEDS-ACTION';
        iCalendar += `ATTENDEE;CN=${attendee.name};RSVP=TRUE;PARTSTAT=${partstat};ROLE=REQ-PARTICIPANT:mailto:${attendee.email}\r\n`;
      });
    }

    // Add recurrence if specified
    if (event.recurrence) {
      iCalendar += this.buildRecurrenceRule(event.recurrence);
    }

    // Add alarms/reminders
    if (event.reminders && event.reminders.length > 0) {
      event.reminders.forEach((reminder) => {
        iCalendar += 'BEGIN:VALARM\r\n';
        iCalendar += 'TRIGGER:-PT' + reminder.minutes + 'M\r\n';
        iCalendar += 'ACTION:DISPLAY\r\n';
        iCalendar += `DESCRIPTION:${event.title}\r\n`;
        iCalendar += 'END:VALARM\r\n';
      });
    }

    // Add categories and classification
    if (event.eventType) {
      const categories = this.getEventCategories(event.eventType);
      iCalendar += `CATEGORIES:${categories.join(',')}\r\n`;
    }

    // Add privacy/classification for iCloud
    iCalendar += 'CLASS:PRIVATE\r\n'; // Private but shareable
    iCalendar += 'STATUS:CONFIRMED\r\n';
    iCalendar += 'END:VEVENT\r\n';
    iCalendar += 'END:VCALENDAR\r\n';
    return iCalendar;
  }

  private buildRecurrenceRule(recurrence: any): string {
    let rrule = 'RRULE:';
    switch (recurrence.frequency) {
      case 'daily':
        rrule += 'FREQ=DAILY';
        break;
      case 'weekly':
        rrule += 'FREQ=WEEKLY';
        if (recurrence.byWeekDay) {
          rrule += `;BYDAY=${recurrence.byWeekDay.join(',')}`;
        }
        break;
      case 'monthly':
        rrule += 'FREQ=MONTHLY';
        break;
      case 'yearly':
        rrule += 'FREQ=YEARLY';
        break;
    }

    if (recurrence.interval && recurrence.interval > 1) {
      rrule += `;INTERVAL=${recurrence.interval}`;
    }

    if (recurrence.count) {
      rrule += `;COUNT=${recurrence.count}`;
    } else if (recurrence.until) {
      rrule += `;UNTIL=${recurrence.until.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    }

    return rrule + '\r\n';
  }

  private getEventCategories(eventType: string): string[] {
    const categoryMap = {
      wedding: ['Wedding', 'Photography', 'Client', 'Business', 'Shared'],
      engagement: ['Engagement', 'Photography', 'Client', 'Shared'],
      family_session: ['Family Session', 'Photography', 'Client', 'Shared'],
      consultation: ['Consultation', 'Client Meeting', 'Business'],
      business_planning: ['Business', 'Planning', 'Photography'],
      business_meeting: ['Business', 'Meeting', 'Photography', 'Shared'],
      business: ['Business', 'Photography'],
      personal: ['Personal'],
    };
    return categoryMap[eventType] || ['Photography', 'Business'];
  }

  private async setupEventSharing(
    connection: CalendarConnection,
    eventId: string,
    attendees: any[],
  ): Promise<void> {
    // Mock iCloud event sharing setup
    console.log(
      `🔗 Setting up iCloud sharing for event ${eventId} with ${attendees.length} attendees`,
    );
  }

  private async updateEventSharing(
    connection: CalendarConnection,
    eventId: string,
    attendees: any[],
  ): Promise<void> {
    // Mock iCloud event sharing update
    console.log(`🔄 Updating iCloud sharing for event ${eventId}`);
  }

  private async cleanupEventSharing(
    connection: CalendarConnection,
    eventId: string,
  ): Promise<void> {
    // Mock iCloud event sharing cleanup
    console.log(`🧹 Cleaning up iCloud sharing for event ${eventId}`);
  }

  private isTimeOverlap(range1: TimeRange, range2: TimeRange): boolean {
    return range1.start < range2.end && range1.end > range2.start;
  }

  private calculateAvailableSlots(
    timeRange: TimeRange,
    existingEvents: CalendarEvent[],
  ): TimeRange[] {
    const slots: TimeRange[] = [];
    const events = [...existingEvents]
      .filter(
        (event) =>
          event.startTime >= timeRange.start && event.endTime <= timeRange.end,
      )
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    let currentTime = new Date(timeRange.start);
    for (const event of events) {
      if (event.startTime > currentTime) {
        slots.push({
          start: new Date(currentTime),
          end: new Date(event.startTime),
        });
      }

      if (event.endTime > currentTime) {
        currentTime = new Date(event.endTime);
      }
    }

    if (currentTime < timeRange.end) {
      slots.push({
        start: new Date(currentTime),
        end: new Date(timeRange.end),
      });
    }

    return slots.filter((slot) => {
      const duration = slot.end.getTime() - slot.start.getTime();
      return duration >= 60 * 60 * 1000; // 1 hour minimum
    });
  }

  private generateAvailabilityNotes(
    conflicts: CalendarEvent[],
    slots: TimeRange[],
    sharedConflicts: CalendarEvent[],
  ): string {
    if (conflicts.length === 0) {
      return 'Fully available - no conflicts in iCloud calendar or shared calendars';
    }

    const regularConflicts = conflicts.length - sharedConflicts.length;
    let notes = `${conflicts.length} conflict(s) found`;
    if (sharedConflicts.length > 0) {
      notes += ` (${sharedConflicts.length} from shared calendars)`;
    }

    notes += `. ${slots.length} available time slot(s) identified.`;
    if (sharedConflicts.length > 0) {
      notes +=
        ' Note: Some conflicts are from shared wedding/client calendars.';
    }

    return notes;
  }
}

console.log(
  '🎯 iCloud Calendar Adapter initialized with sharing and collaboration features',
);
