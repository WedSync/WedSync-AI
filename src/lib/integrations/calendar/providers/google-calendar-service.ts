// WS-336 Enhanced Google Calendar Service
// Production-ready Google Calendar integration with batch operations

import { google, calendar_v3 } from 'googleapis';
import {
  BaseCalendarService,
  CalendarService,
  ProviderCredentials,
  AccessTokens,
  Calendar,
  EventQuery,
  CalendarChangeSet,
} from '../base-calendar-service';
import {
  CalendarProvider,
  CalendarConnection,
  CalendarEvent,
  UnifiedWeddingEvent,
  TimeRange,
  BatchResult,
  WebhookSubscription,
  HealthStatus,
  RateLimitResult,
} from '../types';

interface GoogleRateLimitInfo {
  requestsMade: number;
  remainingRequests: number;
  resetTime: number;
  burstUsed: number;
}

export class GoogleCalendarService
  extends BaseCalendarService
  implements CalendarService
{
  provider: CalendarProvider = 'google';

  private calendar: calendar_v3.Calendar;
  private rateLimitInfo: Map<string, GoogleRateLimitInfo> = new Map();

  // Google Calendar API Rate Limits
  private static readonly RATE_LIMIT = {
    QUERIES_PER_USER: 250,
    WINDOW_MS: 100000, // 100 seconds
    BURST_ALLOWANCE: 50,
    BATCH_SIZE: 100, // Google allows up to 100 requests per batch
  };

  constructor() {
    super();
    this.calendar = google.calendar('v3');
    console.log(
      '📅 Enhanced Google Calendar service initialized for wedding timeline management',
    );
  }

  async authorize(credentials: ProviderCredentials): Promise<AccessTokens> {
    console.log('🔐 Initiating Google Calendar OAuth2 PKCE authentication');

    try {
      const oauth2Client = new google.auth.OAuth2(
        credentials.clientId,
        credentials.clientSecret,
        credentials.redirectUri,
      );

      // The authorization URL should be generated elsewhere, this returns tokens from code
      // This would typically be called after receiving the authorization code
      throw new Error('Use PKCE flow implementation from oauth-pkce.ts');
    } catch (error) {
      console.error('❌ Google Calendar authentication failed:', error);
      throw new Error(
        `Google Calendar authentication failed: ${error.message}`,
      );
    }
  }

  async refreshTokens(refreshToken: string): Promise<AccessTokens> {
    console.log('🔄 Refreshing Google Calendar access tokens');

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
        process.env.GOOGLE_CALENDAR_REDIRECT_URI,
      );

      oauth2Client.setCredentials({ refresh_token: refreshToken });

      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('No access token received from refresh');
      }

      return {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || refreshToken,
        expiresIn: credentials.expiry_date
          ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
          : 3600,
        tokenType: 'Bearer',
      };
    } catch (error) {
      console.error('❌ Google Calendar token refresh failed:', error);
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  async listCalendars(connection: CalendarConnection): Promise<Calendar[]> {
    console.log('📋 Fetching Google Calendar list');

    await this.waitForRateLimit(connection);

    try {
      const oauth2Client = this.createOAuth2Client(connection);
      this.calendar.auth = oauth2Client;

      const response = await this.calendar.calendarList.list({
        minAccessRole: 'writer', // Only calendars where we can create/edit events
      });

      return (response.data.items || []).map((cal) => ({
        id: cal.id!,
        name: cal.summary!,
        description: cal.description,
        timezone: cal.timeZone!,
        primary: cal.primary || false,
        accessRole: cal.accessRole!,
      }));
    } catch (error) {
      await this.handleGoogleApiError(error, connection);
      throw error;
    }
  }

  async getEvents(
    connection: CalendarConnection,
    options: EventQuery,
  ): Promise<CalendarEvent[]> {
    console.log('📅 Fetching Google Calendar events');

    await this.waitForRateLimit(connection);

    try {
      const oauth2Client = this.createOAuth2Client(connection);
      this.calendar.auth = oauth2Client;

      const response = await this.calendar.events.list({
        calendarId: connection.calendarId,
        timeMin: options.timeMin?.toISOString(),
        timeMax: options.timeMax?.toISOString(),
        maxResults: options.maxResults || 2500,
        showDeleted: options.showDeleted || false,
        singleEvents: options.singleEvents !== false,
        orderBy: options.orderBy === 'updated' ? 'updated' : 'startTime',
        syncToken: options.syncToken,
      });

      return (response.data.items || [])
        .filter((event) => this.isWeddingRelatedEvent(event))
        .map((event) => this.transformGoogleEventToCalendarEvent(event));
    } catch (error) {
      if (error.code === 410 && options.syncToken) {
        // Sync token expired, retry without it
        console.log('🔄 Sync token expired, performing full sync');
        return this.getEvents(connection, { ...options, syncToken: undefined });
      }

      await this.handleGoogleApiError(error, connection);
      throw error;
    }
  }

  async createEvent(
    connection: CalendarConnection,
    event: CalendarEvent,
  ): Promise<string> {
    console.log(`📝 Creating Google Calendar event: ${event.title}`);

    await this.waitForRateLimit(connection);

    try {
      const oauth2Client = this.createOAuth2Client(connection);
      this.calendar.auth = oauth2Client;

      const googleEvent = this.transformCalendarEventToGoogle(event);

      const response = await this.calendar.events.insert({
        calendarId: connection.calendarId,
        requestBody: googleEvent,
        conferenceDataVersion: 1, // Enable Google Meet integration
        supportsAttachments: true,
      });

      console.log(`✅ Google Calendar event created: ${response.data.id}`);
      return response.data.id!;
    } catch (error) {
      await this.handleGoogleApiError(error, connection);
      throw error;
    }
  }

  async updateEvent(
    connection: CalendarConnection,
    eventId: string,
    event: Partial<CalendarEvent>,
  ): Promise<void> {
    console.log(`📝 Updating Google Calendar event: ${eventId}`);

    await this.waitForRateLimit(connection);

    try {
      const oauth2Client = this.createOAuth2Client(connection);
      this.calendar.auth = oauth2Client;

      const googleEvent = this.transformCalendarEventToGoogle(
        event as CalendarEvent,
      );

      await this.calendar.events.patch({
        calendarId: connection.calendarId,
        eventId: eventId,
        requestBody: googleEvent,
      });

      console.log(`✅ Google Calendar event updated: ${eventId}`);
    } catch (error) {
      await this.handleGoogleApiError(error, connection);
      throw error;
    }
  }

  async deleteEvent(
    connection: CalendarConnection,
    eventId: string,
  ): Promise<void> {
    console.log(`🗑️ Deleting Google Calendar event: ${eventId}`);

    await this.waitForRateLimit(connection);

    try {
      const oauth2Client = this.createOAuth2Client(connection);
      this.calendar.auth = oauth2Client;

      await this.calendar.events.delete({
        calendarId: connection.calendarId,
        eventId: eventId,
      });

      console.log(`✅ Google Calendar event deleted: ${eventId}`);
    } catch (error) {
      await this.handleGoogleApiError(error, connection);
      throw error;
    }
  }

  /**
   * ENHANCED BATCH OPERATIONS FOR WEDDING TIMELINE SYNC
   * Uses Google Calendar Batch API for efficient multi-event operations
   */
  async batchCreateEvents(
    connection: CalendarConnection,
    events: CalendarEvent[],
  ): Promise<BatchResult> {
    console.log(`📦 Batch creating ${events.length} Google Calendar events`);

    const result: BatchResult = {
      successful: [],
      failed: [],
      totalProcessed: events.length,
    };

    // Split into batches of 100 (Google's limit)
    const batches = this.chunkArray(
      events,
      GoogleCalendarService.RATE_LIMIT.BATCH_SIZE,
    );

    for (const batch of batches) {
      await this.waitForRateLimit(connection);

      try {
        const batchResult = await this.executeBatchCreate(connection, batch);
        result.successful.push(...batchResult.successful);
        result.failed.push(...batchResult.failed);
      } catch (error) {
        // If batch fails, fall back to individual creates
        console.warn(
          'Batch create failed, falling back to individual creates:',
          error,
        );
        const fallbackResult = await super.batchCreateEvents(connection, batch);
        result.successful.push(...fallbackResult.successful);
        result.failed.push(...fallbackResult.failed);
      }
    }

    console.log(
      `✅ Batch create complete: ${result.successful.length} successful, ${result.failed.length} failed`,
    );
    return result;
  }

  async batchUpdateEvents(
    connection: CalendarConnection,
    updates: Array<{ eventId: string; changes: Partial<CalendarEvent> }>,
  ): Promise<BatchResult> {
    console.log(`📦 Batch updating ${updates.length} Google Calendar events`);

    const result: BatchResult = {
      successful: [],
      failed: [],
      totalProcessed: updates.length,
    };

    const batches = this.chunkArray(
      updates,
      GoogleCalendarService.RATE_LIMIT.BATCH_SIZE,
    );

    for (const batch of batches) {
      await this.waitForRateLimit(connection);

      try {
        const batchResult = await this.executeBatchUpdate(connection, batch);
        result.successful.push(...batchResult.successful);
        result.failed.push(...batchResult.failed);
      } catch (error) {
        console.warn(
          'Batch update failed, falling back to individual updates:',
          error,
        );
        const fallbackResult = await super.batchUpdateEvents(connection, batch);
        result.successful.push(...fallbackResult.successful);
        result.failed.push(...fallbackResult.failed);
      }
    }

    return result;
  }

  /**
   * INCREMENTAL SYNC FOR EFFICIENT CHANGE DETECTION
   */
  async getIncrementalChanges(
    connection: CalendarConnection,
    syncToken?: string,
  ): Promise<CalendarChangeSet> {
    console.log('🔄 Getting incremental changes from Google Calendar');

    await this.waitForRateLimit(connection);

    try {
      const oauth2Client = this.createOAuth2Client(connection);
      this.calendar.auth = oauth2Client;

      const response = await this.calendar.events.list({
        calendarId: connection.calendarId,
        syncToken: syncToken,
        showDeleted: true,
        singleEvents: true,
        maxResults: 2500,
      });

      const events = (response.data.items || [])
        .filter((event) => this.isWeddingRelatedEvent(event))
        .map((event) => this.transformGoogleEventToCalendarEvent(event));

      return {
        events,
        hasMore: !!response.data.nextPageToken,
        nextPageToken: response.data.nextPageToken,
        syncToken: response.data.nextSyncToken,
      };
    } catch (error) {
      if (error.code === 410) {
        // Sync token expired, return empty changeset to trigger full sync
        console.log('🔄 Sync token expired, full sync required');
        return {
          events: [],
          hasMore: false,
          syncToken: undefined,
        };
      }

      await this.handleGoogleApiError(error, connection);
      throw error;
    }
  }

  /**
   * WEBHOOK SUBSCRIPTION MANAGEMENT
   */
  async subscribeToChanges(
    connection: CalendarConnection,
    webhookUrl: string,
  ): Promise<WebhookSubscription> {
    console.log('🔔 Setting up Google Calendar webhook subscription');

    await this.waitForRateLimit(connection);

    try {
      const oauth2Client = this.createOAuth2Client(connection);
      this.calendar.auth = oauth2Client;

      const channelId = `wedsync_${connection.id}_${Date.now()}`;
      const resourceId = `${connection.calendarId}_events`;

      const response = await this.calendar.events.watch({
        calendarId: connection.calendarId,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          params: {
            ttl: '86400000', // 24 hours in milliseconds
          },
        },
      });

      console.log(`✅ Google Calendar webhook configured: ${channelId}`);

      return {
        webhookId: channelId,
        channelId: channelId,
        resourceId: response.data.resourceId,
        expirationTime: response.data.expiration
          ? new Date(parseInt(response.data.expiration))
          : undefined,
        provider: 'google',
      };
    } catch (error) {
      await this.handleGoogleApiError(error, connection);
      throw error;
    }
  }

  async unsubscribeFromChanges(subscriptionId: string): Promise<void> {
    console.log(
      `🔕 Unsubscribing from Google Calendar webhook: ${subscriptionId}`,
    );

    try {
      // Note: This requires the resource ID which should be stored when creating the subscription
      await this.calendar.channels.stop({
        requestBody: {
          id: subscriptionId,
          resourceId: subscriptionId, // This should be the actual resource ID
        },
      });

      console.log(`✅ Google Calendar webhook unsubscribed: ${subscriptionId}`);
    } catch (error) {
      console.error(
        'Failed to unsubscribe from Google Calendar webhook:',
        error,
      );
      // Don't throw - webhook will expire anyway
    }
  }

  validateWebhook(payload: any, signature: string): boolean {
    // Google Calendar webhooks don't use signatures, but validate the channel token
    const expectedToken = process.env.GOOGLE_WEBHOOK_SECRET;
    return payload.channelToken === expectedToken;
  }

  async createWeddingCalendar(
    connection: CalendarConnection,
    coupleName: string,
    weddingDate: Date,
  ): Promise<string> {
    console.log(`💒 Creating dedicated wedding calendar for ${coupleName}`);

    await this.waitForRateLimit(connection);

    try {
      const oauth2Client = this.createOAuth2Client(connection);
      this.calendar.auth = oauth2Client;

      const calendarData: calendar_v3.Schema$Calendar = {
        summary: `${coupleName} Wedding`,
        description: `Dedicated calendar for ${coupleName}'s wedding on ${weddingDate.toLocaleDateString()}`,
        timeZone: connection.syncSettings.timezoneSettings.defaultTimezone,
      };

      const response = await this.calendar.calendars.insert({
        requestBody: calendarData,
      });

      // Set calendar color to wedding theme
      await this.calendar.colors.get().then((colors) => {
        if (colors.data.calendar && response.data.id) {
          this.calendar.calendarList.patch({
            calendarId: response.data.id,
            requestBody: {
              colorId: '11', // Pink color for weddings
            },
          });
        }
      });

      console.log(`✅ Wedding calendar created: ${response.data.id}`);
      return response.data.id!;
    } catch (error) {
      await this.handleGoogleApiError(error, connection);
      throw error;
    }
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const now = Date.now();

    try {
      // Test API connectivity
      const startTime = Date.now();
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: 'test' });

      try {
        await google.calendar('v3').colors.get({ auth: oauth2Client });
      } catch (error) {
        // Expected to fail with invalid token, but tests connectivity
      }

      const responseTime = Date.now() - startTime;

      // Check overall system health
      const globalRateLimit = this.getGlobalRateLimitUsage();

      return {
        provider: 'google',
        status:
          responseTime > 5000
            ? 'critical'
            : responseTime > 2000
              ? 'degraded'
              : 'healthy',
        responseTime,
        errorRate: this.calculateErrorRate(),
        rateLimitUsage: globalRateLimit,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        provider: 'google',
        status: 'critical',
        responseTime: -1,
        errorRate: 1.0,
        rateLimitUsage: 0,
        lastChecked: new Date(),
      };
    }
  }

  // Protected method implementations
  protected getProviderRateLimit(): number {
    return GoogleCalendarService.RATE_LIMIT.QUERIES_PER_USER;
  }

  protected getProviderWindowMs(): number {
    return GoogleCalendarService.RATE_LIMIT.WINDOW_MS;
  }

  protected isTokenExpired(error: any): boolean {
    return error.code === 401 || error.message?.includes('invalid_token');
  }

  protected extractRetryAfter(error: any): number | null {
    // Google doesn't provide retry-after header, use exponential backoff
    return null;
  }

  // Private helper methods
  private createOAuth2Client(connection: CalendarConnection): any {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI,
    );

    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
      expiry_date: connection.expiresAt?.getTime(),
    });

    return oauth2Client;
  }

  private isWeddingRelatedEvent(event: calendar_v3.Schema$Event): boolean {
    if (!event.summary && !event.description) return false;

    return !!(
      event.extendedProperties?.private?.weddingId ||
      event.summary?.toLowerCase().includes('wedding') ||
      event.description?.toLowerCase().includes('wedsync') ||
      this.detectWeddingKeywords(event.summary || '', event.description || '')
    );
  }

  private detectWeddingKeywords(title: string, description: string): boolean {
    const weddingKeywords = [
      'bride',
      'groom',
      'ceremony',
      'reception',
      'venue',
      'photographer',
      'videographer',
      'florist',
      'caterer',
      'dj',
      'wedding',
      'marriage',
      'engagement',
      'bridal',
      'rehearsal',
    ];

    const text = `${title} ${description}`.toLowerCase();
    return weddingKeywords.some((keyword) => text.includes(keyword));
  }

  private transformGoogleEventToCalendarEvent(
    googleEvent: calendar_v3.Schema$Event,
  ): CalendarEvent {
    return {
      id: googleEvent.id!,
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description,
      startTime: this.parseGoogleDateTime(googleEvent.start!),
      endTime: this.parseGoogleDateTime(googleEvent.end!),
      location: googleEvent.location,
      attendees: (googleEvent.attendees || []).map((attendee) => ({
        email: attendee.email!,
        name: attendee.displayName,
        status: this.mapGoogleResponseStatus(attendee.responseStatus),
      })),
      reminders: (googleEvent.reminders?.overrides || []).map((reminder) => ({
        method:
          reminder.method === 'email'
            ? 'email'
            : reminder.method === 'sms'
              ? 'sms'
              : 'popup',
        minutes: reminder.minutes || 15,
      })),
      calendarId: '',
      eventType: googleEvent.extendedProperties?.private?.eventType,
      weddingData: googleEvent.extendedProperties?.private?.weddingId
        ? {
            eventType: googleEvent.extendedProperties.private.eventType as any,
            coupleName:
              googleEvent.extendedProperties.private.coupleName ||
              'Unknown Couple',
            serviceType:
              googleEvent.extendedProperties.private.serviceType ||
              'Unknown Service',
            paymentStatus:
              (googleEvent.extendedProperties.private.paymentStatus as any) ||
              'pending',
          }
        : undefined,
    };
  }

  private transformCalendarEventToGoogle(
    calendarEvent: CalendarEvent,
  ): calendar_v3.Schema$Event {
    return {
      summary: calendarEvent.title,
      description: calendarEvent.description,
      location: calendarEvent.location,
      start: {
        dateTime: calendarEvent.startTime.toISOString(),
        timeZone: 'UTC', // Will be overridden by calendar timezone
      },
      end: {
        dateTime: calendarEvent.endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: calendarEvent.attendees.map((attendee) => ({
        email: attendee.email,
        displayName: attendee.name,
        responseStatus: this.mapToGoogleResponseStatus(attendee.status),
      })),
      reminders: {
        useDefault: false,
        overrides: calendarEvent.reminders.map((reminder) => ({
          method:
            reminder.method === 'sms'
              ? 'sms'
              : reminder.method === 'email'
                ? 'email'
                : 'popup',
          minutes: reminder.minutes,
        })),
      },
      extendedProperties: {
        private: {
          ...(calendarEvent.weddingData && {
            weddingId: 'wedding-event',
            eventType: calendarEvent.weddingData.eventType,
            coupleName: calendarEvent.weddingData.coupleName,
            serviceType: calendarEvent.weddingData.serviceType,
            paymentStatus: calendarEvent.weddingData.paymentStatus,
          }),
          wedSyncManaged: 'true',
        },
      },
      colorId: this.getEventColorId(calendarEvent.eventType),
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: calendarEvent.eventType === 'wedding',
    };
  }

  private parseGoogleDateTime(
    dateTime: calendar_v3.Schema$EventDateTime,
  ): Date {
    if (dateTime.dateTime) {
      return new Date(dateTime.dateTime);
    } else if (dateTime.date) {
      return new Date(dateTime.date);
    }
    throw new Error('Invalid Google Calendar date/time format');
  }

  private mapGoogleResponseStatus(
    status?: string,
  ): 'accepted' | 'declined' | 'tentative' | 'unknown' {
    switch (status) {
      case 'accepted':
        return 'accepted';
      case 'declined':
        return 'declined';
      case 'tentative':
        return 'tentative';
      default:
        return 'unknown';
    }
  }

  private mapToGoogleResponseStatus(
    status: 'accepted' | 'declined' | 'tentative' | 'unknown',
  ): string {
    switch (status) {
      case 'accepted':
        return 'accepted';
      case 'declined':
        return 'declined';
      case 'tentative':
        return 'tentative';
      default:
        return 'needsAction';
    }
  }

  private getEventColorId(eventType?: string): string {
    const colorMap: Record<string, string> = {
      ceremony: '11', // Red/Pink
      reception: '9', // Blue
      preparation: '2', // Green
      vendor_setup: '8', // Gray
      vendor_breakdown: '8', // Gray
      travel: '1', // Default
      buffer: '1', // Default
      emergency_slot: '11', // Red/Pink
    };

    return colorMap[eventType || 'default'] || '1';
  }

  private async executeBatchCreate(
    connection: CalendarConnection,
    events: CalendarEvent[],
  ): Promise<BatchResult> {
    const oauth2Client = this.createOAuth2Client(connection);

    // Create batch request
    const batch = new google.batch({
      auth: oauth2Client,
    });

    const result: BatchResult = {
      successful: [],
      failed: [],
      totalProcessed: events.length,
    };

    // Add requests to batch
    events.forEach((event, index) => {
      batch.add(
        {
          method: 'POST',
          url: `/calendar/v3/calendars/${connection.calendarId}/events`,
          data: this.transformCalendarEventToGoogle(event),
        },
        (err: any, response: any) => {
          if (err) {
            result.failed.push({
              id: event.id,
              error: err.message || 'Batch create failed',
            });
          } else {
            result.successful.push(response.data.id);
          }
        },
      );
    });

    // Execute batch
    await new Promise<void>((resolve, reject) => {
      batch.exec((err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    return result;
  }

  private async executeBatchUpdate(
    connection: CalendarConnection,
    updates: Array<{ eventId: string; changes: Partial<CalendarEvent> }>,
  ): Promise<BatchResult> {
    const oauth2Client = this.createOAuth2Client(connection);

    const batch = new google.batch({
      auth: oauth2Client,
    });

    const result: BatchResult = {
      successful: [],
      failed: [],
      totalProcessed: updates.length,
    };

    updates.forEach((update) => {
      batch.add(
        {
          method: 'PATCH',
          url: `/calendar/v3/calendars/${connection.calendarId}/events/${update.eventId}`,
          data: this.transformCalendarEventToGoogle(
            update.changes as CalendarEvent,
          ),
        },
        (err: any, response: any) => {
          if (err) {
            result.failed.push({
              id: update.eventId,
              error: err.message || 'Batch update failed',
            });
          } else {
            result.successful.push(update.eventId);
          }
        },
      );
    });

    await new Promise<void>((resolve, reject) => {
      batch.exec((err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    return result;
  }

  private async handleGoogleApiError(
    error: any,
    connection: CalendarConnection,
  ): Promise<void> {
    console.error(`Google Calendar API error:`, error);

    if (error.code === 429) {
      // Rate limit exceeded
      const retryAfter = await this.handleRateLimit(error, connection);
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter}ms`);
    } else if (error.code === 401) {
      // Authentication error
      await this.handleAuthError(error, connection);
    } else if (error.code >= 500) {
      // Server error
      await this.handleProviderOutage(connection);
      throw new Error(`Google Calendar server error: ${error.message}`);
    }

    // Re-throw other errors
    throw error;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private getGlobalRateLimitUsage(): number {
    let totalUsage = 0;
    let totalLimit = 0;

    for (const rateLimitInfo of this.rateLimitInfo.values()) {
      totalUsage += rateLimitInfo.requestsMade;
      totalLimit += GoogleCalendarService.RATE_LIMIT.QUERIES_PER_USER;
    }

    return totalLimit > 0 ? totalUsage / totalLimit : 0;
  }

  private calculateErrorRate(): number {
    // This would be implemented with actual error tracking
    return 0;
  }
}
