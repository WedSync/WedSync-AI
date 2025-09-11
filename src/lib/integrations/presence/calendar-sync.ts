import { z } from 'zod';
import { createHash, createHmac } from 'crypto';
import {
  OAuth2Credentials,
  PresenceStatus,
  PresenceState,
} from '@/types/presence';
import { updateUserPresence } from '@/lib/presence/presence-manager';
import {
  logIntegrationActivity,
  logIntegrationError,
} from '@/lib/integrations/audit-logger';
import {
  encryptIntegrationData,
  decryptIntegrationData,
} from '@/lib/security/encryption';

// TypeScript interfaces for calendar integration
export interface CalendarEvent {
  id: string;
  summary: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: string[];
  eventType: 'meeting' | 'appointment' | 'wedding_related' | 'personal';
  isAllDay: boolean;
}

export interface WeddingEventType {
  category:
    | 'ceremony_prep'
    | 'venue_visit'
    | 'client_meeting'
    | 'vendor_coordination'
    | 'other';
  suggestedStatus: PresenceStatus;
  suggestedMessage: string;
  duration: number;
}

export interface PresenceRelevantEvent {
  id: string;
  summary: string;
  startTime: Date;
  endTime: Date;
  weddingContext: WeddingEventType;
  location?: string;
}

// Google Calendar webhook schema
export const calendarWebhookSchema = z.object({
  eventType: z.enum([
    'meeting_started',
    'meeting_ended',
    'event_updated',
    'event_created',
    'event_deleted',
  ]),
  eventId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  summary: z.string().max(200),
  attendees: z.array(z.string().email()).optional(),
  location: z.string().optional(),
  signature: z.string(),
});

// Wedding event classification keywords
const weddingKeywords = {
  ceremony: [
    'ceremony',
    'rehearsal',
    'wedding day',
    'shoot',
    'photography',
    'photos',
  ],
  venue: [
    'venue',
    'site visit',
    'walkthrough',
    'setup',
    'venue tour',
    'location',
  ],
  client: ['client', 'couple', 'consultation', 'planning', 'bride', 'groom'],
  vendor: [
    'vendor',
    'caterer',
    'florist',
    'coordinator',
    'supplier',
    'team meeting',
  ],
};

// Wedding event classification logic
export function classifyWeddingEvent(event: CalendarEvent): WeddingEventType {
  const summary = event.summary.toLowerCase();
  const location = event.location?.toLowerCase() || '';

  // Check for ceremony-related keywords
  if (
    weddingKeywords.ceremony.some(
      (keyword) => summary.includes(keyword) || location.includes(keyword),
    )
  ) {
    return {
      category: 'ceremony_prep',
      suggestedStatus: 'busy',
      suggestedMessage: `📸 Ceremony prep - ${event.location || 'at venue'}`,
      duration: Math.ceil(
        (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60),
      ),
    };
  }

  // Check for venue-related keywords
  if (
    weddingKeywords.venue.some(
      (keyword) => summary.includes(keyword) || location.includes(keyword),
    )
  ) {
    return {
      category: 'venue_visit',
      suggestedStatus: 'busy',
      suggestedMessage: `🏰 Venue visit - ${event.location || 'on-site'}`,
      duration: Math.ceil(
        (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60),
      ),
    };
  }

  // Check for client meeting keywords
  if (weddingKeywords.client.some((keyword) => summary.includes(keyword))) {
    return {
      category: 'client_meeting',
      suggestedStatus: 'busy',
      suggestedMessage: `💑 Client consultation - ${event.summary.substring(0, 30)}`,
      duration: Math.ceil(
        (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60),
      ),
    };
  }

  // Check for vendor coordination keywords
  if (weddingKeywords.vendor.some((keyword) => summary.includes(keyword))) {
    return {
      category: 'vendor_coordination',
      suggestedStatus: 'busy',
      suggestedMessage: `🤝 Vendor coordination - ${event.summary.substring(0, 30)}`,
      duration: Math.ceil(
        (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60),
      ),
    };
  }

  // Default classification for other business events
  return {
    category: 'other',
    suggestedStatus: 'busy',
    suggestedMessage: `📅 In meeting - ${event.summary.substring(0, 30)}`,
    duration: Math.ceil(
      (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60),
    ),
  };
}

// Calendar Presence Sync Service
export class CalendarPresenceSync {
  private readonly webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.CALENDAR_WEBHOOK_SECRET || '';
    if (!this.webhookSecret) {
      throw new Error(
        'CALENDAR_WEBHOOK_SECRET environment variable is required',
      );
    }
  }

  /**
   * Set up Google Calendar integration for a user
   */
  async setupGoogleCalendarSync(
    userId: string,
    credentials: OAuth2Credentials,
  ): Promise<void> {
    try {
      // Encrypt and store credentials
      const encryptedCredentials = encryptIntegrationData(credentials);

      // Store in database (would need to implement database storage)
      await this.storeCalendarCredentials(
        userId,
        'google',
        encryptedCredentials,
      );

      // Set up webhook subscription with Google Calendar
      await this.createGoogleCalendarWebhook(userId, credentials);

      await logIntegrationActivity(userId, 'calendar_setup', {
        provider: 'google',
        status: 'success',
      });
    } catch (error) {
      await logIntegrationError(userId, 'calendar_setup_failed', error);
      throw error;
    }
  }

  /**
   * Set up Outlook/Exchange calendar integration
   */
  async setupOutlookSync(
    userId: string,
    credentials: OAuth2Credentials,
  ): Promise<void> {
    try {
      const encryptedCredentials = encryptIntegrationData(credentials);
      await this.storeCalendarCredentials(
        userId,
        'outlook',
        encryptedCredentials,
      );

      // Set up Microsoft Graph webhook subscription
      await this.createOutlookWebhook(userId, credentials);

      await logIntegrationActivity(userId, 'calendar_setup', {
        provider: 'outlook',
        status: 'success',
      });
    } catch (error) {
      await logIntegrationError(userId, 'calendar_setup_failed', error);
      throw error;
    }
  }

  /**
   * Process calendar event and update user presence accordingly
   */
  async processCalendarEvent(
    event: CalendarEvent,
    userId: string,
  ): Promise<void> {
    try {
      // Classify the event for wedding context
      const weddingContext = classifyWeddingEvent(event);

      // Update user presence based on event
      const presenceUpdate: Partial<PresenceState> = {
        status: weddingContext.suggestedStatus,
        customStatus: weddingContext.suggestedMessage,
        customEmoji: this.getEmojiForCategory(weddingContext.category),
        currentPage: `/calendar/${event.id}`,
        lastActivity: new Date(),
        isManualOverride: false,
      };

      await updateUserPresence(userId, presenceUpdate);

      // Schedule presence revert for when event ends
      if (weddingContext.duration > 0) {
        await this.schedulePresenceRevert(userId, event.endTime);
      }

      await logIntegrationActivity(userId, 'calendar_presence_update', {
        eventId: event.id,
        category: weddingContext.category,
        status: weddingContext.suggestedStatus,
        duration: weddingContext.duration,
      });
    } catch (error) {
      await logIntegrationError(
        userId,
        'calendar_event_processing_failed',
        error,
      );
      throw error;
    }
  }

  /**
   * Get upcoming events relevant for presence updates
   */
  async getUpcomingEventsForPresence(
    userId: string,
  ): Promise<PresenceRelevantEvent[]> {
    try {
      const credentials = await this.getCalendarCredentials(userId);
      if (!credentials) {
        return [];
      }

      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Fetch events from Google Calendar API (simplified)
      const events = await this.fetchGoogleCalendarEvents(
        credentials,
        now,
        nextWeek,
      );

      // Filter and enhance with wedding context
      return events.map((event) => ({
        ...event,
        weddingContext: classifyWeddingEvent(event),
      }));
    } catch (error) {
      await logIntegrationError(userId, 'fetch_upcoming_events_failed', error);
      return [];
    }
  }

  /**
   * Handle Outlook webhook for presence updates
   */
  async handleOutlookWebhook(webhook: any): Promise<void> {
    try {
      // Validate webhook signature
      if (!this.validateWebhookSignature(webhook, webhook.signature)) {
        throw new Error('Invalid webhook signature');
      }

      // Process the webhook data
      const event: CalendarEvent = this.parseOutlookWebhook(webhook);
      const userId = await this.getUserIdFromOutlookWebhook(webhook);

      if (userId) {
        await this.processCalendarEvent(event, userId);
      }
    } catch (error) {
      console.error('Outlook webhook processing failed:', error);
      throw error;
    }
  }

  /**
   * Generate presence status from calendar event
   */
  generatePresenceFromEvent(event: CalendarEvent): PresenceStatus {
    const weddingContext = classifyWeddingEvent(event);
    return weddingContext.suggestedStatus;
  }

  // Private helper methods
  private getEmojiForCategory(category: WeddingEventType['category']): string {
    const emojiMap = {
      ceremony_prep: '📸',
      venue_visit: '🏰',
      client_meeting: '💑',
      vendor_coordination: '🤝',
      other: '📅',
    };
    return emojiMap[category];
  }

  private async schedulePresenceRevert(
    userId: string,
    endTime: Date,
  ): Promise<void> {
    // Implementation would use a job queue or scheduler
    // For now, we'll use a simple setTimeout (in production, use Redis/Bull)
    const delay = endTime.getTime() - Date.now();

    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
      // Only schedule if within 24 hours
      setTimeout(async () => {
        await updateUserPresence(userId, {
          status: 'online',
          customStatus: null,
          customEmoji: null,
          currentPage: null,
        });
      }, delay);
    }
  }

  private validateWebhookSignature(data: any, signature: string): boolean {
    const payload = JSON.stringify(data);
    const expectedSignature = createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  private async storeCalendarCredentials(
    userId: string,
    provider: string,
    credentials: string,
  ): Promise<void> {
    // Implementation would store in database
    // This is a placeholder for the database integration
    console.log(
      `Storing calendar credentials for user ${userId}, provider ${provider}`,
    );
  }

  private async getCalendarCredentials(
    userId: string,
  ): Promise<OAuth2Credentials | null> {
    // Implementation would retrieve from database and decrypt
    // This is a placeholder
    return null;
  }

  private async createGoogleCalendarWebhook(
    userId: string,
    credentials: OAuth2Credentials,
  ): Promise<void> {
    // Implementation would use Google Calendar API to create webhook subscription
    console.log(`Creating Google Calendar webhook for user ${userId}`);
  }

  private async createOutlookWebhook(
    userId: string,
    credentials: OAuth2Credentials,
  ): Promise<void> {
    // Implementation would use Microsoft Graph API to create webhook subscription
    console.log(`Creating Outlook webhook for user ${userId}`);
  }

  private async fetchGoogleCalendarEvents(
    credentials: OAuth2Credentials,
    start: Date,
    end: Date,
  ): Promise<CalendarEvent[]> {
    // Implementation would use Google Calendar API
    // This is a placeholder
    return [];
  }

  private parseOutlookWebhook(webhook: any): CalendarEvent {
    // Implementation would parse Outlook/Graph webhook format
    return {
      id: webhook.eventId || '',
      summary: webhook.subject || '',
      startTime: new Date(webhook.startTime || Date.now()),
      endTime: new Date(webhook.endTime || Date.now() + 3600000),
      location: webhook.location,
      attendees: webhook.attendees || [],
      eventType: 'meeting',
      isAllDay: webhook.isAllDay || false,
    };
  }

  private async getUserIdFromOutlookWebhook(
    webhook: any,
  ): Promise<string | null> {
    // Implementation would map webhook data to user ID
    return webhook.userId || null;
  }
}

// Export calendar webhook signature verification function
export function verifyCalendarWebhookSignature(
  data: any,
  secret: string,
): boolean {
  const payload = JSON.stringify(data);
  const signature = data.signature;

  if (!signature || !secret) {
    return false;
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
}

// Export singleton instance
export const calendarSync = new CalendarPresenceSync();
