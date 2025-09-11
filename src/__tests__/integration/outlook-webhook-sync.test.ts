/**
 * WS-217 Outlook Calendar Integration - Comprehensive Integration Tests
 *
 * Test Suite: outlook-webhook-sync
 * Coverage: Full integration testing for Microsoft Graph webhook processing
 *
 * Wedding Industry Focus:
 * - Priority processing for wedding events (ceremony, reception)
 * - Wedding context extraction and mapping
 * - Real-time synchronization with conflict resolution
 * - Security validation for sensitive wedding data
 *
 * @author WS-217-team-c
 * @version 1.0.0
 * @created 2025-01-22
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { OutlookWebhookHandler } from '../../lib/webhooks/outlook/OutlookWebhookHandler';
import { OutlookSyncOrchestrator } from '../../lib/webhooks/outlook/OutlookSyncOrchestrator';
import { WebhookSubscriptionManager } from '../../lib/webhooks/outlook/WebhookSubscriptionManager';
import { SyncConflictResolver } from '../../lib/integrations/outlook/SyncConflictResolver';
import { EventMappingService } from '../../lib/integrations/outlook/EventMappingService';

// Test Configuration
const TEST_CONFIG = {
  supabase: {
    url:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      (() => {
        throw new Error(
          'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
        );
      })(),
    serviceKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      (() => {
        throw new Error(
          'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
        );
      })(),
  },
  outlook: {
    tenantId: 'test-tenant-id',
    clientId: 'test-client-id',
    subscriptionId: 'test-subscription-id',
  },
  wedding: {
    organizationId: 'test-org-123',
    weddingId: 'test-wedding-456',
    coupleNames: ['Sarah Johnson', 'Michael Chen'],
    weddingDate: '2025-08-15',
    venue: 'Grand Wedding Hall',
  },
};

// Mock Microsoft Graph API responses
const mockGraphResponses = {
  weddingCeremonyEvent: {
    id: 'event-ceremony-001',
    subject: 'Wedding Ceremony - Sarah & Michael',
    start: { dateTime: '2025-08-15T14:00:00.000Z', timeZone: 'UTC' },
    end: { dateTime: '2025-08-15T15:00:00.000Z', timeZone: 'UTC' },
    location: { displayName: 'Grand Wedding Hall - Main Chapel' },
    body: { content: 'Wedding ceremony for Sarah Johnson and Michael Chen' },
    attendees: [
      { emailAddress: { address: 'sarah@example.com', name: 'Sarah Johnson' } },
      {
        emailAddress: { address: 'michael@example.com', name: 'Michael Chen' },
      },
    ],
    categories: ['Wedding', 'Ceremony'],
    isAllDay: false,
    recurrence: null,
    organizer: { emailAddress: { address: 'coordinator@venue.com' } },
  },
  weddingReceptionEvent: {
    id: 'event-reception-001',
    subject: 'Wedding Reception - Sarah & Michael',
    start: { dateTime: '2025-08-15T18:00:00.000Z', timeZone: 'UTC' },
    end: { dateTime: '2025-08-15T23:00:00.000Z', timeZone: 'UTC' },
    location: { displayName: 'Grand Wedding Hall - Ballroom' },
    body: { content: 'Wedding reception celebration' },
    attendees: [
      { emailAddress: { address: 'sarah@example.com', name: 'Sarah Johnson' } },
      {
        emailAddress: { address: 'michael@example.com', name: 'Michael Chen' },
      },
    ],
    categories: ['Wedding', 'Reception'],
    isAllDay: false,
    recurrence: null,
  },
  regularMeetingEvent: {
    id: 'event-meeting-001',
    subject: 'Team Meeting',
    start: { dateTime: '2025-01-23T10:00:00.000Z', timeZone: 'UTC' },
    end: { dateTime: '2025-01-23T11:00:00.000Z', timeZone: 'UTC' },
    location: { displayName: 'Conference Room A' },
    body: { content: 'Weekly team sync meeting' },
    attendees: [],
    categories: ['Meeting'],
    isAllDay: false,
    recurrence: null,
  },
};

describe('WS-217 Outlook Calendar Integration - Full System Tests', () => {
  let supabaseClient: ReturnType<typeof createClient>;
  let webhookHandler: OutlookWebhookHandler;
  let syncOrchestrator: OutlookSyncOrchestrator;
  let subscriptionManager: WebhookSubscriptionManager;
  let conflictResolver: SyncConflictResolver;
  let eventMappingService: EventMappingService;

  beforeEach(async () => {
    // Initialize Supabase client
    supabaseClient = createClient(
      TEST_CONFIG.supabase.url,
      TEST_CONFIG.supabase.serviceKey,
      { auth: { persistSession: false } },
    );

    // Initialize all service components
    webhookHandler = new OutlookWebhookHandler(supabaseClient);
    syncOrchestrator = new OutlookSyncOrchestrator(supabaseClient);
    subscriptionManager = new WebhookSubscriptionManager(supabaseClient);
    conflictResolver = new SyncConflictResolver(supabaseClient);
    eventMappingService = new EventMappingService(supabaseClient);

    // Clean up test data
    await cleanupTestData();

    // Setup test organization and wedding data
    await setupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
    vi.clearAllMocks();
  });

  describe('Wedding Event Classification & Processing', () => {
    it('should correctly classify and prioritize wedding ceremony events', async () => {
      const result = await webhookHandler.processWebhook(
        createMockWebhookPayload(mockGraphResponses.weddingCeremonyEvent),
        TEST_CONFIG.outlook.subscriptionId,
      );

      expect(result.success).toBe(true);
      expect(result.eventClassification).toBe('wedding_ceremony');
      expect(result.priority).toBe('high');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.weddingContext?.coupleNames).toEqual(
        expect.arrayContaining(['Sarah Johnson', 'Michael Chen']),
      );
      expect(result.weddingContext?.venue).toBe('Grand Wedding Hall');
    });

    it('should correctly classify and prioritize wedding reception events', async () => {
      const result = await webhookHandler.processWebhook(
        createMockWebhookPayload(mockGraphResponses.weddingReceptionEvent),
        TEST_CONFIG.outlook.subscriptionId,
      );

      expect(result.success).toBe(true);
      expect(result.eventClassification).toBe('wedding_reception');
      expect(result.priority).toBe('high');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should classify regular meetings as low priority', async () => {
      const result = await webhookHandler.processWebhook(
        createMockWebhookPayload(mockGraphResponses.regularMeetingEvent),
        TEST_CONFIG.outlook.subscriptionId,
      );

      expect(result.success).toBe(true);
      expect(result.eventClassification).toBe('regular_meeting');
      expect(result.priority).toBe('low');
      expect(result.confidence).toBeLessThan(0.3);
    });
  });

  describe('Bidirectional Synchronization', () => {
    it('should sync wedding events to WedSync timeline', async () => {
      const outlookEvent = mockGraphResponses.weddingCeremonyEvent;

      const result = await syncOrchestrator.syncToWedSync({
        outlookEvent,
        organizationId: TEST_CONFIG.wedding.organizationId,
        syncDirection: 'outlook_to_wedsync',
      });

      expect(result.success).toBe(true);
      expect(result.mappedEntities).toHaveLength(1);
      expect(result.mappedEntities[0].entityType).toBe(
        'wedding_timeline_event',
      );
      expect(result.mappedEntities[0].weddingContext).toBeDefined();

      // Verify data was saved to database
      const { data: timelineEvent } = await supabaseClient
        .from('wedding_timeline_events')
        .select('*')
        .eq('outlook_event_id', outlookEvent.id)
        .single();

      expect(timelineEvent).toBeDefined();
      expect(timelineEvent.title).toBe('Wedding Ceremony - Sarah & Michael');
      expect(timelineEvent.event_type).toBe('ceremony');
    });

    it('should sync WedSync events back to Outlook', async () => {
      // First create a WedSync timeline event
      const { data: timelineEvent } = await supabaseClient
        .from('wedding_timeline_events')
        .insert({
          organization_id: TEST_CONFIG.wedding.organizationId,
          wedding_id: TEST_CONFIG.wedding.weddingId,
          title: 'Bridal Party Photos',
          event_type: 'photography',
          start_time: '2025-08-15T16:00:00Z',
          end_time: '2025-08-15T17:00:00Z',
          location: 'Garden Area',
          description: 'Group photos with bridal party',
        })
        .select()
        .single();

      expect(timelineEvent).toBeDefined();

      // Now sync it to Outlook
      const result = await syncOrchestrator.syncToOutlook({
        weddingEvent: timelineEvent,
        organizationId: TEST_CONFIG.wedding.organizationId,
        syncDirection: 'wedsync_to_outlook',
      });

      expect(result.success).toBe(true);
      expect(result.outlookEventId).toBeDefined();
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect and resolve wedding date conflicts', async () => {
      const conflictingEvents = [
        {
          ...mockGraphResponses.weddingCeremonyEvent,
          start: { dateTime: '2025-08-15T14:00:00.000Z', timeZone: 'UTC' },
          end: { dateTime: '2025-08-15T15:00:00.000Z', timeZone: 'UTC' },
        },
        {
          ...mockGraphResponses.weddingCeremonyEvent,
          id: 'event-ceremony-002',
          start: { dateTime: '2025-08-15T14:30:00.000Z', timeZone: 'UTC' },
          end: { dateTime: '2025-08-15T15:30:00.000Z', timeZone: 'UTC' },
        },
      ];

      const result = await conflictResolver.detectAndResolveConflicts({
        events: conflictingEvents,
        organizationId: TEST_CONFIG.wedding.organizationId,
        weddingId: TEST_CONFIG.wedding.weddingId,
      });

      expect(result.conflictsDetected).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe('datetime_overlap');
      expect(result.conflicts[0].severity).toBe('high'); // Wedding events are high severity
      expect(result.autoResolved).toBe(false); // Wedding conflicts require manual review
    });

    it('should auto-resolve low-priority meeting conflicts', async () => {
      const conflictingMeetings = [
        mockGraphResponses.regularMeetingEvent,
        {
          ...mockGraphResponses.regularMeetingEvent,
          id: 'event-meeting-002',
          subject: 'Another Team Meeting',
          start: { dateTime: '2025-01-23T10:30:00.000Z', timeZone: 'UTC' },
          end: { dateTime: '2025-01-23T11:30:00.000Z', timeZone: 'UTC' },
        },
      ];

      const result = await conflictResolver.detectAndResolveConflicts({
        events: conflictingMeetings,
        organizationId: TEST_CONFIG.wedding.organizationId,
      });

      expect(result.conflictsDetected).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].severity).toBe('low');
      expect(result.autoResolved).toBe(true);
    });
  });

  describe('Event Mapping & Cross-System Relationships', () => {
    it('should create accurate mappings between Outlook and WedSync events', async () => {
      const outlookEvent = mockGraphResponses.weddingCeremonyEvent;

      const result = await eventMappingService.createMapping({
        outlookEventId: outlookEvent.id,
        weddingEventType: 'wedding_timeline_event',
        weddingEventId: 'timeline-001',
        organizationId: TEST_CONFIG.wedding.organizationId,
        confidence: 0.95,
        mappingContext: {
          eventType: 'ceremony',
          weddingDate: TEST_CONFIG.wedding.weddingDate,
          venue: TEST_CONFIG.wedding.venue,
        },
      });

      expect(result.success).toBe(true);
      expect(result.mappingId).toBeDefined();

      // Verify mapping can be retrieved
      const mapping = await eventMappingService.findMapping(
        outlookEvent.id,
        'outlook_event_id',
      );

      expect(mapping).toBeDefined();
      expect(mapping?.confidence).toBe(0.95);
      expect(mapping?.wedding_event_type).toBe('wedding_timeline_event');
    });

    it('should detect and cleanup orphaned mappings', async () => {
      // Create a mapping with no corresponding WedSync event
      await eventMappingService.createMapping({
        outlookEventId: 'orphaned-event-001',
        weddingEventType: 'wedding_timeline_event',
        weddingEventId: 'non-existent-001',
        organizationId: TEST_CONFIG.wedding.organizationId,
        confidence: 0.8,
        mappingContext: {},
      });

      const result = await eventMappingService.cleanupOrphanedMappings(
        TEST_CONFIG.wedding.organizationId,
      );

      expect(result.orphanedCount).toBe(1);
      expect(result.cleanedCount).toBe(1);
    });
  });

  describe('Webhook Subscription Management', () => {
    it('should create and manage Microsoft Graph subscriptions', async () => {
      const result = await subscriptionManager.createSubscription({
        organizationId: TEST_CONFIG.wedding.organizationId,
        accessToken: 'mock-access-token',
        resource: '/me/calendar/events',
        changeTypes: ['created', 'updated', 'deleted'],
        notificationUrl: 'https://wedsync.com/api/webhooks/outlook',
        expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      });

      expect(result.success).toBe(true);
      expect(result.subscriptionId).toBeDefined();
      expect(result.expirationDateTime).toBeDefined();
    });

    it('should automatically renew expiring subscriptions', async () => {
      // Create a subscription that's about to expire
      const expiringSubscription = {
        id: 'subscription-expiring-001',
        organization_id: TEST_CONFIG.wedding.organizationId,
        subscription_id: 'graph-sub-001',
        expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        access_token_encrypted: 'encrypted-token',
        status: 'active',
      };

      await supabaseClient
        .from('outlook_subscriptions')
        .insert(expiringSubscription);

      const result = await subscriptionManager.renewExpiringSubscriptions();

      expect(result.renewedCount).toBe(1);
      expect(result.failedRenewals).toHaveLength(0);
    });
  });

  describe('Security & Data Protection', () => {
    it('should validate webhook signatures correctly', async () => {
      const payload = createMockWebhookPayload(
        mockGraphResponses.weddingCeremonyEvent,
      );
      const validSignature = generateMockSignature(payload);

      const result = await webhookHandler.validateWebhookSignature(
        JSON.stringify(payload),
        validSignature,
        TEST_CONFIG.outlook.clientId,
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject webhooks with invalid signatures', async () => {
      const payload = createMockWebhookPayload(
        mockGraphResponses.weddingCeremonyEvent,
      );
      const invalidSignature = 'invalid-signature-here';

      const result = await webhookHandler.validateWebhookSignature(
        JSON.stringify(payload),
        invalidSignature,
        TEST_CONFIG.outlook.clientId,
      );

      expect(result.isValid).toBe(false);
    });

    it('should enforce rate limiting on webhook endpoints', async () => {
      const payload = createMockWebhookPayload(
        mockGraphResponses.regularMeetingEvent,
      );

      // Send multiple rapid requests (should exceed rate limit)
      const requests = Array.from({ length: 10 }, () =>
        webhookHandler.processWebhook(
          payload,
          TEST_CONFIG.outlook.subscriptionId,
        ),
      );

      const results = await Promise.allSettled(requests);

      // Some requests should be rate limited
      const rateLimitedResults = results.filter(
        (result) =>
          result.status === 'rejected' ||
          (result.status === 'fulfilled' && result.value.rateLimited),
      );

      expect(rateLimitedResults.length).toBeGreaterThan(0);
    });

    it('should protect sensitive wedding data with proper access controls', async () => {
      // Attempt to access wedding data from wrong organization
      const unauthorizedOrgId = 'unauthorized-org-456';

      const result = await syncOrchestrator.syncToWedSync({
        outlookEvent: mockGraphResponses.weddingCeremonyEvent,
        organizationId: unauthorizedOrgId,
        syncDirection: 'outlook_to_wedsync',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNAUTHORIZED_ACCESS');
    });
  });

  describe('Performance & Reliability', () => {
    it('should process wedding events within performance thresholds', async () => {
      const startTime = Date.now();

      const result = await webhookHandler.processWebhook(
        createMockWebhookPayload(mockGraphResponses.weddingCeremonyEvent),
        TEST_CONFIG.outlook.subscriptionId,
      );

      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(2000); // Under 2 seconds
    });

    it('should handle bulk event processing efficiently', async () => {
      const bulkEvents = Array.from({ length: 50 }, (_, i) => ({
        ...mockGraphResponses.regularMeetingEvent,
        id: `bulk-event-${i}`,
        subject: `Bulk Meeting ${i}`,
      }));

      const startTime = Date.now();

      const results = await Promise.all(
        bulkEvents.map((event) =>
          webhookHandler.processWebhook(
            createMockWebhookPayload(event),
            TEST_CONFIG.outlook.subscriptionId,
          ),
        ),
      );

      const processingTime = Date.now() - startTime;

      expect(results.every((r) => r.success)).toBe(true);
      expect(processingTime).toBeLessThan(10000); // Under 10 seconds for 50 events
    });

    it('should implement circuit breaker for external API failures', async () => {
      // Mock Microsoft Graph API to fail
      vi.spyOn(syncOrchestrator, 'callGraphAPI').mockRejectedValue(
        new Error('Microsoft Graph API unavailable'),
      );

      // Trigger multiple failures to activate circuit breaker
      for (let i = 0; i < 5; i++) {
        await syncOrchestrator
          .syncToOutlook({
            weddingEvent: { id: `test-${i}` },
            organizationId: TEST_CONFIG.wedding.organizationId,
            syncDirection: 'wedsync_to_outlook',
          })
          .catch(() => {}); // Ignore failures, we're testing circuit breaker
      }

      // Next call should be circuit-broken
      const result = await syncOrchestrator.syncToOutlook({
        weddingEvent: { id: 'circuit-breaker-test' },
        organizationId: TEST_CONFIG.wedding.organizationId,
        syncDirection: 'wedsync_to_outlook',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CIRCUIT_BREAKER_OPEN');
    });
  });
});

// Helper Functions

async function setupTestData() {
  // Create test organization
  await supabaseClient.from('organizations').upsert({
    id: TEST_CONFIG.wedding.organizationId,
    name: 'Test Wedding Company',
    subscription_tier: 'professional',
    status: 'active',
  });

  // Create test wedding
  await supabaseClient.from('weddings').upsert({
    id: TEST_CONFIG.wedding.weddingId,
    organization_id: TEST_CONFIG.wedding.organizationId,
    partner_1_name: TEST_CONFIG.wedding.coupleNames[0],
    partner_2_name: TEST_CONFIG.wedding.coupleNames[1],
    wedding_date: TEST_CONFIG.wedding.weddingDate,
    venue_name: TEST_CONFIG.wedding.venue,
    status: 'active',
  });
}

async function cleanupTestData() {
  // Clean up in reverse order due to foreign key constraints
  await supabaseClient
    .from('outlook_event_mappings')
    .delete()
    .eq('organization_id', TEST_CONFIG.wedding.organizationId);

  await supabaseClient
    .from('outlook_subscriptions')
    .delete()
    .eq('organization_id', TEST_CONFIG.wedding.organizationId);

  await supabaseClient
    .from('wedding_timeline_events')
    .delete()
    .eq('organization_id', TEST_CONFIG.wedding.organizationId);

  await supabaseClient
    .from('weddings')
    .delete()
    .eq('organization_id', TEST_CONFIG.wedding.organizationId);

  await supabaseClient
    .from('organizations')
    .delete()
    .eq('id', TEST_CONFIG.wedding.organizationId);
}

function createMockWebhookPayload(event: any) {
  return {
    subscriptionId: TEST_CONFIG.outlook.subscriptionId,
    changeType: 'created',
    tenantId: TEST_CONFIG.outlook.tenantId,
    clientState: 'webhook-validation-token',
    subscriptionExpirationDateTime: '2025-01-25T14:00:00.000Z',
    resource: `/me/calendar/events/${event.id}`,
    resourceData: event,
  };
}

function generateMockSignature(payload: any): string {
  // Mock signature generation for testing
  // In real implementation, this would use HMAC with shared secret
  return `sha256=${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
}
