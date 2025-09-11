// WS-336 Universal Calendar Service Interface
// Base interface for all calendar provider implementations

import {
  CalendarProvider,
  CalendarConnection,
  CalendarEvent,
  UnifiedWeddingEvent,
  TimeRange,
  BatchResult,
  WebhookSubscription,
  RateLimitResult,
  HealthStatus,
} from './types';

/**
 * Universal Calendar Service Interface
 * All calendar providers (Google, Outlook, Apple) must implement this interface
 * Provides consistent API across different calendar systems for wedding industry
 */
export interface CalendarService {
  provider: CalendarProvider;

  // Authentication & Connection Management
  authorize(credentials: ProviderCredentials): Promise<AccessTokens>;
  refreshTokens(refreshToken: string): Promise<AccessTokens>;
  validateConnection(connection: CalendarConnection): Promise<boolean>;

  // Calendar Operations
  listCalendars(connection: CalendarConnection): Promise<Calendar[]>;
  getEvents(
    connection: CalendarConnection,
    options: EventQuery,
  ): Promise<CalendarEvent[]>;
  createEvent(
    connection: CalendarConnection,
    event: CalendarEvent,
  ): Promise<string>;
  updateEvent(
    connection: CalendarConnection,
    eventId: string,
    event: Partial<CalendarEvent>,
  ): Promise<void>;
  deleteEvent(connection: CalendarConnection, eventId: string): Promise<void>;

  // Wedding-Specific Operations
  createWeddingEvent(
    connection: CalendarConnection,
    weddingEvent: UnifiedWeddingEvent,
  ): Promise<string>;
  updateWeddingEvent(
    connection: CalendarConnection,
    eventId: string,
    weddingEvent: UnifiedWeddingEvent,
  ): Promise<void>;

  // Batch Operations for Wedding Timeline Sync
  batchCreateEvents(
    connection: CalendarConnection,
    events: CalendarEvent[],
  ): Promise<BatchResult>;
  batchUpdateEvents(
    connection: CalendarConnection,
    updates: EventUpdate[],
  ): Promise<BatchResult>;
  batchDeleteEvents(
    connection: CalendarConnection,
    eventIds: string[],
  ): Promise<BatchResult>;

  // Change Detection and Sync
  getIncrementalChanges(
    connection: CalendarConnection,
    syncToken?: string,
  ): Promise<CalendarChangeSet>;
  getDeltaChanges?(
    connection: CalendarConnection,
    deltaLink?: string,
  ): Promise<CalendarChangeSet>;
  getETagChanges?(
    connection: CalendarConnection,
    lastKnownETags?: Map<string, string>,
  ): Promise<CalendarChangeSet>;

  // Webhook Management
  subscribeToChanges(
    connection: CalendarConnection,
    webhookUrl: string,
  ): Promise<WebhookSubscription>;
  unsubscribeFromChanges(subscriptionId: string): Promise<void>;
  validateWebhook(payload: any, signature: string): boolean;
  renewWebhookSubscription?(
    subscriptionId: string,
  ): Promise<WebhookSubscription>;

  // Availability and Conflict Management
  checkAvailability(
    connection: CalendarConnection,
    timeRange: TimeRange,
  ): Promise<AvailabilityResult>;
  findConflicts(
    connection: CalendarConnection,
    proposedEvent: CalendarEvent,
  ): Promise<ConflictResult[]>;
  suggestAlternativeTimes?(
    connection: CalendarConnection,
    preferences: TimePreferences,
  ): Promise<TimeSlot[]>;

  // Wedding-Specific Features
  createWeddingCalendar?(
    connection: CalendarConnection,
    coupleName: string,
    weddingDate: Date,
  ): Promise<string>;
  addWeddingReminders(
    connection: CalendarConnection,
    eventId: string,
    eventType: string,
  ): Promise<void>;

  // Performance and Health
  getHealthStatus(): Promise<HealthStatus>;
  getRateLimitStatus(connection: CalendarConnection): Promise<RateLimitResult>;

  // Error Handling and Recovery
  handleRateLimit(error: any, connection: CalendarConnection): Promise<number>; // Returns retry delay in ms
  handleAuthError(error: any, connection: CalendarConnection): Promise<void>;
  handleProviderOutage(connection: CalendarConnection): Promise<void>;
}

/**
 * Base Calendar Service Implementation
 * Provides common functionality and error handling for all providers
 */
export abstract class BaseCalendarService implements CalendarService {
  abstract provider: CalendarProvider;
  protected rateLimitTracker: Map<string, RateLimitInfo> = new Map();

  // Abstract methods that must be implemented by providers
  abstract authorize(credentials: ProviderCredentials): Promise<AccessTokens>;
  abstract refreshTokens(refreshToken: string): Promise<AccessTokens>;
  abstract getEvents(
    connection: CalendarConnection,
    options: EventQuery,
  ): Promise<CalendarEvent[]>;
  abstract createEvent(
    connection: CalendarConnection,
    event: CalendarEvent,
  ): Promise<string>;
  abstract updateEvent(
    connection: CalendarConnection,
    eventId: string,
    event: Partial<CalendarEvent>,
  ): Promise<void>;
  abstract deleteEvent(
    connection: CalendarConnection,
    eventId: string,
  ): Promise<void>;

  // Common implementations with provider-specific overrides
  async validateConnection(connection: CalendarConnection): Promise<boolean> {
    try {
      const healthStatus = await this.getHealthStatus();
      return healthStatus.status !== 'critical';
    } catch (error) {
      console.error(
        `Connection validation failed for ${this.provider}:`,
        error,
      );
      return false;
    }
  }

  async createWeddingEvent(
    connection: CalendarConnection,
    weddingEvent: UnifiedWeddingEvent,
  ): Promise<string> {
    const calendarEvent =
      this.transformWeddingEventToCalendarEvent(weddingEvent);
    const eventId = await this.createEvent(connection, calendarEvent);

    // Add wedding-specific reminders
    await this.addWeddingReminders(connection, eventId, weddingEvent.eventType);

    return eventId;
  }

  async updateWeddingEvent(
    connection: CalendarConnection,
    eventId: string,
    weddingEvent: UnifiedWeddingEvent,
  ): Promise<void> {
    const calendarEvent =
      this.transformWeddingEventToCalendarEvent(weddingEvent);
    await this.updateEvent(connection, eventId, calendarEvent);

    // Update wedding-specific reminders
    await this.addWeddingReminders(connection, eventId, weddingEvent.eventType);
  }

  async batchCreateEvents(
    connection: CalendarConnection,
    events: CalendarEvent[],
  ): Promise<BatchResult> {
    // Default implementation - create events sequentially
    const result: BatchResult = {
      successful: [],
      failed: [],
      totalProcessed: events.length,
    };

    for (const event of events) {
      try {
        // Check rate limits before each request
        await this.waitForRateLimit(connection);

        const eventId = await this.createEvent(connection, event);
        result.successful.push(eventId);
      } catch (error) {
        result.failed.push({
          id: event.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  async batchUpdateEvents(
    connection: CalendarConnection,
    updates: EventUpdate[],
  ): Promise<BatchResult> {
    const result: BatchResult = {
      successful: [],
      failed: [],
      totalProcessed: updates.length,
    };

    for (const update of updates) {
      try {
        await this.waitForRateLimit(connection);
        await this.updateEvent(connection, update.eventId, update.changes);
        result.successful.push(update.eventId);
      } catch (error) {
        result.failed.push({
          id: update.eventId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  async batchDeleteEvents(
    connection: CalendarConnection,
    eventIds: string[],
  ): Promise<BatchResult> {
    const result: BatchResult = {
      successful: [],
      failed: [],
      totalProcessed: eventIds.length,
    };

    for (const eventId of eventIds) {
      try {
        await this.waitForRateLimit(connection);
        await this.deleteEvent(connection, eventId);
        result.successful.push(eventId);
      } catch (error) {
        result.failed.push({
          id: eventId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  async checkAvailability(
    connection: CalendarConnection,
    timeRange: TimeRange,
  ): Promise<AvailabilityResult> {
    const events = await this.getEvents(connection, {
      timeMin: timeRange.start,
      timeMax: timeRange.end,
      showDeleted: false,
    });

    const conflicts = events.filter((event) =>
      this.isTimeOverlap(
        { start: event.startTime, end: event.endTime },
        timeRange,
      ),
    );

    const availableSlots = this.calculateAvailableSlots(timeRange, events);

    return {
      slots: availableSlots,
      conflicts: conflicts,
      preferredSlots: availableSlots.filter((slot) =>
        this.isPreferredTime(slot),
      ),
      notes:
        conflicts.length > 0
          ? `${conflicts.length} conflict(s) found`
          : 'No conflicts detected',
    };
  }

  async findConflicts(
    connection: CalendarConnection,
    proposedEvent: CalendarEvent,
  ): Promise<ConflictResult[]> {
    const timeRange = {
      start: proposedEvent.startTime,
      end: proposedEvent.endTime,
    };

    const existingEvents = await this.getEvents(connection, {
      timeMin: timeRange.start,
      timeMax: timeRange.end,
      showDeleted: false,
    });

    return existingEvents
      .filter((event) => event.id !== proposedEvent.id)
      .filter((event) =>
        this.isTimeOverlap(
          { start: event.startTime, end: event.endTime },
          timeRange,
        ),
      )
      .map((event) => ({
        conflictingEventId: event.id,
        conflictingEventTitle: event.title,
        overlapDuration: this.calculateOverlapDuration(event, proposedEvent),
        severity: this.calculateConflictSeverity(event, proposedEvent),
        suggestedAction: this.suggestConflictResolution(event, proposedEvent),
      }));
  }

  async addWeddingReminders(
    connection: CalendarConnection,
    eventId: string,
    eventType: string,
  ): Promise<void> {
    // Default wedding reminders - providers can override
    const reminders = this.getWeddingReminders(eventType);

    // This would typically be implemented in the specific provider
    // as reminder management varies by provider
    console.log(
      `Adding ${reminders.length} wedding reminders for ${eventType} event ${eventId}`,
    );
  }

  async getRateLimitStatus(
    connection: CalendarConnection,
  ): Promise<RateLimitResult> {
    const rateLimitInfo = this.rateLimitTracker.get(
      this.getRateLimitKey(connection),
    );

    if (!rateLimitInfo) {
      return {
        allowed: true,
        remainingRequests: 1000, // Default high value
        resetTime: Date.now() + 3600000, // 1 hour from now
      };
    }

    const now = Date.now();
    if (now >= rateLimitInfo.resetTime) {
      // Reset window has passed
      this.rateLimitTracker.delete(this.getRateLimitKey(connection));
      return {
        allowed: true,
        remainingRequests: rateLimitInfo.maxRequests,
        resetTime: now + rateLimitInfo.windowMs,
      };
    }

    return {
      allowed: rateLimitInfo.remainingRequests > 0,
      remainingRequests: rateLimitInfo.remainingRequests,
      resetTime: rateLimitInfo.resetTime,
    };
  }

  async handleRateLimit(
    error: any,
    connection: CalendarConnection,
  ): Promise<number> {
    // Extract retry-after header or use exponential backoff
    const retryAfter =
      this.extractRetryAfter(error) || this.calculateBackoffDelay(connection);

    // Update rate limit tracker
    const key = this.getRateLimitKey(connection);
    const rateLimitInfo = this.rateLimitTracker.get(key) || {
      requestsMade: 0,
      remainingRequests: 0,
      resetTime: Date.now() + retryAfter,
      maxRequests: this.getProviderRateLimit(),
      windowMs: this.getProviderWindowMs(),
      backoffMultiplier: 1,
    };

    rateLimitInfo.remainingRequests = 0;
    rateLimitInfo.resetTime = Date.now() + retryAfter;
    rateLimitInfo.backoffMultiplier = Math.min(
      rateLimitInfo.backoffMultiplier * 2,
      8,
    );

    this.rateLimitTracker.set(key, rateLimitInfo);

    console.warn(
      `Rate limit hit for ${this.provider}. Backing off for ${retryAfter}ms`,
    );
    return retryAfter;
  }

  async handleAuthError(
    error: any,
    connection: CalendarConnection,
  ): Promise<void> {
    console.error(`Authentication error for ${this.provider}:`, error);

    if (connection.refreshToken && this.isTokenExpired(error)) {
      try {
        const newTokens = await this.refreshTokens(connection.refreshToken);
        // Update connection with new tokens (caller should persist)
        connection.accessToken = newTokens.accessToken;
        connection.expiresAt = new Date(
          Date.now() + newTokens.expiresIn * 1000,
        );

        console.log(`Successfully refreshed tokens for ${this.provider}`);
      } catch (refreshError) {
        console.error(
          `Token refresh failed for ${this.provider}:`,
          refreshError,
        );
        throw new Error(
          `Authentication failed and token refresh unsuccessful: ${refreshError}`,
        );
      }
    } else {
      throw new Error(
        `Authentication failed for ${this.provider}: ${error.message}`,
      );
    }
  }

  async handleProviderOutage(connection: CalendarConnection): Promise<void> {
    console.warn(
      `Provider outage detected for ${this.provider}. Switching to fallback mode.`,
    );

    // Mark provider as degraded
    const healthStatus = await this.getHealthStatus();
    healthStatus.status = 'critical';

    // Implement circuit breaker pattern
    // This would typically integrate with a circuit breaker service
  }

  // Protected utility methods
  protected transformWeddingEventToCalendarEvent(
    weddingEvent: UnifiedWeddingEvent,
  ): CalendarEvent {
    return {
      id: weddingEvent.id,
      title: this.buildWeddingEventTitle(weddingEvent),
      description: this.buildWeddingEventDescription(weddingEvent),
      startTime: weddingEvent.startTime,
      endTime: weddingEvent.endTime,
      location: weddingEvent.location?.name,
      attendees: weddingEvent.attendees.map((a) => ({
        email: a.email,
        name: a.name,
        status: a.responseStatus,
      })),
      reminders: this.getWeddingReminders(weddingEvent.eventType),
      calendarId: '', // Will be set by caller
      eventType: weddingEvent.eventType,
      weddingData: {
        eventType: weddingEvent.eventType,
        coupleName: `Wedding Event - ${weddingEvent.weddingId}`,
        serviceType: weddingEvent.vendorRole,
        paymentStatus: 'pending',
      },
    };
  }

  protected buildWeddingEventTitle(weddingEvent: UnifiedWeddingEvent): string {
    return `${weddingEvent.title} - ${weddingEvent.vendorRole}`;
  }

  protected buildWeddingEventDescription(
    weddingEvent: UnifiedWeddingEvent,
  ): string {
    let description = weddingEvent.description || '';

    description += '\n\n--- Wedding Details ---';
    description += `\nEvent Type: ${weddingEvent.eventType}`;
    description += `\nVendor Role: ${weddingEvent.vendorRole}`;
    description += `\nCritical: ${weddingEvent.isWeddingCritical ? 'Yes' : 'No'}`;

    if (weddingEvent.bufferTime) {
      description += `\nBuffer Time: ${weddingEvent.bufferTime.before}min before, ${weddingEvent.bufferTime.after}min after`;
    }

    description += '\n\nManaged by WedSync - Do not modify manually';

    return description;
  }

  protected getWeddingReminders(
    eventType: string,
  ): Array<{ method: 'email' | 'popup' | 'sms'; minutes: number }> {
    const reminderMap: Record<
      string,
      Array<{ method: 'email' | 'popup' | 'sms'; minutes: number }>
    > = {
      ceremony: [
        { method: 'popup', minutes: 120 }, // 2 hours
        { method: 'popup', minutes: 30 }, // 30 minutes
        { method: 'email', minutes: 1440 }, // 24 hours
      ],
      reception: [
        { method: 'popup', minutes: 60 }, // 1 hour
        { method: 'popup', minutes: 15 }, // 15 minutes
      ],
      vendor_setup: [
        { method: 'popup', minutes: 60 }, // 1 hour
        { method: 'popup', minutes: 15 }, // 15 minutes
      ],
      preparation: [
        { method: 'popup', minutes: 30 }, // 30 minutes
      ],
      travel: [
        { method: 'popup', minutes: 15 }, // 15 minutes
      ],
    };

    return reminderMap[eventType] || [{ method: 'popup', minutes: 15 }];
  }

  protected isTimeOverlap(range1: TimeRange, range2: TimeRange): boolean {
    return range1.start < range2.end && range1.end > range2.start;
  }

  protected isPreferredTime(slot: TimeRange): boolean {
    const startHour = slot.start.getHours();
    const endHour = slot.end.getHours();
    return startHour >= 9 && endHour <= 18; // 9 AM to 6 PM
  }

  protected calculateAvailableSlots(
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

    // Filter out slots that are too short (less than 30 minutes)
    return slots.filter((slot) => {
      const duration = slot.end.getTime() - slot.start.getTime();
      return duration >= 30 * 60 * 1000; // 30 minutes in milliseconds
    });
  }

  protected calculateOverlapDuration(
    event1: CalendarEvent,
    event2: CalendarEvent,
  ): number {
    const overlapStart = Math.max(
      event1.startTime.getTime(),
      event2.startTime.getTime(),
    );
    const overlapEnd = Math.min(
      event1.endTime.getTime(),
      event2.endTime.getTime(),
    );
    return Math.max(0, overlapEnd - overlapStart);
  }

  protected calculateConflictSeverity(
    conflictingEvent: CalendarEvent,
    proposedEvent: CalendarEvent,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const overlapDuration = this.calculateOverlapDuration(
      conflictingEvent,
      proposedEvent,
    );
    const totalDuration =
      proposedEvent.endTime.getTime() - proposedEvent.startTime.getTime();
    const overlapPercentage = overlapDuration / totalDuration;

    if (overlapPercentage >= 0.8) return 'critical';
    if (overlapPercentage >= 0.5) return 'high';
    if (overlapPercentage >= 0.2) return 'medium';
    return 'low';
  }

  protected suggestConflictResolution(
    conflictingEvent: CalendarEvent,
    proposedEvent: CalendarEvent,
  ): string {
    const severity = this.calculateConflictSeverity(
      conflictingEvent,
      proposedEvent,
    );

    switch (severity) {
      case 'critical':
        return 'Consider rescheduling or finding an alternative time slot';
      case 'high':
        return 'Significant overlap detected - manual review required';
      case 'medium':
        return 'Partial overlap - consider adjusting start/end times';
      default:
        return 'Minor overlap - may be acceptable depending on event type';
    }
  }

  protected async waitForRateLimit(
    connection: CalendarConnection,
  ): Promise<void> {
    const rateLimitStatus = await this.getRateLimitStatus(connection);

    if (!rateLimitStatus.allowed) {
      const delay = Math.max(0, rateLimitStatus.resetTime - Date.now());
      if (delay > 0) {
        console.log(
          `Rate limit reached for ${this.provider}. Waiting ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Update rate limit tracker
    const key = this.getRateLimitKey(connection);
    const rateLimitInfo = this.rateLimitTracker.get(key);
    if (rateLimitInfo) {
      rateLimitInfo.requestsMade++;
      rateLimitInfo.remainingRequests = Math.max(
        0,
        rateLimitInfo.remainingRequests - 1,
      );
    }
  }

  protected getRateLimitKey(connection: CalendarConnection): string {
    return `${this.provider}:${connection.organizationId}`;
  }

  protected extractRetryAfter(error: any): number | null {
    // Implementation varies by provider
    return null;
  }

  protected calculateBackoffDelay(connection: CalendarConnection): number {
    const rateLimitInfo = this.rateLimitTracker.get(
      this.getRateLimitKey(connection),
    );
    const multiplier = rateLimitInfo?.backoffMultiplier || 1;
    return Math.min(1000 * multiplier, 60000); // Max 1 minute
  }

  protected abstract getProviderRateLimit(): number;
  protected abstract getProviderWindowMs(): number;

  protected isTokenExpired(error: any): boolean {
    // Implementation varies by provider
    return false;
  }
}

// Supporting interfaces
export interface ProviderCredentials {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scope: string[];
}

export interface AccessTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  timezone: string;
  primary: boolean;
  accessRole: string;
}

export interface EventQuery {
  timeMin?: Date;
  timeMax?: Date;
  maxResults?: number;
  showDeleted?: boolean;
  singleEvents?: boolean;
  orderBy?: 'startTime' | 'updated';
  syncToken?: string;
}

export interface EventUpdate {
  eventId: string;
  changes: Partial<CalendarEvent>;
}

export interface CalendarChangeSet {
  events: CalendarEvent[];
  hasMore: boolean;
  nextPageToken?: string;
  syncToken?: string;
  deltaLink?: string;
}

export interface AvailabilityResult {
  slots: TimeRange[];
  conflicts: CalendarEvent[];
  preferredSlots?: TimeRange[];
  notes?: string;
}

export interface ConflictResult {
  conflictingEventId: string;
  conflictingEventTitle: string;
  overlapDuration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction: string;
}

export interface TimePreferences {
  preferredStartTime: number; // Hour of day (0-23)
  preferredEndTime: number;
  preferredDays: number[]; // Days of week (0-6)
  minimumDuration: number; // Minutes
  bufferTime: number; // Minutes between events
}

export interface TimeSlot {
  start: Date;
  end: Date;
  confidence: number; // 0-1 score
  reason: string;
}

export interface RateLimitInfo {
  requestsMade: number;
  remainingRequests: number;
  resetTime: number;
  maxRequests: number;
  windowMs: number;
  backoffMultiplier: number;
}
