import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  vi,
  Mock,
} from 'vitest';
import { BackupIntegrityService } from '@/lib/services/backup-integrity-service';
import { CryptographyService } from '@/lib/services/cryptography-service';
import { DatabaseService } from '@/lib/services/database-service';
import { FileSystemService } from '@/lib/services/filesystem-service';

// Mock services
vi.mock('@/lib/services/cryptography-service');
vi.mock('@/lib/services/database-service');
vi.mock('@/lib/services/filesystem-service');

describe('Backup Data Integrity Validation - WS-337', () => {
  let integrityService: BackupIntegrityService;
  let mockCryptoService: CryptographyService;
  let mockDatabaseService: DatabaseService;
  let mockFileSystemService: FileSystemService;

  const mockWeddingId = 'wedding-456';
  const mockBackupId = 'backup-789';

  beforeEach(() => {
    vi.clearAllMocks();

    mockCryptoService = new CryptographyService() as any;
    mockDatabaseService = new DatabaseService() as any;
    mockFileSystemService = new FileSystemService() as any;

    integrityService = new BackupIntegrityService(
      mockCryptoService,
      mockDatabaseService,
      mockFileSystemService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Checksum Validation', () => {
    test('should detect and report data corruption in guest list', async () => {
      // Arrange - Create backup with known corruption in guest_lists table
      const originalChecksum = 'abc123def456';
      const corruptedChecksum = 'abc123def999'; // Corrupted checksum

      const mockBackupData = {
        id: mockBackupId,
        weddingId: mockWeddingId,
        timestamp: new Date('2025-01-22T08:00:00Z'),
        tables: {
          guest_lists: {
            checksum: corruptedChecksum,
            originalChecksum: originalChecksum,
            records: [
              {
                id: 'guest-1',
                name: 'John Smith',
                corrupted_field: '###CORRUPT###',
              },
              { id: 'guest-2', name: 'Jane Doe', email: 'jane@example.com' },
            ],
          },
          vendors: {
            checksum: 'vendor123abc',
            originalChecksum: 'vendor123abc', // Valid
            records: [
              { id: 'vendor-1', name: 'Photo Pro', type: 'photographer' },
            ],
          },
        },
      };

      (mockDatabaseService.getBackupMetadata as Mock).mockResolvedValue(
        mockBackupData,
      );
      (mockCryptoService.calculateChecksum as Mock).mockImplementation(
        (data: any) => {
          if (data.table === 'guest_lists') return corruptedChecksum;
          return 'vendor123abc';
        },
      );
      (mockCryptoService.verifyChecksum as Mock).mockImplementation(
        (data: any, checksum: string) => {
          return checksum !== corruptedChecksum;
        },
      );

      // Act - Validate backup integrity
      const validation = await integrityService.validateIntegrity(mockBackupId);

      // Assert - Verify corruption detection
      expect(validation.isCorrupted).toBe(true);
      expect(validation.corruptedTables).toContain('guest_lists');
      expect(validation.corruptedTables).not.toContain('vendors');
      expect(validation.totalCorruptedRecords).toBe(1);
      expect(validation.recoverableData).toBeDefined();
      expect(validation.recoverableData.percentageRecoverable).toBeGreaterThan(
        50,
      );

      // Verify detailed corruption report
      expect(validation.corruptionDetails).toHaveProperty('guest_lists');
      expect(validation.corruptionDetails.guest_lists).toMatchObject({
        recordsAffected: 1,
        corruptionType: 'checksum_mismatch',
        recoverableRecords: 1,
        severity: 'medium',
      });
    });

    test('should validate photo file integrity and detect missing files', async () => {
      // Arrange - Backup with missing photo files
      const mockPhotoBackup = {
        id: 'photo-backup-001',
        weddingId: mockWeddingId,
        photoManifest: [
          {
            id: 'photo-1',
            filename: 'ceremony-001.jpg',
            path: '/photos/wedding-456/ceremony-001.jpg',
            checksum: 'photo1checksum',
            size: 2048576,
            status: 'exists',
          },
          {
            id: 'photo-2',
            filename: 'ceremony-002.jpg',
            path: '/photos/wedding-456/ceremony-002.jpg',
            checksum: 'photo2checksum',
            size: 1876543,
            status: 'missing',
          },
          {
            id: 'photo-3',
            filename: 'reception-001.jpg',
            path: '/photos/wedding-456/reception-001.jpg',
            checksum: 'corrupted_checksum',
            size: 156789,
            status: 'corrupted',
          },
        ],
      };

      (mockFileSystemService.checkFileExists as Mock).mockImplementation(
        (path: string) => {
          return path.includes('ceremony-001.jpg');
        },
      );

      (mockFileSystemService.validateFileChecksum as Mock).mockImplementation(
        (path: string, expectedChecksum: string) => {
          if (path.includes('reception-001.jpg')) return false;
          return true;
        },
      );

      (mockDatabaseService.getPhotoBackupManifest as Mock).mockResolvedValue(
        mockPhotoBackup,
      );

      // Act - Validate photo backup integrity
      const photoValidation =
        await integrityService.validatePhotoIntegrity(mockWeddingId);

      // Assert - Verify photo integrity issues detected
      expect(photoValidation.isValid).toBe(false);
      expect(photoValidation.missingFiles).toHaveLength(1);
      expect(photoValidation.corruptedFiles).toHaveLength(1);
      expect(photoValidation.validFiles).toHaveLength(1);

      expect(photoValidation.missingFiles[0]).toMatchObject({
        id: 'photo-2',
        filename: 'ceremony-002.jpg',
        severity: 'high', // Ceremony photos are critical
      });

      expect(photoValidation.corruptedFiles[0]).toMatchObject({
        id: 'photo-3',
        filename: 'reception-001.jpg',
        corruptionType: 'checksum_mismatch',
      });

      // Verify recovery recommendations
      expect(photoValidation.recoveryRecommendations).toContain(
        'priority_recover_ceremony_photos',
      );
      expect(photoValidation.recoveryRecommendations).toContain(
        'verify_alternative_backup_sources',
      );
    });
  });

  describe('Database Relationship Integrity', () => {
    test('should detect broken foreign key relationships in wedding data', async () => {
      // Arrange - Wedding data with broken relationships
      const mockWeddingData = {
        wedding: {
          id: mockWeddingId,
          couple_id: 'couple-123',
          organization_id: 'org-456',
        },
        guests: [
          { id: 'guest-1', wedding_id: mockWeddingId, table_id: 'table-1' },
          { id: 'guest-2', wedding_id: mockWeddingId, table_id: 'table-999' }, // Orphaned - table doesn't exist
          { id: 'guest-3', wedding_id: 'invalid-wedding', table_id: 'table-2' }, // Invalid wedding reference
        ],
        tables: [
          { id: 'table-1', wedding_id: mockWeddingId, capacity: 8 },
          { id: 'table-2', wedding_id: mockWeddingId, capacity: 10 },
        ],
        vendors: [
          {
            id: 'vendor-1',
            organization_id: 'org-456',
            wedding_id: mockWeddingId,
          },
          {
            id: 'vendor-2',
            organization_id: 'org-999',
            wedding_id: mockWeddingId,
          }, // Invalid org
        ],
      };

      (
        mockDatabaseService.getWeddingDataForValidation as Mock
      ).mockResolvedValue(mockWeddingData);

      // Act - Validate relationship integrity
      const relationshipValidation =
        await integrityService.validateRelationshipIntegrity(mockWeddingId);

      // Assert - Verify broken relationships detected
      expect(relationshipValidation.isValid).toBe(false);
      expect(relationshipValidation.brokenRelationships).toHaveLength(3);

      // Check orphaned guest table reference
      const orphanedTableRef = relationshipValidation.brokenRelationships.find(
        (br) =>
          br.type === 'orphaned_reference' &&
          br.table === 'guests' &&
          br.column === 'table_id',
      );
      expect(orphanedTableRef).toBeDefined();
      expect(orphanedTableRef?.invalidValue).toBe('table-999');

      // Check invalid wedding reference
      const invalidWeddingRef = relationshipValidation.brokenRelationships.find(
        (br) =>
          br.type === 'invalid_foreign_key' &&
          br.table === 'guests' &&
          br.column === 'wedding_id',
      );
      expect(invalidWeddingRef).toBeDefined();

      // Check invalid organization reference
      const invalidOrgRef = relationshipValidation.brokenRelationships.find(
        (br) =>
          br.type === 'invalid_foreign_key' &&
          br.table === 'vendors' &&
          br.column === 'organization_id',
      );
      expect(invalidOrgRef).toBeDefined();

      // Verify repair recommendations
      expect(relationshipValidation.repairRecommendations).toContain(
        'remove_orphaned_guest_records',
      );
      expect(relationshipValidation.repairRecommendations).toContain(
        'validate_vendor_organization_mapping',
      );
    });

    test('should validate timeline event dependencies and constraints', async () => {
      // Arrange - Timeline with logical inconsistencies
      const mockTimeline = {
        wedding_id: mockWeddingId,
        events: [
          {
            id: 'ceremony',
            start_time: new Date('2025-06-14T14:00:00Z'),
            end_time: new Date('2025-06-14T14:45:00Z'),
            dependencies: [],
          },
          {
            id: 'photos',
            start_time: new Date('2025-06-14T14:30:00Z'), // Overlaps with ceremony
            end_time: new Date('2025-06-14T15:30:00Z'),
            dependencies: ['ceremony'],
          },
          {
            id: 'reception',
            start_time: new Date('2025-06-14T14:15:00Z'), // Starts before ceremony ends
            end_time: new Date('2025-06-14T20:00:00Z'),
            dependencies: ['ceremony', 'photos'],
          },
          {
            id: 'cleanup',
            start_time: new Date('2025-06-14T21:00:00Z'),
            end_time: new Date('2025-06-14T22:00:00Z'),
            dependencies: ['non-existent-event'], // Invalid dependency
          },
        ],
      };

      (mockDatabaseService.getTimelineData as Mock).mockResolvedValue(
        mockTimeline,
      );

      // Act - Validate timeline integrity
      const timelineValidation =
        await integrityService.validateTimelineIntegrity(mockWeddingId);

      // Assert - Verify timeline issues detected
      expect(timelineValidation.isValid).toBe(false);
      expect(timelineValidation.conflicts).toHaveLength(3);

      // Check for time overlap conflict
      const overlapConflict = timelineValidation.conflicts.find(
        (c) =>
          c.type === 'time_overlap' &&
          c.events.includes('ceremony') &&
          c.events.includes('photos'),
      );
      expect(overlapConflict).toBeDefined();

      // Check for dependency violation
      const dependencyConflict = timelineValidation.conflicts.find(
        (c) => c.type === 'dependency_violation' && c.event === 'reception',
      );
      expect(dependencyConflict).toBeDefined();

      // Check for invalid dependency reference
      const invalidDependency = timelineValidation.conflicts.find(
        (c) => c.type === 'invalid_dependency' && c.event === 'cleanup',
      );
      expect(invalidDependency).toBeDefined();

      // Verify suggested resolutions
      expect(timelineValidation.suggestedResolutions).toContain(
        'adjust_photo_session_timing',
      );
      expect(timelineValidation.suggestedResolutions).toContain(
        'delay_reception_start',
      );
      expect(timelineValidation.suggestedResolutions).toContain(
        'remove_invalid_dependencies',
      );
    });
  });

  describe('Backup Version Consistency', () => {
    test('should validate consistency across incremental backups', async () => {
      // Arrange - Series of incremental backups with inconsistencies
      const mockBackupChain = [
        {
          id: 'backup-001',
          type: 'full',
          timestamp: new Date('2025-01-22T08:00:00Z'),
          guestCount: 150,
          vendorCount: 5,
          checksum: 'full-backup-hash',
        },
        {
          id: 'backup-002',
          type: 'incremental',
          timestamp: new Date('2025-01-22T10:00:00Z'),
          parentBackup: 'backup-001',
          changes: { guestCount: 152, vendorCount: 5 }, // 2 new guests
          checksum: 'incremental-1-hash',
        },
        {
          id: 'backup-003',
          type: 'incremental',
          timestamp: new Date('2025-01-22T12:00:00Z'),
          parentBackup: 'backup-002',
          changes: { guestCount: 148, vendorCount: 6 }, // Guest count decreased? Suspicious
          checksum: 'incremental-2-hash',
        },
      ];

      (mockDatabaseService.getBackupChain as Mock).mockResolvedValue(
        mockBackupChain,
      );
      (mockDatabaseService.reconstructDataFromChain as Mock).mockImplementation(
        (backupChain: any[]) => {
          let guestCount = 150;
          let vendorCount = 5;

          backupChain.forEach((backup) => {
            if (backup.changes) {
              guestCount = backup.changes.guestCount;
              vendorCount = backup.changes.vendorCount;
            }
          });

          return { guestCount, vendorCount };
        },
      );

      // Act - Validate backup chain consistency
      const chainValidation =
        await integrityService.validateBackupChain(mockWeddingId);

      // Assert - Verify consistency issues detected
      expect(chainValidation.isConsistent).toBe(false);
      expect(chainValidation.inconsistencies).toHaveLength(1);

      const guestCountInconsistency = chainValidation.inconsistencies.find(
        (inc) =>
          inc.field === 'guestCount' && inc.type === 'unexpected_decrease',
      );
      expect(guestCountInconsistency).toBeDefined();
      expect(guestCountInconsistency?.previousValue).toBe(152);
      expect(guestCountInconsistency?.currentValue).toBe(148);
      expect(guestCountInconsistency?.suspiciousChange).toBe(true);

      // Verify reconstruction is possible
      expect(chainValidation.reconstructionPossible).toBe(true);
      expect(chainValidation.recommendedApproach).toBe(
        'verify_guest_list_changes',
      );
    });
  });

  describe('Critical Data Validation', () => {
    test('should prioritize validation of wedding day critical data', async () => {
      // Arrange - Wedding happening today with critical data corruption
      const todayWedding = new Date();
      todayWedding.setHours(14, 0, 0, 0); // 2 PM today

      const criticalData = {
        wedding: {
          id: mockWeddingId,
          date: todayWedding,
          status: 'today',
          ceremony_time: new Date(todayWedding.getTime()),
        },
        criticalVendors: [
          { id: 'photographer', arrival_time: '10:00', status: 'confirmed' },
          { id: 'officiant', arrival_time: '13:45', status: 'corrupted_data' },
          { id: 'caterer', setup_time: '16:00', status: 'confirmed' },
        ],
        emergencyContacts: [
          {
            role: 'wedding_coordinator',
            phone: '+1234567890',
            status: 'valid',
          },
          { role: 'venue_manager', phone: 'CORRUPTED', status: 'invalid' },
          { role: 'bride_emergency', phone: '+1987654321', status: 'valid' },
        ],
        timeline: [
          {
            id: 'ceremony',
            time: todayWedding,
            critical: true,
            status: 'valid',
          },
          { id: 'photos', time: null, critical: true, status: 'missing_time' },
          {
            id: 'reception',
            time: new Date(todayWedding.getTime() + 14400000),
            critical: false,
            status: 'valid',
          },
        ],
      };

      (mockDatabaseService.getCriticalWeddingData as Mock).mockResolvedValue(
        criticalData,
      );
      (mockDatabaseService.isWeddingToday as Mock).mockResolvedValue(true);

      // Act - Perform critical data validation
      const criticalValidation =
        await integrityService.validateCriticalData(mockWeddingId);

      // Assert - Verify critical issues prioritized
      expect(criticalValidation.isWeddingDay).toBe(true);
      expect(criticalValidation.criticalIssuesCount).toBe(3);
      expect(criticalValidation.severity).toBe('high');

      // Check critical vendor data issue
      const officiantIssue = criticalValidation.criticalIssues.find(
        (issue) =>
          issue.category === 'vendor' && issue.vendor_id === 'officiant',
      );
      expect(officiantIssue).toBeDefined();
      expect(officiantIssue?.severity).toBe('critical');

      // Check emergency contact issue
      const emergencyContactIssue = criticalValidation.criticalIssues.find(
        (issue) =>
          issue.category === 'emergency_contact' &&
          issue.role === 'venue_manager',
      );
      expect(emergencyContactIssue).toBeDefined();

      // Check timeline issue
      const timelineIssue = criticalValidation.criticalIssues.find(
        (issue) => issue.category === 'timeline' && issue.event_id === 'photos',
      );
      expect(timelineIssue).toBeDefined();
      expect(timelineIssue?.severity).toBe('critical'); // Photos are critical

      // Verify immediate action recommendations
      expect(criticalValidation.immediateActions).toContain(
        'contact_officiant_directly',
      );
      expect(criticalValidation.immediateActions).toContain(
        'verify_venue_contact',
      );
      expect(criticalValidation.immediateActions).toContain(
        'set_photo_session_time',
      );

      // Verify estimated repair time for wedding day
      expect(criticalValidation.estimatedRepairTime).toBeLessThan(600000); // Less than 10 minutes
    });
  });

  describe('Automated Integrity Repair', () => {
    test('should automatically repair minor data integrity issues', async () => {
      // Arrange - Data with repairable integrity issues
      const repairableData = {
        guests: [
          { id: 'guest-1', name: 'John Smith', email: 'JOHN@EXAMPLE.COM' }, // Case normalization needed
          { id: 'guest-2', name: '  Jane Doe  ', email: 'jane@example.com' }, // Whitespace trimming needed
          { id: 'guest-3', name: 'Bob Johnson', table_assignment: '15.0' }, // Type correction needed
        ],
        vendors: [
          { id: 'vendor-1', phone: '(555) 123-4567', status: 'Active' }, // Phone format normalization
          { id: 'vendor-2', email: 'VENDOR@EXAMPLE.com', status: 'active' }, // Case inconsistency
        ],
      };

      (mockDatabaseService.getRepairableData as Mock).mockResolvedValue(
        repairableData,
      );

      // Act - Perform automated repair
      const repairResult = await integrityService.performAutomatedRepair(
        mockWeddingId,
        {
          repairTypes: [
            'normalize_emails',
            'trim_whitespace',
            'fix_data_types',
            'standardize_phone',
          ],
          createBackupBeforeRepair: true,
          validateAfterRepair: true,
        },
      );

      // Assert - Verify repairs completed successfully
      expect(repairResult.success).toBe(true);
      expect(repairResult.repairsCompleted).toBe(5);
      expect(repairResult.backupCreated).toBe(true);
      expect(repairResult.validationPassed).toBe(true);

      // Verify specific repairs
      const emailNormalization = repairResult.repairs.find(
        (r) => r.type === 'normalize_emails',
      );
      expect(emailNormalization).toBeDefined();
      expect(emailNormalization?.recordsAffected).toBe(2);

      const whitespaceTrims = repairResult.repairs.find(
        (r) => r.type === 'trim_whitespace',
      );
      expect(whitespaceTrims).toBeDefined();
      expect(whitespaceTrims?.recordsAffected).toBe(1);

      const typeCorrections = repairResult.repairs.find(
        (r) => r.type === 'fix_data_types',
      );
      expect(typeCorrections).toBeDefined();
      expect(typeCorrections?.recordsAffected).toBe(1);

      // Verify post-repair validation
      expect(mockDatabaseService.validateDataIntegrity).toHaveBeenCalledAfter(
        mockDatabaseService.performDataRepairs as Mock,
      );
    });
  });
});
