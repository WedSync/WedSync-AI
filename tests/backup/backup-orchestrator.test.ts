import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BackupOrchestrator } from '@/lib/backup/backup-orchestrator';
import { MockStorageProvider } from '../mocks/storage-providers';
import { createMockWeddingData } from '../fixtures/wedding-data';

/**
 * WS-191 BACKUP ORCHESTRATOR UNIT TESTS - TEAM E ROUND 1
 * 
 * Comprehensive unit testing for core backup engine functionality
 * Tests integration with Teams A, B, C, D backup implementations
 * Validates 3-2-1 backup rule enforcement for wedding data protection
 */

describe('BackupOrchestrator - Core Wedding Data Backup Engine', () => {
  let backupOrchestrator: BackupOrchestrator;
  let mockProviders: {
    supabase: MockStorageProvider;
    s3: MockStorageProvider;
    gcs: MockStorageProvider;
  };
  let mockWeddingData: any;

  beforeEach(async () => {
    // Initialize mock storage providers
    mockProviders = {
      supabase: new MockStorageProvider('supabase'),
      s3: new MockStorageProvider('s3'),
      gcs: new MockStorageProvider('gcs')
    };

    // Initialize backup orchestrator with mock providers
    backupOrchestrator = new BackupOrchestrator({
      primaryProvider: mockProviders.supabase,
      secondaryProviders: [mockProviders.s3, mockProviders.gcs],
      retentionPolicy: {
        daily: 30,
        weekly: 12,
        monthly: 12
      }
    });

    // Create comprehensive wedding test data
    mockWeddingData = createMockWeddingData({
      couples: 5,
      suppliers: 15,
      weddingEvents: 3,
      guestLists: 150,
      budgetItems: 25,
      taskItems: 40
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('3-2-1 Backup Rule Enforcement', () => {
    it('should enforce 3-2-1 rule: 3 copies, 2 different media, 1 offsite', async () => {
      const backupRequest = {
        dataType: 'wedding-complete',
        data: mockWeddingData,
        priority: 'high',
        reason: 'scheduled-backup'
      };

      const result = await backupOrchestrator.performBackup(backupRequest);

      expect(result.success).toBe(true);
      expect(result.copies).toBe(3); // 3 total copies
      expect(result.mediaTypes).toHaveLength(2); // 2 different storage types
      expect(result.offsiteBackup).toBe(true); // 1 offsite backup
      expect(result.replicationStatus).toEqual([
        { provider: 'supabase', status: 'success', location: 'primary' },
        { provider: 's3', status: 'success', location: 'offsite' },
        { provider: 'gcs', status: 'success', location: 'offsite' }
      ]);
    });

    it('should maintain 3-2-1 compliance even with single provider failure', async () => {
      // Simulate S3 provider failure
      mockProviders.s3.simulateFailure('CONNECTION_ERROR');

      const result = await backupOrchestrator.performBackup({
        dataType: 'wedding-complete',
        data: mockWeddingData,
        priority: 'high'
      });

      expect(result.success).toBe(true);
      expect(result.copies).toBe(3); // Should still achieve 3 copies
      expect(result.failoverUsed).toBe(true);
      expect(result.replicationStatus.filter(r => r.status === 'success')).toHaveLength(3);
    });
  });

  describe('Wedding Data Priority Ordering', () => {
    it('should prioritize critical wedding data during backup operations', async () => {
      const criticalData = {
        weddingEvents: mockWeddingData.weddingEvents,
        supplierContracts: mockWeddingData.supplierContracts,
        guestRSVPs: mockWeddingData.guestRSVPs
      };

      const result = await backupOrchestrator.performPriorityBackup(criticalData);

      expect(result.processingOrder).toEqual([
        'weddingEvents',
        'supplierContracts', 
        'guestRSVPs'
      ]);
      expect(result.backupCompleted).toBe(true);
      expect(result.criticalDataIntegrity).toBe(true);
    });

    it('should handle concurrent wedding season backup load', async () => {
      // Simulate peak wedding season with multiple concurrent backups
      const concurrentBackups = Array.from({ length: 10 }, (_, i) => ({
        dataType: `wedding-${i}`,
        data: createMockWeddingData({ couples: 1 }),
        priority: i < 3 ? 'high' : 'normal'
      }));

      const results = await Promise.all(
        concurrentBackups.map(backup => backupOrchestrator.performBackup(backup))
      );

      // All backups should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // High priority backups should complete first
      const highPriorityResults = results.slice(0, 3);
      const normalPriorityResults = results.slice(3);
      
      expect(
        Math.max(...highPriorityResults.map(r => r.completionTime))
      ).toBeLessThan(
        Math.min(...normalPriorityResults.map(r => r.completionTime))
      );
    });
  });

  describe('Backup Integrity Verification', () => {
    it('should verify backup integrity using checksums', async () => {
      const result = await backupOrchestrator.performBackup({
        dataType: 'wedding-complete',
        data: mockWeddingData,
        verifyIntegrity: true
      });

      expect(result.success).toBe(true);
      expect(result.integrityVerification).toBeDefined();
      expect(result.integrityVerification.checksumMatches).toBe(true);
      expect(result.integrityVerification.dataCorruption).toBe(false);
      expect(result.integrityVerification.verificationTime).toBeLessThan(5000); // <5s
    });

    it('should detect and handle data corruption during backup', async () => {
      // Simulate data corruption in one provider
      mockProviders.s3.simulateDataCorruption();

      const result = await backupOrchestrator.performBackup({
        dataType: 'wedding-complete',
        data: mockWeddingData,
        verifyIntegrity: true
      });

      expect(result.corruptionDetected).toBe(true);
      expect(result.corruptedProviders).toContain('s3');
      expect(result.replicationStatus.filter(r => r.status === 'success')).toHaveLength(2);
      expect(result.success).toBe(true); // Should still succeed with 2 good copies
    });
  });

  describe('Provider Failure Handling', () => {
    it('should handle single provider failure gracefully', async () => {
      mockProviders.supabase.simulateFailure('SERVICE_UNAVAILABLE');

      const result = await backupOrchestrator.performBackup({
        dataType: 'wedding-complete',
        data: mockWeddingData
      });

      expect(result.success).toBe(true);
      expect(result.primaryProviderFailure).toBe(true);
      expect(result.failoverProvider).toBe('s3');
      expect(result.replicationStatus).toHaveLength(3);
    });

    it('should handle cascading provider failures', async () => {
      // Simulate multiple provider failures
      mockProviders.supabase.simulateFailure('SERVICE_UNAVAILABLE');
      mockProviders.s3.simulateFailure('AUTHENTICATION_ERROR');

      const result = await backupOrchestrator.performBackup({
        dataType: 'wedding-complete',
        data: mockWeddingData
      });

      // Should still succeed with at least one provider (GCS)
      expect(result.success).toBe(true);
      expect(result.cascadingFailure).toBe(true);
      expect(result.workingProviders).toHaveLength(1);
      expect(result.workingProviders[0]).toBe('gcs');
    });

    it('should fail gracefully when all providers are unavailable', async () => {
      // Simulate all providers failing
      Object.values(mockProviders).forEach(provider => 
        provider.simulateFailure('COMPLETE_OUTAGE')
      );

      const result = await backupOrchestrator.performBackup({
        dataType: 'wedding-complete',
        data: mockWeddingData
      });

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('ALL_PROVIDERS_UNAVAILABLE');
      expect(result.retryScheduled).toBe(true);
      expect(result.nextRetryTime).toBeDefined();
    });
  });

  describe('Wedding-Specific Backup Scenarios', () => {
    it('should handle pre-wedding week critical backup', async () => {
      const preWeddingData = {
        ...mockWeddingData,
        timeline: mockWeddingData.timeline,
        supplierSchedules: mockWeddingData.supplierSchedules,
        finalGuestList: mockWeddingData.finalGuestList,
        seatingArrangements: mockWeddingData.seatingArrangements
      };

      const result = await backupOrchestrator.performCriticalBackup(preWeddingData, {
        weddingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        backupReason: 'pre-wedding-critical'
      });

      expect(result.success).toBe(true);
      expect(result.priority).toBe('critical');
      expect(result.replicationTime).toBeLessThan(30000); // <30s for critical backups
      expect(result.verificationPassed).toBe(true);
    });

    it('should handle multi-couple data isolation during backup', async () => {
      const multiCoupleData = {
        couple1: createMockWeddingData({ couples: 1 }),
        couple2: createMockWeddingData({ couples: 1 }),
        couple3: createMockWeddingData({ couples: 1 })
      };

      const result = await backupOrchestrator.performIsolatedBackup(multiCoupleData);

      expect(result.success).toBe(true);
      expect(result.dataIsolation).toBe(true);
      expect(result.crossCoupleLeakage).toBe(false);
      expect(result.encryptionPerCouple).toBe(true);
      expect(result.backupsByCouple).toHaveLength(3);
    });

    it('should handle supplier data backup with access controls', async () => {
      const supplierData = mockWeddingData.supplierData;
      
      const result = await backupOrchestrator.performSupplierBackup(supplierData, {
        accessLevel: 'supplier-restricted',
        dataClassification: 'confidential'
      });

      expect(result.success).toBe(true);
      expect(result.accessControlsApplied).toBe(true);
      expect(result.encryptionLevel).toBe('AES-256');
      expect(result.supplierDataSeparation).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should complete backup within performance targets', async () => {
      const startTime = Date.now();
      
      const result = await backupOrchestrator.performBackup({
        dataType: 'wedding-complete',
        data: mockWeddingData
      });
      
      const completionTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(completionTime).toBeLessThan(60000); // <60s for standard backup
      expect(result.throughputMBps).toBeGreaterThan(10); // >10MB/s throughput
    });

    it('should handle large wedding dataset backup efficiently', async () => {
      const largeWeddingData = createMockWeddingData({
        couples: 1,
        suppliers: 50,
        guestLists: 500,
        photos: 1000,
        documents: 200
      });

      const result = await backupOrchestrator.performBackup({
        dataType: 'wedding-large',
        data: largeWeddingData
      });

      expect(result.success).toBe(true);
      expect(result.compressionRatio).toBeGreaterThan(0.3); // >30% compression
      expect(result.deduplicationSavings).toBeGreaterThan(0.1); // >10% deduplication
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should retry failed backups with exponential backoff', async () => {
      let attemptCount = 0;
      mockProviders.supabase.onBackupAttempt(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
      });

      const result = await backupOrchestrator.performBackup({
        dataType: 'wedding-complete',
        data: mockWeddingData,
        retryPolicy: { maxAttempts: 3, backoffMultiplier: 2 }
      });

      expect(result.success).toBe(true);
      expect(result.retryAttempts).toBe(2);
      expect(result.finalAttemptSuccessful).toBe(true);
    });

    it('should maintain backup queue during system overload', async () => {
      // Simulate system overload
      const overloadBackups = Array.from({ length: 20 }, (_, i) => ({
        dataType: `wedding-${i}`,
        data: createMockWeddingData({ couples: 1 })
      }));

      const queueStats = await backupOrchestrator.getQueueStats();
      expect(queueStats.queueLength).toBe(0);

      // Queue all backups
      overloadBackups.forEach(backup => 
        backupOrchestrator.queueBackup(backup)
      );

      const queueStatsAfter = await backupOrchestrator.getQueueStats();
      expect(queueStatsAfter.queueLength).toBe(20);
      expect(queueStatsAfter.processingRate).toBeGreaterThan(0);
    });
  });
});