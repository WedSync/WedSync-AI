/**
 * Comprehensive Test Suite for Calendar Integration System
 * Tests all major components: providers, sync engine, webhooks, health monitoring
 */

import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { 
  CalendarSyncEngine, 
  GoogleCalendarService, 
  OutlookCalendarService, 
  AppleCalendarService,
  CalendarWebhookHandlers,
  CalendarIntegrationHealthMonitor
} from '../../../src/lib/integrations/calendar';
import { 
  UnifiedWeddingEvent, 
  CalendarConnection, 
  CalendarProvider,
  WeddingEventType,
  VendorRole,
  BatchResult,
  SyncResult,
  HealthStatus
} from '../../../src/lib/integrations/calendar/types';

// Mock external dependencies
jest.mock('node-fetch');
const mockFetch = jest.mocked(fetch);

// Test data fixtures
const createMockWeddingEvent = (overrides: Partial<UnifiedWeddingEvent> = {}): UnifiedWeddingEvent => ({
  id: 'event-123',
  weddingId: 'wedding-456',
  timelineEventId: 'timeline-789',
  title: 'Wedding Ceremony',
  description: 'The main wedding ceremony event',
  startTime: new Date('2024-06-15T14:00:00Z'),
  endTime: new Date('2024-06-15T15:00:00Z'),
  timezone: 'America/New_York',
  eventType: 'ceremony' as WeddingEventType,
  vendorRole: 'photographer' as VendorRole,
  isWeddingCritical: true,
  location: {
    address: '123 Wedding Venue, New York, NY',
    coordinates: { latitude: 40.7128, longitude: -74.0060 }
  },
  attendees: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

const createMockConnection = (provider: CalendarProvider, overrides: Partial<CalendarConnection> = {}): CalendarConnection => ({
  id: `connection-${provider}-123`,
  userId: 'user-456',
  provider,
  externalCalendarId: `${provider}-calendar-789`,
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

describe('Calendar Integration System', () => {
  let syncEngine: CalendarSyncEngine;
  let webhookHandlers: CalendarWebhookHandlers;
  let healthMonitor: CalendarIntegrationHealthMonitor;

  beforeAll(() => {
    // Setup test environment
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.MICROSOFT_CLIENT_ID = 'test-microsoft-client-id';
    process.env.MICROSOFT_CLIENT_SECRET = 'test-microsoft-client-secret';
  });

  beforeEach(() => {
    // Initialize components with test configuration
    syncEngine = new CalendarSyncEngine({
      maxConcurrentSyncs: 5,
      retryAttempts: 2,
      batchSize: 10,
      weddingDayPriorityMode: false,
      conflictResolutionStrategy: 'vendor_priority'
    });

    webhookHandlers = new CalendarWebhookHandlers(syncEngine);
    
    healthMonitor = new CalendarIntegrationHealthMonitor(syncEngine, {
      checkIntervalMs: 30000, // 30 seconds for tests
      alertThresholds: {
        responseTime: 1000,
        errorRate: 0.1,
        syncFailureRate: 0.2,
        webhookDelay: 60000
      },
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      enableWeddingDayAlerts: true
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    healthMonitor.stop();
  });

  describe('Google Calendar Service', () => {
    let googleService: GoogleCalendarService;

    beforeEach(() => {
      googleService = new GoogleCalendarService();
    });

    it('should authenticate successfully with valid credentials', async () => {
      const mockTokenResponse = {
        ok: true,
        json: async () => ({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'https://www.googleapis.com/auth/calendar'
        })
      };

      mockFetch.mockResolvedValueOnce(mockTokenResponse as any);

      const credentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        authorizationCode: 'test-auth-code',
        redirectUri: 'http://localhost:3000/callback'
      };

      const tokens = await googleService.authorize(credentials);

      expect(tokens.accessToken).toBe('mock-access-token');
      expect(tokens.refreshToken).toBe('mock-refresh-token');
      expect(tokens.expiresIn).toBe(3600);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
      );
    });

    it('should create wedding event successfully', async () => {
      const mockEventResponse = {
        ok: true,
        json: async () => ({
          id: 'google-event-123',
          summary: 'Wedding Ceremony',
          start: { dateTime: '2024-06-15T14:00:00Z' },
          end: { dateTime: '2024-06-15T15:00:00Z' }
        })
      };

      mockFetch.mockResolvedValueOnce(mockEventResponse as any);

      const connection = createMockConnection('google');
      const weddingEvent = createMockWeddingEvent();

      const eventId = await googleService.createWeddingEvent(connection, weddingEvent);

      expect(eventId).toBe('google-event-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/calendars/google-calendar-789/events'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should handle batch event creation', async () => {
      const mockBatchResponse = {
        ok: true,
        json: async () => ({
          responses: [
            { id: '1', status: 200, body: { id: 'event-1' } },
            { id: '2', status: 200, body: { id: 'event-2' } },
            { id: '3', status: 400, body: { error: { message: 'Invalid event data' } } }
          ]
        })
      };

      mockFetch.mockResolvedValueOnce(mockBatchResponse as any);

      const connection = createMockConnection('google');
      const events = [
        createMockWeddingEvent({ id: 'event-1' }),
        createMockWeddingEvent({ id: 'event-2' }),
        createMockWeddingEvent({ id: 'event-3' })
      ];

      const result = await googleService.batchCreateEvents(connection, events);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.partialFailure).toBe(true);
    });

    it('should handle rate limiting gracefully', async () => {
      const rateLimitResponse = {
        ok: false,
        status: 429,
        headers: new Map([['Retry-After', '60']]),
        statusText: 'Too Many Requests'
      };

      mockFetch.mockResolvedValueOnce(rateLimitResponse as any);

      const connection = createMockConnection('google');
      const weddingEvent = createMockWeddingEvent();

      await expect(googleService.createWeddingEvent(connection, weddingEvent))
        .rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Calendar Sync Engine', () => {
    it('should sync wedding timeline across multiple providers', async () => {
      // Mock successful responses for all providers
      const mockSuccessResponse = {
        ok: true,
        json: async () => ({ id: 'mock-event-id' })
      };

      mockFetch.mockResolvedValue(mockSuccessResponse as any);

      const weddingEvents = [
        createMockWeddingEvent({ id: 'ceremony', eventType: 'ceremony' }),
        createMockWeddingEvent({ id: 'reception', eventType: 'reception', startTime: new Date('2024-06-15T18:00:00Z') })
      ];

      // Mock the database queries
      jest.spyOn(syncEngine as any, 'getWeddingConnections').mockResolvedValue([
        createMockConnection('google'),
        createMockConnection('outlook'),
        createMockConnection('apple')
      ]);

      const result = await syncEngine.syncWeddingTimeline('wedding-456', weddingEvents);

      expect(result.status).toBe('completed');
      expect(result.totalEvents).toBe(2);
      expect(result.successfulSyncs).toBeGreaterThan(0);
      expect(result.failedSyncs).toBe(0);
    });

    it('should detect and resolve scheduling conflicts', async () => {
      const conflictingEvents = [
        createMockWeddingEvent({ 
          id: 'ceremony', 
          eventType: 'ceremony',
          vendorRole: 'photographer',
          startTime: new Date('2024-06-15T14:00:00Z'),
          endTime: new Date('2024-06-15T15:00:00Z')
        }),
        createMockWeddingEvent({ 
          id: 'engagement-shoot', 
          eventType: 'engagement_shoot',
          vendorRole: 'photographer', // Same photographer
          startTime: new Date('2024-06-15T14:30:00Z'),
          endTime: new Date('2024-06-15T16:00:00Z')
        })
      ];

      jest.spyOn(syncEngine as any, 'getWeddingConnections').mockResolvedValue([
        createMockConnection('google')
      ]);

      const result = await syncEngine.syncWeddingTimeline('wedding-456', conflictingEvents);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe('vendor_double_booking');
      expect(result.conflicts[0].severity).toBe('high');
    });

    it('should enable wedding day priority mode', () => {
      syncEngine.enableWeddingDayMode();

      const metrics = syncEngine.getSyncMetrics();
      expect(metrics).toBeDefined();
      
      // Verify enhanced settings are applied
      const config = (syncEngine as any).config;
      expect(config.weddingDayPriorityMode).toBe(true);
      expect(config.maxConcurrentSyncs).toBeGreaterThan(10);
    });
  });

  describe('Webhook Handlers', () => {
    it('should process Google Calendar webhook notifications', async () => {
      const googleWebhookPayload = {
        channelId: 'test-channel-123',
        resourceId: 'test-resource-456',
        eventId: 'test-event-789'
      };

      const headers = {
        'x-goog-channel-id': 'test-channel-123',
        'x-goog-resource-id': 'test-resource-456',
        'x-goog-resource-state': 'exists'
      };

      // Mock webhook validation and processing
      jest.spyOn(webhookHandlers as any, 'getConnectionByChannelId')
        .mockResolvedValue(createMockConnection('google'));
      
      jest.spyOn(webhookHandlers as any, 'fetchGoogleCalendarChanges')
        .mockResolvedValue([{
          eventId: 'test-event-789',
          changeType: 'updated',
          isWeddingEvent: true
        }]);

      const result = await webhookHandlers.processWebhook(
        'google',
        googleWebhookPayload,
        'mock-signature',
        headers
      );

      expect(result.success).toBe(true);
      expect(result.processedEvents).toBe(1);
      expect(result.syncTriggered).toBe(true);
    });

    it('should handle webhook validation failures', async () => {
      const invalidPayload = { invalid: 'data' };

      const result = await webhookHandlers.processWebhook(
        'google',
        invalidPayload,
        'invalid-signature'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('validation failed'));
    });

    it('should process Outlook webhook notifications', async () => {
      const outlookWebhookPayload = {
        value: [{
          subscriptionId: 'test-subscription-123',
          changeType: 'updated',
          resource: '/me/calendars/calendar-456/events/event-789',
          clientState: 'test-client-state'
        }]
      };

      jest.spyOn(webhookHandlers as any, 'getConnectionBySubscriptionId')
        .mockResolvedValue(createMockConnection('outlook'));

      const result = await webhookHandlers.processWebhook(
        'outlook',
        outlookWebhookPayload,
        'mock-signature'
      );

      expect(result.success).toBe(true);
      expect(result.processedEvents).toBe(1);
    });
  });

  describe('Health Monitoring', () => {
    it('should perform comprehensive health checks', async () => {
      // Mock successful API responses for health checks
      mockFetch.mockImplementation(async (url: string | URL) => {
        if (url.toString().includes('googleapis.com')) {
          return { ok: true, status: 200 } as Response;
        }
        if (url.toString().includes('graph.microsoft.com')) {
          return { ok: true, status: 200 } as Response;
        }
        if (url.toString().includes('icloud.com')) {
          return { ok: true, status: 200 } as Response;
        }
        return { ok: false, status: 500 } as Response;
      });

      const report = await healthMonitor.performHealthCheck();

      expect(report.overall).toBe('healthy');
      expect(report.providers).toHaveLength(3);
      expect(report.providers.every(p => p.isHealthy)).toBe(true);
      expect(report.alerts).toHaveLength(0);
    });

    it('should detect provider health issues', async () => {
      // Mock failed API responses
      mockFetch.mockImplementation(async (url: string | URL) => {
        if (url.toString().includes('googleapis.com')) {
          return { ok: false, status: 500 } as Response;
        }
        return { ok: true, status: 200 } as Response;
      });

      const report = await healthMonitor.performHealthCheck();

      expect(report.overall).toBe('degraded');
      const googleProvider = report.providers.find(p => p.provider === 'google');
      expect(googleProvider?.isHealthy).toBe(false);
      expect(report.alerts.length).toBeGreaterThan(0);
    });

    it('should enable wedding day monitoring mode', () => {
      healthMonitor.enableWeddingDayMode();

      const config = (healthMonitor as any).config;
      expect(config.checkIntervalMs).toBe(30000); // 30 seconds
      expect(config.alertThresholds.responseTime).toBe(1000);
      expect(config.enableWeddingDayAlerts).toBe(true);
    });

    it('should generate actionable recommendations', async () => {
      // Mock various health issues
      mockFetch.mockImplementation(async (url: string | URL) => {
        if (url.toString().includes('googleapis.com')) {
          throw new Error('Authentication failed');
        }
        return { ok: true, status: 200 } as Response;
      });

      const report = await healthMonitor.performHealthCheck();

      expect(report.recommendations).toContain(
        expect.stringContaining('authentication tokens')
      );
    });
  });

  describe('End-to-End Integration Scenarios', () => {
    it('should handle complete wedding timeline sync workflow', async () => {
      // Mock all external API calls to succeed
      mockFetch.mockImplementation(async (url: string | URL, options?: any) => {
        const urlStr = url.toString();
        
        if (urlStr.includes('oauth2') || urlStr.includes('token')) {
          return {
            ok: true,
            json: async () => ({
              access_token: 'mock-token',
              refresh_token: 'mock-refresh',
              expires_in: 3600
            })
          };
        }
        
        if (options?.method === 'POST' && urlStr.includes('events')) {
          return {
            ok: true,
            json: async () => ({ id: `event-${Math.random()}` })
          };
        }
        
        return { ok: true, status: 200 };
      });

      // Setup mock connections for all providers
      jest.spyOn(syncEngine as any, 'getWeddingConnections').mockResolvedValue([
        createMockConnection('google'),
        createMockConnection('outlook'),
        createMockConnection('apple')
      ]);

      const weddingEvents = [
        createMockWeddingEvent({ id: 'ceremony', eventType: 'ceremony' }),
        createMockWeddingEvent({ 
          id: 'cocktail-hour', 
          eventType: 'cocktail_hour',
          startTime: new Date('2024-06-15T17:00:00Z')
        }),
        createMockWeddingEvent({ 
          id: 'reception', 
          eventType: 'reception',
          startTime: new Date('2024-06-15T19:00:00Z')
        })
      ];

      const syncResult = await syncEngine.syncWeddingTimeline('wedding-456', weddingEvents);
      
      expect(syncResult.status).toBe('completed');
      expect(syncResult.totalEvents).toBe(3);
      expect(syncResult.failedSyncs).toBe(0);

      // Verify health monitoring detected the sync activity
      const healthReport = await healthMonitor.performHealthCheck();
      expect(healthReport.overall).toBe('healthy');
    });

    it('should handle wedding day emergency scenarios', async () => {
      // Enable wedding day mode
      syncEngine.enableWeddingDayMode();
      healthMonitor.enableWeddingDayMode();

      // Simulate ceremony time change (common wedding day scenario)
      const originalEvent = createMockWeddingEvent({
        id: 'ceremony',
        eventType: 'ceremony',
        startTime: new Date('2024-06-15T14:00:00Z'),
        endTime: new Date('2024-06-15T15:00:00Z')
      });

      const updatedEvent = {
        ...originalEvent,
        startTime: new Date('2024-06-15T14:30:00Z'), // 30 minutes later
        endTime: new Date('2024-06-15T15:30:00Z')
      };

      // Mock successful emergency sync
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'emergency-sync-success' })
      } as any);

      jest.spyOn(syncEngine as any, 'getWeddingConnections').mockResolvedValue([
        createMockConnection('google'),
        createMockConnection('outlook')
      ]);

      const result = await syncEngine.syncWeddingTimeline('wedding-456', [updatedEvent]);

      expect(result.status).toBe('completed');
      expect(result.duration).toBeLessThan(30000); // Should complete quickly on wedding day

      const healthReport = await healthMonitor.performHealthCheck();
      expect(healthReport.weddingDayMode).toBe(true);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle API failures gracefully', async () => {
      // Mock API failures
      mockFetch.mockRejectedValue(new Error('Network failure'));

      const weddingEvent = createMockWeddingEvent();
      const connection = createMockConnection('google');

      const googleService = new GoogleCalendarService();
      
      await expect(
        googleService.createWeddingEvent(connection, weddingEvent)
      ).rejects.toThrow('Network failure');
    });

    it('should retry failed operations', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary failure');
        }
        return {
          ok: true,
          json: async () => ({ id: 'success-after-retry' })
        };
      });

      const weddingEvent = createMockWeddingEvent();
      jest.spyOn(syncEngine as any, 'getWeddingConnections').mockResolvedValue([
        createMockConnection('google')
      ]);

      const result = await syncEngine.syncWeddingTimeline('wedding-456', [weddingEvent]);
      
      expect(callCount).toBe(3); // Initial call + 2 retries
      expect(result.status).toBe('completed');
    });

    it('should isolate provider failures', async () => {
      // Mock Google success, Outlook failure, Apple success
      mockFetch.mockImplementation(async (url: string | URL) => {
        if (url.toString().includes('googleapis.com')) {
          return { ok: true, json: async () => ({ id: 'google-success' }) };
        }
        if (url.toString().includes('graph.microsoft.com')) {
          throw new Error('Outlook API failure');
        }
        if (url.toString().includes('icloud.com')) {
          return { ok: true, json: async () => ({ id: 'apple-success' }) };
        }
        return { ok: false, status: 500 };
      });

      const weddingEvent = createMockWeddingEvent();
      jest.spyOn(syncEngine as any, 'getWeddingConnections').mockResolvedValue([
        createMockConnection('google'),
        createMockConnection('outlook'),
        createMockConnection('apple')
      ]);

      const result = await syncEngine.syncWeddingTimeline('wedding-456', [weddingEvent]);
      
      expect(result.status).toBe('partial_failure');
      expect(result.successfulSyncs).toBeGreaterThan(0);
      expect(result.failedSyncs).toBeGreaterThan(0);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-volume sync operations', async () => {
      const startTime = Date.now();
      
      // Create many wedding events
      const manyEvents = Array.from({ length: 50 }, (_, i) => 
        createMockWeddingEvent({ 
          id: `event-${i}`,
          startTime: new Date(Date.now() + i * 60000) // 1 minute apart
        })
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'batch-success' })
      } as any);

      jest.spyOn(syncEngine as any, 'getWeddingConnections').mockResolvedValue([
        createMockConnection('google')
      ]);

      const result = await syncEngine.syncWeddingTimeline('wedding-456', manyEvents);
      const duration = Date.now() - startTime;

      expect(result.status).toBe('completed');
      expect(result.totalEvents).toBe(50);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should maintain performance under concurrent operations', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'concurrent-success' })
      } as any);

      jest.spyOn(syncEngine as any, 'getWeddingConnections').mockResolvedValue([
        createMockConnection('google')
      ]);

      // Run multiple sync operations concurrently
      const concurrentSyncs = Promise.all([
        syncEngine.syncWeddingTimeline('wedding-1', [createMockWeddingEvent({ id: '1' })]),
        syncEngine.syncWeddingTimeline('wedding-2', [createMockWeddingEvent({ id: '2' })]),
        syncEngine.syncWeddingTimeline('wedding-3', [createMockWeddingEvent({ id: '3' })]),
      ]);

      const results = await concurrentSyncs;
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.status === 'completed')).toBe(true);
    });
  });
});

// Additional test utilities
export const CalendarTestUtils = {
  createMockWeddingEvent,
  createMockConnection,
  
  mockSuccessfulApiResponse: () => ({
    ok: true,
    json: async () => ({ id: 'mock-success' })
  }),
  
  mockFailedApiResponse: (status: number = 500) => ({
    ok: false,
    status,
    statusText: 'Mock Error'
  }),
  
  setupMockProviders: () => {
    // Setup common mocks for all providers
    mockFetch.mockImplementation(async (url: string | URL) => {
      const urlStr = url.toString();
      
      if (urlStr.includes('oauth') || urlStr.includes('token')) {
        return CalendarTestUtils.mockSuccessfulApiResponse();
      }
      
      if (urlStr.includes('events')) {
        return CalendarTestUtils.mockSuccessfulApiResponse();
      }
      
      return CalendarTestUtils.mockSuccessfulApiResponse();
    });
  }
};