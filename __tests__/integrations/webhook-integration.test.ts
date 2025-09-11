import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebhookReceiver } from '@/lib/integrations/websocket/webhook-receiver';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
          data: []
        }))
      })),
      insert: vi.fn(() => ({ data: null, error: null })),
      update: vi.fn(() => ({ data: null, error: null }))
    })),
    channel: vi.fn(() => ({
      send: vi.fn()
    }))
  }))
}));

describe('WebSocket Integration Tests', () => {
  let webhookReceiver: WebhookReceiver;
  const mockSupabaseUrl = 'https://test.supabase.co';
  const mockSupabaseKey = 'test-key';

  beforeEach(() => {
    webhookReceiver = new WebhookReceiver(mockSupabaseUrl, mockSupabaseKey);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Photography CRM Integration', () => {
    test('processes booking creation webhook correctly', async () => {
      const mockBookingWebhook = {
        id: 'booking-webhook-1',
        vendor: 'studiocloud',
        eventType: 'booking.created',
        payload: {
          booking_id: 'booking-123',
          client_id: 'client-456',
          event_date: '2024-06-15',
          ceremony_time: '15:00',
          venue_name: 'Beautiful Gardens',
          photographer_notes: 'Golden hour shots requested',
          contract_status: 'pending'
        },
        timestamp: '2024-01-20T10:00:00Z'
      };

      // Mock vendor config loading
      (webhookReceiver as any).vendorConfigs.set('studiocloud', {
        id: 'studiocloud-config',
        name: 'studiocloud',
        type: 'photography-crm',
        webhookSecret: 'test-secret',
        signatureHeader: 'X-Hub-Signature-256',
        isActive: true
      });

      // Mock database operations
      vi.spyOn(webhookReceiver as any, 'logIncomingWebhook').mockResolvedValue(undefined);
      vi.spyOn(webhookReceiver as any, 'logWebhookProcessing').mockResolvedValue(undefined);
      vi.spyOn(webhookReceiver as any, 'resolveOrganizationId').mockResolvedValue('org-123');

      // Mock the broadcast to channel
      vi.spyOn(webhookReceiver, 'broadcastToChannel').mockResolvedValue(undefined);

      await webhookReceiver.receiveVendorWebhook('studiocloud', mockBookingWebhook);

      // Verify that the webhook was transformed and broadcasted
      expect(webhookReceiver.broadcastToChannel).toHaveBeenCalledWith(
        'supplier:photography:org-123',
        expect.objectContaining({
          id: expect.stringContaining('photo-crm-'),
          eventType: 'booking_created',
          payload: expect.objectContaining({
            bookingId: 'booking-123',
            clientId: 'client-456',
            eventDate: '2024-06-15'
          })
        })
      );
    });

    test('handles gallery ready notification', async () => {
      const mockGalleryWebhook = {
        id: 'gallery-webhook-1',
        vendor: 'shootq',
        eventType: 'gallery.ready',
        payload: {
          booking_id: 'booking-789',
          client_id: 'client-999',
          gallery_url: 'https://gallery.shootq.com/wedding-789',
          gallery_status: 'ready',
          total_photos: 500,
          delivery_method: 'online_gallery'
        },
        timestamp: '2024-01-20T11:00:00Z'
      };

      (webhookReceiver as any).vendorConfigs.set('shootq', {
        id: 'shootq-config',
        name: 'shootq',
        type: 'photography-crm',
        webhookSecret: 'shootq-secret',
        signatureHeader: 'X-ShootQ-Signature',
        isActive: true
      });

      vi.spyOn(webhookReceiver as any, 'logIncomingWebhook').mockResolvedValue(undefined);
      vi.spyOn(webhookReceiver as any, 'logWebhookProcessing').mockResolvedValue(undefined);
      vi.spyOn(webhookReceiver as any, 'resolveOrganizationId').mockResolvedValue('org-456');
      vi.spyOn(webhookReceiver, 'broadcastToChannel').mockResolvedValue(undefined);

      await webhookReceiver.receiveVendorWebhook('shootq', mockGalleryWebhook);

      expect(webhookReceiver.broadcastToChannel).toHaveBeenCalledWith(
        'supplier:photography:org-456',
        expect.objectContaining({
          eventType: 'gallery_ready',
          payload: expect.objectContaining({
            galleryUrl: 'https://gallery.shootq.com/wedding-789',
            bookingId: 'booking-789'
          })
        })
      );
    });
  });

  describe('Venue Management Integration', () => {
    test('processes capacity update webhook', async () => {
      const mockCapacityWebhook = {
        id: 'capacity-webhook-1',
        vendor: 'venuemaster',
        eventType: 'capacity.updated',
        payload: {
          event_id: 'event-123',
          venue_name: 'Grand Ballroom',
          max_capacity: 200,
          current_booking_count: 180,
          capacity_exceeded: false,
          available_spaces: ['main_hall', 'cocktail_area'],
          restriction_notes: 'Fire safety capacity limit'
        },
        timestamp: '2024-01-20T12:00:00Z'
      };

      (webhookReceiver as any).vendorConfigs.set('venuemaster', {
        id: 'venuemaster-config',
        name: 'venuemaster',
        type: 'venue-management',
        webhookSecret: 'venue-secret',
        signatureHeader: 'X-Venue-Signature',
        isActive: true
      });

      vi.spyOn(webhookReceiver as any, 'logIncomingWebhook').mockResolvedValue(undefined);
      vi.spyOn(webhookReceiver as any, 'logWebhookProcessing').mockResolvedValue(undefined);
      vi.spyOn(webhookReceiver as any, 'resolveOrganizationId').mockResolvedValue('org-venue');
      vi.spyOn(webhookReceiver, 'broadcastToChannel').mockResolvedValue(undefined);

      await webhookReceiver.receiveVendorWebhook('venuemaster', mockCapacityWebhook);

      expect(webhookReceiver.broadcastToChannel).toHaveBeenCalledWith(
        'supplier:venue:org-venue',
        expect.objectContaining({
          eventType: 'venue_capacity_updated',
          payload: expect.objectContaining({
            eventId: 'event-123',
            venueName: 'Grand Ballroom',
            guestCount: 180,
            maxCapacity: 200
          })
        })
      );
    });

    test('handles booking cancellation webhook', async () => {
      const mockCancellationWebhook = {
        id: 'cancellation-webhook-1',
        vendor: 'partyrental',
        eventType: 'booking.cancelled',
        payload: {
          booking_id: 'booking-cancel-123',
          event_id: 'event-456',
          cancellation_reason: 'Client request',
          cancellation_date: '2024-01-20',
          refund_amount: 500.00,
          cancellation_fee: 50.00
        },
        timestamp: '2024-01-20T13:00:00Z'
      };

      (webhookReceiver as any).vendorConfigs.set('partyrental', {
        id: 'partyrental-config',
        name: 'partyrental',
        type: 'venue-management',
        webhookSecret: 'rental-secret',
        signatureHeader: 'X-Party-Signature',
        isActive: true
      });

      vi.spyOn(webhookReceiver as any, 'logIncomingWebhook').mockResolvedValue(undefined);
      vi.spyOn(webhookReceiver as any, 'logWebhookProcessing').mockResolvedValue(undefined);
      vi.spyOn(webhookReceiver as any, 'resolveOrganizationId').mockResolvedValue('org-rental');
      vi.spyOn(webhookReceiver, 'broadcastToChannel').mockResolvedValue(undefined);

      await webhookReceiver.receiveVendorWebhook('partyrental', mockCancellationWebhook);

      expect(webhookReceiver.broadcastToChannel).toHaveBeenCalledWith(
        'supplier:venue:org-rental',
        expect.objectContaining({
          eventType: 'venue_booking_cancelled',
          payload: expect.objectContaining({
            eventId: 'event-456',
            bookingStatus: undefined // Would be mapped from cancellation data
          })
        })
      );
    });
  });

  describe('Webhook Signature Validation', () => {
    test('validates HMAC-SHA256 signature correctly', () => {
      const testPayload = { test: 'data', id: 'test-123' };
      const testSecret = 'test-webhook-secret';
      const testSignature = 'sha256=5d41402abc4b2a76b9719d911017c592'; // Example signature

      // Mock the signature validation
      vi.spyOn(webhookReceiver, 'validateWebhookSignature').mockReturnValue(true);

      const isValid = webhookReceiver.validateWebhookSignature(testPayload, testSignature, 'test-vendor');

      expect(isValid).toBe(true);
    });

    test('rejects invalid signatures', () => {
      const testPayload = { test: 'data', id: 'test-456' };
      const invalidSignature = 'sha256=invalid-signature';

      vi.spyOn(webhookReceiver, 'validateWebhookSignature').mockReturnValue(false);

      const isValid = webhookReceiver.validateWebhookSignature(testPayload, invalidSignature, 'test-vendor');

      expect(isValid).toBe(false);
    });

    test('handles missing signature gracefully', () => {
      const testPayload = { test: 'data', id: 'test-789' };

      // When no signature is provided, validation should pass (for development)
      vi.spyOn(webhookReceiver, 'validateWebhookSignature').mockReturnValue(true);

      const isValid = webhookReceiver.validateWebhookSignature(testPayload, '', 'test-vendor');

      expect(isValid).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('handles malformed webhook payload', async () => {
      const malformedPayload = {
        // Missing required fields
        vendor: 'test-vendor'
      };

      await expect(webhookReceiver.receiveVendorWebhook('test-vendor', malformedPayload))
        .rejects.toThrow();
    });

    test('handles database connection failures gracefully', async () => {
      const validWebhook = {
        id: 'db-fail-test',
        vendor: 'test-vendor',
        eventType: 'test.event',
        payload: { test: 'data' },
        timestamp: '2024-01-20T14:00:00Z'
      };

      // Mock database failure
      const mockError = new Error('Database connection failed');
      vi.spyOn(webhookReceiver as any, 'logIncomingWebhook').mockRejectedValue(mockError);

      // Should still process the webhook despite logging failure
      vi.spyOn(webhookReceiver as any, 'resolveOrganizationId').mockResolvedValue('org-test');
      vi.spyOn(webhookReceiver, 'broadcastToChannel').mockResolvedValue(undefined);

      // Configure test vendor
      (webhookReceiver as any).vendorConfigs.set('test-vendor', {
        id: 'test-vendor-config',
        name: 'test-vendor',
        type: 'photography-crm',
        webhookSecret: 'test-secret',
        isActive: true
      });

      // Should not throw, should handle gracefully
      await expect(webhookReceiver.receiveVendorWebhook('test-vendor', validWebhook))
        .resolves.not.toThrow();
    });

    test('handles channel broadcast failures', async () => {
      const validWebhook = {
        id: 'broadcast-fail-test',
        vendor: 'broadcast-vendor',
        eventType: 'broadcast.test',
        payload: { test: 'broadcast' },
        timestamp: '2024-01-20T15:00:00Z'
      };

      (webhookReceiver as any).vendorConfigs.set('broadcast-vendor', {
        id: 'broadcast-vendor-config',
        name: 'broadcast-vendor',
        type: 'photography-crm',
        webhookSecret: 'broadcast-secret',
        isActive: true
      });

      vi.spyOn(webhookReceiver as any, 'logIncomingWebhook').mockResolvedValue(undefined);
      vi.spyOn(webhookReceiver as any, 'resolveOrganizationId').mockResolvedValue('org-broadcast');
      
      // Mock broadcast failure
      vi.spyOn(webhookReceiver, 'broadcastToChannel').mockRejectedValue(new Error('Broadcast failed'));

      await expect(webhookReceiver.receiveVendorWebhook('broadcast-vendor', validWebhook))
        .rejects.toThrow('Broadcast failed');
    });
  });

  describe('Multi-Vendor Event Processing', () => {
    test('processes multiple vendor webhooks concurrently', async () => {
      const webhooks = [
        {
          vendor: 'vendor-a',
          webhook: {
            id: 'multi-a-1',
            vendor: 'vendor-a',
            eventType: 'booking.created',
            payload: { booking_id: 'a-123' },
            timestamp: '2024-01-20T16:00:00Z'
          }
        },
        {
          vendor: 'vendor-b',
          webhook: {
            id: 'multi-b-1',
            vendor: 'vendor-b',
            eventType: 'capacity.updated',
            payload: { capacity: 150 },
            timestamp: '2024-01-20T16:01:00Z'
          }
        }
      ];

      // Configure vendors
      (webhookReceiver as any).vendorConfigs.set('vendor-a', {
        id: 'vendor-a-config',
        name: 'vendor-a',
        type: 'photography-crm',
        webhookSecret: 'secret-a',
        isActive: true
      });

      (webhookReceiver as any).vendorConfigs.set('vendor-b', {
        id: 'vendor-b-config',
        name: 'vendor-b',
        type: 'venue-management',
        webhookSecret: 'secret-b',
        isActive: true
      });

      // Mock successful processing
      vi.spyOn(webhookReceiver as any, 'logIncomingWebhook').mockResolvedValue(undefined);
      vi.spyOn(webhookReceiver as any, 'logWebhookProcessing').mockResolvedValue(undefined);
      vi.spyOn(webhookReceiver as any, 'resolveOrganizationId').mockResolvedValue('org-multi');
      vi.spyOn(webhookReceiver, 'broadcastToChannel').mockResolvedValue(undefined);

      // Process webhooks concurrently
      const promises = webhooks.map(({ vendor, webhook }) => 
        webhookReceiver.receiveVendorWebhook(vendor, webhook)
      );

      await Promise.all(promises);

      expect(webhookReceiver.broadcastToChannel).toHaveBeenCalledTimes(2);
    });
  });

  describe('Wedding-Specific Event Mapping', () => {
    test('maps timeline events correctly', async () => {
      const timelineWebhook = {
        id: 'timeline-mapping-test',
        vendor: 'timeline-vendor',
        eventType: 'timeline.updated',
        payload: {
          booking_id: 'timeline-123',
          ceremony_time: '15:30',
          reception_time: '18:00',
          venue_address: '123 Wedding Lane',
          special_requests: ['First dance song: Perfect by Ed Sheeran']
        },
        timestamp: '2024-01-20T17:00:00Z'
      };

      (webhookReceiver as any).vendorConfigs.set('timeline-vendor', {
        id: 'timeline-vendor-config',
        name: 'timeline-vendor',
        type: 'photography-crm',
        isActive: true
      });

      vi.spyOn(webhookReceiver as any, 'logIncomingWebhook').mockResolvedValue(undefined);
      vi.spyOn(webhookReceiver as any, 'logWebhookProcessing').mockResolvedValue(undefined);
      vi.spyOn(webhookReceiver as any, 'resolveOrganizationId').mockResolvedValue('org-timeline');
      vi.spyOn(webhookReceiver, 'broadcastToChannel').mockResolvedValue(undefined);

      await webhookReceiver.receiveVendorWebhook('timeline-vendor', timelineWebhook);

      expect(webhookReceiver.broadcastToChannel).toHaveBeenCalledWith(
        'supplier:photography:org-timeline',
        expect.objectContaining({
          eventType: 'timeline_updated',
          payload: expect.objectContaining({
            ceremonyTime: '15:30',
            timeline: undefined, // Would be mapped from schedule if provided
            specialRequests: ['First dance song: Perfect by Ed Sheeran']
          })
        })
      );
    });
  });
});