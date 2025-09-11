/**
 * WS-178 Backup Procedures - BackupValidator Unit Tests
 * Team E - Round 1 - Comprehensive Testing & Documentation
 * 
 * Tests backup integrity validation and verification processes
 * Ensures wedding data integrity and prevents corrupted backup restoration
 */

import { BackupValidator } from '../../../../src/lib/backup/backup-validator';
import { BackupMetadata, ValidationResult, WeddingBackupData } from '../../../../src/lib/backup/types';

describe('BackupValidator', () => {
  let validator: BackupValidator;
  let mockBackupMetadata: BackupMetadata;
  let mockWeddingData: WeddingBackupData;

  beforeEach(() => {
    validator = new BackupValidator();

    mockBackupMetadata = {
      backupId: 'backup-123',
      weddingId: 'wedding-456',
      timestamp: new Date('2024-01-15T10:30:00Z'),
      size: 1.2 * 1024 * 1024 * 1024, // 1.2GB
      checksum: 'sha256-abcd1234efgh5678',
      compressionRatio: 0.75,
      encryptionEnabled: true,
      includes: {
        guestData: true,
        photos: true,
        timeline: true,
        vendorInfo: true,
        paymentData: false
      },
      fileCount: 1547,
      validationStatus: 'pending'
    };

    mockWeddingData = {
      weddingId: 'wedding-456',
      coupleNames: 'Sarah & Michael Johnson',
      weddingDate: new Date('2024-06-20'),
      guestCount: 180,
      photoCount: 892,
      vendorCount: 15,
      dataSize: 1.6 * 1024 * 1024 * 1024,
      lastModified: new Date(),
      priority: 'high'
    };
  });

  describe('Checksum Validation', () => {
    it('should verify backup integrity using SHA-256 checksums', async () => {
      const mockBackupData = Buffer.from('Mock backup data for wedding-456');
      const expectedChecksum = 'sha256-valid-checksum-12345';
      
      mockBackupMetadata.checksum = expectedChecksum;

      const result = await validator.validateChecksum(mockBackupData, mockBackupMetadata);

      expect(result.valid).toBe(true);
      expect(result.algorithm).toBe('sha256');
      expect(result.computedChecksum).toBeDefined();
      expect(result.expectedChecksum).toBe(expectedChecksum);
    });

    it('should detect corrupted backup files through checksum mismatch', async () => {
      const corruptedBackupData = Buffer.from('Corrupted backup data');
      const expectedChecksum = 'sha256-original-checksum-67890';
      
      mockBackupMetadata.checksum = expectedChecksum;

      const result = await validator.validateChecksum(corruptedBackupData, mockBackupMetadata);

      expect(result.valid).toBe(false);
      expect(result.errorType).toBe('checksum_mismatch');
      expect(result.computedChecksum).not.toBe(expectedChecksum);
    });

    it('should handle different checksum algorithms gracefully', async () => {
      const backupData = Buffer.from('Test backup data');
      
      // Test MD5 (legacy support)
      mockBackupMetadata.checksum = 'md5-legacy-checksum-123';
      const md5Result = await validator.validateChecksum(backupData, mockBackupMetadata);
      expect(md5Result.algorithm).toBe('md5');
      
      // Test SHA-512 (enhanced security)
      mockBackupMetadata.checksum = 'sha512-enhanced-checksum-456';
      const sha512Result = await validator.validateChecksum(backupData, mockBackupMetadata);
      expect(sha512Result.algorithm).toBe('sha512');
    });
  });

  describe('Data Structure Validation', () => {
    it('should validate complete wedding data structure', async () => {
      const validWeddingBackup = {
        metadata: mockBackupMetadata,
        weddingData: {
          basic: {
            weddingId: 'wedding-456',
            coupleNames: 'Sarah & Michael Johnson',
            weddingDate: '2024-06-20T15:00:00Z',
            venue: 'Sunset Gardens'
          },
          guests: {
            count: 180,
            rsvpStatus: { confirmed: 165, pending: 10, declined: 5 },
            dietaryRestrictions: 23,
            plusOnes: 42
          },
          timeline: {
            ceremonyTime: '2024-06-20T15:00:00Z',
            cocktailHour: '2024-06-20T16:00:00Z',
            reception: '2024-06-20T18:00:00Z',
            lastDance: '2024-06-20T23:00:00Z'
          },
          vendors: {
            photographer: { name: 'Jane Smith Photography', contact: 'jane@example.com' },
            caterer: { name: 'Delicious Catering', contact: 'info@delicious.com' },
            florist: { name: 'Bloom & Blossom', contact: 'orders@bloom.com' }
          }
        }
      };

      const result = await validator.validateDataStructure(validWeddingBackup);

      expect(result.valid).toBe(true);
      expect(result.sections.basic).toBe(true);
      expect(result.sections.guests).toBe(true);
      expect(result.sections.timeline).toBe(true);
      expect(result.sections.vendors).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should identify missing critical wedding data fields', async () => {
      const incompleteWeddingBackup = {
        metadata: mockBackupMetadata,
        weddingData: {
          basic: {
            weddingId: 'wedding-456',
            coupleNames: 'Sarah & Michael Johnson'
            // Missing weddingDate and venue
          },
          guests: {
            count: 180
            // Missing RSVP status and other guest details
          }
          // Missing timeline and vendors sections entirely
        }
      };

      const result = await validator.validateDataStructure(incompleteWeddingBackup);

      expect(result.valid).toBe(false);
      expect(result.sections.basic).toBe(false);
      expect(result.sections.timeline).toBe(false);
      expect(result.sections.vendors).toBe(false);
      expect(result.missingFields).toContain('basic.weddingDate');
      expect(result.missingFields).toContain('basic.venue');
      expect(result.missingFields).toContain('timeline');
      expect(result.missingFields).toContain('vendors');
    });

    it('should validate guest data consistency and format', async () => {
      const guestDataBackup = {
        metadata: mockBackupMetadata,
        guestList: [
          {
            id: 'guest-001',
            firstName: 'John',
            lastName: 'Smith',
            email: 'john.smith@email.com',
            rsvpStatus: 'confirmed',
            dietaryRestrictions: ['vegetarian'],
            plusOne: true,
            tableAssignment: 5
          },
          {
            id: 'guest-002',
            firstName: 'Emma',
            lastName: 'Johnson',
            email: 'invalid-email-format', // Invalid email
            rsvpStatus: 'maybe', // Invalid status
            tableAssignment: 0 // Invalid table number
          }
        ]
      };

      const result = await validator.validateGuestData(guestDataBackup);

      expect(result.valid).toBe(false);
      expect(result.validGuests).toBe(1);
      expect(result.invalidGuests).toBe(1);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          guestId: 'guest-002',
          field: 'email',
          error: 'invalid_format'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          guestId: 'guest-002',
          field: 'rsvpStatus',
          error: 'invalid_value'
        })
      );
    });
  });

  describe('File Integrity Validation', () => {
    it('should validate photo file integrity and metadata', async () => {
      const photoBackup = {
        metadata: mockBackupMetadata,
        photos: [
          {
            filename: 'ceremony_001.jpg',
            size: 4.2 * 1024 * 1024, // 4.2MB
            checksum: 'sha256-photo-checksum-001',
            timestamp: '2024-06-20T15:30:00Z',
            photographer: 'Jane Smith Photography',
            location: { lat: 40.7128, lng: -74.0060 },
            tags: ['ceremony', 'bride', 'groom']
          },
          {
            filename: 'reception_045.jpg',
            size: 0, // Corrupted or missing file
            checksum: 'sha256-photo-checksum-045',
            timestamp: '2024-06-20T20:15:00Z',
            photographer: 'Jane Smith Photography'
          }
        ]
      };

      const result = await validator.validatePhotoIntegrity(photoBackup);

      expect(result.totalPhotos).toBe(2);
      expect(result.validPhotos).toBe(1);
      expect(result.corruptedPhotos).toBe(1);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          filename: 'reception_045.jpg',
          error: 'zero_size_file'
        })
      );
    });

    it('should detect duplicate photos and recommend deduplication', async () => {
      const photoBackupWithDuplicates = {
        metadata: mockBackupMetadata,
        photos: [
          {
            filename: 'first_dance_001.jpg',
            size: 3.8 * 1024 * 1024,
            checksum: 'sha256-duplicate-checksum-001',
            timestamp: '2024-06-20T21:00:00Z'
          },
          {
            filename: 'first_dance_001_copy.jpg',
            size: 3.8 * 1024 * 1024,
            checksum: 'sha256-duplicate-checksum-001', // Same checksum = duplicate
            timestamp: '2024-06-20T21:00:00Z'
          },
          {
            filename: 'unique_photo.jpg',
            size: 2.1 * 1024 * 1024,
            checksum: 'sha256-unique-checksum-002',
            timestamp: '2024-06-20T21:30:00Z'
          }
        ]
      };

      const result = await validator.validatePhotoIntegrity(photoBackupWithDuplicates);

      expect(result.totalPhotos).toBe(3);
      expect(result.uniquePhotos).toBe(2);
      expect(result.duplicatePhotos).toBe(1);
      expect(result.duplicates).toContainEqual({
        originalFile: 'first_dance_001.jpg',
        duplicateFile: 'first_dance_001_copy.jpg',
        checksum: 'sha256-duplicate-checksum-001'
      });
      expect(result.spaceSavings).toBeGreaterThan(0);
    });

    it('should validate document file accessibility and format', async () => {
      const documentBackup = {
        metadata: mockBackupMetadata,
        documents: [
          {
            filename: 'wedding_contract.pdf',
            type: 'contract',
            size: 850 * 1024, // 850KB
            checksum: 'sha256-document-001',
            encrypted: true,
            accessLevel: 'admin_only'
          },
          {
            filename: 'seating_chart.xlsx',
            type: 'planning',
            size: 45 * 1024, // 45KB
            checksum: 'sha256-document-002',
            encrypted: false,
            accessLevel: 'couple_and_admin'
          },
          {
            filename: 'corrupted_file.docx',
            type: 'unknown',
            size: 0,
            checksum: 'sha256-invalid-checksum',
            encrypted: false,
            accessLevel: 'public'
          }
        ]
      };

      const result = await validator.validateDocumentIntegrity(documentBackup);

      expect(result.totalDocuments).toBe(3);
      expect(result.validDocuments).toBe(2);
      expect(result.corruptedDocuments).toBe(1);
      expect(result.encryptedDocuments).toBe(1);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          filename: 'corrupted_file.docx',
          error: 'zero_size_or_corrupted'
        })
      );
    });
  });

  describe('Timeline and Date Validation', () => {
    it('should validate wedding timeline consistency', async () => {
      const timelineBackup = {
        metadata: mockBackupMetadata,
        timeline: {
          weddingDate: '2024-06-20',
          events: [
            {
              name: 'Hair and Makeup',
              startTime: '2024-06-20T09:00:00Z',
              endTime: '2024-06-20T12:00:00Z',
              type: 'preparation'
            },
            {
              name: 'Ceremony',
              startTime: '2024-06-20T15:00:00Z',
              endTime: '2024-06-20T15:30:00Z',
              type: 'ceremony'
            },
            {
              name: 'Reception',
              startTime: '2024-06-20T14:00:00Z', // Invalid: before ceremony
              endTime: '2024-06-20T23:00:00Z',
              type: 'reception'
            }
          ]
        }
      };

      const result = await validator.validateTimelineConsistency(timelineBackup);

      expect(result.valid).toBe(false);
      expect(result.validEvents).toBe(2);
      expect(result.invalidEvents).toBe(1);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          event: 'Reception',
          error: 'starts_before_ceremony'
        })
      );
    });

    it('should detect overlapping vendor appointments', async () => {
      const vendorScheduleBackup = {
        metadata: mockBackupMetadata,
        vendorSchedule: [
          {
            vendor: 'Photographer',
            appointments: [
              {
                date: '2024-06-20',
                startTime: '09:00',
                endTime: '23:00',
                type: 'full_day_coverage'
              }
            ]
          },
          {
            vendor: 'Videographer',
            appointments: [
              {
                date: '2024-06-20',
                startTime: '14:00',
                endTime: '18:00',
                type: 'ceremony_and_reception'
              }
            ]
          },
          {
            vendor: 'DJ',
            appointments: [
              {
                date: '2024-06-20',
                startTime: '17:00', // Overlaps with videographer
                endTime: '23:30',
                type: 'reception_music'
              }
            ]
          }
        ]
      };

      const result = await validator.validateVendorSchedule(vendorScheduleBackup);

      expect(result.totalAppointments).toBe(3);
      expect(result.conflicts).toBe(1);
      expect(result.overlaps).toContainEqual(
        expect.objectContaining({
          vendor1: 'Videographer',
          vendor2: 'DJ',
          overlapPeriod: {
            start: '17:00',
            end: '18:00'
          }
        })
      );
    });

    it('should validate backup timestamp chronology', async () => {
      const chronologyBackup = {
        metadata: {
          ...mockBackupMetadata,
          timestamp: new Date('2024-01-15T10:30:00Z')
        },
        dataTimestamps: {
          lastGuestUpdate: new Date('2024-01-20T14:00:00Z'), // Future from backup
          lastPhotoUpload: new Date('2024-01-14T16:45:00Z'), // Valid
          lastVendorChange: new Date('2024-01-15T09:15:00Z'), // Valid
          lastTimelineUpdate: new Date('2024-01-16T08:30:00Z') // Future from backup
        }
      };

      const result = await validator.validateTimestampChronology(chronologyBackup);

      expect(result.valid).toBe(false);
      expect(result.futureTimestamps).toBe(2);
      expect(result.invalidTimestamps).toContain('lastGuestUpdate');
      expect(result.invalidTimestamps).toContain('lastTimelineUpdate');
      expect(result.validTimestamps).toContain('lastPhotoUpload');
      expect(result.validTimestamps).toContain('lastVendorChange');
    });
  });

  describe('Vendor Data Validation', () => {
    it('should validate vendor contact information completeness', async () => {
      const vendorBackup = {
        metadata: mockBackupMetadata,
        vendors: [
          {
            id: 'vendor-001',
            name: 'Perfect Photography',
            type: 'photographer',
            contact: {
              email: 'info@perfectphotography.com',
              phone: '+1-555-123-4567',
              address: '123 Main St, City, State 12345'
            },
            contract: {
              signed: true,
              amount: 2500.00,
              deposit: 1000.00,
              balance: 1500.00,
              dueDate: '2024-06-01'
            }
          },
          {
            id: 'vendor-002',
            name: 'Incomplete Caterer',
            type: 'catering',
            contact: {
              email: 'invalid-email', // Invalid format
              phone: '', // Missing
              address: '' // Missing
            },
            contract: {
              signed: false,
              amount: 0, // Invalid amount
              deposit: 0,
              balance: 0,
              dueDate: '' // Missing
            }
          }
        ]
      };

      const result = await validator.validateVendorData(vendorBackup);

      expect(result.totalVendors).toBe(2);
      expect(result.completeVendors).toBe(1);
      expect(result.incompleteVendors).toBe(1);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          vendorId: 'vendor-002',
          field: 'contact.email',
          error: 'invalid_format'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          vendorId: 'vendor-002',
          field: 'contact.phone',
          error: 'missing_required'
        })
      );
    });

    it('should validate vendor payment tracking accuracy', async () => {
      const paymentTrackingBackup = {
        metadata: mockBackupMetadata,
        vendorPayments: [
          {
            vendorId: 'vendor-001',
            vendorName: 'Perfect Photography',
            totalAmount: 2500.00,
            paidAmount: 1000.00,
            remainingBalance: 1500.00, // Matches calculation
            payments: [
              {
                date: '2024-01-15',
                amount: 1000.00,
                type: 'deposit',
                method: 'credit_card',
                confirmed: true
              }
            ]
          },
          {
            vendorId: 'vendor-002',
            vendorName: 'Inconsistent Florist',
            totalAmount: 800.00,
            paidAmount: 400.00,
            remainingBalance: 500.00, // Should be 400.00 - inconsistent!
            payments: [
              {
                date: '2024-01-10',
                amount: 400.00,
                type: 'deposit',
                method: 'check',
                confirmed: true
              }
            ]
          }
        ]
      };

      const result = await validator.validatePaymentTracking(paymentTrackingBackup);

      expect(result.totalVendors).toBe(2);
      expect(result.accuratePaymentTracking).toBe(1);
      expect(result.paymentDiscrepancies).toBe(1);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          vendorId: 'vendor-002',
          error: 'balance_calculation_mismatch',
          expected: 400.00,
          actual: 500.00
        })
      );
    });
  });

  describe('Compression and Encryption Validation', () => {
    it('should verify backup compression efficiency', async () => {
      const compressionBackup = {
        metadata: {
          ...mockBackupMetadata,
          originalSize: 4.0 * 1024 * 1024 * 1024, // 4GB original
          compressedSize: 3.0 * 1024 * 1024 * 1024, // 3GB compressed
          compressionRatio: 0.75,
          compressionAlgorithm: 'gzip'
        }
      };

      const result = await validator.validateCompression(compressionBackup);

      expect(result.valid).toBe(true);
      expect(result.compressionRatio).toBe(0.75);
      expect(result.spaceSaved).toBe(1.0 * 1024 * 1024 * 1024); // 1GB saved
      expect(result.efficiency).toBe('good'); // 25% compression is good
    });

    it('should detect poor compression ratios indicating data anomalies', async () => {
      const poorCompressionBackup = {
        metadata: {
          ...mockBackupMetadata,
          originalSize: 2.0 * 1024 * 1024 * 1024, // 2GB
          compressedSize: 1.95 * 1024 * 1024 * 1024, // 1.95GB - only 2.5% compression
          compressionRatio: 0.975,
          compressionAlgorithm: 'gzip'
        }
      };

      const result = await validator.validateCompression(poorCompressionBackup);

      expect(result.valid).toBe(false);
      expect(result.compressionRatio).toBe(0.975);
      expect(result.efficiency).toBe('poor');
      expect(result.warnings).toContain('poor_compression_may_indicate_corruption');
    });

    it('should validate encryption key accessibility and strength', async () => {
      const encryptionBackup = {
        metadata: {
          ...mockBackupMetadata,
          encryptionEnabled: true,
          encryptionAlgorithm: 'AES-256-GCM',
          keyId: 'key-wedding-456-2024',
          encryptionVersion: '1.2'
        }
      };

      const result = await validator.validateEncryption(encryptionBackup);

      expect(result.encrypted).toBe(true);
      expect(result.algorithmStrength).toBe('strong');
      expect(result.keyAccessible).toBe(true);
      expect(result.encryptionVersion).toBe('1.2');
    });
  });

  describe('Cross-Reference Validation', () => {
    it('should validate data consistency across backup sections', async () => {
      const crossReferenceBackup = {
        metadata: mockBackupMetadata,
        weddingBasic: {
          guestCount: 180,
          vendorCount: 8,
          photoCount: 450
        },
        guestList: {
          guests: new Array(175) // Inconsistent with basic data (180)
        },
        vendorList: {
          vendors: new Array(8) // Consistent
        },
        photoGallery: {
          photos: new Array(462) // Inconsistent with basic data (450)
        }
      };

      const result = await validator.validateCrossReferences(crossReferenceBackup);

      expect(result.consistent).toBe(false);
      expect(result.inconsistencies).toContainEqual(
        expect.objectContaining({
          field: 'guestCount',
          basicData: 180,
          actualCount: 175,
          difference: -5
        })
      );
      expect(result.inconsistencies).toContainEqual(
        expect.objectContaining({
          field: 'photoCount',
          basicData: 450,
          actualCount: 462,
          difference: 12
        })
      );
      expect(result.consistentFields).toContain('vendorCount');
    });

    it('should validate RSVP totals match guest list entries', async () => {
      const rsvpBackup = {
        metadata: mockBackupMetadata,
        rsvpSummary: {
          confirmed: 165,
          declined: 10,
          pending: 5,
          total: 180
        },
        guestList: [
          ...new Array(160).fill({ rsvpStatus: 'confirmed' }),
          ...new Array(10).fill({ rsvpStatus: 'declined' }),
          ...new Array(10).fill({ rsvpStatus: 'pending' }) // 170 total, not 180
        ]
      };

      const result = await validator.validateRSVPConsistency(rsvpBackup);

      expect(result.consistent).toBe(false);
      expect(result.summaryTotal).toBe(180);
      expect(result.actualTotal).toBe(180); // Array length
      expect(result.actualConfirmed).toBe(160);
      expect(result.actualPending).toBe(10);
      expect(result.discrepancies).toContainEqual(
        expect.objectContaining({
          status: 'confirmed',
          expected: 165,
          actual: 160,
          difference: -5
        })
      );
    });
  });

  describe('Backup Chain Validation', () => {
    it('should validate incremental backup chain integrity', async () => {
      const backupChain = [
        {
          backupId: 'backup-full-001',
          type: 'full',
          chainId: 'chain-wedding-456',
          parentBackupId: null,
          timestamp: new Date('2024-01-01T00:00:00Z'),
          checksum: 'sha256-full-001'
        },
        {
          backupId: 'backup-incr-002',
          type: 'incremental',
          chainId: 'chain-wedding-456',
          parentBackupId: 'backup-full-001',
          timestamp: new Date('2024-01-02T00:00:00Z'),
          checksum: 'sha256-incr-002'
        },
        {
          backupId: 'backup-incr-003',
          type: 'incremental',
          chainId: 'chain-wedding-456',
          parentBackupId: 'backup-incr-002',
          timestamp: new Date('2024-01-03T00:00:00Z'),
          checksum: 'sha256-incr-003'
        }
      ];

      const result = await validator.validateBackupChain(backupChain);

      expect(result.valid).toBe(true);
      expect(result.chainLength).toBe(3);
      expect(result.fullBackups).toBe(1);
      expect(result.incrementalBackups).toBe(2);
      expect(result.missingLinks).toHaveLength(0);
      expect(result.chronologyValid).toBe(true);
    });

    it('should detect broken backup chains with missing links', async () => {
      const brokenBackupChain = [
        {
          backupId: 'backup-full-001',
          type: 'full',
          chainId: 'chain-wedding-456',
          parentBackupId: null,
          timestamp: new Date('2024-01-01T00:00:00Z'),
          checksum: 'sha256-full-001'
        },
        {
          backupId: 'backup-incr-003',
          type: 'incremental',
          chainId: 'chain-wedding-456',
          parentBackupId: 'backup-incr-002', // Missing backup-incr-002!
          timestamp: new Date('2024-01-03T00:00:00Z'),
          checksum: 'sha256-incr-003'
        }
      ];

      const result = await validator.validateBackupChain(brokenBackupChain);

      expect(result.valid).toBe(false);
      expect(result.missingLinks).toContain('backup-incr-002');
      expect(result.chainBroken).toBe(true);
      expect(result.recoverabilityRisk).toBe('high');
    });
  });
});