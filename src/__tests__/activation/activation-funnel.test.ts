/**
 * @jest-environment jsdom
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import {
  activationService,
  ActivationEventType,
} from '@/lib/activation/activation-service';

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
  }),
}));

// Helper functions to reduce nesting depth
const createMockResponse = (data: any) => ({
  ok: true,
  json: async () => ({ success: true, data }),
});

const createErrorResponse = (error: string) => ({
  ok: false,
  json: async () => ({ success: false, error }),
});

const createEventResponse = (eventId: string, eventType: string, score: number) =>
  createMockResponse({
    event: { id: eventId, event_type: eventType },
    activation_status: { activation_score: score },
  });

const createApiCallExpectation = (url: string, eventType: ActivationEventType, eventData: any, properties?: any) => {
  const body = {
    event_type: eventType,
    event_data: eventData,
    ...(properties ? { properties } : {}),
    session_id: expect.any(String),
  };
  
  if (properties) {
    body.properties = properties;
  }

  return [url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }];
};

const createStatusMockData = (currentStep: number, score: number, completedAt?: string) =>
  createMockResponse({
    current_step: currentStep,
    activation_score: score,
    ...(completedAt ? { completed_at: completedAt } : { completed_at: null }),
  });

const createSimpleSuccessResponse = () => ({
  ok: true,
  json: async () => ({ success: true }),
});

const testEventTypeTracking = async (eventTypes: any[]) => {
  for (const eventType of eventTypes) {
    mockFetch.mockResolvedValueOnce(createSimpleSuccessResponse());

    const result = await activationService.trackEvent({
      event_type: eventType,
      event_data: { test: true },
    });

    expect(result.success).toBe(true);
  }
};

describe('Activation Funnel System', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Event Tracking', () => {
    it('should track signup completion event', async () => {
      mockFetch.mockResolvedValueOnce(
        createEventResponse('event-1', 'signup_completed', 10)
      );

      const result = await activationService.trackSignupCompleted({
        email: 'test@example.com',
        source: 'registration_form',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        ...createApiCallExpectation(
          '/api/activation/events',
          ActivationEventType.SIGNUP_COMPLETED,
          { email: 'test@example.com', source: 'registration_form' },
          { source: 'web', timestamp: expect.any(String) }
        )
      );
    });

    it('should track client import event with count', async () => {
      mockFetch.mockResolvedValueOnce(
        createEventResponse('event-2', 'client_imported', 35)
      );

      const result = await activationService.trackClientImported({
        count: 15,
        source: 'csv_upload',
        method: 'bulk_import',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        ...createApiCallExpectation(
          '/api/activation/events',
          ActivationEventType.CLIENT_IMPORTED,
          { count: 15, source: 'csv_upload', method: 'bulk_import' },
          { import_timestamp: expect.any(String), client_count: 15 }
        )
      );
    });

    it('should track form sent event', async () => {
      mockFetch.mockResolvedValueOnce(
        createEventResponse('event-3', 'form_sent', 60)
      );

      const result = await activationService.trackFormSent({
        form_id: 'form-123',
        client_id: 'client-456',
        form_type: 'consultation_form',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        ...createApiCallExpectation(
          '/api/activation/events',
          ActivationEventType.FORM_SENT,
          { form_id: 'form-123', client_id: 'client-456', form_type: 'consultation_form' },
          { sent_timestamp: expect.any(String), form_type: 'consultation_form' }
        )
      );
    });

    it('should handle tracking errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await activationService.trackSignupCompleted();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should batch track multiple events', async () => {
      // Mock successful responses for batch events
      const successResponse = createSimpleSuccessResponse();
      mockFetch
        .mockResolvedValueOnce(successResponse)
        .mockResolvedValueOnce(successResponse)
        .mockResolvedValueOnce(successResponse);

      const events = [
        {
          event_type: ActivationEventType.SIGNUP_COMPLETED,
          event_data: { email: 'test@example.com' },
        },
        {
          event_type: ActivationEventType.ONBOARDING_COMPLETED,
          event_data: { steps_completed: 5 },
        },
        {
          event_type: ActivationEventType.CLIENT_IMPORTED,
          event_data: { count: 10 },
        },
      ];

      const result = await activationService.trackBatchEvents(events);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Activation Status', () => {
    it('should fetch user activation status', async () => {
      const mockStatus = {
        user_id: 'test-user-id',
        current_step: 3,
        completed_steps: [1, 2, 3],
        activation_score: 55,
        status: 'in_progress',
        progress_percentage: 50,
        last_activity_at: new Date().toISOString(),
        recent_events: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStatus,
        }),
      });

      const status = await activationService.getActivationStatus();

      expect(status).toEqual(mockStatus);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/activation/status/test-user-id',
      );
    });

    it('should return null for failed status fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'User not found' }),
      });

      const status = await activationService.getActivationStatus();

      expect(status).toBeNull();
    });
  });

  describe('Activation Guidance', () => {
    it('should determine if user should see guidance', async () => {
      // Mock status for user with low score
      mockFetch.mockResolvedValueOnce(
        createStatusMockData(0, 30)
      );

      const shouldShow = await activationService.shouldShowActivationGuidance();

      expect(shouldShow).toBe(true);
    });

    it('should not show guidance for completed users', async () => {
      // Mock status for completed user
      mockFetch.mockResolvedValueOnce(
        createStatusMockData(0, 100, new Date().toISOString())
      );

      const shouldShow = await activationService.shouldShowActivationGuidance();

      expect(shouldShow).toBe(false);
    });

    it('should get next activation step', async () => {
      // Mock status for user at step 2
      mockFetch.mockResolvedValueOnce(
        createStatusMockData(2, 30)
      );

      const nextStep = await activationService.getNextActivationStep();

      expect(nextStep).toEqual({
        step: 'Import Your Clients',
        description: 'Add your existing clients to see the power of WedSync',
        action_url: '/clients/import',
      });
    });
  });

  describe('Analytics', () => {
    it('should fetch funnel analytics for admins', async () => {
      const mockAnalytics = {
        overview: {
          total_users: 100,
          completed_users: 25,
          completion_rate: 25,
          at_risk_users: 20,
          active_users: 55,
        },
        funnel_steps: [],
        daily_metrics: [],
        recent_drop_offs: [],
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockAnalytics));

      const analytics = await activationService.getFunnelAnalytics({
        days: 30,
      });

      expect(analytics).toEqual(mockAnalytics);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/activation/analytics?days=30',
      );
    });

    it('should generate analytics for specific date', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          message: 'Analytics generated for 2025-09-01',
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await activationService.generateAnalytics('2025-09-01');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/activation/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: '2025-09-01' }),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce(
        createErrorResponse('Rate limit exceeded')
      );

      const result = await activationService.trackSignupCompleted();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      const result = await activationService.trackSignupCompleted();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Integration Points', () => {
    it('should track events at key user actions', async () => {
      // This would be tested in integration with actual components
      // Here we just verify the service can handle the expected event types

      const eventTypes = [
        ActivationEventType.SIGNUP_COMPLETED,
        ActivationEventType.ONBOARDING_COMPLETED,
        ActivationEventType.CLIENT_IMPORTED,
        ActivationEventType.FORM_SENT,
        ActivationEventType.RESPONSE_RECEIVED,
        ActivationEventType.AUTOMATION_CREATED,
      ];

      await testEventTypeTracking(eventTypes);

      expect(mockFetch).toHaveBeenCalledTimes(eventTypes.length);
    });
  });
});
