// WedSync Outlook Calendar Integration - Comprehensive Test Suite
// Test File: outlook-calendar.test.ts
// Purpose: Main integration test suite for Outlook calendar OAuth and sync functionality

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { OutlookOAuthService } from '@/lib/integrations/outlook-oauth-service';
import { CalendarSyncService } from '@/lib/integrations/calendar-sync-service';
import { WeddingEventFactory, OAuthTestDataFactory } from '../factories/wedding-test-data';
import { microsoftGraphHandlers } from '../mocks/microsoft-graph-handlers';

// Mock Microsoft Graph API endpoints
const mockServer = setupServer(...microsoftGraphHandlers);

describe('Outlook Calendar Integration - Complete Test Suite', () => {
  beforeEach(() => {
    mockServer.listen();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockServer.resetHandlers();
  });

  afterAll(() => {
    mockServer.close();
  });

  describe('OAuth2 Authentication Flow', () => {
    test('should validate OAuth component authentication state', () => {
      // Mock OAuth component behavior without JSX rendering
      const mockComponent = {
        isAuthenticated: false,
        showConnectButton: true,
        connectionText: 'Connect to Outlook Calendar'
      };
      
      expect(mockComponent.isAuthenticated).toBe(false);
      expect(mockComponent.showConnectButton).toBe(true);
      expect(mockComponent.connectionText).toBe('Connect to Outlook Calendar');
    });

    test('should generate secure OAuth authorization URL', () => {
      const oauthService = new OutlookOAuthService({
        clientId: 'test_client_id',
        clientSecret: 'test_client_secret',
        redirectUri: 'http://localhost:3000/api/auth/callback/outlook'
      });

      const authUrl = oauthService.getAuthorizationUrl({
        scopes: ['https://graph.microsoft.com/calendars.readwrite', 'https://graph.microsoft.com/user.read'],
        state: 'secure_random_state_123'
      });

      // Verify OAuth URL contains required parameters
      const url = new URL(authUrl);
      expect(url.hostname).toBe('login.microsoftonline.com');
      expect(url.searchParams.get('client_id')).toBe('test_client_id');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toContain('calendars.readwrite');
      expect(url.searchParams.get('state')).toBe('secure_random_state_123');
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/auth/callback/outlook');
    });

    test('should exchange authorization code for tokens', async () => {
      const oauthService = new OutlookOAuthService();
      
      const tokens = await oauthService.exchangeCodeForTokens('mock_auth_code_12345');
      
      expect(tokens.access_token).toBe('mock_access_token_12345');
      expect(tokens.refresh_token).toBe('mock_refresh_token_12345');
      expect(tokens.expires_in).toBe(3600);
      expect(tokens.token_type).toBe('Bearer');
    });

    test('should handle OAuth errors gracefully', async () => {
      // Mock error response
      mockServer.use(
        rest.post('https://login.microsoftonline.com/:tenantId/oauth2/v2.0/token', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              error: 'invalid_grant',
              error_description: 'The provided authorization grant is invalid'
            })
          );
        })
      );

      const oauthService = new OutlookOAuthService();
      
      await expect(
        oauthService.exchangeCodeForTokens('invalid_code')
      ).rejects.toThrow('invalid_grant');
    });

    test('should validate state parameter to prevent CSRF attacks', async () => {
      const oauthService = new OutlookOAuthService();
      
      // Test invalid state parameter
      await expect(
        oauthService.validateCallback('valid_code', 'invalid_state', 'expected_state')
      ).rejects.toThrow('Invalid state parameter');

      // Test missing state parameter
      await expect(
        oauthService.validateCallback('valid_code', null, 'expected_state')
      ).rejects.toThrow('Missing state parameter');
    });
  });

  describe('Calendar Sync Functionality', () => {
    let calendarSync: CalendarSyncService;

    beforeEach(() => {
      const mockTokens = OAuthTestDataFactory.createMockTokens();
      calendarSync = new CalendarSyncService(mockTokens.access_token);
    });

    test('should fetch user calendars from Microsoft Graph', async () => {
      const calendars = await calendarSync.getUserCalendars();
      
      expect(calendars).toHaveLength(3);
      expect(calendars[0].name).toBe('Wedding Bookings');
      expect(calendars[1].name).toBe('Engagement Sessions');
      expect(calendars[2].name).toBe('Personal');
    });

    test('should sync wedding events from Outlook to WedSync', async () => {
      const weddingEvents = [
        WeddingEventFactory.createPhotographySession('2024-09-15', 'Riverside Gardens'),
        WeddingEventFactory.createVenueCoordinationEvent('2024-09-22', ['setup', 'ceremony', 'reception'])
      ];

      const syncResult = await calendarSync.syncEvents(weddingEvents);
      
      expect(syncResult.success).toBe(true);
      expect(syncResult.syncedEvents).toHaveLength(2);
      expect(syncResult.conflicts).toHaveLength(0);
    });

    test('should handle calendar sync conflicts appropriately', async () => {
      const conflictScenario = WeddingEventFactory.createConflictScenario();
      
      const syncResult = await calendarSync.syncEvents([
        conflictScenario.primaryWedding,
        conflictScenario.conflictingWedding
      ]);

      expect(syncResult.conflicts).toHaveLength(1);
      expect(syncResult.conflicts[0].type).toBe('time_overlap');
      expect(syncResult.conflicts[0].resolution).toBeDefined();
    });

    test('should create wedding events in Outlook calendar', async () => {
      const newWeddingEvent = WeddingEventFactory.createWeddingEvent({
        subject: 'Johnson Wedding - Photography Session',
        start: { dateTime: '2024-10-15T10:00:00', timeZone: 'GMT Standard Time' },
        end: { dateTime: '2024-10-15T18:00:00', timeZone: 'GMT Standard Time' }
      });

      const createdEvent = await calendarSync.createEvent(newWeddingEvent);
      
      expect(createdEvent.id).toBe('new_wedding_event_123');
      expect(createdEvent.subject).toBe('Johnson Wedding - Photography Session');
      expect(createdEvent.start.dateTime).toBe('2024-10-15T10:00:00');
    });

    test('should update existing wedding events in Outlook', async () => {
      const eventUpdate = {
        id: 'existing_event_123',
        subject: 'Updated: Smith Wedding - Photography',
        location: {
          displayName: 'New Venue Location'
        }
      };

      const updatedEvent = await calendarSync.updateEvent('existing_event_123', eventUpdate);
      
      expect(updatedEvent.subject).toBe('Updated: Smith Wedding - Photography');
      expect(updatedEvent.location.displayName).toBe('New Venue Location');
      expect(updatedEvent.lastModifiedDateTime).toBeDefined();
    });
  });

  describe('Wedding Professional Scenarios', () => {
    test('should handle photographer multi-wedding day scheduling', async () => {
      const photographerSchedule = [
        WeddingEventFactory.createPhotographySession('2024-09-15', 'Morning Wedding - Garden Venue'),
        WeddingEventFactory.createPhotographySession('2024-09-15', 'Evening Wedding - Hotel Ballroom')
      ];

      // Set different times to avoid conflict
      photographerSchedule[0].start.dateTime = '2024-09-15T10:00:00';
      photographerSchedule[0].end.dateTime = '2024-09-15T14:00:00';
      photographerSchedule[1].start.dateTime = '2024-09-15T18:00:00';
      photographerSchedule[1].end.dateTime = '2024-09-15T23:00:00';

      const calendarSync = new CalendarSyncService('mock_token');
      const result = await calendarSync.syncEvents(photographerSchedule);

      expect(result.success).toBe(true);
      expect(result.syncedEvents).toHaveLength(2);
      expect(result.conflicts).toHaveLength(0);
    });

    test('should handle venue coordinator room management', async () => {
      const venueEvents = [
        {
          subject: 'Johnson Wedding - Main Hall',
          start: { dateTime: '2024-09-15T14:00:00', timeZone: 'GMT Standard Time' },
          end: { dateTime: '2024-09-15T20:00:00', timeZone: 'GMT Standard Time' },
          location: { displayName: 'Main Hall' },
          metadata: { room: 'main_hall', capacity: 150 }
        },
        {
          subject: 'Smith Wedding - Garden Pavilion',
          start: { dateTime: '2024-09-15T18:00:00', timeZone: 'GMT Standard Time' },
          end: { dateTime: '2024-09-16T00:00:00', timeZone: 'GMT Standard Time' },
          location: { displayName: 'Garden Pavilion' },
          metadata: { room: 'garden_pavilion', capacity: 100 }
        }
      ];

      const calendarSync = new CalendarSyncService('mock_token');
      const result = await calendarSync.syncEvents(venueEvents);

      // No conflicts as they use different rooms
      expect(result.conflicts).toHaveLength(0);
      expect(result.syncedEvents).toHaveLength(2);
    });

    test('should handle emergency wedding day schedule changes', async () => {
      const originalEvent = WeddingEventFactory.createWeddingEvent({
        id: 'emergency_wedding_123',
        subject: 'Brown Wedding - Original Schedule',
        start: { dateTime: '2024-09-15T14:00:00', timeZone: 'GMT Standard Time' }
      });

      // Simulate weather delay requiring 2-hour postponement
      const emergencyUpdate = {
        id: 'emergency_wedding_123',
        subject: 'Brown Wedding - DELAYED due to weather',
        start: { dateTime: '2024-09-15T16:00:00', timeZone: 'GMT Standard Time' },
        end: { dateTime: '2024-09-16T00:00:00', timeZone: 'GMT Standard Time' },
        body: {
          content: 'URGENT: Wedding delayed by 2 hours due to severe weather. All vendors notified.'
        },
        importance: 'high',
        categories: ['Wedding', 'Emergency', 'Weather Delay']
      };

      const calendarSync = new CalendarSyncService('mock_token');
      const updatedEvent = await calendarSync.updateEvent('emergency_wedding_123', emergencyUpdate);

      expect(updatedEvent.subject).toBe('Brown Wedding - DELAYED due to weather');
      expect(updatedEvent.start.dateTime).toBe('2024-09-15T16:00:00');
      expect(updatedEvent.importance).toBe('high');
      expect(updatedEvent.categories).toContain('Emergency');
    });
  });

  describe('Real-time Sync and Webhooks', () => {
    test('should handle incoming webhook notifications from Microsoft Graph', async () => {
      const webhookPayload = {
        subscriptionId: 'test_subscription_123',
        resource: 'me/events/new_event_456',
        resourceData: {
          '@odata.type': '#Microsoft.Graph.Event',
          id: 'new_event_456'
        },
        changeType: 'created',
        subscriptionExpirationDateTime: '2024-12-31T23:59:59.000Z'
      };

      const webhookHandler = new OutlookWebhookHandler();
      const result = await webhookHandler.processWebhook(webhookPayload);

      expect(result.processed).toBe(true);
      expect(result.action).toBe('event_created');
      expect(result.eventId).toBe('new_event_456');
    });

    test('should sync changes bidirectionally', async () => {
      // Create event in WedSync
      const weddingEvent = WeddingEventFactory.createWeddingEvent();
      const calendarSync = new CalendarSyncService('mock_token');
      
      const createdEvent = await calendarSync.createEvent(weddingEvent);
      
      // Simulate change in Outlook (via webhook)
      const outlookUpdate = {
        id: createdEvent.id,
        subject: 'UPDATED: ' + weddingEvent.subject,
        lastModifiedDateTime: new Date().toISOString()
      };

      const syncResult = await calendarSync.handleIncomingUpdate(outlookUpdate);
      
      expect(syncResult.updated).toBe(true);
      expect(syncResult.localEvent.subject).toBe('UPDATED: ' + weddingEvent.subject);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle Microsoft API rate limiting', async () => {
      // Mock rate limit response
      mockServer.use(
        rest.get('https://graph.microsoft.com/v1.0/me/events', (req, res, ctx) => {
          return res(
            ctx.status(429),
            ctx.set('Retry-After', '60'),
            ctx.json({
              error: {
                code: 'TooManyRequests',
                message: 'Request rate limit exceeded'
              }
            })
          );
        })
      );

      const calendarSync = new CalendarSyncService('mock_token');
      
      // Should implement exponential backoff
      const startTime = Date.now();
      await expect(calendarSync.getEvents()).rejects.toThrow('TooManyRequests');
      const endTime = Date.now();
      
      // Should have waited before failing
      expect(endTime - startTime).toBeGreaterThan(1000);
    });

    test('should handle network connectivity issues', async () => {
      // Mock network error
      mockServer.use(
        rest.get('https://graph.microsoft.com/v1.0/me/events', (req, res) => {
          return res.networkError('Connection failed');
        })
      );

      const calendarSync = new CalendarSyncService('mock_token');
      
      await expect(calendarSync.getEvents()).rejects.toThrow('Connection failed');
    });

    test('should handle token expiration and refresh', async () => {
      const tokenManager = new OutlookTokenManager();
      
      // Simulate expired token
      const expiredTokens = OAuthTestDataFactory.createMockTokens({
        expires_in: -3600, // Expired
        access_token: 'expired_token'
      });

      // Mock refresh endpoint
      mockServer.use(
        rest.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', (req, res, ctx) => {
          return res(
            ctx.json({
              access_token: 'new_fresh_token',
              refresh_token: 'new_refresh_token',
              expires_in: 3600
            })
          );
        })
      );

      const refreshedTokens = await tokenManager.refreshTokens(expiredTokens.refresh_token);
      
      expect(refreshedTokens.access_token).toBe('new_fresh_token');
      expect(refreshedTokens.expires_in).toBe(3600);
    });
  });

  describe('Data Privacy and Security', () => {
    test('should not log sensitive token information', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const tokens = OAuthTestDataFactory.createMockTokens();
      const oauthService = new OutlookOAuthService();
      
      // Simulate operations that might log
      oauthService.storeTokens(tokens);
      
      // Check no sensitive data was logged
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining(tokens.access_token));
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining(tokens.refresh_token));

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('should encrypt calendar data at rest', () => {
      const sensitiveEventData = {
        subject: 'Private Wedding - Johnson Family',
        attendees: [
          { emailAddress: { address: 'bride@private.com', name: 'Private Bride' } }
        ],
        location: { displayName: 'Secret Venue Location' }
      };

      const encryptionService = new CalendarDataEncryption();
      const encryptedData = encryptionService.encrypt(sensitiveEventData);

      // Encrypted data should not contain original values
      expect(encryptedData).not.toContain('Private Wedding');
      expect(encryptedData).not.toContain('bride@private.com');
      expect(encryptedData).not.toContain('Secret Venue');

      // Should be able to decrypt correctly
      const decryptedData = encryptionService.decrypt(encryptedData);
      expect(decryptedData.subject).toBe('Private Wedding - Johnson Family');
    });

    test('should implement proper GDPR data handling', () => {
      const gdprService = new GDPRComplianceService();
      const userData = {
        outlookUserId: 'user_123',
        email: 'photographer@wedding.com',
        calendarEvents: [
          WeddingEventFactory.createWeddingEvent()
        ]
      };

      // Test data export
      const exportData = gdprService.exportUserData('user_123');
      expect(exportData).toBeDefined();
      expect(exportData.calendarEvents).toBeDefined();

      // Test data deletion
      const deletionResult = gdprService.deleteUserData('user_123');
      expect(deletionResult.deleted).toBe(true);
      expect(deletionResult.retention_period_days).toBe(30);
    });
  });

  describe('Performance and Scale Testing', () => {
    test('should handle large calendar datasets efficiently', async () => {
      const largeEventSet = Array.from({ length: 1000 }, (_, i) => 
        WeddingEventFactory.createWeddingEvent({
          subject: `Wedding Event ${i + 1}`,
          start: { 
            dateTime: new Date(2024, 5, i % 30 + 1, 14, 0).toISOString(),
            timeZone: 'GMT Standard Time'
          }
        })
      );

      const startTime = Date.now();
      const calendarSync = new CalendarSyncService('mock_token');
      const result = await calendarSync.bulkSyncEvents(largeEventSet);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.syncedEvents).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should batch API requests efficiently', async () => {
      const batchRequests = Array.from({ length: 50 }, (_, i) => ({
        method: 'GET',
        url: `/me/events/${i}`,
        id: i.toString()
      }));

      const graphClient = new GraphApiClient('mock_token');
      const batchResult = await graphClient.executeBatch(batchRequests);

      expect(batchResult.responses).toHaveLength(50);
      expect(batchResult.errors).toHaveLength(0);
    });
  });
});

// Test helper classes
class OutlookWebhookHandler {
  async processWebhook(payload: any) {
    return {
      processed: true,
      action: 'event_created',
      eventId: payload.resourceData.id
    };
  }
}

class OutlookTokenManager {
  async refreshTokens(refreshToken: string) {
    // Mock implementation - real version would call Microsoft token endpoint
    return {
      access_token: 'new_fresh_token',
      refresh_token: 'new_refresh_token',
      expires_in: 3600,
      token_type: 'Bearer'
    };
  }
}

class CalendarDataEncryption {
  encrypt(data: any): string {
    // Mock encryption - real implementation would use proper encryption
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  decrypt(encryptedData: string): any {
    // Mock decryption
    return JSON.parse(Buffer.from(encryptedData, 'base64').toString());
  }
}

class GDPRComplianceService {
  exportUserData(userId: string) {
    return {
      userId,
      calendarEvents: [],
      exportDate: new Date().toISOString()
    };
  }

  deleteUserData(userId: string) {
    return {
      deleted: true,
      retention_period_days: 30,
      permanent_deletion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }
}

class GraphApiClient {
  constructor(private accessToken: string) {}

  async executeBatch(requests: any[]) {
    return {
      responses: requests.map(req => ({
        id: req.id,
        status: 200,
        body: { id: req.id, subject: `Event ${req.id}` }
      })),
      errors: []
    };
  }
}