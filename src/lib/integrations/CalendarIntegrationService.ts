import axios, { AxiosResponse, AxiosError } from 'axios';
import { BaseIntegrationService } from './BaseIntegrationService';
import {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  CalendarEventInput,
  CalendarEvent,
  AvailabilityResult,
  IntegrationError,
  ErrorCategory,
} from '@/types/integrations';

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  htmlLink?: string;
  created?: string;
  updated?: string;
}

export class CalendarIntegrationService extends BaseIntegrationService {
  protected serviceName = 'google-calendar';

  constructor(config: IntegrationConfig, credentials: IntegrationCredentials) {
    // Validate Google Calendar specific configuration
    if (!config.apiUrl.includes('googleapis.com/calendar')) {
      throw new Error('Invalid Google Calendar API URL');
    }

    if (!credentials.accessToken) {
      throw new Error('Google Calendar access token is required');
    }

    super(config, credentials);
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/calendar/v3/calendars/primary');
      return response.success;
    } catch (error) {
      return false;
    }
  }

  async refreshToken(): Promise<string> {
    if (!this.credentials.refreshToken) {
      throw new IntegrationError(
        'Refresh token not available',
        'REFRESH_TOKEN_MISSING',
        ErrorCategory.AUTHENTICATION,
      );
    }

    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: this.credentials.refreshToken,
        grant_type: 'refresh_token',
      });

      return response.data.access_token;
    } catch (error) {
      throw new IntegrationError(
        'Failed to refresh access token',
        'TOKEN_REFRESH_FAILED',
        ErrorCategory.AUTHENTICATION,
        error as Error,
      );
    }
  }

  protected async makeRequest(
    endpoint: string,
    options: any = {},
  ): Promise<IntegrationResponse> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const method = options.method || 'GET';

    this.logRequest(method, endpoint, options.data);

    try {
      const response: AxiosResponse = await axios({
        url,
        method,
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        data: options.data,
        params: options.params,
        timeout: this.config.timeout,
      });

      this.logResponse(method, endpoint, response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const sanitizedError = this.sanitizeError(error);

      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          throw new IntegrationError(
            'Authentication failed',
            'AUTHENTICATION_FAILED',
            ErrorCategory.AUTHENTICATION,
            sanitizedError,
          );
        }

        if (error.response?.status === 429) {
          throw new IntegrationError(
            'Rate limit exceeded',
            'RATE_LIMIT_EXCEEDED',
            ErrorCategory.RATE_LIMIT,
            sanitizedError,
          );
        }

        if (error.response?.status >= 500) {
          throw new IntegrationError(
            'Google Calendar service unavailable',
            'SERVICE_UNAVAILABLE',
            ErrorCategory.EXTERNAL_API,
            sanitizedError,
          );
        }
      }

      throw new IntegrationError(
        'Calendar API request failed',
        'API_REQUEST_FAILED',
        ErrorCategory.EXTERNAL_API,
        sanitizedError,
      );
    }
  }

  // Event Management Methods
  async createEvent(
    eventInput: CalendarEventInput,
  ): Promise<IntegrationResponse<CalendarEvent>> {
    this.validateEventInput(eventInput);

    const googleEvent: GoogleCalendarEvent = {
      summary: this.sanitizeInput(eventInput.title),
      description: eventInput.description
        ? this.sanitizeInput(eventInput.description)
        : undefined,
      start: {
        dateTime: eventInput.startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: eventInput.endTime.toISOString(),
        timeZone: 'UTC',
      },
      location: eventInput.location
        ? this.sanitizeInput(eventInput.location)
        : undefined,
      attendees: eventInput.attendees?.map((attendee) => ({
        email: attendee.email,
        displayName: attendee.name,
      })),
    };

    try {
      const response = await this.makeRequestWithRetry(
        '/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          data: googleEvent,
        },
      );

      if (response.success) {
        const createdEvent = this.transformGoogleEvent(response.data);
        return {
          success: true,
          data: createdEvent,
        };
      }

      return response;
    } catch (error) {
      const categorized = this.categorizeError(error);
      return {
        success: false,
        error: categorized.userMessage,
      };
    }
  }

  async getEvents(
    startDate: Date,
    endDate: Date,
  ): Promise<IntegrationResponse<CalendarEvent[]>> {
    this.validateDateRange(startDate, endDate);

    try {
      const response = await this.makeRequestWithRetry(
        '/calendar/v3/calendars/primary/events',
        {
          params: {
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
          },
        },
      );

      if (response.success && response.data.items) {
        const events = response.data.items.map((item: any) =>
          this.transformGoogleEvent(item),
        );
        return {
          success: true,
          data: events,
        };
      }

      return {
        success: true,
        data: [],
      };
    } catch (error) {
      const categorized = this.categorizeError(error);
      return {
        success: false,
        error: categorized.userMessage,
      };
    }
  }

  async updateEvent(
    eventId: string,
    updates: Partial<CalendarEventInput>,
  ): Promise<IntegrationResponse<CalendarEvent>> {
    if (!eventId) {
      throw new Error('Event ID is required for updates');
    }

    // Get current event first
    try {
      const currentResponse = await this.makeRequestWithRetry(
        `/calendar/v3/calendars/primary/events/${eventId}`,
      );

      if (!currentResponse.success) {
        return {
          success: false,
          error: 'Event not found',
        };
      }

      const currentEvent = currentResponse.data;
      const updatedEvent: Partial<GoogleCalendarEvent> = {
        ...currentEvent,
      };

      // Apply updates
      if (updates.title)
        updatedEvent.summary = this.sanitizeInput(updates.title);
      if (updates.description !== undefined)
        updatedEvent.description = updates.description
          ? this.sanitizeInput(updates.description)
          : undefined;
      if (updates.startTime) {
        updatedEvent.start = {
          dateTime: updates.startTime.toISOString(),
          timeZone: 'UTC',
        };
      }
      if (updates.endTime) {
        updatedEvent.end = {
          dateTime: updates.endTime.toISOString(),
          timeZone: 'UTC',
        };
      }
      if (updates.location !== undefined)
        updatedEvent.location = updates.location
          ? this.sanitizeInput(updates.location)
          : undefined;
      if (updates.attendees) {
        updatedEvent.attendees = updates.attendees.map((attendee) => ({
          email: attendee.email,
          displayName: attendee.name,
        }));
      }

      const response = await this.makeRequestWithRetry(
        `/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'PUT',
          data: updatedEvent,
        },
      );

      if (response.success) {
        const event = this.transformGoogleEvent(response.data);
        return {
          success: true,
          data: event,
        };
      }

      return response;
    } catch (error) {
      const categorized = this.categorizeError(error);
      return {
        success: false,
        error: categorized.userMessage,
      };
    }
  }

  async deleteEvent(
    eventId: string,
  ): Promise<IntegrationResponse<{ deleted: boolean }>> {
    if (!eventId) {
      throw new Error('Event ID is required for deletion');
    }

    try {
      const response = await this.makeRequestWithRetry(
        `/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'DELETE',
        },
      );

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      const categorized = this.categorizeError(error);
      return {
        success: false,
        error: categorized.userMessage,
      };
    }
  }

  async checkAvailability(
    calendars: string[],
    startTime: Date,
    endTime: Date,
  ): Promise<IntegrationResponse<AvailabilityResult>> {
    if (calendars.length === 0) {
      throw new Error('At least one calendar is required');
    }

    if (calendars.length > 20) {
      throw new Error('Too many calendars (max 20)');
    }

    try {
      const response = await this.makeRequestWithRetry(
        '/calendar/v3/freeBusy',
        {
          method: 'POST',
          data: {
            timeMin: startTime.toISOString(),
            timeMax: endTime.toISOString(),
            items: calendars.map((id) => ({ id })),
          },
        },
      );

      if (response.success) {
        const busyTimes: Array<{ start: string; end: string }> = [];

        // Collect all busy times from all calendars
        Object.values(response.data.calendars || {}).forEach(
          (calendar: any) => {
            if (calendar.busy) {
              busyTimes.push(...calendar.busy);
            }
          },
        );

        // Calculate available times (simplified implementation)
        const available = this.calculateAvailableSlots(
          startTime,
          endTime,
          busyTimes,
        );

        return {
          success: true,
          data: {
            busy: busyTimes,
            available,
          },
        };
      }

      return response;
    } catch (error) {
      const categorized = this.categorizeError(error);
      return {
        success: false,
        error: categorized.userMessage,
      };
    }
  }

  // Validation Methods
  private validateEventInput(eventInput: CalendarEventInput): void {
    if (!eventInput.title || eventInput.title.trim().length === 0) {
      throw new Error('Event title is required');
    }

    if (!eventInput.startTime || !eventInput.endTime) {
      throw new Error('Event start and end times are required');
    }

    if (eventInput.endTime <= eventInput.startTime) {
      throw new Error('Event end time must be after start time');
    }

    if (eventInput.attendees && eventInput.attendees.length > 100) {
      throw new Error('Too many attendees (max 100)');
    }

    if (eventInput.attendees) {
      eventInput.attendees.forEach((attendee) => {
        if (!this.isValidEmail(attendee.email)) {
          throw new Error('Invalid attendee email format');
        }
      });
    }
  }

  private validateDateRange(startDate: Date, endDate: Date): void {
    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }

    const daysDiff =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      throw new Error('Date range cannot exceed 1 year');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Helper Methods
  private sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  private transformGoogleEvent(googleEvent: any): CalendarEvent {
    return {
      id: googleEvent.id,
      title: googleEvent.summary || '',
      description: googleEvent.description,
      startTime: new Date(
        googleEvent.start?.dateTime || googleEvent.start?.date,
      ),
      endTime: new Date(googleEvent.end?.dateTime || googleEvent.end?.date),
      location: googleEvent.location,
      attendees: googleEvent.attendees?.map((attendee: any) => ({
        email: attendee.email,
        name: attendee.displayName,
      })),
      htmlLink: googleEvent.htmlLink,
      created: googleEvent.created ? new Date(googleEvent.created) : undefined,
      updated: googleEvent.updated ? new Date(googleEvent.updated) : undefined,
      source: 'google-calendar',
    };
  }

  private calculateAvailableSlots(
    startTime: Date,
    endTime: Date,
    busyTimes: Array<{ start: string; end: string }>,
  ): Array<{ start: string; end: string }> {
    // Sort busy times by start time
    const sortedBusy = busyTimes
      .map((busy) => ({
        start: new Date(busy.start),
        end: new Date(busy.end),
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const available: Array<{ start: string; end: string }> = [];
    let currentTime = new Date(startTime);

    for (const busySlot of sortedBusy) {
      if (currentTime < busySlot.start) {
        available.push({
          start: currentTime.toISOString(),
          end: busySlot.start.toISOString(),
        });
      }
      currentTime = new Date(
        Math.max(currentTime.getTime(), busySlot.end.getTime()),
      );
    }

    // Add remaining time after last busy slot
    if (currentTime < endTime) {
      available.push({
        start: currentTime.toISOString(),
        end: endTime.toISOString(),
      });
    }

    return available;
  }
}
