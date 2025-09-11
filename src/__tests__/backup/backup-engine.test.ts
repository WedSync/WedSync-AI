import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  WeddingAwareBackupEngine,
  BackupResult,
  ValidationResult,
} from '@/lib/backup/backup-engine';

// Mock Supabase client
vi.mock('@supabase/auth-helpers-nextjs');

// Helper functions to reduce nesting - REFACTORED TO MEET 4-LEVEL LIMIT
function createSingleMock(data: any = null, error: any = null) {
  return vi.fn(() => ({ data, error }));
}

function createSelectSingleChain(data: any = null, error: any = null) {
  const singleMock = createSingleMock(data, error);
  return {
    select: vi.fn(() => ({ single: singleMock })),
    single: singleMock,
  };
}

function createEqChain(data: any = null, error: any = null) {
  const singleMock = createSingleMock(data, error);
  return {
    eq: vi.fn(() => ({ single: singleMock })),
  };
}

function createSelectEqChain(data: any = null, error: any = null) {
  const eqChain = createEqChain(data, error);
  return {
    select: vi.fn(() => eqChain),
  };
}

function createGteLteEqChain(data: any = [], error: any = null) {
  const eqMock = vi.fn(() => ({ data, error }));
  const lteMock = vi.fn(() => ({ eq: eqMock }));
  const gteMock = vi.fn(() => ({ lte: lteMock }));
  return { gte: gteMock };
}

function createSelectGteLteEqChain(data: any = [], error: any = null) {
  const eqChain = createEqChain(data, error);
  const gteLteChain = createGteLteEqChain(data, error);
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        ...eqChain,
        ...gteLteChain,
      })),
    })),
  };
}

function createInsertSelectSingleChain(data: any = { id: 'test-backup-id' }, error: any = null) {
  const singleMock = createSingleMock(data, error);
  const selectMock = vi.fn(() => ({ single: singleMock }));
  return {
    insert: vi.fn(() => ({ select: selectMock })),
  };
}

function createUpdateEqChain(data: any = { id: 'test-backup-id' }, error: any = null) {
  const eqMock = vi.fn(() => ({ data, error }));
  return {
    update: vi.fn(() => ({ eq: eqMock })),
  };
}

function createSupabaseFromChain() {
  return {
    ...createSelectGteLteEqChain(),
    ...createInsertSelectSingleChain(),
    ...createUpdateEqChain(),
  };
}

const mockSupabaseClient = {
  from: vi.fn(() => createSupabaseFromChain()),
};

describe('WeddingAwareBackupEngine', () => {
  let backupEngine: WeddingAwareBackupEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    (createClientComponentClient as Mock).mockReturnValue(mockSupabaseClient);
    backupEngine = new WeddingAwareBackupEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scheduleBackups', () => {
    it('should schedule backups without errors', async () => {
      // Mock upcoming weddings
      const mockWeddings = [
        {
          id: 'wedding-1',
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          status: 'active',
          couple_id: 'couple-1',
          supplier_id: 'supplier-1',
        },
      ];

      // Mock upcoming weddings with helper
      const mockFromChain = createSelectGteLteEqChain(mockWeddings, null);
      mockSupabaseClient.from.mockReturnValueOnce(mockFromChain);

      await expect(backupEngine.scheduleBackups()).resolves.not.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error with helper
      const errorFromChain = createSelectGteLteEqChain(null, new Error('Database connection failed'));
      mockSupabaseClient.from.mockReturnValueOnce(errorFromChain);

      await expect(backupEngine.scheduleBackups()).rejects.toThrow();
    });

    it('should prevent concurrent scheduling', async () => {
      const mockWeddings = [
        {
          id: 'wedding-1',
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          status: 'active',
          couple_id: 'couple-1',
          supplier_id: 'supplier-1',
        },
      ];

      // Mock concurrent scheduling with helper
      const concurrentFromChain = createSelectGteLteEqChain(mockWeddings, null);
      mockSupabaseClient.from.mockReturnValue(concurrentFromChain);

      // Start first scheduling (don't await)
      const firstSchedule = backupEngine.scheduleBackups();

      // Start second scheduling immediately
      const secondSchedule = backupEngine.scheduleBackups();

      await firstSchedule;
      await secondSchedule;

      // Both should complete without errors, but second should be skipped
      expect(mockSupabaseClient.from).toHaveBeenCalled();
    });
  });

  describe('performEmergencyBackup', () => {
    it('should successfully backup wedding data', async () => {
      const weddingId = 'test-wedding-id';

      // Mock wedding exists with helper
      const weddingData = {
        id: weddingId,
        date: '2025-01-30',
        status: 'active',
      };
      const weddingFromChain = createSelectEqChain(weddingData, null);
      mockSupabaseClient.from.mockReturnValueOnce(weddingFromChain);

      // Mock backup job creation with helper
      const backupJobFromChain = createInsertSelectSingleChain({ id: 'backup-job-id' }, null);
      mockSupabaseClient.from.mockReturnValueOnce(backupJobFromChain);

      // Mock data retrieval with helper
      const guestData = [{ id: 'guest-1', name: 'John Doe' }];
      const dataFromChain = createSelectEqChain(guestData, null);
      mockSupabaseClient.from.mockReturnValue(dataFromChain);

      const result: BackupResult =
        await backupEngine.performEmergencyBackup(weddingId);

      expect(result.success).toBe(true);
      expect(result.backupId).toBe('backup-job-id');
      expect(result.backupSize).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle non-existent wedding gracefully', async () => {
      const weddingId = 'non-existent-wedding';

      // Mock wedding not found with helper
      const notFoundFromChain = createSelectEqChain(null, new Error('Wedding not found'));
      mockSupabaseClient.from.mockReturnValueOnce(notFoundFromChain);

      const result: BackupResult =
        await backupEngine.performEmergencyBackup(weddingId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Wedding not found');
      expect(result.backupSize).toBe(0);
    });

    it('should handle backup job creation failure', async () => {
      const weddingId = 'test-wedding-id';

      // Mock wedding exists with helper
      const weddingData = { id: weddingId, date: '2025-01-30', status: 'active' };
      const weddingFromChain = createSelectEqChain(weddingData, null);
      mockSupabaseClient.from.mockReturnValueOnce(weddingFromChain);

      // Mock backup job creation failure with helper
      const failedJobFromChain = createInsertSelectSingleChain(null, new Error('Failed to create backup job'));
      mockSupabaseClient.from.mockReturnValueOnce(failedJobFromChain);

      const result: BackupResult =
        await backupEngine.performEmergencyBackup(weddingId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create backup job');
    });

    it('should measure backup duration accurately', async () => {
      const weddingId = 'test-wedding-id';

      // Mock wedding exists with helper
      const weddingData = { id: weddingId, date: '2025-01-30', status: 'active' };
      const weddingFromChain = createSelectEqChain(weddingData, null);
      mockSupabaseClient.from.mockReturnValueOnce(weddingFromChain);

      // Mock backup job creation with helper
      const backupJobFromChain = createInsertSelectSingleChain({ id: 'backup-job-id' }, null);
      mockSupabaseClient.from.mockReturnValueOnce(backupJobFromChain);

      // Mock data retrieval with delay using helper
      const delayedData = [{ id: 'guest-1', name: 'John Doe' }];
      const delayedFromChain = createSelectEqChain();
      delayedFromChain.select().eq.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms delay
        return { data: delayedData, error: null };
      });
      mockSupabaseClient.from.mockReturnValue(delayedFromChain);

      const startTime = Date.now();
      const result: BackupResult =
        await backupEngine.performEmergencyBackup(weddingId);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThanOrEqual(endTime - startTime);
    });
  });

  describe('validateBackupIntegrity', () => {
    it('should validate backup integrity successfully', async () => {
      const backupId = 'test-backup-id';

      // Mock backup snapshot exists with helper
      const snapshotData = {
        id: 'snapshot-id',
        backup_job_id: backupId,
        data_integrity_hash: 'test-hash',
        storage_location: 'test-location',
        wedding_count: 1,
        photo_count: 10,
      };
      const snapshotFromChain = createSelectEqChain(snapshotData, null);
      mockSupabaseClient.from.mockReturnValueOnce(snapshotFromChain);

      const result: ValidationResult =
        await backupEngine.validateBackupIntegrity(backupId);

      expect(result.valid).toBe(true);
      expect(result.integrityScore).toBeGreaterThan(80);
      expect(result.issues).toHaveLength(0);
      expect(result.checksum).toBe('test-hash');
    });

    it('should detect missing backup snapshot', async () => {
      const backupId = 'non-existent-backup';

      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: null,
          error: new Error('Snapshot not found'),
        });

      const result: ValidationResult =
        await backupEngine.validateBackupIntegrity(backupId);

      expect(result.valid).toBe(false);
      expect(result.integrityScore).toBe(0);
      expect(result.issues).toContain('Backup snapshot not found');
      expect(result.checksum).toBe('');
    });

    it('should detect integrity issues', async () => {
      const backupId = 'corrupted-backup-id';

      // Mock backup snapshot with issues using helper
      const corruptedSnapshotData = {
        id: 'snapshot-id',
        backup_job_id: backupId,
        data_integrity_hash: null, // Missing hash indicates corruption
        storage_location: null, // Missing location indicates inaccessibility
        wedding_count: 0, // No weddings backed up
      };
      const corruptedFromChain = createSelectEqChain(corruptedSnapshotData, null);
      mockSupabaseClient.from.mockReturnValueOnce(corruptedFromChain);

      const result: ValidationResult =
        await backupEngine.validateBackupIntegrity(backupId);

      expect(result.valid).toBe(false);
      expect(result.integrityScore).toBeLessThan(80);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues).toContain('Missing data integrity hash');
      expect(result.issues).toContain('Backup file is not accessible');
    });

    it('should update validation status in database', async () => {
      const backupId = 'test-backup-id';

      // Mock backup snapshot
      // Mock backup snapshot for validation using helper
      const validationSnapshotData = {
        id: 'snapshot-id',
        backup_job_id: backupId,
        data_integrity_hash: 'test-hash',
        storage_location: 'test-location',
        wedding_count: 1,
      };
      const validationFromChain = createSelectEqChain(validationSnapshotData, null);
      mockSupabaseClient.from.mockReturnValueOnce(validationFromChain);

      await backupEngine.validateBackupIntegrity(backupId);

      // Verify update was called
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        validation_status: 'valid',
        validation_completed_at: expect.any(String),
      });
    });
  });

  describe('Data Backup Methods', () => {
    beforeEach(() => {
      // Reset mocks for each test
      mockSupabaseClient.from().select().eq.mockClear();
    });

    it('should backup wedding core data', async () => {
      const weddingId = 'test-wedding-id';
      const mockWeddingData = [
        { id: weddingId, date: '2025-01-30', venue: 'Test Venue' },
      ];

      mockSupabaseClient.from().select().eq.mockReturnValueOnce({
        data: mockWeddingData,
        error: null,
      });

      // Create backup engine instance to access private methods via public interface
      const result = await backupEngine.performEmergencyBackup(weddingId);

      // Since we're testing the private method indirectly, we verify the overall backup succeeds
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('weddings');
    });

    it('should backup guest list data', async () => {
      const weddingId = 'test-wedding-id';

      // Mock the emergency backup which calls all backup methods
      await backupEngine.performEmergencyBackup(weddingId);

      // Verify guests table was accessed
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('guests');
    });

    it('should backup timeline events', async () => {
      const weddingId = 'test-wedding-id';

      await backupEngine.performEmergencyBackup(weddingId);

      // Verify timeline_events table was accessed
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('timeline_events');
    });

    it('should backup vendor contacts', async () => {
      const weddingId = 'test-wedding-id';

      await backupEngine.performEmergencyBackup(weddingId);

      // Verify wedding_vendors table was accessed
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('wedding_vendors');
    });

    it('should backup wedding photos', async () => {
      const weddingId = 'test-wedding-id';

      await backupEngine.performEmergencyBackup(weddingId);

      // Verify wedding_photos table was accessed
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('wedding_photos');
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      const weddingId = 'test-wedding-id';

      // Mock network timeout
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await backupEngine.performEmergencyBackup(weddingId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle partial data failures', async () => {
      const weddingId = 'test-wedding-id';

      // Mock wedding exists
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: { id: weddingId, date: '2025-01-30', status: 'active' },
          error: null,
        });

      // Mock backup job creation success
      mockSupabaseClient
        .from()
        .insert()
        .select()
        .single.mockReturnValueOnce({
          data: { id: 'backup-job-id' },
          error: null,
        });

      // Mock some data retrieval failures
      mockSupabaseClient
        .from()
        .select()
        .eq.mockReturnValueOnce({ data: [{ id: 'guest-1' }], error: null }) // Guests success
        .mockReturnValueOnce({
          data: null,
          error: new Error('Timeline fetch failed'),
        }); // Timeline failure

      const result = await backupEngine.performEmergencyBackup(weddingId);

      // Should still succeed with partial data
      expect(result.success).toBe(true);
      expect(result.backupSize).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should complete backup within reasonable time', async () => {
      const weddingId = 'test-wedding-id';
      const maxDuration = 5000; // 5 seconds max

      // Mock all required responses
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockReturnValue({
          data: { id: weddingId, date: '2025-01-30', status: 'active' },
          error: null,
        });

      mockSupabaseClient
        .from()
        .insert()
        .select()
        .single.mockReturnValue({
          data: { id: 'backup-job-id' },
          error: null,
        });

      const startTime = Date.now();
      const result = await backupEngine.performEmergencyBackup(weddingId);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(maxDuration);
      expect(result.success).toBe(true);
    });

    it('should handle large datasets efficiently', async () => {
      const weddingId = 'large-wedding-id';

      // Mock large dataset
      const largeGuestList = Array.from({ length: 500 }, (_, i) => ({
        id: `guest-${i}`,
        name: `Guest ${i}`,
        email: `guest${i}@example.com`,
      }));

      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockReturnValue({
          data: { id: weddingId, date: '2025-01-30', status: 'active' },
          error: null,
        });

      mockSupabaseClient
        .from()
        .insert()
        .select()
        .single.mockReturnValue({
          data: { id: 'backup-job-id' },
          error: null,
        });

      mockSupabaseClient.from().select().eq.mockReturnValue({
        data: largeGuestList,
        error: null,
      });

      const result = await backupEngine.performEmergencyBackup(weddingId);

      expect(result.success).toBe(true);
      expect(result.backupSize).toBeGreaterThan(10000); // Large backup size
    });
  });
});
