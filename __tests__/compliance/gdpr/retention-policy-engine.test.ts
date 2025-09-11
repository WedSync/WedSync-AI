/**
 * WS-176 GDPR Compliance System - Team D Round 1
 * Unit tests for Retention Policy Engine
 * 
 * @fileoverview Comprehensive test suite for the automated data retention
 * and deletion scheduler with >80% coverage requirement
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { RetentionPolicyEngine } from '../../../src/lib/compliance/gdpr/retention-policy-engine';
import { RetentionPolicy, DeletionJob, PersonalDataType, Jurisdiction } from '../../../src/types/gdpr-compliance';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  }))
}));

// Mock audit logger
vi.mock('../../../src/lib/middleware/audit', () => ({
  auditLogger: {
    log: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('RetentionPolicyEngine', () => {
  let engine: RetentionPolicyEngine;
  let mockSupabase: any;

  beforeEach(() => {
    engine = (RetentionPolicyEngine as any).getInstance();
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      }))
    };

    // Reset singleton instance for testing
    (RetentionPolicyEngine as any).instance = null;
    engine = (RetentionPolicyEngine as any).getInstance();
    (engine as any).supabase = mockSupabase;
  });

  afterEach(async () => {
    await engine.stopScheduler();
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    test('should return same instance when called multiple times', () => {
      const engine1 = (RetentionPolicyEngine as any).getInstance();
      const engine2 = (RetentionPolicyEngine as any).getInstance();
      expect(engine1).toBe(engine2);
    });

    test('should initialize with default policies', () => {
      const activePolicies = engine.getActivePolicies();
      expect(activePolicies.length).toBeGreaterThan(0);
      
      // Check for expected default policies
      const weddingPolicy = activePolicies.find(p => p.id === 'wedding-planning-data');
      expect(weddingPolicy).toBeDefined();
      expect(weddingPolicy?.dataType).toBe('wedding_preferences');
      
      const paymentPolicy = activePolicies.find(p => p.id === 'payment-transaction-history');
      expect(paymentPolicy).toBeDefined();
      expect(paymentPolicy?.dataType).toBe('payment_history');
    });
  });

  describe('Scheduler Lifecycle', () => {
    test('should start scheduler successfully', async () => {
      await expect(engine.startScheduler()).resolves.not.toThrow();
    });

    test('should throw error when starting already running scheduler', async () => {
      await engine.startScheduler();
      await expect(engine.startScheduler()).rejects.toThrow('Scheduler is already running');
    });

    test('should stop scheduler successfully', async () => {
      await engine.startScheduler();
      await expect(engine.stopScheduler()).resolves.not.toThrow();
    });

    test('should not throw when stopping already stopped scheduler', async () => {
      await expect(engine.stopScheduler()).resolves.not.toThrow();
    });
  });

  describe('Policy Management', () => {
    test('should add new retention policy successfully', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: [{ id: 'new-policy-id' }], error: null })
      });

      const policyData = {
        name: 'Test Policy',
        description: 'Testing policy creation',
        dataType: 'contact_info' as PersonalDataType,
        retentionPeriod: {
          duration: 1,
          unit: 'years' as const,
          startTrigger: 'last_activity' as const,
          gracePeriod: 30
        },
        jurisdiction: 'EU' as Jurisdiction,
        legalBasis: 'consent' as const,
        deletionMethod: 'soft_delete' as const,
        exceptions: [],
        isActive: true
      };

      const policyId = await engine.addPolicy(policyData);
      expect(policyId).toBeDefined();
      expect(typeof policyId).toBe('string');
    });

    test('should update existing retention policy', async () => {
      // First add a policy to get a valid ID
      const activePolicies = engine.getActivePolicies();
      const existingPolicy = activePolicies[0];
      
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockResolvedValue({ data: [{ id: existingPolicy.id }], error: null })
      });

      const updates = {
        name: 'Updated Policy Name',
        description: 'Updated description'
      };

      await expect(engine.updatePolicy(existingPolicy.id, updates)).resolves.not.toThrow();
    });

    test('should throw error when updating non-existent policy', async () => {
      const nonExistentId = 'non-existent-policy-id';
      await expect(engine.updatePolicy(nonExistentId, { name: 'Test' }))
        .rejects.toThrow(`Policy not found: ${nonExistentId}`);
    });

    test('should validate retention policy duration limits', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: [{ id: 'test-id' }], error: null })
      });

      const invalidPolicy = {
        name: 'Invalid Policy',
        description: 'Testing validation',
        dataType: 'contact_info' as PersonalDataType,
        retentionPeriod: {
          duration: 15, // More than 10 years
          unit: 'years' as const,
          startTrigger: 'last_activity' as const
        },
        jurisdiction: 'EU' as Jurisdiction,
        legalBasis: 'consent' as const,
        deletionMethod: 'soft_delete' as const,
        exceptions: [],
        isActive: true
      };

      await expect(engine.addPolicy(invalidPolicy))
        .rejects.toThrow('Retention period cannot exceed 10 years');
    });

    test('should validate EU behavioral data retention limits', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: [{ id: 'test-id' }], error: null })
      });

      const invalidEUPolicy = {
        name: 'Invalid EU Behavioral Policy',
        description: 'Testing EU behavioral data limits',
        dataType: 'behavioral' as PersonalDataType,
        retentionPeriod: {
          duration: 30, // More than 26 months for behavioral data in EU
          unit: 'months' as const,
          startTrigger: 'data_collection' as const
        },
        jurisdiction: 'EU' as Jurisdiction,
        legalBasis: 'legitimate_interests' as const,
        deletionMethod: 'anonymization' as const,
        exceptions: [],
        isActive: true
      };

      await expect(engine.addPolicy(invalidEUPolicy))
        .rejects.toThrow('Behavioral data retention cannot exceed 26 months in EU');
    });
  });

  describe('Data Deletion Scheduling', () => {
    test('should schedule data deletion successfully', async () => {
      const activePolicies = engine.getActivePolicies();
      const contactPolicy = activePolicies.find(p => p.dataType === 'contact_info');
      
      if (!contactPolicy) {
        throw new Error('Contact info policy not found in default policies');
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: [{ id: 'deletion-job-id' }], error: null })
      });

      const jobId = await engine.scheduleDataDeletion(
        'user-123',
        'contact_info',
        contactPolicy.id
      );

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
    });

    test('should throw error for non-existent policy', async () => {
      await expect(engine.scheduleDataDeletion(
        'user-123',
        'contact_info',
        'non-existent-policy'
      )).rejects.toThrow('No retention policy found for data type');
    });

    test('should throw error for inactive policy', async () => {
      // Create an inactive policy
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: [{ id: 'inactive-policy-id' }], error: null })
      });

      const inactivePolicyData = {
        name: 'Inactive Policy',
        description: 'Testing inactive policy',
        dataType: 'identification' as PersonalDataType,
        retentionPeriod: {
          duration: 1,
          unit: 'years' as const,
          startTrigger: 'last_activity' as const
        },
        jurisdiction: 'EU' as Jurisdiction,
        legalBasis: 'consent' as const,
        deletionMethod: 'hard_delete' as const,
        exceptions: [],
        isActive: false // Inactive policy
      };

      const policyId = await engine.addPolicy(inactivePolicyData);
      
      await expect(engine.scheduleDataDeletion('user-123', 'identification', policyId))
        .rejects.toThrow('Retention policy is inactive');
    });
  });

  describe('Deletion Execution', () => {
    test('should execute scheduled deletion successfully', async () => {
      const mockJobData = {
        id: 'job-123',
        user_id: 'user-123',
        data_type: 'contact_info',
        scheduled_for: new Date(Date.now() - 1000).toISOString(), // Past due
        status: 'scheduled',
        method: 'soft_delete',
        retention_policy_id: 'policy-123',
        created_at: new Date().toISOString()
      };

      // Mock the job retrieval
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'deletion_jobs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockJobData, error: null }),
            update: vi.fn().mockResolvedValue({ data: [{ id: 'job-123' }], error: null })
          };
        }
        // Mock for actual data deletion
        return {
          update: vi.fn().mockResolvedValue({ data: [{ id: 'deleted-record' }], error: null }),
          delete: vi.fn().mockResolvedValue({ data: [{ id: 'deleted-record' }], error: null }),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis()
        };
      });

      const result = await engine.executeDeletion('job-123');
      expect(result).toBe(true);
    });

    test('should handle non-existent deletion job', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      });

      await expect(engine.executeDeletion('non-existent-job'))
        .rejects.toThrow('Deletion job not found');
    });

    test('should handle job not yet due for execution', async () => {
      const futureJobData = {
        id: 'future-job',
        user_id: 'user-123',
        data_type: 'contact_info',
        scheduled_for: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        status: 'scheduled',
        method: 'soft_delete',
        retention_policy_id: 'policy-123',
        created_at: new Date().toISOString()
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: futureJobData, error: null })
      });

      await expect(engine.executeDeletion('future-job'))
        .rejects.toThrow('Deletion job is not yet due');
    });

    test('should handle already processed job', async () => {
      const completedJobData = {
        id: 'completed-job',
        user_id: 'user-123',
        data_type: 'contact_info',
        scheduled_for: new Date().toISOString(),
        status: 'completed', // Already completed
        method: 'soft_delete',
        retention_policy_id: 'policy-123',
        created_at: new Date().toISOString()
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: completedJobData, error: null })
      });

      await expect(engine.executeDeletion('completed-job'))
        .rejects.toThrow('Deletion job is not scheduled');
    });
  });

  describe('Deletion Methods', () => {
    test('should handle soft deletion method', async () => {
      const softDeleteJobData = {
        id: 'soft-delete-job',
        user_id: 'user-123',
        data_type: 'contact_info',
        scheduled_for: new Date(Date.now() - 1000).toISOString(),
        status: 'scheduled',
        method: 'soft_delete',
        retention_policy_id: 'policy-123',
        created_at: new Date().toISOString()
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'deletion_jobs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: softDeleteJobData, error: null }),
            update: vi.fn().mockResolvedValue({ data: [{ id: 'job-123' }], error: null })
          };
        }
        // Mock soft delete operation
        return {
          update: vi.fn().mockResolvedValue({ 
            data: [{ id: 'record-1' }, { id: 'record-2' }], 
            error: null 
          }),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis()
        };
      });

      const result = await engine.executeDeletion('soft-delete-job');
      expect(result).toBe(true);
    });

    test('should handle hard deletion method', async () => {
      const hardDeleteJobData = {
        id: 'hard-delete-job',
        user_id: 'user-123',
        data_type: 'behavioral',
        scheduled_for: new Date(Date.now() - 1000).toISOString(),
        status: 'scheduled',
        method: 'hard_delete',
        retention_policy_id: 'policy-123',
        created_at: new Date().toISOString()
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'deletion_jobs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: hardDeleteJobData, error: null }),
            update: vi.fn().mockResolvedValue({ data: [{ id: 'job-123' }], error: null })
          };
        }
        // Mock hard delete operation
        return {
          delete: vi.fn().mockResolvedValue({ 
            data: [{ id: 'record-1' }, { id: 'record-2' }, { id: 'record-3' }], 
            error: null 
          }),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis()
        };
      });

      const result = await engine.executeDeletion('hard-delete-job');
      expect(result).toBe(true);
    });

    test('should handle anonymization method', async () => {
      const anonymizationJobData = {
        id: 'anonymization-job',
        user_id: 'user-123',
        data_type: 'wedding_preferences',
        scheduled_for: new Date(Date.now() - 1000).toISOString(),
        status: 'scheduled',
        method: 'anonymization',
        retention_policy_id: 'policy-123',
        created_at: new Date().toISOString()
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'deletion_jobs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: anonymizationJobData, error: null }),
            update: vi.fn().mockResolvedValue({ data: [{ id: 'job-123' }], error: null })
          };
        }
        // Mock anonymization operation
        return {
          update: vi.fn().mockResolvedValue({ 
            data: [{ id: 'record-1' }], 
            error: null 
          }),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis()
        };
      });

      const result = await engine.executeDeletion('anonymization-job');
      expect(result).toBe(true);
    });
  });

  describe('Policy Filtering and Retrieval', () => {
    test('should get active policies for specific jurisdiction', () => {
      const euPolicies = engine.getActivePolicies('EU');
      expect(euPolicies.length).toBeGreaterThan(0);
      
      // All returned policies should be for EU or GLOBAL
      euPolicies.forEach(policy => {
        expect(['EU', 'GLOBAL']).toContain(policy.jurisdiction);
      });
    });

    test('should get active policies for specific data type', () => {
      const contactPolicies = engine.getActivePolicies(undefined, 'contact_info');
      expect(contactPolicies.length).toBeGreaterThan(0);
      
      contactPolicies.forEach(policy => {
        expect(policy.dataType).toBe('contact_info');
      });
    });

    test('should get active policies for both jurisdiction and data type', () => {
      const specificPolicies = engine.getActivePolicies('EU', 'wedding_preferences');
      
      specificPolicies.forEach(policy => {
        expect(['EU', 'GLOBAL']).toContain(policy.jurisdiction);
        expect(policy.dataType).toBe('wedding_preferences');
      });
    });

    test('should return empty array for non-matching filters', () => {
      const nonExistentPolicies = engine.getActivePolicies('SINGAPORE', 'health');
      expect(nonExistentPolicies).toHaveLength(0);
    });
  });

  describe('Scheduled Deletions Management', () => {
    test('should get scheduled deletions for specific user', async () => {
      const mockDeletions = [
        {
          id: 'job-1',
          user_id: 'user-123',
          data_type: 'contact_info',
          scheduled_for: new Date().toISOString(),
          status: 'scheduled',
          method: 'soft_delete',
          retention_policy_id: 'policy-1',
          verification: {},
          created_at: new Date().toISOString()
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockDeletions, error: null })
      });

      const deletions = await engine.getScheduledDeletions('user-123');
      expect(deletions).toHaveLength(1);
      expect(deletions[0].userId).toBe('user-123');
    });

    test('should get scheduled deletions by status', async () => {
      const mockDeletions = [
        {
          id: 'job-1',
          user_id: 'user-123',
          data_type: 'contact_info',
          scheduled_for: new Date().toISOString(),
          status: 'scheduled',
          method: 'soft_delete',
          retention_policy_id: 'policy-1',
          verification: {},
          created_at: new Date().toISOString()
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockDeletions, error: null })
      });

      const scheduledDeletions = await engine.getScheduledDeletions(undefined, 'scheduled');
      expect(scheduledDeletions).toHaveLength(1);
      expect(scheduledDeletions[0].status).toBe('scheduled');
    });

    test('should get deletions due by specific date', async () => {
      const dueDate = new Date();
      const mockDeletions = [
        {
          id: 'overdue-job',
          user_id: 'user-456',
          data_type: 'behavioral',
          scheduled_for: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          status: 'scheduled',
          method: 'anonymization',
          retention_policy_id: 'policy-2',
          verification: {},
          created_at: new Date().toISOString()
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockDeletions, error: null })
      });

      const overdueDeletions = await engine.getScheduledDeletions(undefined, undefined, dueDate);
      expect(overdueDeletions).toHaveLength(1);
      expect(new Date(overdueDeletions[0].scheduledFor)).toBeLessThanOrEqual(dueDate);
    });

    test('should handle database error when fetching scheduled deletions', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database connection failed' } 
        })
      });

      await expect(engine.getScheduledDeletions())
        .rejects.toThrow('Failed to fetch scheduled deletions');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Connection timeout' } 
        })
      });

      const policyData = {
        name: 'Test Policy',
        description: 'Testing error handling',
        dataType: 'contact_info' as PersonalDataType,
        retentionPeriod: {
          duration: 1,
          unit: 'years' as const,
          startTrigger: 'last_activity' as const
        },
        jurisdiction: 'EU' as Jurisdiction,
        legalBasis: 'consent' as const,
        deletionMethod: 'soft_delete' as const,
        exceptions: [],
        isActive: true
      };

      await expect(engine.addPolicy(policyData))
        .rejects.toThrow('Failed to create retention policy');
    });

    test('should validate policy before adding', async () => {
      const invalidPolicy = {
        name: 'Invalid Policy',
        description: 'Testing validation',
        dataType: 'contact_info' as PersonalDataType,
        retentionPeriod: {
          duration: -5, // Negative duration
          unit: 'years' as const,
          startTrigger: 'last_activity' as const
        },
        jurisdiction: 'EU' as Jurisdiction,
        legalBasis: 'consent' as const,
        deletionMethod: 'soft_delete' as const,
        exceptions: [],
        isActive: true
      };

      await expect(engine.addPolicy(invalidPolicy))
        .rejects.toThrow('Retention period duration must be positive');
    });

    test('should handle deletion execution failures gracefully', async () => {
      const failingJobData = {
        id: 'failing-job',
        user_id: 'user-123',
        data_type: 'contact_info',
        scheduled_for: new Date(Date.now() - 1000).toISOString(),
        status: 'scheduled',
        method: 'hard_delete',
        retention_policy_id: 'policy-123',
        created_at: new Date().toISOString()
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'deletion_jobs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: failingJobData, error: null }),
            update: vi.fn().mockResolvedValue({ data: [{ id: 'job-123' }], error: null })
          };
        }
        // Simulate deletion failure
        return {
          delete: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Deletion constraint violation' }
          }),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis()
        };
      });

      const result = await engine.executeDeletion('failing-job');
      expect(result).toBe(false); // Should return false for failed deletion
    });
  });
});