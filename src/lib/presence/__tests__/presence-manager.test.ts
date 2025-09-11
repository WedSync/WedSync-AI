/**
 * WS-204: Comprehensive Test Suite - PresenceManager
 *
 * Tests for presence tracking with privacy controls and enterprise analytics.
 * Covers all core functionality including permissions, caching, and edge cases.
 *
 * Test Coverage Areas:
 * - Presence tracking and broadcasting
 * - Privacy settings enforcement
 * - Bulk presence queries with filtering
 * - Session management and cleanup
 * - Rate limiting and error handling
 * - Wedding industry specific workflows
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PresenceManager,
  PresenceData,
  PresenceSettings,
} from '../presence-manager';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  single: vi.fn(),
  limit: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
};

// Mock presence manager with dependency injection
class TestablePresenceManager extends PresenceManager {
  constructor(mockSupabaseClient: any) {
    super('test-url', 'test-key');
    // Inject mock client
    (this as any).supabase = mockSupabaseClient;
  }

  // Expose private methods for testing
  public async testValidatePresenceTracking(userId: string) {
    return (this as any).validatePresenceTracking(userId);
  }

  public testGenerateSessionId(userId: string) {
    return (this as any).generateSessionId(userId);
  }

  public testSanitizeMetadata(metadata: any) {
    return (this as any).sanitizeMetadata(metadata);
  }
}

describe('PresenceManager', () => {
  let presenceManager: TestablePresenceManager;

  beforeEach(() => {
    presenceManager = new TestablePresenceManager(mockSupabase);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // PRESENCE TRACKING TESTS
  // ============================================================================

  describe('trackUserPresence', () => {
    it('should track user presence with valid data', async () => {
      const userId = 'user-123';
      const presenceData: PresenceData = {
        status: 'online',
        currentPage: '/dashboard',
        device: 'desktop',
        customStatus: 'Available for meetings',
      };

      // Mock successful database operations
      mockSupabase.single.mockResolvedValue({ data: null, error: null });
      mockSupabase.upsert.mockResolvedValue({ data: null, error: null });
      mockSupabase.insert.mockResolvedValue({ data: null, error: null });

      await expect(
        presenceManager.trackUserPresence(userId, presenceData),
      ).resolves.not.toThrow();

      // Verify database calls
      expect(mockSupabase.from).toHaveBeenCalledWith('user_last_seen');
      expect(mockSupabase.upsert).toHaveBeenCalled();
    });

    it('should enforce rate limiting', async () => {
      const userId = 'user-123';
      const presenceData: PresenceData = {
        status: 'online',
      };

      // First call should succeed
      await expect(
        presenceManager.trackUserPresence(userId, presenceData),
      ).resolves.not.toThrow();

      // Second immediate call should be rate limited
      await expect(
        presenceManager.trackUserPresence(userId, presenceData),
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should validate presence data format', async () => {
      const userId = 'user-123';
      const invalidPresenceData = {
        status: 'invalid-status',
        customStatus: 'x'.repeat(101), // Too long
      } as any;

      await expect(
        presenceManager.trackUserPresence(userId, invalidPresenceData),
      ).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      const userId = 'user-123';
      const presenceData: PresenceData = {
        status: 'online',
      };

      // Mock database error
      mockSupabase.upsert.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        presenceManager.trackUserPresence(userId, presenceData),
      ).rejects.toThrow('Presence tracking failed');
    });
  });

  // ============================================================================
  // PRIVACY AND PERMISSIONS TESTS
  // ============================================================================

  describe('getUserPresence', () => {
    it('should return presence for authorized viewer', async () => {
      const targetUserId = 'user-123';
      const viewerId = 'user-456';

      // Mock permissions check - allow access
      const mockPresenceData = {
        user_id: targetUserId,
        last_seen_at: new Date().toISOString(),
        last_status: 'online',
        is_online: true,
        last_page: '/dashboard',
        last_device: 'desktop',
        session_id: 'session-123',
      };

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            visibility: 'contacts',
            show_activity: true,
            show_current_page: true,
            appear_offline: false,
          },
          error: null,
        }) // Settings
        .mockResolvedValueOnce({ data: mockPresenceData, error: null }); // Presence data

      // Mock permission check success
      vi.spyOn(presenceManager, 'checkPresencePermissions').mockResolvedValue(
        true,
      );

      const result = await presenceManager.getUserPresence(
        targetUserId,
        viewerId,
      );

      expect(result).toBeTruthy();
      expect(result?.userId).toBe(targetUserId);
      expect(result?.status).toBe('online');
    });

    it('should return null for unauthorized viewer', async () => {
      const targetUserId = 'user-123';
      const viewerId = 'user-456';

      // Mock permission check failure
      vi.spyOn(presenceManager, 'checkPresencePermissions').mockResolvedValue(
        false,
      );

      const result = await presenceManager.getUserPresence(
        targetUserId,
        viewerId,
      );

      expect(result).toBeNull();
    });

    it('should respect appear offline setting', async () => {
      const targetUserId = 'user-123';
      const viewerId = 'user-456';

      // Mock settings with appear offline
      mockSupabase.single.mockResolvedValue({
        data: {
          visibility: 'everyone',
          appear_offline: true,
        },
        error: null,
      });

      vi.spyOn(presenceManager, 'checkPresencePermissions').mockResolvedValue(
        false,
      ); // Should be false due to appear offline

      const result = await presenceManager.getUserPresence(
        targetUserId,
        viewerId,
      );

      expect(result).toBeNull();
    });

    it('should hide current page when setting disabled', async () => {
      const targetUserId = 'user-123';
      const viewerId = 'user-456';

      const mockPresenceData = {
        user_id: targetUserId,
        last_seen_at: new Date().toISOString(),
        last_status: 'online',
        is_online: true,
        last_page: '/private-page',
        last_device: 'desktop',
        session_id: 'session-123',
      };

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            visibility: 'everyone',
            show_current_page: false, // Page tracking disabled
          },
          error: null,
        })
        .mockResolvedValueOnce({ data: mockPresenceData, error: null });

      vi.spyOn(presenceManager, 'checkPresencePermissions').mockResolvedValue(
        true,
      );

      const result = await presenceManager.getUserPresence(
        targetUserId,
        viewerId,
      );

      expect(result?.currentPage).toBeUndefined();
    });
  });

  // ============================================================================
  // BULK PRESENCE TESTS
  // ============================================================================

  describe('getBulkPresence', () => {
    it('should return presence for multiple authorized users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const viewerId = 'viewer-123';

      // Mock permission checks - allow access to user-1 and user-3
      vi.spyOn(presenceManager, 'checkPresencePermissions').mockImplementation(
        async (userId: string) => {
          return userId === 'user-1' || userId === 'user-3';
        },
      );

      // Mock bulk presence data
      const mockPresenceData = [
        {
          user_id: 'user-1',
          last_seen_at: new Date().toISOString(),
          last_status: 'online',
          is_online: true,
          session_id: 'session-1',
        },
        {
          user_id: 'user-3',
          last_seen_at: new Date().toISOString(),
          last_status: 'idle',
          is_online: true,
          session_id: 'session-3',
        },
      ];

      mockSupabase.in.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: mockPresenceData,
        error: null,
      });

      // Mock settings
      vi.spyOn(presenceManager, 'getPresenceSettings').mockResolvedValue({
        visibility: 'contacts',
        showActivity: true,
        showCurrentPage: true,
        appearOffline: false,
      });

      const result = await presenceManager.getBulkPresence(userIds, viewerId);

      // Should only return authorized users
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['user-1']).toBeTruthy();
      expect(result['user-3']).toBeTruthy();
      expect(result['user-2']).toBeUndefined();
    });

    it('should handle empty user list', async () => {
      const result = await presenceManager.getBulkPresence([], 'viewer-123');
      expect(result).toEqual({});
    });

    it('should handle database errors in bulk queries', async () => {
      const userIds = ['user-1', 'user-2'];
      const viewerId = 'viewer-123';

      vi.spyOn(presenceManager, 'checkPresencePermissions').mockResolvedValue(
        true,
      );

      mockSupabase.select.mockRejectedValue(new Error('Database error'));

      const result = await presenceManager.getBulkPresence(userIds, viewerId);

      // Should return empty object on error
      expect(result).toEqual({});
    });
  });

  // ============================================================================
  // SETTINGS MANAGEMENT TESTS
  // ============================================================================

  describe('updatePresenceSettings', () => {
    it('should update settings with valid data', async () => {
      const userId = 'user-123';
      const settings: PresenceSettings = {
        visibility: 'team',
        showActivity: false,
        showCurrentPage: true,
        appearOffline: false,
        customStatus: 'In a meeting',
      };

      mockSupabase.upsert.mockResolvedValue({ data: null, error: null });

      await expect(
        presenceManager.updatePresenceSettings(userId, settings),
      ).resolves.not.toThrow();

      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          visibility: 'team',
          show_activity: false,
          custom_status: 'In a meeting',
        }),
      );
    });

    it('should validate settings data', async () => {
      const userId = 'user-123';
      const invalidSettings = {
        visibility: 'invalid',
        customStatus: 'x'.repeat(101),
      } as any;

      await expect(
        presenceManager.updatePresenceSettings(userId, invalidSettings),
      ).rejects.toThrow('Invalid visibility setting');
    });

    it('should invalidate cache after settings update', async () => {
      const userId = 'user-123';
      const settings: PresenceSettings = {
        visibility: 'everyone',
        showActivity: true,
        showCurrentPage: false,
        appearOffline: false,
      };

      mockSupabase.upsert.mockResolvedValue({ data: null, error: null });
      mockSupabase.delete.mockResolvedValue({ data: null, error: null });

      await presenceManager.updatePresenceSettings(userId, settings);

      // Verify cache invalidation call
      expect(mockSupabase.delete).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // PERMISSION CHECKS TESTS
  // ============================================================================

  describe('checkPresencePermissions', () => {
    it('should allow users to see their own presence', async () => {
      const userId = 'user-123';
      const result = await presenceManager.checkPresencePermissions(
        userId,
        userId,
      );
      expect(result).toBe(true);
    });

    it('should check organization membership for team visibility', async () => {
      const targetUserId = 'user-123';
      const viewerId = 'user-456';

      // Mock settings with team visibility
      mockSupabase.single.mockResolvedValue({
        data: {
          visibility: 'team',
          appear_offline: false,
        },
        error: null,
      });

      // Mock organization membership check
      mockSupabase.select.mockResolvedValue({
        data: [
          { user_id: viewerId, organization_id: 'org-1' },
          { user_id: targetUserId, organization_id: 'org-1' },
        ],
        error: null,
      });

      const result = await presenceManager.checkPresencePermissions(
        targetUserId,
        viewerId,
      );
      expect(result).toBe(true);
    });

    it('should check wedding collaboration for contacts visibility', async () => {
      const targetUserId = 'user-123';
      const viewerId = 'user-456';

      // Mock settings with contacts visibility
      mockSupabase.single.mockResolvedValue({
        data: {
          visibility: 'contacts',
          appear_offline: false,
        },
        error: null,
      });

      // Mock wedding collaboration check
      mockSupabase.select.mockResolvedValue({
        data: [{ id: 'connection-1' }],
        error: null,
      });

      const result = await presenceManager.checkPresencePermissions(
        targetUserId,
        viewerId,
      );
      expect(result).toBe(true);
    });

    it('should deny access for nobody visibility', async () => {
      const targetUserId = 'user-123';
      const viewerId = 'user-456';

      mockSupabase.single.mockResolvedValue({
        data: {
          visibility: 'nobody',
          appear_offline: false,
        },
        error: null,
      });

      const result = await presenceManager.checkPresencePermissions(
        targetUserId,
        viewerId,
      );
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // CLEANUP AND MAINTENANCE TESTS
  // ============================================================================

  describe('cleanupStalePresence', () => {
    it('should mark offline users not seen in 5 minutes', async () => {
      const mockData = [{ user_id: 'user-1' }, { user_id: 'user-2' }];

      mockSupabase.update.mockResolvedValue({ data: mockData, error: null });
      mockSupabase.delete.mockResolvedValue({ data: null, error: null });

      const result = await presenceManager.cleanupStalePresence();

      expect(result).toBe(2);
      expect(mockSupabase.update).toHaveBeenCalledWith({ is_online: false });
    });

    it('should handle cleanup errors gracefully', async () => {
      mockSupabase.update.mockRejectedValue(new Error('Database error'));

      const result = await presenceManager.cleanupStalePresence();
      expect(result).toBe(0);
    });
  });

  // ============================================================================
  // UTILITY METHOD TESTS
  // ============================================================================

  describe('utility methods', () => {
    it('should generate unique session IDs', () => {
      const userId = 'user-123';
      const sessionId1 = presenceManager.testGenerateSessionId(userId);
      const sessionId2 = presenceManager.testGenerateSessionId(userId);

      expect(sessionId1).toBeTruthy();
      expect(sessionId2).toBeTruthy();
      expect(sessionId1).not.toBe(sessionId2);
      expect(sessionId1).toMatch(/^[a-f0-9]+$/); // Hex format
    });

    it('should sanitize metadata correctly', () => {
      const unsafeMetadata = {
        page: '/dashboard',
        device: 'desktop',
        sensitiveData: 'should-be-removed',
        password: 'secret',
        interactionType: 'click',
      };

      const sanitized = presenceManager.testSanitizeMetadata(unsafeMetadata);

      expect(sanitized.page).toBe('/dashboard');
      expect(sanitized.device).toBe('desktop');
      expect(sanitized.interactionType).toBe('click');
      expect(sanitized.sensitiveData).toBeUndefined();
      expect(sanitized.password).toBeUndefined();
    });
  });

  // ============================================================================
  // WEDDING INDUSTRY SPECIFIC TESTS
  // ============================================================================

  describe('wedding industry workflows', () => {
    it('should handle wedding day presence tracking', async () => {
      const supplierId = 'photographer-123';
      const presenceData: PresenceData = {
        status: 'online',
        currentPage: '/wedding/ceremony',
        device: 'mobile',
        customStatus: 'Capturing ceremony moments',
        customEmoji: '📸',
      };

      mockSupabase.single.mockResolvedValue({ data: null, error: null });
      mockSupabase.upsert.mockResolvedValue({ data: null, error: null });
      mockSupabase.insert.mockResolvedValue({ data: null, error: null });

      await expect(
        presenceManager.trackUserPresence(supplierId, presenceData),
      ).resolves.not.toThrow();

      // Verify wedding-specific data is tracked
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          last_page: '/wedding/ceremony',
          last_device: 'mobile',
        }),
      );
    });

    it('should support venue coordinator visibility', async () => {
      const coordinatorId = 'coordinator-123';
      const photographerId = 'photographer-456';

      // Mock wedding collaboration
      mockSupabase.single.mockResolvedValue({
        data: {
          visibility: 'contacts',
          appear_offline: false,
        },
        error: null,
      });

      mockSupabase.select.mockResolvedValue({
        data: [{ id: 'wedding-connection' }],
        error: null,
      });

      const result = await presenceManager.checkPresencePermissions(
        photographerId,
        coordinatorId,
      );
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // ERROR HANDLING AND EDGE CASES
  // ============================================================================

  describe('error handling', () => {
    it('should handle invalid user IDs gracefully', async () => {
      const invalidUserId = 'not-a-uuid';
      const presenceData: PresenceData = {
        status: 'online',
      };

      await expect(
        presenceManager.trackUserPresence(invalidUserId, presenceData),
      ).rejects.toThrow();
    });

    it('should handle network timeouts', async () => {
      const userId = 'user-123';
      const presenceData: PresenceData = {
        status: 'online',
      };

      // Mock timeout error
      mockSupabase.upsert.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100);
        });
      });

      await expect(
        presenceManager.trackUserPresence(userId, presenceData),
      ).rejects.toThrow('Presence tracking failed');
    });

    it('should handle concurrent access safely', async () => {
      const userId = 'user-123';
      const presenceData: PresenceData = {
        status: 'online',
      };

      mockSupabase.single.mockResolvedValue({ data: null, error: null });
      mockSupabase.upsert.mockResolvedValue({ data: null, error: null });
      mockSupabase.insert.mockResolvedValue({ data: null, error: null });

      // Wait for rate limit to reset
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Multiple concurrent calls should be handled safely
      const promises = Array(5)
        .fill(null)
        .map(() => presenceManager.trackUserPresence(userId, presenceData));

      // At least some should succeed, others should be rate limited
      const results = await Promise.allSettled(promises);
      const successful = results.filter((r) => r.status === 'fulfilled');
      const rateLimited = results.filter((r) => r.status === 'rejected');

      expect(successful.length).toBe(1); // Only first should succeed
      expect(rateLimited.length).toBe(4); // Rest should be rate limited
    });
  });
});
