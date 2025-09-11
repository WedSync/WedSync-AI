/**
 * WS-178 Backup Procedures - BackupScheduler Unit Tests
 * Team E - Round 1 - Comprehensive Testing & Documentation
 * 
 * Tests the core backup scheduling functionality for WedSync wedding platform
 * Critical for protecting irreplaceable wedding memories and coordination data
 */

import { BackupScheduler } from '../../../../src/lib/backup/backup-scheduler';
import { BackupConfig, BackupStatus, WeddingBackupData } from '../../../../src/lib/backup/types';

describe('BackupScheduler', () => {
  let scheduler: BackupScheduler;
  let mockStorageProvider: jest.Mocked<any>;
  let mockWeddingData: WeddingBackupData;

  beforeEach(() => {
    // Mock storage provider
    mockStorageProvider = {
      upload: jest.fn(),
      download: jest.fn(),
      verify: jest.fn(),
      getMetadata: jest.fn(),
    };

    // Mock wedding data for testing
    mockWeddingData = {
      weddingId: 'wedding-123',
      coupleNames: 'John & Jane Doe',
      weddingDate: new Date('2024-06-15'),
      guestCount: 150,
      photoCount: 456,
      vendorCount: 12,
      dataSize: 2.5 * 1024 * 1024 * 1024, // 2.5GB
      lastModified: new Date(),
      priority: 'high'
    };

    scheduler = new BackupScheduler(mockStorageProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Backup Creation', () => {
    it('should create database dumps with proper compression', async () => {
      const config: BackupConfig = {
        includeMedia: true,
        includeUserData: true,
        compressionLevel: 'high',
        encryptionEnabled: true,
        weddingId: 'wedding-123'
      };

      mockStorageProvider.upload.mockResolvedValue({
        success: true,
        backupId: 'backup-456',
        size: 850 * 1024 * 1024, // 850MB compressed from 2.5GB
        checksum: 'sha256-abcd1234'
      });

      const result = await scheduler.createBackup(mockWeddingData, config);

      expect(result.success).toBe(true);
      expect(result.backupId).toBe('backup-456');
      expect(result.compressionRatio).toBeGreaterThan(0.6); // At least 60% compression
      expect(mockStorageProvider.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          compressed: true,
          encrypted: true,
          weddingId: 'wedding-123'
        })
      );
    });

    it('should handle backup failures gracefully', async () => {
      const config: BackupConfig = {
        includeMedia: true,
        includeUserData: true,
        compressionLevel: 'medium',
        encryptionEnabled: true,
        weddingId: 'wedding-123'
      };

      mockStorageProvider.upload.mockRejectedValue(new Error('Storage provider unavailable'));

      const result = await scheduler.createBackup(mockWeddingData, config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage provider unavailable');
      expect(result.retryable).toBe(true);
      expect(result.nextRetryAt).toBeInstanceOf(Date);
    });

    it('should verify backup integrity before marking complete', async () => {
      const config: BackupConfig = {
        includeMedia: false, // Faster test with data only
        includeUserData: true,
        compressionLevel: 'low',
        encryptionEnabled: false,
        weddingId: 'wedding-123'
      };

      mockStorageProvider.upload.mockResolvedValue({
        success: true,
        backupId: 'backup-789',
        size: 150 * 1024 * 1024,
        checksum: 'sha256-efgh5678'
      });

      mockStorageProvider.verify.mockResolvedValue({
        valid: true,
        checksumMatch: true,
        dataIntegrity: 'verified'
      });

      const result = await scheduler.createBackup(mockWeddingData, config);

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(mockStorageProvider.verify).toHaveBeenCalledWith('backup-789');
    });

    it('should prioritize critical weddings happening within 48 hours', async () => {
      // Wedding tomorrow - critical priority
      const criticalWedding: WeddingBackupData = {
        ...mockWeddingData,
        weddingId: 'wedding-critical',
        weddingDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        priority: 'critical'
      };

      const config: BackupConfig = {
        includeMedia: true,
        includeUserData: true,
        compressionLevel: 'high',
        encryptionEnabled: true,
        weddingId: 'wedding-critical'
      };

      mockStorageProvider.upload.mockResolvedValue({
        success: true,
        backupId: 'backup-critical-456',
        size: 1.2 * 1024 * 1024 * 1024,
        checksum: 'sha256-critical123',
        priority: 'critical'
      });

      const result = await scheduler.createBackup(criticalWedding, config);

      expect(result.success).toBe(true);
      expect(result.priority).toBe('critical');
      expect(mockStorageProvider.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'critical',
          expedited: true
        })
      );
    });
  });

  describe('Scheduled Backup Management', () => {
    it('should schedule automatic backups for active weddings', async () => {
      const activeWeddings = [
        { ...mockWeddingData, weddingId: 'wedding-1', weddingDate: new Date('2024-07-01') },
        { ...mockWeddingData, weddingId: 'wedding-2', weddingDate: new Date('2024-07-15') },
        { ...mockWeddingData, weddingId: 'wedding-3', weddingDate: new Date('2024-08-01') }
      ];

      const scheduleResult = await scheduler.scheduleBackups(activeWeddings);

      expect(scheduleResult.scheduled).toBe(3);
      expect(scheduleResult.jobs.length).toBe(3);
      
      // Verify closest wedding gets highest frequency
      const closestWedding = scheduleResult.jobs.find(job => job.weddingId === 'wedding-1');
      expect(closestWedding?.frequency).toBe('daily');
      
      // Verify furthest wedding gets lower frequency
      const furthestWedding = scheduleResult.jobs.find(job => job.weddingId === 'wedding-3');
      expect(furthestWedding?.frequency).toBe('weekly');
    });

    it('should handle concurrent backup requests with proper queuing', async () => {
      const concurrentWeddings = Array.from({ length: 5 }, (_, i) => ({
        ...mockWeddingData,
        weddingId: `wedding-${i + 1}`,
        weddingDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000)
      }));

      const config: BackupConfig = {
        includeMedia: false,
        includeUserData: true,
        compressionLevel: 'medium',
        encryptionEnabled: true
      };

      mockStorageProvider.upload.mockImplementation(async (data) => ({
        success: true,
        backupId: `backup-${data.weddingId}`,
        size: 100 * 1024 * 1024,
        checksum: `sha256-${data.weddingId}`
      }));

      const results = await Promise.all(
        concurrentWeddings.map(wedding => 
          scheduler.createBackup(wedding, { ...config, weddingId: wedding.weddingId })
        )
      );

      expect(results.every(result => result.success)).toBe(true);
      expect(results.length).toBe(5);
      
      // Verify all backups were processed
      expect(mockStorageProvider.upload).toHaveBeenCalledTimes(5);
    });

    it('should adjust backup frequency based on wedding timeline proximity', async () => {
      const weddingInOneWeek: WeddingBackupData = {
        ...mockWeddingData,
        weddingId: 'wedding-urgent',
        weddingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const weddingInThreeMonths: WeddingBackupData = {
        ...mockWeddingData,
        weddingId: 'wedding-distant',
        weddingDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      };

      const urgentSchedule = await scheduler.calculateBackupFrequency(weddingInOneWeek);
      const distantSchedule = await scheduler.calculateBackupFrequency(weddingInThreeMonths);

      expect(urgentSchedule.frequency).toBe('twice-daily');
      expect(urgentSchedule.priority).toBe('high');
      
      expect(distantSchedule.frequency).toBe('weekly');
      expect(distantSchedule.priority).toBe('normal');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should implement exponential backoff for failed backups', async () => {
      const config: BackupConfig = {
        includeMedia: true,
        includeUserData: true,
        compressionLevel: 'high',
        encryptionEnabled: true,
        weddingId: 'wedding-123'
      };

      // Simulate persistent failures
      mockStorageProvider.upload
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockRejectedValueOnce(new Error('Storage quota exceeded'))
        .mockResolvedValueOnce({
          success: true,
          backupId: 'backup-finally-success',
          size: 800 * 1024 * 1024,
          checksum: 'sha256-success123'
        });

      // First attempt
      const firstAttempt = await scheduler.createBackup(mockWeddingData, config);
      expect(firstAttempt.success).toBe(false);
      expect(firstAttempt.retryDelay).toBe(30000); // 30 seconds

      // Second attempt
      const secondAttempt = await scheduler.retryBackup(firstAttempt.backupId!);
      expect(secondAttempt.success).toBe(false);
      expect(secondAttempt.retryDelay).toBe(60000); // 60 seconds (doubled)

      // Third attempt succeeds
      const thirdAttempt = await scheduler.retryBackup(secondAttempt.backupId!);
      expect(thirdAttempt.success).toBe(true);
      expect(thirdAttempt.backupId).toBe('backup-finally-success');
    });

    it('should failover to secondary storage provider on primary failure', async () => {
      const mockSecondaryProvider = {
        upload: jest.fn(),
        verify: jest.fn()
      };

      scheduler.addSecondaryProvider(mockSecondaryProvider);

      const config: BackupConfig = {
        includeMedia: true,
        includeUserData: true,
        compressionLevel: 'high',
        encryptionEnabled: true,
        weddingId: 'wedding-123',
        enableFailover: true
      };

      // Primary provider fails
      mockStorageProvider.upload.mockRejectedValue(new Error('Primary storage unavailable'));
      
      // Secondary provider succeeds
      mockSecondaryProvider.upload.mockResolvedValue({
        success: true,
        backupId: 'backup-secondary-789',
        size: 900 * 1024 * 1024,
        checksum: 'sha256-secondary456',
        provider: 'secondary'
      });

      const result = await scheduler.createBackup(mockWeddingData, config);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('secondary');
      expect(result.backupId).toBe('backup-secondary-789');
      expect(mockSecondaryProvider.upload).toHaveBeenCalled();
    });

    it('should handle partial backup corruption during upload', async () => {
      const config: BackupConfig = {
        includeMedia: true,
        includeUserData: true,
        compressionLevel: 'high',
        encryptionEnabled: true,
        weddingId: 'wedding-123'
      };

      // Upload succeeds but verification fails
      mockStorageProvider.upload.mockResolvedValue({
        success: true,
        backupId: 'backup-corrupted-123',
        size: 750 * 1024 * 1024,
        checksum: 'sha256-corrupted789'
      });

      mockStorageProvider.verify.mockResolvedValue({
        valid: false,
        checksumMatch: false,
        dataIntegrity: 'corrupted',
        corruptedSections: ['media_files', 'guest_photos']
      });

      const result = await scheduler.createBackup(mockWeddingData, config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Backup verification failed');
      expect(result.corruptedSections).toEqual(['media_files', 'guest_photos']);
      expect(result.retryable).toBe(true);
    });
  });

  describe('Wedding Data Protection', () => {
    it('should ensure guest privacy data is properly encrypted', async () => {
      const sensitiveWedding: WeddingBackupData = {
        ...mockWeddingData,
        hasPersonalData: true,
        hasPaymentInfo: true,
        guestCount: 200,
        privacyLevel: 'high'
      };

      const config: BackupConfig = {
        includeMedia: true,
        includeUserData: true,
        compressionLevel: 'high',
        encryptionEnabled: true,
        encryptionLevel: 'aes-256',
        weddingId: 'wedding-sensitive-123'
      };

      mockStorageProvider.upload.mockResolvedValue({
        success: true,
        backupId: 'backup-encrypted-456',
        size: 1.1 * 1024 * 1024 * 1024,
        checksum: 'sha256-encrypted789',
        encryptionVerified: true
      });

      const result = await scheduler.createBackup(sensitiveWedding, config);

      expect(result.success).toBe(true);
      expect(result.encrypted).toBe(true);
      expect(mockStorageProvider.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          encrypted: true,
          encryptionLevel: 'aes-256',
          personalDataHandling: 'encrypted'
        })
      );
    });

    it('should create incremental backups for large photo collections', async () => {
      const photoHeavyWedding: WeddingBackupData = {
        ...mockWeddingData,
        photoCount: 2500,
        videoCount: 45,
        dataSize: 15 * 1024 * 1024 * 1024, // 15GB
        lastBackupDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      };

      const config: BackupConfig = {
        includeMedia: true,
        includeUserData: true,
        compressionLevel: 'high',
        encryptionEnabled: true,
        backupType: 'incremental',
        weddingId: 'wedding-photo-heavy'
      };

      mockStorageProvider.upload.mockResolvedValue({
        success: true,
        backupId: 'backup-incremental-789',
        size: 2.3 * 1024 * 1024 * 1024, // Only 2.3GB incremental
        checksum: 'sha256-incremental456',
        incrementalData: true,
        changedFiles: 156
      });

      const result = await scheduler.createBackup(photoHeavyWedding, config);

      expect(result.success).toBe(true);
      expect(result.backupType).toBe('incremental');
      expect(result.size).toBeLessThan(3 * 1024 * 1024 * 1024); // Less than 3GB
      expect(result.changedFiles).toBe(156);
    });

    it('should maintain backup chain integrity for incremental backups', async () => {
      const config: BackupConfig = {
        includeMedia: true,
        includeUserData: true,
        compressionLevel: 'medium',
        encryptionEnabled: true,
        backupType: 'incremental',
        weddingId: 'wedding-chain-test'
      };

      // Create initial full backup
      mockStorageProvider.upload.mockResolvedValueOnce({
        success: true,
        backupId: 'backup-full-001',
        size: 5 * 1024 * 1024 * 1024,
        checksum: 'sha256-full001',
        backupType: 'full',
        chainId: 'chain-wedding-123'
      });

      const fullBackup = await scheduler.createBackup(mockWeddingData, {
        ...config,
        backupType: 'full'
      });

      // Create incremental backup
      mockStorageProvider.upload.mockResolvedValueOnce({
        success: true,
        backupId: 'backup-incr-002',
        size: 500 * 1024 * 1024,
        checksum: 'sha256-incr002',
        backupType: 'incremental',
        chainId: 'chain-wedding-123',
        parentBackupId: 'backup-full-001'
      });

      const incrementalBackup = await scheduler.createBackup(mockWeddingData, config);

      expect(fullBackup.success).toBe(true);
      expect(incrementalBackup.success).toBe(true);
      expect(incrementalBackup.chainId).toBe(fullBackup.chainId);
      expect(incrementalBackup.parentBackupId).toBe(fullBackup.backupId);
    });
  });

  describe('Performance and Resource Management', () => {
    it('should complete backups within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const config: BackupConfig = {
        includeMedia: false, // Data only for speed test
        includeUserData: true,
        compressionLevel: 'low', // Faster compression
        encryptionEnabled: false, // Skip encryption for speed
        weddingId: 'wedding-performance-test'
      };

      mockStorageProvider.upload.mockImplementation(async () => {
        // Simulate realistic upload time (5 seconds)
        await new Promise(resolve => setTimeout(resolve, 5000));
        return {
          success: true,
          backupId: 'backup-perf-123',
          size: 200 * 1024 * 1024,
          checksum: 'sha256-perf456'
        };
      });

      const result = await scheduler.createBackup(mockWeddingData, config);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(10000); // Less than 10 seconds for data-only backup
    }, 15000); // 15 second timeout

    it('should manage memory usage during large backup operations', async () => {
      const largeWedding: WeddingBackupData = {
        ...mockWeddingData,
        photoCount: 5000,
        videoCount: 100,
        dataSize: 25 * 1024 * 1024 * 1024, // 25GB
        weddingId: 'wedding-memory-test'
      };

      const config: BackupConfig = {
        includeMedia: true,
        includeUserData: true,
        compressionLevel: 'high',
        encryptionEnabled: true,
        streamingEnabled: true, // Enable streaming to manage memory
        weddingId: 'wedding-memory-test'
      };

      mockStorageProvider.upload.mockResolvedValue({
        success: true,
        backupId: 'backup-large-789',
        size: 8 * 1024 * 1024 * 1024, // 8GB compressed
        checksum: 'sha256-large456',
        streamingUsed: true,
        maxMemoryUsed: 512 * 1024 * 1024 // 512MB max memory
      });

      const result = await scheduler.createBackup(largeWedding, config);

      expect(result.success).toBe(true);
      expect(result.streamingUsed).toBe(true);
      expect(result.maxMemoryUsed).toBeLessThan(1024 * 1024 * 1024); // Less than 1GB
    });

    it('should throttle backup operations during peak usage', async () => {
      const peakHourWeddings = Array.from({ length: 10 }, (_, i) => ({
        ...mockWeddingData,
        weddingId: `wedding-peak-${i + 1}`,
        weddingDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000)
      }));

      scheduler.enablePeakHourThrottling(true);
      
      const config: BackupConfig = {
        includeMedia: true,
        includeUserData: true,
        compressionLevel: 'medium',
        encryptionEnabled: true
      };

      mockStorageProvider.upload.mockImplementation(async (data) => ({
        success: true,
        backupId: `backup-${data.weddingId}`,
        size: 500 * 1024 * 1024,
        checksum: `sha256-${data.weddingId}`,
        throttled: true
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        peakHourWeddings.map(wedding => 
          scheduler.createBackup(wedding, { ...config, weddingId: wedding.weddingId })
        )
      );
      const duration = Date.now() - startTime;

      expect(results.every(result => result.success)).toBe(true);
      expect(duration).toBeGreaterThan(5000); // Throttling should add delay
      expect(results.some(result => result.throttled)).toBe(true);
    });
  });

  describe('Audit and Monitoring', () => {
    it('should log all backup operations for audit trail', async () => {
      const mockAuditLogger = jest.fn();
      scheduler.setAuditLogger(mockAuditLogger);

      const config: BackupConfig = {
        includeMedia: true,
        includeUserData: true,
        compressionLevel: 'high',
        encryptionEnabled: true,
        weddingId: 'wedding-audit-test'
      };

      mockStorageProvider.upload.mockResolvedValue({
        success: true,
        backupId: 'backup-audit-123',
        size: 800 * 1024 * 1024,
        checksum: 'sha256-audit456'
      });

      await scheduler.createBackup(mockWeddingData, config);

      expect(mockAuditLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'backup_created',
          weddingId: 'wedding-audit-test',
          backupId: 'backup-audit-123',
          timestamp: expect.any(Date),
          userId: expect.any(String),
          success: true
        })
      );
    });

    it('should track backup metrics for monitoring dashboard', async () => {
      const mockMetricsCollector = jest.fn();
      scheduler.setMetricsCollector(mockMetricsCollector);

      const config: BackupConfig = {
        includeMedia: true,
        includeUserData: true,
        compressionLevel: 'high',
        encryptionEnabled: true,
        weddingId: 'wedding-metrics-test'
      };

      mockStorageProvider.upload.mockResolvedValue({
        success: true,
        backupId: 'backup-metrics-456',
        size: 1.2 * 1024 * 1024 * 1024,
        checksum: 'sha256-metrics789',
        uploadTime: 45000, // 45 seconds
        compressionRatio: 0.72
      });

      await scheduler.createBackup(mockWeddingData, config);

      expect(mockMetricsCollector).toHaveBeenCalledWith({
        metric: 'backup_completed',
        weddingId: 'wedding-metrics-test',
        size: 1.2 * 1024 * 1024 * 1024,
        duration: 45000,
        compressionRatio: 0.72,
        success: true,
        timestamp: expect.any(Date)
      });
    });
  });
});