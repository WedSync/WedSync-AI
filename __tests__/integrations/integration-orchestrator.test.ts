import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntegrationOrchestrator, ChannelEvent, ExternalSystem, TransformedEvent } from '@/lib/integrations/websocket/integration-orchestrator';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(),
              data: []
            }))
          }))
        }))
      })),
      insert: vi.fn(() => ({ data: null, error: null })),
      update: vi.fn(() => ({ data: null, error: null }))
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn()
      })),
      send: vi.fn()
    })),
    rpc: vi.fn()
  }))
}));

// Mock fetch
global.fetch = vi.fn();

describe('IntegrationOrchestrator', () => {
  let orchestrator: IntegrationOrchestrator;
  const mockSupabaseUrl = 'https://test.supabase.co';
  const mockSupabaseKey = 'test-key';

  beforeEach(() => {
    orchestrator = new IntegrationOrchestrator(mockSupabaseUrl, mockSupabaseKey);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Channel Event Transformation', () => {
    test('transforms channel event for photography CRM', async () => {
      const mockEvent: ChannelEvent = {
        id: 'test-event-1',
        channelName: 'supplier:photography:org-123',
        eventType: 'timeline_update',
        payload: {
          coupleId: 'couple-456',
          ceremonyTime: '2024-06-15T15:00:00Z',
          venue: 'Beautiful Gardens',
          schedule: [
            { name: 'Ceremony', time: '15:00', location: 'Garden Altar' }
          ]
        },
        timestamp: '2024-01-20T10:00:00Z',
        organizationId: 'org-123',
        weddingId: 'wedding-789'
      };

      const mockExternalSystem: ExternalSystem = {
        id: 'photo-crm-1',
        name: 'Studio Cloud',
        type: 'photography-crm',
        config: {
          webhookUrl: 'https://studio-cloud.com/webhook',
          apiKey: 'test-api-key'
        },
        isActive: true
      };

      // Mock the getExternalSystem method
      vi.spyOn(orchestrator as any, 'getExternalSystem').mockResolvedValue(mockExternalSystem);

      const result = await orchestrator.transformChannelEvent(mockEvent, 'photo-crm-1');

      expect(result.originalEvent).toEqual(mockEvent);
      expect(result.targetSystem).toBe('photo-crm-1');
      expect(result.transformedPayload).toMatchObject({
        client_id: 'couple-456',
        shoot_date: '2024-06-15T15:00:00Z',
        location: 'Beautiful Gardens',
        updated_at: mockEvent.timestamp
      });
      expect(result.deliveryConfig.endpoint).toBe('https://studio-cloud.com/webhook');
    });

    test('transforms channel event for venue management', async () => {
      const mockEvent: ChannelEvent = {
        id: 'test-event-2',
        channelName: 'supplier:venue:org-123',
        eventType: 'guest_count_change',
        payload: {
          guestCount: 150,
          ceremonyTime: '2024-06-15T16:00:00Z',
          receptionTime: '2024-06-15T18:00:00Z',
          setupRequirements: ['Round tables', 'Dance floor']
        },
        timestamp: '2024-01-20T10:00:00Z',
        organizationId: 'org-123',
        weddingId: 'wedding-789'
      };

      const mockExternalSystem: ExternalSystem = {
        id: 'venue-mgmt-1',
        name: 'VenueMaster',
        type: 'venue-management',
        config: {
          webhookUrl: 'https://venuemaster.com/api/webhook',
          apiKey: 'venue-api-key'
        },
        isActive: true
      };

      vi.spyOn(orchestrator as any, 'getExternalSystem').mockResolvedValue(mockExternalSystem);

      const result = await orchestrator.transformChannelEvent(mockEvent, 'venue-mgmt-1');

      expect(result.transformedPayload).toMatchObject({
        event_id: 'wedding-789',
        ceremony_time: '2024-06-15T16:00:00Z',
        reception_time: '2024-06-15T18:00:00Z',
        guest_count: 150,
        setup_requirements: ['Round tables', 'Dance floor']
      });
    });

    test('throws error for unknown external system', async () => {
      const mockEvent: ChannelEvent = {
        id: 'test-event-3',
        channelName: 'unknown:channel',
        eventType: 'test_event',
        payload: {},
        timestamp: '2024-01-20T10:00:00Z',
        organizationId: 'org-123'
      };

      vi.spyOn(orchestrator as any, 'getExternalSystem').mockResolvedValue(null);

      await expect(orchestrator.transformChannelEvent(mockEvent, 'unknown-system'))
        .rejects.toThrow('External system not found: unknown-system');
    });
  });

  describe('External Delivery', () => {
    test('delivers webhook successfully with retries', async () => {
      const mockTransformedEvent: TransformedEvent = {
        originalEvent: {
          id: 'test-event',
          channelName: 'test:channel',
          eventType: 'test_event',
          payload: {},
          timestamp: '2024-01-20T10:00:00Z',
          organizationId: 'org-123'
        },
        targetSystem: 'test-system',
        transformedPayload: { test: 'data' },
        deliveryConfig: {
          method: 'webhook',
          endpoint: 'https://external-system.com/webhook',
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
          retries: 3
        }
      };

      const mockExternalSystem: ExternalSystem = {
        id: 'test-system',
        name: 'Test System',
        type: 'photography-crm',
        config: { webhookUrl: 'https://external-system.com/webhook' },
        isActive: true
      };

      // Mock successful fetch response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });

      const result = await orchestrator.deliverToExternalSystem(mockTransformedEvent, mockExternalSystem);

      expect(result.success).toBe(true);
      expect(result.attempt).toBe(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://external-system.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ test: 'data' })
        })
      );
    });

    test('handles delivery failure with retries', async () => {
      const mockTransformedEvent: TransformedEvent = {
        originalEvent: {
          id: 'test-event-fail',
          channelName: 'test:channel',
          eventType: 'test_event',
          payload: {},
          timestamp: '2024-01-20T10:00:00Z',
          organizationId: 'org-123'
        },
        targetSystem: 'failing-system',
        transformedPayload: { test: 'data' },
        deliveryConfig: {
          method: 'webhook',
          endpoint: 'https://failing-system.com/webhook',
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
          retries: 3
        }
      };

      const mockExternalSystem: ExternalSystem = {
        id: 'failing-system',
        name: 'Failing System',
        type: 'photography-crm',
        config: { webhookUrl: 'https://failing-system.com/webhook' },
        isActive: true
      };

      // Mock failing fetch responses
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await orchestrator.deliverToExternalSystem(mockTransformedEvent, mockExternalSystem);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Network error');
      expect(result.attempt).toBe(3);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    test('respects circuit breaker state', async () => {
      const mockTransformedEvent: TransformedEvent = {
        originalEvent: {
          id: 'test-event-circuit',
          channelName: 'test:channel',
          eventType: 'test_event',
          payload: {},
          timestamp: '2024-01-20T10:00:00Z',
          organizationId: 'org-123'
        },
        targetSystem: 'circuit-test-system',
        transformedPayload: { test: 'data' },
        deliveryConfig: {
          method: 'webhook',
          endpoint: 'https://circuit-system.com/webhook',
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
          retries: 3
        }
      };

      const mockExternalSystem: ExternalSystem = {
        id: 'circuit-test-system',
        name: 'Circuit Test System',
        type: 'photography-crm',
        config: { webhookUrl: 'https://circuit-system.com/webhook' },
        isActive: true
      };

      // Simulate circuit breaker in open state
      const circuitBreaker = (orchestrator as any).getOrCreateCircuitBreaker('circuit-test-system');
      vi.spyOn(circuitBreaker, 'isOpen').mockReturnValue(true);

      const result = await orchestrator.deliverToExternalSystem(mockTransformedEvent, mockExternalSystem);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Circuit breaker is open');
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('Wedding-Specific Transformations', () => {
    test('generates appropriate WhatsApp message for timeline update', () => {
      const mockEvent: ChannelEvent = {
        id: 'whatsapp-test',
        channelName: 'notifications:whatsapp:org-123',
        eventType: 'timeline_updated',
        payload: {
          coupleName: 'Sarah & Mike',
          ceremonyTime: '3:30 PM',
          receptionTime: '6:00 PM'
        },
        timestamp: '2024-01-20T10:00:00Z',
        organizationId: 'org-123',
        weddingId: 'wedding-whatsapp'
      };

      const message = (orchestrator as any).generateWhatsAppMessage(mockEvent);

      expect(message).toContain('🕐 *Timeline Update* for Sarah & Mike');
      expect(message).toContain('Ceremony time changed to 3:30 PM');
      expect(message).toContain('Please update your schedule accordingly');
    });

    test('generates appropriate Slack message for venue change', () => {
      const mockEvent: ChannelEvent = {
        id: 'slack-test',
        channelName: 'notifications:slack:org-123',
        eventType: 'venue_changed',
        payload: {
          coupleName: 'Emma & James',
          venueName: 'Grand Ballroom',
          venueAddress: '123 Wedding St'
        },
        timestamp: '2024-01-20T10:00:00Z',
        organizationId: 'org-123',
        weddingId: 'wedding-slack'
      };

      const slackMessage = (orchestrator as any).generateSlackMessage(mockEvent);

      expect(slackMessage.text).toContain('🎉 Venue Changed for *Emma & James*');
      expect(slackMessage.attachments).toHaveLength(1);
      expect(slackMessage.attachments[0].fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Wedding ID',
            value: 'wedding-slack'
          }),
          expect.objectContaining({
            title: 'Event Type',
            value: 'Venue Changed'
          })
        ])
      );
    });

    test('handles wedding day priority escalation', () => {
      const mockEvent: ChannelEvent = {
        id: 'priority-test',
        channelName: 'urgent:wedding-day:org-123',
        eventType: 'emergency_contact',
        payload: {
          weddingDate: new Date().toISOString().split('T')[0], // Today
          isUrgent: true
        },
        timestamp: '2024-01-20T10:00:00Z',
        organizationId: 'org-123',
        weddingId: 'wedding-today'
      };

      const priority = (orchestrator as any).calculateNotificationPriority(mockEvent, { priority: 'normal' });

      expect(priority).toBe('urgent');
    });
  });

  describe('Integration Health Monitoring', () => {
    test('calculates integration health correctly', async () => {
      // Mock database responses for health calculation
      const mockSupabaseFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                data: [
                  { success: true, response_time: 1000, created_at: new Date().toISOString() },
                  { success: true, response_time: 1200, created_at: new Date().toISOString() },
                  { success: false, response_time: 5000, created_at: new Date().toISOString() }
                ]
              }))
            }))
          }))
        }))
      }));

      (orchestrator as any).supabaseClient.from = mockSupabaseFrom;

      const healthReports = await orchestrator.getIntegrationHealth();

      expect(Array.isArray(healthReports)).toBe(true);
      // Additional assertions would depend on the mocked data structure
    });

    test('handles failure recovery correctly', async () => {
      const mockTransformedEvent: TransformedEvent = {
        originalEvent: {
          id: 'failure-recovery-test',
          channelName: 'test:recovery',
          eventType: 'test_recovery',
          payload: {},
          timestamp: '2024-01-20T10:00:00Z',
          organizationId: 'org-123'
        },
        targetSystem: 'recovery-system',
        transformedPayload: { test: 'recovery' },
        deliveryConfig: {
          method: 'webhook',
          endpoint: 'https://recovery-system.com/webhook',
          headers: {},
          timeout: 30000,
          retries: 3
        }
      };

      const mockError = new Error('Delivery failed');

      // Mock the database insert for failure logging
      const mockSupabaseInsert = vi.fn(() => ({ data: null, error: null }));
      (orchestrator as any).supabaseClient.from = vi.fn(() => ({
        insert: mockSupabaseInsert
      }));

      await orchestrator.handleDeliveryFailure(mockTransformedEvent, mockError);

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: 'failure-recovery-test',
          target_system: 'recovery-system',
          error_message: 'Delivery failed',
          retry_count: 0
        })
      );
    });
  });

  describe('Channel Pattern Matching', () => {
    test('matches exact channel patterns', () => {
      const isMatch = (orchestrator as any).matchesPattern(
        'supplier:photography:org-123',
        'supplier:photography:org-123'
      );

      expect(isMatch).toBe(true);
    });

    test('matches wildcard patterns', () => {
      const isMatch = (orchestrator as any).matchesPattern(
        'supplier:photography:org-123',
        'supplier:photography:*'
      );

      expect(isMatch).toBe(true);
    });

    test('matches parameter patterns', () => {
      const isMatch = (orchestrator as any).matchesPattern(
        'supplier:venue:org-456',
        'supplier:{type}:{orgId}'
      );

      expect(isMatch).toBe(true);
    });

    test('rejects non-matching patterns', () => {
      const isMatch = (orchestrator as any).matchesPattern(
        'client:notification:user-123',
        'supplier:*'
      );

      expect(isMatch).toBe(false);
    });
  });
});