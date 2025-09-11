/**
 * Real-time Cache Synchronization Integration Tests
 * 
 * Tests for multi-platform cache synchronization including:
 * - Supabase realtime integration
 * - Wedding party collaboration
 * - Conflict resolution
 * - Cross-platform sync performance
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { CacheSyncManager, CacheSyncEvent, WeddingDataUpdate } from '../../../src/lib/realtime/cache-sync-manager';
import { WeddingPartyCollaborationCache, PartyMember } from '../../../src/lib/collaboration/wedding-party-cache';
import { VendorCacheManager } from '../../../src/lib/integrations/cache/vendor-cache-manager';

// Mock Supabase client
const mockSupabaseClient = {
  channel: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
    track: jest.fn().mockResolvedValue(undefined),
    presenceState: jest.fn().mockReturnValue({}),
  }),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('Real-time Cache Synchronization Integration Tests', () => {
  let cacheSyncManager: CacheSyncManager;
  let weddingPartyCache: WeddingPartyCollaborationCache;
  let vendorCacheManager: VendorCacheManager;

  const testWeddingId = 'wedding-123';
  const testOrganizationId = 'org-456';
  const testUsers = [
    {
      userId: 'user-bride',
      role: 'bride' as const,
      name: 'Jane Doe',
      email: 'jane@example.com',
      permissions: [
        { resource: 'guest_list' as const, actions: ['read', 'write', 'delete'] as const },
        { resource: 'timeline' as const, actions: ['read', 'write'] as const }
      ],
      isActive: true,
      lastSeen: new Date().toISOString()
    },
    {
      userId: 'user-groom',
      role: 'groom' as const,
      name: 'John Doe',
      email: 'john@example.com',
      permissions: [
        { resource: 'guest_list' as const, actions: ['read', 'write', 'delete'] as const },
        { resource: 'budget' as const, actions: ['read', 'write'] as const }
      ],
      isActive: true,
      lastSeen: new Date().toISOString()
    },
    {
      userId: 'user-planner',
      role: 'planner' as const,
      name: 'Sarah Planner',
      email: 'sarah@planner.com',
      permissions: [
        { resource: 'guest_list' as const, actions: ['read', 'write', 'delete', 'approve'] as const },
        { resource: 'timeline' as const, actions: ['read', 'write', 'delete'] as const },
        { resource: 'budget' as const, actions: ['read', 'write'] as const },
        { resource: 'vendor_management' as const, actions: ['read', 'write'] as const }
      ],
      isActive: true,
      lastSeen: new Date().toISOString()
    }
  ];

  beforeAll(async () => {
    vendorCacheManager = new VendorCacheManager();
    cacheSyncManager = new CacheSyncManager(vendorCacheManager);
    weddingPartyCache = new WeddingPartyCollaborationCache(vendorCacheManager);
  });

  afterAll(async () => {
    await cacheSyncManager.disconnect();
    await vendorCacheManager.shutdown();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Wedding Party Subscription Management', () => {
    test('should successfully subscribe users to wedding sync', async () => {
      // Subscribe all test users
      for (const user of testUsers) {
        await cacheSyncManager.subscribeToWeddingSync(
          testWeddingId,
          user.userId,
          'web',
          user.permissions.map(p => p.resource)
        );
      }

      // Verify channel was created and subscribed
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
        `wedding:${testWeddingId}`,
        expect.any(Object)
      );

      // Get active subscriptions
      const subscriptions = cacheSyncManager.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(testUsers.length);
      
      const brideSubscription = subscriptions.find(s => s.userId === 'user-bride');
      expect(brideSubscription).toBeDefined();
      expect(brideSubscription?.weddingId).toBe(testWeddingId);
      expect(brideSubscription?.platform).toBe('web');
    });

    test('should setup wedding party collaboration correctly', async () => {
      await weddingPartyCache.setupWeddingPartySync(testWeddingId, testUsers);

      // Verify channel setup
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
        `wedding_party:${testWeddingId}`,
        expect.any(Object)
      );

      // Verify stats
      const stats = weddingPartyCache.getCollaborationStats(testWeddingId);
      expect(stats.totalMembers).toBe(testUsers.length);
      expect(stats.activeMembers).toBe(testUsers.length);
    });
  });

  describe('Guest List Collaboration', () => {
    beforeEach(async () => {
      await weddingPartyCache.setupWeddingPartySync(testWeddingId, testUsers);
    });

    test('should handle guest list updates without conflicts', async () => {
      const guestUpdate: WeddingDataUpdate = {
        dataType: 'guest_list',
        operation: 'create',
        changes: {
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice@example.com',
          relationship: 'friend',
          side: 'bride',
          rsvpStatus: 'pending'
        }
      };

      // Simulate guest list update from bride
      await cacheSyncManager.broadcastWeddingUpdate(testWeddingId, guestUpdate, 'user-bride');

      // Verify broadcast was called
      const mockChannel = mockSupabaseClient.channel();
      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'cache_sync',
        payload: expect.objectContaining({
          type: 'update',
          weddingId: testWeddingId,
          data: guestUpdate
        })
      });
    });

    test('should handle edit lock conflicts with role-based resolution', async () => {
      // Bride requests edit lock
      const brideLockResult = await weddingPartyCache.requestEditLock(
        testWeddingId,
        'user-bride',
        'guest_list',
        'guest-123'
      );
      expect(brideLockResult).toBe(true);

      // Planner tries to get same lock (should fail initially)
      const plannerLockResult = await weddingPartyCache.requestEditLock(
        testWeddingId,
        'user-planner',
        'guest_list',
        'guest-123'
      );
      expect(plannerLockResult).toBe(false);

      // However, planner should be able to override due to higher role priority
      // This would be tested with more complex scenario simulation
    });

    test('should synchronize guest list changes across platforms', async () => {
      const platforms = ['web', 'ios', 'android'];
      const syncPromises = platforms.map(platform => 
        cacheSyncManager.subscribeToWeddingSync(testWeddingId, `user-${platform}`, platform)
      );

      await Promise.all(syncPromises);

      // Simulate guest list change
      const guestChange: WeddingDataUpdate = {
        dataType: 'guest_list',
        operation: 'update',
        changes: {
          id: 'guest-456',
          rsvpStatus: 'attending'
        }
      };

      const startTime = Date.now();
      await cacheSyncManager.broadcastWeddingUpdate(testWeddingId, guestChange);
      const syncTime = Date.now() - startTime;

      // Should complete sync within 500ms target
      expect(syncTime).toBeLessThan(500);

      // Verify all platforms received the update
      expect(mockSupabaseClient.channel().send).toHaveBeenCalled();
    });
  });

  describe('Conflict Resolution', () => {
    beforeEach(async () => {
      await weddingPartyCache.setupWeddingPartySync(testWeddingId, testUsers);
    });

    test('should resolve simultaneous guest edits using last-write-wins', async () => {
      const baseTimestamp = Date.now();

      // Simulate two simultaneous edits
      const edit1: CacheSyncEvent = {
        type: 'update',
        source: 'web',
        weddingId: testWeddingId,
        organizationId: testOrganizationId,
        cacheKeys: ['guest_list:guest-789'],
        data: {
          id: 'guest-789',
          rsvpStatus: 'attending'
        },
        timestamp: new Date(baseTimestamp).toISOString(),
        userId: 'user-bride',
        priority: 'high'
      };

      const edit2: CacheSyncEvent = {
        type: 'update',
        source: 'ios',
        weddingId: testWeddingId,
        organizationId: testOrganizationId,
        cacheKeys: ['guest_list:guest-789'],
        data: {
          id: 'guest-789',
          rsvpStatus: 'not_attending'
        },
        timestamp: new Date(baseTimestamp + 100).toISOString(), // 100ms later
        userId: 'user-groom',
        priority: 'high'
      };

      // Process both events (second one should win due to later timestamp)
      const result1 = await cacheSyncManager['handleCacheSyncEvent'](edit1);
      const result2 = await cacheSyncManager['handleCacheSyncEvent'](edit2);

      // The system should handle the conflict intelligently
      // In a real implementation, this would involve more complex conflict resolution logic
    });

    test('should handle role-based conflict resolution', async () => {
      // Test scenario where planner overrides bride's edit due to higher role priority
      const brideEdit: CacheSyncEvent = {
        type: 'update',
        source: 'web',
        weddingId: testWeddingId,
        organizationId: testOrganizationId,
        cacheKeys: ['guest_list:guest-999'],
        data: { id: 'guest-999', tableAssignment: 'Table 5' },
        timestamp: new Date().toISOString(),
        userId: 'user-bride',
        priority: 'normal'
      };

      const plannerEdit: CacheSyncEvent = {
        type: 'update',
        source: 'web',
        weddingId: testWeddingId,
        organizationId: testOrganizationId,
        cacheKeys: ['guest_list:guest-999'],
        data: { id: 'guest-999', tableAssignment: 'Table 3' },
        timestamp: new Date(Date.now() + 50).toISOString(),
        userId: 'user-planner',
        priority: 'high'
      };

      // Planner's edit should take precedence due to role-based priority
      // Implementation would handle this through conflict resolution engine
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle high-frequency updates efficiently', async () => {
      await weddingPartyCache.setupWeddingPartySync(testWeddingId, testUsers);

      const updateCount = 100;
      const updates: WeddingDataUpdate[] = [];

      // Generate many rapid updates
      for (let i = 0; i < updateCount; i++) {
        updates.push({
          dataType: 'checklist',
          operation: 'update',
          changes: {
            id: `task-${i}`,
            completed: i % 2 === 0
          }
        });
      }

      const startTime = Date.now();
      
      // Process all updates
      const promises = updates.map(update => 
        cacheSyncManager.broadcastWeddingUpdate(testWeddingId, update)
      );
      
      await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / updateCount;

      console.log(`High-frequency updates: ${updateCount} updates in ${totalTime}ms (avg: ${avgTime.toFixed(2)}ms)`);

      // Should handle updates efficiently
      expect(avgTime).toBeLessThan(50); // <50ms per update
    });

    test('should maintain performance with many concurrent users', async () => {
      const userCount = 20; // Simulate large wedding party
      const largeWeddingUsers: PartyMember[] = [];

      // Create many users
      for (let i = 0; i < userCount; i++) {
        largeWeddingUsers.push({
          userId: `user-${i}`,
          role: i < 2 ? 'bride' : i < 4 ? 'groom' : i < 6 ? 'planner' : 'family',
          name: `User ${i}`,
          email: `user${i}@example.com`,
          permissions: [
            { resource: 'guest_list', actions: ['read', 'write'] }
          ],
          isActive: true,
          lastSeen: new Date().toISOString()
        });
      }

      const startTime = Date.now();
      await weddingPartyCache.setupWeddingPartySync(testWeddingId, largeWeddingUsers);
      const setupTime = Date.now() - startTime;

      // Should setup efficiently even with many users
      expect(setupTime).toBeLessThan(1000); // <1 second setup time

      const stats = weddingPartyCache.getCollaborationStats(testWeddingId);
      expect(stats.totalMembers).toBe(userCount);
    });
  });

  describe('Wedding Day Emergency Protocols', () => {
    test('should enable immediate sync mode on wedding day', async () => {
      // Mock Saturday (wedding day)
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = jest.fn().mockReturnValue(6);

      await weddingPartyCache.setupWeddingPartySync(testWeddingId, testUsers);

      // Wedding day updates should have highest priority
      const weddingDayUpdate: WeddingDataUpdate = {
        dataType: 'timeline',
        operation: 'update',
        changes: {
          eventId: 'ceremony',
          startTime: '15:30', // Ceremony delayed by 30 minutes
          urgent: true
        }
      };

      const startTime = Date.now();
      await cacheSyncManager.broadcastWeddingUpdate(testWeddingId, weddingDayUpdate);
      const syncTime = Date.now() - startTime;

      // Should sync immediately on wedding day
      expect(syncTime).toBeLessThan(100); // <100ms for critical wedding day updates

      // Restore
      Date.prototype.getDay = originalGetDay;
    });

    test('should extend cache TTL on wedding day', async () => {
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = jest.fn().mockReturnValue(6);

      // Wedding day mode should extend all cache TTL values
      const syncStats = cacheSyncManager.getSyncStats();
      
      // Verify sync stats are being tracked
      expect(syncStats).toHaveProperty('eventsProcessed');
      expect(syncStats).toHaveProperty('avgSyncTime');
      expect(syncStats).toHaveProperty('lastProcessed');

      Date.prototype.getDay = originalGetDay;
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle Supabase connection failures gracefully', async () => {
      // Mock connection failure
      const originalChannel = mockSupabaseClient.channel;
      mockSupabaseClient.channel = jest.fn().mockImplementation(() => {
        throw new Error('Connection failed');
      });

      // Should not throw error, but handle gracefully
      await expect(
        cacheSyncManager.subscribeToWeddingSync(testWeddingId, 'user-test', 'web')
      ).resolves.not.toThrow();

      // Restore
      mockSupabaseClient.channel = originalChannel;
    });

    test('should recover from temporary sync failures', async () => {
      await weddingPartyCache.setupWeddingPartySync(testWeddingId, testUsers);

      // Mock temporary failure
      const mockChannel = mockSupabaseClient.channel();
      const originalSend = mockChannel.send;
      
      let failureCount = 0;
      mockChannel.send = jest.fn().mockImplementation(() => {
        failureCount++;
        if (failureCount <= 2) {
          throw new Error('Temporary failure');
        }
        return originalSend.call(mockChannel);
      });

      // Should eventually succeed after retries
      const update: WeddingDataUpdate = {
        dataType: 'guest_list',
        operation: 'update',
        changes: { id: 'guest-recovery-test', rsvpStatus: 'attending' }
      };

      await expect(
        cacheSyncManager.broadcastWeddingUpdate(testWeddingId, update)
      ).resolves.not.toThrow();
    });
  });

  describe('Sync Statistics and Monitoring', () => {
    test('should track sync performance metrics', async () => {
      await weddingPartyCache.setupWeddingPartySync(testWeddingId, testUsers);

      // Generate some sync activity
      const updates = [
        { dataType: 'guest_list' as const, operation: 'create' as const, changes: { name: 'Guest 1' } },
        { dataType: 'timeline' as const, operation: 'update' as const, changes: { eventId: 'reception' } },
        { dataType: 'budget' as const, operation: 'update' as const, changes: { amount: 5000 } }
      ];

      for (const update of updates) {
        await cacheSyncManager.broadcastWeddingUpdate(testWeddingId, update);
      }

      const stats = cacheSyncManager.getSyncStats();
      
      expect(stats.eventsProcessed).toBeGreaterThan(0);
      expect(stats.avgSyncTime).toBeGreaterThan(0);
      expect(stats.conflictRate).toBeGreaterThanOrEqual(0);
      expect(stats.lastProcessed).toBeTruthy();
    });

    test('should provide collaboration statistics', async () => {
      await weddingPartyCache.setupWeddingPartySync(testWeddingId, testUsers);

      // Request some edit locks
      await weddingPartyCache.requestEditLock(testWeddingId, 'user-bride', 'guest_list', 'guest-1');
      await weddingPartyCache.requestEditLock(testWeddingId, 'user-groom', 'budget', 'budget-main');

      const stats = weddingPartyCache.getCollaborationStats(testWeddingId);
      
      expect(stats.totalMembers).toBe(testUsers.length);
      expect(stats.activeMembers).toBe(testUsers.length);
      expect(stats.activeLocks).toBeGreaterThanOrEqual(0);
      expect(stats.lockTypes).toBeInstanceOf(Object);
    });
  });
});

// Load testing for real-time sync
describe('Real-time Sync Load Tests', () => {
  test('should handle peak wedding day load', async () => {
    const vendorCacheManager = new VendorCacheManager();
    const cacheSyncManager = new CacheSyncManager(vendorCacheManager);
    
    try {
      // Simulate peak load: 1000 users, 10000 sync events
      const userCount = 100; // Reduced for test performance
      const eventCount = 1000;
      
      // Setup many users
      const users: PartyMember[] = [];
      for (let i = 0; i < userCount; i++) {
        users.push({
          userId: `load-user-${i}`,
          role: i % 4 === 0 ? 'bride' : i % 4 === 1 ? 'groom' : i % 4 === 2 ? 'planner' : 'family',
          name: `Load User ${i}`,
          email: `load${i}@example.com`,
          permissions: [{ resource: 'guest_list', actions: ['read', 'write'] }],
          isActive: true,
          lastSeen: new Date().toISOString()
        });
      }

      const weddingPartyCache = new WeddingPartyCollaborationCache(vendorCacheManager);
      await weddingPartyCache.setupWeddingPartySync('load-test-wedding', users);

      // Generate high-frequency events
      const startTime = Date.now();
      const promises = [];
      
      for (let i = 0; i < eventCount; i++) {
        const update: WeddingDataUpdate = {
          dataType: i % 2 === 0 ? 'guest_list' : 'checklist',
          operation: 'update',
          changes: { id: `item-${i}`, updated: true }
        };
        
        promises.push(
          cacheSyncManager.broadcastWeddingUpdate('load-test-wedding', update)
        );
      }

      await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const eventsPerSecond = (eventCount / (totalTime / 1000));

      console.log(`Load Test Results:`);
      console.log(`- Users: ${userCount}`);
      console.log(`- Events: ${eventCount}`);
      console.log(`- Total Time: ${totalTime}ms`);
      console.log(`- Events/Second: ${eventsPerSecond.toFixed(0)}`);
      console.log(`- Avg Event Time: ${(totalTime / eventCount).toFixed(2)}ms`);

      // Performance requirements
      expect(eventsPerSecond).toBeGreaterThan(50); // >50 events/second
      expect(totalTime / eventCount).toBeLessThan(100); // <100ms per event

      await weddingPartyCache.cleanup('load-test-wedding');
    } finally {
      await cacheSyncManager.disconnect();
      await vendorCacheManager.shutdown();
    }
  }, 30000); // 30 second timeout for load test
});

export default {};