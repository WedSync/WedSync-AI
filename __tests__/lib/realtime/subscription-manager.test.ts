/**
 * WS-202: Supabase Realtime Integration - Backend Test Suite
 * RealtimeSubscriptionManager Tests
 * 
 * Comprehensive test suite for realtime subscription management
 * covering security, permissions, and wedding industry use cases.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RealtimeSubscriptionManager } from '@/lib/realtime/subscription-manager';
import { RealtimeError } from '@/types/realtime';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  channel: jest.fn(),
  rpc: jest.fn(),
  auth: {
    getSession: jest.fn(),
    getUser: jest.fn()
  }
};

// Mock realtime channel
const mockChannel = {
  on: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn()
};

// Mock database responses
const mockUserProfile = {
  id: 'test-user-id',
  user_type: 'supplier',
  supplier_id: 'test-supplier-id',
  couple_id: null,
  organization_id: 'test-org-id'
};

const mockCoupleProfile = {
  id: 'test-couple-id',
  user_type: 'couple',
  supplier_id: null,
  couple_id: 'test-couple-id',
  organization_id: 'test-org-id'
};

describe('RealtimeSubscriptionManager', () => {
  let subscriptionManager: RealtimeSubscriptionManager;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockSupabaseClient.channel.mockReturnValue(mockChannel);
    mockChannel.subscribe.mockResolvedValue('SUBSCRIBED');
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockResolvedValue({ error: null }),
      count: jest.fn().mockResolvedValue({ count: 0, error: null })
    });
    mockSupabaseClient.rpc.mockResolvedValue({ data: true, error: null });

    subscriptionManager = new RealtimeSubscriptionManager(mockSupabaseClient as any, {
      maxConnectionsPerUser: 10,
      enableActivityLogging: true
    });
  });

  afterEach(async () => {
    // Cleanup subscriptions
    await subscriptionManager.cleanup();
  });

  describe('User Context Initialization', () => {
    test('should initialize user context successfully for supplier', async () => {
      await expect(
        subscriptionManager.initializeUserContext('test-user-id')
      ).resolves.not.toThrow();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles');
    });

    test('should throw error for invalid user', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'User not found' } })
      });

      await expect(
        subscriptionManager.initializeUserContext('invalid-user-id')
      ).rejects.toThrow(RealtimeError);
    });

    test('should handle couple user type', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCoupleProfile, error: null })
      });

      await expect(
        subscriptionManager.initializeUserContext('test-couple-id')
      ).resolves.not.toThrow();
    });
  });

  describe('Permission Validation', () => {
    beforeEach(async () => {
      await subscriptionManager.initializeUserContext('test-user-id');
    });

    test('should validate channel permissions using database function', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: true, error: null });

      const result = await subscriptionManager.subscribeToChannel(
        'test-user-id',
        'form-responses',
        {
          table: 'form_responses',
          filter: 'supplier_id=eq.test-supplier-id'
        },
        jest.fn()
      );

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'validate_channel_permission',
        expect.objectContaining({
          user_uuid: 'test-user-id',
          channel_name: 'form-responses'
        })
      );
    });

    test('should reject subscription for unauthorized channel', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: false, error: null });

      await expect(
        subscriptionManager.subscribeToChannel(
          'test-user-id',
          'core-fields',
          {
            table: 'core_fields',
            filter: 'couple_id=eq.other-couple-id'
          },
          jest.fn()
        )
      ).rejects.toThrow(RealtimeError);
    });
  });

  describe('Connection Limits', () => {
    beforeEach(async () => {
      await subscriptionManager.initializeUserContext('test-user-id');
    });

    test('should enforce connection limits', async () => {
      // Mock reaching connection limit
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue({ count: 10, error: null })
      });

      await expect(
        subscriptionManager.subscribeToChannel(
          'test-user-id',
          'form-responses',
          { table: 'form_responses', filter: 'supplier_id=eq.test-supplier-id' },
          jest.fn()
        )
      ).rejects.toThrow(RealtimeError);
    });

    test('should allow subscription under limit', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
        insert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn().mockResolvedValue({ error: null }),
        count: jest.fn().mockResolvedValue({ count: 5, error: null })
      });

      const result = await subscriptionManager.subscribeToChannel(
        'test-user-id',
        'form-responses',
        { table: 'form_responses', filter: 'supplier_id=eq.test-supplier-id' },
        jest.fn()
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Wedding-Specific Subscriptions', () => {
    beforeEach(async () => {
      await subscriptionManager.initializeUserContext('test-user-id');
    });

    test('should create form response subscription for supplier', async () => {
      const result = await subscriptionManager.subscribeToFormResponses(
        'test-supplier-id',
        { supplier_id: 'test-supplier-id', form_id: 'test-form-id' }
      );

      expect(result.success).toBe(true);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          table: 'form_responses',
          filter: 'supplier_id=eq.test-supplier-id,form_id=eq.test-form-id'
        }),
        expect.any(Function)
      );
    });

    test('should create journey progress subscription', async () => {
      const result = await subscriptionManager.subscribeToJourneyProgress(
        'test-supplier-id',
        { supplier_id: 'test-supplier-id', journey_id: 'test-journey-id' }
      );

      expect(result.success).toBe(true);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          table: 'journey_progress',
          filter: 'supplier_id=eq.test-supplier-id,journey_id=eq.test-journey-id'
        }),
        expect.any(Function)
      );
    });

    test('should create core fields subscription for couple', async () => {
      // Setup couple context
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCoupleProfile, error: null }),
        insert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn().mockResolvedValue({ error: null }),
        count: jest.fn().mockResolvedValue({ count: 0, error: null })
      });

      await subscriptionManager.initializeUserContext('test-couple-id');

      const result = await subscriptionManager.subscribeToCoreFields(
        'test-couple-id',
        { 
          couple_id: 'test-couple-id', 
          wedding_id: 'test-wedding-id',
          field_group: 'venue_details'
        }
      );

      expect(result.success).toBe(true);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          table: 'core_fields',
          filter: 'couple_id=eq.test-couple-id,wedding_id=eq.test-wedding-id,field_group=eq.venue_details'
        }),
        expect.any(Function)
      );
    });
  });

  describe('Subscription Lifecycle', () => {
    beforeEach(async () => {
      await subscriptionManager.initializeUserContext('test-user-id');
    });

    test('should create unique channel IDs', async () => {
      const result1 = await subscriptionManager.subscribeToChannel(
        'test-user-id',
        'form-responses',
        { table: 'form_responses', filter: 'supplier_id=eq.test-supplier-id' },
        jest.fn()
      );

      const result2 = await subscriptionManager.subscribeToChannel(
        'test-user-id',
        'form-responses',
        { table: 'form_responses', filter: 'supplier_id=eq.test-supplier-id' },
        jest.fn()
      );

      expect(result1.channelId).not.toBe(result2.channelId);
      expect(mockSupabaseClient.channel).toHaveBeenCalledTimes(2);
    });

    test('should track active subscriptions', async () => {
      await subscriptionManager.subscribeToChannel(
        'test-user-id',
        'form-responses',
        { table: 'form_responses', filter: 'supplier_id=eq.test-supplier-id' },
        jest.fn()
      );

      const activeSubscriptions = subscriptionManager.getActiveSubscriptions();
      expect(activeSubscriptions).toHaveLength(1);
    });

    test('should unsubscribe from specific channel', async () => {
      const result = await subscriptionManager.subscribeToChannel(
        'test-user-id',
        'form-responses',
        { table: 'form_responses', filter: 'supplier_id=eq.test-supplier-id' },
        jest.fn()
      );

      await subscriptionManager.unsubscribeFromChannel(result.channelId);

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(subscriptionManager.getActiveSubscriptions()).toHaveLength(0);
    });

    test('should cleanup all subscriptions', async () => {
      // Create multiple subscriptions
      await Promise.all([
        subscriptionManager.subscribeToChannel(
          'test-user-id',
          'form-responses',
          { table: 'form_responses', filter: 'supplier_id=eq.test-supplier-id' },
          jest.fn()
        ),
        subscriptionManager.subscribeToChannel(
          'test-user-id',
          'notifications',
          { table: 'notifications', filter: 'user_id=eq.test-user-id' },
          jest.fn()
        )
      ]);

      expect(subscriptionManager.getActiveSubscriptions()).toHaveLength(2);

      await subscriptionManager.cleanup();

      expect(subscriptionManager.getActiveSubscriptions()).toHaveLength(0);
      expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('Activity Logging', () => {
    beforeEach(async () => {
      await subscriptionManager.initializeUserContext('test-user-id');
    });

    test('should log subscription activity when enabled', async () => {
      const callback = jest.fn();
      await subscriptionManager.subscribeToChannel(
        'test-user-id',
        'form-responses',
        { table: 'form_responses', filter: 'supplier_id=eq.test-supplier-id' },
        callback
      );

      // Simulate realtime event
      const mockPayload = {
        eventType: 'INSERT',
        new: { id: 'test-record-id', form_id: 'test-form-id' },
        old: null,
        table: 'form_responses'
      };

      // Get the callback that was registered with the channel
      const channelCallback = mockChannel.on.mock.calls[0][2];
      channelCallback(mockPayload);

      expect(callback).toHaveBeenCalledWith(mockPayload);
      
      // Should also log activity
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('realtime_activity_logs');
    });

    test('should record subscription in database', async () => {
      await subscriptionManager.subscribeToChannel(
        'test-user-id',
        'form-responses',
        { table: 'form_responses', filter: 'supplier_id=eq.test-supplier-id' },
        jest.fn()
      );

      // Should record subscription
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('realtime_subscriptions');
    });
  });

  describe('Error Handling', () => {
    test('should handle Supabase connection errors', async () => {
      mockChannel.subscribe.mockResolvedValue('SUBSCRIPTION_ERROR');

      await subscriptionManager.initializeUserContext('test-user-id');

      await expect(
        subscriptionManager.subscribeToChannel(
          'test-user-id',
          'form-responses',
          { table: 'form_responses', filter: 'supplier_id=eq.test-supplier-id' },
          jest.fn()
        )
      ).rejects.toThrow(RealtimeError);
    });

    test('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
        insert: jest.fn().mockResolvedValue({ error: { message: 'Database error' } }),
        update: jest.fn().mockResolvedValue({ error: null }),
        count: jest.fn().mockResolvedValue({ count: 0, error: null })
      });

      await subscriptionManager.initializeUserContext('test-user-id');

      // Should not throw for database logging errors
      const result = await subscriptionManager.subscribeToChannel(
        'test-user-id',
        'form-responses',
        { table: 'form_responses', filter: 'supplier_id=eq.test-supplier-id' },
        jest.fn()
      );

      expect(result.success).toBe(true);
    });

    test('should handle permission validation errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: { message: 'Permission check failed' } });

      await subscriptionManager.initializeUserContext('test-user-id');

      await expect(
        subscriptionManager.subscribeToChannel(
          'test-user-id',
          'form-responses',
          { table: 'form_responses', filter: 'supplier_id=eq.test-supplier-id' },
          jest.fn()
        )
      ).rejects.toThrow(RealtimeError);
    });
  });

  describe('Wedding Industry Event Handlers', () => {
    beforeEach(async () => {
      await subscriptionManager.initializeUserContext('test-user-id');
    });

    test('should handle form response updates correctly', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await subscriptionManager.subscribeToFormResponses('test-supplier-id');

      // Get the registered callback
      const channelCallback = mockChannel.on.mock.calls[0][2];
      
      const mockFormResponsePayload = {
        eventType: 'INSERT',
        new: {
          id: 'response-123',
          form_id: 'form-456',
          wedding_id: 'wedding-789',
          supplier_id: 'test-supplier-id'
        },
        old: null,
        table: 'form_responses'
      };

      channelCallback(mockFormResponsePayload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Form response update for supplier test-supplier-id'),
        expect.objectContaining({
          eventType: 'INSERT',
          responseId: 'response-123',
          formId: 'form-456',
          weddingId: 'wedding-789'
        })
      );

      consoleSpy.mockRestore();
    });

    test('should handle journey progress updates correctly', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await subscriptionManager.subscribeToJourneyProgress('test-supplier-id');

      const channelCallback = mockChannel.on.mock.calls[0][2];
      
      const mockJourneyPayload = {
        eventType: 'UPDATE',
        new: {
          id: 'progress-123',
          journey_id: 'journey-456',
          step_id: 'step-789',
          completed_at: new Date().toISOString()
        },
        old: { completed_at: null },
        table: 'journey_progress'
      };

      channelCallback(mockJourneyPayload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Journey progress update for supplier test-supplier-id'),
        expect.objectContaining({
          eventType: 'UPDATE',
          progressId: 'progress-123',
          journeyId: 'journey-456',
          stepId: 'step-789'
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Options', () => {
    test('should respect maxConnectionsPerUser setting', async () => {
      const limitedManager = new RealtimeSubscriptionManager(mockSupabaseClient as any, {
        maxConnectionsPerUser: 2,
        enableActivityLogging: true
      });

      await limitedManager.initializeUserContext('test-user-id');

      // Mock reaching the custom limit
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue({ count: 2, error: null })
      });

      await expect(
        limitedManager.subscribeToChannel(
          'test-user-id',
          'form-responses',
          { table: 'form_responses', filter: 'supplier_id=eq.test-supplier-id' },
          jest.fn()
        )
      ).rejects.toThrow(RealtimeError);

      await limitedManager.cleanup();
    });

    test('should disable activity logging when configured', async () => {
      const noLogManager = new RealtimeSubscriptionManager(mockSupabaseClient as any, {
        maxConnectionsPerUser: 10,
        enableActivityLogging: false
      });

      await noLogManager.initializeUserContext('test-user-id');

      await noLogManager.subscribeToChannel(
        'test-user-id',
        'form-responses',
        { table: 'form_responses', filter: 'supplier_id=eq.test-supplier-id' },
        jest.fn()
      );

      // Activity logging should not be called
      expect(mockSupabaseClient.from).not.toHaveBeenCalledWith('realtime_activity_logs');

      await noLogManager.cleanup();
    });
  });
});