/**
 * @fileoverview Test suite for Directory Sync Service
 * Tests automated directory synchronization, batch processing, and conflict resolution
 * @version 1.0.0
 * @author WedSync Development Team
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DirectorySyncService } from '../DirectorySyncService';
import type {
  DirectorySyncConfiguration,
  SyncResult,
  SyncConflict,
  SyncScheduleConfig,
  ProviderSyncStatus,
} from '../DirectorySyncService';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@supabase/supabase-js');
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: null, error: null })),
        order: vi.fn(() => ({ data: [], error: null })),
      })),
      in: vi.fn(() => ({ data: [], error: null })),
    })),
    insert: vi.fn(() => ({ data: null, error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ data: null, error: null })),
    })),
    upsert: vi.fn(() => ({ data: null, error: null })),
  })),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })),
};

vi.mocked(createClient).mockReturnValue(mockSupabase as any);

// Mock node-cron for scheduling
vi.mock('node-cron', () => ({
  schedule: vi.fn(),
  destroy: vi.fn(),
}));

describe('DirectorySyncService', () => {
  let syncService: DirectorySyncService;
  let mockConfig: DirectorySyncConfiguration;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      providers: [
        {
          id: 'active-directory',
          name: 'Active Directory',
          type: 'ldap',
          enabled: true,
          priority: 1,
          syncInterval: '0 */4 * * *', // Every 4 hours
          batchSize: 100,
          fieldsMapping: {
            sAMAccountName: 'username',
            mail: 'email',
            displayName: 'name',
            department: 'department',
            memberOf: 'groups',
          },
        },
        {
          id: 'okta',
          name: 'Okta',
          type: 'oauth2',
          enabled: true,
          priority: 2,
          syncInterval: '0 */2 * * *', // Every 2 hours
          batchSize: 200,
          fieldsMapping: {
            login: 'username',
            email: 'email',
            firstName: 'first_name',
            lastName: 'last_name',
            groups: 'groups',
          },
        },
      ],
      conflictResolution: {
        strategy: 'priority_based',
        preferredProvider: 'active-directory',
        customRules: [
          {
            field: 'email',
            rule: 'always_update',
            condition: 'email_verified',
          },
        ],
      },
      notifications: {
        enabled: true,
        channels: ['email', 'slack'],
        onSuccess: false,
        onFailure: true,
        onConflict: true,
      },
    };

    syncService = new DirectorySyncService('fake-url', 'fake-key', mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider Registration', () => {
    it('should register directory provider successfully', async () => {
      const mockProvider = {
        initialize: vi.fn().mockResolvedValue({ success: true }),
        getUsers: vi.fn().mockResolvedValue([]),
        healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
      };

      const result = await syncService.registerProvider(
        'test-provider',
        mockProvider as any,
      );

      expect(result.success).toBe(true);
      expect(result.providerId).toBe('test-provider');
      expect(mockProvider.initialize).toHaveBeenCalled();
    });

    it('should handle provider registration failures', async () => {
      const failingProvider = {
        initialize: vi
          .fn()
          .mockRejectedValue(new Error('Provider initialization failed')),
        healthCheck: vi.fn().mockResolvedValue({ healthy: false }),
      };

      const result = await syncService.registerProvider(
        'failing-provider',
        failingProvider as any,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Provider initialization failed');
    });
  });

  describe('Automated Synchronization', () => {
    it('should perform full directory sync successfully', async () => {
      const mockUsers = [
        {
          id: 'user1',
          username: 'photographer1',
          email: 'photographer1@example.com',
          name: 'John Photographer',
          department: 'Photography',
          groups: ['Wedding Vendors', 'Photographers'],
        },
        {
          id: 'user2',
          username: 'venue_manager',
          email: 'manager@grandvenue.com',
          name: 'Sarah Manager',
          department: 'Venues',
          groups: ['Wedding Vendors', 'Venue Managers'],
        },
      ];

      const mockProvider = {
        getUsers: vi.fn().mockResolvedValue(mockUsers),
        getLastSyncTimestamp: vi.fn().mockResolvedValue(new Date('2024-01-01')),
        healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
      };

      syncService.registerProvider('test-provider', mockProvider as any);

      mockSupabase.from().upsert.mockReturnValueOnce({
        data: mockUsers,
        error: null,
      });

      const result = await syncService.performFullSync('test-provider');

      expect(result.success).toBe(true);
      expect(result.totalUsers).toBe(2);
      expect(result.syncedUsers).toBe(2);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should perform incremental sync correctly', async () => {
      const lastSyncTime = new Date('2024-01-01T12:00:00Z');
      const mockChangedUsers = [
        {
          id: 'user1',
          username: 'photographer1',
          email: 'updated@example.com', // Email changed
          name: 'John Photographer',
          lastModified: new Date('2024-01-01T14:00:00Z'),
        },
      ];

      const mockProvider = {
        getChangedUsers: vi.fn().mockResolvedValue(mockChangedUsers),
        getLastSyncTimestamp: vi.fn().mockResolvedValue(lastSyncTime),
        healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
      };

      syncService.registerProvider('test-provider', mockProvider as any);

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: { last_sync: lastSyncTime.toISOString() },
          error: null,
        });

      const result = await syncService.performIncrementalSync('test-provider');

      expect(result.success).toBe(true);
      expect(result.totalUsers).toBe(1);
      expect(result.type).toBe('incremental');
      expect(mockProvider.getChangedUsers).toHaveBeenCalledWith(lastSyncTime);
    });

    it('should handle batch processing correctly', async () => {
      const largeUserSet = Array.from({ length: 250 }, (_, i) => ({
        id: `user${i}`,
        username: `user${i}`,
        email: `user${i}@example.com`,
        name: `User ${i}`,
      }));

      const mockProvider = {
        getUsers: vi.fn().mockResolvedValue(largeUserSet),
        healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
      };

      syncService.registerProvider('batch-provider', mockProvider as any);

      // Mock successful batch upserts
      mockSupabase.from().upsert.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await syncService.performFullSync('batch-provider', {
        batchSize: 100,
      });

      expect(result.success).toBe(true);
      expect(result.totalUsers).toBe(250);
      expect(result.batchesProcessed).toBe(3); // 250 users / 100 batch size = 3 batches
      expect(mockSupabase.from().upsert).toHaveBeenCalledTimes(3);
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect and resolve conflicts using priority strategy', async () => {
      const conflictingUsers = [
        {
          id: 'user1',
          username: 'photographer1',
          email: 'old@example.com',
          name: 'John Photographer',
          provider: 'okta',
          priority: 2,
          lastModified: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'user1',
          username: 'photographer1',
          email: 'new@example.com',
          name: 'John Photographer',
          provider: 'active-directory',
          priority: 1,
          lastModified: new Date('2024-01-01T11:00:00Z'),
        },
      ];

      // Mock existing user in database
      mockSupabase.from().select().eq().single.mockReturnValueOnce({
        data: conflictingUsers[0],
        error: null,
      });

      const conflicts = await syncService.detectConflicts(
        conflictingUsers[1],
        'active-directory',
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].field).toBe('email');
      expect(conflicts[0].oldValue).toBe('old@example.com');
      expect(conflicts[0].newValue).toBe('new@example.com');

      const resolution = await syncService.resolveConflicts(conflicts[0]);

      expect(resolution.strategy).toBe('priority_based');
      expect(resolution.selectedValue).toBe('new@example.com'); // Higher priority provider
    });

    it('should apply custom resolution rules', async () => {
      const emailConflict: SyncConflict = {
        userId: 'user1',
        field: 'email',
        oldValue: 'old@example.com',
        newValue: 'verified@example.com',
        oldProvider: 'okta',
        newProvider: 'active-directory',
        timestamp: new Date(),
        metadata: {
          email_verified: true,
        },
      };

      const resolution = await syncService.resolveConflicts(emailConflict);

      expect(resolution.strategy).toBe('custom_rule');
      expect(resolution.selectedValue).toBe('verified@example.com');
      expect(resolution.reason).toContain('email_verified');
    });

    it('should handle merge conflicts in group membership', async () => {
      const groupConflict: SyncConflict = {
        userId: 'user1',
        field: 'groups',
        oldValue: ['Wedding Vendors', 'Photographers'],
        newValue: ['Wedding Vendors', 'Event Planners'],
        oldProvider: 'okta',
        newProvider: 'active-directory',
        timestamp: new Date(),
      };

      const resolution = await syncService.resolveConflicts(groupConflict);

      expect(resolution.strategy).toBe('merge');
      expect(resolution.selectedValue).toEqual(
        expect.arrayContaining([
          'Wedding Vendors',
          'Photographers',
          'Event Planners',
        ]),
      );
    });
  });

  describe('Sync Scheduling', () => {
    it('should schedule automated syncs correctly', () => {
      const scheduleConfig: SyncScheduleConfig = {
        enabled: true,
        providers: [
          {
            providerId: 'active-directory',
            schedule: '0 */4 * * *',
            syncType: 'incremental',
          },
          {
            providerId: 'okta',
            schedule: '0 0 * * 0',
            syncType: 'full',
          },
        ],
      };

      const mockCron = require('node-cron');
      mockCron.schedule.mockReturnValue({ destroy: vi.fn() });

      syncService.scheduleAutomatedSyncs(scheduleConfig);

      expect(mockCron.schedule).toHaveBeenCalledTimes(2);
      expect(mockCron.schedule).toHaveBeenCalledWith(
        '0 */4 * * *',
        expect.any(Function),
      );
      expect(mockCron.schedule).toHaveBeenCalledWith(
        '0 0 * * 0',
        expect.any(Function),
      );
    });

    it('should handle schedule errors gracefully', () => {
      const invalidScheduleConfig: SyncScheduleConfig = {
        enabled: true,
        providers: [
          {
            providerId: 'invalid-provider',
            schedule: 'invalid-cron-expression',
            syncType: 'full',
          },
        ],
      };

      const mockCron = require('node-cron');
      mockCron.schedule.mockImplementation(() => {
        throw new Error('Invalid cron expression');
      });

      expect(() => {
        syncService.scheduleAutomatedSyncs(invalidScheduleConfig);
      }).not.toThrow();
    });
  });

  describe('Monitoring and Health Checks', () => {
    it('should monitor sync health across providers', async () => {
      const mockProviders = {
        'active-directory': {
          healthCheck: vi.fn().mockResolvedValue({
            healthy: true,
            responseTime: 150,
            lastSync: new Date('2024-01-01T12:00:00Z'),
          }),
        },
        okta: {
          healthCheck: vi.fn().mockResolvedValue({
            healthy: false,
            responseTime: 5000,
            error: 'Connection timeout',
            lastSync: new Date('2024-01-01T08:00:00Z'),
          }),
        },
      };

      Object.entries(mockProviders).forEach(([id, provider]) => {
        syncService.registerProvider(id, provider as any);
      });

      const healthStatus = await syncService.getProvidersHealth();

      expect(healthStatus).toHaveLength(2);
      expect(healthStatus[0].providerId).toBe('active-directory');
      expect(healthStatus[0].healthy).toBe(true);
      expect(healthStatus[1].providerId).toBe('okta');
      expect(healthStatus[1].healthy).toBe(false);
    });

    it('should track sync statistics', async () => {
      // Mock sync history
      mockSupabase
        .from()
        .select()
        .order.mockReturnValueOnce({
          data: [
            {
              provider_id: 'active-directory',
              sync_type: 'full',
              total_users: 150,
              synced_users: 150,
              conflicts: 0,
              duration_ms: 30000,
              created_at: '2024-01-01T10:00:00Z',
            },
            {
              provider_id: 'okta',
              sync_type: 'incremental',
              total_users: 25,
              synced_users: 20,
              conflicts: 5,
              duration_ms: 5000,
              created_at: '2024-01-01T11:00:00Z',
            },
          ],
          error: null,
        });

      const stats = await syncService.getSyncStatistics('active-directory', {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-02'),
      });

      expect(stats.totalSyncs).toBe(1);
      expect(stats.averageDuration).toBe(30000);
      expect(stats.successRate).toBe(100);
      expect(stats.totalConflicts).toBe(0);
    });
  });

  describe('Wedding Industry Integration', () => {
    it('should sync wedding vendor directory', async () => {
      const weddingVendors = [
        {
          id: 'vendor1',
          username: 'elegant_photography',
          email: 'contact@elegantphoto.com',
          name: 'Elegant Photography',
          department: 'Photography',
          businessType: 'photographer',
          specialties: ['wedding', 'portrait', 'engagement'],
          location: 'San Francisco, CA',
          verificationStatus: 'verified',
        },
        {
          id: 'vendor2',
          username: 'grand_ballroom',
          email: 'events@grandballroom.com',
          name: 'Grand Ballroom Events',
          department: 'Venues',
          businessType: 'venue',
          capacity: 300,
          amenities: ['parking', 'catering', 'bridal_suite'],
          location: 'New York, NY',
        },
      ];

      const mockProvider = {
        getUsers: vi.fn().mockResolvedValue(weddingVendors),
        healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
      };

      syncService.registerProvider(
        'wedding-vendor-directory',
        mockProvider as any,
      );

      const result = await syncService.syncWeddingVendors(
        'wedding-vendor-directory',
      );

      expect(result.success).toBe(true);
      expect(result.vendorsByType?.photographer).toBe(1);
      expect(result.vendorsByType?.venue).toBe(1);
      expect(result.verifiedVendors).toBe(1);
    });

    it('should handle wedding team member synchronization', async () => {
      const teamMembers = [
        {
          id: 'planner1',
          username: 'sarah_planner',
          email: 'sarah@weddingteam.com',
          name: 'Sarah Wedding Planner',
          role: 'lead_planner',
          permissions: [
            'timeline_management',
            'vendor_coordination',
            'client_communication',
          ],
          currentWeddings: 12,
          specializations: ['luxury_weddings', 'destination_weddings'],
        },
        {
          id: 'coordinator1',
          username: 'mike_coordinator',
          email: 'mike@weddingteam.com',
          name: 'Mike Event Coordinator',
          role: 'day_coordinator',
          permissions: ['vendor_coordination', 'timeline_execution'],
          currentWeddings: 8,
          specializations: ['day_of_coordination', 'vendor_management'],
        },
      ];

      const result = await syncService.syncWeddingTeamMembers(teamMembers);

      expect(result.success).toBe(true);
      expect(result.membersByRole?.lead_planner).toBe(1);
      expect(result.membersByRole?.day_coordinator).toBe(1);
      expect(result.totalActiveWeddings).toBe(20); // 12 + 8
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle provider connection failures', async () => {
      const failingProvider = {
        getUsers: vi.fn().mockRejectedValue(new Error('Connection refused')),
        healthCheck: vi.fn().mockResolvedValue({ healthy: false }),
      };

      syncService.registerProvider('failing-provider', failingProvider as any);

      const result = await syncService.performFullSync('failing-provider');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
      expect(result.retryRecommended).toBe(true);
    });

    it('should implement exponential backoff for retries', async () => {
      let callCount = 0;
      const intermittentProvider = {
        getUsers: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount < 3) {
            throw new Error('Temporary failure');
          }
          return [{ id: 'user1', username: 'test' }];
        }),
        healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
      };

      syncService.registerProvider(
        'intermittent-provider',
        intermittentProvider as any,
      );

      const result = await syncService.performFullSyncWithRetry(
        'intermittent-provider',
        {
          maxRetries: 3,
          initialDelay: 100,
          backoffFactor: 2,
        },
      );

      expect(result.success).toBe(true);
      expect(result.retryAttempts).toBe(2);
      expect(callCount).toBe(3);
    });

    it('should maintain sync integrity during partial failures', async () => {
      const partiallyFailingProvider = {
        getUsers: vi.fn().mockImplementation((batchOffset, batchSize) => {
          if (batchOffset === 100) {
            throw new Error('Batch 2 failed');
          }
          return Array.from({ length: batchSize }, (_, i) => ({
            id: `user${batchOffset + i}`,
            username: `user${batchOffset + i}`,
            email: `user${batchOffset + i}@example.com`,
          }));
        }),
        healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
      };

      syncService.registerProvider(
        'partial-provider',
        partiallyFailingProvider as any,
      );

      const result = await syncService.performFullSync('partial-provider', {
        batchSize: 100,
        continueOnBatchFailure: true,
      });

      expect(result.success).toBe(false); // Overall failure due to batch failure
      expect(result.partialSuccess).toBe(true);
      expect(result.syncedUsers).toBeGreaterThan(0); // Some users were synced
      expect(result.failedBatches).toBe(1);
    });
  });

  describe('Notifications', () => {
    it('should send sync completion notifications', async () => {
      const mockNotificationService = {
        sendNotification: vi.fn().mockResolvedValue({ success: true }),
      };

      syncService.setNotificationService(mockNotificationService);

      const syncResult: SyncResult = {
        success: true,
        providerId: 'test-provider',
        syncType: 'full',
        totalUsers: 100,
        syncedUsers: 95,
        conflicts: 5,
        duration: 30000,
        timestamp: new Date(),
      };

      await syncService.sendSyncNotification(syncResult);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
        type: 'sync_completion',
        severity: 'info',
        title: 'Directory Sync Completed',
        message: expect.stringContaining('95 users synced successfully'),
        metadata: expect.objectContaining({
          provider: 'test-provider',
          conflicts: 5,
        }),
      });
    });

    it('should send conflict resolution notifications', async () => {
      const mockNotificationService = {
        sendNotification: vi.fn().mockResolvedValue({ success: true }),
      };

      syncService.setNotificationService(mockNotificationService);

      const conflicts: SyncConflict[] = [
        {
          userId: 'user1',
          field: 'email',
          oldValue: 'old@example.com',
          newValue: 'new@example.com',
          oldProvider: 'okta',
          newProvider: 'active-directory',
          timestamp: new Date(),
        },
      ];

      await syncService.sendConflictNotifications(conflicts);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
        type: 'sync_conflict',
        severity: 'warning',
        title: 'Directory Sync Conflicts Detected',
        message: expect.stringContaining('1 conflict(s) detected'),
        metadata: expect.objectContaining({
          conflicts: conflicts,
        }),
      });
    });
  });
});
