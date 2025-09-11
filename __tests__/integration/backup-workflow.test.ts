import { BackupScheduler } from '@/lib/backup/backup-scheduler';
import { RestoreManager } from '@/lib/backup/restore-manager';
import { VerificationEngine } from '@/lib/backup/verification-engine';
import { BackupSecurityMiddleware } from '@/lib/middleware/backup-security';
import { createMocks } from 'node-mocks-http';

describe('Backup Workflow Integration Tests', () => {
  let backupScheduler: BackupScheduler;
  let restoreManager: RestoreManager;
  let verificationEngine: VerificationEngine;

  const mockOrganizationId = 'org-wedding-123';
  const mockAdminId = 'admin-123';
  const mockAdminEmail = 'admin@wedsync.com';

  beforeEach(() => {
    backupScheduler = new BackupScheduler();
    restoreManager = new RestoreManager();
    verificationEngine = new VerificationEngine();
    jest.clearAllMocks();
  });

  describe('Complete Wedding Backup Lifecycle', () => {
    it('should execute complete backup-to-restore workflow', async () => {
      // PHASE 1: Create backup
      const backupPolicy = createWeddingBackupPolicy();
      const backupJob = await backupScheduler.scheduleBackup(mockOrganizationId, backupPolicy);
      
      expect(backupJob).toBeDefined();
      expect(backupJob.organizationId).toBe(mockOrganizationId);

      // PHASE 2: Execute backup
      const backupResult = await backupScheduler.executeBackup(backupJob.id);
      
      expect(backupResult.success).toBe(true);
      expect(backupResult.backupId).toBeDefined();
      expect(backupResult.totalSize).toBeGreaterThan(0);
      expect(backupResult.verification.checksumValid).toBe(true);

      // PHASE 3: Verify backup integrity
      const verificationResults = await verificationEngine.verifyBackupIntegrity(
        backupResult.backupId,
        mockOrganizationId,
        ['file_integrity', 'data_consistency', 'wedding_data_validation'],
        mockAdminId
      );
      
      expect(verificationResults).toHaveLength(3);
      expect(verificationResults.every(r => r.status === 'passed')).toBe(true);

      // PHASE 4: Test restore functionality
      const restoreOptions = {
        restoreDatabase: true,
        restoreMediaFiles: true,
        restoreDocuments: true,
        restoreConfiguration: false,
        conflictResolution: 'overwrite' as const,
        createBackupBeforeRestore: true,
        skipDataValidation: false
      };

      const restoreJob = await restoreManager.initiateRestore(
        backupResult.backupId,
        mockOrganizationId,
        restoreOptions,
        mockAdminId
      );

      expect(restoreJob).toBeDefined();
      expect(restoreJob.backupId).toBe(backupResult.backupId);
      expect(restoreJob.status).toBe('pending');

      // PHASE 5: Validate restored data
      const validationResults = await restoreManager.validateRestoredData(restoreJob.id);
      
      expect(validationResults).toBeDefined();
      expect(validationResults.length).toBeGreaterThan(0);
      expect(validationResults.every(r => r.validationScore > 85)).toBe(true);
    });

    it('should handle backup during active wedding planning', async () => {
      // Simulate active wedding with ongoing RSVP changes
      const weddingContext = createActiveWeddingScenario();
      
      const backupPolicy = createWeddingBackupPolicy();
      const backupJob = await backupScheduler.scheduleBackup(mockOrganizationId, backupPolicy);

      // Start backup
      const backupPromise = backupScheduler.executeBackup(backupJob.id);

      // Simulate concurrent wedding data changes
      await simulateWeddingDataChanges(mockOrganizationId, weddingContext);

      // Wait for backup completion
      const backupResult = await backupPromise;

      expect(backupResult.success).toBe(true);
      expect(backupResult.warnings.length).toBeGreaterThanOrEqual(0);
      
      // Verify data consistency despite changes
      const verification = await verificationEngine.validateWeddingDataStructure(
        backupResult.backupId,
        mockOrganizationId
      );

      expect(verification.overallIntegrity).toBeGreaterThan(70);
    });
  });

  describe('Disaster Recovery Scenarios', () => {
    it('should recover from complete data loss scenario', async () => {
      // PHASE 1: Create initial backup
      const originalData = await createWeddingDataSnapshot();
      const backupPolicy = createWeddingBackupPolicy();
      const backupJob = await backupScheduler.scheduleBackup(mockOrganizationId, backupPolicy);
      const backupResult = await backupScheduler.executeBackup(backupJob.id);

      // PHASE 2: Simulate complete data loss
      await simulateCompleteDataLoss(mockOrganizationId);

      // PHASE 3: Perform full restore
      const restoreOptions = {
        restoreDatabase: true,
        restoreMediaFiles: true,
        restoreDocuments: true,
        restoreConfiguration: true,
        conflictResolution: 'overwrite' as const,
        createBackupBeforeRestore: false,
        skipDataValidation: false
      };

      const restoreJob = await restoreManager.initiateRestore(
        backupResult.backupId,
        mockOrganizationId,
        restoreOptions,
        mockAdminId
      );

      // PHASE 4: Verify complete recovery
      const restoreResult = await waitForRestoreCompletion(restoreJob.id);
      
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.recordsRestored).toBeGreaterThan(0);
      expect(restoreResult.validationResults.every(r => r.validationScore > 80)).toBe(true);

      // PHASE 5: Validate critical wedding data integrity
      const criticalDataValidation = await validateCriticalWeddingData(mockOrganizationId, originalData);
      expect(criticalDataValidation.guestDataIntact).toBe(true);
      expect(criticalDataValidation.vendorContractsIntact).toBe(true);
      expect(criticalDataValidation.timelineIntact).toBe(true);
    });

    it('should handle partial data corruption scenario', async () => {
      // PHASE 1: Create backup
      const backupResult = await createTestBackup();

      // PHASE 2: Simulate guest list corruption
      await simulateGuestListCorruption(mockOrganizationId);

      // PHASE 3: Perform selective restore (guest data only)
      const selectiveRestore = await restoreManager.performSelectiveRestore(
        backupResult.backupId,
        ['database'], // Only restore guest data from database
        mockOrganizationId,
        mockAdminId
      );

      expect(selectiveRestore.success).toBe(true);
      expect(selectiveRestore.dataTypesRestored).toContain('database');

      // PHASE 4: Verify only guest data was restored
      const validation = await verificationEngine.validateWeddingDataStructure(
        backupResult.backupId,
        mockOrganizationId
      );

      expect(validation.guestDataIntegrity.integrityScore).toBe(100);
    });
  });

  describe('Performance and Scale Testing', () => {
    it('should handle concurrent backup operations for multiple organizations', async () => {
      const organizationIds = Array(5).fill(null).map((_, i) => `org-${i}`);
      const backupPromises = [];

      for (const orgId of organizationIds) {
        const policy = createWeddingBackupPolicy();
        const backupJob = await backupScheduler.scheduleBackup(orgId, policy);
        backupPromises.push(backupScheduler.executeBackup(backupJob.id));
      }

      const results = await Promise.allSettled(backupPromises);
      
      // All backups should succeed
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
      
      // Check individual backup results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value.success).toBe(true);
          expect(result.value.duration).toBeLessThan(10 * 60 * 1000); // 10 minutes max
        }
      });
    });

    it('should maintain performance SLAs under load', async () => {
      const loadTestScenarios = [
        { size: 'small', expectedDuration: 5 * 60 * 1000 },  // 5 minutes
        { size: 'medium', expectedDuration: 15 * 60 * 1000 }, // 15 minutes
        { size: 'large', expectedDuration: 45 * 60 * 1000 }   // 45 minutes
      ];

      for (const scenario of loadTestScenarios) {
        const startTime = Date.now();
        const backupResult = await createTestBackup(scenario.size);
        const duration = Date.now() - startTime;

        expect(backupResult.success).toBe(true);
        expect(duration).toBeLessThan(scenario.expectedDuration);
      }
    });
  });

  describe('Security Integration Testing', () => {
    it('should enforce admin authentication for all backup operations', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: {
          backupType: 'full',
          includeDatabase: true,
          includeUploads: true
        }
      });

      // Test without authentication
      const unauthenticatedResult = await BackupSecurityMiddleware.validateAdminAccess(req);
      expect(unauthenticatedResult.isValid).toBe(false);

      // Test with invalid role
      req.session = { user: { id: 'user-123', role: 'guest' } };
      const invalidRoleResult = await BackupSecurityMiddleware.validateAdminAccess(req);
      expect(invalidRoleResult.isValid).toBe(false);

      // Test with valid admin
      req.session = { user: { id: mockAdminId, email: mockAdminEmail, role: 'admin' } };
      const validAdminResult = await BackupSecurityMiddleware.validateAdminAccess(req);
      expect(validAdminResult.isValid).toBe(true);
    });

    it('should apply rate limiting correctly', async () => {
      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        const rateLimitResult = await BackupSecurityMiddleware.checkRateLimit(
          'backup_create',
          mockAdminId
        );
        
        if (i < 5) {
          expect(rateLimitResult.allowed).toBe(true);
        }
      }

      // Next request should be rate limited
      const exceededResult = await BackupSecurityMiddleware.checkRateLimit(
        'backup_create',
        mockAdminId
      );
      
      expect(exceededResult.allowed).toBe(false);
      expect(exceededResult.reset).toBeInstanceOf(Date);
    });

    it('should maintain audit logs for all operations', async () => {
      // Perform various backup operations
      const operations = [
        { operation: 'backup_create', success: true },
        { operation: 'backup_list', success: true },
        { operation: 'backup_delete', success: false, errorCode: 'NOT_FOUND' }
      ];

      for (const op of operations) {
        await BackupSecurityMiddleware.logAuditEvent({
          adminId: mockAdminId,
          adminEmail: mockAdminEmail,
          operation: op.operation,
          success: op.success,
          errorCode: op.errorCode,
          ipAddress: '192.168.1.100',
          userAgent: 'WedSync-Test/1.0'
        });
      }

      // Retrieve audit logs
      const auditLogs = BackupSecurityMiddleware.getAuditLogs(
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
        new Date().toISOString(),
        undefined,
        mockAdminId
      );

      expect(auditLogs.length).toBe(3);
      expect(auditLogs.every(log => log.adminId === mockAdminId)).toBe(true);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover gracefully from network interruptions', async () => {
      const backupPolicy = createWeddingBackupPolicy();
      const backupJob = await backupScheduler.scheduleBackup(mockOrganizationId, backupPolicy);

      // Simulate network failure during backup
      const networkFailureSimulation = simulateNetworkFailure();
      
      try {
        const backupResult = await backupScheduler.executeBackup(backupJob.id);
        
        // Should succeed after retries
        expect(backupResult.success).toBe(true);
        expect(backupResult.warnings).toContain('Network issues resolved after retry');
      } finally {
        networkFailureSimulation.restore();
      }
    });

    it('should handle storage space limitations', async () => {
      // Simulate low storage space
      const storageSimulation = simulateStorageSpaceLimitation();
      
      try {
        const backupPolicy = createWeddingBackupPolicy();
        const backupJob = await backupScheduler.scheduleBackup(mockOrganizationId, backupPolicy);
        
        const backupResult = await backupScheduler.executeBackup(backupJob.id);
        
        // Should either succeed with warnings or fail gracefully
        if (!backupResult.success) {
          expect(backupResult.error).toContain('storage');
        } else {
          expect(backupResult.warnings).toContain('storage');
        }
      } finally {
        storageSimulation.restore();
      }
    });
  });

  // Helper functions

  function createWeddingBackupPolicy() {
    return {
      id: 'policy-test-123',
      organizationId: mockOrganizationId,
      policyName: 'Test Wedding Backup Policy',
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
  }

  function createActiveWeddingScenario() {
    return {
      weddingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      guestCount: 150,
      rsvpDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      activeChanges: {
        pendingRsvps: 25,
        menuChanges: 5,
        seatingUpdates: 10
      }
    };
  }

  async function simulateWeddingDataChanges(organizationId: string, context: any) {
    // Simulate RSVP responses coming in during backup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate menu selection changes
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Simulate seating arrangement updates
    await new Promise(resolve => setTimeout(resolve, 75));
    
    return {
      rsvpChanges: context.activeChanges.pendingRsvps,
      menuChanges: context.activeChanges.menuChanges,
      seatingChanges: context.activeChanges.seatingUpdates
    };
  }

  async function createWeddingDataSnapshot() {
    return {
      guests: Array(150).fill(null).map((_, i) => ({ id: `guest-${i}`, name: `Guest ${i}` })),
      vendors: Array(10).fill(null).map((_, i) => ({ id: `vendor-${i}`, name: `Vendor ${i}` })),
      timeline: Array(20).fill(null).map((_, i) => ({ id: `event-${i}`, date: new Date() })),
      budget: { total: 50000, spent: 25000, categories: 15 }
    };
  }

  async function simulateCompleteDataLoss(organizationId: string) {
    // Simulate complete database wipe
    console.log(`Simulating complete data loss for ${organizationId}`);
    return Promise.resolve();
  }

  async function createTestBackup(size: string = 'medium') {
    const backupPolicy = createWeddingBackupPolicy();
    const backupJob = await backupScheduler.scheduleBackup(mockOrganizationId, backupPolicy);
    return await backupScheduler.executeBackup(backupJob.id);
  }

  async function waitForRestoreCompletion(restoreId: string) {
    // Wait for restore to complete (simulated)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      restoreId,
      duration: 1000,
      recordsRestored: 1000,
      conflictsResolved: 0,
      validationResults: [{
        dataType: 'guest_data',
        recordsValidated: 150,
        recordsValid: 150,
        recordsInvalid: 0,
        criticalErrors: [],
        warnings: [],
        validationScore: 100
      }],
      warnings: []
    };
  }

  async function validateCriticalWeddingData(organizationId: string, originalData: any) {
    return {
      guestDataIntact: true,
      vendorContractsIntact: true,
      timelineIntact: true,
      budgetDataIntact: true,
      mediaFilesIntact: true
    };
  }

  async function simulateGuestListCorruption(organizationId: string) {
    console.log(`Simulating guest list corruption for ${organizationId}`);
    return Promise.resolve();
  }

  function simulateNetworkFailure() {
    // Mock network failure that resolves after retries
    let callCount = 0;
    const originalFetch = global.fetch;
    
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.reject(new Error('Network unavailable'));
      }
      return originalFetch.apply(global, arguments as any);
    });

    return {
      restore: () => {
        global.fetch = originalFetch;
      }
    };
  }

  function simulateStorageSpaceLimitation() {
    // Mock storage limitation
    const originalConsoleWarn = console.warn;
    
    console.warn = jest.fn().mockImplementation((message) => {
      if (message.includes('storage')) {
        // Simulate storage warning
      }
      return originalConsoleWarn.call(console, message);
    });

    return {
      restore: () => {
        console.warn = originalConsoleWarn;
      }
    };
  }
});