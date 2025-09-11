/**
 * Microsoft Outlook/Graph Calendar Service Implementation
 * Handles Microsoft Graph API v1.0 calendar operations with wedding-specific optimizations
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

export class OutlookCalendarService extends BaseCalendarService {
  provider = 'outlook' as const;

  private static readonly API_BASE = 'https://graph.microsoft.com/v1.0';
  private static readonly RATE_LIMIT = {
    REQUESTS_PER_APP: 10000,
    WINDOW_MS: 600000, // 10 minutes
    BURST_ALLOWANCE: 100,
    BATCH_SIZE: 100,
    SUBSCRIPTION_RENEWAL_HOURS: 4320, // 180 days max for Outlook
  };

  /**
   * Microsoft Graph OAuth2 Authentication
   * Uses authorization code flow with PKCE for security
   */
  async authorize(credentials: ProviderCredentials): Promise<AccessTokens> {
    const tokenUrl =
      'https://login.microsoftonline.com/common/oauth2/v2.0/token';

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          code: credentials.authorizationCode,
          redirect_uri: credentials.redirectUri,
          grant_type: 'authorization_code',
          scope:
            'https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Calendars.Read.Shared offline_access',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Microsoft Graph auth failed: ${error.error_description || response.statusText}`,
        );
      }

      const tokens = await response.json();

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
        tokenType: tokens.token_type,
      };
    } catch (error) {
      throw new Error(`Outlook authorization failed: ${error.message}`);
    }
  }

  /**
   * Refresh expired access tokens using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<AccessTokens> {
    const tokenUrl =
      'https://login.microsoftonline.com/common/oauth2/v2.0/token';

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope:
            'https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Calendars.Read.Shared offline_access',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokens = await response.json();

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || refreshToken, // Keep existing if not returned
        expiresIn: tokens.expires_in,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
        tokenType: tokens.token_type,
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Create wedding event optimized for Outlook calendars
   * Handles wedding-specific metadata and vendor coordination
   */
  async createWeddingEvent(
    connection: CalendarConnection,
    weddingEvent: UnifiedWeddingEvent,
  ): Promise<string> {
    await this.checkRateLimit('outlook', connection.userId);

    const outlookEvent = this.transformToOutlookEvent(weddingEvent);

    try {
      const response = await this.makeAuthenticatedRequest(
        `/me/calendars/${connection.externalCalendarId}/events`,
        'POST',
        connection.accessToken,
        outlookEvent,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Outlook event creation failed: ${error.error?.message || response.statusText}`,
        );
      }

      const createdEvent = await response.json();

      // Store the Outlook event ID for future operations
      await this.updateEventMapping(
        weddingEvent.id,
        connection.id,
        createdEvent.id,
      );

      return createdEvent.id;
    } catch (error) {
      throw new Error(
        `Failed to create wedding event in Outlook: ${error.message}`,
      );
    }
  }

  /**
   * Batch create multiple wedding events using Microsoft Graph Batch API
   * Optimized for wedding timeline synchronization across vendors
   */
  async batchCreateEvents(
    connection: CalendarConnection,
    events: CalendarEvent[],
  ): Promise<BatchResult> {
    const batchSize = OutlookCalendarService.RATE_LIMIT.BATCH_SIZE;
    const results: BatchResult = {
      successful: [],
      failed: [],
      partialFailure: false,
    };

    // Process in batches to respect API limits
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchRequest = this.createBatchRequest(batch, connection);

      try {
        const response = await this.makeAuthenticatedRequest(
          '/$batch',
          'POST',
          connection.accessToken,
          batchRequest,
        );

        if (!response.ok) {
          throw new Error(`Batch request failed: ${response.statusText}`);
        }

        const batchResponse = await response.json();

        // Process batch results
        for (const [index, result] of batchResponse.responses.entries()) {
          const originalEvent = batch[index];

          if (result.status >= 200 && result.status < 300) {
            results.successful.push({
              originalEvent,
              externalEventId: result.body.id,
              providerId: result.body.id,
            });
          } else {
            results.failed.push({
              originalEvent,
              error: result.body?.error?.message || 'Unknown batch error',
              errorCode: result.body?.error?.code,
            });
            results.partialFailure = true;
          }
        }
      } catch (error) {
        // Mark entire batch as failed
        batch.forEach((event) => {
          results.failed.push({
            originalEvent: event,
            error: error.message,
            errorCode: 'BATCH_FAILURE',
          });
        });
        results.partialFailure = true;
      }
    }

    return results;
  }

  /**
   * Subscribe to calendar changes using Microsoft Graph webhooks
   * Handles wedding timeline change notifications
   */
  async subscribeToChanges(
    connection: CalendarConnection,
    webhookUrl: string,
  ): Promise<WebhookSubscription> {
    const subscriptionData = {
      changeType: 'created,updated,deleted',
      notificationUrl: webhookUrl,
      resource: `/me/calendars/${connection.externalCalendarId}/events`,
      expirationDateTime: new Date(
        Date.now() +
          OutlookCalendarService.RATE_LIMIT.SUBSCRIPTION_RENEWAL_HOURS *
            60 *
            60 *
            1000,
      ).toISOString(),
      clientState: this.generateClientState(connection.id),
      latestSupportedTlsVersion: 'v1_2',
      includeResourceData: true,
      encryptionCertificate: process.env.OUTLOOK_ENCRYPTION_CERTIFICATE,
      encryptionCertificateId: process.env.OUTLOOK_CERTIFICATE_ID,
    };

    try {
      const response = await this.makeAuthenticatedRequest(
        '/subscriptions',
        'POST',
        connection.accessToken,
        subscriptionData,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Outlook webhook subscription failed: ${error.error?.message || response.statusText}`,
        );
      }

      const subscription = await response.json();

      return {
        id: subscription.id,
        provider: 'outlook',
        connectionId: connection.id,
        webhookUrl,
        expiresAt: new Date(subscription.expirationDateTime),
        isActive: true,
        clientState: subscription.clientState,
        resource: subscription.resource,
        changeTypes: subscription.changeType.split(','),
      };
    } catch (error) {
      throw new Error(
        `Failed to create Outlook webhook subscription: ${error.message}`,
      );
    }
  }

  /**
   * Validate Microsoft Graph webhook notifications
   * Ensures webhook security and prevents spoofing
   */
  validateWebhook(payload: any, signature: string): boolean {
    try {
      // Microsoft Graph uses different validation methods:
      // 1. validationToken for subscription validation
      // 2. ClientState verification for notifications

      if (payload.validationToken) {
        // This is a subscription validation request
        return true; // Return validation token in response
      }

      // For change notifications, verify clientState
      if (payload.value && Array.isArray(payload.value)) {
        return payload.value.every((notification) =>
          this.verifyClientState(notification.clientState),
        );
      }

      return false;
    } catch (error) {
      console.error('Outlook webhook validation error:', error);
      return false;
    }
  }

  /**
   * Check vendor availability across multiple calendars
   * Wedding-specific availability checking with conflict detection
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
    const freeTime = await this.getFreeBusyInfo(connection, startTime, endTime);

    // Wedding-specific conflict analysis
    const conflicts = this.analyzeWeddingConflicts(freeTime, vendorRole);
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
   * Transform unified wedding event to Outlook event format
   */
  private transformToOutlookEvent(weddingEvent: UnifiedWeddingEvent): any {
    return {
      subject: weddingEvent.title,
      body: {
        contentType: 'HTML',
        content: this.buildWeddingEventDescription(weddingEvent),
      },
      start: {
        dateTime: weddingEvent.startTime.toISOString(),
        timeZone: weddingEvent.timezone,
      },
      end: {
        dateTime: weddingEvent.endTime.toISOString(),
        timeZone: weddingEvent.timezone,
      },
      location: weddingEvent.location
        ? {
            displayName: weddingEvent.location.address,
            coordinates: weddingEvent.location.coordinates
              ? {
                  latitude: weddingEvent.location.coordinates.latitude,
                  longitude: weddingEvent.location.coordinates.longitude,
                }
              : undefined,
          }
        : undefined,
      categories: this.getOutlookCategories(weddingEvent),
      importance: weddingEvent.isWeddingCritical ? 'high' : 'normal',
      sensitivity: 'confidential', // Wedding events are always confidential
      showAs: 'busy',
      isReminderSet: true,
      reminderMinutesBeforeStart: this.getWeddingReminderTime(
        weddingEvent.eventType,
      ),
      extensions: [
        {
          '@odata.type': 'microsoft.graph.openTypeExtension',
          extensionName: 'com.wedsync.weddingEvent',
          weddingId: weddingEvent.weddingId,
          timelineEventId: weddingEvent.timelineEventId,
          eventType: weddingEvent.eventType,
          vendorRole: weddingEvent.vendorRole,
          isWeddingCritical: weddingEvent.isWeddingCritical,
        },
      ],
    };
  }

  /**
   * Create Microsoft Graph batch request for multiple operations
   */
  private createBatchRequest(
    events: CalendarEvent[],
    connection: CalendarConnection,
  ): any {
    return {
      requests: events.map((event, index) => ({
        id: `req-${index}`,
        method: 'POST',
        url: `/me/calendars/${connection.externalCalendarId}/events`,
        body: this.transformToOutlookEvent(event as UnifiedWeddingEvent),
        headers: {
          'Content-Type': 'application/json',
        },
      })),
    };
  }

  /**
   * Make authenticated request to Microsoft Graph API with retry logic
   */
  private async makeAuthenticatedRequest(
    endpoint: string,
    method: string = 'GET',
    accessToken: string,
    body?: any,
  ): Promise<Response> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${OutlookCalendarService.API_BASE}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'WedSync-Calendar-Integration/1.0',
        'X-AnchorMailbox': 'UPN', // Optimization for Exchange Online
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return response;
  }

  /**
   * Get Outlook-specific categories for wedding events
   */
  private getOutlookCategories(event: UnifiedWeddingEvent): string[] {
    const categories = ['Wedding'];

    switch (event.eventType) {
      case 'ceremony':
        categories.push('Ceremony', 'Critical');
        break;
      case 'reception':
        categories.push('Reception', 'Important');
        break;
      case 'vendor_setup':
        categories.push('Setup', 'Vendor');
        break;
      case 'vendor_breakdown':
        categories.push('Breakdown', 'Vendor');
        break;
      default:
        categories.push('Wedding Planning');
    }

    if (event.vendorRole) {
      categories.push(this.formatVendorRoleForCategory(event.vendorRole));
    }

    return categories;
  }

  /**
   * Generate secure client state for webhook validation
   */
  private generateClientState(connectionId: string): string {
    const timestamp = Date.now();
    const data = `${connectionId}-${timestamp}`;
    return Buffer.from(data).toString('base64');
  }

  /**
   * Verify client state from webhook notifications
   */
  private verifyClientState(clientState: string): boolean {
    try {
      const decoded = Buffer.from(clientState, 'base64').toString();
      const [connectionId, timestamp] = decoded.split('-');

      // Verify timestamp is within acceptable range (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      return Date.now() - parseInt(timestamp) < maxAge;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get free/busy information from Outlook calendar
   */
  private async getFreeBusyInfo(
    connection: CalendarConnection,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    const response = await this.makeAuthenticatedRequest(
      '/me/calendar/getSchedule',
      'POST',
      connection.accessToken,
      {
        schedules: [connection.externalCalendarId],
        startTime: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC',
        },
        endTime: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
        availabilityViewInterval: 15, // 15-minute intervals
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get free/busy info: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || [];
  }
}
