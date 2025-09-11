/**
 * Calendar Integration Service
 * WS-064: Meeting Scheduler - Calendar sync with Google Calendar and Outlook
 *
 * This service handles:
 * - OAuth authentication for Google Calendar and Outlook
 * - Bidirectional sync of calendar events
 * - Token management and refresh
 * - Event creation, updates, and deletion
 * - Timezone handling and conversion
 * - Conflict detection and resolution
 */

import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';

// Types
export interface CalendarProvider {
  id: string;
  name: string;
  type: 'google' | 'outlook' | 'apple';
  authUrl: string;
  scopes: string[];
}

export interface CalendarIntegration {
  id: string;
  supplier_id: string;
  booking_page_id: string;
  provider: 'google' | 'outlook' | 'apple';
  calendar_id: string;
  calendar_name: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  is_active: boolean;
  sync_direction: 'push_only' | 'pull_only' | 'bidirectional';
  last_sync_at?: string;
  sync_errors: any[];
  event_title_template: string;
}

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  start: string; // ISO string
  end: string; // ISO string
  timezone: string;
  location?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    status?: 'accepted' | 'declined' | 'tentative';
  }>;
  meeting_url?: string;
  created_by: 'system' | 'user';
  booking_id?: string;
  provider_event_id?: string;
}

export interface SyncResult {
  success: boolean;
  events_created: number;
  events_updated: number;
  events_deleted: number;
  errors: string[];
  last_sync_token?: string;
}

// Configuration
const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const MICROSOFT_GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const ENCRYPTION_KEY =
  process.env.CALENDAR_ENCRYPTION_KEY || 'fallback-key-change-in-production';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Calendar Service Class
 */
export class CalendarService {
  private integration: CalendarIntegration;

  constructor(integration: CalendarIntegration) {
    this.integration = integration;
  }

  /**
   * Static Methods - Provider Management
   */
  static getProviders(): CalendarProvider[] {
    return [
      {
        id: 'google',
        name: 'Google Calendar',
        type: 'google',
        authUrl: '/api/auth/google-calendar',
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
        ],
      },
      {
        id: 'outlook',
        name: 'Outlook Calendar',
        type: 'outlook',
        authUrl: '/api/auth/outlook-calendar',
        scopes: [
          'https://graph.microsoft.com/calendars.readwrite',
          'https://graph.microsoft.com/user.read',
        ],
      },
    ];
  }

  /**
   * Create a new calendar integration
   */
  static async createIntegration(
    supplierId: string,
    bookingPageId: string,
    provider: 'google' | 'outlook',
    authCode: string,
    calendarId?: string,
  ): Promise<CalendarIntegration> {
    try {
      // Exchange auth code for tokens
      const tokenData = await this.exchangeAuthCode(provider, authCode);

      // Get calendar info
      const calendarInfo = await this.getCalendarInfo(
        provider,
        tokenData.access_token,
        calendarId,
      );

      // Encrypt tokens
      const encryptedAccessToken = this.encryptToken(tokenData.access_token);
      const encryptedRefreshToken = this.encryptToken(tokenData.refresh_token);

      // Save to database
      const { data, error } = await supabase
        .from('calendar_integrations')
        .insert({
          supplier_id: supplierId,
          booking_page_id: bookingPageId,
          provider,
          calendar_id: calendarInfo.id,
          calendar_name: calendarInfo.name,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: new Date(
            Date.now() + tokenData.expires_in * 1000,
          ).toISOString(),
          is_active: true,
          sync_direction: 'bidirectional',
          event_title_template: 'Meeting with {client_name}',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to create calendar integration:', error);
      throw new Error(
        `Failed to create ${provider} integration: ${error.message}`,
      );
    }
  }

  /**
   * Get all integrations for a supplier
   */
  static async getIntegrations(
    supplierId: string,
  ): Promise<CalendarIntegration[]> {
    const { data, error } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  /**
   * Token Management
   */
  private static encryptToken(token: string): string {
    return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
  }

  private static decryptToken(encryptedToken: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  private async getAccessToken(): Promise<string> {
    // Check if token is expired
    const expiresAt = new Date(this.integration.token_expires_at);
    const now = new Date();
    const bufferMinutes = 10; // Refresh 10 minutes early

    if (now.getTime() > expiresAt.getTime() - bufferMinutes * 60 * 1000) {
      await this.refreshAccessToken();
    }

    return CalendarService.decryptToken(
      this.integration.access_token_encrypted,
    );
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      const refreshToken = CalendarService.decryptToken(
        this.integration.refresh_token_encrypted,
      );
      const tokenData = await CalendarService.refreshToken(
        this.integration.provider,
        refreshToken,
      );

      // Update integration with new tokens
      const { error } = await supabase
        .from('calendar_integrations')
        .update({
          access_token_encrypted: CalendarService.encryptToken(
            tokenData.access_token,
          ),
          token_expires_at: new Date(
            Date.now() + tokenData.expires_in * 1000,
          ).toISOString(),
          ...(tokenData.refresh_token && {
            refresh_token_encrypted: CalendarService.encryptToken(
              tokenData.refresh_token,
            ),
          }),
        })
        .eq('id', this.integration.id);

      if (error) throw error;

      // Update local integration
      this.integration.access_token_encrypted = CalendarService.encryptToken(
        tokenData.access_token,
      );
      this.integration.token_expires_at = new Date(
        Date.now() + tokenData.expires_in * 1000,
      ).toISOString();
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw new Error(
        `Failed to refresh ${this.integration.provider} access token`,
      );
    }
  }

  /**
   * OAuth Helper Methods
   */
  private static async exchangeAuthCode(
    provider: 'google' | 'outlook',
    authCode: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch(`/api/calendar/${provider}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: authCode }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange auth code: ${response.statusText}`);
    }

    return response.json();
  }

  private static async refreshToken(
    provider: 'google' | 'outlook',
    refreshToken: string,
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
    const response = await fetch(`/api/calendar/${provider}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    return response.json();
  }

  private static async getCalendarInfo(
    provider: 'google' | 'outlook',
    accessToken: string,
    calendarId?: string,
  ): Promise<{ id: string; name: string }> {
    if (provider === 'google') {
      const url = calendarId
        ? `${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}`
        : `${GOOGLE_CALENDAR_API_BASE}/calendars/primary`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok)
        throw new Error(`Failed to get calendar info: ${response.statusText}`);

      const calendar = await response.json();
      return { id: calendar.id, name: calendar.summary };
    } else {
      // Microsoft Graph
      const url = calendarId
        ? `${MICROSOFT_GRAPH_API_BASE}/me/calendars/${calendarId}`
        : `${MICROSOFT_GRAPH_API_BASE}/me/calendar`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok)
        throw new Error(`Failed to get calendar info: ${response.statusText}`);

      const calendar = await response.json();
      return { id: calendar.id, name: calendar.name };
    }
  }

  /**
   * Event Management
   */
  async createEvent(event: CalendarEvent): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();

      if (this.integration.provider === 'google') {
        return await this.createGoogleEvent(accessToken, event);
      } else if (this.integration.provider === 'outlook') {
        return await this.createOutlookEvent(accessToken, event);
      }

      throw new Error(`Unsupported provider: ${this.integration.provider}`);
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      await this.logSyncError(`Failed to create event: ${error.message}`);
      throw error;
    }
  }

  async updateEvent(eventId: string, event: CalendarEvent): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      if (this.integration.provider === 'google') {
        await this.updateGoogleEvent(accessToken, eventId, event);
      } else if (this.integration.provider === 'outlook') {
        await this.updateOutlookEvent(accessToken, eventId, event);
      } else {
        throw new Error(`Unsupported provider: ${this.integration.provider}`);
      }
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      await this.logSyncError(
        `Failed to update event ${eventId}: ${error.message}`,
      );
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      if (this.integration.provider === 'google') {
        await this.deleteGoogleEvent(accessToken, eventId);
      } else if (this.integration.provider === 'outlook') {
        await this.deleteOutlookEvent(accessToken, eventId);
      } else {
        throw new Error(`Unsupported provider: ${this.integration.provider}`);
      }
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      await this.logSyncError(
        `Failed to delete event ${eventId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Google Calendar Specific Methods
   */
  private async createGoogleEvent(
    accessToken: string,
    event: CalendarEvent,
  ): Promise<string> {
    const googleEvent = {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.start,
        timeZone: event.timezone,
      },
      end: {
        dateTime: event.end,
        timeZone: event.timezone,
      },
      location: event.location,
      attendees: event.attendees?.map((attendee) => ({
        email: attendee.email,
        displayName: attendee.name,
      })),
      conferenceData: event.meeting_url
        ? {
            createRequest: {
              requestId: `booking-${event.booking_id}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          }
        : undefined,
    };

    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(this.integration.calendar_id)}/events?conferenceDataVersion=1`,
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

    const result = await response.json();
    return result.id;
  }

  private async updateGoogleEvent(
    accessToken: string,
    eventId: string,
    event: CalendarEvent,
  ): Promise<void> {
    const googleEvent = {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.start,
        timeZone: event.timezone,
      },
      end: {
        dateTime: event.end,
        timeZone: event.timezone,
      },
      location: event.location,
      attendees: event.attendees?.map((attendee) => ({
        email: attendee.email,
        displayName: attendee.name,
      })),
    };

    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(this.integration.calendar_id)}/events/${eventId}`,
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
  }

  private async deleteGoogleEvent(
    accessToken: string,
    eventId: string,
  ): Promise<void> {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(this.integration.calendar_id)}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok && response.status !== 410) {
      // 410 = Already deleted
      throw new Error(`Google Calendar API error: ${response.statusText}`);
    }
  }

  /**
   * Outlook Calendar Specific Methods
   */
  private async createOutlookEvent(
    accessToken: string,
    event: CalendarEvent,
  ): Promise<string> {
    const outlookEvent = {
      subject: event.title,
      body: {
        contentType: 'text',
        content: event.description || '',
      },
      start: {
        dateTime: event.start,
        timeZone: event.timezone,
      },
      end: {
        dateTime: event.end,
        timeZone: event.timezone,
      },
      location: event.location
        ? {
            displayName: event.location,
          }
        : undefined,
      attendees: event.attendees?.map((attendee) => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.name,
        },
        type: 'required',
      })),
      isOnlineMeeting: !!event.meeting_url,
      onlineMeetingProvider: event.meeting_url ? 'teamsForBusiness' : undefined,
    };

    const calendarEndpoint =
      this.integration.calendar_id === 'primary'
        ? `${MICROSOFT_GRAPH_API_BASE}/me/events`
        : `${MICROSOFT_GRAPH_API_BASE}/me/calendars/${this.integration.calendar_id}/events`;

    const response = await fetch(calendarEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(outlookEvent),
    });

    if (!response.ok) {
      throw new Error(`Microsoft Graph API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id;
  }

  private async updateOutlookEvent(
    accessToken: string,
    eventId: string,
    event: CalendarEvent,
  ): Promise<void> {
    const outlookEvent = {
      subject: event.title,
      body: {
        contentType: 'text',
        content: event.description || '',
      },
      start: {
        dateTime: event.start,
        timeZone: event.timezone,
      },
      end: {
        dateTime: event.end,
        timeZone: event.timezone,
      },
      location: event.location
        ? {
            displayName: event.location,
          }
        : undefined,
      attendees: event.attendees?.map((attendee) => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.name,
        },
        type: 'required',
      })),
    };

    const response = await fetch(
      `${MICROSOFT_GRAPH_API_BASE}/me/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(outlookEvent),
      },
    );

    if (!response.ok) {
      throw new Error(`Microsoft Graph API error: ${response.statusText}`);
    }
  }

  private async deleteOutlookEvent(
    accessToken: string,
    eventId: string,
  ): Promise<void> {
    const response = await fetch(
      `${MICROSOFT_GRAPH_API_BASE}/me/events/${eventId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok && response.status !== 404) {
      // 404 = Already deleted
      throw new Error(`Microsoft Graph API error: ${response.statusText}`);
    }
  }

  /**
   * Sync Operations
   */
  async syncBookingToCalendar(bookingData: {
    id: string;
    client_name: string;
    client_email: string;
    scheduled_at: string;
    duration_minutes: number;
    meeting_type_name: string;
    meeting_location: string;
    special_requirements?: string;
    timezone: string;
  }): Promise<string> {
    const event: CalendarEvent = {
      title: this.integration.event_title_template.replace(
        '{client_name}',
        bookingData.client_name,
      ),
      description: this.buildEventDescription(bookingData),
      start: bookingData.scheduled_at,
      end: new Date(
        new Date(bookingData.scheduled_at).getTime() +
          bookingData.duration_minutes * 60000,
      ).toISOString(),
      timezone: bookingData.timezone,
      location: bookingData.meeting_location,
      attendees: [
        {
          email: bookingData.client_email,
          name: bookingData.client_name,
          status: 'accepted',
        },
      ],
      created_by: 'system',
      booking_id: bookingData.id,
    };

    return await this.createEvent(event);
  }

  async updateBookingInCalendar(
    eventId: string,
    bookingData: any,
  ): Promise<void> {
    const event: CalendarEvent = {
      title: this.integration.event_title_template.replace(
        '{client_name}',
        bookingData.client_name,
      ),
      description: this.buildEventDescription(bookingData),
      start: bookingData.scheduled_at,
      end: new Date(
        new Date(bookingData.scheduled_at).getTime() +
          bookingData.duration_minutes * 60000,
      ).toISOString(),
      timezone: bookingData.timezone,
      location: bookingData.meeting_location,
      attendees: [
        {
          email: bookingData.client_email,
          name: bookingData.client_name,
          status: 'accepted',
        },
      ],
      created_by: 'system',
      booking_id: bookingData.id,
    };

    await this.updateEvent(eventId, event);
  }

  async removeBookingFromCalendar(eventId: string): Promise<void> {
    await this.deleteEvent(eventId);
  }

  /**
   * Utility Methods
   */
  private buildEventDescription(bookingData: any): string {
    let description = `Meeting: ${bookingData.meeting_type_name}\n`;
    description += `Client: ${bookingData.client_name} (${bookingData.client_email})\n`;
    description += `Duration: ${bookingData.duration_minutes} minutes\n`;

    if (bookingData.special_requirements) {
      description += `\nSpecial Requirements:\n${bookingData.special_requirements}`;
    }

    description += '\n\nThis meeting was created automatically by WedSync.';
    return description;
  }

  private async logSyncError(error: string): Promise<void> {
    try {
      const { error: dbError } = await supabase
        .from('calendar_integrations')
        .update({
          sync_errors: [
            ...(this.integration.sync_errors || []),
            {
              timestamp: new Date().toISOString(),
              error: error,
            },
          ],
        })
        .eq('id', this.integration.id);

      if (dbError) {
        console.error('Failed to log sync error:', dbError);
      }
    } catch (err) {
      console.error('Failed to log sync error:', err);
    }
  }

  /**
   * Health Check
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const accessToken = await this.getAccessToken();

      if (this.integration.provider === 'google') {
        const response = await fetch(
          `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(this.integration.calendar_id)}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        if (!response.ok) {
          throw new Error(`Google Calendar API error: ${response.statusText}`);
        }
      } else if (this.integration.provider === 'outlook') {
        const endpoint =
          this.integration.calendar_id === 'primary'
            ? `${MICROSOFT_GRAPH_API_BASE}/me/calendar`
            : `${MICROSOFT_GRAPH_API_BASE}/me/calendars/${this.integration.calendar_id}`;

        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          throw new Error(`Microsoft Graph API error: ${response.statusText}`);
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Connection test failed',
      };
    }
  }
}

/**
 * Helper Functions
 */

/**
 * Create calendar service instance for a supplier
 */
export async function getCalendarService(
  supplierId: string,
  bookingPageId?: string,
): Promise<CalendarService[]> {
  const query = supabase
    .from('calendar_integrations')
    .select('*')
    .eq('supplier_id', supplierId)
    .eq('is_active', true);

  if (bookingPageId) {
    query.eq('booking_page_id', bookingPageId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((integration) => new CalendarService(integration));
}

/**
 * Sync a booking to all active calendar integrations
 */
export async function syncBookingToCalendars(
  supplierId: string,
  bookingPageId: string,
  bookingData: any,
): Promise<{
  success: boolean;
  results: Array<{
    provider: string;
    success: boolean;
    eventId?: string;
    error?: string;
  }>;
}> {
  const services = await getCalendarService(supplierId, bookingPageId);
  const results = [];

  for (const service of services) {
    try {
      const eventId = await service.syncBookingToCalendar(bookingData);
      results.push({
        provider: service['integration'].provider,
        success: true,
        eventId,
      });
    } catch (error) {
      results.push({
        provider: service['integration'].provider,
        success: false,
        error: error.message,
      });
    }
  }

  const allSuccess = results.every((r) => r.success);
  return { success: allSuccess, results };
}

/**
 * Remove booking from all calendars
 */
export async function removeBookingFromCalendars(
  supplierId: string,
  eventIds: Record<string, string>, // provider -> eventId mapping
): Promise<{
  success: boolean;
  results: Array<{ provider: string; success: boolean; error?: string }>;
}> {
  const services = await getCalendarService(supplierId);
  const results = [];

  for (const service of services) {
    const provider = service['integration'].provider;
    const eventId = eventIds[provider];

    if (!eventId) continue;

    try {
      await service.removeBookingFromCalendar(eventId);
      results.push({ provider, success: true });
    } catch (error) {
      results.push({ provider, success: false, error: error.message });
    }
  }

  const allSuccess = results.every((r) => r.success);
  return { success: allSuccess, results };
}

export default CalendarService;
