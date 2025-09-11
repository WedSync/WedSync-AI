/**
 * WS-204: Comprehensive Test Suite - PresencePermissionService
 *
 * Tests for relationship-based access control with wedding industry context.
 * Covers privacy enforcement, caching, bulk operations, and edge cases.
 *
 * Test Coverage Areas:
 * - Relationship validation (organization, wedding, public)
 * - Privacy settings enforcement
 * - Bulk permission checking with performance optimization
 * - Wedding-specific permission contexts
 * - Cache management and invalidation
 * - Enterprise compliance features
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PresencePermissionService,
  RelationshipType,
  VisibilityLevel,
  PermissionContext,
  BulkPermissionResult,
} from '../permission-service';

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
  or: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  single: vi.fn(),
  limit: vi.fn().mockReturnThis(),
};

// Mock testable permission service
class TestablePermissionService extends PresencePermissionService {
  constructor(mockSupabaseClient: any) {
    super('test-url', 'test-key');
    (this as any).supabase = mockSupabaseClient;
  }

  // Expose private methods for testing
  public testGetCachedPermission(viewerId: string, targetUserId: string) {
    return (this as any).getCachedPermission(viewerId, targetUserId);
  }

  public async testCachePermission(
    viewerId: string,
    targetUserId: string,
    data: any,
  ) {
    return (this as any).cachePermission(viewerId, targetUserId, data);
  }

  public testEvaluatePermission(
    visibility: string,
    relationshipType: RelationshipType,
  ) {
    return (this as any).evaluatePermission(visibility, relationshipType);
  }
}

describe('PresencePermissionService', () => {
  let permissionService: TestablePermissionService;

  beforeEach(() => {
    permissionService = new TestablePermissionService(mockSupabase);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // BASIC PERMISSION CHECKING TESTS
  // ============================================================================

  describe('checkViewPermission', () => {
    it('should allow users to see their own presence', async () => {
      const userId = 'user-123';

      const result = await permissionService.checkViewPermission(
        userId,
        userId,
      );

      expect(result).toBe(true);
    });

    it('should respect appear offline setting', async () => {
      const targetUserId = 'user-123';
      const viewerId = 'user-456';

      // Mock settings with appear offline
      mockSupabase.single.mockResolvedValue({
        data: {
          visibility: 'everyone',
          appear_offline: true,
          show_activity: true,
          show_current_page: false,
        },
        error: null,
      });

      const result = await permissionService.checkViewPermission(
        targetUserId,
        viewerId,
      );

      expect(result).toBe(false);
    });

    it('should respect nobody visibility setting', async () => {
      const targetUserId = 'user-123';
      const viewerId = 'user-456';

      mockSupabase.single.mockResolvedValue({
        data: {
          visibility: 'nobody',
          appear_offline: false,
          show_activity: true,
          show_current_page: false,
        },
        error: null,
      });

      const result = await permissionService.checkViewPermission(
        targetUserId,
        viewerId,
      );

      expect(result).toBe(false);
    });

    it('should allow everyone visibility to all users', async () => {
      const targetUserId = 'user-123';
      const viewerId = 'user-456';

      mockSupabase.single.mockResolvedValue({
        data: {
          visibility: 'everyone',
          appear_offline: false,
          show_activity: true,
          show_current_page: true,
        },
        error: null,
      });

      // Mock relationship validation
      vi.spyOn(permissionService, 'validateRelationship').mockResolvedValue({
        type: RelationshipType.PUBLIC,
        canViewPresence: false,
        canViewActivity: false,
        canViewCurrentPage: false,
      });

      const result = await permissionService.checkViewPermission(
        targetUserId,
        viewerId,
      );

      expect(result).toBe(true);
    });

    it('should check organization membership for team visibility', async () => {
      const targetUserId = 'user-123';
      const viewerId = 'user-456';

      mockSupabase.single.mockResolvedValue({
        data: {
          visibility: 'team',
          appear_offline: false,
          show_activity: true,
          show_current_page: false,
        },
        error: null,
      });

      // Mock organization relationship
      vi.spyOn(permissionService, 'validateRelationship').mockResolvedValue({
        type: RelationshipType.ORGANIZATION_MEMBER,
        canViewPresence: false,
        canViewActivity: false,
        canViewCurrentPage: false,
        organizationId: 'org-123',
      });

      const result = await permissionService.checkViewPermission(
        targetUserId,
        viewerId,
      );

      expect(result).toBe(true);
    });

    it('should check wedding collaboration for contacts visibility', async () => {
      const targetUserId = 'user-123';
      const viewerId = 'user-456';

      mockSupabase.single.mockResolvedValue({
        data: {
          visibility: 'contacts',
          appear_offline: false,
          show_activity: true,
          show_current_page: false,
        },
        error: null,
      });

      // Mock wedding relationship
      vi.spyOn(permissionService, 'validateRelationship').mockResolvedValue({
        type: RelationshipType.WEDDING_COLLABORATOR,
        canViewPresence: false,
        canViewActivity: false,
        canViewCurrentPage: false,
        weddingId: 'wedding-123',
      });

      const result = await permissionService.checkViewPermission(
        targetUserId,
        viewerId,
      );

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // RELATIONSHIP VALIDATION TESTS
  // ============================================================================

  describe('validateRelationship', () => {
    it('should identify same user relationship', async () => {
      const userId = 'user-123';

      const result = await permissionService.validateRelationship(
        userId,
        userId,
      );

      expect(result.type).toBe(RelationshipType.SAME_USER);
      expect(result.canViewPresence).toBe(true);
      expect(result.canViewActivity).toBe(true);
      expect(result.canViewCurrentPage).toBe(true);
    });

    it('should identify organization membership', async () => {
      const userId1 = 'user-123';
      const userId2 = 'user-456';

      // Mock organization membership data
      mockSupabase.select.mockResolvedValue({
        data: [
          { user_id: userId1, organization_id: 'org-123' },
          { user_id: userId2, organization_id: 'org-123' },
        ],
        error: null,
      });

      const result = await permissionService.validateRelationship(
        userId1,
        userId2,
      );

      expect(result.type).toBe(RelationshipType.ORGANIZATION_MEMBER);
      expect(result.organizationId).toBe('org-123');
    });

    it('should identify wedding collaboration', async () => {
      const supplierId = 'photographer-123';
      const clientId = 'couple-456';

      // Mock wedding collaboration data
      mockSupabase.select
        .mockResolvedValueOnce({
          data: null, // No organization relationship
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            wedding_id: 'wedding-789',
            connection_type: 'photography_services',
          },
          error: null,
        });

      const result = await permissionService.validateRelationship(
        supplierId,
        clientId,
      );

      expect(result.type).toBe(RelationshipType.WEDDING_COLLABORATOR);
      expect(result.weddingId).toBe('wedding-789');
      expect(result.connectionType).toBe('photography_services');
    });

    it('should identify no relationship', async () => {
      const userId1 = 'user-123';
      const userId2 = 'user-456';

      // Mock no relationships found
      mockSupabase.select
        .mockResolvedValueOnce({ data: null, error: null }) // No org
        .mockResolvedValueOnce({ data: null, error: null }); // No wedding

      const result = await permissionService.validateRelationship(
        userId1,
        userId2,
      );

      expect(result.type).toBe(RelationshipType.NONE);
    });

    it('should handle database errors gracefully', async () => {
      const userId1 = 'user-123';
      const userId2 = 'user-456';

      mockSupabase.select.mockRejectedValue(new Error('Database error'));

      const result = await permissionService.validateRelationship(
        userId1,
        userId2,
      );

      expect(result.type).toBe(RelationshipType.NONE);
    });
  });

  // ============================================================================
  // BULK PERMISSION TESTS
  // ============================================================================

  describe('checkBulkPermissions', () => {
    it('should check permissions for multiple users efficiently', async () => {
      const targetUserIds = ['user-1', 'user-2', 'user-3'];
      const viewerId = 'viewer-123';

      // Mock individual permission checks
      vi.spyOn(permissionService, 'checkViewPermission').mockImplementation(
        async (targetId: string) => {
          return targetId === 'user-1' || targetId === 'user-3';
        },
      );

      vi.spyOn(permissionService, 'validateRelationship').mockImplementation(
        async (viewerId: string, targetId: string) => {
          if (targetId === 'user-1') {
            return {
              type: RelationshipType.ORGANIZATION_MEMBER,
              canViewPresence: false,
              canViewActivity: false,
              canViewCurrentPage: false,
            };
          }
          if (targetId === 'user-3') {
            return {
              type: RelationshipType.WEDDING_COLLABORATOR,
              canViewPresence: false,
              canViewActivity: false,
              canViewCurrentPage: false,
            };
          }
          return {
            type: RelationshipType.NONE,
            canViewPresence: false,
            canViewActivity: false,
            canViewCurrentPage: false,
          };
        },
      );

      const results = await permissionService.checkBulkPermissions(
        targetUserIds,
        viewerId,
      );

      expect(results).toHaveLength(3);

      const user1Result = results.find((r) => r.userId === 'user-1');
      const user2Result = results.find((r) => r.userId === 'user-2');
      const user3Result = results.find((r) => r.userId === 'user-3');

      expect(user1Result?.canView).toBe(true);
      expect(user1Result?.relationshipType).toBe(
        RelationshipType.ORGANIZATION_MEMBER,
      );

      expect(user2Result?.canView).toBe(false);
      expect(user2Result?.relationshipType).toBe(RelationshipType.NONE);

      expect(user3Result?.canView).toBe(true);
      expect(user3Result?.relationshipType).toBe(
        RelationshipType.WEDDING_COLLABORATOR,
      );
    });

    it('should handle empty user list', async () => {
      const results = await permissionService.checkBulkPermissions(
        [],
        'viewer-123',
      );
      expect(results).toEqual([]);
    });

    it('should handle errors in bulk processing', async () => {
      const targetUserIds = ['user-1', 'user-2'];
      const viewerId = 'viewer-123';

      vi.spyOn(permissionService, 'checkViewPermission').mockRejectedValue(
        new Error('Permission check failed'),
      );

      const results = await permissionService.checkBulkPermissions(
        targetUserIds,
        viewerId,
      );

      // Should return empty results on error
      expect(results).toHaveLength(0);
    });
  });

  // ============================================================================
  // FILTERING TESTS
  // ============================================================================

  describe('filterPresenceByPermissions', () => {
    it('should filter presence data by permissions', async () => {
      const presenceData = [
        { userId: 'user-1', status: 'online' },
        { userId: 'user-2', status: 'away' },
        { userId: 'user-3', status: 'idle' },
      ];
      const viewerId = 'viewer-123';

      // Mock permissions - allow user-1 and user-3
      vi.spyOn(permissionService, 'checkViewPermission').mockImplementation(
        async (targetId: string) => {
          return targetId === 'user-1' || targetId === 'user-3';
        },
      );

      const filtered = await permissionService.filterPresenceByPermissions(
        presenceData,
        viewerId,
      );

      expect(filtered).toHaveLength(2);
      expect(filtered.map((p) => p.userId)).toEqual(['user-1', 'user-3']);
    });

    it('should handle empty presence data', async () => {
      const filtered = await permissionService.filterPresenceByPermissions(
        [],
        'viewer-123',
      );
      expect(filtered).toEqual([]);
    });
  });

  // ============================================================================
  // SPECIFIC PERMISSION TESTS
  // ============================================================================

  describe('checkSpecificPermission', () => {
    it('should check presence permission', async () => {
      const context: PermissionContext = {
        viewerId: 'viewer-123',
        targetUserId: 'user-456',
        requestType: 'presence',
      };

      // Mock cached permission data
      const cachedData = {
        type: RelationshipType.ORGANIZATION_MEMBER,
        canViewPresence: true,
        canViewActivity: false,
        canViewCurrentPage: true,
      };

      vi.spyOn(permissionService, 'testGetCachedPermission').mockReturnValue(
        cachedData,
      );

      const result = await permissionService.checkSpecificPermission(context);

      expect(result).toBe(true);
    });

    it('should check activity permission', async () => {
      const context: PermissionContext = {
        viewerId: 'viewer-123',
        targetUserId: 'user-456',
        requestType: 'activity',
      };

      const cachedData = {
        type: RelationshipType.WEDDING_COLLABORATOR,
        canViewPresence: true,
        canViewActivity: false,
        canViewCurrentPage: true,
      };

      vi.spyOn(permissionService, 'testGetCachedPermission').mockReturnValue(
        cachedData,
      );

      const result = await permissionService.checkSpecificPermission(context);

      expect(result).toBe(false);
    });

    it('should check current page permission', async () => {
      const context: PermissionContext = {
        viewerId: 'viewer-123',
        targetUserId: 'user-456',
        requestType: 'current_page',
      };

      const cachedData = {
        type: RelationshipType.ORGANIZATION_MEMBER,
        canViewPresence: true,
        canViewActivity: true,
        canViewCurrentPage: false,
      };

      vi.spyOn(permissionService, 'testGetCachedPermission').mockReturnValue(
        cachedData,
      );

      const result = await permissionService.checkSpecificPermission(context);

      expect(result).toBe(false);
    });

    it('should fallback to full check when no cache', async () => {
      const context: PermissionContext = {
        viewerId: 'viewer-123',
        targetUserId: 'user-456',
        requestType: 'presence',
      };

      // Mock no cached data
      vi.spyOn(permissionService, 'testGetCachedPermission').mockReturnValue(
        null,
      );

      // Mock full permission check
      vi.spyOn(permissionService, 'checkViewPermission').mockResolvedValue(
        true,
      );

      // Mock settings
      mockSupabase.single.mockResolvedValue({
        data: {
          show_current_page: true,
        },
        error: null,
      });

      const result = await permissionService.checkSpecificPermission(context);

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // WEDDING INDUSTRY SPECIFIC TESTS
  // ============================================================================

  describe('wedding industry contexts', () => {
    it('should get wedding team presence', async () => {
      const weddingId = 'wedding-123';
      const viewerId = 'coordinator-456';

      // Mock wedding collaborators
      mockSupabase.select.mockResolvedValue({
        data: [
          { supplier_id: 'photographer-1', client_id: 'couple-1' },
          { supplier_id: 'florist-2', client_id: 'couple-1' },
          { supplier_id: 'venue-3', client_id: 'couple-1' },
        ],
        error: null,
      });

      // Mock bulk permissions
      vi.spyOn(permissionService, 'checkBulkPermissions').mockResolvedValue([
        {
          userId: 'photographer-1',
          canView: true,
          relationshipType: RelationshipType.WEDDING_COLLABORATOR,
          restrictions: [],
        },
        {
          userId: 'couple-1',
          canView: true,
          relationshipType: RelationshipType.WEDDING_COLLABORATOR,
          restrictions: [],
        },
        {
          userId: 'florist-2',
          canView: false,
          relationshipType: RelationshipType.NONE,
          restrictions: ['no_relationship'],
        },
      ]);

      const result = await permissionService.getWeddingTeamPresence(
        weddingId,
        viewerId,
      );

      expect(result).toContain('photographer-1');
      expect(result).toContain('couple-1');
      expect(result).not.toContain('florist-2');
    });

    it('should get organization team presence', async () => {
      const organizationId = 'org-123';
      const viewerId = 'admin-456';

      // Mock organization members
      mockSupabase.select.mockResolvedValue({
        data: [
          { user_id: 'member-1' },
          { user_id: 'member-2' },
          { user_id: 'member-3' },
        ],
        error: null,
      });

      // Mock bulk permissions
      vi.spyOn(permissionService, 'checkBulkPermissions').mockResolvedValue([
        {
          userId: 'member-1',
          canView: true,
          relationshipType: RelationshipType.ORGANIZATION_MEMBER,
          restrictions: [],
        },
        {
          userId: 'member-2',
          canView: true,
          relationshipType: RelationshipType.ORGANIZATION_MEMBER,
          restrictions: [],
        },
        {
          userId: 'member-3',
          canView: false,
          relationshipType: RelationshipType.NONE,
          restrictions: ['privacy_hidden'],
        },
      ]);

      const result = await permissionService.getOrganizationTeamPresence(
        organizationId,
        viewerId,
      );

      expect(result).toHaveLength(2);
      expect(result).toContain('member-1');
      expect(result).toContain('member-2');
    });

    it('should check presence management permissions', async () => {
      const targetUserId = 'employee-123';
      const adminId = 'admin-456';

      // Mock admin checking employee in same org
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { organization_id: 'org-123' },
          error: null,
        }) // Target user profile
        .mockResolvedValueOnce({
          data: { role: 'admin' },
          error: null,
        }); // Manager profile

      const result = await permissionService.canManagePresenceSettings(
        targetUserId,
        adminId,
      );

      expect(result).toBe(true);
    });

    it('should deny management for non-admins', async () => {
      const targetUserId = 'employee-123';
      const regularUserId = 'user-456';

      // Mock regular user checking employee
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { organization_id: 'org-123' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { role: 'member' },
          error: null,
        });

      const result = await permissionService.canManagePresenceSettings(
        targetUserId,
        regularUserId,
      );

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // CACHING TESTS
  // ============================================================================

  describe('caching functionality', () => {
    it('should cache permission results', async () => {
      const viewerId = 'viewer-123';
      const targetUserId = 'user-456';
      const permissionData = {
        type: RelationshipType.ORGANIZATION_MEMBER,
        canViewPresence: true,
        canViewActivity: false,
        canViewCurrentPage: true,
      };

      await permissionService.testCachePermission(
        viewerId,
        targetUserId,
        permissionData,
      );

      const cached = permissionService.testGetCachedPermission(
        viewerId,
        targetUserId,
      );

      expect(cached).toEqual(permissionData);
    });

    it('should invalidate expired cache entries', async () => {
      const viewerId = 'viewer-123';
      const targetUserId = 'user-456';
      const permissionData = {
        type: RelationshipType.ORGANIZATION_MEMBER,
        canViewPresence: true,
        canViewActivity: false,
        canViewCurrentPage: true,
      };

      // Cache with very short TTL
      await permissionService.testCachePermission(
        viewerId,
        targetUserId,
        permissionData,
      );

      // Wait for expiration (in real cache, TTL would be much longer)
      await new Promise((resolve) => setTimeout(resolve, 100));

      const cached = permissionService.testGetCachedPermission(
        viewerId,
        targetUserId,
      );

      // Should return null for expired entries
      expect(cached).toBeNull();
    });

    it('should invalidate user cache', async () => {
      const userId = 'user-123';

      mockSupabase.delete.mockResolvedValue({ data: null, error: null });

      await expect(
        permissionService.invalidateUserCache(userId),
      ).resolves.not.toThrow();

      expect(mockSupabase.delete).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // UTILITY METHODS TESTS
  // ============================================================================

  describe('utility methods', () => {
    it('should evaluate permissions correctly', () => {
      expect(
        permissionService.testEvaluatePermission(
          'everyone',
          RelationshipType.NONE,
        ),
      ).toBe(true);
      expect(
        permissionService.testEvaluatePermission(
          'team',
          RelationshipType.ORGANIZATION_MEMBER,
        ),
      ).toBe(true);
      expect(
        permissionService.testEvaluatePermission('team', RelationshipType.NONE),
      ).toBe(false);
      expect(
        permissionService.testEvaluatePermission(
          'contacts',
          RelationshipType.WEDDING_COLLABORATOR,
        ),
      ).toBe(true);
      expect(
        permissionService.testEvaluatePermission(
          'contacts',
          RelationshipType.ORGANIZATION_MEMBER,
        ),
      ).toBe(false);
      expect(
        permissionService.testEvaluatePermission(
          'nobody',
          RelationshipType.SAME_USER,
        ),
      ).toBe(false);
    });

    it('should get visibility level', async () => {
      const userId = 'user-123';

      mockSupabase.single.mockResolvedValue({
        data: {
          visibility: 'team',
        },
        error: null,
      });

      const result = await permissionService.getVisibilityLevel(userId);

      expect(result).toBe(VisibilityLevel.TEAM);
    });

    it('should return default visibility on error', async () => {
      const userId = 'user-123';

      mockSupabase.single.mockRejectedValue(new Error('Database error'));

      const result = await permissionService.getVisibilityLevel(userId);

      expect(result).toBe(VisibilityLevel.CONTACTS);
    });
  });

  // ============================================================================
  // ERROR HANDLING AND EDGE CASES
  // ============================================================================

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      const targetUserId = 'user-123';
      const viewerId = 'user-456';

      mockSupabase.single.mockRejectedValue(new Error('Connection failed'));

      const result = await permissionService.checkViewPermission(
        targetUserId,
        viewerId,
      );

      expect(result).toBe(false);
    });

    it('should handle malformed user IDs', async () => {
      const invalidUserId = 'not-a-uuid';
      const viewerId = 'user-456';

      // Should not throw, but return false
      const result = await permissionService.checkViewPermission(
        invalidUserId,
        viewerId,
      );

      expect(result).toBe(false);
    });

    it('should handle concurrent permission checks', async () => {
      const targetUserId = 'user-123';
      const viewerIds = ['viewer-1', 'viewer-2', 'viewer-3'];

      mockSupabase.single.mockResolvedValue({
        data: {
          visibility: 'everyone',
          appear_offline: false,
        },
        error: null,
      });

      vi.spyOn(permissionService, 'validateRelationship').mockResolvedValue({
        type: RelationshipType.PUBLIC,
        canViewPresence: false,
        canViewActivity: false,
        canViewCurrentPage: false,
      });

      // Concurrent permission checks should all succeed
      const promises = viewerIds.map((viewerId) =>
        permissionService.checkViewPermission(targetUserId, viewerId),
      );

      const results = await Promise.all(promises);

      expect(results).toEqual([true, true, true]);
    });
  });
});
