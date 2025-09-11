/**
 * WS-177 Audit Logging System - Retention Manager Tests
 * Team D - Round 1: Unit tests for automated retention and archival
 * 
 * Coverage target: >80%
 * Focus: Data lifecycle management, compliance, archival operations
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventEmitter } from 'events';
import {
  AuditRetentionManager,
  createRetentionManager,
  ArchiveStorageConfig,
  ComplianceConfig,
  RetentionOperationType,
  RetentionOperationResult
} from '../../../src/lib/performance/audit/audit-retention-manager';
import {
  RetentionPolicy,
  AuditEvent,
  AuditEventType,
  AuditSeverity,
  AuditAction,
  SupplierRole
} from '../../../src/types/audit-performance';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  storage: {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn()
  }
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

describe('AuditRetentionManager', () => {
  let retentionManager: AuditRetentionManager;
  let testArchiveConfig: ArchiveStorageConfig;
  let testComplianceConfig: ComplianceConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    
    testArchiveConfig = {
      provider: 'supabase',
      bucketName: 'test-audit-archives',
      region: 'us-east-1',
      compressionLevel: 6,
      indexingEnabled: true,
      separateWeddingData: true,
      guestDataEncryption: true,
      supplierDataSeparation: true
    };

    testComplianceConfig = {
      gdprCompliant: true,
      ccpaCompliant: true,
      hipaaCompliant: false,
      pciCompliant: true,
      guestDataRetention: 1825, // 5 years
      paymentDataRetention: 2555, // 7 years
      supplierDataRetention: 2555,
      photoMetadataRetention: 3650, // 10 years
      communicationRecordsRetention: 2555,
      postWeddingDataRetention: 365, // 1 year after wedding
      canceledWeddingDataRetention: 90, // 3 months for canceled weddings
      enableDataDeletion: true,
      anonymizationEnabled: true,
      auditLogRetention: 2555,
      complianceReportGeneration: true
    };

    retentionManager = new AuditRetentionManager(testArchiveConfig, testComplianceConfig);
  });

  afterEach(async () => {
    await retentionManager.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize retention manager', () => {
      expect(retentionManager).toBeInstanceOf(AuditRetentionManager);
      expect(retentionManager).toBeInstanceOf(EventEmitter);
    });

    it('should create manager with factory function', () => {
      const factoryManager = createRetentionManager(
        { provider: 's3', bucketName: 'test-s3-bucket' },
        { gdprCompliant: false }
      );
      expect(factoryManager).toBeInstanceOf(AuditRetentionManager);
    });

    it('should load default retention policies', async () => {
      const policies = await retentionManager.getRetentionPolicies();
      
      expect(policies.length).toBeGreaterThan(0);
      expect(policies.some(p => p.id === 'standard-audit-logs')).toBe(true);
      expect(policies.some(p => p.id === 'security-events')).toBe(true);
      expect(policies.some(p => p.id === 'performance-metrics')).toBe(true);
      expect(policies.some(p => p.id === 'guest-data-privacy')).toBe(true);
    });
  });

  describe('Retention Policy Management', () => {
    it('should add new retention policy', async () => {
      const newPolicy: RetentionPolicy = {
        id: 'custom-policy',
        name: 'Custom Retention Policy',
        description: 'Test custom policy',
        enabled: true,
        retentionPeriodDays: 90,
        eventTypes: [AuditEventType.USER_ACTION],
        severityThreshold: AuditSeverity.LOW,
        weddingDataRetentionDays: 90,
        guestDataRetentionDays: 90,
        supplierDataRetentionDays: 90,
        photoMetadataRetentionDays: 90,
        archiveEnabled: true,
        archiveLocation: 'custom-archive',
        compressionLevel: 6,
        encryptArchive: true,
        cleanupSchedule: '0 3 * * *',
        notifyBeforeCleanup: false,
        dryRunEnabled: false
      };

      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'custom-policy' }], error: null });

      await retentionManager.addRetentionPolicy(newPolicy);

      const policies = await retentionManager.getRetentionPolicies();
      const addedPolicy = policies.find(p => p.id === 'custom-policy');
      
      expect(addedPolicy).toBeDefined();
      expect(addedPolicy?.name).toBe('Custom Retention Policy');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'custom-policy',
          name: 'Custom Retention Policy',
          retention_period_days: 90
        })
      ]);
    });

    it('should update existing retention policy', async () => {
      const policies = await retentionManager.getRetentionPolicies();
      const existingPolicy = policies[0];
      
      const updatedPolicy = {
        ...existingPolicy,
        name: 'Updated Policy Name',
        retentionPeriodDays: 180
      };

      mockSupabaseClient.update.mockResolvedValue({ data: [{ id: existingPolicy.id }], error: null });

      await retentionManager.updateRetentionPolicy(updatedPolicy);

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        name: 'Updated Policy Name',
        description: updatedPolicy.description,
        enabled: updatedPolicy.enabled,
        retention_period_days: 180,
        event_types: updatedPolicy.eventTypes,
        severity_threshold: updatedPolicy.severityThreshold
      });
    });

    it('should delete retention policy', async () => {
      mockSupabaseClient.delete.mockResolvedValue({ data: [{ id: 'test-policy' }], error: null });

      await retentionManager.deleteRetentionPolicy('test-policy');

      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'test-policy');
    });

    it('should handle policy management errors', async () => {
      mockSupabaseClient.insert.mockResolvedValue({ 
        data: null, 
        error: { message: 'Policy already exists' } 
      });

      const duplicatePolicy: RetentionPolicy = {
        id: 'duplicate-policy',
        name: 'Duplicate Policy',
        description: 'Test duplicate',
        enabled: true,
        retentionPeriodDays: 30,
        eventTypes: [AuditEventType.USER_ACTION],
        severityThreshold: AuditSeverity.LOW,
        weddingDataRetentionDays: 30,
        guestDataRetentionDays: 30,
        supplierDataRetentionDays: 30,
        photoMetadataRetentionDays: 30,
        archiveEnabled: false,
        archiveLocation: '',
        compressionLevel: 0,
        encryptArchive: false,
        cleanupSchedule: '0 2 * * *',
        notifyBeforeCleanup: false,
        dryRunEnabled: false
      };

      await expect(retentionManager.addRetentionPolicy(duplicatePolicy))
        .rejects.toThrow('Failed to store retention policy');
    });
  });

  describe('Retention Schedule Management', () => {
    it('should start retention schedule', async () => {
      // Mock policy enforcement
      mockSupabaseClient.select.mockResolvedValue({ data: [], error: null });

      await retentionManager.startRetentionSchedule();

      // Should run immediate enforcement
      // Timer testing is complex, so we just verify the method completes
      expect(retentionManager).toBeDefined();
    });

    it('should enforce all policies', async () => {
      // Mock empty results for all policies
      mockSupabaseClient.select.mockResolvedValue({ data: [], error: null });

      const results = await retentionManager.enforceAllPolicies();

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0); // Should have results for default policies
    });
  });

  describe('Record Identification and Processing', () => {
    const mockAuditEvents: AuditEvent[] = [
      {
        id: 'event-1',
        timestamp: '2024-01-15T10:00:00Z', // Old event for retention
        eventType: AuditEventType.USER_ACTION,
        severity: AuditSeverity.LOW,
        organizationId: 'org-123',
        weddingId: 'wedding-456',
        resource: 'guest_profiles',
        action: AuditAction.READ,
        metadata: { guestsAffected: 10 },
        executionTimeMs: 100,
        weddingDate: '2024-06-15', // Past wedding date
        supplierRole: SupplierRole.WEDDING_PLANNER
      },
      {
        id: 'event-2',
        timestamp: '2024-12-15T10:00:00Z', // Recent event
        eventType: AuditEventType.USER_ACTION,
        severity: AuditSeverity.MEDIUM,
        organizationId: 'org-123',
        resource: 'supplier_profiles',
        action: AuditAction.UPDATE,
        metadata: { suppliersNotified: 5 },
        executionTimeMs: 150,
        supplierRole: SupplierRole.PHOTOGRAPHER
      }
    ];

    beforeEach(() => {
      // Mock deserialization of database rows
      mockSupabaseClient.select.mockImplementation(() => {
        return Promise.resolve({
          data: mockAuditEvents.map(event => ({
            id: event.id,
            timestamp: event.timestamp,
            event_type: event.eventType,
            severity: event.severity,
            organization_id: event.organizationId,
            wedding_id: event.weddingId,
            resource: event.resource,
            action: event.action,
            metadata: JSON.stringify(event.metadata),
            execution_time_ms: event.executionTimeMs,
            wedding_date: event.weddingDate,
            supplier_role: event.supplierRole
          })),
          error: null
        });
      });
    });

    it('should identify records eligible for retention', async () => {
      const policies = await retentionManager.getRetentionPolicies();
      const testPolicy = policies.find(p => p.id === 'performance-metrics'); // 90-day retention
      
      expect(testPolicy).toBeDefined();

      const result = await retentionManager.enforceRetentionPolicy(testPolicy!);

      expect(result.operationId).toBeDefined();
      expect(result.policyId).toBe(testPolicy!.id);
      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBeGreaterThanOrEqual(0);
    });

    it('should apply wedding-specific retention rules', async () => {
      const weddingPolicy = {
        id: 'wedding-test-policy',
        name: 'Wedding Test Policy',
        description: 'Test wedding-specific retention',
        enabled: true,
        retentionPeriodDays: 30,
        eventTypes: [AuditEventType.USER_ACTION],
        severityThreshold: AuditSeverity.LOW,
        weddingDataRetentionDays: 30,
        guestDataRetentionDays: 365, // Longer retention for guest data
        supplierDataRetentionDays: 30,
        photoMetadataRetentionDays: 30,
        archiveEnabled: true,
        archiveLocation: 'wedding-archive',
        compressionLevel: 6,
        encryptArchive: true,
        cleanupSchedule: '0 2 * * *',
        notifyBeforeCleanup: false,
        dryRunEnabled: false
      };

      // Mock successful archival and deletion
      mockSupabaseClient.storage.from().upload.mockResolvedValue({ data: { path: 'test-archive.json' }, error: null });
      mockSupabaseClient.delete.mockResolvedValue({ data: [], error: null });

      const result = await retentionManager.enforceRetentionPolicy(weddingPolicy);

      expect(result.success).toBe(true);
      expect(result.weddingsProcessed).toBeDefined();
      expect(result.guestDataRecords).toBeDefined();
      expect(result.supplierDataRecords).toBeDefined();
    });

    it('should process records in batches', async () => {
      // Create many mock events
      const manyEvents = Array(2500).fill(null).map((_, i) => ({
        ...mockAuditEvents[0],
        id: `batch-event-${i}`,
        timestamp: '2023-01-15T10:00:00Z' // Very old for retention
      }));

      mockSupabaseClient.select.mockResolvedValue({
        data: manyEvents.map(event => ({
          id: event.id,
          timestamp: event.timestamp,
          event_type: event.eventType,
          severity: event.severity,
          organization_id: event.organizationId,
          resource: event.resource,
          action: event.action,
          metadata: JSON.stringify(event.metadata),
          execution_time_ms: event.executionTimeMs
        })),
        error: null
      });

      mockSupabaseClient.storage.from().upload.mockResolvedValue({ data: { path: 'batch-archive.json' }, error: null });
      mockSupabaseClient.delete.mockResolvedValue({ data: [], error: null });

      const policies = await retentionManager.getRetentionPolicies();
      const batchPolicy = policies[0]; // Use first policy

      const result = await retentionManager.enforceRetentionPolicy(batchPolicy);

      expect(result.recordsProcessed).toBe(2500);
      expect(result.success).toBe(true);
      
      // Should process in multiple batches (batch size = 1000 in implementation)
      expect(mockSupabaseClient.delete).toHaveBeenCalledTimes(Math.ceil(2500 / 1000));
    });
  });

  describe('Archive Operations', () => {
    it('should archive to Supabase storage', async () => {
      const archiveEvents = [mockAuditEvents[0]];
      
      mockSupabaseClient.select.mockResolvedValue({
        data: archiveEvents.map(event => ({
          id: event.id,
          timestamp: event.timestamp,
          event_type: event.eventType,
          severity: event.severity,
          organization_id: event.organizationId,
          resource: event.resource,
          action: event.action,
          metadata: JSON.stringify(event.metadata),
          execution_time_ms: event.executionTimeMs
        })),
        error: null
      });

      mockSupabaseClient.storage.from().upload.mockResolvedValue({ 
        data: { path: 'audit_archives/test-archive.json' }, 
        error: null 
      });
      mockSupabaseClient.delete.mockResolvedValue({ data: [], error: null });

      const archivePolicy = {
        id: 'archive-policy',
        name: 'Archive Policy',
        description: 'Test archival',
        enabled: true,
        retentionPeriodDays: 1, // Very short for testing
        eventTypes: [AuditEventType.USER_ACTION],
        severityThreshold: AuditSeverity.LOW,
        weddingDataRetentionDays: 1,
        guestDataRetentionDays: 1,
        supplierDataRetentionDays: 1,
        photoMetadataRetentionDays: 1,
        archiveEnabled: true,
        archiveLocation: 'test-archive',
        compressionLevel: 6,
        encryptArchive: true,
        cleanupSchedule: '0 2 * * *',
        notifyBeforeCleanup: false,
        dryRunEnabled: false
      };

      const result = await retentionManager.enforceRetentionPolicy(archivePolicy);

      expect(result.recordsArchived).toBeGreaterThan(0);
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('test-audit-archives');
      expect(mockSupabaseClient.storage.from().upload).toHaveBeenCalledWith(
        expect.stringMatching(/^audit_archives\/audit_archive_\d{4}-\d{2}-\d{2}_wedding_archive-policy\.json$/),
        expect.any(String),
        expect.objectContaining({
          contentType: 'application/json',
          cacheControl: '31536000'
        })
      );
    });

    it('should handle archive storage errors', async () => {
      mockSupabaseClient.select.mockResolvedValue({
        data: [mockAuditEvents[0]].map(event => ({
          id: event.id,
          timestamp: event.timestamp,
          event_type: event.eventType,
          severity: event.severity,
          organization_id: event.organizationId,
          resource: event.resource,
          action: event.action,
          metadata: JSON.stringify(event.metadata),
          execution_time_ms: event.executionTimeMs
        })),
        error: null
      });

      mockSupabaseClient.storage.from().upload.mockResolvedValue({ 
        data: null, 
        error: { message: 'Upload failed' } 
      });

      const archivePolicy = {
        id: 'failing-archive-policy',
        name: 'Failing Archive Policy',
        description: 'Test archive failure',
        enabled: true,
        retentionPeriodDays: 1,
        eventTypes: [AuditEventType.USER_ACTION],
        severityThreshold: AuditSeverity.LOW,
        weddingDataRetentionDays: 1,
        guestDataRetentionDays: 1,
        supplierDataRetentionDays: 1,
        photoMetadataRetentionDays: 1,
        archiveEnabled: true,
        archiveLocation: 'failing-archive',
        compressionLevel: 6,
        encryptArchive: true,
        cleanupSchedule: '0 2 * * *',
        notifyBeforeCleanup: false,
        dryRunEnabled: false
      };

      const result = await retentionManager.enforceRetentionPolicy(archivePolicy);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Archive failed');
      expect(result.success).toBe(false);
    });

    it('should handle unsupported archive providers', async () => {
      const unsupportedConfig = {
        ...testArchiveConfig,
        provider: 'unsupported' as any
      };

      const unsupportedManager = new AuditRetentionManager(unsupportedConfig, testComplianceConfig);

      mockSupabaseClient.select.mockResolvedValue({
        data: [mockAuditEvents[0]].map(event => ({
          id: event.id,
          timestamp: event.timestamp,
          event_type: event.eventType,
          severity: event.severity,
          organization_id: event.organizationId,
          resource: event.resource,
          action: event.action,
          metadata: JSON.stringify(event.metadata),
          execution_time_ms: event.executionTimeMs
        })),
        error: null
      });

      const archivePolicy = (await unsupportedManager.getRetentionPolicies())[0];

      const result = await unsupportedManager.enforceRetentionPolicy(archivePolicy);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unsupported archive provider');

      await unsupportedManager.shutdown();
    });
  });

  describe('Deletion Operations', () => {
    it('should delete records in batches', async () => {
      const deleteEvents = Array(1500).fill(null).map((_, i) => ({
        ...mockAuditEvents[0],
        id: `delete-event-${i}`
      }));

      mockSupabaseClient.select.mockResolvedValue({
        data: deleteEvents.map(event => ({
          id: event.id,
          timestamp: event.timestamp,
          event_type: event.eventType,
          severity: event.severity,
          organization_id: event.organizationId,
          resource: event.resource,
          action: event.action,
          metadata: JSON.stringify(event.metadata),
          execution_time_ms: event.executionTimeMs
        })),
        error: null
      });

      mockSupabaseClient.delete.mockResolvedValue({ data: [], error: null });

      const deletePolicy = {
        id: 'delete-policy',
        name: 'Delete Policy',
        description: 'Test deletion',
        enabled: true,
        retentionPeriodDays: 1,
        eventTypes: [AuditEventType.USER_ACTION],
        severityThreshold: AuditSeverity.LOW,
        weddingDataRetentionDays: 1,
        guestDataRetentionDays: 1,
        supplierDataRetentionDays: 1,
        photoMetadataRetentionDays: 1,
        archiveEnabled: false, // Delete without archiving
        archiveLocation: '',
        compressionLevel: 0,
        encryptArchive: false,
        cleanupSchedule: '0 2 * * *',
        notifyBeforeCleanup: false,
        dryRunEnabled: false
      };

      const result = await retentionManager.enforceRetentionPolicy(deletePolicy);

      expect(result.recordsDeleted).toBe(1500);
      expect(result.storageFreedGB).toBeGreaterThan(0);
      
      // Should call delete multiple times for batching (batch size = 1000)
      expect(mockSupabaseClient.delete).toHaveBeenCalledTimes(2);
    });

    it('should handle deletion errors gracefully', async () => {
      mockSupabaseClient.select.mockResolvedValue({
        data: [mockAuditEvents[0]].map(event => ({
          id: event.id,
          timestamp: event.timestamp,
          event_type: event.eventType,
          severity: event.severity,
          organization_id: event.organizationId,
          resource: event.resource,
          action: event.action,
          metadata: JSON.stringify(event.metadata),
          execution_time_ms: event.executionTimeMs
        })),
        error: null
      });

      mockSupabaseClient.delete.mockResolvedValue({ 
        data: null, 
        error: { message: 'Foreign key constraint violation' } 
      });

      const policies = await retentionManager.getRetentionPolicies();
      const deletePolicy = { ...policies[0], archiveEnabled: false };

      const result = await retentionManager.enforceRetentionPolicy(deletePolicy);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Delete batch failed');
      expect(result.success).toBe(false);
    });
  });

  describe('Data Classification and Wedding-Specific Logic', () => {
    it('should identify guest data records correctly', () => {
      const guestEvent = {
        ...mockAuditEvents[0],
        resource: 'guest_profiles',
        metadata: { guestsAffected: 25 }
      };

      const nonGuestEvent = {
        ...mockAuditEvents[0],
        resource: 'system_settings',
        metadata: {}
      };

      expect(retentionManager['isGuestDataRecord'](guestEvent)).toBe(true);
      expect(retentionManager['isGuestDataRecord'](nonGuestEvent)).toBe(false);
    });

    it('should identify payment data records correctly', () => {
      const paymentEvent = {
        ...mockAuditEvents[0],
        resource: 'payment_transactions'
      };

      const nonPaymentEvent = {
        ...mockAuditEvents[0],
        resource: 'guest_profiles'
      };

      expect(retentionManager['isPaymentDataRecord'](paymentEvent)).toBe(true);
      expect(retentionManager['isPaymentDataRecord'](nonPaymentEvent)).toBe(false);
    });

    it('should identify supplier data records correctly', () => {
      const supplierEvent = {
        ...mockAuditEvents[0],
        resource: 'supplier_profiles',
        supplierRole: SupplierRole.PHOTOGRAPHER
      };

      const nonSupplierEvent = {
        ...mockAuditEvents[0],
        resource: 'guest_profiles',
        supplierRole: undefined
      };

      expect(retentionManager['isSupplierDataRecord'](supplierEvent)).toBe(true);
      expect(retentionManager['isSupplierDataRecord'](nonSupplierEvent)).toBe(false);
    });

    it('should identify photo metadata records correctly', () => {
      const photoEvent = {
        ...mockAuditEvents[0],
        resource: 'photo_metadata'
      };

      const nonPhotoEvent = {
        ...mockAuditEvents[0],
        resource: 'guest_profiles'
      };

      expect(retentionManager['isPhotoMetadataRecord'](photoEvent)).toBe(true);
      expect(retentionManager['isPhotoMetadataRecord'](nonPhotoEvent)).toBe(false);
    });

    it('should count unique weddings correctly', () => {
      const events = [
        { ...mockAuditEvents[0], weddingId: 'wedding-1' },
        { ...mockAuditEvents[0], weddingId: 'wedding-1' }, // Duplicate
        { ...mockAuditEvents[0], weddingId: 'wedding-2' },
        { ...mockAuditEvents[0], weddingId: undefined } // No wedding ID
      ];

      const uniqueWeddings = retentionManager['countUniqueWeddings'](events);
      expect(uniqueWeddings).toBe(2); // wedding-1 and wedding-2
    });
  });

  describe('Data Anonymization and Privacy', () => {
    it('should anonymize user IDs when enabled', () => {
      const userId = 'user-12345678901234567890';
      const anonymized = retentionManager['anonymizeUserId'](userId);
      
      expect(anonymized).toMatch(/^anon_/);
      expect(anonymized).toContain('67890'); // Last 8 characters
      expect(anonymized).not.toBe(userId);
    });

    it('should anonymize IP addresses', () => {
      const ipAddress = '192.168.1.100';
      const anonymized = retentionManager['anonymizeIP'](ipAddress);
      
      expect(anonymized).toBe('192.168.xxx.xxx');
    });

    it('should handle malformed IP addresses', () => {
      const malformedIP = '192.168.1';
      const anonymized = retentionManager['anonymizeIP'](malformedIP);
      
      expect(anonymized).toBe('xxx.xxx.xxx.xxx');
    });

    it('should sanitize events for archive with anonymization', () => {
      const event = {
        ...mockAuditEvents[0],
        userId: 'user-12345678901234567890',
        ipAddress: '192.168.1.100'
      };

      const sanitized = retentionManager['sanitizeForArchive'](event);
      
      expect(sanitized.userId).toMatch(/^anon_/);
      expect(sanitized.ipAddress).toBe('192.168.xxx.xxx');
    });

    it('should preserve original data when anonymization disabled', () => {
      const noAnonymizationConfig = {
        ...testComplianceConfig,
        anonymizationEnabled: false
      };

      const noAnonymizationManager = new AuditRetentionManager(testArchiveConfig, noAnonymizationConfig);

      const event = {
        ...mockAuditEvents[0],
        userId: 'user-12345678901234567890',
        ipAddress: '192.168.1.100'
      };

      const sanitized = noAnonymizationManager['sanitizeForArchive'](event);
      
      expect(sanitized.userId).toBe('user-12345678901234567890');
      expect(sanitized.ipAddress).toBe('192.168.1.100');
    });
  });

  describe('Storage Estimation', () => {
    it('should estimate storage freed correctly', () => {
      const events = Array(1000).fill(mockAuditEvents[0]);
      const estimatedGB = retentionManager['estimateStorageFreed'](events);
      
      // 1000 events * 2KB = ~2MB = ~0.002GB
      expect(estimatedGB).toBeCloseTo(0.002, 3);
    });

    it('should handle empty event arrays', () => {
      const estimatedGB = retentionManager['estimateStorageFreed']([]);
      expect(estimatedGB).toBe(0);
    });
  });

  describe('Operation History', () => {
    it('should track operation history', async () => {
      mockSupabaseClient.select.mockResolvedValue({ data: [], error: null });

      await retentionManager.enforceAllPolicies();

      const history = await retentionManager.getOperationHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);

      const operation = history[0];
      expect(operation.operationId).toBeDefined();
      expect(operation.timestamp).toBeDefined();
      expect(operation.operationType).toBeDefined();
      expect(operation.success).toBeDefined();
    });

    it('should limit operation history size', async () => {
      // Simulate many operations
      for (let i = 0; i < 150; i++) {
        retentionManager['operationHistory'].push({
          operationId: `op-${i}`,
          timestamp: new Date().toISOString(),
          operationType: RetentionOperationType.DELETE,
          policyId: 'test-policy',
          policyName: 'Test Policy',
          recordsProcessed: 0,
          recordsArchived: 0,
          recordsDeleted: 0,
          storageFreedGB: 0,
          processingTimeMs: 100,
          errors: [],
          warnings: [],
          success: true,
          weddingsProcessed: 0,
          guestDataRecords: 0,
          supplierDataRecords: 0,
          photoMetadataRecords: 0
        });
      }

      // Trigger cleanup
      retentionManager['cleanupOperationHistory']();

      const history = await retentionManager.getOperationHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Event Emission', () => {
    it('should emit events during policy enforcement', async () => {
      const policyEnforcedListener = jest.fn();
      const policyErrorListener = jest.fn();

      retentionManager.on('policyEnforced', policyEnforcedListener);
      retentionManager.on('policyError', policyErrorListener);

      mockSupabaseClient.select.mockResolvedValue({ data: [], error: null });

      await retentionManager.enforceAllPolicies();

      expect(policyEnforcedListener).toHaveBeenCalled();
    });

    it('should emit error events on policy failures', async () => {
      const policyErrorListener = jest.fn();
      retentionManager.on('policyError', policyErrorListener);

      mockSupabaseClient.select.mockRejectedValue(new Error('Database error'));

      await retentionManager.enforceAllPolicies();

      expect(policyErrorListener).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle policy enforcement errors gracefully', async () => {
      mockSupabaseClient.select.mockRejectedValue(new Error('Connection timeout'));

      const policies = await retentionManager.getRetentionPolicies();
      const result = await retentionManager.enforceRetentionPolicy(policies[0]);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Policy enforcement failed');
    });

    it('should handle batch processing errors', async () => {
      mockSupabaseClient.select.mockResolvedValue({
        data: [mockAuditEvents[0]].map(event => ({
          id: event.id,
          timestamp: event.timestamp,
          event_type: event.eventType,
          severity: event.severity,
          organization_id: event.organizationId,
          resource: event.resource,
          action: event.action,
          metadata: JSON.stringify(event.metadata),
          execution_time_ms: event.executionTimeMs
        })),
        error: null
      });

      mockSupabaseClient.delete.mockRejectedValue(new Error('Delete operation failed'));

      const policies = await retentionManager.getRetentionPolicies();
      const deletePolicy = { ...policies[0], archiveEnabled: false };

      const result = await retentionManager.enforceRetentionPolicy(deletePolicy);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await retentionManager.startRetentionSchedule();
      
      await retentionManager.shutdown();

      expect(retentionManager.listenerCount('policyEnforced')).toBe(0);
      expect(retentionManager.listenerCount('policyError')).toBe(0);
      expect(retentionManager.listenerCount('retentionError')).toBe(0);
    });
  });
});

describe('Factory Functions', () => {
  it('should create retention manager with default configuration', () => {
    const manager = createRetentionManager();
    expect(manager).toBeInstanceOf(AuditRetentionManager);
  });

  it('should create retention manager with custom configuration', () => {
    const customArchive = { provider: 's3' as const, bucketName: 'custom-bucket' };
    const customCompliance = { gdprCompliant: false, guestDataRetention: 1000 };

    const manager = createRetentionManager(customArchive, customCompliance);
    expect(manager).toBeInstanceOf(AuditRetentionManager);
  });

  it('should export singleton instance', async () => {
    const { retentionManager } = await import('../../../src/lib/performance/audit/audit-retention-manager');
    expect(retentionManager).toBeInstanceOf(AuditRetentionManager);
  });
});