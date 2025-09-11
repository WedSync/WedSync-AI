/**
 * Apple Calendar (CalDAV) Service Implementation
 * Handles CalDAV protocol for iCloud calendars with wedding-specific optimizations
 */

import {
  CalendarService,
  CalendarConnection,
  UnifiedWeddingEvent,
  CalendarEvent,
  AccessTokens,
  BatchResult,
  WebhookSubscription,
  ProviderCredentials,
  EventQuery,
  WeddingEventType,
  VendorRole,
  ConflictInfo,
} from '../types';
import { BaseCalendarService } from '../base-calendar-service';

export class AppleCalendarService extends BaseCalendarService {
  provider = 'apple' as const;

  private static readonly CALDAV_BASE = 'https://caldav.icloud.com';
  private static readonly RATE_LIMIT = {
    REQUESTS_PER_MINUTE: 100, // Conservative estimate for Apple servers
    WINDOW_MS: 60000, // 1 minute
    POLLING_INTERVALS: {
      WEDDING_DAY: 30, // 30 seconds on wedding day
      WEEK_BEFORE: 60, // 1 minute during wedding week
      MONTH_BEFORE: 300, // 5 minutes during wedding month
      DEFAULT: 900, // 15 minutes normally
    },
    BATCH_SIZE: 20, // CalDAV doesn't support true batching
  };

  private pollingJobs = new Map<string, NodeJS.Timeout>();

  /**
   * Apple CalDAV Authentication using App-Specific Password
   * Note: Users must generate app-specific passwords in Apple ID settings
   */
  async authorize(credentials: ProviderCredentials): Promise<AccessTokens> {
    const { appleId, appSpecificPassword } = credentials;

    if (!appleId || !appSpecificPassword) {
      throw new Error(
        'Apple CalDAV requires Apple ID and app-specific password',
      );
    }

    try {
      // Test authentication by performing a basic CalDAV request
      const basicAuth = Buffer.from(
        `${appleId}:${appSpecificPassword}`,
      ).toString('base64');

      const testResponse = await this.makeCalDAVRequest(
        '/.well-known/caldav',
        'PROPFIND',
        basicAuth,
        '<?xml version="1.0" encoding="UTF-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal /></d:prop></d:propfind>',
      );

      if (!testResponse.ok) {
        throw new Error(
          `Apple CalDAV authentication failed: ${testResponse.statusText}`,
        );
      }

      // CalDAV doesn't use traditional OAuth tokens
      // We store the credentials differently for CalDAV
      return {
        accessToken: basicAuth, // Store base64 encoded credentials
        refreshToken: '', // Not applicable for CalDAV
        expiresIn: 0, // App-specific passwords don't expire
        expiresAt: new Date(2099, 11, 31), // Far future date
        scope: 'calendar',
        tokenType: 'Basic',
      };
    } catch (error) {
      throw new Error(`Apple CalDAV authorization failed: ${error.message}`);
    }
  }

  /**
   * Apple CalDAV doesn't use refresh tokens - app-specific passwords are long-lived
   */
  async refreshTokens(refreshToken: string): Promise<AccessTokens> {
    // For CalDAV, we don't refresh tokens
    // App-specific passwords are valid until revoked by user
    throw new Error(
      'Apple CalDAV does not support token refresh. Use app-specific password authentication.',
    );
  }

  /**
   * Create wedding event in Apple Calendar via CalDAV
   * Handles iCalendar format and CalDAV specific headers
   */
  async createWeddingEvent(
    connection: CalendarConnection,
    weddingEvent: UnifiedWeddingEvent,
  ): Promise<string> {
    await this.checkRateLimit('apple', connection.userId);

    const eventId = this.generateEventId();
    const icalEvent = this.transformToICalEvent(weddingEvent, eventId);
    const eventPath = `/calendars/${connection.externalCalendarId}/${eventId}.ics`;

    try {
      const response = await this.makeCalDAVRequest(
        eventPath,
        'PUT',
        connection.accessToken,
        icalEvent,
        {
          'Content-Type': 'text/calendar; charset=utf-8',
          'If-None-Match': '*', // Ensure we're creating, not updating
        },
      );

      if (!response.ok) {
        throw new Error(
          `Apple Calendar event creation failed: ${response.statusText}`,
        );
      }

      // Store the event mapping
      await this.updateEventMapping(weddingEvent.id, connection.id, eventId);

      return eventId;
    } catch (error) {
      throw new Error(
        `Failed to create wedding event in Apple Calendar: ${error.message}`,
      );
    }
  }

  /**
   * Batch create events for Apple Calendar
   * Since CalDAV doesn't support true batching, we process sequentially with rate limiting
   */
  async batchCreateEvents(
    connection: CalendarConnection,
    events: CalendarEvent[],
  ): Promise<BatchResult> {
    const results: BatchResult = {
      successful: [],
      failed: [],
      partialFailure: false,
    };

    // Process events sequentially to respect CalDAV limitations
    for (const event of events) {
      try {
        const eventId = await this.createWeddingEvent(
          connection,
          event as UnifiedWeddingEvent,
        );
        results.successful.push({
          originalEvent: event,
          externalEventId: eventId,
          providerId: eventId,
        });

        // Add delay between requests to avoid rate limiting
        await this.delay(1000); // 1 second delay between requests
      } catch (error) {
        results.failed.push({
          originalEvent: event,
          error: error.message,
          errorCode: 'CALDAV_CREATE_FAILED',
        });
        results.partialFailure = true;
      }
    }

    return results;
  }

  /**
   * Apple doesn't support push notifications - implement intelligent polling
   * Polling frequency adapts based on wedding proximity
   */
  async subscribeToChanges(
    connection: CalendarConnection,
    webhookUrl: string,
  ): Promise<WebhookSubscription> {
    const weddingDate = await this.getWeddingDate(connection.userId);
    const pollingInterval = this.calculatePollingInterval(weddingDate);

    // Start polling for changes
    const pollingJobId = this.startPollingJob(
      connection,
      webhookUrl,
      pollingInterval,
    );

    return {
      id: pollingJobId,
      provider: 'apple',
      connectionId: connection.id,
      webhookUrl,
      expiresAt: new Date(2099, 11, 31), // Polling doesn't expire
      isActive: true,
      clientState: `polling-${pollingJobId}`,
      resource: `/calendars/${connection.externalCalendarId}/`,
      changeTypes: ['created', 'updated', 'deleted'],
      pollingInterval,
      lastSync: new Date(),
    };
  }

  /**
   * Validate Apple CalDAV "webhook" (polling-based)
   * Since there are no actual webhooks, this validates polling requests
   */
  validateWebhook(payload: any, signature: string): boolean {
    // For polling-based approach, we validate the internal polling job
    return (
      payload.source === 'apple-polling' &&
      payload.jobId &&
      this.pollingJobs.has(payload.jobId)
    );
  }

  /**
   * Check vendor availability in Apple Calendar using CalDAV
   */
  async checkAvailability(
    connection: CalendarConnection,
    startTime: Date,
    endTime: Date,
    vendorRole: VendorRole,
  ): Promise<{
    isAvailable: boolean;
    conflicts: ConflictInfo[];
    suggestedTimes: Date[];
  }> {
    const events = await this.getEventsInTimeRange(
      connection,
      startTime,
      endTime,
    );

    // Analyze conflicts based on wedding vendor requirements
    const conflicts = this.analyzeWeddingConflicts(events, vendorRole);
    const suggestedTimes =
      conflicts.length > 0
        ? await this.suggestAlternativeTimes(
            connection,
            startTime,
            endTime,
            vendorRole,
          )
        : [];

    return {
      isAvailable: conflicts.length === 0,
      conflicts,
      suggestedTimes,
    };
  }

  /**
   * Transform unified wedding event to iCalendar format
   */
  private transformToICalEvent(
    weddingEvent: UnifiedWeddingEvent,
    eventId: string,
  ): string {
    const now =
      new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const startTime =
      weddingEvent.startTime.toISOString().replace(/[-:]/g, '').split('.')[0] +
      'Z';
    const endTime =
      weddingEvent.endTime.toISOString().replace(/[-:]/g, '').split('.')[0] +
      'Z';

    let ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WedSync//Wedding Calendar Integration//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${eventId}@wedsync.com`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=${weddingEvent.timezone}:${startTime}`,
      `DTEND;TZID=${weddingEvent.timezone}:${endTime}`,
      `SUMMARY:${this.escapeICalText(weddingEvent.title)}`,
      `DESCRIPTION:${this.escapeICalText(this.buildWeddingEventDescription(weddingEvent))}`,
      `CATEGORIES:Wedding,${weddingEvent.eventType},${weddingEvent.vendorRole}`,
      `PRIORITY:${weddingEvent.isWeddingCritical ? 1 : 5}`,
      'CLASS:CONFIDENTIAL',
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
    ];

    // Add location if present
    if (weddingEvent.location) {
      ical.push(
        `LOCATION:${this.escapeICalText(weddingEvent.location.address)}`,
      );

      if (weddingEvent.location.coordinates) {
        ical.push(
          `GEO:${weddingEvent.location.coordinates.latitude};${weddingEvent.location.coordinates.longitude}`,
        );
      }
    }

    // Add reminder based on event type
    const reminderMinutes = this.getWeddingReminderTime(weddingEvent.eventType);
    if (reminderMinutes > 0) {
      ical.push(
        'BEGIN:VALARM',
        'TRIGGER:-PT' + reminderMinutes + 'M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Wedding Reminder: ${this.escapeICalText(weddingEvent.title)}`,
        'END:VALARM',
      );
    }

    // Add custom properties for WedSync metadata
    ical.push(
      `X-WEDSYNC-WEDDING-ID:${weddingEvent.weddingId}`,
      `X-WEDSYNC-TIMELINE-ID:${weddingEvent.timelineEventId}`,
      `X-WEDSYNC-EVENT-TYPE:${weddingEvent.eventType}`,
      `X-WEDSYNC-VENDOR-ROLE:${weddingEvent.vendorRole}`,
      `X-WEDSYNC-CRITICAL:${weddingEvent.isWeddingCritical}`,
      'END:VEVENT',
      'END:VCALENDAR',
    );

    return ical.join('\r\n');
  }

  /**
   * Make CalDAV request with proper headers and authentication
   */
  private async makeCalDAVRequest(
    path: string,
    method: string = 'GET',
    basicAuth: string,
    body?: string,
    additionalHeaders?: Record<string, string>,
  ): Promise<Response> {
    const url = path.startsWith('http')
      ? path
      : `${AppleCalendarService.CALDAV_BASE}${path}`;

    const headers = {
      Authorization: `Basic ${basicAuth}`,
      'User-Agent': 'WedSync-Calendar-Integration/1.0 (CalDAV)',
      Depth: '1',
      ...additionalHeaders,
    };

    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    return response;
  }

  /**
   * Start polling job for calendar changes
   */
  private startPollingJob(
    connection: CalendarConnection,
    webhookUrl: string,
    intervalSeconds: number,
  ): string {
    const jobId = `apple-poll-${connection.id}-${Date.now()}`;

    const poll = async () => {
      try {
        const changes = await this.detectChanges(connection);

        if (changes.length > 0) {
          // Simulate webhook payload for changes
          await this.notifyWebhookUrl(webhookUrl, {
            source: 'apple-polling',
            jobId,
            connectionId: connection.id,
            changes,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(
          `Apple Calendar polling error for ${connection.id}:`,
          error,
        );
      }
    };

    // Start immediate poll, then set interval
    poll();
    const intervalId = setInterval(poll, intervalSeconds * 1000);

    this.pollingJobs.set(jobId, intervalId);

    return jobId;
  }

  /**
   * Calculate optimal polling interval based on wedding proximity
   */
  private calculatePollingInterval(weddingDate?: Date): number {
    if (!weddingDate) {
      return AppleCalendarService.RATE_LIMIT.POLLING_INTERVALS.DEFAULT;
    }

    const now = new Date();
    const daysUntilWedding = Math.ceil(
      (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilWedding <= 0) {
      // Wedding day - most frequent polling
      return AppleCalendarService.RATE_LIMIT.POLLING_INTERVALS.WEDDING_DAY;
    } else if (daysUntilWedding <= 7) {
      // Week before wedding
      return AppleCalendarService.RATE_LIMIT.POLLING_INTERVALS.WEEK_BEFORE;
    } else if (daysUntilWedding <= 30) {
      // Month before wedding
      return AppleCalendarService.RATE_LIMIT.POLLING_INTERVALS.MONTH_BEFORE;
    } else {
      // Normal polling frequency
      return AppleCalendarService.RATE_LIMIT.POLLING_INTERVALS.DEFAULT;
    }
  }

  /**
   * Detect changes in Apple Calendar using ETags and sync tokens
   */
  private async detectChanges(connection: CalendarConnection): Promise<any[]> {
    try {
      const response = await this.makeCalDAVRequest(
        `/calendars/${connection.externalCalendarId}/`,
        'PROPFIND',
        connection.accessToken,
        '<?xml version="1.0" encoding="UTF-8"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/><c:calendar-data/></d:prop></d:propfind>',
      );

      if (!response.ok) {
        throw new Error(`Failed to detect changes: ${response.statusText}`);
      }

      const xmlData = await response.text();

      // Parse XML response to detect changes (simplified)
      // In production, you'd use a proper XML parser
      const changes = this.parseCalDAVResponse(xmlData);

      return changes;
    } catch (error) {
      throw new Error(`Change detection failed: ${error.message}`);
    }
  }

  /**
   * Get events in time range from Apple Calendar
   */
  private async getEventsInTimeRange(
    connection: CalendarConnection,
    startTime: Date,
    endTime: Date,
  ): Promise<CalendarEvent[]> {
    const calendarQuery = this.buildTimeRangeQuery(startTime, endTime);

    const response = await this.makeCalDAVRequest(
      `/calendars/${connection.externalCalendarId}/`,
      'REPORT',
      connection.accessToken,
      calendarQuery,
      {
        'Content-Type': 'application/xml; charset=utf-8',
        Depth: '1',
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get events: ${response.statusText}`);
    }

    const xmlData = await response.text();
    return this.parseEventsFromXML(xmlData);
  }

  /**
   * Build CalDAV time range query
   */
  private buildTimeRangeQuery(startTime: Date, endTime: Date): string {
    const start =
      startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = endTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    return `<?xml version="1.0" encoding="UTF-8"?>
      <c:calendar-query xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:d="DAV:">
        <d:prop>
          <d:getetag/>
          <c:calendar-data/>
        </d:prop>
        <c:filter>
          <c:comp-filter name="VCALENDAR">
            <c:comp-filter name="VEVENT">
              <c:time-range start="${start}" end="${end}"/>
            </c:comp-filter>
          </c:comp-filter>
        </c:filter>
      </c:calendar-query>`;
  }

  /**
   * Generate unique event ID for CalDAV
   */
  private generateEventId(): string {
    return `wedsync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Escape text for iCalendar format
   */
  private escapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  }

  /**
   * Parse CalDAV XML response (simplified implementation)
   */
  private parseCalDAVResponse(xmlData: string): any[] {
    // This is a simplified parser - in production, use a proper XML parser
    const changes: any[] = [];

    // Extract event data from XML (basic regex-based parsing)
    const eventMatches = xmlData.match(
      /<c:calendar-data[^>]*>([\s\S]*?)<\/c:calendar-data>/g,
    );

    if (eventMatches) {
      eventMatches.forEach((match) => {
        const eventData = match.replace(/<\/?c:calendar-data[^>]*>/g, '');
        if (eventData.includes('BEGIN:VEVENT')) {
          changes.push({
            type: 'update',
            data: eventData,
          });
        }
      });
    }

    return changes;
  }

  /**
   * Parse events from CalDAV XML response
   */
  private parseEventsFromXML(xmlData: string): CalendarEvent[] {
    // Simplified event parsing - in production, use proper XML and iCal parsers
    const events: CalendarEvent[] = [];
    const eventMatches = xmlData.match(
      /<c:calendar-data[^>]*>([\s\S]*?)<\/c:calendar-data>/g,
    );

    if (eventMatches) {
      eventMatches.forEach((match) => {
        const eventData = match.replace(/<\/?c:calendar-data[^>]*>/g, '');
        if (eventData.includes('BEGIN:VEVENT')) {
          const parsedEvent = this.parseICalEvent(eventData);
          if (parsedEvent) {
            events.push(parsedEvent);
          }
        }
      });
    }

    return events;
  }

  /**
   * Parse individual iCalendar event (simplified)
   */
  private parseICalEvent(icalData: string): CalendarEvent | null {
    try {
      const lines = icalData.split(/\r?\n/);
      const event: Partial<CalendarEvent> = {};

      for (const line of lines) {
        if (line.startsWith('SUMMARY:')) {
          event.title = line.substring(8);
        } else if (line.startsWith('DTSTART')) {
          const dateStr = line.split(':')[1];
          event.startTime = new Date(dateStr);
        } else if (line.startsWith('DTEND')) {
          const dateStr = line.split(':')[1];
          event.endTime = new Date(dateStr);
        } else if (line.startsWith('UID:')) {
          event.id = line.substring(4);
        }
      }

      return event as CalendarEvent;
    } catch (error) {
      console.error('Error parsing iCal event:', error);
      return null;
    }
  }

  /**
   * Notify webhook URL with changes (for polling-based approach)
   */
  private async notifyWebhookUrl(
    webhookUrl: string,
    payload: any,
  ): Promise<void> {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WedSync-Source': 'apple-polling',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Failed to notify webhook URL:', error);
    }
  }

  /**
   * Add delay for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
