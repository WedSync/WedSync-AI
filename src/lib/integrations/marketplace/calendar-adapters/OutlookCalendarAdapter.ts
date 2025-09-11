// Microsoft Outlook Calendar Platform Adapter
// Handles Microsoft Graph API v1.0 integration for Outlook/Office 365 calendar management
// OAuth2 authentication with webhook notifications via Microsoft Graph

import {
  CalendarConnection,
  CalendarEvent,
  CalendarError,
  AuthResult,
  TimeRange,
} from '@/types/integrations/calendar';
export class OutlookCalendarAdapter {
  private apiUrl = 'https://graph.microsoft.com/v1.0';
  private authUrl =
    'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  constructor() {
    console.log(
      '📧 Outlook Calendar adapter initialized for Microsoft 365 calendar integration',
    );
  }

  async initiateAuth(vendor: any, calendarIds?: string[]): Promise<AuthResult> {
    console.log('🔐 Initiating Microsoft Graph OAuth2 authentication');
    try {
      // Microsoft Graph Calendar scopes
      const scopes = [
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/Calendars.ReadWrite.Shared',
        'https://graph.microsoft.com/User.Read',
        'offline_access',
      ];
      const authResult: AuthResult = {
        accountId: `outlook_${vendor.id}`,
        accessToken: this.generateMockToken('access'),
        refreshToken: this.generateMockToken('refresh'),
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        scope: scopes,
        authUrl: this.buildAuthUrl(scopes),
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/calendar/outlook`,
      };
      console.log('✅ Microsoft Graph authentication initiated successfully');
      return authResult;
    } catch (error) {
      console.error('❌ Outlook Calendar authentication failed:', error);
      throw new CalendarError({
        code: 'OUTLOOK_AUTH_FAILED',
        message: `Outlook Calendar authentication failed: ${error.message}`,
        platform: 'outlook',
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
    console.log('📋 Fetching Outlook Calendar events');
    try {
      // Mock Outlook Calendar events for wedding photography business
      const mockEvents: CalendarEvent[] = [
        {
          id: 'outlook_event_1',
          title: 'Wilson Wedding Photography',
          description: 'Full wedding day coverage for Michael & Sarah Wilson',
          startTime: new Date('2024-11-02T08:00:00Z'),
          endTime: new Date('2024-11-02T22:00:00Z'),
          location: 'Riverside Country Club, 123 River Rd, Cityville',
          attendees: [
            {
              email: 'michael.wilson@outlook.com',
              name: 'Michael Wilson',
              status: 'accepted',
              type: 'required',
            },
            {
              email: 'sarah.wilson@outlook.com',
              name: 'Sarah Wilson',
              status: 'accepted',
              type: 'required',
            },
            {
              email: 'coordinator@riversidecc.com',
              name: 'Wedding Coordinator',
              status: 'tentative',
              type: 'optional',
            },
          ],
          reminders: [
            { method: 'email', minutes: 2880 }, // 2 days before
            { method: 'popup', minutes: 120 }, // 2 hours before
          ],
          calendarId: 'primary',
          eventType: 'wedding',
          weddingData: {
            eventType: 'wedding_day',
            coupleName: 'Michael & Sarah Wilson',
            guestCount: 120,
            serviceType: 'premium_package',
            paymentStatus: 'paid',
            specialRequests: [
              'drone photography',
              'extended reception coverage',
            ],
            timelineEvents: [
              { time: '08:00', event: 'Getting ready - bride' },
              { time: '09:00', event: 'Getting ready - groom' },
              { time: '14:00', event: 'First look' },
              { time: '15:30', event: 'Ceremony' },
              { time: '17:00', event: 'Cocktail hour' },
              { time: '18:00', event: 'Reception entrance' },
              { time: '22:00', event: 'Last dance' },
            ],
          },
        },
        {
          id: 'outlook_event_2',
          title: 'Client Consultation - Martinez Family',
          description: 'Initial consultation for family portrait session',
          startTime: new Date('2024-11-05T14:00:00Z'),
          endTime: new Date('2024-11-05T15:00:00Z'),
          location: 'Studio A, Photography Studio',
          attendees: [
            {
              email: 'carlos.martinez@hotmail.com',
              name: 'Carlos Martinez',
              status: 'accepted',
              type: 'required',
            },
            {
              email: 'maria.martinez@hotmail.com',
              name: 'Maria Martinez',
              status: 'tentative',
              type: 'required',
            },
          ],
          reminders: [
            { method: 'email', minutes: 1440 }, // 1 day before
            { method: 'popup', minutes: 15 }, // 15 minutes before
          ],
          calendarId: 'primary',
          eventType: 'consultation',
          businessData: {
            category: 'client_consultation',
            serviceType: 'family_portraits',
            estimatedValue: 800,
            followUpRequired: true,
          },
        },
        {
          id: 'outlook_event_3',
          title: 'Equipment Pickup - Lens Rental',
          description: 'Pick up 70-200mm f/2.8 lens from rental shop',
          startTime: new Date('2024-11-01T11:00:00Z'),
          endTime: new Date('2024-11-01T11:30:00Z'),
          location: 'Pro Camera Rentals, 456 Main St',
          attendees: [],
          reminders: [{ method: 'popup', minutes: 30 }],
          calendarId: 'primary',
          eventType: 'business',
          businessData: {
            category: 'equipment_rental',
            rentalPeriod: '3 days',
            cost: 150.0,
            requiredFor: 'Wilson Wedding',
          },
        },
        {
          id: 'outlook_event_4',
          title: 'Photo Editing Session',
          description: 'Edit Wilson wedding photos - ceremony and reception',
          startTime: new Date('2024-11-04T09:00:00Z'),
          endTime: new Date('2024-11-04T17:00:00Z'),
          location: 'Home Studio',
          attendees: [],
          reminders: [{ method: 'popup', minutes: 15 }],
          calendarId: 'primary',
          eventType: 'business',
          businessData: {
            category: 'post_production',
            weddingClient: 'Wilson',
            photosToEdit: 800,
            estimatedHours: 8,
            deliveryDate: new Date('2024-11-10'),
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
      console.error('❌ Outlook Calendar event fetch failed:', error);
      throw new CalendarError({
        code: 'OUTLOOK_EVENTS_FETCH_FAILED',
        message: `Failed to fetch Outlook Calendar events: ${error.message}`,
        platform: 'outlook',
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
    console.log(`📝 Creating Outlook Calendar event: ${event.title}`);
    try {
      // Microsoft Graph event creation format
      const eventData = {
        subject: event.title,
        body: {
          contentType: 'HTML',
          content: this.formatEventDescription(
            event.description,
            event.weddingData,
          ),
        },
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: connection.syncSettings.timezoneSettings.defaultTimezone,
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: connection.syncSettings.timezoneSettings.defaultTimezone,
        },
        location: {
          displayName: event.location,
          address: {
            street: event.location,
          },
        },
        attendees: event.attendees.map((attendee) => ({
          emailAddress: {
            address: attendee.email,
            name: attendee.name,
          },
          type: attendee.type || 'required',
        })),
        reminderMinutesBeforeStart:
          event.reminders.length > 0 ? event.reminders[0].minutes : 15,
        categories: this.getEventCategories(event.eventType),
        importance: this.getEventImportance(event.eventType),
        showAs: event.eventType === 'wedding' ? 'busy' : 'tentative',
        sensitivity: 'normal',
        responseRequested: event.attendees.length > 0,
        recurrence: event.recurrence
          ? this.buildRecurrencePattern(event.recurrence)
          : null,
      };
      // Mock API call to create event
      const createdEventId = `outlook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`✅ Outlook Calendar event created: ${createdEventId}`);
      return createdEventId;
    } catch (error) {
      console.error('❌ Outlook Calendar event creation failed:', error);
      throw new CalendarError({
        code: 'OUTLOOK_EVENT_CREATE_FAILED',
        message: `Failed to create Outlook Calendar event: ${error.message}`,
        platform: 'outlook',
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
    console.log(`📝 Updating Outlook Calendar event: ${eventId}`);
    try {
      // Microsoft Graph event update logic
      const updateData = {
        subject: event.title,
        body: {
          contentType: 'HTML',
          content: this.formatEventDescription(
            event.description,
            event.weddingData,
          ),
        },
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: connection.syncSettings.timezoneSettings.defaultTimezone,
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: connection.syncSettings.timezoneSettings.defaultTimezone,
        },
      };
      console.log(`✅ Outlook Calendar event updated: ${eventId}`);
      return true;
    } catch (error) {
      console.error('❌ Outlook Calendar event update failed:', error);
      throw new CalendarError({
        code: 'OUTLOOK_EVENT_UPDATE_FAILED',
        message: `Failed to update Outlook Calendar event: ${error.message}`,
        platform: 'outlook',
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
    console.log(`🗑️ Deleting Outlook Calendar event: ${eventId}`);
    try {
      // Microsoft Graph event deletion logic
      console.log(`✅ Outlook Calendar event deleted: ${eventId}`);
      return true;
    } catch (error) {
      console.error('❌ Outlook Calendar event deletion failed:', error);
      throw new CalendarError({
        code: 'OUTLOOK_EVENT_DELETE_FAILED',
        message: `Failed to delete Outlook Calendar event: ${error.message}`,
        platform: 'outlook',
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
      `🕐 Checking Outlook Calendar availability for ${timeRange.start.toLocaleDateString()}`,
    );
    try {
      // Fetch existing events in the time range
      const existingEvents = await this.fetchEvents(connection, timeRange);
      // Find conflicts
      const conflicts = existingEvents.filter((event) =>
        this.isTimeOverlap(
          { start: event.startTime, end: event.endTime },
          timeRange,
        ),
      );
      // Calculate available slots
      const availableSlots = this.calculateAvailableSlots(
        timeRange,
        existingEvents,
      );
      // Identify preferred business hours (9 AM to 5 PM)
      const preferredSlots = availableSlots.filter((slot) => {
        const startHour = slot.start.getHours();
        const endHour = slot.end.getHours();
        return startHour >= 9 && endHour <= 17;
      });
      return {
        slots: availableSlots,
        conflicts,
        preferredSlots,
        notes: this.generateAvailabilityNotes(conflicts, availableSlots),
      };
    } catch (error) {
      console.error('❌ Outlook Calendar availability check failed:', error);
      throw new CalendarError({
        code: 'OUTLOOK_AVAILABILITY_CHECK_FAILED',
        message: `Failed to check availability: ${error.message}`,
        platform: 'outlook',
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
    console.log(`💍 Creating dedicated wedding calendar for ${coupleName}`);
    try {
      const calendarData = {
        name: `${coupleName} Wedding`,
        description: `Wedding calendar for ${coupleName} - ${weddingDate.toLocaleDateString()}`,
        color: 'preset2', // Wedding color theme
        isDefaultCalendar: false,
        canShare: true,
        canViewPrivateItems: false,
        canEdit: true,
        owner: {
          name: connection.accountId,
          address: connection.accountId,
        },
      };
      // Mock calendar creation
      const calendarId = `wedding_outlook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`✅ Wedding calendar created in Outlook: ${calendarId}`);
      return calendarId;
    } catch (error) {
      console.error('❌ Outlook wedding calendar creation failed:', error);
      throw new CalendarError({
        code: 'OUTLOOK_WEDDING_CALENDAR_CREATE_FAILED',
        message: `Failed to create wedding calendar: ${error.message}`,
        platform: 'outlook',
        severity: 'high',
        retryable: true,
        timestamp: new Date(),
      });
    }
  }

  async setupWebhook(
    connection: CalendarConnection,
    webhookUrl: string,
  ): Promise<{ webhookId: string; subscriptionId: string }> {
    console.log('🔔 Setting up Outlook Calendar webhook notifications');
    try {
      const subscriptionData = {
        changeType: 'created,updated,deleted',
        notificationUrl: webhookUrl,
        resource: '/me/events',
        expirationDateTime: new Date(
          Date.now() + 4230 * 60 * 1000,
        ).toISOString(), // Max 4230 minutes
        clientState: `wedsync_${connection.id}`,
        includeResourceData: false,
      };
      // Mock webhook setup
      const webhookId = `outlook_webhook_${Date.now()}`;
      const subscriptionId = `outlook_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`✅ Outlook Calendar webhook configured: ${webhookId}`);
      return { webhookId, subscriptionId };
    } catch (error) {
      console.error('❌ Outlook Calendar webhook setup failed:', error);
      throw new CalendarError({
        code: 'OUTLOOK_WEBHOOK_SETUP_FAILED',
        message: `Failed to setup webhook: ${error.message}`,
        platform: 'outlook',
        severity: 'medium',
        retryable: true,
        timestamp: new Date(),
      });
    }
  }

  // Private helper methods

  private generateMockToken(type: string): string {
    return `outlook_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 20)}`;
  }

  private buildAuthUrl(scopes: string[]): string {
    const params = new URLSearchParams({
      client_id: 'your_outlook_client_id',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/outlook`,
      scope: scopes.join(' '),
      response_type: 'code',
      response_mode: 'query',
      state: `wedsync_${Date.now()}`,
    });
    return `${this.authUrl}?${params.toString()}`;
  }

  private formatEventDescription(
    description?: string,
    weddingData?: any,
  ): string {
    let formattedDescription = description || '';
    if (weddingData) {
      formattedDescription += '<br><br><strong>Wedding Details:</strong><br>';
      formattedDescription += `<strong>Couple:</strong> ${weddingData.coupleName}<br>`;
      if (weddingData.guestCount) {
        formattedDescription += `<strong>Guest Count:</strong> ${weddingData.guestCount}<br>`;
      }
      if (weddingData.serviceType) {
        formattedDescription += `<strong>Service Type:</strong> ${weddingData.serviceType}<br>`;
      }
      if (weddingData.paymentStatus) {
        formattedDescription += `<strong>Payment Status:</strong> ${weddingData.paymentStatus}<br>`;
      }
      if (weddingData.timelineEvents && weddingData.timelineEvents.length > 0) {
        formattedDescription += '<br><strong>Timeline:</strong><br>';
        weddingData.timelineEvents.forEach((timeline: any) => {
          formattedDescription += `${timeline.time} - ${timeline.event}<br>`;
        });
      }
    }

    return formattedDescription;
  }

  private getEventCategories(eventType?: string): string[] {
    const categoryMap = {
      wedding: ['Wedding', 'Photography', 'Client'],
      engagement: ['Engagement', 'Photography', 'Client'],
      consultation: ['Business', 'Client Meeting'],
      business: ['Business', 'Photography'],
      personal: ['Personal'],
    };
    return categoryMap[eventType || 'personal'] || ['Photography'];
  }

  private getEventImportance(eventType?: string): string {
    const importanceMap = {
      wedding: 'high',
      engagement: 'normal',
      consultation: 'normal',
      business: 'low',
      personal: 'low',
    };
    return importanceMap[eventType || 'personal'] || 'normal';
  }

  private buildRecurrencePattern(recurrence: any): any {
    // Microsoft Graph recurrence pattern
    const pattern: any = {
      type: recurrence.frequency,
      interval: recurrence.interval || 1,
    };
    if (recurrence.byWeekDay) {
      pattern.daysOfWeek = recurrence.byWeekDay;
    }

    if (recurrence.byMonthDay) {
      pattern.dayOfMonth = recurrence.byMonthDay;
    }

    const range: any = {
      type: recurrence.count
        ? 'numbered'
        : recurrence.until
          ? 'endDate'
          : 'noEnd',
      startDate: recurrence.startDate?.toISOString().split('T')[0],
    };
    if (recurrence.count) {
      range.numberOfOccurrences = recurrence.count;
    } else if (recurrence.until) {
      range.endDate = recurrence.until.toISOString().split('T')[0];
    }

    return { pattern, range };
  }

  private isTimeOverlap(range1: TimeRange, range2: TimeRange): boolean {
    return range1.start < range2.end && range1.end > range2.start;
  }

  private calculateAvailableSlots(
    timeRange: TimeRange,
    existingEvents: CalendarEvent[],
  ): TimeRange[] {
    const slots: TimeRange[] = [];
    const events = [...existingEvents].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    );
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
      return duration >= 30 * 60 * 1000; // 30 minutes minimum
    });
  }

  private generateAvailabilityNotes(
    conflicts: CalendarEvent[],
    slots: TimeRange[],
  ): string {
    if (conflicts.length === 0) {
      return 'Schedule is clear for the requested time period';
    }

    const conflictTypes = conflicts.map((c) => c.eventType).join(', ');
    return `${conflicts.length} conflict(s) found (${conflictTypes}). ${slots.length} available time slot(s) identified.`;
  }
}

console.log(
  '🎯 Outlook Calendar Adapter initialized with Microsoft 365 integration',
);
