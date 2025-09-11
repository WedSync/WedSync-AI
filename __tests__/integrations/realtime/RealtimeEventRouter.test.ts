import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealtimeEventRouter } from '../../../src/lib/integrations/realtime/RealtimeEventRouter';
import { RealtimeWebhookIntegration } from '../../../src/lib/integrations/realtime/RealtimeWebhookIntegration';
import { RealtimeNotificationService } from '../../../src/lib/integrations/realtime/RealtimeNotificationService';
import { createClient } from '@supabase/supabase-js';
import type { 
  RealtimeEventMetadata, 
  EventRoutingConfig,
  WebhookEndpoint,
  NotificationRecipient 
} from '../../../src/types/realtime-integration';

vi.mock('@supabase/supabase-js');
vi.mock('../../../src/lib/integrations/realtime/RealtimeWebhookIntegration');
vi.mock('../../../src/lib/integrations/realtime/RealtimeNotificationService');

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [],
        error: null
      }))
    })),
    insert: vi.fn(() => ({
      data: null,
      error: null
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: null,
        error: null
      }))
    }))
  })),
  rpc: vi.fn(() => ({
    data: null,
    error: null
  }))
};

vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

describe('RealtimeEventRouter', () => {
  let router: RealtimeEventRouter;
  let mockWebhookIntegration: any;
  let mockNotificationService: any;

  const mockMetadata: RealtimeEventMetadata = {
    source: 'supabase',
    triggeredBy: 'system',
    timestamp: new Date().toISOString(),
    priority: 'normal',
    organizationId: 'org-123',
    correlationId: 'corr-123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockWebhookIntegration = {
      handleDatabaseChange: vi.fn().mockResolvedValue(undefined),
      integratePhotographyCRM: vi.fn().mockResolvedValue(undefined),
      integrateVenueBookingSystem: vi.fn().mockResolvedValue(undefined),
      integrateEmailPlatform: vi.fn().mockResolvedValue(undefined)
    };

    mockNotificationService = {
      sendRealtimeNotification: vi.fn().mockResolvedValue(undefined),
      notifyWeddingDateChange: vi.fn().mockResolvedValue(undefined),
      notifyFormResponse: vi.fn().mockResolvedValue(undefined),
      notifyJourneyProgress: vi.fn().mockResolvedValue(undefined),
      notifyEmergencyAlert: vi.fn().mockResolvedValue(undefined)
    };

    vi.mocked(RealtimeWebhookIntegration).mockImplementation(() => mockWebhookIntegration);
    vi.mocked(RealtimeNotificationService).mockImplementation(() => mockNotificationService);

    router = new RealtimeEventRouter(
      'test-url',
      'test-key',
      mockWebhookIntegration,
      mockNotificationService
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Wedding Form Response Events', () => {
    it('should route form_responses INSERT to photography CRM and notifications', async () => {
      const newRecord = {
        id: 'response-123',
        form_id: 'form-456',
        form_name: 'Wedding Photography Questionnaire',
        client_id: 'client-789',
        client_name: 'Sarah & Mike Johnson',
        supplier_id: 'photographer-101',
        responses: [
          {
            question_id: 'q1',
            question: 'What is your wedding date?',
            answer: '2025-06-15',
            question_type: 'date'
          }
        ],
        submitted_at: new Date().toISOString(),
        organization_id: 'org-123'
      };

      await router.routeRealtimeEvent('form_responses', 'INSERT', null, newRecord, mockMetadata);

      expect(mockWebhookIntegration.handleDatabaseChange).toHaveBeenCalledWith(
        'form_responses',
        'INSERT',
        null,
        newRecord,
        mockMetadata
      );

      expect(mockNotificationService.notifyFormResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          responseId: 'response-123',
          formName: 'Wedding Photography Questionnaire',
          clientName: 'Sarah & Mike Johnson'
        })
      );
    });

    it('should handle venue booking form responses with special routing', async () => {
      const venueFormRecord = {
        id: 'response-456',
        form_id: 'venue-form-789',
        form_name: 'Venue Availability Check',
        client_id: 'client-101',
        client_name: 'Emma & James Wilson',
        supplier_id: 'venue-202',
        responses: [
          {
            question_id: 'q1',
            question: 'Preferred wedding date?',
            answer: '2025-08-20',
            question_type: 'date'
          },
          {
            question_id: 'q2',
            question: 'Expected guest count?',
            answer: '120',
            question_type: 'number'
          }
        ],
        organization_id: 'org-123'
      };

      await router.routeRealtimeEvent('form_responses', 'INSERT', null, venueFormRecord, {
        ...mockMetadata,
        priority: 'high'
      });

      expect(mockWebhookIntegration.integrateVenueBookingSystem).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'FORM_RESPONSE_RECEIVED',
          formData: venueFormRecord
        })
      );
    });
  });

  describe('Wedding Journey Progress Events', () => {
    it('should route journey_progress UPDATE to appropriate integrations', async () => {
      const oldRecord = {
        id: 'progress-123',
        journey_id: 'journey-456',
        step_id: 'step-789',
        client_id: 'client-101',
        completion_percentage: 50,
        organization_id: 'org-123'
      };

      const newRecord = {
        ...oldRecord,
        completion_percentage: 75,
        completed_at: new Date().toISOString(),
        milestone_reached: 'Engagement Photos Scheduled'
      };

      await router.routeRealtimeEvent('journey_progress', 'UPDATE', oldRecord, newRecord, mockMetadata);

      expect(mockNotificationService.notifyJourneyProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          journeyId: 'journey-456',
          completionPercentage: 75,
          milestoneName: 'Engagement Photos Scheduled'
        })
      );

      expect(mockWebhookIntegration.integratePhotographyCRM).toHaveBeenCalled();
    });

    it('should handle milestone completion with high priority notifications', async () => {
      const milestoneRecord = {
        id: 'progress-456',
        journey_id: 'journey-789',
        step_id: 'milestone-final-payment',
        client_id: 'client-202',
        completion_percentage: 100,
        completed_at: new Date().toISOString(),
        milestone_reached: 'Final Payment Received',
        organization_id: 'org-123'
      };

      await router.routeRealtimeEvent('journey_progress', 'UPDATE', null, milestoneRecord, {
        ...mockMetadata,
        priority: 'high'
      });

      expect(mockNotificationService.sendRealtimeNotification).toHaveBeenCalledWith(
        'JOURNEY_MILESTONE_COMPLETED',
        expect.any(Object),
        expect.any(Array)
      );
    });
  });

  describe('Wedding Date Change Events', () => {
    it('should handle wedding date changes with critical priority', async () => {
      const oldWedding = {
        id: 'wedding-123',
        wedding_date: '2025-06-15',
        couple_id: 'couple-456',
        bride_name: 'Sarah Johnson',
        groom_name: 'Mike Johnson',
        organization_id: 'org-123'
      };

      const newWedding = {
        ...oldWedding,
        wedding_date: '2025-06-22',
        date_changed_reason: 'Venue availability conflict',
        updated_at: new Date().toISOString()
      };

      await router.routeRealtimeEvent('weddings', 'UPDATE', oldWedding, newWedding, {
        ...mockMetadata,
        priority: 'critical'
      });

      expect(mockNotificationService.notifyWeddingDateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          weddingId: 'wedding-123',
          oldDate: '2025-06-15',
          newDate: '2025-06-22',
          reason: 'Venue availability conflict'
        })
      );

      expect(mockWebhookIntegration.handleDatabaseChange).toHaveBeenCalledWith(
        'weddings',
        'UPDATE',
        oldWedding,
        newWedding,
        expect.objectContaining({
          priority: 'critical'
        })
      );
    });

    it('should notify all wedding vendors about date changes', async () => {
      const dateChangeRecord = {
        id: 'wedding-456',
        wedding_date: '2025-07-10',
        couple_id: 'couple-789',
        bride_name: 'Emma Wilson',
        groom_name: 'James Wilson',
        vendor_list: ['photographer-101', 'caterer-202', 'florist-303'],
        organization_id: 'org-123'
      };

      await router.routeRealtimeEvent('weddings', 'UPDATE', null, dateChangeRecord, {
        ...mockMetadata,
        priority: 'critical',
        weddingId: 'wedding-456'
      });

      expect(mockWebhookIntegration.integratePhotographyCRM).toHaveBeenCalled();
      expect(mockWebhookIntegration.integrateVenueBookingSystem).toHaveBeenCalled();
      expect(mockWebhookIntegration.integrateEmailPlatform).toHaveBeenCalled();
    });
  });

  describe('Emergency Alerts and Vendor Issues', () => {
    it('should handle vendor no-show alerts with maximum priority', async () => {
      const emergencyRecord = {
        id: 'emergency-123',
        wedding_id: 'wedding-456',
        emergency_type: 'vendor_no_show',
        severity: 'critical',
        title: 'Photographer No Show - 2 hours before wedding',
        description: 'Main photographer has not arrived, backup needed immediately',
        affected_vendors: ['photographer-101'],
        status: 'reported',
        organization_id: 'org-123'
      };

      await router.routeRealtimeEvent('wedding_emergencies', 'INSERT', null, emergencyRecord, {
        ...mockMetadata,
        priority: 'critical',
        weddingId: 'wedding-456'
      });

      expect(mockNotificationService.notifyEmergencyAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          emergencyType: 'vendor_no_show',
          severity: 'critical',
          title: 'Photographer No Show - 2 hours before wedding'
        })
      );

      expect(mockWebhookIntegration.handleDatabaseChange).toHaveBeenCalledWith(
        'wedding_emergencies',
        'INSERT',
        null,
        emergencyRecord,
        expect.objectContaining({
          priority: 'critical'
        })
      );
    });

    it('should route timeline delays to affected vendors', async () => {
      const timelineDelayRecord = {
        id: 'emergency-456',
        wedding_id: 'wedding-789',
        emergency_type: 'timeline_delay',
        severity: 'medium',
        title: 'Ceremony delayed by 30 minutes',
        affected_vendors: ['photographer-101', 'videographer-202', 'dj-303'],
        suggested_actions: ['Adjust reception timing', 'Notify catering staff'],
        organization_id: 'org-123'
      };

      await router.routeRealtimeEvent('wedding_emergencies', 'UPDATE', null, timelineDelayRecord, {
        ...mockMetadata,
        priority: 'high'
      });

      expect(mockNotificationService.sendRealtimeNotification).toHaveBeenCalledWith(
        'EMERGENCY_ALERT',
        expect.any(Object),
        expect.any(Array)
      );
    });
  });

  describe('Payment and Invoice Events', () => {
    it('should handle payment received notifications', async () => {
      const paymentRecord = {
        id: 'payment-123',
        wedding_id: 'wedding-456',
        vendor_id: 'photographer-101',
        amount: 250000, // £2,500 in pence
        payment_status: 'completed',
        invoice_id: 'invoice-789',
        payment_method: 'card',
        organization_id: 'org-123'
      };

      await router.routeRealtimeEvent('payments', 'INSERT', null, paymentRecord, mockMetadata);

      expect(mockNotificationService.sendRealtimeNotification).toHaveBeenCalledWith(
        'PAYMENT_RECEIVED',
        expect.objectContaining({
          amount: 250000,
          paymentStatus: 'completed'
        }),
        expect.any(Array)
      );
    });

    it('should handle failed payment alerts with high priority', async () => {
      const failedPaymentRecord = {
        id: 'payment-456',
        wedding_id: 'wedding-789',
        vendor_id: 'caterer-202',
        amount: 500000, // £5,000 in pence
        payment_status: 'failed',
        failure_reason: 'Insufficient funds',
        organization_id: 'org-123'
      };

      await router.routeRealtimeEvent('payments', 'UPDATE', null, failedPaymentRecord, {
        ...mockMetadata,
        priority: 'high'
      });

      expect(mockNotificationService.sendRealtimeNotification).toHaveBeenCalledWith(
        'PAYMENT_FAILED',
        expect.objectContaining({
          paymentStatus: 'failed',
          failureReason: 'Insufficient funds'
        }),
        expect.any(Array)
      );
    });
  });

  describe('Client and Contact Updates', () => {
    it('should handle client profile updates', async () => {
      const oldClient = {
        id: 'client-123',
        name: 'Sarah Johnson',
        email: 'sarah@email.com',
        phone: '+44123456789',
        organization_id: 'org-123'
      };

      const newClient = {
        ...oldClient,
        phone: '+44987654321',
        emergency_contact: 'Emma Johnson - Mother of Bride',
        updated_at: new Date().toISOString()
      };

      await router.routeRealtimeEvent('clients', 'UPDATE', oldClient, newClient, mockMetadata);

      expect(mockNotificationService.sendRealtimeNotification).toHaveBeenCalledWith(
        'CLIENT_CONTACT_CHANGE',
        expect.objectContaining({
          clientId: 'client-123',
          oldPhone: '+44123456789',
          newPhone: '+44987654321'
        }),
        expect.any(Array)
      );
    });
  });

  describe('Vendor Assignment Events', () => {
    it('should handle new vendor assignments', async () => {
      const vendorAssignment = {
        id: 'assignment-123',
        wedding_id: 'wedding-456',
        vendor_id: 'florist-303',
        vendor_type: 'florist',
        assignment_status: 'confirmed',
        service_details: 'Bridal bouquet and ceremony decorations',
        contract_value: 75000, // £750 in pence
        organization_id: 'org-123'
      };

      await router.routeRealtimeEvent('vendor_assignments', 'INSERT', null, vendorAssignment, mockMetadata);

      expect(mockNotificationService.sendRealtimeNotification).toHaveBeenCalledWith(
        'VENDOR_ASSIGNED',
        expect.objectContaining({
          vendorType: 'florist',
          serviceDetails: 'Bridal bouquet and ceremony decorations'
        }),
        expect.any(Array)
      );

      expect(mockWebhookIntegration.handleDatabaseChange).toHaveBeenCalledWith(
        'vendor_assignments',
        'INSERT',
        null,
        vendorAssignment,
        mockMetadata
      );
    });

    it('should handle vendor status changes', async () => {
      const oldVendorStatus = {
        id: 'assignment-456',
        vendor_id: 'dj-404',
        assignment_status: 'pending',
        organization_id: 'org-123'
      };

      const newVendorStatus = {
        ...oldVendorStatus,
        assignment_status: 'cancelled',
        cancellation_reason: 'Double booking conflict',
        cancelled_at: new Date().toISOString()
      };

      await router.routeRealtimeEvent('vendor_assignments', 'UPDATE', oldVendorStatus, newVendorStatus, {
        ...mockMetadata,
        priority: 'high'
      });

      expect(mockNotificationService.sendRealtimeNotification).toHaveBeenCalledWith(
        'VENDOR_STATUS_CHANGE',
        expect.objectContaining({
          oldStatus: 'pending',
          newStatus: 'cancelled',
          cancellationReason: 'Double booking conflict'
        }),
        expect.any(Array)
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle webhook integration failures gracefully', async () => {
      mockWebhookIntegration.handleDatabaseChange.mockRejectedValue(new Error('Webhook endpoint timeout'));

      const testRecord = {
        id: 'test-123',
        organization_id: 'org-123'
      };

      await expect(
        router.routeRealtimeEvent('form_responses', 'INSERT', null, testRecord, mockMetadata)
      ).resolves.not.toThrow();

      expect(mockNotificationService.sendRealtimeNotification).toHaveBeenCalled();
    });

    it('should handle notification service failures', async () => {
      mockNotificationService.sendRealtimeNotification.mockRejectedValue(
        new Error('Email service unavailable')
      );

      const testRecord = {
        id: 'test-456',
        organization_id: 'org-123'
      };

      await expect(
        router.routeRealtimeEvent('journey_progress', 'UPDATE', null, testRecord, mockMetadata)
      ).resolves.not.toThrow();

      expect(mockWebhookIntegration.handleDatabaseChange).toHaveBeenCalled();
    });

    it('should retry failed integrations with backoff', async () => {
      mockWebhookIntegration.integratePhotographyCRM
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce(undefined);

      const photographerRecord = {
        id: 'form-789',
        form_name: 'Wedding Photography Questionnaire',
        supplier_id: 'photographer-101',
        organization_id: 'org-123'
      };

      await router.routeRealtimeEvent('form_responses', 'INSERT', null, photographerRecord, mockMetadata);

      expect(mockWebhookIntegration.integratePhotographyCRM).toHaveBeenCalledTimes(2);
    });
  });

  describe('Configuration and Routing Rules', () => {
    it('should respect organization-specific routing configurations', async () => {
      const configuredMetadata = {
        ...mockMetadata,
        organizationId: 'org-with-custom-config'
      };

      mockSupabaseClient.from().select().eq.mockReturnValueOnce({
        data: [{
          organization_id: 'org-with-custom-config',
          webhooks_enabled: false,
          notifications_enabled: true,
          external_integrations_enabled: true
        }],
        error: null
      });

      const testRecord = {
        id: 'test-789',
        organization_id: 'org-with-custom-config'
      };

      await router.routeRealtimeEvent('form_responses', 'INSERT', null, testRecord, configuredMetadata);

      expect(mockNotificationService.sendRealtimeNotification).toHaveBeenCalled();
      expect(mockWebhookIntegration.integratePhotographyCRM).not.toHaveBeenCalled();
    });

    it('should handle table-specific routing rules', async () => {
      const weddingTimelineRecord = {
        id: 'timeline-123',
        wedding_id: 'wedding-456',
        event_type: 'ceremony',
        start_time: '14:00',
        end_time: '14:30',
        vendor_type: 'officiant',
        organization_id: 'org-123'
      };

      await router.routeRealtimeEvent('wedding_timeline', 'INSERT', null, weddingTimelineRecord, mockMetadata);

      expect(mockNotificationService.sendRealtimeNotification).toHaveBeenCalledWith(
        'WEDDING_TIMELINE_UPDATED',
        expect.any(Object),
        expect.any(Array)
      );

      expect(mockWebhookIntegration.integrateVenueBookingSystem).toHaveBeenCalled();
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track integration health metrics', async () => {
      const testRecord = {
        id: 'perf-test-123',
        organization_id: 'org-123'
      };

      const startTime = Date.now();
      await router.routeRealtimeEvent('form_responses', 'INSERT', null, testRecord, mockMetadata);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('integration_health_metrics');
    });

    it('should handle high-volume event processing', async () => {
      const eventPromises = Array.from({ length: 50 }, (_, i) => 
        router.routeRealtimeEvent('form_responses', 'INSERT', null, {
          id: `bulk-${i}`,
          organization_id: 'org-123'
        }, mockMetadata)
      );

      await expect(Promise.all(eventPromises)).resolves.not.toThrow();

      expect(mockWebhookIntegration.handleDatabaseChange).toHaveBeenCalledTimes(50);
      expect(mockNotificationService.sendRealtimeNotification).toHaveBeenCalledTimes(50);
    });
  });
});