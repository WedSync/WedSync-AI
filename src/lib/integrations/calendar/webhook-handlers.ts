/**
 * Webhook Handlers for Calendar Providers
 * Processes incoming webhook notifications and coordinates sync operations
 */

import {
  CalendarProvider,
  WebhookSubscription,
  UnifiedWeddingEvent,
  CalendarConnection,
} from './types';
import { CalendarSyncEngine } from './sync-engine';
import { GoogleCalendarService } from './providers/google-calendar-service';
import { OutlookCalendarService } from './providers/outlook-calendar-service';
import { AppleCalendarService } from './providers/apple-calendar-service';

export interface WebhookPayload {
  provider: CalendarProvider;
  subscriptionId: string;
  changeType: 'created' | 'updated' | 'deleted';
  resourceId: string;
  eventId?: string;
  timestamp: string;
  data?: any;
}

export interface WebhookProcessingResult {
  success: boolean;
  processedEvents: number;
  errors: string[];
  syncTriggered: boolean;
  duration: number;
}

export class CalendarWebhookHandlers {
  private syncEngine: CalendarSyncEngine;
  private services: Map<CalendarProvider, any>;
  private processingQueue: Map<string, Promise<WebhookProcessingResult>>;

  constructor(syncEngine: CalendarSyncEngine) {
    this.syncEngine = syncEngine;
    this.services = new Map([
      ['google', new GoogleCalendarService()],
      ['outlook', new OutlookCalendarService()],
      ['apple', new AppleCalendarService()],
    ]);
    this.processingQueue = new Map();
  }

  /**
   * Main webhook processing dispatcher
   * Routes webhooks to appropriate provider handlers
   */
  async processWebhook(
    provider: CalendarProvider,
    payload: any,
    signature: string,
    headers: Record<string, string> = {},
  ): Promise<WebhookProcessingResult> {
    const startTime = Date.now();
    const processingId = `${provider}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Prevent duplicate processing
    if (this.processingQueue.has(processingId)) {
      return await this.processingQueue.get(processingId)!;
    }

    const processingPromise = this.executeWebhookProcessing(
      provider,
      payload,
      signature,
      headers,
      startTime,
    );

    this.processingQueue.set(processingId, processingPromise);

    try {
      const result = await processingPromise;
      return result;
    } finally {
      this.processingQueue.delete(processingId);
    }
  }

  /**
   * Execute webhook processing logic
   */
  private async executeWebhookProcessing(
    provider: CalendarProvider,
    payload: any,
    signature: string,
    headers: Record<string, string>,
    startTime: number,
  ): Promise<WebhookProcessingResult> {
    const result: WebhookProcessingResult = {
      success: false,
      processedEvents: 0,
      errors: [],
      syncTriggered: false,
      duration: 0,
    };

    try {
      // Route to appropriate provider handler
      let handlerResult: WebhookProcessingResult;

      switch (provider) {
        case 'google':
          handlerResult = await this.handleGoogleWebhook(
            payload,
            signature,
            headers,
          );
          break;
        case 'outlook':
          handlerResult = await this.handleOutlookWebhook(
            payload,
            signature,
            headers,
          );
          break;
        case 'apple':
          handlerResult = await this.handleAppleWebhook(
            payload,
            signature,
            headers,
          );
          break;
        default:
          throw new Error(`Unsupported calendar provider: ${provider}`);
      }

      result.success = handlerResult.success;
      result.processedEvents = handlerResult.processedEvents;
      result.errors = handlerResult.errors;
      result.syncTriggered = handlerResult.syncTriggered;
    } catch (error) {
      result.errors.push(`Webhook processing failed: ${error.message}`);
      console.error(`${provider} webhook processing error:`, error);
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Handle Google Calendar push notifications
   * Processes Google Calendar webhook events and triggers sync operations
   */
  private async handleGoogleWebhook(
    payload: any,
    signature: string,
    headers: Record<string, string>,
  ): Promise<WebhookProcessingResult> {
    const result: WebhookProcessingResult = {
      success: false,
      processedEvents: 0,
      errors: [],
      syncTriggered: false,
      duration: 0,
    };

    try {
      // Validate Google Calendar webhook
      const googleService = this.services.get('google');
      if (!googleService.validateWebhook(payload, signature)) {
        result.errors.push('Google Calendar webhook validation failed');
        return result;
      }

      // Extract channel information from headers
      const channelId = headers['x-goog-channel-id'];
      const resourceId = headers['x-goog-resource-id'];
      const resourceState = headers['x-goog-resource-state'];
      const resourceUri = headers['x-goog-resource-uri'];

      if (!channelId || !resourceId) {
        result.errors.push('Missing required Google Calendar webhook headers');
        return result;
      }

      // Skip sync state notifications
      if (resourceState === 'sync') {
        result.success = true;
        return result;
      }

      // Get the calendar connection for this channel
      const connection = await this.getConnectionByChannelId(channelId);
      if (!connection) {
        result.errors.push(`No connection found for channel ${channelId}`);
        return result;
      }

      // For Google Calendar, we need to fetch the actual changes using sync tokens
      const changes = await this.fetchGoogleCalendarChanges(
        connection,
        resourceId,
      );

      if (changes.length > 0) {
        // Process each changed event
        for (const change of changes) {
          await this.processEventChange(connection, change);
          result.processedEvents++;
        }

        // Trigger sync to other connected calendars if wedding events were affected
        const weddingChanges = changes.filter((c) => c.isWeddingEvent);
        if (weddingChanges.length > 0) {
          await this.triggerCrossCalendarSync(
            connection.userId,
            weddingChanges,
          );
          result.syncTriggered = true;
        }
      }

      result.success = true;
    } catch (error) {
      result.errors.push(`Google webhook processing error: ${error.message}`);
    }

    return result;
  }

  /**
   * Handle Microsoft Graph webhook notifications
   * Processes Outlook/Graph webhook events and triggers sync operations
   */
  private async handleOutlookWebhook(
    payload: any,
    signature: string,
    headers: Record<string, string>,
  ): Promise<WebhookProcessingResult> {
    const result: WebhookProcessingResult = {
      success: false,
      processedEvents: 0,
      errors: [],
      syncTriggered: false,
      duration: 0,
    };

    try {
      // Validate Microsoft Graph webhook
      const outlookService = this.services.get('outlook');
      if (!outlookService.validateWebhook(payload, signature)) {
        result.errors.push('Microsoft Graph webhook validation failed');
        return result;
      }

      // Handle subscription validation
      if (payload.validationToken) {
        // This is handled by the webhook validation - just return success
        result.success = true;
        return result;
      }

      // Process change notifications
      if (payload.value && Array.isArray(payload.value)) {
        for (const notification of payload.value) {
          try {
            // Get connection by subscription ID
            const connection = await this.getConnectionBySubscriptionId(
              notification.subscriptionId,
            );
            if (!connection) {
              result.errors.push(
                `No connection found for subscription ${notification.subscriptionId}`,
              );
              continue;
            }

            // Extract change information
            const changeInfo = {
              changeType: notification.changeType,
              resourceId: notification.resource,
              eventId: this.extractEventIdFromResource(notification.resource),
              clientState: notification.clientState,
              subscriptionExpirationDateTime:
                notification.subscriptionExpirationDateTime,
            };

            // Check if subscription needs renewal
            if (changeInfo.subscriptionExpirationDateTime) {
              await this.checkSubscriptionRenewal(
                connection,
                notification.subscriptionId,
                changeInfo.subscriptionExpirationDateTime,
              );
            }

            // Process the event change
            await this.processEventChange(connection, changeInfo);
            result.processedEvents++;

            // If this is a wedding event, trigger cross-calendar sync
            const isWeddingEvent = await this.isWeddingEvent(
              changeInfo.eventId,
            );
            if (isWeddingEvent) {
              await this.triggerCrossCalendarSync(connection.userId, [
                changeInfo,
              ]);
              result.syncTriggered = true;
            }
          } catch (error) {
            result.errors.push(
              `Failed to process notification: ${error.message}`,
            );
          }
        }
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.errors.push(`Outlook webhook processing error: ${error.message}`);
    }

    return result;
  }

  /**
   * Handle Apple Calendar polling notifications
   * Processes polling-based change detection for Apple calendars
   */
  private async handleAppleWebhook(
    payload: any,
    signature: string,
    headers: Record<string, string>,
  ): Promise<WebhookProcessingResult> {
    const result: WebhookProcessingResult = {
      success: false,
      processedEvents: 0,
      errors: [],
      syncTriggered: false,
      duration: 0,
    };

    try {
      // Validate Apple polling request
      const appleService = this.services.get('apple');
      if (!appleService.validateWebhook(payload, signature)) {
        result.errors.push('Apple Calendar polling validation failed');
        return result;
      }

      // Extract polling information
      const { jobId, connectionId, changes } = payload;

      if (!connectionId || !changes) {
        result.errors.push('Invalid Apple polling payload');
        return result;
      }

      // Get the connection
      const connection = await this.getConnectionById(connectionId);
      if (!connection) {
        result.errors.push(`No connection found for ID ${connectionId}`);
        return result;
      }

      // Process detected changes
      for (const change of changes) {
        try {
          await this.processEventChange(connection, {
            changeType: change.type,
            eventData: change.data,
            timestamp: change.timestamp,
          });
          result.processedEvents++;
        } catch (error) {
          result.errors.push(
            `Failed to process Apple change: ${error.message}`,
          );
        }
      }

      // Check if any wedding events were affected
      const weddingChanges = changes.filter((c) => c.isWeddingEvent);
      if (weddingChanges.length > 0) {
        await this.triggerCrossCalendarSync(connection.userId, weddingChanges);
        result.syncTriggered = true;
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.errors.push(`Apple polling processing error: ${error.message}`);
    }

    return result;
  }

  /**
   * Process individual event changes and update wedding timeline
   */
  private async processEventChange(
    connection: CalendarConnection,
    change: any,
  ): Promise<void> {
    try {
      // Determine if this is a wedding-related event
      const weddingEventId = await this.getWeddingEventId(
        change.eventId || change.resourceId,
      );

      if (!weddingEventId) {
        // Not a wedding event - no further processing needed
        return;
      }

      // Get the updated event data
      const updatedEvent = await this.fetchEventData(
        connection,
        change.eventId || change.resourceId,
      );

      if (!updatedEvent) {
        // Event was deleted or not found
        await this.handleEventDeletion(weddingEventId, connection);
        return;
      }

      // Update the wedding timeline event
      await this.updateWeddingTimelineEvent(
        weddingEventId,
        updatedEvent,
        connection,
      );

      // Log the change for audit purposes
      await this.logEventChange(
        weddingEventId,
        connection,
        change,
        updatedEvent,
      );
    } catch (error) {
      console.error('Error processing event change:', error);
      throw error;
    }
  }

  /**
   * Trigger synchronization to other connected calendars
   */
  private async triggerCrossCalendarSync(
    userId: string,
    changes: any[],
  ): Promise<void> {
    try {
      // Get all calendar connections for this user
      const connections = await this.getUserConnections(userId);

      if (connections.length <= 1) {
        // Only one calendar connected - no cross-sync needed
        return;
      }

      // Group changes by wedding ID
      const changesByWedding = await this.groupChangesByWedding(changes);

      // Trigger sync for each affected wedding
      for (const [weddingId, weddingChanges] of changesByWedding) {
        const weddingEvents = await this.getWeddingTimelineEvents(weddingId);

        // Only sync the changed events to other calendars
        const changedEvents = weddingEvents.filter((event) =>
          weddingChanges.some((change) => change.weddingEventId === event.id),
        );

        if (changedEvents.length > 0) {
          await this.syncEngine.syncWeddingTimeline(weddingId, changedEvents);
        }
      }
    } catch (error) {
      console.error('Error triggering cross-calendar sync:', error);
      throw error;
    }
  }

  /**
   * Fetch Google Calendar changes using sync tokens
   */
  private async fetchGoogleCalendarChanges(
    connection: CalendarConnection,
    resourceId: string,
  ): Promise<any[]> {
    try {
      const googleService = this.services.get('google');

      // Use incremental sync to get only changed events
      const changes = await googleService.getIncrementalChanges(
        connection,
        resourceId,
      );

      return changes.map((change) => ({
        eventId: change.id,
        changeType: change.status === 'cancelled' ? 'deleted' : 'updated',
        eventData: change,
        isWeddingEvent: this.isWeddingEventData(change),
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error fetching Google Calendar changes:', error);
      return [];
    }
  }

  /**
   * Check if subscription needs renewal and renew if necessary
   */
  private async checkSubscriptionRenewal(
    connection: CalendarConnection,
    subscriptionId: string,
    expirationTime: string,
  ): Promise<void> {
    const expirationDate = new Date(expirationTime);
    const renewalThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    if (expirationDate < renewalThreshold) {
      try {
        const outlookService = this.services.get('outlook');
        await outlookService.renewSubscription(subscriptionId, connection);
        console.log(`Renewed Outlook subscription ${subscriptionId}`);
      } catch (error) {
        console.error(
          `Failed to renew Outlook subscription ${subscriptionId}:`,
          error,
        );
      }
    }
  }

  /**
   * Get webhook processing statistics
   */
  getProcessingStats(): {
    activeProcessing: number;
    totalProcessed: number;
    recentErrors: string[];
  } {
    return {
      activeProcessing: this.processingQueue.size,
      totalProcessed: 0, // Would be tracked in production
      recentErrors: [], // Would be tracked in production
    };
  }

  /**
   * Clean up expired processing entries
   */
  private cleanup(): void {
    // Clean up old processing entries periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, promise] of this.processingQueue.entries()) {
        // Remove entries older than 5 minutes
        const [, timestamp] = key.split('-');
        if (now - parseInt(timestamp) > 300000) {
          this.processingQueue.delete(key);
        }
      }
    }, 60000); // Run cleanup every minute
  }

  // Helper methods (simplified implementations)
  private async getConnectionByChannelId(
    channelId: string,
  ): Promise<CalendarConnection | null> {
    // Implementation would query database for connection by Google channel ID
    return null;
  }

  private async getConnectionBySubscriptionId(
    subscriptionId: string,
  ): Promise<CalendarConnection | null> {
    // Implementation would query database for connection by Outlook subscription ID
    return null;
  }

  private async getConnectionById(
    connectionId: string,
  ): Promise<CalendarConnection | null> {
    // Implementation would query database for connection by ID
    return null;
  }

  private async getWeddingEventId(
    externalEventId: string,
  ): Promise<string | null> {
    // Implementation would query database to map external event ID to wedding event ID
    return null;
  }

  private async fetchEventData(
    connection: CalendarConnection,
    eventId: string,
  ): Promise<any> {
    // Implementation would fetch event data from the provider
    return null;
  }

  private async isWeddingEvent(eventId: string): Promise<boolean> {
    // Implementation would check if event is a wedding event
    return false;
  }

  private isWeddingEventData(eventData: any): boolean {
    // Implementation would check event data for wedding markers
    return (
      eventData.summary?.includes('Wedding') ||
      eventData.description?.includes('wedsync')
    );
  }

  private extractEventIdFromResource(resource: string): string {
    // Extract event ID from Microsoft Graph resource URL
    const match = resource.match(/events\/([^\/]+)/);
    return match ? match[1] : '';
  }

  private async updateWeddingTimelineEvent(
    weddingEventId: string,
    updatedEvent: any,
    connection: CalendarConnection,
  ): Promise<void> {
    // Implementation would update wedding timeline with changed event data
  }

  private async handleEventDeletion(
    weddingEventId: string,
    connection: CalendarConnection,
  ): Promise<void> {
    // Implementation would handle deletion of wedding events
  }

  private async logEventChange(
    weddingEventId: string,
    connection: CalendarConnection,
    change: any,
    updatedEvent: any,
  ): Promise<void> {
    // Implementation would log event changes for audit trail
  }

  private async getUserConnections(
    userId: string,
  ): Promise<CalendarConnection[]> {
    // Implementation would get all calendar connections for user
    return [];
  }

  private async groupChangesByWedding(
    changes: any[],
  ): Promise<Map<string, any[]>> {
    // Implementation would group changes by wedding ID
    return new Map();
  }

  private async getWeddingTimelineEvents(
    weddingId: string,
  ): Promise<UnifiedWeddingEvent[]> {
    // Implementation would get wedding timeline events
    return [];
  }
}
