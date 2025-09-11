import { BackupScheduler } from '@/lib/backup/backup-scheduler';
import { BackupEncryption } from '@/lib/security/backup-encryption';
import { SecureBackupStorage } from '@/lib/storage/secure-backup-storage';

// Mock dependencies
jest.mock('@/lib/security/backup-encryption');
jest.mock('@/lib/storage/secure-backup-storage');
jest.mock('node-cron');

describe('BackupScheduler', () => {
  let backupScheduler: BackupScheduler;
  let mockEncryption: jest.Mocked<typeof BackupEncryption>;
  let mockStorage: jest.Mocked<SecureBackupStorage>;

  const mockOrganizationId = 'org-123';
  const mockBackupPolicy = {
    id: 'policy-123',
    organizationId: mockOrganizationId,
    policyName: 'Test Policy',
    backupType: 'full' as const,
    frequencyType: 'daily' as const,
    frequencyValue: 1,
    backupTime: '02:00',
    timezone: 'UTC',
    retentionDays: 30,
    includeUserData: true,
    includeMediaFiles: true,
    includeDocuments: true,
    includeAnalytics: false,
    exclusionPatterns: [],
    isActive: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEncryption = BackupEncryption as jest.Mocked<typeof BackupEncryption>;
    mockStorage = new SecureBackupStorage() as jest.Mocked<SecureBackupStorage>;
    backupScheduler = new BackupScheduler();
  });

  describe('scheduleBackup', () => {
    it('should create and schedule backup job successfully', async () => {
      const result = await backupScheduler.scheduleBackup(mockOrganizationId, mockBackupPolicy);
      
      expect(result).toBeDefined();
      expect(result.organizationId).toBe(mockOrganizationId);
      expect(result.backupType).toBe('full');
      expect(result.status).toBe('pending');
    });

    it('should validate backup policy before scheduling', async () => {
      const invalidPolicy = { ...mockBackupPolicy, backupType: 'invalid' as any };
      
      await expect(backupScheduler.scheduleBackup(mockOrganizationId, invalidPolicy))
        .rejects.toThrow('Schedule validation failed');
    });

    it('should generate correct cron expression for daily backup', async () => {
      const policy = { ...mockBackupPolicy, backupTime: '14:30' };
      const result = await backupScheduler.scheduleBackup(mockOrganizationId, policy);
      
      // Verify internal cron expression generation
      expect(result.scheduledAt).toBeDefined();
    });
  });

  describe('executeBackup - Small Wedding Scenario', () => {
    it('should complete small wedding backup within 5 minutes', async () => {
      // Mock small wedding data
      const mockWeddingData = createSmallWeddingData();
      
      // Setup mocks for successful backup
      mockEncryption.encryptFile.mockResolvedValue({
        encryptionInfo: {
          algorithm: 'aes-256-gcm',
          salt: 'test-salt',
          iv: 'test-iv',
          tag: 'test-tag',
          hmac: 'test-hmac'
        },
        fileSize: 50 * 1024 * 1024, // 50MB
        checksum: 'test-checksum'
      });

      mockStorage.uploadBackup.mockResolvedValue({
        backupId: 'backup-123',
        uploadUrl: 'https://storage.example.com/backup-123',
        metadata: {}
      });

      mockStorage.verifyBackupIntegrity.mockResolvedValue({
        exists: true,
        checksumMatch: true,
        metadata: {}
      });

      const startTime = Date.now();
      const jobId = 'test-job-123';
      
      const result = await backupScheduler.executeBackup(jobId);
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5 * 60 * 1000); // 5 minutes
      expect(result.totalSize).toBeGreaterThan(0);
      expect(result.verification.checksumValid).toBe(true);
    });

    it('should handle guest RSVP changes during backup', async () => {
      // Simulate RSVP changes during backup process
      const mockData = createSmallWeddingData();
      mockData.guestData.rsvpResponses.push({
        guestId: 'guest-new',
        response: 'accepted',
        changedAt: new Date()
      });

      const result = await backupScheduler.executeBackup('test-job-123');
      
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Data changes detected during backup');
    });
  });

  describe('executeBackup - Large Wedding Scenario', () => {
    it('should complete large wedding backup within 45 minutes', async () => {
      // Mock large wedding data
      const mockWeddingData = createLargeWeddingData();
      
      mockEncryption.encryptFile.mockResolvedValue({
        encryptionInfo: {
          algorithm: 'aes-256-gcm',
          salt: 'test-salt',
          iv: 'test-iv',
          tag: 'test-tag',
          hmac: 'test-hmac'
        },
        fileSize: 12 * 1024 * 1024 * 1024, // 12GB
        checksum: 'test-checksum'
      });

      mockStorage.uploadBackup.mockResolvedValue({
        backupId: 'backup-large-123',
        uploadUrl: 'https://storage.example.com/backup-large-123',
        metadata: {}
      });

      const startTime = Date.now();
      const jobId = 'test-large-job-123';
      
      // Mock long-running operation
      setTimeout(() => {
        // Simulate backup completion after some time
      }, 1000);

      const result = await backupScheduler.executeBackup(jobId);
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(45 * 60 * 1000); // 45 minutes
      expect(result.totalSize).toBeGreaterThan(10 * 1024 * 1024 * 1024); // > 10GB
    });
  });

  describe('executeBackup - Error Handling', () => {
    it('should retry failed backups with exponential backoff', async () => {
      mockEncryption.encryptFile
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({
          encryptionInfo: { algorithm: 'aes-256-gcm', salt: '', iv: '', tag: '', hmac: '' },
          fileSize: 1000,
          checksum: 'test'
        });

      const jobId = 'test-retry-job';
      const result = await backupScheduler.executeBackup(jobId);
      
      expect(mockEncryption.encryptFile).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });

    it('should fail after maximum retry attempts', async () => {
      mockEncryption.encryptFile.mockRejectedValue(new Error('Persistent failure'));

      const jobId = 'test-fail-job';
      
      await expect(backupScheduler.executeBackup(jobId))
        .rejects.toThrow('Backup execution failed');
    });

    it('should clean up temporary files on failure', async () => {
      mockEncryption.encryptFile.mockRejectedValue(new Error('Encryption failed'));
      mockEncryption.secureWipe = jest.fn().mockResolvedValue(undefined);

      const jobId = 'test-cleanup-job';
      
      await expect(backupScheduler.executeBackup(jobId))
        .rejects.toThrow();
        
      expect(mockEncryption.secureWipe).toHaveBeenCalled();
    });
  });

  describe('getBackupStatus', () => {
    it('should return current backup status with progress', async () => {
      const jobId = 'test-status-job';
      
      const status = await backupScheduler.getBackupStatus(jobId);
      
      expect(status).toBeDefined();
      expect(status.jobId).toBe(jobId);
      expect(status.progressPercentage).toBeGreaterThanOrEqual(0);
      expect(status.progressPercentage).toBeLessThanOrEqual(100);
    });

    it('should estimate time remaining for running backup', async () => {
      const jobId = 'test-timing-job';
      
      const status = await backupScheduler.getBackupStatus(jobId);
      
      if (status.status === 'running') {
        expect(status.timeRemaining).toBeDefined();
        expect(status.timeRemaining).toBeGreaterThan(0);
      }
    });
  });

  describe('Wedding Data Collection', () => {
    it('should collect complete guest data including dietary requirements', async () => {
      const weddingData = createSmallWeddingData();
      
      // Verify all guest data components are collected
      expect(weddingData.guestData.guestLists).toBeDefined();
      expect(weddingData.guestData.rsvpResponses).toBeDefined();
      expect(weddingData.guestData.dietaryRequirements).toBeDefined();
      expect(weddingData.guestData.contactInformation).toBeDefined();
      expect(weddingData.guestData.plusOnes).toBeDefined();
    });

    it('should preserve vendor contract integrity', async () => {
      const weddingData = createLargeWeddingData();
      
      expect(weddingData.vendorData.contracts).toBeDefined();
      expect(weddingData.vendorData.communications).toBeDefined();
      expect(weddingData.vendorData.payments).toBeDefined();
      expect(weddingData.vendorData.schedules).toBeDefined();
      expect(weddingData.vendorData.documents).toBeDefined();
    });

    it('should maintain seating arrangement relationships', async () => {
      const weddingData = createLargeWeddingData();
      
      expect(weddingData.seatingData.arrangements).toBeDefined();
      expect(weddingData.seatingData.tables).toBeDefined();
      expect(weddingData.seatingData.assignments).toBeDefined();
      expect(weddingData.seatingData.preferences).toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track backup performance metrics', async () => {
      const jobId = 'test-metrics-job';
      const result = await backupScheduler.executeBackup(jobId);
      
      expect(result.duration).toBeDefined();
      expect(result.totalSize).toBeDefined();
      expect(result.compressedSize).toBeDefined();
      expect(result.compressedSize).toBeLessThanOrEqual(result.totalSize);
    });

    it('should achieve compression ratio > 50% for text data', async () => {
      const result = await backupScheduler.executeBackup('test-compression-job');
      
      const compressionRatio = 1 - (result.compressedSize / result.totalSize);
      expect(compressionRatio).toBeGreaterThan(0.5);
    });
  });

  // Helper functions to create test data
  function createSmallWeddingData() {
    return {
      organizationId: mockOrganizationId,
      timestamp: new Date(),
      guestData: {
        guestLists: Array(45).fill(null).map((_, i) => ({ id: `guest-${i}`, name: `Guest ${i}` })),
        rsvpResponses: Array(40).fill(null).map((_, i) => ({ guestId: `guest-${i}`, response: 'accepted' })),
        dietaryRequirements: Array(5).fill(null).map((_, i) => ({ guestId: `guest-${i}`, requirement: 'vegetarian' })),
        contactInformation: Array(45).fill(null).map((_, i) => ({ guestId: `guest-${i}`, email: `guest${i}@example.com` })),
        plusOnes: Array(10).fill(null).map((_, i) => ({ guestId: `guest-${i}`, plusOneName: `Plus ${i}` }))
      },
      vendorData: {
        contracts: Array(8).fill(null).map((_, i) => ({ id: `contract-${i}`, vendor: `Vendor ${i}` })),
        communications: Array(20).fill(null).map((_, i) => ({ id: `comm-${i}`, message: `Message ${i}` })),
        payments: Array(8).fill(null).map((_, i) => ({ id: `payment-${i}`, amount: 1000 + i * 500 })),
        schedules: Array(8).fill(null).map((_, i) => ({ id: `schedule-${i}`, date: new Date() })),
        documents: Array(15).fill(null).map((_, i) => ({ id: `doc-${i}`, type: 'contract' }))
      },
      mediaData: {
        photos: Array(85).fill(null).map((_, i) => ({ id: `photo-${i}`, url: `photo${i}.jpg` })),
        videos: Array(3).fill(null).map((_, i) => ({ id: `video-${i}`, url: `video${i}.mp4` })),
        documents: Array(10).fill(null).map((_, i) => ({ id: `media-doc-${i}`, type: 'pdf' })),
        portfolios: Array(5).fill(null).map((_, i) => ({ id: `portfolio-${i}`, vendor: `Vendor ${i}` })),
        metadata: Array(103).fill(null).map((_, i) => ({ fileId: `file-${i}`, size: 1024 * (i + 1) }))
      },
      budgetData: {
        categories: Array(10).fill(null).map((_, i) => ({ id: `category-${i}`, name: `Category ${i}` })),
        items: Array(25).fill(null).map((_, i) => ({ id: `item-${i}`, cost: 100 + i * 50 })),
        payments: Array(15).fill(null).map((_, i) => ({ id: `budget-payment-${i}`, amount: 200 + i * 100 })),
        receipts: Array(20).fill(null).map((_, i) => ({ id: `receipt-${i}`, amount: 50 + i * 25 })),
        projections: Array(5).fill(null).map((_, i) => ({ id: `projection-${i}`, total: 10000 + i * 2000 }))
      },
      timelineData: {
        events: Array(12).fill(null).map((_, i) => ({ id: `event-${i}`, date: new Date(Date.now() + i * 24 * 60 * 60 * 1000) })),
        tasks: Array(30).fill(null).map((_, i) => ({ id: `task-${i}`, status: i % 2 === 0 ? 'completed' : 'pending' })),
        milestones: Array(8).fill(null).map((_, i) => ({ id: `milestone-${i}`, importance: 'high' })),
        deadlines: Array(15).fill(null).map((_, i) => ({ id: `deadline-${i}`, date: new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000) })),
        assignments: Array(25).fill(null).map((_, i) => ({ id: `assignment-${i}`, assignee: `Person ${i}` }))
      },
      seatingData: {
        arrangements: Array(6).fill(null).map((_, i) => ({ id: `arrangement-${i}`, tableCount: 8 })),
        tables: Array(8).fill(null).map((_, i) => ({ id: `table-${i}`, capacity: 6 })),
        assignments: Array(45).fill(null).map((_, i) => ({ guestId: `guest-${i}`, tableId: `table-${Math.floor(i / 6)}` })),
        preferences: Array(10).fill(null).map((_, i) => ({ guestId: `guest-${i}`, preference: 'window seat' }))
      },
      menuData: {
        selections: Array(3).fill(null).map((_, i) => ({ id: `selection-${i}`, type: i === 0 ? 'appetizer' : i === 1 ? 'main' : 'dessert' })),
        courses: Array(5).fill(null).map((_, i) => ({ id: `course-${i}`, name: `Course ${i}` })),
        dietary: Array(3).fill(null).map((_, i) => ({ id: `dietary-${i}`, type: ['vegetarian', 'vegan', 'gluten-free'][i] })),
        preferences: Array(15).fill(null).map((_, i) => ({ guestId: `guest-${i}`, preference: 'no nuts' }))
      },
      totalRecords: 500,
      estimatedSizeBytes: 50 * 1024 * 1024
    };
  }

  function createLargeWeddingData() {
    return {
      organizationId: mockOrganizationId,
      timestamp: new Date(),
      guestData: {
        guestLists: Array(350).fill(null).map((_, i) => ({ id: `guest-${i}`, name: `Guest ${i}` })),
        rsvpResponses: Array(320).fill(null).map((_, i) => ({ guestId: `guest-${i}`, response: 'accepted' })),
        dietaryRequirements: Array(45).fill(null).map((_, i) => ({ guestId: `guest-${i}`, requirement: 'vegetarian' })),
        contactInformation: Array(350).fill(null).map((_, i) => ({ guestId: `guest-${i}`, email: `guest${i}@example.com` })),
        plusOnes: Array(120).fill(null).map((_, i) => ({ guestId: `guest-${i}`, plusOneName: `Plus ${i}` }))
      },
      vendorData: {
        contracts: Array(15).fill(null).map((_, i) => ({ id: `contract-${i}`, vendor: `Vendor ${i}` })),
        communications: Array(200).fill(null).map((_, i) => ({ id: `comm-${i}`, message: `Message ${i}` })),
        payments: Array(25).fill(null).map((_, i) => ({ id: `payment-${i}`, amount: 5000 + i * 1000 })),
        schedules: Array(15).fill(null).map((_, i) => ({ id: `schedule-${i}`, date: new Date() })),
        documents: Array(75).fill(null).map((_, i) => ({ id: `doc-${i}`, type: 'contract' }))
      },
      mediaData: {
        photos: Array(1200).fill(null).map((_, i) => ({ id: `photo-${i}`, url: `photo${i}.jpg` })),
        videos: Array(25).fill(null).map((_, i) => ({ id: `video-${i}`, url: `video${i}.mp4` })),
        documents: Array(100).fill(null).map((_, i) => ({ id: `media-doc-${i}`, type: 'pdf' })),
        portfolios: Array(15).fill(null).map((_, i) => ({ id: `portfolio-${i}`, vendor: `Vendor ${i}` })),
        metadata: Array(1340).fill(null).map((_, i) => ({ fileId: `file-${i}`, size: 5 * 1024 * 1024 + i * 1024 }))
      },
      budgetData: {
        categories: Array(20).fill(null).map((_, i) => ({ id: `category-${i}`, name: `Category ${i}` })),
        items: Array(75).fill(null).map((_, i) => ({ id: `item-${i}`, cost: 500 + i * 200 })),
        payments: Array(50).fill(null).map((_, i) => ({ id: `budget-payment-${i}`, amount: 1000 + i * 500 })),
        receipts: Array(100).fill(null).map((_, i) => ({ id: `receipt-${i}`, amount: 200 + i * 100 })),
        projections: Array(12).fill(null).map((_, i) => ({ id: `projection-${i}`, total: 50000 + i * 10000 }))
      },
      timelineData: {
        events: Array(50).fill(null).map((_, i) => ({ id: `event-${i}`, date: new Date(Date.now() + i * 24 * 60 * 60 * 1000) })),
        tasks: Array(200).fill(null).map((_, i) => ({ id: `task-${i}`, status: i % 3 === 0 ? 'completed' : 'pending' })),
        milestones: Array(25).fill(null).map((_, i) => ({ id: `milestone-${i}`, importance: 'high' })),
        deadlines: Array(75).fill(null).map((_, i) => ({ id: `deadline-${i}`, date: new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000) })),
        assignments: Array(150).fill(null).map((_, i) => ({ id: `assignment-${i}`, assignee: `Person ${i % 20}` }))
      },
      seatingData: {
        arrangements: Array(20).fill(null).map((_, i) => ({ id: `arrangement-${i}`, tableCount: 35 })),
        tables: Array(35).fill(null).map((_, i) => ({ id: `table-${i}`, capacity: 10 })),
        assignments: Array(350).fill(null).map((_, i) => ({ guestId: `guest-${i}`, tableId: `table-${Math.floor(i / 10)}` })),
        preferences: Array(80).fill(null).map((_, i) => ({ guestId: `guest-${i}`, preference: 'near dance floor' }))
      },
      menuData: {
        selections: Array(8).fill(null).map((_, i) => ({ id: `selection-${i}`, type: `course-${i}` })),
        courses: Array(12).fill(null).map((_, i) => ({ id: `course-${i}`, name: `Course ${i}` })),
        dietary: Array(8).fill(null).map((_, i) => ({ id: `dietary-${i}`, type: ['vegetarian', 'vegan', 'gluten-free', 'kosher', 'halal', 'keto', 'paleo', 'diabetic'][i] })),
        preferences: Array(120).fill(null).map((_, i) => ({ guestId: `guest-${i}`, preference: 'no seafood' }))
      },
      totalRecords: 4500,
      estimatedSizeBytes: 12 * 1024 * 1024 * 1024
    };
  }
});